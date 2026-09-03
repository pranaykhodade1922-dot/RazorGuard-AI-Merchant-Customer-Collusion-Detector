import pytest
import os
from fastapi.testclient import TestClient

from app.main import app, STATE
from app.cases.case_store import CaseStore
from app.cases.case_service import CaseService
from app.data.generator import SyntheticDataGenerator
from app.detector.overlap_detector import OverlapDetector
from app.scoring.risk_scorer import RiskScorer


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    db_file = os.path.join(tmp_path, "test_cases_razorguard.db")
    monkeypatch.setenv("RAZORGUARD_DB_PATH", db_file)
    from app.main import case_service
    store = CaseStore(db_path=db_file)
    case_service.store = store
    store.clear_all()
    yield store
    store.clear_all()


def test_deterministic_case_creation_and_idempotency(setup_test_db):
    store = setup_test_db
    service = CaseService(store=store)

    gen = SyntheticDataGenerator(seed=42)
    merchants, customers, transactions, ground_truth = gen.generate_all()

    detector = OverlapDetector()
    pair_signals = detector.analyze_all_pairs(merchants, customers, transactions)

    scorer = RiskScorer()
    risk_results = []
    for (m_id, c_id), sigs in pair_signals.items():
        res = scorer.calculate_risk(m_id, c_id, sigs)
        risk_results.append(res)

    # First run
    run1 = service.process_detection_results(merchants, customers, transactions, risk_results)
    cases1 = service.list_cases()
    assert run1["status"] == "success"
    assert len(cases1) > 0
    
    # Check deterministic case IDs (e.g. CASE-0001)
    case_ids_1 = [c.case_id for c in cases1]
    assert all(cid.startswith("CASE-") for cid in case_ids_1)

    # Second run (Idempotency check)
    run2 = service.process_detection_results(merchants, customers, transactions, risk_results)
    cases2 = service.list_cases()
    assert run2["cases_created"] == 0  # No duplicates created
    assert len(cases2) == len(cases1)
    assert [c.case_id for c in cases2] == case_ids_1


def test_case_api_endpoints(setup_test_db):
    client = TestClient(app)

    # 1. Run detection run endpoint
    res_detect = client.post("/api/detection/run")
    assert res_detect.status_code == 200
    data_detect = res_detect.json()
    assert data_detect["status"] == "success"
    assert "cases_created" in data_detect

    # 2. List cases
    res_list = client.get("/api/cases")
    assert res_list.status_code == 200
    cases = res_list.json()
    assert len(cases) > 0

    first_case = cases[0]
    case_id = first_case["case_id"]

    # 3. Retrieve case detail
    res_detail = client.get(f"/api/cases/{case_id}")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["case_id"] == case_id
    assert "risk_score" in detail
    assert "risk_level" in detail
    assert "evidence" in detail
    assert "score_breakdown" in detail
    assert "connected_entities" in detail

    # 4. Filter cases by risk level
    res_filter = client.get(f"/api/cases?risk_level={detail['risk_level']}")
    assert res_filter.status_code == 200
    assert len(res_filter.json()) >= 1

    # 5. Non-existent case 404
    res_404 = client.get("/api/cases/CASE-9999")
    assert res_404.status_code == 404
    err_json = res_404.json()
    assert err_json["error"] == "CASE_NOT_FOUND"
    assert "CASE-9999" in err_json["message"]


def test_status_update_and_notes(setup_test_db):
    client = TestClient(app)
    client.post("/api/detection/run")

    cases = client.get("/api/cases").json()
    case_id = cases[0]["case_id"]

    # Update status to UNDER_REVIEW
    res_status = client.post(f"/api/cases/{case_id}/status", json={"status": "UNDER_REVIEW"})
    assert res_status.status_code == 200
    assert res_status.json()["status"] == "UNDER_REVIEW"

    # Invalid status returns 400
    res_inv = client.post(f"/api/cases/{case_id}/status", json={"status": "INVALID_STATUS"})
    assert res_inv.status_code == 400
    assert res_inv.json()["error"] == "INVALID_STATUS"

    # Add investigator note
    res_note = client.post(f"/api/cases/{case_id}/notes", json={"note": "Confirmed shared payment identity with C002"})
    assert res_note.status_code == 200
    note_data = res_note.json()
    assert note_data["note"] == "Confirmed shared payment identity with C002"
    assert "note_id" in note_data

    # Verify note persisted in case details
    updated_case = client.get(f"/api/cases/{case_id}").json()
    assert len(updated_case["investigator_notes"]) == 1
    assert updated_case["investigator_notes"][0]["note"] == "Confirmed shared payment identity with C002"
