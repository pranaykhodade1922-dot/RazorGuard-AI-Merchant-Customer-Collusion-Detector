import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app

def verify_firebase_endpoints():
    client = TestClient(app)

    print("1. Testing GET /health...")
    r1 = client.get("/health")
    print("   Health Response:", r1.status_code, r1.json())
    assert r1.status_code == 200
    assert "firebase" in r1.json()

    print("2. Testing GET /api/merchants...")
    r2 = client.get("/api/merchants")
    merchants = r2.json()
    print("   Merchants count:", len(merchants))
    assert r2.status_code == 200
    assert len(merchants) > 0

    m_id = merchants[0]["merchant_id"]
    print(f"3. Testing GET /api/merchants/{m_id}...")
    r3 = client.get(f"/api/merchants/{m_id}")
    assert r3.status_code == 200
    assert r3.json()["merchant_id"] == m_id

    print("4. Testing GET /api/customers...")
    r4 = client.get("/api/customers")
    customers = r4.json()
    print("   Customers count:", len(customers))
    assert r4.status_code == 200
    assert len(customers) > 0

    c_id = customers[0]["customer_id"]
    print(f"5. Testing GET /api/customers/{c_id}...")
    r5 = client.get(f"/api/customers/{c_id}")
    assert r5.status_code == 200
    assert r5.json()["customer_id"] == c_id

    print("6. Testing GET /api/transactions...")
    r6 = client.get("/api/transactions?limit=10")
    txs = r6.json()
    print("   Transactions count (limit 10):", len(txs))
    assert r6.status_code == 200
    assert len(txs) > 0

    tx_id = txs[0]["transaction_id"]
    print(f"7. Testing GET /api/transactions/{tx_id}...")
    r7 = client.get(f"/api/transactions/{tx_id}")
    assert r7.status_code == 200
    assert r7.json()["transaction_id"] == tx_id

    print("8. Testing GET /api/alerts...")
    r8 = client.get("/api/alerts")
    alerts = r8.json()
    print("   Alerts count:", len(alerts))
    assert r8.status_code == 200

    print("9. Testing GET /api/network/entities...")
    r9 = client.get("/api/network/entities")
    entities = r9.json()
    print("   Network entities count:", len(entities))
    assert r9.status_code == 200

    print("\n[SUCCESS] ALL FIREBASE ENDPOINT VERIFICATIONS PASSED PERFECTLY!")

if __name__ == "__main__":
    verify_firebase_endpoints()
