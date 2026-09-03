import pytest
from app.models.schemas import PairSignals
from app.scoring.risk_scorer import RiskScorer, RiskScoringConfig


def test_score_range_and_levels():
    scorer = RiskScorer()

    # Empty signals
    sig_zero = PairSignals()
    res_zero = scorer.calculate_risk("M001", "C001", sig_zero)
    assert res_zero.risk_score == 0.0
    assert res_zero.risk_level == "LOW"

    # All signals active
    sig_max = PairSignals(
        shared_device=True,
        shared_ip=True,
        shared_payment_identity=True,
        address_similarity=0.95,
        refund_ratio=0.90,
        refund_velocity_ratio=50.0,
        pair_transaction_count=15
    )
    res_max = scorer.calculate_risk("M001", "C002", sig_max)
    assert 0.0 <= res_max.risk_score <= 100.0
    assert res_max.risk_level == "CRITICAL"


def test_custom_configurable_config():
    custom_cfg = RiskScoringConfig(
        weight_shared_device=40.0,
        weight_shared_payment_identity=40.0
    )
    custom_scorer = RiskScorer(config=custom_cfg)

    sig = PairSignals(shared_device=True)
    res = custom_scorer.calculate_risk("M001", "C003", sig)
    assert res.risk_score == 40.0
    assert res.risk_level == "MEDIUM"


def test_evidence_contents():
    scorer = RiskScorer()
    sig = PairSignals(
        shared_device=True,
        shared_payment_identity=True,
        address_similarity=0.91
    )
    res = scorer.calculate_risk("M001", "C004", sig)

    evidence_text = " ".join(res.evidence)
    assert "Shared device" in evidence_text
    assert "Shared payment identity" in evidence_text
    assert "High address similarity" in evidence_text
