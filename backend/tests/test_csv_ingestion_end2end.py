import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
AUTH_HEADERS = {"Authorization": "Bearer dev-local-session-token"}

def test_ingest_merchants_csv():
    file_path = os.path.join("sample_data", "sample_merchants.csv")
    with open(file_path, "rb") as f:
        response = client.post(
            "/api/ingest/csv",
            headers=AUTH_HEADERS,
            files={"file": ("sample_merchants.csv", f, "text/csv")},
            data={"dataset_type": "merchants"}
        )
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "success"
    assert res["dataset_type"] == "merchants"
    assert res["records_imported"] == 4

def test_ingest_customers_csv():
    file_path = os.path.join("sample_data", "sample_customers.csv")
    with open(file_path, "rb") as f:
        response = client.post(
            "/api/ingest/csv",
            headers=AUTH_HEADERS,
            files={"file": ("sample_customers.csv", f, "text/csv")},
            data={"dataset_type": "customers"}
        )
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "success"
    assert res["dataset_type"] == "customers"
    assert res["records_imported"] == 10

def test_ingest_transactions_csv():
    file_path = os.path.join("sample_data", "sample_transactions.csv")
    with open(file_path, "rb") as f:
        response = client.post(
            "/api/ingest/csv",
            headers=AUTH_HEADERS,
            files={"file": ("sample_transactions.csv", f, "text/csv")},
            data={"dataset_type": "transactions"}
        )
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "success"
    assert res["dataset_type"] == "transactions"
    assert res["records_imported"] == 10

def test_user_supplied_transactions_csv_end2end():
    user_csv = """transaction_id,merchant_id,customer_id,amount,timestamp,payment_method,status,refund_ratio,device_id,ip_address
T001,M001,C001,1250.00,2026-09-01T10:15:00,UPI,SUCCESS,0.0,DEV001,192.168.1.10
T002,M001,C002,1190.00,2026-09-01T10:17:00,UPI,SUCCESS,0.0,DEV001,192.168.1.10
T003,M001,C003,1310.00,2026-09-01T10:19:00,UPI,REFUNDED,1.0,DEV001,192.168.1.10
T004,M002,C004,450.00,2026-09-01T11:05:00,CARD,SUCCESS,0.0,DEV002,192.168.1.20
T005,M002,C005,520.00,2026-09-01T11:30:00,CARD,SUCCESS,0.0,DEV003,192.168.1.21
T006,M003,C006,2100.00,2026-09-01T12:10:00,UPI,SUCCESS,0.0,DEV004,192.168.1.30
T007,M003,C007,2050.00,2026-09-01T12:12:00,UPI,SUCCESS,0.0,DEV004,192.168.1.30
T008,M003,C008,1990.00,2026-09-01T12:14:00,UPI,REFUNDED,1.0,DEV004,192.168.1.30
T009,M004,C009,75.00,2026-09-01T13:00:00,CARD,SUCCESS,0.0,DEV005,192.168.1.40
T010,M004,C010,95.00,2026-09-01T13:25:00,CARD,SUCCESS,0.0,DEV006,192.168.1.41"""

    response = client.post(
        "/api/ingest/csv",
        headers=AUTH_HEADERS,
        files={"file": ("user_test.csv", user_csv, "text/csv")},
        data={"dataset_type": "transactions"}
    )
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "success"
    assert res["records_imported"] == 10

    # Execute full detection pipeline on imported dataset
    det_res = client.post("/api/detection/run", headers=AUTH_HEADERS)
    assert det_res.status_code == 200
    det_json = det_res.json()
    assert det_json["status"] == "success"
    assert det_json["cases_created"] > 0
