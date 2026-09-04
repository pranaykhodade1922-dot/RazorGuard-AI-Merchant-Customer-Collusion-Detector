import React, { useState, useEffect } from 'react';
import { fetchMerchants, fetchMerchantDetail, fetchCases } from '../api';
import RiskScoreBadge from '../components/RiskScoreBadge';
import RiskBreakdownCard from '../components/RiskBreakdownCard';
import MLExplainabilityCard from '../components/MLExplainabilityCard';
import EvidenceList from '../components/EvidenceList';
import { Store, Search, Filter, ShieldAlert, ArrowLeft, RefreshCw, CreditCard, Users, Smartphone, Globe, Activity } from 'lucide-react';

export default function Merchants({ initialMerchantId, onSelectCase, onSelectCustomer }) {
  const [merchants, setMerchants] = useState([]);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [merchantDetail, setMerchantDetail] = useState(null);
  const [merchantCases, setMerchantCases] = useState([]);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadMerchants = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMerchants();
      setMerchants(data || []);
      if (initialMerchantId) {
        const found = (data || []).find(m => m.merchant_id === initialMerchantId);
        if (found) selectMerchant(found);
      }
    } catch (err) {
      console.error('Failed fetching merchants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMerchants();
  }, [initialMerchantId]);

  const selectMerchant = async (merchant) => {
    setSelectedMerchant(merchant);
    try {
      const det = await fetchMerchantDetail(merchant.merchant_id);
      setMerchantDetail(det);
      const cases = await fetchCases();
      setMerchantCases((cases || []).filter(c => c.merchant_id === merchant.merchant_id));
    } catch (err) {
      console.error('Failed fetching merchant detail:', err);
    }
  };

  const filteredMerchants = merchants.filter(m => {
    const name = m.merchant_name || m.name || m.merchant_id;
    const cat = m.category || '';
    const matchesSearch = m.merchant_id.toLowerCase().includes(search.toLowerCase()) ||
                          name.toLowerCase().includes(search.toLowerCase()) ||
                          cat.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filterRisk === 'CRITICAL') return m.risk_score >= 80;
    if (filterRisk === 'HIGH') return m.risk_score >= 60 && m.risk_score < 80;
    if (filterRisk === 'MEDIUM') return m.risk_score >= 30 && m.risk_score < 60;
    if (filterRisk === 'LOW') return m.risk_score < 30;
    return true;
  });

  if (selectedMerchant) {
    const name = selectedMerchant.merchant_name || selectedMerchant.name || selectedMerchant.merchant_id;
    const score = selectedMerchant.risk_score || 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Back Button Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn-secondary btn-sm" onClick={() => setSelectedMerchant(null)}>
            <ArrowLeft size={16} />
            <span>Back to Merchants Directory</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Merchant Workspace</span>
            <RiskScoreBadge score={score} />
          </div>
        </div>

        {/* Merchant Workspace Header Banner */}
        <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <Store size={24} color="#6366f1" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white' }}>{name}</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', marginTop: '2px' }}>
                <span>ID: <strong style={{ color: 'white', fontFamily: 'monospace' }}>{selectedMerchant.merchant_id}</strong></span>
                <span>Category: <strong style={{ color: 'white' }}>{selectedMerchant.category || 'Retail'}</strong></span>
                <span>City: <strong style={{ color: 'white' }}>{selectedMerchant.city || 'India'}</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered Device</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#818cf8', fontFamily: 'monospace' }}>
                {selectedMerchant.registered_device_id || 'DEV_M_01'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payout UPI</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#2dd4bf', fontFamily: 'monospace' }}>
                {selectedMerchant.payout_upi || 'merchant@upi'}
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Main Workspace */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
          {/* Left Column: Risk & Evidence Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <RiskBreakdownCard
              finalRiskScore={score}
              transactionRiskScore={score * 0.9}
              networkRiskScore={score}
              mlRiskScore={score * 0.85}
            />

            <MLExplainabilityCard
              mlRiskScore={score * 0.85}
              modelVersion="1.0.0-rf-synthetic"
              algorithm="RandomForestClassifier"
              topFeatures={[
                { feature: 'network_risk_score', value: score, importance: 0.18, reason: 'High network graph topology collusion score flagged.' },
                { feature: 'refund_ratio', value: 0.35, importance: 0.12, reason: 'Abnormally elevated refund ratio detected.' },
                { feature: 'repeated_relationship_count', value: 3.0, importance: 0.11, reason: 'Repeated high-frequency suspicious transactions with same customer ring.' }
              ]}
            />

            {/* Risk Evidence */}
            <div className="glass-card">
              <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '14px' }}>Observable Risk Evidence</h3>
              <EvidenceList
                evidence={[
                  { type: 'CIRCULAR_COLLUSION_PATTERN', severity: score >= 80 ? 'CRITICAL' : 'HIGH', explanation: `Merchant transacted in high-density cycle pattern with suspicious customer cluster.` },
                  { type: 'SHARED_PAYMENT_IDENTITY', severity: 'HIGH', explanation: `Linked customer accounts share identical payout UPI destination.` }
                ]}
              />
            </div>
          </div>

          {/* Right Column: Statistics & Cases */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Quick Metrics */}
            <div className="glass-card">
              <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '12px' }}>Merchant Statistics</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Registered IP</span>
                  <span style={{ fontFamily: 'monospace', color: 'white' }}>{selectedMerchant.registered_ip || '10.0.1.42'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Active Cases</span>
                  <span style={{ fontWeight: '700', color: merchantCases.length > 0 ? '#f43f5e' : '#10b981' }}>{merchantCases.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', padding: '8px 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status</span>
                  <span style={{ fontWeight: '700', color: score >= 80 ? '#f43f5e' : '#10b981' }}>
                    {score >= 80 ? 'UNDER SANCTION' : 'ACTIVE MONITORING'}
                  </span>
                </div>
              </div>
            </div>

            {/* Related Investigation Cases */}
            <div className="glass-card">
              <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={16} color="#f43f5e" />
                <span>Active Cases ({merchantCases.length})</span>
              </h4>
              {merchantCases.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>No active investigation cases for this merchant.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {merchantCases.map(c => (
                    <div
                      key={c.case_id}
                      onClick={() => onSelectCase && onSelectCase(c.case_id)}
                      style={{ padding: '10px', background: 'var(--bg-subtle)', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-subtle)' }}
                    >
                      <div style={{ fontSize: '0.825rem', fontWeight: '700', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{c.case_id}</span>
                        <RiskScoreBadge score={c.risk_score} level={c.risk_level} size="sm" />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Status: <strong style={{ color: '#818cf8' }}>{c.status}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            <Store size={22} color="#6366f1" />
            <span>Merchants Risk Directory</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Investigate merchant risk profiles, transaction concentrations, and collusion indicators.
          </p>
        </div>

        <button className="btn-secondary btn-sm" onClick={loadMerchants}>
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px', background: '#0f172a', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search merchant by ID, name, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: '0.85rem', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={14} color="#94a3b8" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Risk Filter:</span>
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            style={{ background: '#0f172a', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.8rem' }}
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CRITICAL">Critical (80+)</option>
            <option value="HIGH">High (60-79)</option>
            <option value="MEDIUM">Medium (30-59)</option>
            <option value="LOW">Low (0-29)</option>
          </select>
        </div>
      </div>

      {/* Merchants Table */}
      <div className="saas-table-container">
        <table className="saas-table">
          <thead>
            <tr>
              <th>Merchant</th>
              <th>Category</th>
              <th>Risk Score</th>
              <th>Registered Device</th>
              <th>Payout UPI</th>
              <th>City</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Loading merchant directory...
                </td>
              </tr>
            ) : filteredMerchants.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No merchants found matching search filters.
                </td>
              </tr>
            ) : (
              filteredMerchants.map(m => {
                const name = m.merchant_name || m.name || m.merchant_id;
                return (
                  <tr key={m.merchant_id} className="clickable-row" onClick={() => selectMerchant(m)}>
                    <td style={{ fontWeight: '700', color: 'white' }}>
                      {name}
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{m.merchant_id}</div>
                    </td>
                    <td>{m.category || 'Retail'}</td>
                    <td><RiskScoreBadge score={m.risk_score} /></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.775rem', color: '#818cf8' }}>{m.registered_device_id || 'DEV_01'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.775rem', color: '#2dd4bf' }}>{m.payout_upi || 'upi@bank'}</td>
                    <td>{m.city || 'India'}</td>
                    <td>
                      <button className="btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); selectMerchant(m); }}>
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
  );
}
