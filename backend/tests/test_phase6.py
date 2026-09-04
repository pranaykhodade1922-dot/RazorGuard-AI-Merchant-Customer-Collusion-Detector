import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_auth_me_unauthorized():
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    json_data = response.json()
    assert json_data["error"] == "UNAUTHORIZED"

def test_auth_me_success():
    headers = {"Authorization": "Bearer dev-local-session-token"}
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["email"] == "admin@razorguard.ai"
    assert json_data["role"] == "ADMIN"

def test_csv_ingestion_invalid_header():
    headers = {"Authorization": "Bearer dev-local-session-token"}
    invalid_csv = "random_header_1,random_header_2\nval1,val2"
    files = {"file": ("test.csv", invalid_csv, "text/csv")}
    data = {"dataset_type": "merchants"}
    response = client.post("/api/ingest/csv", headers=headers, files=files, data=data)
    assert response.status_code == 400
    assert response.json()["error"] == "INVALID_CSV_DATASET"

def test_csv_ingestion_success():
    headers = {"Authorization": "Bearer dev-local-session-token"}
    valid_csv = "merchant_id,merchant_name,category\nM-999,Test Merchant Inc,electronics"
    files = {"file": ("merchants.csv", valid_csv, "text/csv")}
    data = {"dataset_type": "merchants"}
    response = client.post("/api/ingest/csv", headers=headers, files=files, data=data)
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "success"
    assert json_data["records_imported"] == 1
