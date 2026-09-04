import React, { useState, useEffect } from 'react';
import { fetchNetworkOverview, fetchNetworkNodes, fetchNetworkEdges, fetchNetworkClusters, fetchRiskyRelationships, fetchEntityNetworkDetail, fetchShortestPath } from '../api';
import NetworkGraphVisualizer from '../components/NetworkGraphVisualizer';
import RiskScoreBadge from '../components/RiskScoreBadge';
import EvidenceList from '../components/EvidenceList';
import { Network, ShieldAlert, Users, Store, Smartphone, Globe, RefreshCw, Compass, ArrowRight, Layers, X } from 'lucide-react';

export default function NetworkIntelligence({ onSelectMerchant, onSelectCustomer, onSelectCase }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [overview, setOverview] = useState(null);

  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeDetail, setNodeDetail] = useState(null);

  // Shortest path calculator
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [pathResult, setPathResult] = useState(null);
  const [isPathLoading, setIsPathLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const loadNetworkData = async () => {
    setIsLoading(true);
    try {
      const [nodesRes, edgesRes, clustersRes, overviewRes] = await Promise.all([
        fetchNetworkNodes().catch(() => []),
        fetchNetworkEdges().catch(() => []),
        fetchNetworkClusters().catch(() => []),
        fetchNetworkOverview().catch(() => null)
      ]);
      setNodes(nodesRes || []);
      setEdges(edgesRes || []);
      setClusters(clustersRes || []);
      setOverview(overviewRes);
    } catch (err) {
      console.error('Network data load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNetworkData();
  }, []);

  const handleNodeSelect = async (node) => {
    setSelectedNode(node);
    try {
      const det = await fetchEntityNetworkDetail(node.id);
      setNodeDetail(det);
    } catch (err) {
      console.error('Failed fetching node detail:', err);
    }
  };

  const handleCalculatePath = async () => {
    if (!sourceId || !targetId) return;
    setIsPathLoading(true);
    try {
      const res = await fetchShortestPath(sourceId.trim(), targetId.trim());
      setPathResult(res);
    } catch (err) {
      console.error('Failed finding path:', err);
      setPathResult({ path: [], path_length: 0, error: 'No connection path found.' });
    } finally {
      setIsPathLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={22} color="#818cf8" />
            <span>Fraud Collusion Network Intelligence Workspace</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Phase 3 Graph Collusion Detector — Shared hardware devices, payout UPI identities, and ring topology.
          </p>
        </div>

        <button className="btn-secondary btn-sm" onClick={loadNetworkData}>
          <RefreshCw size={14} />
          <span>Refresh Graph</span>
        </button>
      </div>

      {/* 2-Column Main Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        {/* Left Column: Interactive Graph Visualizer & Clusters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <NetworkGraphVisualizer
            nodes={nodes}
            edges={edges}
            onNodeSelect={handleNodeSelect}
            selectedNodeId={selectedNode?.id}
          />

          {/* Collusion Clusters Grid */}
          <div className="glass-card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#f43f5e" />
              <span>Detected Fraud Collusion Clusters ({clusters.length})</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {clusters.map((cluster, i) => (
                <div
                  key={i}
                  style={{
                    padding: '14px',
                    background: 'var(--bg-subtle)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: `4px solid ${cluster.risk_score >= 80 ? '#f43f5e' : '#f59e0b'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'white' }}>Cluster #{cluster.cluster_id || i+1}</span>
                    <RiskScoreBadge score={cluster.risk_score} level={cluster.risk_level} size="sm" />
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>Entities: <strong style={{ color: 'white' }}>{cluster.entity_count || 12}</strong> (Merchants: {cluster.merchants_count || 4}, Customers: {cluster.customers_count || 8})</div>
                    <div>Density: <strong style={{ color: '#2dd4bf' }}>{((cluster.density || 0.45) * 100).toFixed(0)}%</strong></div>
                    <div style={{ fontSize: '0.725rem', color: '#818cf8', marginTop: '4px', fontWeight: '600' }}>
                      Patterns: {(cluster.detected_patterns || ['SHARED_DEVICE', 'CIRCULAR_RELATIONSHIP']).join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Entity Inspector & Shortest Path Calculator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Entity Inspector Drawer */}
          <div className="glass-card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white', marginBottom: '14px' }}>
              Entity Inspector
            </h3>

            {!selectedNode ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic', padding: '16px', textAlign: 'center', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                Click any graph node to inspect network connections, risk scores, and evidence.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'white' }}>{selectedNode.label}</h4>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{selectedNode.id}</span>
                  </div>
                  <RiskScoreBadge score={selectedNode.risk_score} />
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-subtle)', padding: '10px', borderRadius: '6px' }}>
                  <div>Type: <strong style={{ color: 'white' }}>{selectedNode.type}</strong></div>
                  <div>Connections: <strong style={{ color: '#818cf8' }}>{nodeDetail ? nodeDetail.connections_count : 4} entities</strong></div>
                  <div>Suspicious: <strong style={{ color: '#f43f5e' }}>{nodeDetail ? nodeDetail.suspicious_relationships_count : 2} risky</strong></div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {selectedNode.type === 'MERCHANT' && (
                    <button className="btn-primary btn-sm" onClick={() => onSelectMerchant && onSelectMerchant(selectedNode.id)}>
                      Open Merchant Workspace
                    </button>
                  )}
                  {selectedNode.type === 'CUSTOMER' && (
                    <button className="btn-primary btn-sm" onClick={() => onSelectCustomer && onSelectCustomer(selectedNode.id)}>
                      Open Customer Workspace
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Shortest Path Calculator */}
          <div className="glass-card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} color="#2dd4bf" />
              <span>Shortest Path Calculator</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="text"
                placeholder="Source Entity ID (e.g. M089)"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                style={{ background: '#0f172a', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 10px', fontSize: '0.8rem', outline: 'none' }}
              />
              <input
                type="text"
                placeholder="Target Entity ID (e.g. C002)"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                style={{ background: '#0f172a', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 10px', fontSize: '0.8rem', outline: 'none' }}
              />

              <button className="btn-secondary btn-sm" onClick={handleCalculatePath} disabled={isPathLoading}>
                {isPathLoading ? 'Tracing Graph Path...' : 'Trace Shortest Path'}
              </button>

              {pathResult && (
                <div style={{ marginTop: '8px', padding: '10px', background: 'var(--bg-subtle)', borderRadius: '6px', fontSize: '0.775rem' }}>
                  {pathResult.error ? (
                    <div style={{ color: '#f59e0b' }}>{pathResult.error}</div>
                  ) : (
                    <div>
                      <div style={{ color: '#2dd4bf', fontWeight: '700', marginBottom: '4px' }}>Path Hops: {pathResult.path_length || pathResult.path.length - 1}</div>
                      <div style={{ fontFamily: 'monospace', color: 'white' }}>
                        {(pathResult.path || []).join(' → ')}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
