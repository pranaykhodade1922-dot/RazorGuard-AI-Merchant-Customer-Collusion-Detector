from pydantic import BaseModel

class NetworkRulesConfig(BaseModel):
    # Pattern Weights for Network Risk Score
    shared_customer_weight: float = 25.0
    circular_relationship_weight: float = 30.0
    dense_cluster_weight: float = 25.0
    shared_device_weight: float = 25.0
    shared_payment_weight: float = 30.0
    shared_ip_weight: float = 10.0
    burst_weight: float = 20.0
    repeated_risk_weight: float = 20.0

    # Detection Thresholds
    burst_window_minutes: int = 15
    burst_min_tx_count: int = 3
    shared_customer_min_merchants: int = 2
    shared_customer_min_customers: int = 2
    dense_cluster_min_density: float = 0.4
    dense_cluster_min_nodes: int = 4
    repeated_risk_min_tx_count: int = 3

    # Risk Boundaries (0-100)
    level_low_max: float = 29.0
    level_medium_max: float = 59.0
    level_high_max: float = 79.0
    # 80-100 = CRITICAL
