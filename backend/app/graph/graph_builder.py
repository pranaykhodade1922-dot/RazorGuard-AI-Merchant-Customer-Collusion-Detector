import networkx as nx
from typing import List, Dict, Any, Set, Tuple, Optional
from collections import defaultdict

from app.models.schemas import (
    Merchant, Customer, Transaction, SuspiciousCase, RiskScoreResult,
    Case, GraphNode, GraphEdge, GraphResponse
)


class IdentityGraphBuilder:
    def __init__(self):
        self.graph = nx.Graph()

    def build_graph(
        self,
        merchants: List[Merchant],
        customers: List[Customer],
        transactions: List[Transaction]
    ) -> nx.Graph:
        self.graph.clear()

        # 1. Add Merchant nodes & their identity resources
        for m in merchants:
            m_node = f"MERCHANT:{m.merchant_id}"
            self.graph.add_node(m_node, node_type="merchant", name=m.merchant_name, entity_id=m.merchant_id)

            dev_node = f"DEVICE:{m.registered_device_id}"
            self.graph.add_node(dev_node, node_type="device", entity_id=m.registered_device_id)
            self.graph.add_edge(m_node, dev_node, relation="REGISTERED_DEVICE")

            ip_node = f"IP:{m.registered_ip}"
            self.graph.add_node(ip_node, node_type="ip", entity_id=m.registered_ip)
            self.graph.add_edge(m_node, ip_node, relation="REGISTERED_IP")

            pay_node = f"PAYMENT:{m.payout_upi}"
            self.graph.add_node(pay_node, node_type="payment_identity", entity_id=m.payout_upi)
            self.graph.add_edge(m_node, pay_node, relation="PAYOUT_UPI")

            addr_node = f"ADDRESS:{m.merchant_id}"
            self.graph.add_node(addr_node, node_type="address", entity_id=m.address)
            self.graph.add_edge(m_node, addr_node, relation="LOCATED_AT")

        # 2. Add Customer nodes & their identity resources
        for c in customers:
            c_node = f"CUSTOMER:{c.customer_id}"
            self.graph.add_node(c_node, node_type="customer", name=c.customer_name, entity_id=c.customer_id)

            dev_node = f"DEVICE:{c.device_id}"
            self.graph.add_node(dev_node, node_type="device", entity_id=c.device_id)
            self.graph.add_edge(c_node, dev_node, relation="USES_DEVICE")

            ip_node = f"IP:{c.ip_address}"
            self.graph.add_node(ip_node, node_type="ip", entity_id=c.ip_address)
            self.graph.add_edge(c_node, ip_node, relation="USES_IP")

            pay_node = f"PAYMENT:{c.upi_id}"
            self.graph.add_node(pay_node, node_type="payment_identity", entity_id=c.upi_id)
            self.graph.add_edge(c_node, pay_node, relation="USES_PAYMENT")

            addr_node = f"ADDRESS:{c.customer_id}"
            self.graph.add_node(addr_node, node_type="address", entity_id=c.address)
            self.graph.add_edge(c_node, addr_node, relation="LIVES_AT")

        # 3. Add Transaction edges
        for tx in transactions:
            m_node = f"MERCHANT:{tx.merchant_id}"
            c_node = f"CUSTOMER:{tx.customer_id}"
            if self.graph.has_node(m_node) and self.graph.has_node(c_node):
                if not self.graph.has_edge(m_node, c_node):
                    self.graph.add_edge(m_node, c_node, relation="TRANSACTED_WITH", tx_count=1)
                else:
                    self.graph[m_node][c_node]["tx_count"] += 1

        return self.graph

    def find_suspicious_rings(
        self,
        risk_results: List[RiskScoreResult],
        merchants: List[Merchant]
    ) -> List[SuspiciousCase]:
        # Filter for HIGH or CRITICAL risk pairs
        flagged_results = [r for r in risk_results if r.risk_level in ["HIGH", "CRITICAL"]]

        merchant_map = {m.merchant_id: m for m in merchants}
        merchant_cases: Dict[str, List[RiskScoreResult]] = defaultdict(list)

        for res in flagged_results:
            merchant_cases[res.merchant_id].append(res)

        suspicious_cases: List[SuspiciousCase] = []

        for m_id, results in merchant_cases.items():
            merchant_name = merchant_map[m_id].merchant_name if m_id in merchant_map else f"Merchant {m_id}"
            max_score = max(r.risk_score for r in results)

            if max_score >= 80.0:
                overall_level = "CRITICAL"
            elif max_score >= 60.0:
                overall_level = "HIGH"
            elif max_score >= 30.0:
                overall_level = "MEDIUM"
            else:
                overall_level = "LOW"

            connected_custs = sorted(list({r.customer_id for r in results}))

            # Extract distinct evidence items
            evidence_set = set()
            for r in results:
                for ev in r.evidence:
                    clean_ev = ev.split(" (+")[0]
                    evidence_set.add(clean_ev)

            case = SuspiciousCase(
                merchant_id=m_id,
                merchant_name=merchant_name,
                max_risk_score=max_score,
                risk_level=overall_level,
                connected_customers=connected_custs,
                collusive_ring_id=None,
                evidence_summary=sorted(list(evidence_set)),
                pair_details=results
            )
            suspicious_cases.append(case)

        # Sort by max risk score descending
        suspicious_cases.sort(key=lambda x: x.max_risk_score, reverse=True)
        return suspicious_cases

    def export_case_graph_json(
        self,
        case: Case,
        merchants: List[Merchant],
        customers: List[Customer],
        transactions: List[Transaction]
    ) -> GraphResponse:
        nodes_dict: Dict[str, GraphNode] = {}
        edges_list: List[GraphEdge] = []
        seen_edges: Set[Tuple[str, str, str]] = set()

        merchant_map = {m.merchant_id: m for m in merchants}
        customer_map = {c.customer_id: c for c in customers}

        m_id = case.merchant_id
        merchant = merchant_map.get(m_id)
        merchant_name = merchant.merchant_name if merchant else case.merchant_name

        # 1. Merchant node
        nodes_dict[m_id] = GraphNode(
            id=m_id,
            type="merchant",
            label=merchant_name,
            attributes={"category": merchant.category if merchant else "Unknown"}
        )

        # 2. Add merchant resources if available
        if merchant:
            dev_id = merchant.registered_device_id
            pay_id = merchant.payout_upi
            addr = merchant.address

            nodes_dict[dev_id] = GraphNode(id=dev_id, type="device", label=f"Device {dev_id}")
            nodes_dict[pay_id] = GraphNode(id=pay_id, type="payment_identity", label=f"Payment {pay_id}")
            
            addr_id = f"ADDR-{m_id}"
            nodes_dict[addr_id] = GraphNode(id=addr_id, type="address", label=f"Address: {addr}")

            edges_list.append(GraphEdge(source=m_id, target=dev_id, relationship="REGISTERED_DEVICE"))
            edges_list.append(GraphEdge(source=m_id, target=pay_id, relationship="REGISTERED_PAYMENT"))
            edges_list.append(GraphEdge(source=m_id, target=addr_id, relationship="REGISTERED_ADDRESS"))

        # 3. Connected Customers
        for c_id in case.customer_ids:
            customer = customer_map.get(c_id)
            c_name = customer.customer_name if customer else f"Customer {c_id}"

            nodes_dict[c_id] = GraphNode(
                id=c_id,
                type="customer",
                label=c_name
            )

            if customer:
                c_dev = customer.device_id
                c_pay = customer.upi_id
                c_addr_id = f"ADDR-{c_id}"

                nodes_dict[c_dev] = GraphNode(id=c_dev, type="device", label=f"Device {c_dev}")
                nodes_dict[c_pay] = GraphNode(id=c_pay, type="payment_identity", label=f"Payment {c_pay}")
                nodes_dict[c_addr_id] = GraphNode(id=c_addr_id, type="address", label=f"Address: {customer.address}")

                edges_list.append(GraphEdge(source=c_id, target=c_dev, relationship="USES_DEVICE"))
                edges_list.append(GraphEdge(source=c_id, target=c_pay, relationship="USES_PAYMENT"))
                edges_list.append(GraphEdge(source=c_id, target=c_addr_id, relationship="RESIDES_AT"))

                # Collusion direct edges
                if merchant:
                    if c_dev == merchant.registered_device_id:
                        edge_key = (m_id, c_id, "SHARES_DEVICE")
                        if edge_key not in seen_edges:
                            seen_edges.add(edge_key)
                            edges_list.append(GraphEdge(source=m_id, target=c_id, relationship="SHARES_DEVICE"))

                    if c_pay == merchant.payout_upi:
                        edge_key = (m_id, c_id, "SHARES_PAYMENT")
                        if edge_key not in seen_edges:
                            seen_edges.add(edge_key)
                            edges_list.append(GraphEdge(source=m_id, target=c_id, relationship="SHARES_PAYMENT"))

                    # Check address similarity
                    m_tokens = set(merchant.address.lower().split())
                    c_tokens = set(customer.address.lower().split())
                    if m_tokens and c_tokens:
                        jaccard = len(m_tokens.intersection(c_tokens)) / len(m_tokens.union(c_tokens))
                        if jaccard >= 0.8:
                            edge_key = (m_id, c_id, "SHARES_ADDRESS")
                            if edge_key not in seen_edges:
                                seen_edges.add(edge_key)
                                edges_list.append(GraphEdge(source=m_id, target=c_id, relationship="SHARES_ADDRESS"))

            # Direct transacted edge
            edge_key = (m_id, c_id, "TRANSACTED_WITH")
            if edge_key not in seen_edges:
                seen_edges.add(edge_key)
                edges_list.append(GraphEdge(source=m_id, target=c_id, relationship="TRANSACTED_WITH"))

        # 4. Relevant Transactions as nodes
        rel_txs = [tx for tx in transactions if tx.merchant_id == m_id and tx.customer_id in set(case.customer_ids)]
        for tx in rel_txs[:10]:  # Limit top 10 relevant txs for clean visualization
            tx_node_id = f"TX-{tx.transaction_id}"
            nodes_dict[tx_node_id] = GraphNode(
                id=tx_node_id,
                type="transaction",
                label=f"Tx {tx.transaction_id} (${tx.amount:.2f})"
            )
            edges_list.append(GraphEdge(source=tx.customer_id, target=tx_node_id, relationship="INITIATED_TX"))
            edges_list.append(GraphEdge(source=tx_node_id, target=m_id, relationship="PROCESSED_BY"))

        return GraphResponse(
            nodes=list(nodes_dict.values()),
            edges=edges_list
        )
