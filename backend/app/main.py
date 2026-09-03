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


app = FastAPI(
    title="RazorGuard AI — Merchant Risk Engine & Fraud Investigation API",
    description="Explainable fraud investigation backend detecting merchant-customer collusion rings, identity graph analysis, and case management.",
    version="2.0.0"
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
    return {"status": "ok", "engine": "RazorGuard AI Phase 2"}


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


@app.post("/api/detect", summary="Run Collusion Detection Engine (Phase 1 Compatibility)")
def run_detection():
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

    graph_builder = IdentityGraphBuilder()
    graph_builder.build_graph(merchants, customers, transactions)
    suspicious_cases = graph_builder.find_suspicious_rings(risk_results, merchants)

    STATE["suspicious_cases"] = suspicious_cases

    # Process and persist Phase 2 investigation cases
    case_service.process_detection_results(merchants, customers, transactions, risk_results)

    flagged_high_critical = [r for r in risk_results if r.risk_level in ["HIGH", "CRITICAL"]]

    return {
        "status": "success",
        "total_pairs_analyzed": len(risk_results),
        "flagged_cases_count": len(suspicious_cases),
        "flagged_high_critical_pairs": len(flagged_high_critical)
    }


@app.post("/api/detection/run", response_model=DetectionRunResponse, summary="Run Full Detection & Update Cases")
def run_full_detection():
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
