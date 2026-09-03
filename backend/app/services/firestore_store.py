import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from app.services.firebase_service import get_firebase_service

logger = logging.getLogger("razorguard.firestore")


class FirestoreStore:
    """
    Firestore Data Layer handling persistence for:
    merchants, customers, transactions, risk_cases, alerts,
    network_entities, network_relationships, and audit_logs.
    Includes in-memory fallback when Cloud Firestore is unconfigured.
    """
    COLLECTIONS = {
        "MERCHANTS": "merchants",
        "CUSTOMERS": "customers",
        "TRANSACTIONS": "transactions",
        "RISK_CASES": "risk_cases",
        "ALERTS": "alerts",
        "NETWORK_ENTITIES": "network_entities",
        "NETWORK_RELATIONSHIPS": "network_relationships",
        "AUDIT_LOGS": "audit_logs"
    }

    def __init__(self):
        self.firebase = get_firebase_service()
        # In-memory fallback cache if Firestore is not connected
        self._memory_cache: Dict[str, Dict[str, Dict[str, Any]]] = {
            c: {} for c in self.COLLECTIONS.values()
        }

    @property
    def db(self):
        return self.firebase.get_db()

    @property
    def is_connected(self) -> bool:
        return self.firebase.is_connected()

    # ==========================================
    # GENERIC CRUD OPERATIONS
    # ==========================================

    def create_document(self, collection_name: str, doc_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        data["updated_at"] = data.get("updated_at") or datetime.now(timezone.utc).isoformat()
        data["created_at"] = data.get("created_at") or data["updated_at"]

        if self.is_connected and self.db:
            try:
                self.db.collection(collection_name).document(doc_id).set(data)
            except Exception as e:
                logger.error(f"Firestore set error for {collection_name}/{doc_id}: {e}")

        # Update local memory cache as well
        if collection_name not in self._memory_cache:
            self._memory_cache[collection_name] = {}
        self._memory_cache[collection_name][doc_id] = data
        return data

    def get_document(self, collection_name: str, doc_id: str) -> Optional[Dict[str, Any]]:
        if self.is_connected and self.db:
            try:
                doc = self.db.collection(collection_name).document(doc_id).get()
                if doc.exists:
                    return doc.to_dict()
            except Exception as e:
                logger.error(f"Firestore get error for {collection_name}/{doc_id}: {e}")

        # Fallback to local memory cache
        return self._memory_cache.get(collection_name, {}).get(doc_id)

    def update_document(self, collection_name: str, doc_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()

        if self.is_connected and self.db:
            try:
                self.db.collection(collection_name).document(doc_id).update(updates)
            except Exception as e:
                logger.error(f"Firestore update error for {collection_name}/{doc_id}: {e}")

        existing = self.get_document(collection_name, doc_id)
        if existing:
            existing.update(updates)
            if collection_name in self._memory_cache:
                self._memory_cache[collection_name][doc_id] = existing
            return existing
        return None

    def delete_document(self, collection_name: str, doc_id: str) -> bool:
        if self.is_connected and self.db:
            try:
                self.db.collection(collection_name).document(doc_id).delete()
            except Exception as e:
                logger.error(f"Firestore delete error for {collection_name}/{doc_id}: {e}")

        if collection_name in self._memory_cache and doc_id in self._memory_cache[collection_name]:
            del self._memory_cache[collection_name][doc_id]
            return True
        return False

    def list_documents(
        self,
        collection_name: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []

        if self.is_connected and self.db:
            try:
                query = self.db.collection(collection_name)
                if filters:
                    for k, v in filters.items():
                        if v is not None:
                            query = query.where(k, "==", v)
                if limit and limit > 0:
                    query = query.limit(limit)

                docs = query.stream()
                for d in docs:
                    results.append(d.to_dict())
                if results:
                    return results
            except Exception as e:
                logger.error(f"Firestore list error for {collection_name}: {e}")

        # Fallback to local memory cache filtering
        cached_docs = list(self._memory_cache.get(collection_name, {}).values())
        if filters:
            for k, v in filters.items():
                if v is not None:
                    cached_docs = [d for d in cached_docs if d.get(k) == v]

        if limit and limit > 0:
            cached_docs = cached_docs[:limit]
        return cached_docs

    # ==========================================
    # AUDIT LOGGING SYSTEM
    # ==========================================

    def log_audit(self, action: str, entity_type: str, entity_id: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        log_id = f"LOG-{uuid.uuid4().hex[:8].upper()}"
        now_str = datetime.now(timezone.utc).isoformat()

        audit_entry = {
            "log_id": log_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "metadata": metadata or {},
            "timestamp": now_str
        }

        self.create_document(self.COLLECTIONS["AUDIT_LOGS"], log_id, audit_entry)
        return audit_entry

    # ==========================================
    # ENTITY PERSISTENCE HELPERS
    # ==========================================

    def save_merchant(self, merchant_dict: Dict[str, Any]) -> Dict[str, Any]:
        m_id = merchant_dict["merchant_id"]
        return self.create_document(self.COLLECTIONS["MERCHANTS"], m_id, merchant_dict)

    def save_customer(self, customer_dict: Dict[str, Any]) -> Dict[str, Any]:
        c_id = customer_dict["customer_id"]
        return self.create_document(self.COLLECTIONS["CUSTOMERS"], c_id, customer_dict)

    def save_transaction(self, tx_dict: Dict[str, Any]) -> Dict[str, Any]:
        tx_id = tx_dict["transaction_id"]
        res = self.create_document(self.COLLECTIONS["TRANSACTIONS"], tx_id, tx_dict)
        self.log_audit("TRANSACTION_PROCESSED", "transaction", tx_id, {"merchant_id": tx_dict.get("merchant_id"), "amount": tx_dict.get("amount")})
        return res

    def save_case(self, case_dict: Dict[str, Any]) -> Dict[str, Any]:
        case_id = case_dict["case_id"]
        existing = self.get_document(self.COLLECTIONS["RISK_CASES"], case_id)
        action = "CASE_UPDATED" if existing else ("NETWORK_CASE_CREATED" if case_id.startswith("CASE-NET-") else "CASE_CREATED")
        
        res = self.create_document(self.COLLECTIONS["RISK_CASES"], case_id, case_dict)
        self.log_audit(action, "risk_case", case_id, {"risk_score": case_dict.get("risk_score"), "risk_level": case_dict.get("risk_level")})

        # Also create alert if CRITICAL risk level
        if case_dict.get("risk_level") == "CRITICAL":
            self.save_alert({
                "alert_id": f"ALT-{case_id}",
                "case_id": case_id,
                "merchant_id": case_dict.get("merchant_id"),
                "customer_id": case_dict.get("customer_ids", [None])[0] if isinstance(case_dict.get("customer_ids"), list) else None,
                "severity": "CRITICAL",
                "message": f"Critical risk collusion ring detected for Merchant {case_dict.get('merchant_name')} ({case_dict.get('merchant_id')})",
                "status": "UNREAD",
                "created_at": datetime.now(timezone.utc).isoformat()
            })

        return res

    def save_alert(self, alert_dict: Dict[str, Any]) -> Dict[str, Any]:
        alt_id = alert_dict["alert_id"]
        res = self.create_document(self.COLLECTIONS["ALERTS"], alt_id, alert_dict)
        self.log_audit("ALERT_CREATED", "alert", alt_id, {"severity": alert_dict.get("severity")})
        return res

    def save_network_entity(self, entity_dict: Dict[str, Any]) -> Dict[str, Any]:
        e_id = entity_dict["entity_id"]
        return self.create_document(self.COLLECTIONS["NETWORK_ENTITIES"], e_id, entity_dict)

    def save_network_relationship(self, rel_dict: Dict[str, Any]) -> Dict[str, Any]:
        rel_id = rel_dict.get("relationship_id") or f"REL-{rel_dict['source_id']}-{rel_dict['target_id']}"
        rel_dict["relationship_id"] = rel_id
        return self.create_document(self.COLLECTIONS["NETWORK_RELATIONSHIPS"], rel_id, rel_dict)

    def clear_all(self):
        for c in self.COLLECTIONS.values():
            self._memory_cache[c] = {}
