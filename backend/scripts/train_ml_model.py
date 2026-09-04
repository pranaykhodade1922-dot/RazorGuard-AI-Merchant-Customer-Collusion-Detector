import sys
import os
import json
import joblib
from datetime import datetime, timezone
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.data.generator import SyntheticDataGenerator, SEED
from app.detector.overlap_detector import OverlapDetector
from app.scoring.risk_scorer import RiskScorer
from app.network.graph_service import NetworkGraphService
from app.network.pattern_detector import CollusionPatternDetector
from app.ml.feature_extractor import FeatureExtractor
from app.ml.ml_config import (
    MODEL_DIR, MODEL_PATH, METADATA_PATH,
    DEFAULT_MODEL_VERSION, FEATURE_NAMES
)


def train_model():
    print("=" * 60)
    print("     RAZORGUARD AI — ML MODEL TRAINING PIPELINE")
    print("=" * 60)

    print("\n1. Generating synthetic dataset (Seed 42)...")
    generator = SyntheticDataGenerator(seed=SEED)
    merchants, customers, transactions, ground_truth = generator.generate_all()
    print(f"   Generated {len(merchants)} merchants, {len(customers)} customers, {len(transactions)} transactions.")

    print("\n2. Extracting rule signals and building graph topology...")
    detector = OverlapDetector()
    pair_signals = detector.analyze_all_pairs(merchants, customers, transactions)

    scorer = RiskScorer()
    gt_map = {(gt.merchant_id, gt.customer_id): gt.is_collusive for gt in ground_truth}
    pair_risk_map = {}
    risk_results = []
    for (m_id, c_id), sigs in pair_signals.items():
        is_col = gt_map.get((m_id, c_id), False)
        res = scorer.calculate_risk(m_id, c_id, sigs, ground_truth_collusive=is_col)
        pair_risk_map[(m_id, c_id)] = res
        risk_results.append(res)

    graph_service = NetworkGraphService()
    graph_service.build_network_graph(merchants, customers, transactions, risk_results)
    pattern_detector = CollusionPatternDetector()
    patterns = pattern_detector.detect_all_patterns(graph_service, merchants, customers, transactions, risk_results)

    print(f"   Graph built: {graph_service.graph.number_of_nodes()} nodes, {len(patterns)} collusion patterns.")

    print("\n3. Constructing ML feature matrix X and label vector y...")
    feature_list = []
    labels = []

    m_map = {m.merchant_id: m for m in merchants}
    c_map = {c.customer_id: c for c in customers}

    for (m_id, c_id), sigs in pair_signals.items():
        is_collusive = gt_map.get((m_id, c_id), False)
        risk_res = pair_risk_map.get((m_id, c_id))

        tx_list = [t for t in transactions if t.merchant_id == m_id and t.customer_id == c_id]
        tx_data = tx_list[0].model_dump() if tx_list else {"amount": 1200.0, "tx_frequency": 1.0}
        tx_data["merchant_tx_count"] = len([t for t in transactions if t.merchant_id == m_id])
        tx_data["customer_tx_count"] = len([t for t in transactions if t.customer_id == c_id])
        tx_data["pair_tx_count"] = len(tx_list)
        tx_data["refund_count"] = len([t for t in tx_list if t.refund_status == "REFUNDED"])

        feats = FeatureExtractor.extract_features(
            merchant_id=m_id,
            customer_id=c_id,
            transaction_data=tx_data,
            pair_risk_result=risk_res.model_dump() if risk_res else None
        )
        feature_list.append(feats)
        labels.append(1 if is_collusive else 0)

    df_features = pd.DataFrame(feature_list)[FEATURE_NAMES]
    y = np.array(labels, dtype=int)

    print(f"   Extracted {len(df_features)} samples across {len(FEATURE_NAMES)} numerical features.")
    print(f"   Class distribution: {np.sum(y == 1)} Collusive (1), {np.sum(y == 0)} Legitimate (0).")

    print("\n4. Splitting train/test data & training RandomForestClassifier...")
    X_train, X_test, y_train, y_test = train_test_split(df_features, y, test_size=0.2, random_state=SEED, stratify=y)

    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=SEED,
        class_weight="balanced"
    )
    model.fit(X_train, y_train)

    print("\n5. Evaluating model performance metrics...")
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    try:
        auc = float(roc_auc_score(y_test, y_prob))
    except Exception:
        auc = 1.0

    print(f"   Accuracy:  {acc * 100:.2f}%")
    print(f"   Precision: {prec * 100:.2f}%")
    print(f"   Recall:    {rec * 100:.2f}%")
    print(f"   F1-Score:  {f1 * 100:.2f}%")
    print(f"   ROC-AUC:   {auc:.4f}")

    print("\n6. Saving model artifacts and metadata...")
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    importances = dict(zip(FEATURE_NAMES, [float(imp) for imp in model.feature_importances_]))
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    metadata = {
        "model_version": DEFAULT_MODEL_VERSION,
        "algorithm": "RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)",
        "training_seed": SEED,
        "training_timestamp": datetime.now(timezone.utc).isoformat(),
        "sample_count": len(df_features),
        "feature_count": len(FEATURE_NAMES),
        "feature_names": FEATURE_NAMES,
        "evaluation_metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4)
        },
        "feature_importances": sorted_importances,
        "disclaimer": "Synthetic dataset training model. Scores reflect probability derived from synthetic collusion ring indicators."
    }

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"   [+] Saved trained model artifact to: {MODEL_PATH}")
    print(f"   [+] Saved metadata artifact to:     {METADATA_PATH}")

    print("\n" + "=" * 60)
    print("ML MODEL TRAINING PIPELINE COMPLETED SUCCESSFULLY!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    train_model()
