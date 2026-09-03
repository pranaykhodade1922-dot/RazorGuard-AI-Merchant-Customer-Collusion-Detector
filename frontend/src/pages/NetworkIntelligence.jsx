import React, { useState, useEffect } from 'react';
import {
  fetchNetworkOverview, fetchNetworkClusters, fetchRiskyRelationships,
  fetchEntityNetworkDetail, fetchEntityConnections, fetchShortestPath, fetchNetworkNodes, fetchNetworkEdges
} from '../api';
import NetworkGraphVisualizer from '../components/NetworkGraphVisualizer';
import { Network, ShieldAlert, Cpu, Search, Layers, Activity, ArrowRight, Share2, CornerDownRight } from 'lucide-react';

export default function NetworkIntelligence() {
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'clusters' | 'relationships' | 'explorer'

  // Data states
  const [overview, setOverview] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [riskyRels, setRiskyRels] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);

  // Entity Explorer states
  const [searchEntityId, setSearchEntityId] = useState('M089');
  const [entityDetail, setEntityDetail] = useState(null);
  const [entityGraph, setEntityGraph] = useState({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState(null);

  // Shortest Path state
  const [srcPathId, setSrcPathId] = useState('M089');
  const [tgtPathId, setTgtPathId] = useState('C002');
  const [pathResult, setPathResult] = useState(null);

  const loadNetworkData = async () => {
    setLoading(true);
    try {
      const [ov, cl, rr, nd, ed] = await Promise.all([
        fetchNetworkOverview(),
        fetchNetworkClusters(),
        fetchRiskyRelationships(),
        fetchNetworkNodes(),
        fetchNetworkEdges(),
      ]);
      setOverview(ov);
      setClusters(cl);
      setRiskyRels(rr);
      setNodes(nd);
      setEdges(ed);
    } catch (err) {
      console.error('Failed loading network intelligence data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNetworkData();
  }, []);

  const handleEntitySearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchEntityId.trim()) return;
    try {
      const [detail, conn] = await Promise.all([
        fetchEntityNetworkDetail(searchEntityId.trim()),
        fetchEntityConnections(searchEntityId.trim()),
      ]);
      setEntityDetail(detail);
      setEntityGraph(conn);
    } catch (err) {
      console.error(err);
      setEntityDetail(null);
    }
  };

  const handleFindPath = async (e) => {
    e.preventDefault();
    try {
      const pathData = await fetchShortestPath(srcPathId.trim(), tgtPathId.trim());
      setPathResult(pathData);
    } catch (err) {
      setPathResult(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={22} color="#6366f1" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Advanced Fraud Network Intelligence</h1>
            <span style={{ fontSize: '0.7rem', background: '#6366f1', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>PHASE 3</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Graph topology analysis, collusion pattern detection, and entity relationship mapping</p>
        </div>

        {/* Sub Navigation Tabs */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          {[
            { id: 'overview', label: 'Network Overview', icon: Activity },
            { id: 'clusters', label: `Fraud Clusters (${clusters.length})`, icon: Layers },
            { id: 'relationships', label: `Risky Relationships (${riskyRels.length})`, icon: Share2 },
            { id: 'explorer', label: 'Entity Explorer', icon: Search },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isActive ? '#6366f1' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textCenter: 'center', color: 'var(--text-muted)' }}>Calculating graph metrics and running network pattern engines...</div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeSubTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Network Overview Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="glass-panel" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Network Nodes</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '4px' }}>{overview?.total_nodes ?? 0}</div>
                  <div style={{ fontSize: '0.7rem', color: '#818cf8', marginTop: '2px' }}>{overview?.merchant_count} Merchants, {overview?.customer_count} Customers</div>
                </div>

                <div className="glass-panel" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Graph Edges</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '4px' }}>{overview?.total_edges ?? 0}</div>
                  <div style={{ fontSize: '0.7rem', color: '#2dd4bf', marginTop: '2px' }}>{overview?.transaction_count} Transaction Connections</div>
                </div>

                <div className="glass-panel" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Suspicious Relationships</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>{overview?.suspicious_relationships ?? 0}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>Score &ge; 60 or High Velocity</div>
                </div>

                <div className="glass-panel" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Critical Fraud Clusters</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f43f5e', marginTop: '4px' }}>{overview?.critical_clusters ?? 0}</div>
                  <div style={{ fontSize: '0.7rem', color: '#f43f5e', marginTop: '2px' }}>Multi-signal synergy rings</div>
                </div>
              </div>

              {/* Full Interactive Graph Visualization */}
              <NetworkGraphVisualizer
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNode?.id}
                onNodeSelect={(node) => {
                  setSelectedNode(node);
                  setSearchEntityId(node.id);
                }}
              />

              {/* Node Inspector Drawer if node clicked */}
              {selectedNode && (
                <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #6366f1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="badge badge-high">{selectedNode.type}</span>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginTop: '4px' }}>{selectedNode.label} ({selectedNode.id})</h3>
                    </div>
                    <button className="btn-primary btn-sm" onClick={() => { setActiveSubTab('explorer'); handleEntitySearch(); }}>
                      Explore Entity Connections <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FRAUD CLUSTERS */}
          {activeSubTab === 'clusters' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
              {clusters.map((cluster) => (
                <div key={cluster.cluster_id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`badge badge-${cluster.risk_level.toLowerCase()}`}>{cluster.risk_level} RISK</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: '800', color: cluster.risk_score >= 80 ? '#f43f5e' : '#f59e0b' }}>
                      {Math.round(cluster.risk_score)} / 100
                    </span>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Cluster ID: {cluster.cluster_id}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {cluster.merchants_count} Merchants • {cluster.customers_count} Customers • {cluster.transaction_count} Txs (₹{cluster.total_amount.toLocaleString()})
                    </div>
                  </div>

                  {/* Pattern Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {cluster.patterns.map((p, i) => (
                      <span key={i} style={{ fontSize: '0.7rem', fontWeight: '700', background: '#334155', color: '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>
                        {p}
                      </span>
                    ))}
                  </div>

                  {/* Primary Reasons */}
                  <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontWeight: '700', color: '#818cf8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Dynamic Evidence Reasons:</div>
                    {cluster.primary_reasons.map((r, idx) => (
                      <div key={idx} style={{ color: '#cbd5e1' }}>{r}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: RISKY RELATIONSHIPS */}
          {activeSubTab === 'relationships' && (
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px' }}>Source Entity</th>
                    <th style={{ padding: '12px 16px' }}>Relationship</th>
                    <th style={{ padding: '12px 16px' }}>Target Entity</th>
                    <th style={{ padding: '12px 16px' }}>Transactions</th>
                    <th style={{ padding: '12px 16px' }}>Total Amount</th>
                    <th style={{ padding: '12px 16px' }}>Risk Score</th>
                  </tr>
                </thead>
                <tbody>
                  {riskyRels.map((rel, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: '#818cf8' }}>{rel.source}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', background: rel.relationship.startsWith('SHARES_') ? 'rgba(244,63,94,0.15)' : '#334155', color: rel.relationship.startsWith('SHARES_') ? '#f43f5e' : '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>
                          {rel.relationship}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: '#2dd4bf' }}>{rel.target}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '600' }}>{rel.transaction_count}</td>
                      <td style={{ padding: '12px 16px' }}>₹{rel.total_amount.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '800', color: rel.risk_score >= 80 ? '#f43f5e' : '#f59e0b' }}>
                        {Math.round(rel.risk_score)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: ENTITY EXPLORER & SHORTEST PATH */}
          {activeSubTab === 'explorer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Entity Search Bar */}
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <form onSubmit={handleEntitySearch} style={{ display: 'flex', gap: '8px', flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Enter Merchant ID or Customer ID (e.g. M089, C002)..."
                    value={searchEntityId}
                    onChange={(e) => setSearchEntityId(e.target.value)}
                    style={{ flex: 1, background: 'var(--bg-card)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.9rem' }}
                  />
                  <button type="submit" className="btn-primary"><Search size={16} /> Inspect Entity</button>
                </form>

                {/* Shortest Path Form */}
                <form onSubmit={handleFindPath} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Path:</span>
                  <input
                    type="text"
                    value={srcPathId}
                    onChange={(e) => setSrcPathId(e.target.value)}
                    style={{ width: '80px', background: 'var(--bg-card)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.8rem' }}
                  />
                  <CornerDownRight size={14} color="#94a3b8" />
                  <input
                    type="text"
                    value={tgtPathId}
                    onChange={(e) => setTgtPathId(e.target.value)}
                    style={{ width: '80px', background: 'var(--bg-card)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.8rem' }}
                  />
                  <button type="submit" className="btn-secondary btn-sm">Find Path</button>
                </form>
              </div>

              {/* Shortest Path Result Banner if calculated */}
              {pathResult && (
                <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>Shortest Relationship Path ({pathResult.path_length} hops):</div>
                  <div style={{ fontSize: '0.9rem', color: '#ffffff', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {pathResult.nodes.map((n, i) => (
                      <React.Fragment key={i}>
                        <span style={{ fontWeight: '700', color: n.type === 'MERCHANT' ? '#818cf8' : '#2dd4bf' }}>{n.id} ({n.label})</span>
                        {i < pathResult.nodes.length - 1 && <span style={{ color: 'var(--text-dim)' }}>→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Entity Detail Dashboard & 1-Hop Graph */}
              {entityDetail ? (
                <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px' }}>
                  <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <span className={`badge badge-${entityDetail.risk_level.toLowerCase()}`}>{entityDetail.risk_level} RISK</span>
                      <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginTop: '6px' }}>{entityDetail.name}</h2>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {entityDetail.entity_id} • Type: {entityDetail.entity_type}</div>
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Max Risk Score:</span>
                        <span style={{ fontWeight: '800', color: '#f43f5e' }}>{Math.round(entityDetail.risk_score)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Connections:</span>
                        <span style={{ fontWeight: '700' }}>{entityDetail.connections_count}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Transactions:</span>
                        <span style={{ fontWeight: '700' }}>{entityDetail.transaction_count}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Total Amount:</span>
                        <span style={{ fontWeight: '700' }}>₹{entityDetail.total_amount.toLocaleString()}</span>
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px', color: '#818cf8' }}>Connected Entities:</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                        {entityDetail.connected_entities.map((ce, i) => (
                          <div key={i} style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontWeight: '700', color: ce.type === 'MERCHANT' ? '#818cf8' : '#2dd4bf' }}>{ce.name} ({ce.entity_id})</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{ce.relationship}</div>
                            </div>
                            <span style={{ fontWeight: '700', color: ce.risk_score >= 60 ? '#f43f5e' : 'var(--text-muted)' }}>{Math.round(ce.risk_score)} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 1-Hop Neighborhood Graph Visualizer */}
                  <div>
                    <NetworkGraphVisualizer
                      nodes={entityGraph.nodes}
                      edges={entityGraph.edges}
                      selectedNodeId={entityDetail.entity_id}
                    />
                  </div>
                </div>
              ) : (
                <div className="glass-panel" style={{ padding: '40px', textCenter: 'center', color: 'var(--text-muted)' }}>
                  Select or search an entity ID above to inspect its 1-hop network graph topology.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
