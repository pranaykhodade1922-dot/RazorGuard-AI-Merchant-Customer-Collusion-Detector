from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Set
from collections import defaultdict

from app.models.schemas import (
    Merchant, Customer, Transaction, RiskScoreResult,
    Case, EvidenceDetail, ScoreBreakdownItem, DashboardSummary,
    InvestigatorNote
)
from app.cases.case_store import CaseStore
from app.investigation.evidence_engine import EvidenceEngine
from app.investigation.investigation_service import InvestigationService


class CaseService:
    def __init__(self, store: Optional[CaseStore] = None):
        self.store = store or CaseStore()
        self.evidence_engine = EvidenceEngine()
        self.investigation_service = InvestigationService()

    def _generate_case_id(self, merchant_id: str, sorted_suspicious_merchants: List[str]) -> str:
        try:
            idx = sorted_suspicious_merchants.index(merchant_id) + 1
            return f"CASE-{idx:04d}"
        except ValueError:
            # Fallback to merchant id numeric suffix
            num_part = "".join(filter(str.isdigit, merchant_id))
            if num_part:
                return f"CASE-{int(num_part):04d}"
            return f"CASE-{merchant_id}"

    def process_detection_results(
        self,
        merchants: List[Merchant],
        customers: List[Customer],
        transactions: List[Transaction],
        risk_results: List[RiskScoreResult]
    ) -> Dict[str, Any]:
        # Filter suspicious results (HIGH or CRITICAL)
        flagged_results = [r for r in risk_results if r.risk_level in ["HIGH", "CRITICAL"]]

        merchant_map = {m.merchant_id: m for m in merchants}
        customer_map = {c.customer_id: c for c in customers}

        # Group by merchant
        merchant_risk_map: Dict[str, List[RiskScoreResult]] = defaultdict(list)
        for r in flagged_results:
            merchant_risk_map[r.merchant_id].append(r)

        # Sort merchants deterministically by merchant_id
        sorted_merchant_ids = sorted(list(merchant_risk_map.keys()))

        created_cases_count = 0
        critical_count = 0
        high_count = 0

        now_str = datetime.now(timezone.utc).isoformat()

        for m_id in sorted_merchant_ids:
            p_results = merchant_risk_map[m_id]
            merchant = merchant_map.get(m_id)
            if not merchant:
                continue

            case_id = self._generate_case_id(m_id, sorted_merchant_ids)

            # Max risk score & level
            max_score = max(r.risk_score for r in p_results)
            if max_score >= 80.0:
                risk_level = "CRITICAL"
                critical_count += 1
            elif max_score >= 60.0:
                risk_level = "HIGH"
                high_count += 1
            elif max_score >= 30.0:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"

            conn_cust_ids = sorted(list({r.customer_id for r in p_results}))
            conn_customers = [customer_map[cid] for cid in conn_cust_ids if cid in customer_map]

            # Generate evidence & score breakdown
            all_evidence: List[EvidenceDetail] = []
            all_breakdown: List[ScoreBreakdownItem] = []
            evidence_summary_set: Set[str] = set()

            pair_res_map = {r.customer_id: r for r in p_results}

            for r in p_results:
                ev_list, bd_list = self.evidence_engine.generate_evidence_and_breakdown(m_id, r.customer_id, r.signals)
                all_evidence.extend(ev_list)
                all_breakdown.extend(bd_list)
                for ev in r.evidence:
                    evidence_summary_set.add(ev.split(" (+")[0])

            # De-duplicate breakdown items by signal (take max weight/contribution)
            breakdown_dict: Dict[str, ScoreBreakdownItem] = {}
            for item in all_breakdown:
                if item.signal not in breakdown_dict or item.contribution > breakdown_dict[item.signal].contribution:
                    breakdown_dict[item.signal] = item
            final_breakdown = list(breakdown_dict.values())

            # De-duplicate evidence details by signal + explanation
            seen_explanations: Set[str] = set()
            final_evidence: List[EvidenceDetail] = []
            for ev in all_evidence:
                key = f"{ev.signal}:{ev.explanation}"
                if key not in seen_explanations:
                    seen_explanations.add(key)
                    final_evidence.append(ev)

            # Connected entities analysis
            connected_entities = self.investigation_service.analyze_connected_entities(
                merchant, conn_customers, p_results, transactions
            )

            # Transaction evidence
            tx_evidence = self.investigation_service.extract_transaction_evidence(
                merchant, conn_cust_ids, transactions, pair_res_map
            )

            # Check if case exists in store to maintain created_at and status
            existing_case = self.store.get_case(case_id)
            case_status = existing_case.status if existing_case else "NEW"
            created_at = existing_case.created_at if existing_case else now_str

            case = Case(
                case_id=case_id,
                merchant_id=m_id,
                merchant_name=merchant.merchant_name,
                customer_ids=conn_cust_ids,
                risk_score=max_score,
                risk_level=risk_level,
                status=case_status,
                created_at=created_at,
                updated_at=now_str,
                evidence=final_evidence,
                evidence_summary=sorted(list(evidence_summary_set)),
                score_breakdown=final_breakdown,
                connected_entities=connected_entities,
                transactions=tx_evidence,
                investigator_notes=existing_case.investigator_notes if existing_case else [],
                max_risk_score=max_score,
                connected_customers=conn_cust_ids,
                pair_details=p_results
            )

            self.store.save_case(case)
            if not existing_case:
                created_cases_count += 1

        return {
            "status": "success",
            "cases_processed": len(sorted_merchant_ids),
            "cases_created": created_cases_count,
            "critical_cases": critical_count,
            "high_risk_cases": high_count
        }

    def get_case(self, case_id: str) -> Optional[Case]:
        return self.store.get_case(case_id)

    def list_cases(
        self,
        status: Optional[str] = None,
        risk_level: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[Case]:
        return self.store.list_cases(status=status, risk_level=risk_level, limit=limit)

    def update_case_status(self, case_id: str, new_status: str) -> Optional[Case]:
        valid_statuses = {"NEW", "UNDER_REVIEW", "CONFIRMED_FRAUD", "FALSE_POSITIVE", "CLOSED"}
        if new_status.upper() not in valid_statuses:
            raise ValueError(f"Invalid status: {new_status}. Supported: {valid_statuses}")
        return self.store.update_case_status(case_id, new_status)

    def add_case_note(self, case_id: str, note_text: str) -> Optional[InvestigatorNote]:
        if not note_text or not note_text.strip():
            raise ValueError("Note text cannot be empty.")
        return self.store.add_case_note(case_id, note_text.strip())

    def get_dashboard_summary(
        self,
        merchants_count: int = 0,
        customers_count: int = 0,
        transactions_count: int = 0,
        ground_truth_rings: int = 0
    ) -> DashboardSummary:
        cases = self.store.list_cases()

        total_cases = len(cases)
        new_cases = sum(1 for c in cases if c.status == "NEW")
        under_review = sum(1 for c in cases if c.status == "UNDER_REVIEW")
        confirmed_fraud = sum(1 for c in cases if c.status == "CONFIRMED_FRAUD")
        false_positives = sum(1 for c in cases if c.status == "FALSE_POSITIVE")
        closed_cases = sum(1 for c in cases if c.status == "CLOSED")

        critical_cases = sum(1 for c in cases if c.risk_level == "CRITICAL")
        high_risk_cases = sum(1 for c in cases if c.risk_level == "HIGH")
        medium_risk_cases = sum(1 for c in cases if c.risk_level == "MEDIUM")
        low_risk_cases = sum(1 for c in cases if c.risk_level == "LOW")

        suspicious_tx_count = sum(
            c.connected_entities.suspicious_transactions_count for c in cases if c.connected_entities
        )

        return DashboardSummary(
            total_cases=total_cases,
            new_cases=new_cases,
            under_review=under_review,
            confirmed_fraud=confirmed_fraud,
            false_positives=false_positives,
            closed_cases=closed_cases,
            critical_cases=critical_cases,
            high_risk_cases=high_risk_cases,
            medium_risk_cases=medium_risk_cases,
            low_risk_cases=low_risk_cases,
            total_merchants_analyzed=merchants_count,
            total_customers_analyzed=customers_count,
            total_transactions_analyzed=transactions_count,
            suspicious_transactions=suspicious_tx_count,
            fraud_rings_detected=ground_truth_rings or total_cases
        )
