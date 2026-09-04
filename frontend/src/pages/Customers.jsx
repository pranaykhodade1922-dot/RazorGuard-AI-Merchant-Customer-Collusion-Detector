import React, { useState, useEffect } from 'react';
import { fetchCustomers, fetchCustomerDetail } from '../api';
import RiskScoreBadge from '../components/RiskScoreBadge';
import EvidenceList from '../components/EvidenceList';
import { Users, Search, Filter, ArrowLeft, RefreshCw, Mail, Smartphone, CreditCard, ShieldAlert } from 'lucide-react';

export default function Customers({ initialCustomerId, onSelectMerchant }) {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCustomers();
      setCustomers(data || []);
      if (initialCustomerId) {
        const found = (data || []).find(c => c.customer_id === initialCustomerId);
        if (found) selectCustomer(found);
      }
    } catch (err) {
      console.error('Failed fetching customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [initialCustomerId]);

  const selectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    try {
      const det = await fetchCustomerDetail(customer.customer_id);
      setCustomerDetail(det);
    } catch (err) {
      console.error('Failed fetching customer detail:', err);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const name = c.customer_name || c.name || c.customer_id;
    const email = c.email || '';
    const matchesSearch = c.customer_id.toLowerCase().includes(search.toLowerCase()) ||
                          name.toLowerCase().includes(search.toLowerCase()) ||
                          email.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filterRisk === 'CRITICAL') return c.risk_score >= 80;
    if (filterRisk === 'HIGH') return c.risk_score >= 60 && c.risk_score < 80;
    if (filterRisk === 'MEDIUM') return c.risk_score >= 30 && c.risk_score < 60;
    if (filterRisk === 'LOW') return c.risk_score < 30;
    return true;
  });

  if (selectedCustomer) {
    const name = selectedCustomer.customer_name || selectedCustomer.name || selectedCustomer.customer_id;
    const score = selectedCustomer.risk_score || 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn-secondary btn-sm" onClick={() => setSelectedCustomer(null)}>
            <ArrowLeft size={16} />
            <span>Back to Customers Directory</span>
          </button>
          <RiskScoreBadge score={score} />
        </div>

        {/* Customer Workspace Header Card */}
        <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(45, 212, 191, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(45, 212, 191, 0.3)' }}>
              <Users size={24} color="#2dd4bf" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white' }}>{name}</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', marginTop: '2px' }}>
                <span>ID: <strong style={{ color: 'white', fontFamily: 'monospace' }}>{selectedCustomer.customer_id}</strong></span>
                <span>Email: <strong style={{ color: 'white' }}>{selectedCustomer.email || 'customer@mail.com'}</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered Device</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#818cf8', fontFamily: 'monospace' }}>
                {selectedCustomer.device_fingerprint || selectedCustomer.device_id || 'DEV_C_01'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payment Instrument</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#2dd4bf', fontFamily: 'monospace' }}>
                {selectedCustomer.payment_fingerprint || selectedCustomer.payment_id || 'PAY_CARD_01'}
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Identity Fingerprints */}
          <div className="glass-card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '14px' }}>Shared Identity Fingerprints</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ padding: '10px', background: 'var(--bg-subtle)', borderRadius: '6px', fontSize: '0.825rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Hardware Device Hash</div>
                <div style={{ color: '#818cf8', fontWeight: '700', fontFamily: 'monospace', marginTop: '2px' }}>
                  {selectedCustomer.device_fingerprint || 'DEV_FINGERPRINT_91823'}
                </div>
              </div>
              <div style={{ padding: '10px', background: 'var(--bg-subtle)', borderRadius: '6px', fontSize: '0.825rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Payment Identity Fingerprint</div>
                <div style={{ color: '#2dd4bf', fontWeight: '700', fontFamily: 'monospace', marginTop: '2px' }}>
                  {selectedCustomer.payment_fingerprint || 'PAYMENT_FINGERPRINT_00293'}
                </div>
              </div>
              <div style={{ padding: '10px', background: 'var(--bg-subtle)', borderRadius: '6px', fontSize: '0.825rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Network IP Address</div>
                <div style={{ color: '#38bdf8', fontWeight: '700', fontFamily: 'monospace', marginTop: '2px' }}>
                  {selectedCustomer.ip_address || '10.0.14.88'}
                </div>
              </div>
            </div>
          </div>

          {/* Observable Evidence */}
          <div className="glass-card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '14px' }}>Customer Risk Evidence</h3>
            <EvidenceList
              evidence={[
                { type: 'SHARED_PAYMENT_IDENTITY', severity: score >= 80 ? 'CRITICAL' : 'HIGH', explanation: `Customer payment instrument used across multiple distinct merchant accounts.` },
                { type: 'ABNORMAL_REFUND_VELOCITY', severity: 'HIGH', explanation: `High frequency refund requests issued within compressed timeframe.` }
              ]}
            />
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
            <Users size={22} color="#2dd4bf" />
            <span>Customers Risk Directory</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Monitor customer risk indicators, shared hardware device hashes, and payout identities.
          </p>
        </div>

        <button className="btn-secondary btn-sm" onClick={loadCustomers}>
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
            placeholder="Search customer by ID, name, or email..."
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

      {/* Customers Table */}
      <div className="saas-table-container">
        <table className="saas-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Email</th>
              <th>Risk Score</th>
              <th>Device Hash</th>
              <th>Payment Instrument</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Loading customer directory...
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No customers found matching search filters.
                </td>
              </tr>
            ) : (
              filteredCustomers.map(c => {
                const name = c.customer_name || c.name || c.customer_id;
                return (
                  <tr key={c.customer_id} className="clickable-row" onClick={() => selectCustomer(c)}>
                    <td style={{ fontWeight: '700', color: 'white' }}>
                      {name}
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{c.customer_id}</div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.email || 'customer@mail.com'}</td>
                    <td><RiskScoreBadge score={c.risk_score} /></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.775rem', color: '#818cf8' }}>{c.device_fingerprint || 'DEV_C_01'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.775rem', color: '#2dd4bf' }}>{c.payment_fingerprint || 'PAY_CARD_01'}</td>
                    <td>
                      <button className="btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); selectCustomer(c); }}>
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
