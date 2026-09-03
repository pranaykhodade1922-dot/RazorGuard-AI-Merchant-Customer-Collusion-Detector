import React, { useState, useEffect } from 'react';
import { fetchCases, fetchCaseDetail, updateCaseStatus, addCaseNote } from '../api';
import { ShieldAlert, FileText, Send, X, Check, ArrowRight } from 'lucide-react';

export default function RiskCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  const [selectedCase, setSelectedCase] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadCases = async () => {
    setLoading(true);
    try {
      const data = await fetchCases(statusFilter, levelFilter);
      setCases(data);
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [statusFilter, levelFilter]);

  const handleOpenCase = async (caseId) => {
    try {
      const detail = await fetchCaseDetail(caseId);
      setSelectedCase(detail);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedCase) return;
    setUpdating(true);
    try {
      const updated = await updateCaseStatus(selectedCase.case_id, newStatus);
      setSelectedCase(updated);
      loadCases();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!selectedCase || !newNoteText.trim()) return;
    try {
      await addCaseNote(selectedCase.case_id, newNoteText);
      const detail = await fetchCaseDetail(selectedCase.case_id);
      setSelectedCase(detail);
      setNewNoteText('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Collusion Risk Cases</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Investigation case management and evidence breakdown</p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ background: 'var(--bg-card)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 12px', fontSize: '0.875rem' }}
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="CONFIRMED_FRAUD">Confirmed Fraud</option>
            <option value="FALSE_POSITIVE">False Positive</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            style={{ background: 'var(--bg-card)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 12px', fontSize: '0.875rem' }}
          >
            <option value="">All Risk Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 16px' }}>Case ID</th>
              <th style={{ padding: '12px 16px' }}>Merchant</th>
              <th style={{ padding: '12px 16px' }}>Risk Score</th>
              <th style={{ padding: '12px 16px' }}>Risk Level</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Connected Customers</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '24px', textCenter: 'center', color: 'var(--text-muted)' }}>Loading cases...</td></tr>
            ) : cases.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '24px', textCenter: 'center', color: 'var(--text-muted)' }}>No investigation cases found.</td></tr>
            ) : (
              cases.map((c) => (
                <tr key={c.case_id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }} className="table-row-hover">
                  <td style={{ padding: '12px 16px', fontWeight: '700', color: '#818cf8' }}>{c.case_id}</td>
                  <td style={{ padding: '12px 16px', fontWeight: '600' }}>{c.merchant_name} <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>({c.merchant_id})</span></td>
                  <td style={{ padding: '12px 16px', fontWeight: '800' }}>{Math.round(c.risk_score)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`badge badge-${c.risk_level.toLowerCase()}`}>{c.risk_level}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 8px', borderRadius: '4px', background: '#334155', color: '#e2e8f0' }}>{c.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                    {c.customer_ids ? c.customer_ids.join(', ') : (c.connected_customers ? c.connected_customers.join(', ') : '-')}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button className="btn-secondary btn-sm" onClick={() => handleOpenCase(c.case_id)}>
                      Inspect Case <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Case Details Drawer Modal */}
      {selectedCase && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '640px', background: 'var(--bg-dark)', height: '100%', overflowY: 'auto', padding: '24px', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className={`badge badge-${selectedCase.risk_level.toLowerCase()}`}>{selectedCase.risk_level} RISK</span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '4px' }}>{selectedCase.case_id}: {selectedCase.merchant_name}</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Merchant ID: {selectedCase.merchant_id} • Score: {selectedCase.risk_score}/100</div>
              </div>
              <button className="btn-secondary btn-sm" onClick={() => setSelectedCase(null)}><X size={16} /></button>
            </div>

            {/* Status Change Bar */}
            <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Current Status: <span style={{ color: '#818cf8' }}>{selectedCase.status}</span></span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn-secondary btn-sm" onClick={() => handleStatusChange('UNDER_REVIEW')} disabled={updating}>Review</button>
                <button className="btn-secondary btn-sm" onClick={() => handleStatusChange('CONFIRMED_FRAUD')} disabled={updating} style={{ color: '#f43f5e' }}>Confirm Fraud</button>
                <button className="btn-secondary btn-sm" onClick={() => handleStatusChange('FALSE_POSITIVE')} disabled={updating} style={{ color: '#10b981' }}>False Positive</button>
              </div>
            </div>

            {/* Evidence Explanations */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '10px', color: '#818cf8' }}>Structured Evidence Explanations</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedCase.evidence && selectedCase.evidence.length > 0 ? (
                  selectedCase.evidence.map((ev, i) => (
                    <div key={i} style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '8px', borderLeft: `3px solid ${ev.severity === 'CRITICAL' ? '#f43f5e' : (ev.severity === 'HIGH' ? '#f59e0b' : '#6366f1')}`, fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: '600', marginBottom: '2px' }}>{ev.explanation}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Signal: {ev.signal} • Severity: {ev.severity}</div>
                    </div>
                  ))
                ) : (
                  selectedCase.evidence_summary && selectedCase.evidence_summary.map((ev, i) => (
                    <div key={i} style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>{ev}</div>
                  ))
                )}
              </div>
            </div>

            {/* Risk Score Breakdown */}
            {selectedCase.score_breakdown && selectedCase.score_breakdown.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '10px', color: '#818cf8' }}>Score Breakdown</h4>
                <div className="glass-panel" style={{ padding: '12px' }}>
                  {selectedCase.score_breakdown.map((sb, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                      <span style={{ color: '#cbd5e1' }}>{sb.signal}</span>
                      <span style={{ fontWeight: '700', color: '#818cf8' }}>+{Math.round(sb.contribution)} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Investigator Notes */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '10px', color: '#818cf8' }}>Investigator Notes</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {selectedCase.investigator_notes && selectedCase.investigator_notes.length > 0 ? (
                  selectedCase.investigator_notes.map((n) => (
                    <div key={n.note_id} style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <div>{n.note}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No investigator notes added yet.</div>
                )}
              </div>

              <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Add an investigator note..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  style={{ flex: 1, background: 'var(--bg-card)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem' }}
                />
                <button type="submit" className="btn-primary btn-sm"><Send size={14} /> Add Note</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
