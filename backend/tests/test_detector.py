import pytest
from app.models.schemas import Merchant, Customer, Transaction
from app.detector.overlap_detector import OverlapDetector, calculate_string_similarity
from app.scoring.risk_scorer import RiskScorer


@pytest.fixture
def sample_merchant():
    return Merchant(
        merchant_id="M001",
        merchant_name="Synthetic Electronics 001",
        category="electronics",
        payout_upi="m001@synthetic",
        payout_bank_account="BANK001",
        registered_device_id="DEV_M001",
        registered_ip="10.0.1.1",
        address="100 MG Road, Bengaluru",
        city="Bengaluru"
    )


def test_string_similarity():
    assert calculate_string_similarity("100 MG Road, Bengaluru", "100 MG Road, Bengaluru") == 1.0
    assert calculate_string_similarity("100 MG Road", "100 MG Road Suite 5") > 0.70
    assert calculate_string_similarity("Apple Store", "Xylophone Quantum") < 0.30


def test_no_meaningful_overlap(sample_merchant):
    clean_customer = Customer(
        customer_id="C001",
        customer_name="John Doe",
        upi_id="john001@synthetic",
        device_id="DEV_C001",
        ip_address="10.1.1.1",
        address="999 Park Street, Kolkata",
        city="Kolkata"
    )

    transactions = [
        Transaction(
            transaction_id="TX001",
            merchant_id="M001",
            customer_id="C001",
            amount=500.0,
            timestamp="2026-01-01T10:00:00",
            payment_status="SUCCESS",
            refund_status="NONE",
            device_id="DEV_C001",
            ip_address="10.1.1.1",
            customer_upi="john001@synthetic"
        )
    ]

    detector = OverlapDetector()
    signals = detector.analyze_merchant_customer_pair(sample_merchant, clean_customer, transactions)

    assert not signals.shared_device
    assert not signals.shared_ip
    assert not signals.shared_payment_identity
    assert not signals.shared_city

    scorer = RiskScorer()
    res = scorer.calculate_risk("M001", "C001", signals)
    assert res.risk_level == "LOW"
    assert res.risk_score < 30.0


def test_single_weak_signal_does_not_trigger_critical(sample_merchant):
    # Only shared city
    city_customer = Customer(
        customer_id="C002",
        customer_name="Alice Smith",
        upi_id="alice002@synthetic",
        device_id="DEV_C002",
        ip_address="10.1.2.2",
        address="555 Indiranagar, Bengaluru",
        city="Bengaluru"
    )

    detector = OverlapDetector()
    signals = detector.analyze_merchant_customer_pair(sample_merchant, city_customer, [])

    scorer = RiskScorer()
    res = scorer.calculate_risk("M001", "C002", signals)
    assert res.risk_level != "CRITICAL"
    assert res.risk_level != "HIGH"
    assert res.risk_score < 30.0


def test_multiple_strong_signals_trigger_critical(sample_merchant):
    # Shared device + shared payment identity + shared IP
    collusive_customer = Customer(
        customer_id="C102",
        customer_name="Collusive Actor",
        upi_id="m001@synthetic",  # matches payout upi
        device_id="DEV_M001",     # matches merchant device
        ip_address="10.0.1.1",    # matches merchant ip
        address="100 MG Road, Bengaluru Suite 1",
        city="Bengaluru"
    )

    transactions = [
        Transaction(
            transaction_id=f"TX10{i}",
            merchant_id="M001",
            customer_id="C102",
            amount=5000.0,
            timestamp=f"2026-01-01T10:{i:02d}:00",
            payment_status="SUCCESS",
            refund_status="REFUNDED",
            refund_timestamp=f"2026-01-01T10:{i:02d}:30", # 30 second refund!
            device_id="DEV_M001",
            ip_address="10.0.1.1",
            customer_upi="m001@synthetic"
        ) for i in range(10)
    ]

    detector = OverlapDetector()
    signals = detector.analyze_merchant_customer_pair(sample_merchant, collusive_customer, transactions)

    assert signals.shared_device
    assert signals.shared_ip
    assert signals.shared_payment_identity
    assert signals.address_similarity > 0.80
    assert signals.refund_velocity_ratio > 100.0

    scorer = RiskScorer()
    res = scorer.calculate_risk("M001", "C102", signals)

    assert res.risk_level == "CRITICAL"
    assert res.risk_score >= 80.0
    assert len(res.evidence) >= 3
