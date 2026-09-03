import React, { useState, useMemo, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Filter, ShieldAlert, Cpu, CreditCard, User, Store, Globe } from 'lucide-react';

const NODE_COLORS = {
  MERCHANT: '#818cf8',
  CUSTOMER: '#2dd4bf',
  DEVICE: '#fbbf24',
  PAYMENT_FINGERPRINT: '#f43f5e',
  IP: '#38bdf8',
  ADDRESS: '#a78bfa',
  UNKNOWN: '#94a3b8'
};

export default function NetworkGraphVisualizer({ nodes = [], edges = [], onNodeSelect, selectedNodeId }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [filterType, setFilterType] = useState('ALL');
  const [filterMinScore, setFilterMinScore] = useState(0);

  const containerRef = useRef(null);

  // Filter nodes & edges
  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      if (filterType !== 'ALL' && n.type !== filterType) return false;
      if (filterMinScore > 0 && n.risk_score < filterMinScore) return false;
      return true;
    });
  }, [nodes, filterType, filterMinScore]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [edges, filteredNodeIds]);

  // Layout positioning algorithm (Circular / Force-directed layout projection)
  const nodePositions = useMemo(() => {
    const pos = {};
    const count = filteredNodes.length;
    if (count === 0) return pos;

    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.38;

    // Group nodes by type for structured circular orbits
    const merchants = filteredNodes.filter(n => n.type === 'MERCHANT');
    const customers = filteredNodes.filter(n => n.type === 'CUSTOMER');
    const others = filteredNodes.filter(n => n.type !== 'MERCHANT' && n.type !== 'CUSTOMER');

    let idx = 0;
    // Inner orbit: Merchants
    merchants.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / (merchants.length || 1);
      const r = radius * 0.45;
      pos[n.id] = { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) };
    });

    // Middle orbit: Customers
    customers.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / (customers.length || 1) + 0.3;
      const r = radius * 0.85;
      pos[n.id] = { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) };
    });

    // Outer orbit: Hardware & Identity Resources
    others.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / (others.length || 1);
      const r = radius * 1.15;
      pos[n.id] = { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) };
    });

    return pos;
  }, [filteredNodes]);

  // Mouse pan controls
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'svg' || e.target.tagName === 'rect') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="glass-panel" style={{ padding: '16px', position: 'relative', overflow: 'hidden' }}>
      {/* Header & Controls Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={20} color="#6366f1" />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Network Graph Intelligence</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({filteredNodes.length} nodes, {filteredEdges.length} edges)</span>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <Filter size={14} color="#94a3b8" />
            <span style={{ color: 'var(--text-muted)' }}>Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '2px 8px', fontSize: '0.8rem' }}
            >
              <option value="ALL">All Types</option>
              <option value="MERCHANT">Merchants</option>
              <option value="CUSTOMER">Customers</option>
              <option value="DEVICE">Devices</option>
              <option value="PAYMENT_FINGERPRINT">Payments</option>
              <option value="IP">IP Addresses</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Min Score:</span>
            <input
              type="range"
              min="0"
              max="90"
              step="10"
              value={filterMinScore}
              onChange={(e) => setFilterMinScore(Number(e.target.value))}
              style={{ width: '80px', accentColor: '#6366f1' }}
            />
            <span style={{ fontWeight: '600', color: '#6366f1' }}>{filterMinScore}+</span>
          </div>

          {/* Zoom Buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn-secondary btn-sm" onClick={() => setZoom(z => Math.min(z + 0.2, 2.5))} title="Zoom In"><ZoomIn size={14} /></button>
            <button className="btn-secondary btn-sm" onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))} title="Zoom Out"><ZoomOut size={14} /></button>
            <button className="btn-secondary btn-sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset View"><RotateCcw size={14} /></button>
          </div>
        </div>
      </div>

      {/* SVG Interactive Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          width: '100%',
          height: '520px',
          background: '#090d16',
          borderRadius: '8px',
          cursor: isDragging ? 'grabbing' : 'grab',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 500"
          style={{ width: '100%', height: '100%' }}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Background Grid Pattern */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="1600" height="1000" x="-400" y="-250" fill="url(#grid)" />

            {/* Edges */}
            {filteredEdges.map((e, idx) => {
              const p1 = nodePositions[e.source];
              const p2 = nodePositions[e.target];
              if (!p1 || !p2) return null;

              const isHighlighted = selectedNodeId && (e.source === selectedNodeId || e.target === selectedNodeId);
              const isRisky = e.risk_score >= 60 || e.relationship.startsWith('SHARES_');
              
              return (
                <g key={`edge-${idx}`}>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={isHighlighted ? '#818cf8' : (isRisky ? '#f43f5e' : '#334155')}
                    strokeWidth={isHighlighted ? 2.5 : (isRisky ? 1.8 : 1.0)}
                    strokeDasharray={e.relationship.startsWith('SHARES_') ? '4 2' : 'none'}
                    opacity={selectedNodeId ? (isHighlighted ? 1.0 : 0.2) : 0.7}
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {filteredNodes.map((n) => {
              const p = nodePositions[n.id];
              if (!p) return null;

              const isSelected = selectedNodeId === n.id;
              const color = NODE_COLORS[n.type] || NODE_COLORS.UNKNOWN;
              const isCritical = n.risk_score >= 80;
              const isHigh = n.risk_score >= 60;

              return (
                <g
                  key={`node-${n.id}`}
                  transform={`translate(${p.x}, ${p.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNodeSelect) onNodeSelect(n);
                  }}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  {/* Risk Halo Ring */}
                  {(isCritical || isHigh) && (
                    <circle
                      r={isSelected ? 22 : 18}
                      fill="none"
                      stroke={isCritical ? '#f43f5e' : '#f59e0b'}
                      strokeWidth="2"
                      opacity="0.8"
                    />
                  )}

                  {/* Node Circle */}
                  <circle
                    r={isSelected ? 16 : 12}
                    fill={color}
                    stroke={isSelected ? '#ffffff' : '#0f172a'}
                    strokeWidth={isSelected ? 3 : 1.5}
                    style={{ filter: isSelected ? 'drop-shadow(0 0 8px #6366f1)' : 'none' }}
                  />

                  {/* Node Label */}
                  <text
                    y={22}
                    textAnchor="middle"
                    fill={isSelected ? '#ffffff' : '#94a3b8'}
                    fontSize={isSelected ? '10' : '9'}
                    fontWeight={isSelected ? '700' : '500'}
                  >
                    {n.label.length > 16 ? `${n.label.substring(0, 14)}...` : n.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend */}
        <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(15, 23, 42, 0.85)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.75rem', display: 'flex', gap: '12px', backdropFilter: 'blur(4px)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: NODE_COLORS.MERCHANT }} /> Merchant</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: NODE_COLORS.CUSTOMER }} /> Customer</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: NODE_COLORS.DEVICE }} /> Device</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: NODE_COLORS.PAYMENT_FINGERPRINT }} /> Payment</div>
        </div>
      </div>
    </div>
  );
}
