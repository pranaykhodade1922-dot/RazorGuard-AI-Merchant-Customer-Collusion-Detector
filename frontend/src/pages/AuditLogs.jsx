import React, { useState, useEffect } from 'react';
import { fetchAuditLogs } from '../api';
import { FileText, RefreshCw, UserCheck, UploadCloud, CheckCircle2, ShieldAlert, KeyRound, Clock, Shield } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAuditLogs();
      setLogs(data || []);
    } catch (err) {
      console.error('Failed fetching audit logs:', err);
      setError('Failed loading system audit log records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const getActionBadge = (action) => {
    switch (action) {
      case 'USER_VERIFIED_SESSION':
        return <span style={{ color: '#2dd4bf', background: 'rgba(45, 212, 191, 0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.725rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><UserCheck size={13} /> Session Verified</span>;
      case 'CSV_DATASET_IMPORTED':
        return <span style={{ color: '#6366f1', background: 'rgba(99, 102, 241, 0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.725rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><UploadCloud size={13} /> Dataset Imported</span>;
      case 'CASE_STATUS_UPDATED':
        return <span style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.725rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={13} /> Status Updated</span>;
      default:
        return <span style={{ color: '#818cf8', background: 'rgba(129, 140, 248, 0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.725rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Shield size={13} /> {action}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={22} color="#6366f1" />
            <span>Security & Compliance Audit Trail</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Immutable security log stream recording investigator access, status updates, and dataset imports.
          </p>
        </div>

        <button className="btn-secondary btn-sm" onClick={loadAuditLogs} disabled={isLoading}>
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh Trail Logs</span>
        </button>
      </div>

      {/* Audit Log Table Container */}
      <div className="glass-card" style={{ padding: '20px' }}>
        {error ? (
          <div style={{ padding: '16px', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', borderRadius: '8px', fontSize: '0.85rem' }}>
            {error}
          </div>
        ) : isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} color="#6366f1" style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
            <div>Loading security audit records...</div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Clock size={32} color="#475569" style={{ marginBottom: '8px' }} />
            <div style={{ fontWeight: '600' }}>No Audit Records Found</div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-dim)', marginTop: '4px' }}>System actions will automatically be recorded here.</div>
          </div>
        ) : (
          <div className="saas-table-container">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Timestamp</th>
                  <th>Investigator Email</th>
                  <th>Action Event</th>
                  <th>Target Resource</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'monospace', fontWeight: '700', color: 'white' }}>
                      {log.id || `LOG-${idx+1}`}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just Now'}
                    </td>
                    <td style={{ fontWeight: '600', color: 'white' }}>
                      {log.user || 'system'}
                    </td>
                    <td>
                      {getActionBadge(log.action)}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {log.resource || '/'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
