import networkx as nx
from typing import List, Dict, Any, Set, Tuple, Optional
from collections import defaultdict

from app.models.schemas import Merchant, Customer, Transaction, RiskScoreResult
from app.network.network_models import NetworkNode, NetworkEdge


class NetworkGraphService:
    """
    Dedicated Graph Service building a multi-relational network topology
    and performing topological network computations.
    """
    def __init__(self):
        self.graph = nx.Graph()

    def build_network_graph(
        self,
        merchants: List[Merchant],
        customers: List[Customer],
        transactions: List[Transaction],
        pair_risk_results: Optional[List[RiskScoreResult]] = None
    ) -> nx.Graph:
        self.graph.clear()

        merchant_map = {m.merchant_id: m for m in merchants}
        customer_map = {c.customer_id: c for c in customers}

        pair_risk_map: Dict[Tuple[str, str], RiskScoreResult] = {}
        if pair_risk_results:
            for r in pair_risk_results:
                pair_risk_map[(r.merchant_id, r.customer_id)] = r

        # 1. Add Merchant nodes
        for m in merchants:
            m_node = f"MERCHANT:{m.merchant_id}"
            self.graph.add_node(
                m_node,
                entity_id=m.merchant_id,
                entity_type="MERCHANT",
                label=m.merchant_name,
                category=m.category,
                device_id=m.registered_device_id,
                payment_id=m.payout_upi,
                ip_address=m.registered_ip,
                address=m.address,
                city=m.city
            )

        # 2. Add Customer nodes
        for c in customers:
            c_node = f"CUSTOMER:{c.customer_id}"
            self.graph.add_node(
                c_node,
                entity_id=c.customer_id,
                entity_type="CUSTOMER",
                label=c.customer_name,
                device_id=c.device_id,
                payment_id=c.upi_id,
                ip_address=c.ip_address,
                address=c.address,
                city=c.city
            )

        # 3. Add Shared Resource Nodes (Device, Payment, IP)
        for m in merchants:
            dev_node = f"DEVICE:{m.registered_device_id}"
            if not self.graph.has_node(dev_node):
                self.graph.add_node(dev_node, entity_id=m.registered_device_id, entity_type="DEVICE", label=f"Device {m.registered_device_id[:8]}")
            self.graph.add_edge(f"MERCHANT:{m.merchant_id}", dev_node, relationship="REGISTERED_DEVICE")

            pay_node = f"PAYMENT:{m.payout_upi}"
            if not self.graph.has_node(pay_node):
                self.graph.add_node(pay_node, entity_id=m.payout_upi, entity_type="PAYMENT_FINGERPRINT", label=f"Payment {m.payout_upi}")
            self.graph.add_edge(f"MERCHANT:{m.merchant_id}", pay_node, relationship="PAYOUT_IDENTITY")

            ip_node = f"IP:{m.registered_ip}"
            if not self.graph.has_node(ip_node):
                self.graph.add_node(ip_node, entity_id=m.registered_ip, entity_type="IP", label=f"IP {m.registered_ip}")
            self.graph.add_edge(f"MERCHANT:{m.merchant_id}", ip_node, relationship="REGISTERED_IP")

        for c in customers:
            dev_node = f"DEVICE:{c.device_id}"
            if not self.graph.has_node(dev_node):
                self.graph.add_node(dev_node, entity_id=c.device_id, entity_type="DEVICE", label=f"Device {c.device_id[:8]}")
            self.graph.add_edge(f"CUSTOMER:{c.customer_id}", dev_node, relationship="USES_DEVICE")

            pay_node = f"PAYMENT:{c.upi_id}"
            if not self.graph.has_node(pay_node):
                self.graph.add_node(pay_node, entity_id=c.upi_id, entity_type="PAYMENT_FINGERPRINT", label=f"Payment {c.upi_id}")
            self.graph.add_edge(f"CUSTOMER:{c.customer_id}", pay_node, relationship="USES_PAYMENT")

            ip_node = f"IP:{c.ip_address}"
            if not self.graph.has_node(ip_node):
                self.graph.add_node(ip_node, entity_id=c.ip_address, entity_type="IP", label=f"IP {c.ip_address}")
            self.graph.add_edge(f"CUSTOMER:{c.customer_id}", ip_node, relationship="USES_IP")

        # 4. Add Transaction Relationships
        for tx in transactions:
            m_node = f"MERCHANT:{tx.merchant_id}"
            c_node = f"CUSTOMER:{tx.customer_id}"

            if self.graph.has_node(m_node) and self.graph.has_node(c_node):
                pair_res = pair_risk_map.get((tx.merchant_id, tx.customer_id))
                risk_score = pair_res.risk_score if pair_res else 0.0

                if not self.graph.has_edge(m_node, c_node):
                    self.graph.add_edge(
                        m_node,
                        c_node,
                        relationship="TRANSACTED_WITH",
                        transaction_count=1,
                        total_amount=tx.amount,
                        first_seen=tx.timestamp,
                        last_seen=tx.timestamp,
                        risk_score=risk_score,
                        timestamps=[tx.timestamp],
                        refund_count=1 if tx.refund_status == "REFUNDED" else 0
                    )
                else:
                    edge = self.graph[m_node][c_node]
                    edge["transaction_count"] += 1
                    edge["total_amount"] += tx.amount
                    edge["last_seen"] = max(edge["last_seen"], tx.timestamp)
                    edge["first_seen"] = min(edge["first_seen"], tx.timestamp)
                    edge["timestamps"].append(tx.timestamp)
                    if tx.refund_status == "REFUNDED":
                        edge["refund_count"] += 1
                    if risk_score > edge["risk_score"]:
                        edge["risk_score"] = risk_score

        return self.graph

    def get_connected_components(self) -> List[Set[str]]:
        return list(nx.connected_components(self.graph))

    def get_subgraph_density(self, node_set: Set[str]) -> float:
        if len(node_set) <= 1:
            return 0.0
        sub = self.graph.subgraph(node_set)
        return float(nx.density(sub))

    def find_shortest_path(self, source_id: str, target_id: str) -> Optional[List[str]]:
        src_nodes = [n for n, attr in self.graph.nodes(data=True) if attr.get("entity_id") == source_id or n == source_id]
        tgt_nodes = [n for n, attr in self.graph.nodes(data=True) if attr.get("entity_id") == target_id or n == target_id]

        if not src_nodes or not tgt_nodes:
            return None

        src = src_nodes[0]
        tgt = tgt_nodes[0]

        try:
            path = nx.shortest_path(self.graph, source=src, target=tgt)
            return path
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return None

    def calculate_entity_degree(self, node_key: str) -> int:
        if self.graph.has_node(node_key):
            return self.graph.degree[node_key]
        return 0

    def calculate_transaction_concentration(self, merchant_id: str, customer_id: str) -> float:
        m_node = f"MERCHANT:{merchant_id}"
        c_node = f"CUSTOMER:{customer_id}"

        if not self.graph.has_edge(m_node, c_node):
            return 0.0

        pair_tx_count = self.graph[m_node][c_node]["transaction_count"]

        # Calculate total tx count for customer across all merchants
        tot_cust_tx = 0
        for neighbor in self.graph.neighbors(c_node):
            if self.graph.has_edge(neighbor, c_node) and self.graph[neighbor][c_node].get("relationship") == "TRANSACTED_WITH":
                tot_cust_tx += self.graph[neighbor][c_node]["transaction_count"]

        if tot_cust_tx == 0:
            return 0.0
        return round(pair_tx_count / tot_cust_tx, 4)
