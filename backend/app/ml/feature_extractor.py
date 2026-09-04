import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from app.ml.ml_config import FEATURE_NAMES


class FeatureExtractor:
    """
    Extracts deterministic numerical feature vectors (22 features)
    from transaction data, pair signals, and network graph topology.
    """

    @staticmethod
    def extract_features(
        merchant_id: str,
        customer_id: str,
        transaction_data: Optional[Dict[str, Any]] = None,
        pair_risk_result: Optional[Dict[str, Any]] = None,
        network_detail: Optional[Dict[str, Any]] = None,
        graph_service: Optional[Any] = None
    ) -> Dict[str, float]:
        tx_data = transaction_data or {}
        risk_res = pair_risk_result or {}
        net_det = network_detail or {}

        # 1. Transaction-level features
        amount = float(tx_data.get("amount", 1000.0))
        tx_freq = float(tx_data.get("tx_frequency", 1.0))
        m_tx_count = int(tx_data.get("merchant_tx_count", net_det.get("transaction_count", 5)))
        c_tx_count = int(tx_data.get("customer_tx_count", 3))
        pair_tx_count = int(tx_data.get("pair_tx_count", 2))
        refund_count = int(tx_data.get("refund_count", 0))

        if m_tx_count > 0:
            refund_ratio = min(1.0, max(0.0, refund_count / m_tx_count))
        else:
            refund_ratio = 0.0

        tx_risk_score = float(risk_res.get("risk_score", tx_data.get("transaction_risk_score", 0.0)))
        signals = risk_res.get("signals", {})
        if isinstance(signals, dict):
            risk_ind_count = sum(1 for v in signals.values() if bool(v))
        elif isinstance(signals, list):
            risk_ind_count = len(signals)
        else:
            risk_ind_count = int(tx_data.get("risk_indicators_count", 0))

        burst_count = int(tx_data.get("burst_count", 1 if signals.get("abnormal_refund_velocity") else 0))
        velocity = float(tx_data.get("velocity", 15.0 if signals.get("abnormal_refund_velocity") else 1.0))

        # 2. Network-level features
        m_deg = int(net_det.get("connections_count", 2))
        c_deg = int(tx_data.get("customer_degree", 1))

        shared_device = 1 if (signals.get("shared_device") or net_det.get("shared_device_count")) else 0
        shared_ip = 1 if (signals.get("shared_ip") or net_det.get("shared_ip_count")) else 0
        shared_payment = 1 if (signals.get("shared_payment_identity") or net_det.get("shared_payment_count")) else 0

        net_rel_count = int(net_det.get("connections_count", m_deg + c_deg))
        cluster_size = int(net_det.get("cluster_size", m_deg + 1))
        cluster_density = float(net_det.get("cluster_density", 0.4 if shared_device or shared_payment else 0.1))

        risky_rel_count = int(net_det.get("suspicious_relationships_count", 1 if tx_risk_score >= 60.0 else 0))
        repeated_rel_count = int(net_det.get("repeated_relationship_count", 1 if pair_tx_count >= 3 else 0))
        net_risk_score = float(net_det.get("risk_score", tx_risk_score))

        features = {
            "amount": amount,
            "tx_frequency": tx_freq,
            "merchant_tx_count": float(m_tx_count),
            "customer_tx_count": float(c_tx_count),
            "pair_tx_count": float(pair_tx_count),
            "refund_count": float(refund_count),
            "refund_ratio": refund_ratio,
            "transaction_risk_score": tx_risk_score,
            "risk_indicators_count": float(risk_ind_count),
            "burst_count": float(burst_count),
            "velocity": velocity,
            "merchant_degree": float(m_deg),
            "customer_degree": float(c_deg),
            "shared_device_count": float(shared_device),
            "shared_ip_count": float(shared_ip),
            "shared_payment_count": float(shared_payment),
            "network_relationship_count": float(net_rel_count),
            "cluster_size": float(cluster_size),
            "cluster_density": cluster_density,
            "risky_relationship_count": float(risky_rel_count),
            "repeated_relationship_count": float(repeated_rel_count),
            "network_risk_score": net_risk_score,
        }
        return features

    @staticmethod
    def features_to_array(features: Dict[str, float]) -> np.ndarray:
        return np.array([[features[name] for name in FEATURE_NAMES]], dtype=np.float32)

    @staticmethod
    def features_to_dataframe(features_data: Any) -> pd.DataFrame:
        if isinstance(features_data, dict):
            df = pd.DataFrame([features_data])
        elif isinstance(features_data, list):
            df = pd.DataFrame(features_data)
        else:
            df = pd.DataFrame(features_data)
        return df[FEATURE_NAMES]
