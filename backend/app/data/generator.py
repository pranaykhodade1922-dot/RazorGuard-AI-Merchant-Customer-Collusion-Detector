import random
import datetime
import json
import os
from typing import List, Dict, Tuple, Any, Optional

from app.models.schemas import Merchant, Customer, Transaction, GroundTruth

SEED = 42

CITIES = ["Mumbai", "Delhi", "Bengaluru", "Pune", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad"]
CATEGORIES = ["electronics", "fashion", "digital_goods", "gaming", "travel", "groceries"]

MERCHANT_NAME_PREFIXES = [
    "TechTrend", "Synthetic Electronics", "Apex Retail", "Urban Commerce",
    "Digital Nexus", "ElectroHub", "Prime Deals", "Vanguard Outlets", "Zenith Store"
]

CUSTOMER_FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan",
    "Ananya", "Diya", "Priya", "Kavya", "Riya", "Isha", "Neha", "Pooja",
    "Rahul", "Rohan", "Amit", "Siddharth", "Vikram", "Neha", "Sneha", "Anish"
]

CUSTOMER_LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Mehta", "Gupta", "Joshi", "Kumar", "Singh",
    "Rao", "Nair", "Iyer", "Deshmukh", "Kulkarni", "Chowdhury", "Reddy"
]

STREETS = [
    "MG Road", "Station Road", "Park Street", "Civil Lines", "Bannerghatta Road",
    "FC Road", "Gachibowli Main Rd", "Anna Salai", "Ring Road", "Link Road"
]


class SyntheticDataGenerator:
    def __init__(self, seed: int = SEED):
        self.seed = seed
        self.rng = random.Random(seed)
        
    def generate_all(
        self,
        num_merchants: int = 100,
        num_customers: int = 500,
        num_transactions: int = 3500,
        num_rings: int = 6
    ) -> Tuple[List[Merchant], List[Customer], List[Transaction], List[GroundTruth]]:
        self.rng = random.Random(self.seed)
        
        # 1. Generate Merchants
        merchants: List[Merchant] = []
        for i in range(1, num_merchants + 1):
            m_id = f"M{i:03d}"
            name = f"{self.rng.choice(MERCHANT_NAME_PREFIXES)} {i}"
            category = self.rng.choice(CATEGORIES)
            city = self.rng.choice(CITIES)
            addr = f"{self.rng.randint(1, 100)} {self.rng.choice(STREETS)}, {city}"
            device_id = f"DEV_M_{m_id}"
            ip_addr = f"10.0.{self.rng.randint(10, 99)}.{self.rng.randint(1, 254)}"
            payout_upi = f"merchant{i:03d}@synthetic"
            payout_bank = f"BANK9900{i:04d}"
            
            merchants.append(Merchant(
                merchant_id=m_id,
                merchant_name=name,
                category=category,
                payout_upi=payout_upi,
                payout_bank_account=payout_bank,
                registered_device_id=device_id,
                registered_ip=ip_addr,
                address=addr,
                city=city
            ))

        # 2. Generate Customers
        customers: List[Customer] = []
        for i in range(1, num_customers + 1):
            c_id = f"C{i:03d}"
            fname = self.rng.choice(CUSTOMER_FIRST_NAMES)
            lname = self.rng.choice(CUSTOMER_LAST_NAMES)
            cname = f"{fname} {lname}"
            city = self.rng.choice(CITIES)
            addr = f"{self.rng.randint(1, 100)} {self.rng.choice(STREETS)}, {city}"
            device_id = f"DEV_C_{c_id}"
            ip_addr = f"10.1.{self.rng.randint(10, 99)}.{self.rng.randint(1, 254)}"
            upi_id = f"{fname.lower()}{c_id.lower()}@synthetic"
            
            customers.append(Customer(
                customer_id=c_id,
                customer_name=cname,
                upi_id=upi_id,
                device_id=device_id,
                ip_address=ip_addr,
                address=addr,
                city=city
            ))

        # Map for quick lookup
        merchant_map = {m.merchant_id: m for m in merchants}
        customer_map = {c.customer_id: c for c in customers}

        # 3. Create Hidden Collusion Rings (Ground Truth)
        ground_truth: List[GroundTruth] = []
        ring_assignments: Dict[Tuple[str, str], str] = {} # (m_id, c_id) -> ring_id
        
        # Pick specific merchants and customers to form rings
        available_merchants = list(merchants)
        self.rng.shuffle(available_merchants)
        available_customers = list(customers)
        self.rng.shuffle(available_customers)

        ring_types = [
            "RING_A_DEVICE_IP_VELOCITY",
            "RING_B_PAYMENT_ADDRESS_CONCENTRATION",
            "RING_C_DEVICE_PAYMENT_TIMING",
            "RING_D_FULL_COLLUSION",
            "RING_E_GEO_REFUND_ANOMALY",
            "RING_F_HIGH_VELOCITY_TIMING"
        ]

        for r_idx in range(num_rings):
            ring_id = f"R{r_idx + 1:03d}"
            ring_type = ring_types[r_idx % len(ring_types)]
            
            target_merchant = available_merchants.pop()
            ring_cust_count = self.rng.randint(3, 5)
            ring_custs: List[Customer] = [available_customers.pop() for _ in range(ring_cust_count)]
            
            # Seed collusion signals onto customer objects / ring metadata
            for c in ring_custs:
                gt = GroundTruth(
                    merchant_id=target_merchant.merchant_id,
                    customer_id=c.customer_id,
                    is_collusive=True,
                    ring_id=ring_id,
                    ring_type=ring_type
                )
                ground_truth.append(gt)
                ring_assignments[(target_merchant.merchant_id, c.customer_id)] = ring_id

                # Apply synthetic overlapping identity signals based on ring type
                if "DEVICE" in ring_type:
                    c.device_id = target_merchant.registered_device_id
                if "IP" in ring_type:
                    c.ip_address = target_merchant.registered_ip
                if "PAYMENT" in ring_type:
                    # Customer refund UPI / identity matches merchant payout identity
                    c.upi_id = f"refund_{target_merchant.payout_upi}"
                if "ADDRESS" in ring_type:
                    # High address similarity with merchant
                    c.address = f"{target_merchant.address} Suite {self.rng.randint(1, 5)}"
                    c.city = target_merchant.city
                if "GEO" in ring_type:
                    c.city = target_merchant.city

        # Fill ground truth for non-collusive pairs that interact
        # 4. Generate Transactions
        transactions: List[Transaction] = []
        base_time = datetime.datetime(2026, 1, 1, 10, 0, 0)
        
        tx_id_counter = 1
        
        # A) Generate Legitimate Transactions (85% of total volume)
        num_legit_tx = int(num_transactions * 0.85)
        for _ in range(num_legit_tx):
            m = self.rng.choice(merchants)
            c = self.rng.choice(customers)
            
            # Check if this pair is actually a collusive ring; skip to keep legit clean
            if (m.merchant_id, c.customer_id) in ring_assignments:
                continue

            time_offset = datetime.timedelta(
                days=self.rng.randint(0, 60),
                hours=self.rng.randint(0, 23),
                minutes=self.rng.randint(0, 59),
                seconds=self.rng.randint(0, 59)
            )
            tx_time = base_time + time_offset
            
            # Legitimate refund rate: ~4%
            is_refunded = self.rng.random() < 0.04
            refund_time_str = None
            refund_status = "NONE"
            
            if is_refunded:
                refund_status = "REFUNDED"
                # Normal refund timing: 2 to 7 days later
                refund_delay = datetime.timedelta(
                    days=self.rng.randint(2, 7),
                    hours=self.rng.randint(1, 12)
                )
                refund_time_str = (tx_time + refund_delay).isoformat()

            # Legitimate natural overlaps (IP/subnet shared by ~3% of population, city shared naturally)
            tx_ip = c.ip_address
            if self.rng.random() < 0.03: # public wifi / carrier NAT
                tx_ip = "192.168.1.100"

            tx = Transaction(
                transaction_id=f"TX{tx_id_counter:06d}",
                merchant_id=m.merchant_id,
                customer_id=c.customer_id,
                amount=round(self.rng.uniform(100.0, 5000.0), 2),
                timestamp=tx_time.isoformat(),
                payment_status="SUCCESS",
                refund_status=refund_status,
                refund_timestamp=refund_time_str,
                device_id=c.device_id,
                ip_address=tx_ip,
                customer_upi=c.upi_id
            )
            transactions.append(tx)
            tx_id_counter += 1

        # B) Generate Collusive Ring Transactions (High velocity, rapid refunds, concentrated volume)
        for (m_id, c_id), ring_id in ring_assignments.items():
            m = merchant_map[m_id]
            c = customer_map[c_id]
            
            # Collusive pairs have high transaction count (10-25 transactions per pair)
            collusive_tx_count = self.rng.randint(12, 22)
            ring_start_time = base_time + datetime.timedelta(days=self.rng.randint(10, 40))
            
            for k in range(collusive_tx_count):
                # Concentrated rapid timestamps (minutes apart)
                tx_time = ring_start_time + datetime.timedelta(
                    hours=k * 2,
                    minutes=self.rng.randint(1, 30)
                )
                
                # Collusive refund rate: ~85% to 95%!
                is_refunded = self.rng.random() < 0.90
                refund_status = "NONE"
                refund_time_str = None
                
                if is_refunded:
                    refund_status = "REFUNDED"
                    # Suspicious instant or rapid refund timing (e.g., 30 seconds to 15 minutes after transaction)
                    refund_delay = datetime.timedelta(seconds=self.rng.randint(15, 300))
                    refund_time_str = (tx_time + refund_delay).isoformat()

                tx = Transaction(
                    transaction_id=f"TX{tx_id_counter:06d}",
                    merchant_id=m.merchant_id,
                    customer_id=c.customer_id,
                    amount=round(self.rng.uniform(4000.0, 9900.0), 2), # high round numbers
                    timestamp=tx_time.isoformat(),
                    payment_status="SUCCESS",
                    refund_status=refund_status,
                    refund_timestamp=refund_time_str,
                    device_id=c.device_id,
                    ip_address=c.ip_address,
                    customer_upi=c.upi_id
                )
                transactions.append(tx)
                tx_id_counter += 1

        # Sort transactions chronologically
        transactions.sort(key=lambda x: x.timestamp)
        
        return merchants, customers, transactions, ground_truth

    def save_to_file(
        self,
        merchants: List[Merchant],
        customers: List[Customer],
        transactions: List[Transaction],
        ground_truth: List[GroundTruth],
        directory: str
    ):
        os.makedirs(directory, exist_ok=True)
        
        with open(os.path.join(directory, "merchants.json"), "w") as f:
            json.dump([m.model_dump() for m in merchants], f, indent=2)
            
        with open(os.path.join(directory, "customers.json"), "w") as f:
            json.dump([c.model_dump() for c in customers], f, indent=2)
            
        with open(os.path.join(directory, "transactions.json"), "w") as f:
            json.dump([t.model_dump() for t in transactions], f, indent=2)
            
        with open(os.path.join(directory, "ground_truth.json"), "w") as f:
            json.dump([gt.model_dump() for gt in ground_truth], f, indent=2)
