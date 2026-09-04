from typing import Dict, Any, List
from app.ml.ml_config import TRANSACTION_WEIGHT, NETWORK_WEIGHT, ML_WEIGHT


class FinalRiskScorer:
    """
    Blends Transaction Risk Score, Network Risk Score, and ML Risk Score
    into a unified 0-100 Final Risk Score using configurable weights.
    """
    def __init__(
        self,
        tx_weight: float = TRANSACTION_WEIGHT,
        net_weight: float = NETWORK_WEIGHT,
        ml_weight: float = ML_WEIGHT
    ):
        self.tx_weight = tx_weight
        self.net_weight = net_weight
        self.ml_weight = ml_weight

    def calculate_final_risk(
        self,
        transaction_risk_score: float,
        network_risk_score: float,
        ml_risk_score: float
    ) -> Dict[str, Any]:
        tx_score = max(0.0, min(100.0, float(transaction_risk_score)))
        net_score = max(0.0, min(100.0, float(network_risk_score)))
        ml_score = max(0.0, min(100.0, float(ml_risk_score)))

        raw_final = (
            (self.tx_weight * tx_score) +
            (self.net_weight * net_score) +
            (self.ml_weight * ml_score)
        )
        final_risk_score = round(min(100.0, max(0.0, raw_final)), 2)

        if final_risk_score >= 80.0:
            final_risk_level = "CRITICAL"
        elif final_risk_score >= 60.0:
            final_risk_level = "HIGH"
        elif final_risk_score >= 30.0:
            final_risk_level = "MEDIUM"
        else:
            final_risk_level = "LOW"

        scoring_weights_breakdown = [
            {
                "engine": "Transaction Rule Engine (Phase 1)",
                "raw_score": tx_score,
                "weight": self.tx_weight,
                "weighted_contribution": round(tx_score * self.tx_weight, 2)
            },
            {
                "engine": "Network Graph Intelligence (Phase 3)",
                "raw_score": net_score,
                "weight": self.net_weight,
                "weighted_contribution": round(net_score * self.net_weight, 2)
            },
            {
                "engine": "ML Risk Intelligence (Phase 4)",
                "raw_score": ml_score,
                "weight": self.ml_weight,
                "weighted_contribution": round(ml_score * self.ml_weight, 2)
            }
        ]

        return {
            "transaction_risk_score": tx_score,
            "network_risk_score": net_score,
            "ml_risk_score": ml_score,
            "final_risk_score": final_risk_score,
            "final_risk_level": final_risk_level,
            "weights": {
                "transaction_weight": self.tx_weight,
                "network_weight": self.net_weight,
                "ml_weight": self.ml_weight
            },
            "scoring_breakdown": scoring_weights_breakdown
        }
