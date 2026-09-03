import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app

def verify_phase3():
    client = TestClient(app)

    print("1. Testing GET /health...")
    r1 = client.get("/health")
    print("   Response:", r1.status_code, r1.json())
    assert r1.status_code == 200

    print("2. Testing POST /api/detection/run...")
    r2 = client.post("/api/detection/run")
    print("   Response:", r2.status_code, r2.json())
    assert r2.status_code == 200

    print("3. Testing GET /api/network/overview...")
    r3 = client.get("/api/network/overview")
    print("   Overview:", r3.json())
    assert r3.status_code == 200
    assert r3.json()["total_nodes"] > 0

    print("4. Testing GET /api/network/nodes...")
    r4 = client.get("/api/network/nodes?entity_type=MERCHANT")
    nodes = r4.json()
    print("   Merchants Count:", len(nodes))
    assert len(nodes) > 0

    print("5. Testing GET /api/network/edges...")
    r5 = client.get("/api/network/edges")
    edges = r5.json()
    print("   Edges Count:", len(edges))
    assert len(edges) > 0

    print("6. Testing GET /api/network/clusters...")
    r6 = client.get("/api/network/clusters")
    clusters = r6.json()
    print("   Clusters Count:", len(clusters))
    assert len(clusters) > 0

    print("7. Testing GET /api/network/risky-relationships...")
    r7 = client.get("/api/network/risky-relationships")
    risky = r7.json()
    print("   Risky Relationships Count:", len(risky))
    assert r7.status_code == 200

    m_id = nodes[0]["id"]
    print(f"8. Testing GET /api/network/entity/{m_id}...")
    r8 = client.get(f"/api/network/entity/{m_id}")
    print("   Entity Detail:", r8.json()["name"], "| Risk Score:", r8.json()["risk_score"])
    assert r8.status_code == 200

    print(f"9. Testing GET /api/network/entity/{m_id}/connections...")
    r9 = client.get(f"/api/network/entity/{m_id}/connections")
    conn = r9.json()
    print("   1-Hop Subgraph Nodes:", len(conn["nodes"]), "| Edges:", len(conn["edges"]))
    assert r9.status_code == 200

    print("10. Testing GET /api/network/cases...")
    r10 = client.get("/api/network/cases")
    cases = r10.json()
    print("    Network Collusion Cases:", len(cases))
    assert r10.status_code == 200

    print("\n[SUCCESS] ALL PHASE 3 END-TO-END VERIFICATION TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    verify_phase3()
