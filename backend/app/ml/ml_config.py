import os

# Configurable Weights for Final Risk Score (Sum = 1.0)
TRANSACTION_WEIGHT = 0.35
NETWORK_WEIGHT = 0.35
ML_WEIGHT = 0.30

# Model Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "random_forest_v1.joblib")
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")

# Default Model Metadata
DEFAULT_MODEL_VERSION = "1.0.0-rf-synthetic"
DEFAULT_ALGORITHM = "RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)"

# Feature Names List (22 Numerical Features)
FEATURE_NAMES = [
    # Transaction-level features (11)
    "amount",
    "tx_frequency",
    "merchant_tx_count",
    "customer_tx_count",
    "pair_tx_count",
    "refund_count",
    "refund_ratio",
    "transaction_risk_score",
    "risk_indicators_count",
    "burst_count",
    "velocity",
    # Network-level features (11)
    "merchant_degree",
    "customer_degree",
    "shared_device_count",
    "shared_ip_count",
    "shared_payment_count",
    "network_relationship_count",
    "cluster_size",
    "cluster_density",
    "risky_relationship_count",
    "repeated_relationship_count",
    "network_risk_score"
]
