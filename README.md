# 🚀 RazorGuard AI — Merchant–Customer Collusion Detection Engine (Phase 1)

**RazorGuard AI** is a defense-only fraud prevention engine built for the Razorpay AI Buildathon 2026. It detects suspicious **merchant–customer collusion rings** by analyzing multi-entity identity overlaps and anomalous refund transaction behavior.

---

## 1. What is RazorGuard AI?

In payment platforms, merchant-customer fraud often involves a single bad actor operating both a fraudulent merchant account and multiple synthetic customer accounts. By cycling transactions and rapid refunds through these connected accounts, collusive rings exploit payout mechanisms, refund abuse, and promotional incentives.

RazorGuard AI builds an **identity graph** across shared device fingerprints, IP addresses, payment credentials, address similarities, and refund velocity metrics to uncover hidden collusion structures.

---

## 2. The Problem: Merchant–Customer Collusion

A traditional payment platform sees independent customer transactions:

```text
Merchant M001
    ↓
Customer C001
Customer C002
Customer C003
```

However, a fraudulent merchant secretly controls multiple customer accounts:

```text
             Same Fraudulent Actor
            /         |         \
     Merchant      Customer  Customer
       M001          C001      C002
                               C003
```

---

## 3. Signal Overlap Example

```text
Merchant M023
   ↓
Customer C102
Customer C184
Customer C221

All connected through:
Device Fingerprint + IP Address + Payout Identity + Rapid Refund Pattern
```

> **Key Rule**: One suspicious signal does NOT equal fraud. Legitimate customers can share cities, IP ranges, or neighborhoods. Risk increases when multiple independent identity overlaps combine with anomalous transaction behavior.

---

## 4. System Architecture

```text
Synthetic Transactions
        ↓
Identity Resolution
        ↓
Overlap Detection Engine (11 Detection Signals)
        ↓
Transparent Risk Scoring Engine (Configurable Weights & Thresholds)
        ↓
NetworkX Identity Graph & Cluster Analysis
        ↓
Suspicious Collusion Ring Flagging & Evidence Synthesis
```

---

## 5. Why Deterministic Detection?

Detection in Phase 1 relies strictly on deterministic Python logic, statistical similarity algorithms, refund velocity ratios, and graph topology. Deterministic engines provide:
- **Measurable & Reproducible Results**: Fixed seed runs yield 100% consistent audit trails.
- **Explainable Evidence**: Every risk score is backed by exact matching signals and metrics.
- **Zero Hallucinations**: Fraud risk classification is objective and rule-bounded.

---

## 6. Why AI / LLM Later?

In Phase 2 & 3, LLM capabilities will be added strictly as an **investigation and explainability layer** (summarizing complex graph evidence into natural language reports for fraud analysts) rather than replacing the core deterministic classifier.

---

## 7. Evaluation & False-Positive Cost Model

RazorGuard AI evaluates detector performance against hidden synthetic ground-truth labels using `scikit-learn`:
- **Precision**: % of flagged pairs that are true collusion rings.
- **Recall**: % of actual collusion rings correctly detected.
- **F1 Score**: Harmonic mean of precision and recall.
- **False-Positive Cost Model**: Evaluates investigation costs vs avoided fraud losses based on configurable financial assumptions.

---

## 8. Defense-Only & Synthetic Data Statement

> **IMPORTANT**: RazorGuard AI is strictly a defense-only system. All datasets are synthetically generated using fixed random seeds. The project contains zero real customer data, zero real UPI IDs, zero real bank accounts, zero real KYC details, and zero real credentials.

---

## 9. Running Locally

### 1. Prerequisites
- Python 3.11+

### 2. Installation
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt
```

### 3. Run Automated Tests
```bash
pytest tests
```

### 4. Execute Interactive CLI Demo
```bash
python run_demo.py
```

### 5. Launch FastAPI Service
```bash
uvicorn app.main:app --reload
```

### 6. API Endpoints
- `GET http://127.0.0.1:8000/health`: Health check
- `POST http://127.0.0.1:8000/api/dataset/generate`: Generate reproducible synthetic dataset
- `POST http://127.0.0.1:8000/api/detect`: Run detection and risk scoring
- `GET http://127.0.0.1:8000/api/cases`: Fetch flagged suspicious cases & evidence
- `GET http://127.0.0.1:8000/api/evaluation`: Fetch model precision, recall, and cost metrics
