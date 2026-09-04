# 🚀 RazorGuard AI — Merchant Risk Engine & ML Risk Intelligence (Phase 4 + Firestore)

**RazorGuard AI** is an explainable, defense-only fraud detection, network intelligence, ML risk scoring, and case management backend built for the Razorpay AI Buildathon 2026. It uncovers complex merchant–customer collusion rings by moving beyond transaction-level anomalies to **relationship graph topology** and **Machine Learning Risk Intelligence** backed by **Cloud Firestore persistence**.

---

## 1. Overview & System Architecture

RazorGuard integrates transaction anomaly scoring, graph collusion ring detection, Machine Learning risk prediction (Random Forest), and Cloud Firestore persistence via the Firebase Admin SDK.

```text
React Frontend Dashboard
           │
           ▼
    FastAPI Backend
           │
           ├──► ML Risk Intelligence Layer (RandomForestClassifier, 22 Features, SHAP-like explanations)
           ├──► Blended Final Risk Scorer (35% Tx + 35% Net + 30% ML)
           ├──► Firebase Admin SDK ──► Cloud Firestore (merchants, customers, transactions,
           │                                          risk_cases, alerts, network_entities,
           │                                          network_relationships, audit_logs)
           ├──► Overlap Detector & Risk Scorer (Phase 1 & Phase 2)
           ├──► NetworkX Graph Topology Engine (Phase 3)
           └──► Local SQLite CaseStore Fallback
```

---

## 2. Phase 4 ML Risk Intelligence Architecture

Phase 4 introduces an ML/AI Risk Intelligence layer that **supplements** the existing deterministic rules without breaking or overriding Phase 1, Phase 2, Phase 3, or Firestore functionality.

### Core Architecture Components
1. **Feature Extractor (`backend/app/ml/feature_extractor.py`)**:
   Extracts **22 numerical features** combining transaction-level anomalies and network-level graph topology metrics.
2. **Model Training Pipeline (`backend/scripts/train_ml_model.py`)**:
   Trains a `RandomForestClassifier` (100 estimators, max depth 10, seed 42) on synthetic merchant-customer pair samples.
3. **ML Risk Service (`backend/app/ml/ml_service.py`)**:
   Loads trained joblib artifacts (`random_forest_v1.joblib` and `model_metadata.json`), predicts ML risk probabilities (0–100), and generates human-readable top feature importance explanations.
4. **Final Risk Scorer (`backend/app/ml/final_scorer.py`)**:
   Calculates normalized **Blended Final Risk Score** using configurable weights:
   $$\text{Final Risk} = (0.35 \times \text{Transaction Risk}) + (0.35 \times \text{Network Risk}) + (0.30 \times \text{ML Risk})$$

---

## 3. Extracted Numerical Features (22 Features)

| Feature Category | Feature Name | Description |
| :--- | :--- | :--- |
| **Transaction Features** | `amount` | Transaction amount in INR |
| | `refund_status_numeric` | Numeric refund flag (1 if refunded, 0 otherwise) |
| | `refund_frequency` | Total refund count for entity pair |
| | `refund_ratio` | Ratio of refunded transactions to total pair transactions |
| | `refund_velocity_ratio` | Baseline delay vs actual delay refund speed ratio |
| | `avg_refund_time_sec` | Average refund delay in seconds |
| | `transaction_concentration` | Concentration ratio relative to normal threshold |
| | `pair_tx_count` | Total transaction count between merchant and customer |
| | `shared_device` | Binary indicator for shared hardware device |
| | `shared_ip` | Binary indicator for shared network IP |
| | `shared_payment_identity` | Binary indicator for shared UPI / bank payout account |
| **Network Graph Features** | `transaction_risk_score` | Baseline transaction risk score (0–100) |
| | `network_risk_score` | Graph collusion cluster risk score (0–100) |
| | `shared_customer_cluster_count` | Number of shared customer cluster collusion patterns |
| | `circular_relationship_count` | Number of circular loop collusion patterns |
| | `dense_cluster_count` | Number of dense collusion cluster patterns |
| | `shared_fingerprint_count` | Number of shared hardware/payment fingerprint patterns |
| | `coordinated_burst_count` | Number of coordinated transaction burst patterns |
| | `repeated_relationship_count` | Number of repeated risky relationship patterns |
| | `cluster_node_count` | Total node count in entity network cluster |
| | `cluster_edge_count` | Total edge count in entity network cluster |
| | `cluster_density` | Graph topology density of network cluster |

---

## 4. Model Metadata & Evaluation

* **Model Version**: `1.0.0-rf-synthetic`
* **Algorithm**: `RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)`
* **Feature Count**: 22 Numerical Features
* **Model Artifact**: `backend/app/ml/models/random_forest_v1.joblib`
* **Metadata Artifact**: `backend/app/ml/models/model_metadata.json`

> ⚠️ **DISCLAIMER ON SYNTHETIC EVALUATION METRICS**:
> The training dataset is generated synthetically using a fixed random seed (`42`) to benchmark model pipeline stability. Evaluation metrics on synthetic data (Accuracy 1.0, ROC-AUC 1.0) do **NOT** represent real-world fraud detection performance and should not be interpreted as operational efficacy in production payment systems.

---

## 5. API Endpoints Reference

FastAPI serves complete interactive OpenAPI documentation at `http://127.0.0.1:8000/docs`.

### Phase 4 ML Risk Intelligence Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/ml/score` | Compute ML risk score & blended final risk score for merchant/customer pair |
| `GET` | `/api/ml/model-info` | Get trained ML model metadata, features, version, and evaluation metrics |

### Persistent Entity & Health Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server & Cloud Firestore health status |
| `GET` | `/api/merchants` | List persistent merchants |
| `GET` | `/api/customers` | List persistent customers |
| `GET` | `/api/transactions` | List persistent transactions |
| `GET` | `/api/alerts` | List critical risk alerts |
| `GET` | `/api/network/entities` | List persistent network entities |
| `GET` | `/api/network/relationships` | List persistent network relationships |

---

## 6. Installation & Testing

### 1. Backend Setup & Test Suite Execution
```bash
# Navigate to backend directory
cd backend

# Install dependencies (including scikit-learn, joblib, firebase-admin)
pip install -r requirements.txt

# Train ML model pipeline & generate artifacts
python scripts/train_ml_model.py

# Run complete pytest test suite (36 unit tests passing across all 4 phases)
python -m pytest tests

# Seed Firestore
python scripts/seed_firestore.py --reset

# Start FastAPI server
uvicorn app.main:app --reload
```

### 2. Frontend Setup & Build
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies & build production bundle
npm install
npm run build

# Start React dev server
npm run dev
```

---

## 7. Defense-Only Statement

> **NOTICE**: RazorGuard AI is strictly a defense-only model evaluation system built for the Razorpay AI Buildathon 2026. All datasets are synthetically generated using fixed random seeds. The project contains zero real customer data, zero real UPI IDs, and zero real credentials.
