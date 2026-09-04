import React, { useState, useEffect } from 'react';
import { fetchDashboardSummary, fetchCases, fetchMerchants, fetchAlerts, fetchNetworkOverview, fetchTransactions } from '../api';
import RiskScoreBadge from '../components/RiskScoreBadge';
import { LayoutDashboard, CreditCard, ShieldAlert, Store, Network, Bell, RefreshCw } from 'lucide-react';

export default function Dashboard({ summary: initialSummary, onNavigateTab, onSelectMerchant, onSelectCase }) {
  const [summary, setSummary] = useState(initialSummary || null);
  const [merchants, setMerchants] = useState([]);
  const [cases, setCases] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [networkOverview, setNetworkOverview] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, mRes, cRes, aRes, nRes, txRes] = await Promise.all([
        fetchDashboardSummary().catch(() => null),
        fetchMerchants().catch(() => []),
        fetchCases().catch(() => []),
        fetchAlerts().catch(() => []),
        fetchNetworkOverview().catch(() => null),
        fetchTransactions(100).catch(() => [])
      ]);
      if (sumRes) setSummary(sumRes);
      setMerchants(mRes || []);
      setCases(cRes || []);
      setAlerts(aRes || []);
      setNetworkOverview(nRes);
      setTransactions(txRes || []);
    } catch (err) {
      console.error('Failed loading dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute real metrics from backend API responses
  const totalTx = summary?.total_transactions_analyzed ?? summary?.total_transactions ?? (summary?.transactions_count || transactions.length);
  const criticalCases = cases.filter(c => c.risk_level === 'CRITICAL').length;
  const suspiciousMerchants = merchants.filter(m => (m.risk_score || 0) >= 60).length;
  const networkClusters = networkOverview?.total_clusters ?? (summary?.fraud_rings_detected || 0);
  const activeAlertsCount = alerts.length;

  // Real risk level distribution computed from actual data
  const distCritical = criticalCases;
  const distHigh = suspiciousMerchants;
  const distMedium = merchants.filter(m => (m.risk_score || 0) >= 30 && (m.risk_score || 0) < 60).length;
  const distLow = Math.max(0, merchants.length - distCritical - distHigh - distMedium);

  // Sorted Top Risky Merchants
  const topRiskyMerchants = [...merchants]
    .filter(m => (m.risk_score || 0) > 0)
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    .slice(0, 6);

  // Dynamic SVG trend generator computed directly from real backend transactions & cases timestamps
  const computeTrendPaths = () => {
    const BUCKETS = 8;
    if (!transactions || transactions.length === 0) {
      return {
        txPath: "M 0 140 L 500 140",
        txAreaPath: "M 0 140 L 500 140 L 500 150 L 0 150 Z",
        riskPath: "M 0 140 L 500 140",
        riskAreaPath: "M 0 140 L 500 140 L 500 150 L 0 150 Z",
        isEmpty: true
      };
    }

    const times = transactions.map(t => new Date(t.timestamp || t.created_at || Date.now()).getTime()).filter(t => !isNaN(t));
    if (times.length === 0) {
      return {
        txPath: "M 0 140 L 500 140",
        txAreaPath: "M 0 140 L 500 140 L 500 150 L 0 150 Z",
        riskPath: "M 0 140 L 500 140",
        riskAreaPath: "M 0 140 L 500 140 L 500 150 L 0 150 Z",
        isEmpty: true
      };
    }

    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const span = (maxTime - minTime) || 1;

    const txBins = new Array(BUCKETS).fill(0);
    const riskBins = new Array(BUCKETS).fill(0);

    transactions.forEach(t => {
      const ts = new Date(t.timestamp || t.created_at || Date.now()).getTime();
      if (isNaN(ts)) return;
      const bIdx = Math.min(BUCKETS - 1, Math.max(0, Math.floor(((ts - minTime) / span) * BUCKETS)));
      txBins[bIdx] += 1;
      if (t.refund_status === 'REFUNDED' || t.payment_status === 'FAILED') {
        riskBins[bIdx] += 1;
      }
    });

    cases.forEach(c => {
      const ts = new Date(c.created_at || Date.now()).getTime();
      if (isNaN(ts)) return;
      const bIdx = Math.min(BUCKETS - 1, Math.max(0, Math.floor(((ts - minTime) / span) * BUCKETS)));
      if (c.risk_level === 'HIGH' || c.risk_level === 'CRITICAL') {
        riskBins[bIdx] += 1;
      }
    });

    const maxTx = Math.max(...txBins, 1);
    const maxRisk = Math.max(...riskBins, 1);

    const txPts = txBins.map((val, i) => ({
      x: (i / (BUCKETS - 1)) * 500,
      y: 135 - (val / maxTx) * 95
    }));

    const riskPts = riskBins.map((val, i) => ({
      x: (i / (BUCKETS - 1)) * 500,
      y: 140 - (val / maxRisk) * 90
    }));

    const toSvgPath = pts => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    const txPath = toSvgPath(txPts);
    const txAreaPath = `${txPath} L 500 150 L 0 150 Z`;
    const riskPath = toSvgPath(riskPts);
    const riskAreaPath = `${riskPath} L 500 150 L 0 150 Z`;

    return { txPath, txAreaPath, riskPath, riskAreaPath, isEmpty: false };
  };

  const trendData = computeTrendPaths();

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
          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>Backend Analyzed</div>
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
        {/* Dynamic Time-Series Risk Trend Visualization */}
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

          {/* Dynamic SVG Data Trend Chart from real API backend endpoints */}
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
              {/* Total Volume Line & Fill derived from real backend data */}
              <path d={trendData.txAreaPath} fill="url(#gradientTx)" />
              <path d={trendData.txPath} fill="none" stroke="#6366f1" strokeWidth="2.5" />
              {/* High Risk Volume Line & Fill derived from real backend data */}
              <path d={trendData.riskAreaPath} fill="url(#gradientRisk)" />
              <path d={trendData.riskPath} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="4 2" />
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
              <span style={{ fontWeight: '800', color: 'white' }}>{distCritical}</span>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(245, 158, 11, 0.12)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: '700', color: '#f59e0b' }}>HIGH (60-79)</span>
              <span style={{ fontWeight: '800', color: 'white' }}>{distHigh}</span>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(234, 179, 8, 0.12)', borderRadius: '6px', border: '1px solid rgba(234, 179, 8, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: '700', color: '#eab308' }}>MEDIUM (30-59)</span>
              <span style={{ fontWeight: '800', color: 'white' }}>{distMedium}</span>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: '700', color: '#10b981' }}>LOW (0-29)</span>
              <span style={{ fontWeight: '800', color: 'white' }}>{distLow}</span>
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
                {isLoading ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                      Loading merchant risk data...
                    </td>
                  </tr>
                ) : topRiskyMerchants.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                      No high-risk merchants detected.
                    </td>
                  </tr>
                ) : (
                  topRiskyMerchants.map(m => {
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
                  })
                )}
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
            {isLoading ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>Loading cases...</div>
            ) : cases.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic', padding: '16px', textAlign: 'center', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                No active investigation cases.
              </div>
            ) : (
              cases.slice(0, 4).map(c => (
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
