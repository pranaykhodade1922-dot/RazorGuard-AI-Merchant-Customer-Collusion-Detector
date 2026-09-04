import React from 'react';
import { AlertCircle, ShieldAlert, Cpu, Network, Clock, CheckCircle } from 'lucide-react';

export default function EvidenceList({ evidence = [] }) {
  if (!evidence || evidence.length === 0) {
    return (
      <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: '8px', color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center' }}>
        No explicit risk signals flagged for this entity or case.
      </div>
    );
  }

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' };
      case 'HIGH':
        return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'MEDIUM':
        return { color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' };
      default:
        return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {evidence.map((item, idx) => {
        const type = typeof item === 'string' ? item : (item.type || item.signal || 'RISK_SIGNAL');
        const desc = typeof item === 'string' ? item : (item.description || item.reason || item.explanation || 'Suspicious risk indicator detected.');
        const severity = typeof item === 'object' && item.severity ? item.severity : 'HIGH';
        const sevConfig = getSeverityBadge(severity);

        return (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px 14px',
              background: 'var(--bg-subtle)',
              borderRadius: '8px',
              borderLeft: `3px solid ${sevConfig.color}`,
              border: '1px solid var(--border-subtle)',
              borderLeftWidth: '3px'
            }}
          >
            <AlertCircle size={18} color={sevConfig.color} style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'white', fontFamily: 'monospace' }}>
                  {type}
                </span>
                <span
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: '700',
                    color: sevConfig.color,
                    background: sevConfig.bg,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase'
                  }}
                >
                  {severity}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                {desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
