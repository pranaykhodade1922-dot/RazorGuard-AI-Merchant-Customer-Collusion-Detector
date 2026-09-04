import React, { useState, useEffect } from 'react';
import { fetchCases, fetchCaseDetail, updateCaseStatus, addCaseNote } from '../api';
import RiskScoreBadge from '../components/RiskScoreBadge';
import EvidenceList from '../components/EvidenceList';
import { ShieldAlert, Search, Filter, RefreshCw, ArrowLeft, MessageSquare, CheckCircle, AlertTriangle, Clock, Send, X } from 'lucide-react';

export default function RiskCases({ initialCaseId, onSelectMerchant }) {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDetail, setCaseDetail] = useState(null);
  const [activeStatusTab, setActiveStatusTab] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [search, setSearch] = useState('');
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadCases = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCases();
      setCases(data || []);
      if (initialCaseId) {
        const found = (data || []).find(c => c.case_id === initialCaseId);
        if (found) selectCase(found);
      }
    } catch (err) {
      console.error('Failed fetching cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [initialCaseId]);

  const selectCase = async (caseObj) => {
    setSelectedCase(caseObj);
    try {
      const det = await fetchCaseDetail(caseObj.case_id);
      setCaseDetail(det);
    } catch (err) {
      console.error('Failed fetching case detail:', err);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedCase) return;
    try {
      const updated = await updateCaseStatus(selectedCase.case_id, newStatus);
      setSelectedCase(updated);
      setCaseDetail(updated);
      loadCases();
    } catch (err) {
      console.error('Failed updating case status:', err);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedCase) return;
    setIsSubmitting(true);
    try {
      await addCaseNote(selectedCase.case_id, newNote.trim());
      setNewNote('');
      const det = await fetchCaseDetail(selectedCase.case_id);
      setCaseDetail(det);
    } catch (err) {
      console.error('Failed adding note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCases = cases.filter(c => {
    const title = c.title || c.merchant_name || '';
    const matchesSearch = c.case_id.toLowerCase().includes(search.toLowerCase()) ||
                          c.merchant_id.toLowerCase().includes(search.toLowerCase()) ||
                          title.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    if (activeStatusTab !== 'ALL' && c.status !== activeStatusTab) return false;
    if (filterSeverity !== 'ALL' && c.risk_level !== filterSeverity) return false;
    return true;
  });

  if (selectedCase) {
    const detail = caseDetail || selectedCase;
    const notes = detail.investigator_notes || [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn-secondary btn-sm" onClick={() => { setSelectedCase(null); setCaseDetail(null); }}>
            <ArrowLeft size={16} />
            <span>Back to Case Management Directory</span>
          </button>
          <RiskScoreBadge score={detail.risk_score} level={detail.risk_level} />
        </div>

        {/* Case Detail Header Banner */}
        <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white' }}>{detail.case_id}</h2>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                {detail.status}
              </span>
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Merchant: <strong style={{ color: 'white' }}>{detail.merchant_name || detail.merchant_id}</strong> ({detail.merchant_id})
            </div>
          </div>

          {/* Status Transitions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn-secondary btn-sm" onClick={() => handleUpdateStatus('UNDER_REVIEW')}>
              Under Review
            </button>
            <button className="btn-primary btn-sm" style={{ background: '#f43f5e' }} onClick={() => handleUpdateStatus('CONFIRMED_FRAUD')}>
              Confirm Fraud
            </button>
            <button className="btn-secondary btn-sm" onClick={() => handleUpdateStatus('FALSE_POSITIVE')}>
              Dismiss False Positive
            </button>
            <button className="btn-secondary btn-sm" onClick={() => handleUpdateStatus('CLOSED')}>
              Close Case
            </button>
          </div>
        </div>

        {/* 2-Column Case Details Workspace */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
          {/* Left Column: Evidence & Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Risk Evidence */}
            <div className="glass-card">
              <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '14px' }}>Case Evidence Breakdown</h3>
              <EvidenceList evidence={detail.evidence || detail.score_breakdown || []} />
            </div>

            {/* Investigator Notes */}
            <div className="glass-card">
              <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} color="#6366f1" />
                <span>Investigator Notes & Audit Log ({notes.length})</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {notes.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                    No investigator notes added yet. Record your findings below.
                  </div>
                ) : (
                  notes.map((note, idx) => (
                    <div key={idx} style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                      <p style={{ fontSize: '0.825rem', color: 'white', lineHeight: '1.4' }}>{note.note}</p>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px', textAlign: 'right' }}>
                        {note.created_at ? new Date(note.created_at).toLocaleString() : 'Investigator Entry'}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Record investigation note or evidence verification..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  style={{ flex: 1, background: '#0f172a', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px', color: 'white', fontSize: '0.825rem', outline: 'none' }}
                />
                <button type="submit" className="btn-primary btn-sm" disabled={isSubmitting}>
                  <Send size={14} />
                  <span>Add Note</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Case Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-card">
              <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '12px' }}>Case Attributes</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.825rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Merchant ID</span>
                  <span style={{ color: '#818cf8', fontWeight: '700', fontFamily: 'monospace', cursor: 'pointer' }} onClick={() => onSelectMerchant && onSelectMerchant(detail.merchant_id)}>
                    {detail.merchant_id}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Risk Level</span>
                  <span style={{ fontWeight: '700', color: detail.risk_level === 'CRITICAL' ? '#f43f5e' : '#f59e0b' }}>{detail.risk_level}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Score</span>
                  <span style={{ fontWeight: '800', color: 'white' }}>{detail.risk_score} / 100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={22} color="#f43f5e" />
            <span>Fraud Investigation Case Management</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Track, review, escalate, and resolve suspicious merchant collusion cases.
          </p>
        </div>

        <button className="btn-secondary btn-sm" onClick={loadCases}>
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Status Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', pb: '8px', overflowX: 'auto' }}>
        {['ALL', 'NEW', 'UNDER_REVIEW', 'CONFIRMED_FRAUD', 'FALSE_POSITIVE', 'CLOSED'].map(status => (
          <button
            key={status}
            onClick={() => setActiveStatusTab(status)}
            style={{
              background: activeStatusTab === status ? '#6366f1' : 'transparent',
              color: activeStatusTab === status ? 'white' : 'var(--text-muted)',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px', background: '#0f172a', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by Case ID (CASE-...), Merchant ID, or Title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: '0.85rem', width: '100%' }}
          />
        </div>
      </div>

      {/* Cases Table */}
      <div className="saas-table-container">
        <table className="saas-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Merchant</th>
              <th>Risk Score</th>
              <th>Status</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Loading investigation cases...
                </td>
              </tr>
            ) : filteredCases.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No investigation cases found matching search criteria.
                </td>
              </tr>
            ) : (
              filteredCases.map(c => (
                <tr key={c.case_id} className="clickable-row" onClick={() => selectCase(c)}>
                  <td style={{ fontFamily: 'monospace', fontWeight: '700', color: 'white' }}>{c.case_id}</td>
                  <td>
                    <span style={{ fontWeight: '600', color: '#818cf8' }}>{c.merchant_name || c.merchant_id}</span>
                  </td>
                  <td><RiskScoreBadge score={c.risk_score} level={c.risk_level} /></td>
                  <td>
                    <span style={{ fontSize: '0.725rem', fontWeight: '700', color: '#6366f1', background: 'rgba(99, 102, 241, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Active'}
                  </td>
                  <td>
                    <button className="btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); selectCase(c); }}>
                      Open Workspace
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
