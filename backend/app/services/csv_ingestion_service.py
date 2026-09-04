import csv
import io
import logging
from typing import List, Dict, Any
from app.models.schemas import Merchant, Customer, Transaction

logger = logging.getLogger("razorguard.csv_ingestion")

class CSVIngestionService:
    """
    Parses, validates, and ingests user-uploaded CSV datasets into RazorGuard.
    """
    REQUIRED_FIELDS = {
        "merchants": ["merchant_id", "merchant_name"],
        "customers": ["customer_id", "customer_name"],
        "transactions": ["transaction_id", "merchant_id", "customer_id", "amount"]
    }

    @classmethod
    def process_csv(cls, dataset_type: str, csv_text: str) -> Dict[str, Any]:
        if dataset_type not in cls.REQUIRED_FIELDS:
            raise ValueError(f"Unsupported dataset type: {dataset_type}")

        reader = csv.DictReader(io.StringIO(csv_text))
        if not reader.fieldnames:
            raise ValueError("CSV file is empty or header is missing.")

        cleaned_headers = [h.strip().lower() for h in reader.fieldnames if h]
        missing = [req for req in cls.REQUIRED_FIELDS[dataset_type] if req not in cleaned_headers]

        if missing:
            raise ValueError(f"Missing required columns for {dataset_type}: {', '.join(missing)}")

        parsed_records = []
        valid_count = 0
        invalid_count = 0

        for row in reader:
            clean_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
            try:
                if dataset_type == "merchants":
                    m = Merchant(
                        merchant_id=clean_row.get("merchant_id", f"M-{valid_count+1}"),
                        merchant_name=clean_row.get("merchant_name", "Uploaded Merchant"),
                        category=clean_row.get("category", "general"),
                        payout_upi=clean_row.get("payout_upi", "uploaded@upi"),
                        payout_bank_account=clean_row.get("payout_bank_account", "BANK999"),
                        registered_device_id=clean_row.get("registered_device_id", "DEV_M_UP"),
                        registered_ip=clean_row.get("registered_ip", "10.0.0.1"),
                        address=clean_row.get("address", "Uploaded Address"),
                        city=clean_row.get("city", "Mumbai")
                    )
                    parsed_records.append(m)

                elif dataset_type == "customers":
                    c = Customer(
                        customer_id=clean_row.get("customer_id", f"C-{valid_count+1}"),
                        customer_name=clean_row.get("customer_name", "Uploaded Customer"),
                        upi_id=clean_row.get("upi_id", "cust@upi"),
                        device_id=clean_row.get("device_id", "DEV_C_UP"),
                        ip_address=clean_row.get("ip_address", "10.0.0.2"),
                        address=clean_row.get("address", "Uploaded Address"),
                        city=clean_row.get("city", "Mumbai")
                    )
                    parsed_records.append(c)

                elif dataset_type == "transactions":
                    raw_status = clean_row.get("status", "").upper()
                    raw_pay_status = clean_row.get("payment_status", "").upper()
                    raw_ref_status = clean_row.get("refund_status", "").upper()
                    refund_ratio_val = float(clean_row.get("refund_ratio", 0.0)) if clean_row.get("refund_ratio") else 0.0

                    # Determine payment and refund statuses with smart alias resolution
                    pay_status = raw_pay_status or ("SUCCESS" if raw_status != "FAILED" else "FAILED")
                    ref_status = raw_ref_status or ("REFUNDED" if raw_status == "REFUNDED" or refund_ratio_val > 0 else "NONE")

                    tx = Transaction(
                        transaction_id=clean_row.get("transaction_id", f"TX-{valid_count+1}"),
                        merchant_id=clean_row.get("merchant_id", "M001"),
                        customer_id=clean_row.get("customer_id", "C001"),
                        amount=float(clean_row.get("amount", 1000.0)),
                        timestamp=clean_row.get("timestamp", "2026-09-04T00:00:00Z"),
                        payment_status=pay_status,
                        refund_status=ref_status,
                        refund_timestamp=clean_row.get("refund_timestamp"),
                        device_id=clean_row.get("device_id", "DEV_TX"),
                        ip_address=clean_row.get("ip_address", "10.0.0.3"),
                        customer_upi=clean_row.get("customer_upi") or clean_row.get("payment_method", "tx@upi")
                    )
                    parsed_records.append(tx)

                valid_count += 1
            except Exception as e:
                logger.warning(f"Error parsing row {valid_count+invalid_count+1}: {e}")
                invalid_count += 1

        return {
            "dataset_type": dataset_type,
            "total_records": valid_count + invalid_count,
            "valid_records": valid_count,
            "invalid_records": invalid_count,
            "records": parsed_records
        }
