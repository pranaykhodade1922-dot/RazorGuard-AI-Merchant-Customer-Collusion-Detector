import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.ml.feature_extractor import FeatureExtractor
from app.ml.ml_service import MLRiskService
from app.ml.final_scorer import FinalRiskScorer
from app.ml.ml_config import FEATURE_NAMES, TRANSACTION_WEIGHT, NETWORK_WEIGHT, ML_WEIGHT


def test_feature_extraction():
    feats = FeatureExtractor.extract_features("M001", "C001")
    assert len(feats) == len(FEATURE_NAMES)
    assert "amount" in feats
    assert "shared_device_count" in feats

    arr = FeatureExtractor.features_to_array(feats)
    assert arr.shape == (1, len(FEATURE_NAMES))


def test_missing_feature_handling():
    feats = FeatureExtractor.extract_features("M999", "C999", transaction_data=None, pair_risk_result=None)
    assert feats["amount"] == 1000.0
    assert feats["transaction_risk_score"] == 0.0
    assert feats["shared_device_count"] == 0.0


def test_ml_model_artifact_loading():
    service = MLRiskService()
    assert service.model is not None
    info = service.get_model_info()
    assert "model_version" in info
    assert info["feature_count"] == 22


def test_ml_risk_inference():
    service = MLRiskService()
    res = service.predict_ml_risk(
        merchant_id="M089",
        customer_id="C002",
        pair_risk_result={"risk_score": 90.0, "signals": {"shared_device": True, "shared_payment_identity": True}}
    )
    assert 0.0 <= res["ml_risk_score"] <= 100.0
    assert res["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert "top_features" in res
    assert len(res["top_features"]) > 0


def test_score_normalization_and_weights():
    scorer = FinalRiskScorer(tx_weight=0.35, net_weight=0.35, ml_weight=0.30)
    res = scorer.calculate_final_risk(
        transaction_risk_score=100.0,
        network_risk_score=80.0,
        ml_risk_score=90.0
    )
    # Expected: 0.35*100 + 0.35*80 + 0.30*90 = 35 + 28 + 27 = 90.0
    assert res["final_risk_score"] == 90.0
    assert res["final_risk_level"] == "CRITICAL"
    assert len(res["scoring_breakdown"]) == 3


def test_explainability_output():
    service = MLRiskService()
    res = service.predict_ml_risk(
        merchant_id="M089",
        customer_id="C002",
        pair_risk_result={"risk_score": 100.0, "signals": {"shared_payment_identity": True}}
    )
    top_feats = res["top_features"]
    assert isinstance(top_feats, list)
    if top_feats:
        feat = top_feats[0]
        assert "feature" in feat
        assert "importance" in feat
        assert "reason" in feat


def test_deterministic_inference():
    service = MLRiskService()
    res1 = service.predict_ml_risk("M089", "C002", pair_risk_result={"risk_score": 80.0})
    res2 = service.predict_ml_risk("M089", "C002", pair_risk_result={"risk_score": 80.0})
    assert res1["ml_risk_score"] == res2["ml_risk_score"]


def test_api_ml_model_info_endpoint():
    client = TestClient(app)
    res = client.get("/api/ml/model-info")
    assert res.status_code == 200
    data = res.json()
    assert "model_version" in data
    assert "feature_names" in data
    assert len(data["feature_names"]) == 22


def test_api_ml_score_endpoint():
    client = TestClient(app)
    payload = {
        "merchant_id": "M089",
        "customer_id": "C002",
        "pair_risk_result": {"risk_score": 85.0, "signals": {"shared_device": True}}
    }
    res = client.post("/api/ml/score", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "transaction_risk_score" in data
    assert "network_risk_score" in data
    assert "ml_risk_score" in data
    assert "final_risk_score" in data
    assert "top_features" in data
    assert len(data["scoring_breakdown"]) == 3
