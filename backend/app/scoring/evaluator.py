import numpy as np
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix
from typing import List, Dict, Tuple, Any

from app.models.schemas import RiskScoreResult, GroundTruth, EvaluationResult, FalsePositiveCostResult


class ModelEvaluator:
    def __init__(
        self,
        risk_threshold: float = 60.0, # Scores >= 60 (HIGH or CRITICAL) are flagged as positive
        investigation_cost_per_fp: float = 500.0,  # e.g., ₹500 / $50 per false positive investigation
        avoided_loss_per_tp: float = 12500.0       # e.g., ₹12,500 / $1250 per true collusion ring prevented
    ):
        self.risk_threshold = risk_threshold
        self.investigation_cost_per_fp = investigation_cost_per_fp
        self.avoided_loss_per_tp = avoided_loss_per_tp

    def evaluate_predictions(
        self,
        results: List[RiskScoreResult],
        ground_truth: List[GroundTruth]
    ) -> Tuple[EvaluationResult, FalsePositiveCostResult]:
        # Build ground truth map (merchant_id, customer_id) -> is_collusive
        gt_map = {(gt.merchant_id, gt.customer_id): gt.is_collusive for gt in ground_truth}

        y_true = []
        y_pred = []

        for r in results:
            key = (r.merchant_id, r.customer_id)
            # Default to False if pair not in ground truth
            is_true_collusive = gt_map.get(key, False)
            is_pred_collusive = (r.risk_score >= self.risk_threshold)

            y_true.append(1 if is_true_collusive else 0)
            y_pred.append(1 if is_pred_collusive else 0)

        # Compute metrics via scikit-learn
        if not y_true or sum(y_true) == 0:
            prec = 1.0 if sum(y_pred) == 0 else 0.0
            rec = 0.0
            f1 = 0.0
            tn, fp, fn, tp = len(y_true), 0, 0, 0
        else:
            prec = float(precision_score(y_true, y_pred, zero_division=0))
            rec = float(recall_score(y_true, y_pred, zero_division=0))
            f1 = float(f1_score(y_true, y_pred, zero_division=0))
            
            cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
            tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

        eval_res = EvaluationResult(
            precision=round(prec * 100, 2),
            recall=round(rec * 100, 2),
            f1_score=round(f1 * 100, 2),
            confusion_matrix={"tp": tp, "fp": fp, "fn": fn, "tn": tn}
        )

        # False-Positive Cost Calculation
        total_fp_cost = round(fp * self.investigation_cost_per_fp, 2)
        total_avoided_loss = round(tp * self.avoided_loss_per_tp, 2)
        expected_net_value = round(total_avoided_loss - total_fp_cost, 2)

        cost_res = FalsePositiveCostResult(
            investigation_cost_per_fp=self.investigation_cost_per_fp,
            avoided_loss_per_tp=self.avoided_loss_per_tp,
            total_fp_cost=total_fp_cost,
            total_avoided_loss=total_avoided_loss,
            expected_net_value=expected_net_value,
            disclaimer="All financial values are based on synthetic assumptions for defense-only model evaluation."
        )

        return eval_res, cost_res
