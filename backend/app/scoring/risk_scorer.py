from pydantic import BaseModel
from typing import List, Dict, Tuple, Optional, Any

from app.models.schemas import PairSignals, RiskScoreResult


class RiskScoringConfig(BaseModel):
    # Base Signal Weights (Max base sum = 100)
    weight_shared_payment_identity: float = 30.0
    weight_shared_device: float = 25.0
    weight_shared_ip: float = 10.0
    weight_high_address_similarity: float = 15.0
    weight_abnormal_refund_velocity: float = 20.0
    
    # Thresholds
    address_similarity_threshold: float = 0.80
    refund_ratio_threshold: float = 0.65
    refund_velocity_threshold: float = 8.0
    min_tx_for_behavioral_flag: int = 4
    
    # Risk Level Boundaries
    level_low_max: float = 29.0
    level_medium_max: float = 59.0
    level_high_max: float = 79.0
    # 80-100 = CRITICAL


class RiskScorer:
    def __init__(self, config: Optional[RiskScoringConfig] = None):
        self.config = config or RiskScoringConfig()

    def calculate_risk(
        self,
        merchant_id: str,
        customer_id: str,
        signals: PairSignals,
        ground_truth_collusive: Optional[bool] = None
    ) -> RiskScoreResult:
        score = 0.0
        evidence: List[str] = []

        # Signal 1: Shared Payment / Refund Identity
        if signals.shared_payment_identity:
            score += self.config.weight_shared_payment_identity
            evidence.append(
                f"Shared payment identity detected: Customer payout/refund destination matches Merchant account (+{int(self.config.weight_shared_payment_identity)} pts)"
            )

        # Signal 2: Shared Device
        if signals.shared_device:
            score += self.config.weight_shared_device
            evidence.append(
                f"Shared device fingerprint: Customer and Merchant operating on same registered hardware (+{int(self.config.weight_shared_device)} pts)"
            )

        # Signal 3: Shared IP
        if signals.shared_ip:
            score += self.config.weight_shared_ip
            evidence.append(
                f"Shared IP address: Transactions originate from Merchant's registered network IP (+{int(self.config.weight_shared_ip)} pts)"
            )

        # Signal 4: Address Similarity
        if signals.address_similarity >= self.config.address_similarity_threshold:
            score += self.config.weight_high_address_similarity
            pct = int(signals.address_similarity * 100)
            evidence.append(
                f"High address similarity ({pct}% token match): Same location/suite (+{int(self.config.weight_high_address_similarity)} pts)"
            )

        # Signal 5: Abnormal Refund Velocity & Behavioral Concentration
        is_abnormal_velocity = (
            signals.refund_velocity_ratio >= self.config.refund_velocity_threshold or
            (signals.refund_ratio >= self.config.refund_ratio_threshold and signals.pair_transaction_count >= self.config.min_tx_for_behavioral_flag)
        )

        if is_abnormal_velocity:
            score += self.config.weight_abnormal_refund_velocity
            evidence.append(
                f"Abnormal refund velocity ({signals.refund_velocity_ratio:.1f}x baseline, {int(signals.refund_ratio * 100)}% refund rate across {signals.pair_transaction_count} txs) (+{int(self.config.weight_abnormal_refund_velocity)} pts)"
            )

        # Multi-signal Synergy Bonus (If multiple independent identity overlaps exist)
        overlap_count = (
            int(signals.shared_device) +
            int(signals.shared_ip) +
            int(signals.shared_payment_identity) +
            int(signals.address_similarity >= self.config.address_similarity_threshold)
        )

        if overlap_count >= 2:
            synergy_bonus = 10.0
            score += synergy_bonus
            evidence.append(
                f"Multi-signal collusion cluster: {overlap_count} independent identity overlaps confirmed (+{int(synergy_bonus)} synergy bonus)"
            )

        # Cap score at 100
        score = min(round(score, 1), 100.0)

        # Map to Risk Level
        if score <= self.config.level_low_max:
            risk_level = "LOW"
        elif score <= self.config.level_medium_max:
            risk_level = "MEDIUM"
        elif score <= self.config.level_high_max:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"

        if not evidence:
            evidence.append("No suspicious identity or transaction collusion signals detected (Normal activity)")

        return RiskScoreResult(
            merchant_id=merchant_id,
            customer_id=customer_id,
            risk_score=score,
            risk_level=risk_level,
            evidence=evidence,
            signals=signals,
            is_collusive_ground_truth=ground_truth_collusive
        )
