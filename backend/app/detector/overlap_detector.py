import difflib
import datetime
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

from app.models.schemas import Merchant, Customer, Transaction, PairSignals


def calculate_string_similarity(str1: str, str2: str) -> float:
    """Calculates normalized string similarity using token Jaccard + SequenceMatcher."""
    if not str1 or not str2:
        return 0.0
    
    s1_clean = str1.lower().strip()
    s2_clean = str2.lower().strip()
    
    if s1_clean == s2_clean:
        return 1.0
        
    # Token Jaccard similarity
    tokens1 = set(s1_clean.replace(",", " ").replace(".", " ").split())
    tokens2 = set(s2_clean.replace(",", " ").replace(".", " ").split())
    
    if not tokens1 or not tokens2:
        return 0.0
        
    intersection = tokens1.intersection(tokens2)
    jaccard = len(intersection) / len(tokens1.union(tokens2))
    
    # Fast path: if no token overlap and neither string contains the other, similarity is 0.0
    if not intersection and s1_clean not in s2_clean and s2_clean not in s1_clean:
        return 0.0
        
    seq_ratio = difflib.SequenceMatcher(None, s1_clean, s2_clean).ratio()
    return round(max(seq_ratio, jaccard), 3)


import functools

@functools.lru_cache(maxsize=4096)
def parse_iso_timestamp(ts_str: Optional[str]) -> Optional[datetime.datetime]:
    if not ts_str:
        return None
    try:
        return datetime.datetime.fromisoformat(ts_str)
    except Exception:
        return None


class OverlapDetector:
    def __init__(self, baseline_refund_time_sec: float = 259200.0):
        # Baseline refund time: 3 days = 259,200 seconds
        self.baseline_refund_time_sec = baseline_refund_time_sec

    def analyze_merchant_customer_pair(
        self,
        merchant: Merchant,
        customer: Customer,
        pair_transactions: List[Transaction]
    ) -> PairSignals:
        # 1. Device overlap
        tx_devices = {tx.device_id for tx in pair_transactions}
        shared_device = (
            merchant.registered_device_id == customer.device_id or
            merchant.registered_device_id in tx_devices
        )

        # 2. IP overlap
        tx_ips = {tx.ip_address for tx in pair_transactions}
        shared_ip = (
            merchant.registered_ip == customer.ip_address or
            merchant.registered_ip in tx_ips
        )

        # 3. Payment identity overlap (refund destination / UPI / bank account match)
        tx_upis = {tx.customer_upi for tx in pair_transactions}
        shared_payment_identity = False
        
        # Direct UPI or Bank match
        if (customer.upi_id == merchant.payout_upi or 
            customer.upi_id == merchant.payout_bank_account or
            merchant.payout_upi in customer.upi_id or
            merchant.payout_upi in tx_upis or
            "refund_" + merchant.payout_upi in customer.upi_id):
            shared_payment_identity = True

        # 4. Name similarity
        name_sim = calculate_string_similarity(merchant.merchant_name, customer.customer_name)

        # 5. Address similarity
        addr_sim = calculate_string_similarity(merchant.address, customer.address)

        # 6. Shared city
        shared_city = (merchant.city.lower() == customer.city.lower())

        # 7-11. Transaction behavior signals
        pair_tx_count = len(pair_transactions)
        refund_count = 0
        refund_delays_sec = []

        for tx in pair_transactions:
            if tx.refund_status == "REFUNDED":
                refund_count += 1
                tx_dt = parse_iso_timestamp(tx.timestamp)
                rf_dt = parse_iso_timestamp(tx.refund_timestamp)
                if tx_dt and rf_dt and rf_dt >= tx_dt:
                    delay = (rf_dt - tx_dt).total_seconds()
                    refund_delays_sec.append(delay)

        refund_ratio = round(refund_count / pair_tx_count, 3) if pair_tx_count > 0 else 0.0

        if refund_delays_sec:
            avg_refund_time = float(sum(refund_delays_sec) / len(refund_delays_sec))
            # Velocity ratio: baseline time / actual refund time (higher means faster/more suspicious)
            # Safe division: min refund time capped at 1 sec
            eff_avg = max(avg_refund_time, 1.0)
            velocity_ratio = round(self.baseline_refund_time_sec / eff_avg, 2)
        else:
            avg_refund_time = 0.0
            velocity_ratio = 1.0

        # Transaction concentration ratio (placeholder calculation per pair)
        # Ratio of transactions relative to normal transaction threshold
        tx_concentration = round(min(pair_tx_count / 15.0, 1.0), 3)

        return PairSignals(
            shared_device=shared_device,
            shared_ip=shared_ip,
            shared_payment_identity=shared_payment_identity,
            name_similarity=name_sim,
            address_similarity=addr_sim,
            shared_city=shared_city,
            refund_frequency=refund_count,
            refund_ratio=refund_ratio,
            refund_velocity_ratio=velocity_ratio,
            avg_refund_time_sec=round(avg_refund_time, 1),
            transaction_concentration=tx_concentration,
            pair_transaction_count=pair_tx_count
        )

    def analyze_all_pairs(
        self,
        merchants: List[Merchant],
        customers: List[Customer],
        transactions: List[Transaction]
    ) -> Dict[Tuple[str, str], PairSignals]:
        # Group transactions by (merchant_id, customer_id)
        pair_tx_map = defaultdict(list)
        for tx in transactions:
            pair_tx_map[(tx.merchant_id, tx.customer_id)].append(tx)

        merchant_dict = {m.merchant_id: m for m in merchants}
        customer_dict = {c.customer_id: c for c in customers}

        results: Dict[Tuple[str, str], PairSignals] = {}

        # Analyze active pairs with transactions first
        for (m_id, c_id), txs in pair_tx_map.items():
            if m_id in merchant_dict and c_id in customer_dict:
                m = merchant_dict[m_id]
                c = customer_dict[c_id]
                signals = self.analyze_merchant_customer_pair(m, c, txs)
                results[(m_id, c_id)] = signals

        return results
