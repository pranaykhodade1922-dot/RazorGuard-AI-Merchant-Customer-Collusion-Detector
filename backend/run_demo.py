import sys
import os

# Set UTF-8 encoding for Windows console output
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.data.generator import SyntheticDataGenerator, SEED
from app.detector.overlap_detector import OverlapDetector
from app.scoring.risk_scorer import RiskScorer
from app.graph.graph_builder import IdentityGraphBuilder
from app.scoring.evaluator import ModelEvaluator


def main():
    print("=" * 60)
    print("              RAZORGUARD AI")
    print("       MERCHANT RISK ENGINE — DEMO")
    print("=" * 60)

    print("\nGenerating synthetic dataset (Seed: 42)...")
    generator = SyntheticDataGenerator(seed=SEED)
    merchants, customers, transactions, ground_truth = generator.generate_all()

    generator.save_to_file(merchants, customers, transactions, ground_truth, "generated_data")

    ring_ids = {gt.ring_id for gt in ground_truth if gt.ring_id}

    print(f"\n[+] Merchants:       {len(merchants)}")
    print(f"[+] Customers:       {len(customers)}")
    print(f"[+] Transactions:    {len(transactions)}")
    print(f"[+] Collusion rings: {len(ring_ids)}")

    print("\nRunning detection engine & scoring...")
    detector = OverlapDetector()
    pair_signals_map = detector.analyze_all_pairs(merchants, customers, transactions)

    scorer = RiskScorer()
    gt_map = {(gt.merchant_id, gt.customer_id): gt.is_collusive for gt in ground_truth}

    risk_results = []
    for (m_id, c_id), signals in pair_signals_map.items():
        is_collusive = gt_map.get((m_id, c_id), False)
        res = scorer.calculate_risk(m_id, c_id, signals, ground_truth_collusive=is_collusive)
        risk_results.append(res)

    print("\nBuilding identity graph & analyzing clusters...")
    graph_builder = IdentityGraphBuilder()
    graph_builder.build_graph(merchants, customers, transactions)
    suspicious_cases = graph_builder.find_suspicious_rings(risk_results, merchants)

    print("\nPersisting investigation cases to SQLite DB...")
    from app.cases.case_service import CaseService
    case_service = CaseService()
    res_cases = case_service.process_detection_results(merchants, customers, transactions, risk_results)
    print(f"[+] Cases processed: {res_cases['cases_processed']} (Critical: {res_cases['critical_cases']}, High: {res_cases['high_risk_cases']})")

    print("\n" + "-" * 60)
    print("TOP INVESTIGATION CASES (PHASE 2 CASE MANAGEMENT)")
    print("-" * 60)

    db_cases = case_service.list_cases(limit=5)
    for case in db_cases:
        flag = "[CRITICAL]" if case.risk_level == "CRITICAL" else "[HIGH]"
        print(f"\n{flag} Case ID: {case.case_id} — Merchant {case.merchant_id} ({case.merchant_name})")
        print(f"Risk Score: {int(case.risk_score)} | Risk Level: {case.risk_level} | Status: {case.status}")
        
        cust_str = ", ".join(case.customer_ids)
        print(f"Connected Customers: {cust_str}")

        if case.connected_entities:
            ce = case.connected_entities
            print(f"Entities: {ce.connected_customers_count} Customers, {ce.shared_devices_count} Shared Devices, {ce.shared_payment_identities_count} Shared Payments, {ce.suspicious_transactions_count} Suspicious Txs")

        print("\nStructured Evidence Engine Output:")
        for ev in case.evidence[:4]:
            print(f" [{ev.severity}] {ev.explanation}")

        print("\nScore Breakdown:")
        for sb in case.score_breakdown:
            print(f"  - {sb.signal}: +{int(sb.contribution)} pts (Weight: {int(sb.weight)})")
        print("-" * 40)

    print("\n" + "-" * 60)
    print("DASHBOARD SUMMARY")
    print("-" * 60)
    dash = case_service.get_dashboard_summary(
        merchants_count=len(merchants),
        customers_count=len(customers),
        transactions_count=len(transactions),
        ground_truth_rings=len(ring_ids)
    )
    print(f"Total Cases:         {dash.total_cases}")
    print(f"New Cases:           {dash.new_cases}")
    print(f"Critical Cases:      {dash.critical_cases}")
    print(f"High Risk Cases:     {dash.high_risk_cases}")
    print(f"Analyzed Merchants:  {dash.total_merchants_analyzed}")
    print(f"Analyzed Customers:  {dash.total_customers_analyzed}")
    print(f"Analyzed Txs:        {dash.total_transactions_analyzed}")
    print(f"Suspicious Txs:      {dash.suspicious_transactions}")

    print("\n" + "-" * 60)
    print("MODEL EVALUATION")
    print("-" * 60)

    evaluator = ModelEvaluator()
    eval_res, cost_res = evaluator.evaluate_predictions(risk_results, ground_truth)

    print(f"\nPrecision: {eval_res.precision:.2f}%")
    print(f"Recall:    {eval_res.recall:.2f}%")
    print(f"F1 Score:  {eval_res.f1_score:.2f}%")

    print("\nConfusion Matrix:")
    cm = eval_res.confusion_matrix
    print(f"  True Positives (TP):  {cm['tp']}")
    print(f"  False Positives (FP): {cm['fp']}")
    print(f"  False Negatives (FN): {cm['fn']}")
    print(f"  True Negatives (TN):  {cm['tn']}")

    print("\n" + "-" * 60)
    print("FALSE-POSITIVE COST MODEL")
    print("-" * 60)

    print(f"Investigation cost per False Positive:  ${cost_res.investigation_cost_per_fp:,.2f}")
    print(f"Estimated avoided loss per True Positive: ${cost_res.avoided_loss_per_tp:,.2f}")
    print(f"Total FP Investigation Cost:              ${cost_res.total_fp_cost:,.2f}")
    print(f"Total Avoided Collusion Loss:             ${cost_res.total_avoided_loss:,.2f}")
    print(f"EXPECTED NET SAVINGS:                     ${cost_res.expected_net_value:,.2f}")
    print(f"Notice: {cost_res.disclaimer}")

    print("\n" + "=" * 60)
    print("All data is synthetic.")
    print("This system is defense-only.")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
