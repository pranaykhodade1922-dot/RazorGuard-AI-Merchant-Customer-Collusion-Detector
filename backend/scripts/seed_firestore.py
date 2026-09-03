import sys
import os
import argparse

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.data.generator import SyntheticDataGenerator, SEED
from app.detector.overlap_detector import OverlapDetector
from app.scoring.risk_scorer import RiskScorer
from app.cases.case_service import CaseService
from app.network.network_service import NetworkService
from app.services.firestore_store import FirestoreStore


def main():
    parser = argparse.ArgumentParser(description="RazorGuard AI Firestore Seed Script")
    parser.add_argument("--reset", action="store_true", help="Clear all collections before seeding")
    args = parser.parse_args()

    print("=" * 60)
    print("      RAZORGUARD AI — FIRESTORE DATA SEED SCRIPT")
    print("=" * 60)

    store = FirestoreStore()
    print(f"\n[+] Firebase Connection Status: {store.firebase.get_status_message()}")

    if args.reset:
        print("[!] Reset flag provided. Clearing existing collections...")
        store.clear_all()
        print("[+] Collections reset successfully.")

    print("\n1. Generating synthetic dataset (Seed 42)...")
    generator = SyntheticDataGenerator(seed=SEED)
    merchants, customers, transactions, ground_truth = generator.generate_all()

    print(f"   Generated {len(merchants)} merchants, {len(customers)} customers, {len(transactions)} transactions.")

    print("\n2. Executing detection and risk scoring...")
    detector = OverlapDetector()
    pair_signals = detector.analyze_all_pairs(merchants, customers, transactions)

    scorer = RiskScorer()
    gt_map = {(gt.merchant_id, gt.customer_id): gt.is_collusive for gt in ground_truth}
    risk_results = []
    for (m_id, c_id), sigs in pair_signals.items():
        is_col = gt_map.get((m_id, c_id), False)
        res = scorer.calculate_risk(m_id, c_id, sigs, ground_truth_collusive=is_col)
        risk_results.append(res)

    print("\n3. Processing Phase 2 Case Management & persisting to Firestore...")
    case_service = CaseService(firestore_store=store)
    case_res = case_service.process_detection_results(merchants, customers, transactions, risk_results)
    print(f"   Cases created: {case_res['cases_created']} (Critical: {case_res['critical_cases']}, High: {case_res['high_risk_cases']})")

    print("\n4. Running Phase 3 Network Intelligence & persisting graph elements...")
    network_service = NetworkService(firestore_store=store)
    net_res = network_service.analyze_network(merchants, customers, transactions, risk_results)
    print(f"   Clusters created: {net_res['total_clusters']}, Patterns: {net_res['patterns_detected']}")

    print("\n5. Verifying collection counts in Firestore store...")
    for col_key, col_name in store.COLLECTIONS.items():
        docs = store.list_documents(col_name)
        print(f"   [+] Collection '{col_name}': {len(docs)} documents")

    print("\n" + "=" * 60)
    print("FIRESTORE SEEDING COMPLETE SUCCESSFULLY!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
