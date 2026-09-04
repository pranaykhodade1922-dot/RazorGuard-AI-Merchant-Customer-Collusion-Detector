from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class Merchant(BaseModel):
    merchant_id: str
    merchant_name: str
    category: str
    payout_upi: str
    payout_bank_account: str
    registered_device_id: str
    registered_ip: str
    address: str
    city: str

class Customer(BaseModel):
    customer_id: str
    customer_name: str
    upi_id: str
    device_id: str
    ip_address: str
    address: str
    city: str

class Transaction(BaseModel):
    transaction_id: str
    merchant_id: str
    customer_id: str
    amount: float
    timestamp: str  # ISO string format
    payment_status: str  # "SUCCESS", "FAILED"
    refund_status: str   # "NONE", "REFUNDED"
    refund_timestamp: Optional[str] = None
    device_id: str
    ip_address: str
    customer_upi: str

class GroundTruth(BaseModel):
    merchant_id: str
    customer_id: str
    is_collusive: bool
    ring_id: Optional[str] = None
    ring_type: Optional[str] = None

class PairSignals(BaseModel):
    shared_device: bool = False
    shared_ip: bool = False
    shared_payment_identity: bool = False
    name_similarity: float = 0.0
    address_similarity: float = 0.0
    shared_city: bool = False
    refund_frequency: int = 0
    refund_ratio: float = 0.0
    refund_velocity_ratio: float = 1.0
    avg_refund_time_sec: float = 0.0
    transaction_concentration: float = 0.0
    pair_transaction_count: int = 0

class RiskScoreResult(BaseModel):
    merchant_id: str
    customer_id: str
    risk_score: float
    risk_level: str  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    evidence: List[str]
    signals: PairSignals
    is_collusive_ground_truth: Optional[bool] = None

class SuspiciousCase(BaseModel):
    merchant_id: str
    merchant_name: str
    max_risk_score: float
    risk_level: str
    connected_customers: List[str]
    collusive_ring_id: Optional[str] = None
    evidence_summary: List[str]
    pair_details: List[RiskScoreResult]

class DatasetSummary(BaseModel):
    merchants_count: int
    customers_count: int
    transactions_count: int
    collusion_rings_count: int

class EvaluationResult(BaseModel):
    precision: float
    recall: float
    f1_score: float
    confusion_matrix: Dict[str, int]  # {"tp": int, "fp": int, "fn": int, "tn": int}

class FalsePositiveCostResult(BaseModel):
    investigation_cost_per_fp: float
    avoided_loss_per_tp: float
    total_fp_cost: float
    total_avoided_loss: float
    expected_net_value: float
    disclaimer: str = "All values are based on synthetic assumptions for defense-only model evaluation."

# Phase 2 Investigation & Case Management Schemas

class EvidenceDetail(BaseModel):
    signal: str
    severity: str
    value: Any
    threshold: Any
    explanation: str

class ScoreBreakdownItem(BaseModel):
    signal: str
    weight: float
    contribution: float

class ConnectedEntitiesSummary(BaseModel):
    connected_customers_count: int
    connected_customer_ids: List[str]
    shared_devices_count: int
    shared_payment_identities_count: int
    shared_addresses_count: int
    suspicious_transactions_count: int
    detected_signals_count: int

class TransactionEvidence(BaseModel):
    transaction_id: str
    merchant_id: str
    customer_id: str
    amount: float
    timestamp: str
    transaction_type: str
    refund_status: str
    refund_timestamp: Optional[str] = None
    suspicious_indicators: List[str] = []

class InvestigatorNote(BaseModel):
    note_id: str
    case_id: str
    note: str
    created_at: str

class CaseStatusUpdate(BaseModel):
    status: str

class InvestigatorNoteCreate(BaseModel):
    note: str

class Case(BaseModel):
    case_id: str
    merchant_id: str
    merchant_name: str
    customer_ids: List[str]
    risk_score: float
    risk_level: str
    status: str
    created_at: str
    updated_at: str
    evidence: List[EvidenceDetail] = []
    evidence_summary: List[str] = []
    score_breakdown: List[ScoreBreakdownItem] = []
    connected_entities: Optional[ConnectedEntitiesSummary] = None
    transactions: List[TransactionEvidence] = []
    investigator_notes: List[InvestigatorNote] = []
    # For Phase 1 backward compatibility
    max_risk_score: Optional[float] = None
    connected_customers: Optional[List[str]] = None
    pair_details: Optional[List[RiskScoreResult]] = None

class GraphNode(BaseModel):
    id: str
    type: str
    label: str
    attributes: Optional[Dict[str, Any]] = None

class GraphEdge(BaseModel):
    source: str
    target: str
    relationship: str

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

class DashboardSummary(BaseModel):
    total_cases: int
    new_cases: int
    under_review: int
    confirmed_fraud: int
    false_positives: int
    closed_cases: int
    critical_cases: int
    high_risk_cases: int
    medium_risk_cases: int
    low_risk_cases: int
    total_merchants_analyzed: int
    total_customers_analyzed: int
    total_transactions_analyzed: int
    suspicious_transactions: int
    fraud_rings_detected: int

class DetectionRunResponse(BaseModel):
    status: str
    cases_created: int
    critical_cases: int
    high_risk_cases: int


# ==========================================
# PHASE 4 ML / AI RISK INTELLIGENCE SCHEMAS
# ==========================================

class FeatureExplanation(BaseModel):
    feature: str
    value: float
    importance: float
    reason: str

class ScoringWeightItem(BaseModel):
    engine: str
    raw_score: float
    weight: float
    weighted_contribution: float

class MLScoreRequest(BaseModel):
    merchant_id: str
    customer_id: str
    transaction_id: Optional[str] = None
    transaction_data: Optional[Dict[str, Any]] = None
    pair_risk_result: Optional[Dict[str, Any]] = None
    network_detail: Optional[Dict[str, Any]] = None

class MLScoreResponse(BaseModel):
    merchant_id: str
    customer_id: str
    transaction_id: Optional[str] = None
    transaction_risk_score: float
    network_risk_score: float
    ml_risk_score: float
    final_risk_score: float
    final_risk_level: str
    model_version: str
    algorithm: str
    top_features: List[FeatureExplanation] = []
    scoring_breakdown: List[ScoringWeightItem] = []

class ModelInfoResponse(BaseModel):
    model_version: str
    algorithm: str
    feature_count: int
    feature_names: List[str]
    metrics: Dict[str, float]
    training_timestamp: str
    disclaimer: str


