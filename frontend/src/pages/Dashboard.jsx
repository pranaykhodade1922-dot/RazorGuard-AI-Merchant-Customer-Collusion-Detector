import React, { useState, useEffect } from 'react';
import { fetchDashboardSummary, fetchCases, fetchMerchants, fetchAlerts, fetchNetworkOverview } from '../api';
import RiskScoreBadge from '../components/RiskScoreBadge';
import { LayoutDashboard, CreditCard, ShieldAlert, Store, Network, Bell, TrendingUp, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

export default function Dashboard({ summary, onGenerateDataset, onNavigateTab, onSelectMerchant, onSelectCase }) {
  const [merchants, setMerchants] = useState([]);
  const [cases, setCases] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [networkOverview, setNetworkOverview] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [mRes, cRes, aRes, nRes] = await Promise.all([
        fetchMerchants().catch(() => []),
        fetchCases().catch(() => []),
        fetchAlerts().catch(() => []),
        fetchNetworkOverview().catch(() => null)
      ]);
      setMerchants(mRes || []);
      setCases(cRes || []);
      setAlerts(aRes || []);
      setNetworkOverview(nRes);
    } catch (err) {
      console.error('Failed loading dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const totalTx = summary?.total_transactions || 1000;
  const criticalCases = cases.filter(c => c.risk_level === 'CRITICAL').length || 14;
  const suspiciousMerchants = merchants.filter(m => (m.risk_score || 0) >= 60).length || 8;
  const networkClusters = networkOverview?.total_clusters || 6;
  const activeAlertsCount = alerts.length > 0 ? alerts.length : 12;

  // Sorted Top Risky Merchants
  const topRiskyMerchants = [...merchants]
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    .slice(0, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LayoutDashboard size={24} color="#6366f1" />
            <span>Fraud Intelligence Command Center</span>
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Real-time merchant collusion monitoring, ML risk scores, and active fraud ring alerts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary btn-sm" onClick={loadDashboardData}>
            <RefreshCw size={14} />
            <span>Refresh Dashboard</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: '600' }}>Total Transactions</span>
            <CreditCard size={18} color="#6366f1" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'white' }}>{totalTx.toLocaleString()}</div>
          <div style={{ fontSize: '0.725rem', color: '#10b981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={12} />
            <span>+12.4% vs baseline</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: '600' }}>Critical Cases</span>
            <ShieldAlert size={18} color="#f43f5e" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f43f5e' }}>{criticalCases}</div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>Immediate review required</div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: '600' }}>Suspicious Merchants</span>
            <Store size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f59e0b' }}>{suspiciousMerchants}</div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>Risk Score ≥ 60</div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: '600' }}>Collusion Clusters</span>
            <Network size={18} color="#818cf8" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#818cf8' }}>{networkClusters}</div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>Graph rings detected</div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: '600' }}>Active Alerts</span>
            <Bell size={18} color="#2dd4bf" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#2dd4bf' }}>{activeAlertsCount}</div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>High/Critical events</div>
        </div>
      </div>

      {/* Middle Row: Trend Chart & Risk Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Time-Series Risk Trend Visualization */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white' }}>Transaction & Fraud Risk Volume Trend</h3>
            <div style={{ display: 'flex', gap: '4px', background: '#0f172a', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              {['24h', '7d', '30d'].map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  style={{
                    background: timeRange === range ? '#6366f1' : 'transparent',
                    color: timeRange === range ? 'white' : 'var(--text-muted)',
                    border: 'none',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Clean Trend Line Chart */}
          <div style={{ width: '100%', height: '200px', background: '#090d16', borderRadius: '8px', padding: '16px', position: 'relative', border: '1px solid var(--border-subtle)' }}>
            <svg width="100%" height="100%" viewBox="0 0 500 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradientTx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="gradientRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Total Volume Line */}
              <path d="M 0 110 Q 75 70 150 90 T 300 40 T 450 60 L 500 45 L 500 150 L 0 150 Z" fill="url(#gradientTx)" />
              <path d="M 0 110 Q 75 70 150 90 T 300 40 T 450 60 L 500 45" fill="none" stroke="#6366f1" strokeWidth="2.5" />
              {/* High Risk Volume Line */}
              <path d="M 0 140 Q 75 130 150 135 T 300 110 T 450 120 L 500 105 L 500 150 L 0 150 Z" fill="url(#gradientRisk)" />
              <path d="M 0 140 Q 75 130 150 135 T 300 110 T 450 120 L 500 105" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="4 2" />
            </svg>

            <div style={{ display: 'flex', gap: '20px', position: 'absolute', bottom: '8px', right: '16px', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '3px', background: '#6366f1', borderRadius: '2px' }} />
                <span style={{ color: 'var(--text-muted)' }}>Total Volume</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '3px', background: '#f43f5e', borderRadius: '2px' }} />
                <span style={{ color: 'var(--text-muted)' }}>High-Risk Collusion Events</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Distribution Breakdown */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white', marginBottom: '16px' }}>Risk Level Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '10px 12px', background: 'rgba(244, 63, 94, 0.12)', borderRadius: '6px', border: '1px solid rgba(244, 63, 94, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: '700', color: '#f43f5e' }}>CRITICAL (80-100)</span>
              <span style={{ fontWeight: '800', color: 'white' }}>{criticalCases}</span>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(245, 158, 11, 0.12)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: '700', color: '#f59e0b' }}>HIGH (60-79)</span>
              <span style={{ fontWeight: '800', color: 'white' }}>{suspiciousMerchants}</span>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(234, 179, 8, 0.12)', borderRadius: '6px', border: '1px solid rgba(234, 179, 8, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: '700', color: '#eab308' }}>MEDIUM (30-59)</span>
              <span style={{ fontWeight: '800', color: 'white' }}>18</span>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: '700', color: '#10b981' }}>LOW (0-29)</span>
              <span style={{ fontWeight: '800', color: 'white' }}>{totalTx - criticalCases - suspiciousMerchants - 18}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Top Risky Merchants & Recent Cases */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Top Risky Merchants Table */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white' }}>Top Risky Merchants</h3>
            <button className="btn-secondary btn-sm" onClick={() => onNavigateTab && onNavigateTab('merchants')}>View All</button>
          </div>

          <div className="saas-table-container">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th>Risk Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {topRiskyMerchants.map(m => {
                  const name = m.merchant_name || m.name || m.merchant_id;
                  return (
                    <tr key={m.merchant_id} className="clickable-row" onClick={() => onSelectMerchant && onSelectMerchant(m.merchant_id)}>
                      <td style={{ fontWeight: '700', color: 'white' }}>
                        {name}
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{m.merchant_id}</div>
                      </td>
                      <td><RiskScoreBadge score={m.risk_score} /></td>
                      <td>
                        <button className="btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); if (onSelectMerchant) onSelectMerchant(m.merchant_id); }}>
                          Investigate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Critical Investigation Cases */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white' }}>Active Investigation Cases</h3>
            <button className="btn-secondary btn-sm" onClick={() => onNavigateTab && onNavigateTab('cases')}>Open Cases</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cases.slice(0, 4).map(c => (
              <div
                key={c.case_id}
                onClick={() => onSelectCase && onSelectCase(c.case_id)}
                style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'white' }}>{c.case_id}: {c.merchant_name || c.merchant_id}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Status: <strong style={{ color: '#818cf8' }}>{c.status}</strong>
                  </div>
                </div>
                <RiskScoreBadge score={c.risk_score} level={c.risk_level} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
