import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app

def verify():
    client = TestClient(app)
    
    print("1. Testing GET /health...")
    r1 = client.get("/health")
    print("   Response:", r1.status_code, r1.json())
    assert r1.status_code == 200

    print("2. Testing POST /api/dataset/generate...")
    r2 = client.post("/api/dataset/generate")
    print("   Response:", r2.status_code, r2.json())
    assert r2.status_code == 200

    print("3. Testing POST /api/detection/run...")
    r3 = client.post("/api/detection/run")
    print("   Response:", r3.status_code, r3.json())
    assert r3.status_code == 200

    print("4. Testing GET /api/cases...")
    r4 = client.get("/api/cases")
    cases = r4.json()
    print("   Total cases returned:", len(cases))
    assert len(cases) > 0
    case_id = cases[0]["case_id"]

    print(f"5. Testing GET /api/cases/{case_id}...")
    r5 = client.get(f"/api/cases/{case_id}")
    print("   Case ID:", r5.json()["case_id"], "| Score:", r5.json()["risk_score"], "| Status:", r5.json()["status"])
    assert r5.status_code == 200

    print(f"6. Testing GET /api/cases/{case_id}/graph...")
    r6 = client.get(f"/api/cases/{case_id}/graph")
    graph = r6.json()
    print("   Graph Nodes:", len(graph["nodes"]), "| Edges:", len(graph["edges"]))
    assert r6.status_code == 200

    print(f"7. Testing POST /api/cases/{case_id}/status...")
    r7 = client.post(f"/api/cases/{case_id}/status", json={"status": "UNDER_REVIEW"})
    print("   Updated Status:", r7.json()["status"])
    assert r7.status_code == 200 and r7.json()["status"] == "UNDER_REVIEW"

    print(f"8. Testing POST /api/cases/{case_id}/notes...")
    r8 = client.post(f"/api/cases/{case_id}/notes", json={"note": "Confirmed suspicious shared hardware with C002"})
    print("   Added Note:", r8.json()["note"])
    assert r8.status_code == 200

    print("9. Testing GET /api/dashboard/summary...")
    r9 = client.get("/api/dashboard/summary")
    print("   Dashboard Summary:", r9.json())
    assert r9.status_code == 200

    print("\n[SUCCESS] ALL VERIFICATION STEPS PASSED PERFECTLY!")

if __name__ == "__main__":
    verify()
