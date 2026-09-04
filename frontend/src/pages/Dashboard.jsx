import React, { useState, useEffect } from 'react';
import { fetchDashboardSummary, fetchCases, fetchMerchants, fetchAlerts, fetchNetworkOverview, fetchTransactions, fetchAuditLogs } from '../api';
import { useAuth } from '../context/AuthContext';
import RiskScoreBadge from '../components/RiskScoreBadge';
import { LayoutDashboard, CreditCard, ShieldAlert, Store, Network, Bell, RefreshCw, UploadCloud, FileText, CheckCircle2, ArrowRight, Play, Search, Shield, Activity, Users } from 'lucide-react';

export default function Dashboard({ summary: initialSummary, onNavigateTab, onSelectMerchant, onSelectCase }) {
  const { user, isAdmin, isMerchant } = useAuth();
  const [summary, setSummary] = useState(initialSummary || null);
  const [merchants, setMerchants] = useState([]);
  const [cases, setCases] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [networkOverview, setNetworkOverview] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const promises = [
        fetchDashboardSummary().catch(() => null),
        fetchMerchants().catch(() => []),
        fetchCases().catch(() => []),
        fetchAlerts().catch(() => []),
        fetchNetworkOverview().catch(() => null),
        fetchTransactions(100).catch(() => [])
      ];

      if (isAdmin) {
        promises.push(fetchAuditLogs(10).catch(() => []));
      }

      const results = await Promise.all(promises);
      if (results[0]) setSummary(results[0]);
      setMerchants(results[1] || []);
      setCases(results[2] || []);
      setAlerts(results[3] || []);
      setNetworkOverview(results[4]);
      setTransactions(results[5] || []);
      if (isAdmin && results[6]) {
        setAuditLogs(results[6] || []);
      }
    } catch (err) {
      console.error('Failed loading dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [isAdmin]);

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

  if (isLoading) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
        <div style={{ fontSize: '1rem', fontWeight: '700', color: 'white' }}>Loading Enterprise Dashboard Data...</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>Syncing backend datasets, risk scores, and audit streams.</div>
      </div>
    );
  }

  // =========================================================
  // 1. ADMIN DASHBOARD VIEW (Platform & System Management)
  // =========================================================
  if (isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Admin Header & Quick Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LayoutDashboard size={24} color="#6366f1" />
              <span>Admin Command Center</span>
              <span style={{ fontSize: '0.725rem', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                ADMIN ROLE
              </span>
            </h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              System-wide fraud exposure, data ingestion pipeline, system health, and audit trail stream.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn-primary btn-sm" onClick={() => onNavigateTab && onNavigateTab('ingest')}>
              <UploadCloud size={14} />
              <span>Upload CSV Dataset</span>
            </button>
            <button className="btn-secondary btn-sm" onClick={() => onNavigateTab && onNavigateTab('audit')}>
              <FileText size={14} color="#818cf8" />
              <span>Audit Trail Logs</span>
            </button>
            <button className="btn-secondary btn-sm" onClick={loadDashboardData}>
              <RefreshCw size={14} />
              <span>Refresh System Data</span>
            </button>
          </div>
        </div>

        {/* Admin KPI Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: '600' }}>Total Transactions</span>
              <CreditCard size={18} color="#6366f1" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'white' }}>{totalTx.toLocaleString()}</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>System Analyzed</div>
          </div>

          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: '600' }}>Merchants Directory</span>
              <Store size={18} color="#2dd4bf" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#2dd4bf' }}>{merchants.length}</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>Registered merchants</div>
          </div>

          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: '600' }}>Customer Profiles</span>
              <Users size={18} color="#818cf8" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#818cf8' }}>{summary?.customers_count || 10}</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>Active identities</div>
          </div>

          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: '600' }}>System Risk Cases</span>
              <ShieldAlert size={18} color="#f43f5e" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f43f5e' }}>{cases.length}</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>{criticalCases} critical rings</div>
          </div>
        </div>

        {/* Admin Middle Row: Trend Chart & Recent Audit Logs */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* Trend Chart */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white' }}>System Transaction & Risk Volume Trend</h3>
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
                <path d={trendData.txAreaPath} fill="url(#gradientTx)" />
                <path d={trendData.txPath} fill="none" stroke="#6366f1" strokeWidth="2.5" />
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
                  <span style={{ color: 'var(--text-muted)' }}>Collusion Risk Volume</span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Logs Preview for Admin */}
          <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} color="#818cf8" />
                  <span>Security Audit Stream</span>
                </h3>
                <button className="btn-secondary btn-sm" onClick={() => onNavigateTab && onNavigateTab('audit')}>All Logs</button>
              </div>

              {auditLogs.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>
                  No recent audit logs. System actions automatically log here.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {auditLogs.slice(0, 4).map((log, i) => (
                    <div key={i} style={{ padding: '8px 10px', background: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontSize: '0.775rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', fontWeight: '700' }}>
                        <span>{log.user || 'system'}</span>
                        <span style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Recent'}</span>
                      </div>
                      <div style={{ color: '#818cf8', marginTop: '2px', fontWeight: '600' }}>{log.action}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="btn-secondary btn-sm" onClick={() => onNavigateTab && onNavigateTab('audit')} style={{ marginTop: '14px', width: '100%', justifyContent: 'center' }}>
              <span>View Full Compliance Audit Log</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Admin Bottom Row: Top Risky Merchants */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white' }}>System Risk Merchant Registry</h3>
            <button className="btn-secondary btn-sm" onClick={() => onNavigateTab && onNavigateTab('merchants')}>View All Directory</button>
          </div>

          <div className="saas-table-container">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Merchant Name</th>
                  <th>Category</th>
                  <th>Payout UPI</th>
                  <th>Registered Device</th>
                  <th>Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {topRiskyMerchants.map(m => (
                  <tr key={m.merchant_id} className="clickable-row" onClick={() => onSelectMerchant && onSelectMerchant(m.merchant_id)}>
                    <td style={{ fontWeight: '700', color: 'white' }}>
                      {m.merchant_name || m.merchant_id}
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{m.merchant_id}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{m.category || 'General'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{m.payout_upi || 'N/A'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{m.registered_device_id || 'DEV_M'}</td>
                    <td><RiskScoreBadge score={m.risk_score} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // 2. MERCHANT DASHBOARD VIEW (Merchant Partner Portal)
  // =========================================================
  if (isMerchant) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Store size={24} color="#2dd4bf" />
              <span>Merchant Partner Portal</span>
              <span style={{ fontSize: '0.725rem', background: 'rgba(45, 212, 191, 0.2)', color: '#2dd4bf', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                MERCHANT ROLE
              </span>
            </h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Monitor transaction health, review store risk scores, and inspect active security notifications.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn-primary btn-sm" onClick={() => onNavigateTab && onNavigateTab('transactions')}>
              <CreditCard size={14} />
              <span>View Transactions</span>
            </button>
            <button className="btn-secondary btn-sm" onClick={() => onNavigateTab && onNavigateTab('alerts')}>
              <Bell size={14} color="#f59e0b" />
              <span>Risk Notifications</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div className="glass-card" style={{ padding: '16px', borderLeft: '4px solid #2dd4bf' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: '600' }}>Store Transactions</span>
              <CreditCard size={18} color="#2dd4bf" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'white' }}>{totalTx.toLocaleString()}</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>Processed volume</div>
          </div>

          <div className="glass-card" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: '600' }}>Account Verification</span>
              <CheckCircle2 size={18} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#10b981' }}>Verified</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>Active Merchant ID</div>
          </div>

          <div className="glass-card" style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: '600' }}>Risk Status</span>
              <Activity size={18} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f59e0b' }}>Low Risk</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>Continuous AI Monitoring</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white', marginBottom: '14px' }}>Store Transactions Log</h3>
          <div className="saas-table-container">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Customer ID</th>
                  <th>Amount</th>
                  <th>Payment Status</th>
                  <th>Refund Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 8).map(tx => (
                  <tr key={tx.transaction_id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: '700', color: 'white' }}>{tx.transaction_id}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{tx.customer_id}</td>
                    <td style={{ fontWeight: '700', color: 'white' }}>₹{Number(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>
                      <span style={{ color: tx.payment_status === 'SUCCESS' ? '#10b981' : '#f43f5e', fontWeight: '700', fontSize: '0.75rem' }}>
                        {tx.payment_status || 'SUCCESS'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: tx.refund_status === 'REFUNDED' ? '#f43f5e' : 'var(--text-muted)', fontWeight: '700', fontSize: '0.75rem' }}>
                        {tx.refund_status || 'NONE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // 3. ANALYST DASHBOARD VIEW (Fraud Investigation Workspace)
  // =========================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Analyst Header & Priority Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={24} color="#f43f5e" />
            <span>Fraud Investigation Workspace</span>
            <span style={{ fontSize: '0.725rem', background: 'rgba(45, 212, 191, 0.2)', color: '#2dd4bf', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
              ANALYST ROLE
            </span>
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Investigate suspicious collusion rings, review priority risk alerts, and inspect high-density relationship graphs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn-primary btn-sm" onClick={() => onNavigateTab && onNavigateTab('cases')}>
            <ShieldAlert size={14} />
            <span>Open Cases Queue</span>
          </button>
          <button className="btn-secondary btn-sm" onClick={() => onNavigateTab && onNavigateTab('alerts')}>
            <Bell size={14} color="#f59e0b" />
            <span>Priority Alerts Feed</span>
          </button>
          <button className="btn-secondary btn-sm" onClick={() => onNavigateTab && onNavigateTab('network')}>
            <Network size={14} color="#818cf8" />
            <span>Explore Graph</span>
          </button>
        </div>
      </div>

      {/* Analyst KPI Workload Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '16px', borderLeft: '4px solid #f43f5e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: '600' }}>Critical Collusion Rings</span>
            <ShieldAlert size={18} color="#f43f5e" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f43f5e' }}>{criticalCases}</div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>Immediate investigator review</div>
        </div>

        <div className="glass-card" style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: '600' }}>Active Priority Alerts</span>
            <Bell size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f59e0b' }}>{activeAlertsCount}</div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>Unresolved alerts</div>
        </div>

        <div className="glass-card" style={{ padding: '16px', borderLeft: '4px solid #818cf8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: '600' }}>High-Risk Merchants</span>
            <Store size={18} color="#818cf8" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#818cf8' }}>{suspiciousMerchants}</div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>Score ≥ 60</div>
        </div>

        <div className="glass-card" style={{ padding: '16px', borderLeft: '4px solid #2dd4bf' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: '600' }}>Network Graph Clusters</span>
            <Network size={18} color="#2dd4bf" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#2dd4bf' }}>{networkClusters}</div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>Detected ring clusters</div>
        </div>
      </div>

      {/* Analyst Middle Row: Active Investigation Queue & High-Risk Merchants */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
        {/* Active Investigation Queue */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} color="#f43f5e" />
              <span>Active Investigation Queue</span>
            </h3>
            <button className="btn-secondary btn-sm" onClick={() => onNavigateTab && onNavigateTab('cases')}>View All Cases</button>
          </div>

          {cases.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No active cases in queue.
            </div>
          ) : (
            <div className="saas-table-container">
              <table className="saas-table">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Merchant</th>
                    <th>Risk Level</th>
                    <th>Risk Score</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.slice(0, 6).map(c => (
                    <tr key={c.case_id} className="clickable-row" onClick={() => onSelectCase && onSelectCase(c.case_id)}>
                      <td style={{ fontFamily: 'monospace', fontWeight: '700', color: 'white' }}>{c.case_id}</td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'white' }}>{c.merchant_name || c.merchant_id}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{c.merchant_id}</div>
                      </td>
                      <td>
                        <span className={`badge badge-${(c.risk_level || 'HIGH').toLowerCase()}`}>
                          {c.risk_level}
                        </span>
                      </td>
                      <td><RiskScoreBadge score={c.risk_score} /></td>
                      <td>
                        <button className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); if (onSelectCase) onSelectCase(c.case_id); }}>
                          Investigate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* High Risk Merchant Hotspots */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Store size={16} color="#f59e0b" />
              <span>Suspicious Merchants</span>
            </h3>
            <button className="btn-secondary btn-sm" onClick={() => onNavigateTab && onNavigateTab('merchants')}>Directory</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topRiskyMerchants.slice(0, 5).map(m => (
              <div
                key={m.merchant_id}
                onClick={() => onSelectMerchant && onSelectMerchant(m.merchant_id)}
                style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-subtle)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'white' }}>{m.merchant_name || m.merchant_id}</div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    ID: {m.merchant_id} | Device: {m.registered_device_id || 'DEV_M'}
                  </div>
                </div>
                <RiskScoreBadge score={m.risk_score} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analyst Bottom Row: High Risk Transactions Stream */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={16} color="#6366f1" />
            <span>Recent High-Risk Transactions Stream</span>
          </h3>
          <button className="btn-secondary btn-sm" onClick={() => onNavigateTab && onNavigateTab('transactions')}>View All Log</button>
        </div>

        <div className="saas-table-container">
          <table className="saas-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Merchant</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Payment Status</th>
                <th>Refund Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 6).map(tx => (
                <tr key={tx.transaction_id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: '700', color: 'white' }}>{tx.transaction_id}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{tx.merchant_id}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{tx.customer_id}</td>
                  <td style={{ fontWeight: '700', color: 'white' }}>₹{Number(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td>
                    <span style={{ color: tx.payment_status === 'SUCCESS' ? '#10b981' : '#f43f5e', fontWeight: '700', fontSize: '0.75rem' }}>
                      {tx.payment_status || 'SUCCESS'}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: tx.refund_status === 'REFUNDED' ? '#f43f5e' : 'var(--text-muted)', fontWeight: '700', fontSize: '0.75rem' }}>
                      {tx.refund_status || 'NONE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
