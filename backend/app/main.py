from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional

from app.models.schemas import (
    Merchant, Customer, Transaction, GroundTruth,
    RiskScoreResult, SuspiciousCase, DatasetSummary,
    EvaluationResult, FalsePositiveCostResult,
    Case, CaseStatusUpdate, InvestigatorNoteCreate, InvestigatorNote,
    GraphResponse, DashboardSummary, DetectionRunResponse
)
from app.data.generator import SyntheticDataGenerator, SEED
from app.detector.overlap_detector import OverlapDetector
from app.scoring.risk_scorer import RiskScorer
from app.graph.graph_builder import IdentityGraphBuilder
from app.scoring.evaluator import ModelEvaluator
from app.cases.case_service import CaseService
from app.network.network_service import NetworkService
from app.services.firestore_store import FirestoreStore
from app.ml.ml_service import MLRiskService
from app.ml.final_scorer import FinalRiskScorer
from app.network.network_models import (
    NetworkNode, NetworkEdge, CollusionPattern, NetworkCluster,
    EntityNetworkDetail, NetworkOverview, ShortestPathResponse
)
from app.models.schemas import (
    MLScoreRequest, MLScoreResponse, ModelInfoResponse,
    FeatureExplanation, ScoringWeightItem
)


app = FastAPI(
    title="RazorGuard AI — Merchant Risk Engine & ML Risk Intelligence API",
    description="Explainable fraud investigation backend detecting merchant-customer collusion rings, network intelligence graph analysis, ML risk intelligence, case management, and Cloud Firestore persistence.",
    version="4.0.0"
)

# Global state for dataset objects in memory
STATE: Dict[str, Any] = {
    "merchants": [],
    "customers": [],
    "transactions": [],
    "ground_truth": [],
    "risk_results": [],
    "suspicious_cases": []
}

case_service = CaseService()
network_service = NetworkService(store=case_service.store)
firestore_store = FirestoreStore()
ml_service = MLRiskService()
final_scorer = FinalRiskScorer()


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "REQUEST_ERROR", "message": str(exc.detail)}
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "INTERNAL_SERVER_ERROR", "message": "An internal server error occurred."}
    )


@app.get("/health", summary="Health Check")
def health_check():
    firebase_status = firestore_store.firebase.get_status_message()
    return {
        "status": "ok",
        "engine": "RazorGuard AI — Merchant Risk & Collusion Intelligence",
        "firebase": firebase_status
    }



@app.post("/api/dataset/generate", response_model=DatasetSummary, summary="Generate Synthetic Dataset")
def generate_dataset(seed: int = Query(SEED, description="Random seed for reproducible dataset generation")):
    generator = SyntheticDataGenerator(seed=seed)
    merchants, customers, transactions, ground_truth = generator.generate_all()
    
    STATE["merchants"] = merchants
    STATE["customers"] = customers
    STATE["transactions"] = transactions
    STATE["ground_truth"] = ground_truth
    
    generator.save_to_file(merchants, customers, transactions, ground_truth, "generated_data")
    
    ring_ids = {gt.ring_id for gt in ground_truth if gt.ring_id}
    
    return DatasetSummary(
        merchants_count=len(merchants),
        customers_count=len(customers),
        transactions_count=len(transactions),
        collusion_rings_count=len(ring_ids)
    )


import threading

DETECTION_LOCK = threading.Lock()


@app.post("/api/detect", summary="Run Collusion Detection Engine")
def run_detection():
    with DETECTION_LOCK:
        if not STATE["merchants"] or not STATE["customers"] or not STATE["transactions"]:
            generate_dataset(seed=SEED)

        if STATE["risk_results"] and STATE["suspicious_cases"]:
            return {
                "status": "success",
                "total_pairs_analyzed": len(STATE["risk_results"]),
                "flagged_cases_count": len(STATE["suspicious_cases"]),
                "flagged_high_critical_pairs": len([r for r in STATE["risk_results"] if r.risk_level in ["HIGH", "CRITICAL"]])
            }

        merchants = STATE["merchants"]
        customers = STATE["customers"]
        transactions = STATE["transactions"]
        ground_truth = STATE["ground_truth"]

        detector = OverlapDetector()
        pair_signals_map = detector.analyze_all_pairs(merchants, customers, transactions)

        scorer = RiskScorer()
        gt_map = {(gt.merchant_id, gt.customer_id): gt.is_collusive for gt in ground_truth}

        risk_results: List[RiskScoreResult] = []

        for (m_id, c_id), signals in pair_signals_map.items():
            is_collusive = gt_map.get((m_id, c_id), False)
            result = scorer.calculate_risk(m_id, c_id, signals, ground_truth_collusive=is_collusive)
            risk_results.append(result)

        STATE["risk_results"] = risk_results

        graph_builder = IdentityGraphBuilder()
        graph_builder.build_graph(merchants, customers, transactions)
        suspicious_cases = graph_builder.find_suspicious_rings(risk_results, merchants)

        STATE["suspicious_cases"] = suspicious_cases

        # Process Phase 2 Cases
        case_service.process_detection_results(merchants, customers, transactions, risk_results)

        # Process Phase 3 Network Analysis
        network_service.analyze_network(merchants, customers, transactions, risk_results)

        flagged_high_critical = [r for r in risk_results if r.risk_level in ["HIGH", "CRITICAL"]]

        return {
            "status": "success",
            "total_pairs_analyzed": len(risk_results),
            "flagged_cases_count": len(suspicious_cases),
            "flagged_high_critical_pairs": len(flagged_high_critical)
        }


@app.post("/api/detection/run", response_model=DetectionRunResponse, summary="Run Full Detection & Network Analysis")
def run_full_detection():
    with DETECTION_LOCK:
        if not STATE["merchants"] or not STATE["customers"] or not STATE["transactions"]:
            generate_dataset(seed=SEED)

        merchants = STATE["merchants"]
        customers = STATE["customers"]
        transactions = STATE["transactions"]
        ground_truth = STATE["ground_truth"]

        detector = OverlapDetector()
        pair_signals_map = detector.analyze_all_pairs(merchants, customers, transactions)

        scorer = RiskScorer()
        gt_map = {(gt.merchant_id, gt.customer_id): gt.is_collusive for gt in ground_truth}

        risk_results: List[RiskScoreResult] = []

        for (m_id, c_id), signals in pair_signals_map.items():
            is_collusive = gt_map.get((m_id, c_id), False)
            result = scorer.calculate_risk(m_id, c_id, signals, ground_truth_collusive=is_collusive)
            risk_results.append(result)

        STATE["risk_results"] = risk_results

        res = case_service.process_detection_results(merchants, customers, transactions, risk_results)
        network_service.analyze_network(merchants, customers, transactions, risk_results)

        return DetectionRunResponse(
            status="success",
            cases_created=res["cases_created"],
            critical_cases=res["critical_cases"],
            high_risk_cases=res["high_risk_cases"]
        )


@app.get("/api/cases", response_model=List[Case], summary="List Suspicious Investigation Cases")
def get_cases(
    status: Optional[str] = Query(None, description="Filter by status (NEW, UNDER_REVIEW, CONFIRMED_FRAUD, FALSE_POSITIVE, CLOSED)"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level (LOW, MEDIUM, HIGH, CRITICAL)"),
    limit: Optional[int] = Query(None, description="Limit number of cases returned")
):
    cases = case_service.list_cases(status=status, risk_level=risk_level, limit=limit)
    if not cases:
        run_detection()
        cases = case_service.list_cases(status=status, risk_level=risk_level, limit=limit)
    return cases


@app.get("/api/cases/{case_id}", response_model=Case, summary="Get Case Details")
def get_case(case_id: str):
    c = case_service.get_case(case_id)
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "CASE_NOT_FOUND", "message": f"Case {case_id} was not found."}
        )
    return c


@app.post("/api/cases/{case_id}/status", response_model=Case, summary="Update Investigation Status")
def update_case_status(case_id: str, payload: CaseStatusUpdate):
    try:
        updated = case_service.update_case_status(case_id, payload.status)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "CASE_NOT_FOUND", "message": f"Case {case_id} was not found."}
            )
        return updated
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "INVALID_STATUS", "message": f"Unsupported investigation status: '{payload.status}'."}
        )


@app.post("/api/cases/{case_id}/notes", response_model=InvestigatorNote, summary="Add Investigator Note")
def add_case_note(case_id: str, payload: InvestigatorNoteCreate):
    try:
        note = case_service.add_case_note(case_id, payload.note)
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "CASE_NOT_FOUND", "message": f"Case {case_id} was not found."}
            )
        return note
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "INVALID_NOTE", "message": str(ve)}
        )


@app.get("/api/cases/{case_id}/graph", response_model=GraphResponse, summary="Get Case Investigation Graph")
def get_case_graph(case_id: str):
    c = case_service.get_case(case_id)
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "CASE_NOT_FOUND", "message": f"Case {case_id} was not found."}
        )
    
    if not STATE["merchants"]:
        generate_dataset(seed=SEED)

    gb = IdentityGraphBuilder()
    return gb.export_case_graph_json(
        case=c,
        merchants=STATE["merchants"],
        customers=STATE["customers"],
        transactions=STATE["transactions"]
    )


@app.get("/api/dashboard/summary", response_model=DashboardSummary, summary="Get Investigation Dashboard Summary")
def get_dashboard_summary():
    if not STATE["merchants"]:
        generate_dataset(seed=SEED)
    
    cases = case_service.list_cases()
    if not cases:
        run_detection()

    ring_ids = {gt.ring_id for gt in STATE["ground_truth"] if gt.ring_id}

    return case_service.get_dashboard_summary(
        merchants_count=len(STATE["merchants"]),
        customers_count=len(STATE["customers"]),
        transactions_count=len(STATE["transactions"]),
        ground_truth_rings=len(ring_ids)
    )


@app.get("/api/evaluation", summary="Get Model Evaluation Metrics")
def get_evaluation():
    if not STATE["risk_results"]:
        run_detection()

    evaluator = ModelEvaluator()
    eval_res, cost_res = evaluator.evaluate_predictions(STATE["risk_results"], STATE["ground_truth"])

    return {
        "evaluation_metrics": eval_res.model_dump(),
        "false_positive_cost_model": cost_res.model_dump()
    }


# ==========================================
# PHASE 3 NETWORK INTELLIGENCE ENDPOINTS
# ==========================================

@app.get("/api/network/overview", response_model=NetworkOverview, summary="Get Network Intelligence Overview Metrics")
def get_network_overview():
    if not network_service.graph_service.graph.nodes():
        run_detection()
    return network_service.get_overview()


@app.get("/api/network/nodes", response_model=List[NetworkNode], summary="List Network Nodes")
def get_network_nodes(
    entity_type: Optional[str] = Query(None, description="Filter by entity type (MERCHANT, CUSTOMER, DEVICE, PAYMENT_FINGERPRINT, IP)"),
    min_risk_score: Optional[float] = Query(None, description="Minimum risk score filter")
):
    if not network_service.graph_service.graph.nodes():
        run_detection()
    return network_service.get_nodes(entity_type=entity_type, min_risk_score=min_risk_score)


@app.get("/api/network/edges", response_model=List[NetworkEdge], summary="List Network Edges")
def get_network_edges(
    relationship: Optional[str] = Query(None, description="Filter by relationship (TRANSACTED_WITH, SHARES_DEVICE, SHARES_PAYMENT, SHARES_IP)"),
    min_risk_score: Optional[float] = Query(None, description="Minimum edge risk score filter")
):
    if not network_service.graph_service.graph.nodes():
        run_detection()
    return network_service.get_edges(relationship=relationship, min_risk_score=min_risk_score)


@app.get("/api/network/clusters", response_model=List[NetworkCluster], summary="List Detected Fraud Collusion Clusters")
def get_network_clusters():
    if not network_service.cached_clusters:
        run_detection()
    return network_service.get_clusters()


@app.get("/api/network/risky-relationships", response_model=List[NetworkEdge], summary="List Suspicious Risky Relationships")
def get_risky_relationships():
    if not network_service.graph_service.graph.nodes():
        run_detection()
    return network_service.get_risky_relationships()


@app.get("/api/network/entity/{entity_id}", response_model=EntityNetworkDetail, summary="Inspect Entity Network Intelligence")
def get_entity_network_detail(entity_id: str):
    if not network_service.graph_service.graph.nodes():
        run_detection()
    
    detail = network_service.get_entity_detail(entity_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "ENTITY_NOT_FOUND", "message": f"Entity {entity_id} was not found in the network graph."}
        )
    return detail


@app.get("/api/network/entity/{entity_id}/connections", summary="Get 1-Hop Entity Connections Subgraph")
def get_entity_connections(entity_id: str):
    if not network_service.graph_service.graph.nodes():
        run_detection()
    
    conn = network_service.get_entity_connections(entity_id)
    if not conn["nodes"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "ENTITY_NOT_FOUND", "message": f"Entity {entity_id} was not found in the network graph."}
        )
    return conn


@app.get("/api/network/path/{source_id}/{target_id}", response_model=ShortestPathResponse, summary="Find Shortest Path Between Entities")
def get_network_shortest_path(source_id: str, target_id: str):
    if not network_service.graph_service.graph.nodes():
        run_detection()
    
    path_res = network_service.get_shortest_path(source_id, target_id)
    if not path_res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "PATH_NOT_FOUND", "message": f"No network connection path found between {source_id} and {target_id}."}
        )
    return path_res


@app.get("/api/network/cases", response_model=List[Case], summary="List Network Collusion Cases")
def get_network_cases():
    cases = case_service.list_cases()
    if not cases:
        run_detection()
        cases = case_service.list_cases()
    return [c for c in cases if c.case_id.startswith("CASE-NET-") or c.risk_level in ["HIGH", "CRITICAL"]]


# ==========================================
# FIRESTORE PERSISTENT ENTITY ENDPOINTS
# ==========================================

@app.get("/api/merchants", summary="List Persistent Merchants")
def get_merchants():
    if not STATE["merchants"]:
        generate_dataset(seed=SEED)
    if not STATE["risk_results"]:
        run_detection()
    merchants = firestore_store.list_documents("merchants")
    if not merchants and STATE["merchants"]:
        for m in STATE["merchants"]:
            firestore_store.save_merchant(m.model_dump())
        merchants = firestore_store.list_documents("merchants")

    # Enrich merchant risk scores from risk_results & cases
    m_risk_map = {}
    for r in STATE["risk_results"]:
        m_risk_map[r.merchant_id] = max(m_risk_map.get(r.merchant_id, 0.0), r.risk_score)
    for c in case_service.list_cases():
        m_risk_map[c.merchant_id] = max(m_risk_map.get(c.merchant_id, 0.0), c.risk_score)

    for m in merchants:
        m_id = m.get("merchant_id")
        if m_id in m_risk_map:
            m["risk_score"] = m_risk_map[m_id]

    return merchants


@app.get("/api/merchants/{merchant_id}", summary="Get Merchant Detail")
def get_merchant_detail(merchant_id: str):
    if not STATE["merchants"]:
        generate_dataset(seed=SEED)
    m = firestore_store.get_document("merchants", merchant_id)
    if not m:
        # Fallback to STATE merchants
        for st_m in STATE["merchants"]:
            if st_m.merchant_id == merchant_id:
                m = st_m.model_dump()
                break
    if not m:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "MERCHANT_NOT_FOUND", "message": f"Merchant {merchant_id} was not found."}
        )
    return m


@app.get("/api/customers", summary="List Persistent Customers")
def get_customers():
    if not STATE["customers"]:
        generate_dataset(seed=SEED)
    customers = firestore_store.list_documents("customers")
    if not customers and STATE["customers"]:
        for c in STATE["customers"]:
            firestore_store.save_customer(c.model_dump())
        customers = firestore_store.list_documents("customers")
    return customers


@app.get("/api/customers/{customer_id}", summary="Get Customer Detail")
def get_customer_detail(customer_id: str):
    if not STATE["customers"]:
        generate_dataset(seed=SEED)
    c = firestore_store.get_document("customers", customer_id)
    if not c:
        for st_c in STATE["customers"]:
            if st_c.customer_id == customer_id:
                c = st_c.model_dump()
                break
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "CUSTOMER_NOT_FOUND", "message": f"Customer {customer_id} was not found."}
        )
    return c


@app.get("/api/transactions", summary="List Persistent Transactions")
def get_transactions(limit: Optional[int] = Query(100, description="Limit transaction count")):
    if not STATE["transactions"]:
        generate_dataset(seed=SEED)
    txs = firestore_store.list_documents("transactions", limit=limit)
    if not txs and STATE["transactions"]:
        for tx in STATE["transactions"][:100]:
            firestore_store.save_transaction(tx.model_dump())
        txs = firestore_store.list_documents("transactions", limit=limit)
    return txs


@app.get("/api/transactions/{transaction_id}", summary="Get Transaction Detail")
def get_transaction_detail(transaction_id: str):
    if not STATE["transactions"]:
        generate_dataset(seed=SEED)
    tx = firestore_store.get_document("transactions", transaction_id)
    if not tx:
        for st_tx in STATE["transactions"]:
            if st_tx.transaction_id == transaction_id:
                tx = st_tx.model_dump()
                break
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "TRANSACTION_NOT_FOUND", "message": f"Transaction {transaction_id} was not found."}
        )
    return tx


@app.get("/api/alerts", summary="List Critical Risk Alerts")
def get_alerts():
    alerts = firestore_store.list_documents("alerts")
    if not alerts:
        if not STATE["risk_results"]:
            run_detection()
        cases = case_service.list_cases()
        generated_alerts = []
        for idx, c in enumerate(cases):
            if c.risk_level in ["HIGH", "CRITICAL"]:
                alert_obj = {
                    "id": f"ALT-{1000 + idx + 1}",
                    "title": f"{c.risk_level} Collusion Ring Detected",
                    "entity_id": c.merchant_id,
                    "entity_type": "MERCHANT",
                    "risk_score": c.risk_score,
                    "severity": c.risk_level,
                    "timestamp": c.created_at,
                    "case_id": c.case_id,
                    "description": f"Merchant {c.merchant_id} ({c.merchant_name}) flagged with risk score {c.risk_score}."
                }
                generated_alerts.append(alert_obj)
                try:
                    firestore_store.create_document("alerts", alert_obj["id"], alert_obj)
                except Exception:
                    pass
        alerts = firestore_store.list_documents("alerts") or generated_alerts
    return alerts



@app.get("/api/network/entities", summary="List Network Entities")
def get_network_entities():
    return firestore_store.list_documents("network_entities")


@app.get("/api/network/relationships", summary="List Network Relationships")
def get_network_relationships():
    return firestore_store.list_documents("network_relationships")


# ==========================================
# PHASE 4 ML RISK INTELLIGENCE ENDPOINTS
# ==========================================

@app.post("/api/ml/score", response_model=MLScoreResponse, summary="Compute ML & Final Risk Intelligence Score")
def compute_ml_score(payload: MLScoreRequest):
    if not STATE["merchants"]:
        generate_dataset(seed=SEED)

    # 1. Transaction Risk Score lookup / baseline
    tx_risk_score = 0.0
    if payload.pair_risk_result:
        tx_risk_score = float(payload.pair_risk_result.get("risk_score", 0.0))
    elif STATE["risk_results"]:
        for r in STATE["risk_results"]:
            if r.merchant_id == payload.merchant_id and r.customer_id == payload.customer_id:
                tx_risk_score = r.risk_score
                break

    # 2. Network Risk Score lookup / baseline
    net_risk_score = tx_risk_score
    if payload.network_detail:
        net_risk_score = float(payload.network_detail.get("risk_score", tx_risk_score))
    elif network_service.graph_service.graph.nodes():
        detail = network_service.get_entity_detail(payload.merchant_id)
        if detail:
            net_risk_score = detail.risk_score

    # 3. Predict ML Risk Score
    ml_res = ml_service.predict_ml_risk(
        merchant_id=payload.merchant_id,
        customer_id=payload.customer_id,
        transaction_data=payload.transaction_data,
        pair_risk_result=payload.pair_risk_result,
        network_detail=payload.network_detail
    )

    ml_score = ml_res["ml_risk_score"]

    # 4. Calculate Blended Final Risk Score
    final_res = final_scorer.calculate_final_risk(
        transaction_risk_score=tx_risk_score,
        network_risk_score=net_risk_score,
        ml_risk_score=ml_score
    )

    top_features = [
        FeatureExplanation(
            feature=f["feature"],
            value=f["value"],
            importance=f["importance"],
            reason=f["reason"]
        ) for f in ml_res["top_features"]
    ]

    scoring_breakdown = [
        ScoringWeightItem(
            engine=item["engine"],
            raw_score=item["raw_score"],
            weight=item["weight"],
            weighted_contribution=item["weighted_contribution"]
        ) for item in final_res["scoring_breakdown"]
    ]

    return MLScoreResponse(
        merchant_id=payload.merchant_id,
        customer_id=payload.customer_id,
        transaction_id=payload.transaction_id,
        transaction_risk_score=tx_risk_score,
        network_risk_score=net_risk_score,
        ml_risk_score=ml_score,
        final_risk_score=final_res["final_risk_score"],
        final_risk_level=final_res["final_risk_level"],
        model_version=ml_res["model_version"],
        algorithm=ml_res["algorithm"],
        top_features=top_features,
        scoring_breakdown=scoring_breakdown
    )


@app.get("/api/ml/model-info", response_model=ModelInfoResponse, summary="Get ML Model Metadata & Metrics")
def get_model_info():
    info = ml_service.get_model_info()
    return ModelInfoResponse(
        model_version=info["model_version"],
        algorithm=info["algorithm"],
        feature_count=info["feature_count"],
        feature_names=info["feature_names"],
        metrics=info["metrics"],
        training_timestamp=info["training_timestamp"],
        disclaimer=info["disclaimer"]
    )


@app.get("/api/search", summary="Global Command Search Across Entities and Cases")
def global_search(q: str = Query(..., min_length=1, description="Search query")):
    if not STATE["merchants"]:
        generate_dataset(seed=SEED)

    query = q.strip().lower()
    results = []

    # 1. Search Merchants
    for m in STATE["merchants"]:
        name = getattr(m, "merchant_name", getattr(m, "name", m.merchant_id))
        category = getattr(m, "category", "")
        risk_score = getattr(m, "risk_score", 0.0)
        if query in m.merchant_id.lower() or query in name.lower() or query in category.lower():
            results.append({
                "id": m.merchant_id,
                "title": f"{name} ({m.merchant_id})",
                "type": "MERCHANT",
                "subtitle": f"Category: {category} | Risk Score: {risk_score}",
                "risk_score": risk_score,
                "url": f"/merchants/{m.merchant_id}"
            })

    # 2. Search Customers
    for c in STATE["customers"]:
        name = getattr(c, "customer_name", getattr(c, "name", c.customer_id))
        email = getattr(c, "email", "")
        risk_score = getattr(c, "risk_score", 0.0)
        if query in c.customer_id.lower() or query in name.lower() or query in email.lower():
            results.append({
                "id": c.customer_id,
                "title": f"{name} ({c.customer_id})",
                "type": "CUSTOMER",
                "subtitle": f"Email: {email} | Risk Score: {risk_score}",
                "risk_score": risk_score,
                "url": f"/customers/{c.customer_id}"
            })

    # 3. Search Transactions
    for tx in STATE["transactions"][:500]:
        tx_id = getattr(tx, "transaction_id", "")
        m_id = getattr(tx, "merchant_id", "")
        c_id = getattr(tx, "customer_id", "")
        amount = getattr(tx, "amount", 0.0)
        tx_status = getattr(tx, "status", "SUCCESS")
        if query in tx_id.lower() or query in m_id.lower() or query in c_id.lower():
            results.append({
                "id": tx_id,
                "title": f"Tx {tx_id} (₹{amount:,.2f})",
                "type": "TRANSACTION",
                "subtitle": f"Merchant: {m_id} | Customer: {c_id} | Status: {tx_status}",
                "risk_score": 50.0 if getattr(tx, "refund_status", "") == "REFUNDED" else 10.0,
                "url": f"/transactions/{tx_id}"
            })

    # 4. Search Cases
    cases = case_service.list_cases()
    for cs in cases:
        cs_id = cs.case_id
        m_id = cs.merchant_id
        title = getattr(cs, "title", f"Collusion Ring Case for Merchant {m_id}")
        cs_status = cs.status
        severity = getattr(cs, "risk_level", "HIGH")
        score = cs.risk_score
        if query in cs_id.lower() or query in m_id.lower() or query in title.lower():
            results.append({
                "id": cs_id,
                "title": f"{cs_id}: {title}",
                "type": "CASE",
                "subtitle": f"Status: {cs_status} | Level: {severity} | Score: {score}",
                "risk_score": score,
                "url": f"/cases/{cs_id}"
            })



    return results[:20]





