import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app

def verify_phase4_ml():
    client = TestClient(app)

    print("1. Testing GET /health...")
    r1 = client.get("/health")
    print("   Health Response:", r1.status_code, r1.json())
    assert r1.status_code == 200

    print("2. Testing GET /api/ml/model-info...")
    r2 = client.get("/api/ml/model-info")
    info = r2.json()
    print("   Model Version:", info["model_version"])
    print("   Algorithm:    ", info["algorithm"])
    print("   Feature Count:", info["feature_count"])
    print("   Metrics:      ", info["metrics"])
    assert r2.status_code == 200
    assert info["feature_count"] == 22

    print("3. Testing POST /api/ml/score for suspicious pair M089 / C002...")
    payload = {
        "merchant_id": "M089",
        "customer_id": "C002",
        "pair_risk_result": {
            "risk_score": 100.0,
            "signals": {
                "shared_device": True,
                "shared_payment_identity": True,
                "abnormal_refund_velocity": True
            }
        },
        "network_detail": {
            "risk_score": 85.0,
            "connections_count": 6,
            "suspicious_relationships_count": 4
        }
    }
    r3 = client.post("/api/ml/score", json=payload)
    score_res = r3.json()
    print("   ML Score Result:")
    print(f"   - Transaction Risk Score: {score_res['transaction_risk_score']}")
    print(f"   - Network Risk Score:     {score_res['network_risk_score']}")
    print(f"   - ML Risk Score:          {score_res['ml_risk_score']}")
    print(f"   - Final Blended Score:    {score_res['final_risk_score']} ({score_res['final_risk_level']})")
    print(f"   - Model Version:          {score_res['model_version']}")
    print("   - Top Feature Explanations:")
    for feat in score_res["top_features"]:
        print(f"     * {feat['feature']} (val: {feat['value']}, imp: {feat['importance']}): {feat['reason']}")

    assert r3.status_code == 200
    assert score_res["final_risk_score"] > 0
    assert len(score_res["scoring_breakdown"]) == 3

    print("\n[SUCCESS] ALL PHASE 4 ML ENDPOINTS & VERIFICATIONS PASSED PERFECTLY!")

if __name__ == "__main__":
    verify_phase4_ml()
