from typing import List, Dict, Set, Optional, Tuple
from app.models.schemas import (
    Merchant, Customer, Transaction, RiskScoreResult,
    ConnectedEntitiesSummary, TransactionEvidence, EvidenceDetail, ScoreBreakdownItem
)
from app.investigation.evidence_engine import EvidenceEngine


class InvestigationService:
    def __init__(self):
        self.evidence_engine = EvidenceEngine()

    def analyze_connected_entities(
        self,
        merchant: Merchant,
        connected_customers: List[Customer],
        pair_results: List[RiskScoreResult],
        transactions: List[Transaction]
    ) -> ConnectedEntitiesSummary:
        cust_ids = [c.customer_id for c in connected_customers]
        
        shared_devices: Set[str] = set()
        shared_payment: Set[str] = set()
        shared_addresses: Set[str] = set()
        detected_signals: Set[str] = set()

        for c in connected_customers:
            if c.device_id == merchant.registered_device_id:
                shared_devices.add(c.device_id)
            if c.upi_id == merchant.payout_upi:
                shared_payment.add(c.upi_id)
            
            # Token match check for address
            m_tokens = set(merchant.address.lower().split())
            c_tokens = set(c.address.lower().split())
            if m_tokens and c_tokens:
                jaccard = len(m_tokens.intersection(c_tokens)) / len(m_tokens.union(c_tokens))
                if jaccard >= 0.8:
                    shared_addresses.add(c.address)

        for res in pair_results:
            sig = res.signals
            if sig.shared_device:
                detected_signals.add("shared_device")
            if sig.shared_ip:
                detected_signals.add("shared_ip")
            if sig.shared_payment_identity:
                detected_signals.add("shared_payment_identity")
            if sig.address_similarity >= 0.8:
                detected_signals.add("address_similarity")
            if sig.refund_velocity_ratio >= 8.0 or sig.refund_ratio >= 0.65:
                detected_signals.add("abnormal_refund_velocity")

        # Relevant transactions
        rel_txs = [
            tx for tx in transactions
            if tx.merchant_id == merchant.merchant_id and tx.customer_id in set(cust_ids)
        ]
        suspicious_txs = [tx for tx in rel_txs if tx.refund_status == "REFUNDED"]

        return ConnectedEntitiesSummary(
            connected_customers_count=len(cust_ids),
            connected_customer_ids=sorted(cust_ids),
            shared_devices_count=len(shared_devices),
            shared_payment_identities_count=len(shared_payment),
            shared_addresses_count=len(shared_addresses),
            suspicious_transactions_count=len(suspicious_txs),
            detected_signals_count=len(detected_signals)
        )

    def extract_transaction_evidence(
        self,
        merchant: Merchant,
        connected_customer_ids: List[str],
        transactions: List[Transaction],
        pair_results_map: Dict[str, RiskScoreResult]
    ) -> List[TransactionEvidence]:
        tx_evidence_list: List[TransactionEvidence] = []
        cust_set = set(connected_customer_ids)

        for tx in transactions:
            if tx.merchant_id == merchant.merchant_id and tx.customer_id in cust_set:
                indicators: List[str] = []
                
                # Check transaction specific flags
                if tx.device_id == merchant.registered_device_id:
                    indicators.append("Transaction processed on Merchant's registered device")
                if tx.ip_address == merchant.registered_ip:
                    indicators.append("Transaction processed from Merchant's network IP")
                if tx.customer_upi == merchant.payout_upi:
                    indicators.append("Transaction payout/refund destination matches Merchant payout account")
                if tx.refund_status == "REFUNDED":
                    indicators.append("Rapid refund processed")

                pair_res = pair_results_map.get(tx.customer_id)
                if pair_res:
                    if pair_res.signals.refund_velocity_ratio >= 8.0:
                        indicators.append(f"Part of abnormal refund velocity pattern ({pair_res.signals.refund_velocity_ratio:.1f}x baseline)")

                tx_evidence = TransactionEvidence(
                    transaction_id=tx.transaction_id,
                    merchant_id=tx.merchant_id,
                    customer_id=tx.customer_id,
                    amount=tx.amount,
                    timestamp=tx.timestamp,
                    transaction_type="REFUND" if tx.refund_status == "REFUNDED" else "PURCHASE",
                    refund_status=tx.refund_status,
                    refund_timestamp=tx.refund_timestamp,
                    suspicious_indicators=indicators
                )
                tx_evidence_list.append(tx_evidence)

        # Sort transactions by timestamp descending
        tx_evidence_list.sort(key=lambda t: t.timestamp, reverse=True)
        return tx_evidence_list
