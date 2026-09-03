import pytest
from app.data.generator import SyntheticDataGenerator, SEED


def test_generator_output_counts_and_uniqueness():
    gen = SyntheticDataGenerator(seed=SEED)
    merchants, customers, transactions, ground_truth = gen.generate_all()

    # Check entity counts
    assert len(merchants) == 100
    assert len(customers) == 500
    assert 3000 <= len(transactions) <= 5000
    assert len(ground_truth) > 0

    # Check ID uniqueness
    m_ids = [m.merchant_id for m in merchants]
    assert len(m_ids) == len(set(m_ids))

    c_ids = [c.customer_id for c in customers]
    assert len(c_ids) == len(set(c_ids))

    tx_ids = [t.transaction_id for t in transactions]
    assert len(tx_ids) == len(set(tx_ids))


def test_generator_seed_reproducibility():
    gen1 = SyntheticDataGenerator(seed=42)
    m1, c1, t1, gt1 = gen1.generate_all()

    gen2 = SyntheticDataGenerator(seed=42)
    m2, c2, t2, gt2 = gen2.generate_all()

    assert [m.merchant_id for m in m1] == [m.merchant_id for m in m2]
    assert [c.customer_id for c in c1] == [c.customer_id for c in c2]
    assert len(t1) == len(t2)
    assert [(gt.merchant_id, gt.customer_id) for gt in gt1] == [(gt.merchant_id, gt.customer_id) for gt in gt2]


def test_ground_truth_rings():
    gen = SyntheticDataGenerator(seed=SEED)
    _, _, _, ground_truth = gen.generate_all()

    collusive_items = [gt for gt in ground_truth if gt.is_collusive]
    assert len(collusive_items) > 0

    ring_ids = {gt.ring_id for gt in collusive_items}
    assert len(ring_ids) >= 4
