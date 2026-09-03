import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Search, Filter } from 'lucide-react';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Fetch transactions from backend
    fetch('/api/cases')
      .then(res => res.json())
      .then(cases => {
        const txList = [];
        cases.forEach(c => {
          if (c.transactions) {
            c.transactions.forEach(t => txList.push(t));
          }
        });
        setTransactions(txList);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredTxs = transactions.filter(t => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return t.transaction_id.toLowerCase().includes(term) || t.merchant_id.toLowerCase().includes(term) || t.customer_id.toLowerCase().includes(term);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Transaction Evidence Explorer</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Inspect contributing payments, rapid refund indicators, and shared device tags</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Search Tx ID, Merchant, Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: 'var(--bg-card)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 12px', fontSize: '0.875rem', width: '260px' }}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 16px' }}>Tx ID</th>
              <th style={{ padding: '12px 16px' }}>Merchant</th>
              <th style={{ padding: '12px 16px' }}>Customer</th>
              <th style={{ padding: '12px 16px' }}>Amount</th>
              <th style={{ padding: '12px 16px' }}>Type</th>
              <th style={{ padding: '12px 16px' }}>Refund Status</th>
              <th style={{ padding: '12px 16px' }}>Suspicious Indicators</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '24px', textCenter: 'center', color: 'var(--text-muted)' }}>Loading transactions...</td></tr>
            ) : filteredTxs.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '24px', textCenter: 'center', color: 'var(--text-muted)' }}>No transactions matching search query.</td></tr>
            ) : (
              filteredTxs.map((t, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '700', color: '#818cf8' }}>{t.transaction_id}</td>
                  <td style={{ padding: '12px 16px', fontWeight: '600' }}>{t.merchant_id}</td>
                  <td style={{ padding: '12px 16px', fontWeight: '600' }}>{t.customer_id}</td>
                  <td style={{ padding: '12px 16px', fontWeight: '700' }}>₹{t.amount.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: t.transaction_type === 'REFUND' ? '#f43f5e' : '#10b981' }}>{t.transaction_type}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{t.refund_status}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {t.suspicious_indicators && t.suspicious_indicators.map((ind, i) => (
                        <span key={i} style={{ fontSize: '0.7rem', color: '#f59e0b' }}>• {ind}</span>
                      ))}
                    </div>
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
