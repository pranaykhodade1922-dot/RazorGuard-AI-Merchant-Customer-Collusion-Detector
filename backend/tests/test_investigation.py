import pytest
import os
from fastapi.testclient import TestClient

from app.main import app
from app.cases.case_store import CaseStore
from app.investigation.evidence_engine import EvidenceEngine
from app.models.schemas import PairSignals
from app.scoring.risk_scorer import RiskScorer


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    db_file = os.path.join(tmp_path, "test_investigation_razorguard.db")
    monkeypatch.setenv("RAZORGUARD_DB_PATH", db_file)
    from app.main import case_service, network_service
    store = CaseStore(db_path=db_file)
    case_service.store = store
    network_service.store = store
    store.clear_all()
    yield store
    store.clear_all()


def test_evidence_engine_formatting_and_breakdown():
    engine = EvidenceEngine()
    signals = PairSignals(
        shared_device=True,
        shared_payment_identity=True,
        address_similarity=0.93,
        refund_velocity_ratio=15.5,
        refund_ratio=0.85,
        pair_transaction_count=10
    )

    ev_list, breakdown = engine.generate_evidence_and_breakdown("M089", "C002", signals)

    # Check evidence format
    signals_contained = {ev.signal for ev in ev_list}
    assert "shared_device" in signals_contained
    assert "shared_payment_identity" in signals_contained
    assert "address_similarity" in signals_contained
    assert "abnormal_refund_velocity" in signals_contained
    assert "multi_signal_synergy" in signals_contained

    # Check human-readable explanations
    explanations_text = " ".join([ev.explanation for ev in ev_list])
    assert "share the same device fingerprint" in explanations_text
    assert "93% similar" in explanations_text
    assert "higher than the expected baseline" in explanations_text

    # Check score breakdown
    bd_signals = {bd.signal: bd.contribution for bd in breakdown}
    assert bd_signals["shared_payment_identity"] == 30.0
    assert bd_signals["shared_device"] == 25.0
    assert bd_signals["address_similarity"] == 15.0
    assert bd_signals["abnormal_refund_velocity"] == 20.0
    assert bd_signals["multi_signal_synergy"] == 10.0


def test_investigation_graph_api(setup_test_db):
    client = TestClient(app)
    client.post("/api/detection/run")

    cases = client.get("/api/cases").json()
    assert len(cases) > 0
    case_id = cases[0]["case_id"]

    res_graph = client.get(f"/api/cases/{case_id}/graph")
    assert res_graph.status_code == 200
    graph_data = res_graph.json()

    assert "nodes" in graph_data
    assert "edges" in graph_data
    assert len(graph_data["nodes"]) > 0
    assert len(graph_data["edges"]) > 0

    node_types = {n["type"] for n in graph_data["nodes"]}
    assert "merchant" in node_types
    assert "customer" in node_types

    edge_relations = {e["relationship"] for e in graph_data["edges"]}
    assert len(edge_relations) > 0


def test_dashboard_summary_api(setup_test_db):
    client = TestClient(app)
    client.post("/api/detection/run")

    res_dash = client.get("/api/dashboard/summary")
    assert res_dash.status_code == 200
    summary = res_dash.json()

    assert summary["total_cases"] > 0
    assert summary["new_cases"] == summary["total_cases"]
    assert summary["under_review"] == 0
    assert summary["confirmed_fraud"] == 0
    assert summary["false_positives"] == 0
    assert summary["total_merchants_analyzed"] > 0
    assert summary["total_customers_analyzed"] > 0
    assert summary["total_transactions_analyzed"] > 0
