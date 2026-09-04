import React from 'react';
import { Cpu, Info, CheckCircle2, Sparkles } from 'lucide-react';

export default function MLExplainabilityCard({
  mlRiskScore = 0,
  modelVersion = '1.0.0-rf-synthetic',
  algorithm = 'RandomForestClassifier',
  topFeatures = []
}) {
  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={18} color="#2dd4bf" />
          <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>ML Risk Intelligence & Explainability</h4>
        </div>
        <span style={{ fontSize: '0.725rem', color: '#2dd4bf', background: 'rgba(45, 212, 191, 0.12)', border: '1px solid rgba(45, 212, 191, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
          Model v{modelVersion}
        </span>
      </div>

      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Algorithm: <code style={{ color: '#f8fafc', background: '#0f172a', padding: '2px 6px', borderRadius: '4px' }}>{algorithm}</code>
      </div>

      {/* Feature Importance Explanations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '0.775rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Top Contributing Risk Features
        </div>

        {topFeatures.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
            No dominant ML anomaly features triggered for this pair. Standard baseline indicators apply.
          </div>
        ) : (
          topFeatures.map((feat, idx) => {
            const impPct = Math.min(100, Math.round(feat.importance * 100 * 3)); // Normalized visual bar
            return (
              <div key={idx} style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.825rem', fontWeight: '700', color: '#f8fafc', fontFamily: 'monospace' }}>
                    {feat.feature}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Val: <strong style={{ color: '#2dd4bf' }}>{feat.value}</strong></span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6366f1', background: 'rgba(99, 102, 241, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>
                      {(feat.importance * 100).toFixed(1)}% Imp
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '4px', background: '#1e293b', borderRadius: '2px', marginBottom: '8px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(5, impPct)}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #2dd4bf)' }} />
                </div>

                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <Sparkles size={13} color="#fbbf24" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{feat.reason}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
