# 🚀 RazorGuard AI — Merchant Risk Engine & Network Intelligence (Phase 3 + Firebase)

**RazorGuard AI** is an explainable, defense-only fraud detection, network intelligence, and case management system built for the Razorpay AI Buildathon 2026. It uncovers complex merchant–customer collusion rings by moving beyond transaction-level anomalies to **relationship and graph-network level intelligence** backed by **Cloud Firestore persistence**.

---

## 1. Overview & System Architecture

RazorGuard integrates multi-entity identity resolution, refund velocity analysis, network topology graphs, rule-based pattern detectors, and Cloud Firestore persistence via the Firebase Admin SDK.

```text
React Frontend Dashboard
           │
           ▼
    FastAPI Backend
           │
           ├──► Firebase Admin SDK ──► Cloud Firestore (merchants, customers, transactions,
           │                                          risk_cases, alerts, network_entities,
           │                                          network_relationships, audit_logs)
           ├──► Overlap Detector & Risk Scorer
           ├──► NetworkX Graph Topology Engine
           └──► Local SQLite CaseStore Fallback
```

---

## 2. Firebase / Firestore Integration Setup

1. **Create Firebase Project**: Go to [Firebase Console](https://console.firebase.google.com/), create a project, and enable Cloud Firestore.
2. **Generate Service Account Key**: Navigate to `Project Settings` → `Service accounts` → `Generate new private key`.
3. **Configure Environment Variables**:
   Copy `backend/.env.example` to `backend/.env` and set:
   ```env
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_CLIENT_EMAIL=your-firebase-service-account-email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-here\n-----END PRIVATE KEY-----\n"
   ```
4. **Local Fallback Mode**: If environment variables are omitted, RazorGuard operates seamlessly in local fallback mode (in-memory & SQLite) without crashing.
5. **Run Dev Seed Script**:
   ```bash
   cd backend
   python scripts/seed_firestore.py --reset
   ```
6. **Verify Firebase Health**:
   `GET http://127.0.0.1:8000/health` returns `{"status": "ok", "firebase": "connected"}`.

---

## 3. Firestore Collections

* `merchants`: Merchant business details, status, and aggregate risk scores.
* `customers`: Customer profiles and synthetic identifiers.
* `transactions`: Complete transaction log with risk levels and indicators.
* `risk_cases`: Phase 2 investigation cases and status history.
* `alerts`: Critical risk alerts for security operations.
* `network_entities`: Phase 3 network graph nodes.
* `network_relationships`: Phase 3 multi-relational edges.
* `audit_logs`: System audit Trail (`CASE_CREATED`, `CASE_UPDATED`, `ALERT_CREATED`, `NETWORK_CASE_CREATED`, `TRANSACTION_PROCESSED`).

---

## 4. Fraud Network Model & Collusion Patterns

### Graph Nodes & Relationships
* Nodes: `MERCHANT`, `CUSTOMER`, `DEVICE`, `PAYMENT_FINGERPRINT`, `IP`
* Edges: `TRANSACTED_WITH`, `SHARES_DEVICE`, `SHARES_PAYMENT`, `SHARES_IP`

### Collusion Patterns (100% Deterministic & Rule-Based)
1. **`SHARED_CUSTOMER_CLUSTER`**: Multiple merchants repeatedly transacting with an identical customer subset.
2. **`CIRCULAR_RELATIONSHIP`**: Closed loops (`Merchant A → Customer X → Merchant B → Customer Y → Merchant A`).
3. **`DENSE_COLLUSION_CLUSTER`**: Unusually dense subgraphs (`density >= 0.4`).
4. **`SHARED_FINGERPRINT`**: Shared hardware (`SHARED_DEVICE`), payment accounts (`SHARED_PAYMENT_FINGERPRINT`), or IPs (`SHARED_IP`).
5. **`COORDINATED_TRANSACTION_BURST`**: Multiple transactions across related entities occurring within a short time window (e.g. 15 mins).
6. **`REPEATED_RISKY_RELATIONSHIP`**: Merchant-customer pairs flagged repeatedly with high transaction risk (`>= 60.0`).

---

## 5. API Endpoints Reference

FastAPI serves full interactive OpenAPI documentation at `/docs`.

### Firestore & Entity Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server & Firebase connection health status |
| `GET` | `/api/merchants` | List persistent merchants |
| `GET` | `/api/merchants/{merchant_id}` | Get merchant detail |
| `GET` | `/api/customers` | List persistent customers |
| `GET` | `/api/customers/{customer_id}` | Get customer detail |
| `GET` | `/api/transactions` | List persistent transactions |
| `GET` | `/api/transactions/{transaction_id}` | Get transaction detail |
| `GET` | `/api/alerts` | List critical risk alerts |
| `GET` | `/api/network/entities` | List persistent network entities |
| `GET` | `/api/network/relationships` | List persistent network relationships |

### Network Intelligence & Investigation Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/network/overview` | Network topology counters and risk metrics |
| `GET` | `/api/network/nodes` | List network nodes with filters |
| `GET` | `/api/network/edges` | List network edges with filters |
| `GET` | `/api/network/clusters` | List detected fraud collusion clusters |
| `GET` | `/api/network/risky-relationships` | List top suspicious relationships |
| `GET` | `/api/network/entity/{entity_id}` | Entity network detail inspection |
| `GET` | `/api/network/entity/{entity_id}/connections` | 1-hop subgraph neighborhood JSON |
| `GET` | `/api/network/path/{source_id}/{target_id}` | Calculate shortest relationship path |
| `POST` | `/api/detection/run` | Run full detection & sync to Firestore |
| `GET` | `/api/cases` | List investigation cases |
| `GET` | `/api/cases/{case_id}` | Get full case details |
| `POST` | `/api/cases/{case_id}/status` | Update investigation status |
| `POST` | `/api/cases/{case_id}/notes` | Add investigator note |

---

## 6. Installation & Testing

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run complete pytest test suite (27 unit tests passing)
python -m pytest tests

# Seed Firestore
python scripts/seed_firestore.py --reset

# Start FastAPI server
uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies & run build
npm install
npm run build

# Start React dev server
npm run dev
```

---

## 7. Defense-Only Statement

> **NOTICE**: RazorGuard AI is strictly a defense-only model evaluation system built for the Razorpay AI Buildathon 2026. All datasets are synthetically generated using fixed random seeds. The project contains zero real customer data, zero real UPI IDs, and zero real credentials.
