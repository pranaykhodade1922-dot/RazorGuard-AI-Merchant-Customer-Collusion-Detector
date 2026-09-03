import pytest
import os
from fastapi.testclient import TestClient
from datetime import datetime, timezone

from app.main import app
from app.cases.case_store import CaseStore
from app.models.schemas import Merchant, Customer, Transaction, PairSignals, RiskScoreResult
from app.network.graph_service import NetworkGraphService
from app.network.pattern_detector import CollusionPatternDetector
from app.network.network_scoring import NetworkScorer
from app.network.network_service import NetworkService


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    db_file = os.path.join(tmp_path, "test_network_razorguard.db")
    monkeypatch.setenv("RAZORGUARD_DB_PATH", db_file)
    from app.main import case_service, network_service
    store = CaseStore(db_path=db_file)
    case_service.store = store
    network_service.store = store
    store.clear_all()
    yield store
    store.clear_all()


def test_pattern_shared_customer_cluster():
    graph_service = NetworkGraphService()
    detector = CollusionPatternDetector()

    m1 = Merchant(merchant_id="M101", merchant_name="Store 101", category="Retail", payout_upi="u1@upi", payout_bank_account="b1", registered_device_id="d1", registered_ip="1.1.1.1", address="10 Main St", city="NYC")
    m2 = Merchant(merchant_id="M102", merchant_name="Store 102", category="Tech", payout_upi="u2@upi", payout_bank_account="b2", registered_device_id="d2", registered_ip="2.2.2.2", address="20 Wall St", city="NYC")

    c1 = Customer(customer_id="C101", customer_name="Alice", upi_id="a@upi", device_id="da", ip_address="3.3.3.3", address="10 Main St", city="NYC")
    c2 = Customer(customer_id="C102", customer_name="Bob", upi_id="b@upi", device_id="db", ip_address="4.4.4.4", address="10 Main St", city="NYC")

    txs = [
        Transaction(transaction_id="T1", merchant_id="M101", customer_id="C101", amount=100.0, timestamp="2026-09-01T10:00:00Z", payment_status="SUCCESS", refund_status="NONE", device_id="da", ip_address="3.3.3.3", customer_upi="a@upi"),
        Transaction(transaction_id="T2", merchant_id="M101", customer_id="C102", amount=150.0, timestamp="2026-09-01T10:05:00Z", payment_status="SUCCESS", refund_status="NONE", device_id="db", ip_address="4.4.4.4", customer_upi="b@upi"),
        Transaction(transaction_id="T3", merchant_id="M102", customer_id="C101", amount=200.0, timestamp="2026-09-01T10:10:00Z", payment_status="SUCCESS", refund_status="NONE", device_id="da", ip_address="3.3.3.3", customer_upi="a@upi"),
        Transaction(transaction_id="T4", merchant_id="M102", customer_id="C102", amount=250.0, timestamp="2026-09-01T10:15:00Z", payment_status="SUCCESS", refund_status="NONE", device_id="db", ip_address="4.4.4.4", customer_upi="b@upi"),
    ]

    graph_service.build_network_graph([m1, m2], [c1, c2], txs)
    patterns = detector._detect_shared_customer_clusters(graph_service, [m1, m2], [c1, c2])

    assert len(patterns) >= 1
    assert patterns[0].pattern_type == "SHARED_CUSTOMER_CLUSTER"
    assert "M101" in patterns[0].entities_involved
    assert "M102" in patterns[0].entities_involved


def test_pattern_shared_fingerprint():
    detector = CollusionPatternDetector()

    # Same device ID shared between Merchant M201 and Customer C201
    m1 = Merchant(merchant_id="M201", merchant_name="Store 201", category="Retail", payout_upi="m201@upi", payout_bank_account="b1", registered_device_id="DEV-SHARED-99", registered_ip="1.1.1.1", address="Addr A", city="City A")
    c1 = Customer(customer_id="C201", customer_name="Customer 201", upi_id="m201@upi", device_id="DEV-SHARED-99", ip_address="1.1.1.1", address="Addr B", city="City A")

    patterns = detector._detect_shared_fingerprints([m1], [c1])
    types = {p.pattern_type for p in patterns}

    assert "SHARED_DEVICE" in types
    assert "SHARED_PAYMENT_FINGERPRINT" in types


def test_pattern_coordinated_burst():
    detector = CollusionPatternDetector()
    now_iso = datetime.now(timezone.utc).isoformat()

    txs = [
        Transaction(transaction_id="TXB1", merchant_id="M301", customer_id="C301", amount=100.0, timestamp="2026-09-03T10:00:00Z", payment_status="SUCCESS", refund_status="REFUNDED", device_id="d1", ip_address="1.1", customer_upi="u1"),
        Transaction(transaction_id="TXB2", merchant_id="M301", customer_id="C302", amount=200.0, timestamp="2026-09-03T10:02:00Z", payment_status="SUCCESS", refund_status="REFUNDED", device_id="d2", ip_address="1.2", customer_upi="u2"),
        Transaction(transaction_id="TXB3", merchant_id="M301", customer_id="C303", amount=300.0, timestamp="2026-09-03T10:04:00Z", payment_status="SUCCESS", refund_status="REFUNDED", device_id="d3", ip_address="1.3", customer_upi="u3"),
    ]

    patterns = detector._detect_coordinated_bursts(txs)
    assert len(patterns) >= 1
    assert patterns[0].pattern_type == "COORDINATED_TRANSACTION_BURST"


def test_network_scoring():
    scorer = NetworkScorer()
    from app.network.network_models import CollusionPattern

    p1 = CollusionPattern(pattern_type="SHARED_PAYMENT_FINGERPRINT", severity="CRITICAL", score_contribution=30.0, entities_involved=["M1", "C1"], description="Shared payment destination")
    p2 = CollusionPattern(pattern_type="SHARED_DEVICE", severity="HIGH", score_contribution=25.0, entities_involved=["M1", "C1"], description="Shared device fingerprint")
    p3 = CollusionPattern(pattern_type="CIRCULAR_RELATIONSHIP", severity="CRITICAL", score_contribution=30.0, entities_involved=["M1", "C1"], description="Circular loop detected")

    score, level, reasons = scorer.calculate_network_risk([p1, p2, p3])
    assert score == 85.0
    assert level == "CRITICAL"
    assert len(reasons) == 3


def test_network_api_endpoints_and_cases(setup_test_db):
    client = TestClient(app)

    # 1. Run detection run
    r_run = client.post("/api/detection/run")
    assert r_run.status_code == 200

    # 2. Get network overview
    r_ov = client.get("/api/network/overview")
    assert r_ov.status_code == 200
    ov = r_ov.json()
    assert ov["total_nodes"] > 0
    assert ov["total_edges"] > 0
    assert ov["merchant_count"] > 0
    assert ov["customer_count"] > 0

    # 3. Get network nodes & edges
    r_nodes = client.get("/api/network/nodes?entity_type=MERCHANT")
    assert r_nodes.status_code == 200
    assert len(r_nodes.json()) > 0

    r_edges = client.get("/api/network/edges")
    assert r_edges.status_code == 200
    assert len(r_edges.json()) > 0

    # 4. Get clusters
    r_clusters = client.get("/api/network/clusters")
    assert r_clusters.status_code == 200
    clusters = r_clusters.json()
    assert len(clusters) > 0

    # 5. Entity detail & connections
    first_node_id = r_nodes.json()[0]["id"]
    r_entity = client.get(f"/api/network/entity/{first_node_id}")
    assert r_entity.status_code == 200
    e_detail = r_entity.json()
    assert e_detail["entity_id"] == first_node_id

    r_conn = client.get(f"/api/network/entity/{first_node_id}/connections")
    assert r_conn.status_code == 200
    assert "nodes" in r_conn.json()

    # 6. Network cases
    r_ncases = client.get("/api/network/cases")
    assert r_ncases.status_code == 200
    assert len(r_ncases.json()) > 0


def test_network_edge_cases():
    client = TestClient(app)

    # Missing entity 404
    r_404 = client.get("/api/network/entity/INVALID-ENTITY-9999")
    assert r_404.status_code == 404
    assert r_404.json()["error"] == "ENTITY_NOT_FOUND"

    # Missing path 404
    r_p404 = client.get("/api/network/path/INVALID-1/INVALID-2")
    assert r_p404.status_code == 404
    assert r_p404.json()["error"] == "PATH_NOT_FOUND"
