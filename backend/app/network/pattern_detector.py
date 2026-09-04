from typing import List, Dict, Set, Tuple, Any, Optional
from datetime import datetime, timezone
import networkx as nx
from collections import defaultdict

from app.models.schemas import Merchant, Customer, Transaction, RiskScoreResult
from app.network.network_models import CollusionPattern
from app.network.network_rules import NetworkRulesConfig
from app.network.graph_service import NetworkGraphService


class CollusionPatternDetector:
    """
    Deterministic Collusion Pattern Detector implementing 6 network-level rules.
    100% Rule-based & explainable (No ML / No LLM).
    """
    def __init__(self, config: Optional[NetworkRulesConfig] = None):
        self.config = config or NetworkRulesConfig()

    def detect_all_patterns(
        self,
        graph_service: NetworkGraphService,
        merchants: List[Merchant],
        customers: List[Customer],
        transactions: List[Transaction],
        pair_risk_results: List[RiskScoreResult]
    ) -> List[CollusionPattern]:
        detected_patterns: List[CollusionPattern] = []

        # 1. Pattern A: Shared Customer Cluster
        patterns_a = self._detect_shared_customer_clusters(graph_service, merchants, customers)
        detected_patterns.extend(patterns_a)

        # 2. Pattern B: Circular Relationship
        patterns_b = self._detect_circular_relationships(graph_service, merchants, customers)
        detected_patterns.extend(patterns_b)

        # 3. Pattern C: Dense Collusion Cluster
        patterns_c = self._detect_dense_clusters(graph_service)
        detected_patterns.extend(patterns_c)

        # 4. Pattern D: Shared Fingerprints (Device, Payment, IP)
        patterns_d = self._detect_shared_fingerprints(merchants, customers)
        detected_patterns.extend(patterns_d)

        # 5. Pattern E: Coordinated Transaction Burst
        patterns_e = self._detect_coordinated_bursts(transactions)
        detected_patterns.extend(patterns_e)

        # 6. Pattern F: Repeated Risky Relationship
        patterns_f = self._detect_repeated_risky_relationships(pair_risk_results, graph_service)
        detected_patterns.extend(patterns_f)

        return detected_patterns

    def _detect_shared_customer_clusters(
        self,
        graph_service: NetworkGraphService,
        merchants: List[Merchant],
        customers: List[Customer]
    ) -> List[CollusionPattern]:
        patterns = []

        # Map each merchant to set of connected customer IDs
        merchant_customers: Dict[str, Set[str]] = defaultdict(set)
        for m in merchants:
            m_node = f"MERCHANT:{m.merchant_id}"
            if graph_service.graph.has_node(m_node):
                for neighbor in graph_service.graph.neighbors(m_node):
                    if neighbor.startswith("CUSTOMER:"):
                        c_id = neighbor.split("CUSTOMER:")[1]
                        merchant_customers[m.merchant_id].add(c_id)

        # Find merchant pairs sharing >= 2 customers
        merchant_ids = list(merchant_customers.keys())
        for i in range(len(merchant_ids)):
            for j in range(i + 1, len(merchant_ids)):
                m1 = merchant_ids[i]
                m2 = merchant_ids[j]
                common_custs = merchant_customers[m1].intersection(merchant_customers[m2])

                if len(common_custs) >= self.config.shared_customer_min_customers:
                    entities = [m1, m2] + sorted(list(common_custs))
                    patterns.append(CollusionPattern(
                        pattern_type="SHARED_CUSTOMER_CLUSTER",
                        severity="HIGH" if len(common_custs) >= 3 else "MEDIUM",
                        score_contribution=self.config.shared_customer_weight,
                        entities_involved=entities,
                        description=f"Merchants {m1} and {m2} repeatedly transact with the same {len(common_custs)} customers ({', '.join(sorted(list(common_custs)))}).",
                        details={
                            "merchants": [m1, m2],
                            "shared_customers": sorted(list(common_custs)),
                            "count": len(common_custs)
                        }
                    ))
        return patterns

    def _detect_circular_relationships(
        self,
        graph_service: NetworkGraphService,
        merchants: List[Merchant],
        customers: List[Customer]
    ) -> List[CollusionPattern]:
        patterns = []
        g = graph_service.graph

        # Extract merchant & customer subgraph with edges having multiple transactions or high risk
        mc_nodes = [n for n in g.nodes if n.startswith("MERCHANT:") or n.startswith("CUSTOMER:")]
        
        # Filter to edges with at least 2 transactions or non-zero risk score for cycle detection
        risky_mc_edges = [
            (u, v) for u, v, d in g.subgraph(mc_nodes).edges(data=True)
            if d.get("transaction_count", 0) >= 2 or d.get("risk_score", 0.0) >= 40.0
        ]
        
        if not risky_mc_edges:
            return patterns

        sub = g.edge_subgraph(risky_mc_edges)

        try:
            cycles = nx.cycle_basis(sub)
            for cycle in cycles:
                if len(cycle) >= 4:  # At least 2 merchants and 2 customers
                    entity_ids = [n.split(":", 1)[1] for n in cycle if ":" in n]
                    patterns.append(CollusionPattern(
                        pattern_type="CIRCULAR_RELATIONSHIP",
                        severity="CRITICAL",
                        score_contribution=self.config.circular_relationship_weight,
                        entities_involved=entity_ids,
                        description=f"Closed circular transaction loop detected between entities ({' → '.join(entity_ids)}).",
                        details={"cycle_length": len(cycle), "cycle": entity_ids}
                    ))
        except Exception:
            pass

        return patterns

    def _detect_dense_clusters(
        self,
        graph_service: NetworkGraphService
    ) -> List[CollusionPattern]:
        patterns = []
        components = graph_service.get_connected_components()

        for idx, comp in enumerate(components):
            mc_nodes = {n for n in comp if n.startswith("MERCHANT:") or n.startswith("CUSTOMER:")}
            if len(mc_nodes) >= self.config.dense_cluster_min_nodes:
                density = graph_service.get_subgraph_density(mc_nodes)
                if density >= self.config.dense_cluster_min_density:
                    entities = sorted([n.split(":", 1)[1] for n in mc_nodes])
                    patterns.append(CollusionPattern(
                        pattern_type="DENSE_COLLUSION_CLUSTER",
                        severity="CRITICAL" if density >= 0.6 else "HIGH",
                        score_contribution=self.config.dense_cluster_weight,
                        entities_involved=entities,
                        description=f"Unusually dense collusion cluster (density: {density:.2f}) connecting {len(entities)} entities.",
                        details={"density": round(density, 3), "node_count": len(entities)}
                    ))
        return patterns

    def _detect_shared_fingerprints(
        self,
        merchants: List[Merchant],
        customers: List[Customer]
    ) -> List[CollusionPattern]:
        patterns = []

        # Shared Device
        dev_map: Dict[str, Set[str]] = defaultdict(set)
        for m in merchants:
            dev_map[m.registered_device_id].add(f"Merchant {m.merchant_id}")
        for c in customers:
            dev_map[c.device_id].add(f"Customer {c.customer_id}")

        for dev_id, entities in dev_map.items():
            if len(entities) >= 2:
                # Check if it connects merchant & customer or multiple merchants
                m_count = sum(1 for e in entities if e.startswith("Merchant"))
                c_count = sum(1 for e in entities if e.startswith("Customer"))
                if m_count >= 1 and (c_count >= 1 or m_count >= 2):
                    ent_list = sorted(list(entities))
                    raw_ids = [e.split()[1] for e in ent_list]
                    patterns.append(CollusionPattern(
                        pattern_type="SHARED_DEVICE",
                        severity="CRITICAL" if m_count >= 2 or len(entities) >= 3 else "HIGH",
                        score_contribution=self.config.shared_device_weight,
                        entities_involved=raw_ids,
                        description=f"Shared device fingerprint ({dev_id}) used by {', '.join(ent_list)}.",
                        details={"device_id": dev_id, "entities": ent_list}
                    ))

        # Shared Payment Identity
        pay_map: Dict[str, Set[str]] = defaultdict(set)
        for m in merchants:
            pay_map[m.payout_upi].add(f"Merchant {m.merchant_id}")
        for c in customers:
            pay_map[c.upi_id].add(f"Customer {c.customer_id}")

        for pay_id, entities in pay_map.items():
            if len(entities) >= 2:
                m_count = sum(1 for e in entities if e.startswith("Merchant"))
                if m_count >= 1:
                    ent_list = sorted(list(entities))
                    raw_ids = [e.split()[1] for e in ent_list]
                    patterns.append(CollusionPattern(
                        pattern_type="SHARED_PAYMENT_FINGERPRINT",
                        severity="CRITICAL",
                        score_contribution=self.config.shared_payment_weight,
                        entities_involved=raw_ids,
                        description=f"Shared payment/payout destination ({pay_id}) linked across {', '.join(ent_list)}.",
                        details={"payment_id": pay_id, "entities": ent_list}
                    ))

        # Shared IP Address
        ip_map: Dict[str, Set[str]] = defaultdict(set)
        for m in merchants:
            ip_map[m.registered_ip].add(f"Merchant {m.merchant_id}")
        for c in customers:
            ip_map[c.ip_address].add(f"Customer {c.customer_id}")

        for ip_addr, entities in ip_map.items():
            if len(entities) >= 3:  # Higher threshold for IP
                ent_list = sorted(list(entities))
                raw_ids = [e.split()[1] for e in ent_list]
                patterns.append(CollusionPattern(
                    pattern_type="SHARED_IP",
                    severity="MEDIUM",
                    score_contribution=self.config.shared_ip_weight,
                    entities_involved=raw_ids,
                    description=f"Shared network IP address ({ip_addr}) shared across {len(entities)} entities.",
                    details={"ip_address": ip_addr, "entities": ent_list}
                ))

        return patterns

    def _detect_coordinated_bursts(
        self,
        transactions: List[Transaction]
    ) -> List[CollusionPattern]:
        patterns = []
        if not transactions:
            return patterns

        # Group transactions by merchant
        m_txs: Dict[str, List[Transaction]] = defaultdict(list)
        for tx in transactions:
            m_txs[tx.merchant_id].append(tx)

        for m_id, tx_list in m_txs.items():
            if len(tx_list) < self.config.burst_min_tx_count:
                continue

            # Sort txs by timestamp
            sorted_txs = sorted(tx_list, key=lambda t: t.timestamp)
            for i in range(len(sorted_txs) - self.config.burst_min_tx_count + 1):
                window = sorted_txs[i:i + self.config.burst_min_tx_count]
                try:
                    t1 = datetime.fromisoformat(window[0].timestamp)
                    t2 = datetime.fromisoformat(window[-1].timestamp)
                    diff_mins = (t2 - t1).total_seconds() / 60.0

                    if diff_mins <= self.config.burst_window_minutes:
                        cust_ids = sorted(list({t.customer_id for t in window}))
                        if len(cust_ids) >= 2:  # Coordinated across multiple customers
                            entities = [m_id] + cust_ids
                            patterns.append(CollusionPattern(
                                pattern_type="COORDINATED_TRANSACTION_BURST",
                                severity="HIGH",
                                score_contribution=self.config.burst_weight,
                                entities_involved=entities,
                                description=f"Coordinated burst of {len(window)} transactions detected within {diff_mins:.1f} minutes for Merchant {m_id}.",
                                details={"merchant_id": m_id, "window_minutes": round(diff_mins, 1), "tx_count": len(window)}
                            ))
                            break  # Report one burst per merchant window
                except Exception:
                    pass

        return patterns

    def _detect_repeated_risky_relationships(
        self,
        pair_risk_results: List[RiskScoreResult],
        graph_service: NetworkGraphService
    ) -> List[CollusionPattern]:
        patterns = []
        if not pair_risk_results:
            return patterns

        for res in pair_risk_results:
            if res.risk_score >= 60.0:
                m_node = f"MERCHANT:{res.merchant_id}"
                c_node = f"CUSTOMER:{res.customer_id}"
                if graph_service.graph.has_edge(m_node, c_node):
                    tx_count = graph_service.graph[m_node][c_node]["transaction_count"]
                    if tx_count >= self.config.repeated_risk_min_tx_count:
                        patterns.append(CollusionPattern(
                            pattern_type="REPEATED_RISKY_RELATIONSHIP",
                            severity="HIGH",
                            score_contribution=self.config.repeated_risk_weight,
                            entities_involved=[res.merchant_id, res.customer_id],
                            description=f"Repeated risky transactions ({tx_count} txs, risk score {int(res.risk_score)}) between Merchant {res.merchant_id} and Customer {res.customer_id}.",
                            details={"merchant_id": res.merchant_id, "customer_id": res.customer_id, "tx_count": tx_count, "pair_score": res.risk_score}
                        ))
        return patterns
