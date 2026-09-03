from typing import List, Tuple
from app.models.schemas import PairSignals, EvidenceDetail, ScoreBreakdownItem
from app.scoring.risk_scorer import RiskScoringConfig


class EvidenceEngine:
    """
    Explainable Evidence Engine converting raw risk signals into
    human-readable evidence explanations and structured score breakdowns.
    """
    def __init__(self, config: RiskScoringConfig = None):
        self.config = config or RiskScoringConfig()

    def generate_evidence_and_breakdown(
        self,
        merchant_id: str,
        customer_id: str,
        signals: PairSignals
    ) -> Tuple[List[EvidenceDetail], List[ScoreBreakdownItem]]:
        evidence_list: List[EvidenceDetail] = []
        breakdown: List[ScoreBreakdownItem] = []

        # 1. Shared Payment / Refund Destination Identity
        if signals.shared_payment_identity:
            contrib = self.config.weight_shared_payment_identity
            breakdown.append(ScoreBreakdownItem(
                signal="shared_payment_identity",
                weight=self.config.weight_shared_payment_identity,
                contribution=contrib
            ))
            evidence_list.append(EvidenceDetail(
                signal="shared_payment_identity",
                severity="CRITICAL",
                value=True,
                threshold=True,
                explanation=f"Merchant {merchant_id} and customer {customer_id} share the same payment/payout identity."
            ))

        # 2. Shared Device Fingerprint
        if signals.shared_device:
            contrib = self.config.weight_shared_device
            breakdown.append(ScoreBreakdownItem(
                signal="shared_device",
                weight=self.config.weight_shared_device,
                contribution=contrib
            ))
            evidence_list.append(EvidenceDetail(
                signal="shared_device",
                severity="HIGH",
                value=True,
                threshold=True,
                explanation=f"Merchant {merchant_id} and customer {customer_id} share the same device fingerprint."
            ))

        # 3. Shared IP Address
        if signals.shared_ip:
            contrib = self.config.weight_shared_ip
            breakdown.append(ScoreBreakdownItem(
                signal="shared_ip",
                weight=self.config.weight_shared_ip,
                contribution=contrib
            ))
            evidence_list.append(EvidenceDetail(
                signal="shared_ip",
                severity="MEDIUM",
                value=True,
                threshold=True,
                explanation=f"Merchant {merchant_id} and customer {customer_id} operate from the same IP address."
            ))

        # 4. Address Similarity
        if signals.address_similarity >= self.config.address_similarity_threshold:
            pct = int(signals.address_similarity * 100)
            contrib = self.config.weight_high_address_similarity
            breakdown.append(ScoreBreakdownItem(
                signal="address_similarity",
                weight=self.config.weight_high_address_similarity,
                contribution=contrib
            ))
            evidence_list.append(EvidenceDetail(
                signal="address_similarity",
                severity="HIGH",
                value=round(signals.address_similarity, 2),
                threshold=self.config.address_similarity_threshold,
                explanation=f"The merchant and customer addresses are {pct}% similar."
            ))

        # 5. Abnormal Refund Velocity
        is_abnormal_velocity = (
            signals.refund_velocity_ratio >= self.config.refund_velocity_threshold or
            (signals.refund_ratio >= self.config.refund_ratio_threshold and signals.pair_transaction_count >= self.config.min_tx_for_behavioral_flag)
        )
        if is_abnormal_velocity:
            contrib = self.config.weight_abnormal_refund_velocity
            vel_val = round(signals.refund_velocity_ratio, 1)
            breakdown.append(ScoreBreakdownItem(
                signal="abnormal_refund_velocity",
                weight=self.config.weight_abnormal_refund_velocity,
                contribution=contrib
            ))
            evidence_list.append(EvidenceDetail(
                signal="abnormal_refund_velocity",
                severity="HIGH",
                value=vel_val,
                threshold=self.config.refund_velocity_threshold,
                explanation=f"Refund activity is approximately {int(vel_val) if vel_val >= 10 else vel_val}x higher than the expected baseline."
            ))

        # 6. Multi-signal synergy bonus
        overlap_count = (
            int(signals.shared_device) +
            int(signals.shared_ip) +
            int(signals.shared_payment_identity) +
            int(signals.address_similarity >= self.config.address_similarity_threshold)
        )
        if overlap_count >= 2:
            synergy_bonus = 10.0
            breakdown.append(ScoreBreakdownItem(
                signal="multi_signal_synergy",
                weight=10.0,
                contribution=synergy_bonus
            ))
            evidence_list.append(EvidenceDetail(
                signal="multi_signal_synergy",
                severity="CRITICAL",
                value=overlap_count,
                threshold=2,
                explanation=f"Multi-signal collusion cluster confirmed with {overlap_count} independent identity overlaps."
            ))

        return evidence_list, breakdown
