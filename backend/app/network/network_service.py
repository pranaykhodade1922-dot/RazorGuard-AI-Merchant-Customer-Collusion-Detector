from typing import List, Dict, Any, Set, Tuple, Optional
from collections import defaultdict
from datetime import datetime, timezone

from app.models.schemas import Merchant, Customer, Transaction, RiskScoreResult, Case
from app.network.network_models import (
    NetworkNode, NetworkEdge, CollusionPattern, NetworkCluster,
    EntityNetworkDetail, NetworkOverview, ShortestPathResponse
)
from app.network.network_rules import NetworkRulesConfig
from app.network.graph_service import NetworkGraphService
from app.network.pattern_detector import CollusionPatternDetector
from app.network.network_scoring import NetworkScorer
from app.cases.case_store import CaseStore
from app.services.firestore_store import FirestoreStore


class NetworkService:
    """
    Main Orchestrator Service for Advanced Fraud Network Intelligence.
    Links Graph Analysis, Pattern Detectors, Network Risk Scoring,
    and Phase 2 Case Management Store.
    """
    def __init__(self, store: Optional[CaseStore] = None, firestore_store: Optional[FirestoreStore] = None):
        self.store = store or CaseStore()
        self.firestore_store = firestore_store or FirestoreStore()
        self.graph_service = NetworkGraphService()
        self.pattern_detector = CollusionPatternDetector()
        self.scorer = NetworkScorer()

        self.cached_merchants: List[Merchant] = []
        self.cached_customers: List[Customer] = []
        self.cached_transactions: List[Transaction] = []
        self.cached_pair_risk: List[RiskScoreResult] = []
        self.cached_clusters: List[NetworkCluster] = []
        self.cached_patterns: List[CollusionPattern] = []

    def analyze_network(
        self,
        merchants: List[Merchant],
        customers: List[Customer],
        transactions: List[Transaction],
        pair_risk_results: Optional[List[RiskScoreResult]] = None
    ) -> Dict[str, Any]:
        self.cached_merchants = merchants
        self.cached_customers = customers
        self.cached_transactions = transactions
        self.cached_pair_risk = pair_risk_results or []

        # 1. Build Graph Topology
        self.graph_service.build_network_graph(merchants, customers, transactions, pair_risk_results)

        # 2. Detect Collusion Patterns
        patterns = self.pattern_detector.detect_all_patterns(
            self.graph_service, merchants, customers, transactions, self.cached_pair_risk
        )
        self.cached_patterns = patterns

        # 3. Group Entities & Patterns into Clusters
        clusters = self._build_network_clusters(patterns)
        self.cached_clusters = clusters

        # 4. Integrate Network Cases into Phase 2 CaseStore
        self._sync_network_cases(clusters)

        # 5. Persist Network Entities & Risky Relationships to Firestore Store
        try:
            nodes = [n for n in self.get_nodes() if n.type in ["MERCHANT", "CUSTOMER"] or n.risk_score > 0.0]
            for n in nodes[:100]:
                self.firestore_store.save_network_entity({
                    "entity_id": n.id,
                    "entity_type": n.type,
                    "risk_score": n.risk_score,
                    "risk_level": n.risk_level,
                    "metadata": n.attributes
                })

            risky_edges = [e for e in self.get_edges() if e.risk_score >= 60.0 or e.relationship.startswith("SHARES_")]
            for e in risky_edges[:100]:
                self.firestore_store.save_network_relationship(e.model_dump())
        except Exception:
            pass

        high_count = sum(1 for c in clusters if c.risk_level == "HIGH")
        critical_count = sum(1 for c in clusters if c.risk_level == "CRITICAL")

        return {
            "status": "success",
            "total_clusters": len(clusters),
            "high_risk_clusters": high_count,
            "critical_clusters": critical_count,
            "patterns_detected": len(patterns)
        }

    def _build_network_clusters(self, patterns: List[CollusionPattern]) -> List[NetworkCluster]:
        components = self.graph_service.get_connected_components()
        merchant_map = {m.merchant_id: m for m in self.cached_merchants}
        customer_map = {c.customer_id: c for c in self.cached_customers}

        clusters: List[NetworkCluster] = []

        for idx, comp in enumerate(components, start=1):
            comp_patterns = [
                p for p in patterns
                if any(e in comp or f"MERCHANT:{e}" in comp or f"CUSTOMER:{e}" in comp for e in p.entities_involved)
            ]

            if not comp_patterns:
                continue

            score, level, reasons = self.scorer.calculate_network_risk(comp_patterns)

            comp_merchants = [n.split("MERCHANT:")[1] for n in comp if n.startswith("MERCHANT:")]
            comp_customers = [n.split("CUSTOMER:")[1] for n in comp if n.startswith("CUSTOMER:")]

            # Compute transaction totals
            total_amt = 0.0
            tx_count = 0
            comp_m_set = set(comp_merchants)
            comp_c_set = set(comp_customers)
            if comp_m_set and comp_c_set:
                for tx in self.cached_transactions:
                    if tx.merchant_id in comp_m_set and tx.customer_id in comp_c_set:
                        total_amt += tx.amount
                        tx_count += 1

            # Extract subgraph nodes and edges
            sub_nodes: List[NetworkNode] = []
            for n in comp:
                attr = self.graph_service.graph.nodes[n]
                node_type = attr.get("entity_type", "UNKNOWN")
                node_id = attr.get("entity_id", n)
                label = attr.get("label", n)
                
                # Retrieve individual entity risk score
                node_score = score if node_type in ["MERCHANT", "CUSTOMER"] else 0.0
                sub_nodes.append(NetworkNode(
                    id=node_id,
                    type=node_type,
                    label=label,
                    risk_score=node_score,
                    risk_level=level,
                    attributes=attr
                ))

            sub_edges: List[NetworkEdge] = []
            sub_graph = self.graph_service.graph.subgraph(comp)
            for u, v, d in sub_graph.edges(data=True):
                u_id = sub_graph.nodes[u].get("entity_id", u)
                v_id = sub_graph.nodes[v].get("entity_id", v)
                sub_edges.append(NetworkEdge(
                    source=u_id,
                    target=v_id,
                    relationship=d.get("relationship", "CONNECTED"),
                    transaction_count=d.get("transaction_count", 0),
                    total_amount=d.get("total_amount", 0.0),
                    first_seen=d.get("first_seen"),
                    last_seen=d.get("last_seen"),
                    risk_score=d.get("risk_score", 0.0)
                ))

            cluster_id = f"CL-{idx:03d}"
            p_types = sorted(list({p.pattern_type for p in comp_patterns}))

            clusters.append(NetworkCluster(
                cluster_id=cluster_id,
                risk_score=score,
                risk_level=level,
                merchants_count=len(comp_merchants),
                customers_count=len(comp_customers),
                transaction_count=tx_count,
                total_amount=round(total_amt, 2),
                patterns=p_types,
                primary_reasons=reasons,
                nodes=sub_nodes,
                edges=sub_edges
            ))

        clusters.sort(key=lambda c: c.risk_score, reverse=True)
        return clusters

    def _sync_network_cases(self, clusters: List[NetworkCluster]):
        now_str = datetime.now(timezone.utc).isoformat()
        for cluster in clusters:
            if cluster.risk_level in ["HIGH", "CRITICAL"]:
                m_ids = sorted(list({n.id for n in cluster.nodes if n.type == "MERCHANT"}))
                primary_m_id = m_ids[0] if m_ids else f"NET-{cluster.cluster_id}"

                c_ids = sorted(list({n.id for n in cluster.nodes if n.type == "CUSTOMER"}))
                case_id = f"CASE-NET-{cluster.cluster_id}"

                existing = self.store.get_case(case_id)
                case_status = existing.status if existing else "NEW"
                created_at = existing.created_at if existing else now_str

                # Ensure merchant name lookup
                m_name = f"Network Cluster {cluster.cluster_id}"
                for m in self.cached_merchants:
                    if m.merchant_id in m_ids:
                        m_name = m.merchant_name
                        break

                case = Case(
                    case_id=case_id,
                    merchant_id=primary_m_id,
                    merchant_name=m_name,
                    customer_ids=c_ids,
                    risk_score=cluster.risk_score,
                    risk_level=cluster.risk_level,
                    status=case_status,
                    created_at=created_at,
                    updated_at=now_str,
                    evidence_summary=cluster.primary_reasons,
                    max_risk_score=cluster.risk_score,
                    connected_customers=c_ids,
                    investigator_notes=existing.investigator_notes if existing else []
                )
                self.store.save_case(case)

    def get_overview(self) -> NetworkOverview:
        g = self.graph_service.graph
        total_nodes = g.number_of_nodes()
        total_edges = g.number_of_edges()

        m_count = sum(1 for n, attr in g.nodes(data=True) if attr.get("entity_type") == "MERCHANT")
        c_count = sum(1 for n, attr in g.nodes(data=True) if attr.get("entity_type") == "CUSTOMER")
        tx_count = len(self.cached_transactions)

        suspicious_rels = sum(1 for u, v, d in g.edges(data=True) if d.get("risk_score", 0.0) >= 60.0)

        high_clusters = sum(1 for c in self.cached_clusters if c.risk_level == "HIGH")
        crit_clusters = sum(1 for c in self.cached_clusters if c.risk_level == "CRITICAL")

        return NetworkOverview(
            total_nodes=total_nodes,
            total_edges=total_edges,
            merchant_count=m_count,
            customer_count=c_count,
            transaction_count=tx_count,
            suspicious_relationships=suspicious_rels,
            high_risk_clusters=high_clusters,
            critical_clusters=crit_clusters
        )

    def get_nodes(self, entity_type: Optional[str] = None, min_risk_score: Optional[float] = None) -> List[NetworkNode]:
        nodes: List[NetworkNode] = []
        for n, attr in self.graph_service.graph.nodes(data=True):
            e_type = attr.get("entity_type", "UNKNOWN")
            e_id = attr.get("entity_id", n)
            label = attr.get("label", n)

            if entity_type and e_type.upper() != entity_type.upper():
                continue

            nodes.append(NetworkNode(
                id=e_id,
                type=e_type,
                label=label,
                attributes=attr
            ))
        return nodes

    def get_edges(self, relationship: Optional[str] = None, min_risk_score: Optional[float] = None) -> List[NetworkEdge]:
        edges: List[NetworkEdge] = []
        for u, v, d in self.graph_service.graph.edges(data=True):
            u_id = self.graph_service.graph.nodes[u].get("entity_id", u)
            v_id = self.graph_service.graph.nodes[v].get("entity_id", v)
            rel = d.get("relationship", "CONNECTED")
            risk = d.get("risk_score", 0.0)

            if relationship and rel.upper() != relationship.upper():
                continue
            if min_risk_score and risk < min_risk_score:
                continue

            edges.append(NetworkEdge(
                source=u_id,
                target=v_id,
                relationship=rel,
                transaction_count=d.get("transaction_count", 0),
                total_amount=d.get("total_amount", 0.0),
                first_seen=d.get("first_seen"),
                last_seen=d.get("last_seen"),
                risk_score=risk
            ))
        return edges

    def get_clusters(self) -> List[NetworkCluster]:
        return self.cached_clusters

    def get_risky_relationships(self) -> List[NetworkEdge]:
        all_edges = self.get_edges()
        risky = [e for e in all_edges if e.risk_score >= 60.0 or e.transaction_count >= 5]
        risky.sort(key=lambda e: e.risk_score, reverse=True)
        return risky

    def get_entity_detail(self, entity_id: str) -> Optional[EntityNetworkDetail]:
        g = self.graph_service.graph
        target_node = None
        for n, attr in g.nodes(data=True):
            if attr.get("entity_id") == entity_id or n == entity_id or n == f"MERCHANT:{entity_id}" or n == f"CUSTOMER:{entity_id}":
                target_node = n
                break

        if not target_node:
            return None

        attr = g.nodes[target_node]
        e_type = attr.get("entity_type", "UNKNOWN")
        name = attr.get("label", entity_id)

        neighbors = list(g.neighbors(target_node))
        tot_tx = 0
        tot_amt = 0.0
        suspicious_count = 0
        connected_entities = []

        for nbr in neighbors:
            nbr_attr = g.nodes[nbr]
            nbr_id = nbr_attr.get("entity_id", nbr)
            nbr_type = nbr_attr.get("entity_type", "UNKNOWN")
            nbr_name = nbr_attr.get("label", nbr)

            edge = g[target_node][nbr]
            tx_c = edge.get("transaction_count", 0)
            amt = edge.get("total_amount", 0.0)
            risk = edge.get("risk_score", 0.0)

            tot_tx += tx_c
            tot_amt += amt
            if risk >= 60.0:
                suspicious_count += 1

            connected_entities.append({
                "entity_id": nbr_id,
                "type": nbr_type,
                "name": nbr_name,
                "relationship": edge.get("relationship", "CONNECTED"),
                "transaction_count": tx_c,
                "total_amount": round(amt, 2),
                "risk_score": risk
            })

        # Patterns involving this entity
        entity_patterns = [
            p.pattern_type for p in self.cached_patterns if entity_id in p.entities_involved
        ]

        max_risk = max([c["risk_score"] for c in connected_entities], default=0.0)
        level = "CRITICAL" if max_risk >= 80 else ("HIGH" if max_risk >= 60 else ("MEDIUM" if max_risk >= 30 else "LOW"))

        return EntityNetworkDetail(
            entity_id=entity_id,
            entity_type=e_type,
            name=name,
            risk_score=max_risk,
            risk_level=level,
            connections_count=len(neighbors),
            transaction_count=tot_tx,
            total_amount=round(tot_amt, 2),
            suspicious_relationships_count=suspicious_count,
            patterns=sorted(list(set(entity_patterns))),
            connected_entities=connected_entities
        )

    def get_entity_connections(self, entity_id: str) -> Dict[str, Any]:
        g = self.graph_service.graph
        target_node = None
        for n, attr in g.nodes(data=True):
            if attr.get("entity_id") == entity_id or n == entity_id or n == f"MERCHANT:{entity_id}" or n == f"CUSTOMER:{entity_id}":
                target_node = n
                break

        if not target_node:
            return {"nodes": [], "edges": []}

        # 1-hop neighborhood
        sub_nodes_set = {target_node}.union(set(g.neighbors(target_node)))
        sub = g.subgraph(sub_nodes_set)

        nodes: List[NetworkNode] = []
        for n in sub.nodes:
            attr = g.nodes[n]
            nodes.append(NetworkNode(
                id=attr.get("entity_id", n),
                type=attr.get("entity_type", "UNKNOWN"),
                label=attr.get("label", n),
                attributes=attr
            ))

        edges: List[NetworkEdge] = []
        for u, v, d in sub.edges(data=True):
            edges.append(NetworkEdge(
                source=g.nodes[u].get("entity_id", u),
                target=g.nodes[v].get("entity_id", v),
                relationship=d.get("relationship", "CONNECTED"),
                transaction_count=d.get("transaction_count", 0),
                total_amount=d.get("total_amount", 0.0),
                risk_score=d.get("risk_score", 0.0)
            ))

        return {"nodes": [n.model_dump() for n in nodes], "edges": [e.model_dump() for e in edges]}

    def get_shortest_path(self, source_id: str, target_id: str) -> Optional[ShortestPathResponse]:
        path_nodes = self.graph_service.find_shortest_path(source_id, target_id)
        if not path_nodes:
            return None

        g = self.graph_service.graph
        nodes: List[NetworkNode] = []
        for n in path_nodes:
            attr = g.nodes[n]
            nodes.append(NetworkNode(
                id=attr.get("entity_id", n),
                type=attr.get("entity_type", "UNKNOWN"),
                label=attr.get("label", n),
                attributes=attr
            ))

        edges: List[NetworkEdge] = []
        for i in range(len(path_nodes) - 1):
            u = path_nodes[i]
            v = path_nodes[i + 1]
            d = g[u][v]
            edges.append(NetworkEdge(
                source=g.nodes[u].get("entity_id", u),
                target=g.nodes[v].get("entity_id", v),
                relationship=d.get("relationship", "CONNECTED"),
                transaction_count=d.get("transaction_count", 0),
                total_amount=d.get("total_amount", 0.0),
                risk_score=d.get("risk_score", 0.0)
            ))

        return ShortestPathResponse(
            source_id=source_id,
            target_id=target_id,
            path_length=len(path_nodes) - 1,
            nodes=nodes,
            edges=edges
        )
