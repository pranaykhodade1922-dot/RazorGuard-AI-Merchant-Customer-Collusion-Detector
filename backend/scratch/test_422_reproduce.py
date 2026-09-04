from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def reproduce_422():
    csv_text = """transaction_id,merchant_id,customer_id,amount,timestamp,payment_method,status,refund_ratio,device_id,ip_address
T001,M001,C001,1250.00,2026-09-01T10:15:00,UPI,SUCCESS,0.0,DEV001,192.168.1.10
T002,M001,C002,1190.00,2026-09-01T10:17:00,UPI,SUCCESS,0.0,DEV001,192.168.1.10
"""
    headers = {"Authorization": "Bearer dev-local-session-token", "Content-Type": "text/csv"}
    # 1. Attempt raw body upload with query param (how frontend currently calls it)
    res_raw = client.post("/api/ingest/csv?dataset_type=transactions", headers=headers, content=csv_text)
    print("--- RAW BODY ATTEMPT ---")
    print("Status code:", res_raw.status_code)
    print("Response JSON:", res_raw.json())

    # 2. Attempt correct multipart form-data upload
    headers_form = {"Authorization": "Bearer dev-local-session-token"}
    files = {"file": ("transactions.csv", csv_text, "text/csv")}
    data = {"dataset_type": "transactions"}
    res_form = client.post("/api/ingest/csv", headers=headers_form, files=files, data=data)
    print("\n--- MULTIPART FORM-DATA ATTEMPT ---")
    print("Status code:", res_form.status_code)
    print("Response JSON:", res_form.json())

if __name__ == "__main__":
    reproduce_422()
