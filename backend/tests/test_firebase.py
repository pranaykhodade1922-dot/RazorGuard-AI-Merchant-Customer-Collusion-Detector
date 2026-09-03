import pytest
import os
from fastapi.testclient import TestClient

from app.main import app
from app.services.firebase_service import FirebaseService
from app.services.firestore_store import FirestoreStore


@pytest.fixture(autouse=True)
def setup_test_store(tmp_path):
    store = FirestoreStore()
    store.clear_all()
    yield store
    store.clear_all()


def test_firebase_initialization_and_fallback():
    fb = FirebaseService()
    assert fb is not None
    # Verify status message string exists
    status = fb.get_status_message()
    assert isinstance(status, str)


def test_firestore_crud_operations(setup_test_store):
    store = setup_test_store

    # 1. Create document
    data = {"merchant_id": "M999", "merchant_name": "Test Store", "risk_score": 85.0}
    created = store.create_document("merchants", "M999", data)
    assert created["merchant_id"] == "M999"

    # 2. Get document
    retrieved = store.get_document("merchants", "M999")
    assert retrieved is not None
    assert retrieved["merchant_name"] == "Test Store"

    # 3. Update document
    updated = store.update_document("merchants", "M999", {"risk_score": 95.0})
    assert updated["risk_score"] == 95.0

    # 4. List documents
    docs = store.list_documents("merchants", filters={"merchant_id": "M999"})
    assert len(docs) == 1

    # 5. Delete document
    deleted = store.delete_document("merchants", "M999")
    assert deleted is True
    assert store.get_document("merchants", "M999") is None


def test_audit_logging(setup_test_store):
    store = setup_test_store
    log = store.log_audit("CASE_CREATED", "risk_case", "CASE-0001", {"score": 90})

    assert log["log_id"].startswith("LOG-")
    assert log["action"] == "CASE_CREATED"
    assert log["entity_id"] == "CASE-0001"

    logs = store.list_documents("audit_logs")
    assert len(logs) >= 1


def test_entity_persistence_helpers(setup_test_store):
    store = setup_test_store

    m = store.save_merchant({"merchant_id": "M100", "merchant_name": "Store 100"})
    assert store.get_document("merchants", "M100") is not None

    c = store.save_customer({"customer_id": "C100", "customer_name": "Customer 100"})
    assert store.get_document("customers", "C100") is not None

    tx = store.save_transaction({"transaction_id": "T100", "merchant_id": "M100", "customer_id": "C100", "amount": 500.0})
    assert store.get_document("transactions", "T100") is not None

    cs = store.save_case({"case_id": "CASE-100", "merchant_id": "M100", "risk_score": 90.0, "risk_level": "CRITICAL"})
    assert store.get_document("risk_cases", "CASE-100") is not None
    # Check alert auto-generated for CRITICAL
    alert = store.get_document("alerts", "ALT-CASE-100")
    assert alert is not None
    assert alert["severity"] == "CRITICAL"


def test_health_endpoint_firebase_status():
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert "firebase" in data
    assert isinstance(data["firebase"], str)
