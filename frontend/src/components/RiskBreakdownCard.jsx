import React from 'react';
import RiskScoreBadge from './RiskScoreBadge';
import { Layers, Network, Cpu, Sliders } from 'lucide-react';

export default function RiskBreakdownCard({
  finalRiskScore = 0,
  finalRiskLevel = 'LOW',
  transactionRiskScore = 0,
  networkRiskScore = 0,
  mlRiskScore = 0,
  breakdown = []
}) {
  const defaultBreakdown = [
    { engine: 'Transaction Rule Engine (Phase 1)', raw_score: transactionRiskScore, weight: 0.35, weighted_contribution: (transactionRiskScore * 0.35).toFixed(2), icon: Layers },
    { engine: 'Network Graph Intelligence (Phase 3)', raw_score: networkRiskScore, weight: 0.35, weighted_contribution: (networkRiskScore * 0.35).toFixed(2), icon: Network },
    { engine: 'ML Risk Intelligence (Phase 4)', raw_score: mlRiskScore, weight: 0.30, weighted_contribution: (mlRiskScore * 0.30).toFixed(2), icon: Cpu }
  ];

  const displayItems = breakdown.length > 0 ? breakdown : defaultBreakdown;

  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color="#6366f1" />
          <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Blended Risk Score Breakdown</h4>
        </div>
        <RiskScoreBadge score={finalRiskScore} level={finalRiskLevel} />
      </div>

      {/* Main Final Score Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-subtle)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: '2rem', fontWeight: '800', color: finalRiskScore >= 80 ? '#f43f5e' : (finalRiskScore >= 60 ? '#f59e0b' : '#6366f1'), minWidth: '70px' }}>
          {Number(finalRiskScore).toFixed(1)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Unified Final Risk Intelligence Score</div>
          <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(0, finalRiskScore))}%`,
                height: '100%',
                background: finalRiskScore >= 80 ? '#f43f5e' : (finalRiskScore >= 60 ? '#f59e0b' : '#6366f1'),
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>
      </div>

      {/* Sub-engine Weights Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {displayItems.map((item, i) => {
          const Icon = item.icon || Layers;
          const score = item.raw_score || 0;
          const weightPct = ((item.weight || 0.33) * 100).toFixed(0);

          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)', padding: '10px 12px', borderRadius: '6px', fontSize: '0.825rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon size={15} color="#94a3b8" />
                <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{item.engine}</span>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', background: '#1e293b', padding: '1px 6px', borderRadius: '4px' }}>Weight {weightPct}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Raw: <strong style={{ color: 'white' }}>{score.toFixed(0)}</strong></span>
                <span style={{ fontWeight: '700', color: '#818cf8', width: '55px', textAlign: 'right' }}>+{item.weighted_contribution || (score * (item.weight || 0.3)).toFixed(1)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
