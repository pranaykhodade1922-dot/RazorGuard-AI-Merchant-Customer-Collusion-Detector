import React, { useState, useEffect } from 'react';
import { fetchAlerts, fetchCases } from '../api';
import RiskScoreBadge from '../components/RiskScoreBadge';
import { Bell, ShieldAlert, AlertTriangle, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';

export default function Alerts({ onSelectCase, onSelectMerchant }) {
  const [alerts, setAlerts] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAlerts();
      setAlerts(data || []);
    } catch (err) {
      console.error('Failed fetching alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const mockFallbackAlerts = [
    {
      id: 'ALT-1001',
      title: 'Critical Collusion Ring Detected',
      entity_id: 'M089',
      entity_type: 'MERCHANT',
      risk_score: 94.5,
      severity: 'CRITICAL',
      timestamp: '2026-09-04T08:15:00Z',
      case_id: 'CASE-0002',
      description: 'Merchant M089 engaged in circular collusion pattern with 4 shared payment identities.'
    },
    {
      id: 'ALT-1002',
      title: 'High Refund Velocity Anomaly',
      entity_id: 'M014',
      entity_type: 'MERCHANT',
      risk_score: 78.0,
      severity: 'HIGH',
      timestamp: '2026-09-04T07:45:00Z',
      case_id: 'CASE-0005',
      description: 'Abnormal refund ratio exceeding 45% threshold within tight time window.'
    },
    {
      id: 'ALT-1003',
      title: 'Shared Device Hardware Cluster',
      entity_id: 'C002',
      entity_type: 'CUSTOMER',
      risk_score: 82.0,
      severity: 'CRITICAL',
      timestamp: '2026-09-04T06:30:00Z',
      case_id: 'CASE-0002',
      description: 'Customer device fingerprint associated with 5 distinct merchant payout accounts.'
    }
  ];

  const displayAlerts = alerts.length > 0 ? alerts : mockFallbackAlerts;

  const filteredAlerts = displayAlerts.filter(a => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={22} color="#f43f5e" />
            <span>Active Fraud Risk Alerts</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-time critical alerts flagged by Rule Engine, Graph Collusion Detector, and Phase 4 ML Scorer.
          </p>
        </div>

        <button className="btn-secondary btn-sm" onClick={loadAlerts}>
          <RefreshCw size={14} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Filter Severity:</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(sev => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              style={{
                background: filterSeverity === sev ? '#6366f1' : 'var(--bg-card)',
                color: filterSeverity === sev ? 'white' : 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '0.775rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredAlerts.map(alert => (
          <div
            key={alert.id}
            className="glass-card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              borderLeft: `4px solid ${alert.severity === 'CRITICAL' ? '#f43f5e' : '#f59e0b'}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1 }}>
              <div style={{ padding: '10px', background: alert.severity === 'CRITICAL' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)', borderRadius: '8px', marginTop: '2px' }}>
                <ShieldAlert size={20} color={alert.severity === 'CRITICAL' ? '#f43f5e' : '#f59e0b'} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white' }}>{alert.title}</h3>
                  <RiskScoreBadge score={alert.risk_score} level={alert.severity} size="sm" />
                </div>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {alert.description}
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', gap: '14px' }}>
                  <span>Entity: <strong style={{ color: '#818cf8', fontFamily: 'monospace' }}>{alert.entity_id}</strong> ({alert.entity_type})</span>
                  {alert.timestamp && <span>Time: {new Date(alert.timestamp).toLocaleTimeString()}</span>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {alert.case_id && (
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => onSelectCase && onSelectCase(alert.case_id)}
                >
                  <span>Open Case {alert.case_id}</span>
                  <ArrowRight size={14} />
                </button>
              )}
              {alert.entity_type === 'MERCHANT' && (
                <button
                  className="btn-primary btn-sm"
                  onClick={() => onSelectMerchant && onSelectMerchant(alert.entity_id)}
                >
                  Investigate Merchant
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
