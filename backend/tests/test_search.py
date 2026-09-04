import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_global_search_endpoint():
    client = TestClient(app)
    
    # 1. Search for merchant query
    res1 = client.get("/api/search?q=M00")
    assert res1.status_code == 200
    results1 = res1.json()
    assert isinstance(results1, list)
    assert len(results1) > 0
    assert any(item["type"] == "MERCHANT" for item in results1)

    # 2. Search for case query
    res2 = client.get("/api/search?q=CASE")
    assert res2.status_code == 200
    results2 = res2.json()
    assert isinstance(results2, list)

    # 3. Validation for minimum query length
    res3 = client.get("/api/search?q=")
    assert res3.status_code == 422  # Validation error
