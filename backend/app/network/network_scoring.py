from typing import List, Tuple, Optional
from app.network.network_models import CollusionPattern
from app.network.network_rules import NetworkRulesConfig


class NetworkScorer:
    """
    Computes normalized Network Risk Scores (0-100) and produces
    dynamic human-readable explanations based strictly on calculated evidence.
    """
    def __init__(self, config: Optional[NetworkRulesConfig] = None):
        self.config = config or NetworkRulesConfig()

    def calculate_network_risk(
        self,
        patterns: List[CollusionPattern]
    ) -> Tuple[float, str, List[str]]:
        if not patterns:
            return 0.0, "LOW", ["No suspicious network collusion patterns detected."]

        total_score = sum(p.score_contribution for p in patterns)
        
        # Cap at 100
        norm_score = min(round(total_score, 1), 100.0)

        if norm_score <= self.config.level_low_max:
            level = "LOW"
        elif norm_score <= self.config.level_medium_max:
            level = "MEDIUM"
        elif norm_score <= self.config.level_high_max:
            level = "HIGH"
        else:
            level = "CRITICAL"

        # Generate evidence explanations
        reasons: List[str] = []
        for idx, p in enumerate(patterns, start=1):
            reasons.append(f"{idx}. [{p.severity}] {p.description}")

        return norm_score, level, reasons
