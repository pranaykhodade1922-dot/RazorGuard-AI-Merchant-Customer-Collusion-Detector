from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class NetworkNode(BaseModel):
    id: str
    type: str  # "MERCHANT", "CUSTOMER", "DEVICE", "PAYMENT_FINGERPRINT", "IP", "ADDRESS"
    label: str
    risk_score: float = 0.0
    risk_level: str = "LOW"
    attributes: Dict[str, Any] = Field(default_factory=dict)

class NetworkEdge(BaseModel):
    source: str
    target: str
    relationship: str  # "TRANSACTED_WITH", "SHARES_DEVICE", "SHARES_PAYMENT", "SHARES_IP", "SHARES_ADDRESS"
    transaction_count: int = 0
    total_amount: float = 0.0
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None
    risk_score: float = 0.0
    metadata: Dict[str, Any] = Field(default_factory=dict)

class CollusionPattern(BaseModel):
    pattern_type: str  # "SHARED_CUSTOMER_CLUSTER", "CIRCULAR_RELATIONSHIP", "DENSE_COLLUSION_CLUSTER", "SHARED_DEVICE", "SHARED_PAYMENT_FINGERPRINT", "SHARED_IP", "COORDINATED_TRANSACTION_BURST", "REPEATED_RISKY_RELATIONSHIP"
    severity: str  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    score_contribution: float = 0.0
    entities_involved: List[str] = Field(default_factory=list)
    description: str = ""
    details: Dict[str, Any] = Field(default_factory=dict)

class NetworkCluster(BaseModel):
    cluster_id: str
    risk_score: float
    risk_level: str
    merchants_count: int
    customers_count: int
    transaction_count: int
    total_amount: float
    patterns: List[str]
    primary_reasons: List[str]
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]

class EntityNetworkDetail(BaseModel):
    entity_id: str
    entity_type: str
    name: str
    risk_score: float
    risk_level: str
    connections_count: int
    transaction_count: int
    total_amount: float
    suspicious_relationships_count: int
    patterns: List[str]
    connected_entities: List[Dict[str, Any]]

class NetworkOverview(BaseModel):
    total_nodes: int
    total_edges: int
    merchant_count: int
    customer_count: int
    transaction_count: int
    suspicious_relationships: int
    high_risk_clusters: int
    critical_clusters: int

class ShortestPathResponse(BaseModel):
    source_id: str
    target_id: str
    path_length: int
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]
