# 🚀 RazorGuard AI — Merchant Risk Engine & Fraud Investigation API (Phase 2)

**RazorGuard AI** is an explainable, defense-only fraud detection and investigation backend built for the Razorpay AI Buildathon 2026. It detects merchant–customer collusion rings by combining multi-entity identity resolution, refund velocity analysis, network graph visualization, structured evidence generation, and local SQLite case management.

---

## 1. Overview & Objectives

In payment platforms, merchant-customer fraud often involves a bad actor operating a fraudulent merchant account alongside multiple synthetic customer accounts. By cycling transactions and rapid refunds through these connected entities, collusion rings exploit payout mechanisms and promotional incentives.

Phase 2 upgrades RazorGuard from a raw fraud detection script into a full **Explainable Fraud Investigation Engine & Case Management API**.

An investigator can:
1. Trigger automated fraud detection runs.
2. View suspicious merchant-customer collusion cases.
3. Open investigation cases with deterministic IDs (e.g. `CASE-0001`).
4. Review **WHY** a case was flagged with structured human-readable explanations.
5. Inspect complete **Risk Score Breakdowns** showing exact point contributions per signal.
6. Analyze **Connected Entities** (customer counts, shared hardware, payment destinations, addresses).
7. Inspect contributing **Transaction Evidence** with suspicious indicator flags.
8. Query an interactive **Network Graph** of nodes and edges (merchants, customers, devices, payment identity, addresses, transactions).
9. Track case status (`NEW`, `UNDER_REVIEW`, `CONFIRMED_FRAUD`, `FALSE_POSITIVE`, `CLOSED`).
10. Add time-stamped **Investigator Notes**.
11. View high-level metrics via the **Dashboard Summary API**.

---

## 2. System Architecture

```text
Synthetic Transactions Data (Generator)
               │
               ▼
Overlap Detector (Identity & Behavior Analysis)
               │
               ▼
Risk Scorer (Weighted Config & Synergy Bonus)
               │
               ▼
Evidence Engine (Human-readable Evidence & Score Breakdown)
               │
               ▼
Investigation Service & Network Graph Builder
               │
               ▼
Case Store (SQLite Persistence: razorguard.db)
               │
               ▼
FastAPI Application & REST Endpoints (/docs)
```

---

## 3. Case Management & SQLite Persistence

Cases are stored locally using SQLite (`razorguard.db`), requiring zero external database setup.

- **Deterministic Case IDs**: Derived consistently from merchant identifiers (e.g. `CASE-0001`), ensuring idempotent detection runs without duplicate record creation.
- **Investigation Statuses**:
  - `NEW`
  - `UNDER_REVIEW`
  - `CONFIRMED_FRAUD`
  - `FALSE_POSITIVE`
  - `CLOSED`
- **Investigator Notes**: Time-stamped notes attached directly to cases.

---

## 4. Explainable Evidence Engine

Raw boolean signals and numeric ratios are converted into human-readable explanations:

| Signal Name | Severity | Value / Threshold | Generated Explanation |
| :--- | :--- | :--- | :--- |
| `shared_payment_identity` | `CRITICAL` | `true` | "Merchant M089 and customer C002 share the same payment/payout identity." |
| `shared_device` | `HIGH` | `true` | "Merchant M089 and customer C002 share the same device fingerprint." |
| `shared_ip` | `MEDIUM` | `true` | "Merchant M089 and customer C002 operate from the same IP address." |
| `address_similarity` | `HIGH` | `93% / 80%` | "The merchant and customer addresses are 93% similar." |
| `abnormal_refund_velocity` | `HIGH` | `1513.3x / 8.0x` | "Refund activity is approximately 1513x higher than the expected baseline." |
| `multi_signal_synergy` | `CRITICAL` | `2 / 2` | "Multi-signal collusion cluster confirmed with 2 independent identity overlaps." |

---

## 5. Risk Score Breakdown

Every case includes a point contribution breakdown explaining how the final score was computed:

```json
{
  "risk_score": 100.0,
  "risk_level": "CRITICAL",
  "score_breakdown": [
    {
      "signal": "shared_payment_identity",
      "weight": 30.0,
      "contribution": 30.0
    },
    {
      "signal": "shared_device",
      "weight": 25.0,
      "contribution": 25.0
    },
    {
      "signal": "address_similarity",
      "weight": 15.0,
      "contribution": 15.0
    },
    {
      "signal": "abnormal_refund_velocity",
      "weight": 20.0,
      "contribution": 20.0
    },
    {
      "signal": "multi_signal_synergy",
      "weight": 10.0,
      "contribution": 10.0
    }
  ]
}
```

---

## 6. API Endpoints Reference

FastAPI automatically serves interactive OpenAPI documentation at `/docs`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server health check |
| `POST` | `/api/dataset/generate` | Generate reproducible synthetic dataset |
| `POST` | `/api/detect` | Execute collusion detection (Phase 1 compatibility) |
| `POST` | `/api/detection/run` | Run detection engine and persist/update cases |
| `GET` | `/api/cases` | List cases (Query filters: `status`, `risk_level`, `limit`) |
| `GET` | `/api/cases/{case_id}` | Fetch full investigation case details |
| `POST` | `/api/cases/{case_id}/status` | Update investigation status |
| `POST` | `/api/cases/{case_id}/notes` | Append investigator note |
| `GET` | `/api/cases/{case_id}/graph` | Fetch case network graph JSON (nodes & edges) |
| `GET` | `/api/dashboard/summary` | Fetch investigation dashboard metrics |
| `GET` | `/api/evaluation` | Fetch precision, recall, and cost metrics |

---

## 7. Example API Requests & Responses

### `GET /api/cases/CASE-0001`
```json
{
  "case_id": "CASE-0001",
  "merchant_id": "M089",
  "merchant_name": "Zenith Store 89",
  "customer_ids": ["C002", "C028", "C079", "C185", "C252"],
  "risk_score": 100.0,
  "risk_level": "CRITICAL",
  "status": "NEW",
  "created_at": "2026-09-03T18:50:00.000000+00:00",
  "updated_at": "2026-09-03T18:50:00.000000+00:00",
  "evidence": [
    {
      "signal": "shared_payment_identity",
      "severity": "CRITICAL",
      "value": true,
      "threshold": true,
      "explanation": "Merchant M089 and customer C002 share the same payment/payout identity."
    }
  ],
  "score_breakdown": [
    {"signal": "shared_payment_identity", "weight": 30.0, "contribution": 30.0}
  ],
  "connected_entities": {
    "connected_customers_count": 5,
    "connected_customer_ids": ["C002", "C028", "C079", "C185", "C252"],
    "shared_devices_count": 1,
    "shared_payment_identities_count": 1,
    "shared_addresses_count": 1,
    "suspicious_transactions_count": 79,
    "detected_signals_count": 5
  },
  "investigator_notes": []
}
```

### `POST /api/cases/CASE-0001/status`
**Request Body**:
```json
{
  "status": "UNDER_REVIEW"
}
```

### `GET /api/cases/CASE-0001/graph`
```json
{
  "nodes": [
    {"id": "M089", "type": "merchant", "label": "Zenith Store 89"},
    {"id": "C002", "type": "customer", "label": "Customer C002"}
  ],
  "edges": [
    {"source": "M089", "target": "C002", "relationship": "SHARES_DEVICE"}
  ]
}
```

### Error Responses
**404 Not Found**:
```json
{
  "error": "CASE_NOT_FOUND",
  "message": "Case CASE-9999 was not found."
}
```

**400 Bad Request**:
```json
{
  "error": "INVALID_STATUS",
  "message": "Unsupported investigation status."
}
```

---

## 8. Installation & Testing

### 1. Installation
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt
```

### 2. Run Automated Tests
```bash
python -m pytest tests
```

### 3. Run Interactive CLI Demo
```bash
python run_demo.py
```

### 4. Launch FastAPI Server
```bash
uvicorn app.main:app --reload
```
Access Swagger UI at `http://127.0.0.1:8000/docs`.

---

## 9. Defense-Only Statement

> **NOTICE**: RazorGuard AI is strictly a defense-only model evaluation system. All datasets are synthetically generated using fixed random seeds. The project contains zero real customer data, zero real UPI IDs, and zero real credentials.
