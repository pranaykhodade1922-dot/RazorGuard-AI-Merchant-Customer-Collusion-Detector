import React, { useState, useEffect } from 'react';
import { fetchTransactions, fetchTransactionDetail, fetchMLScore } from '../api';
import RiskScoreBadge from '../components/RiskScoreBadge';
import RiskBreakdownCard from '../components/RiskBreakdownCard';
import MLExplainabilityCard from '../components/MLExplainabilityCard';
import EvidenceList from '../components/EvidenceList';
import { CreditCard, Search, Filter, RefreshCw, X, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';

export default function Transactions({ onSelectMerchant, onSelectCustomer, onSelectCase }) {
  const [transactions, setTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [mlScoreData, setMlScoreData] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTransactions(100);
      setTransactions(data || []);
    } catch (err) {
      console.error('Failed fetching transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const openTransactionDetail = async (tx) => {
    setSelectedTx(tx);
    try {
      // Calculate ML Score for transaction
      const mlRes = await fetchMLScore({
        merchant_id: tx.merchant_id,
        customer_id: tx.customer_id,
        transaction_id: tx.transaction_id,
        transaction_data: tx
      });
      setMlScoreData(mlRes);
    } catch (err) {
      console.error('Failed fetching ML score for transaction:', err);
    }
  };

  const filteredTxs = transactions.filter(tx => {
    const matchesSearch = tx.transaction_id.toLowerCase().includes(search.toLowerCase()) ||
                          tx.merchant_id.toLowerCase().includes(search.toLowerCase()) ||
                          tx.customer_id.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filterStatus === 'REFUNDED') return tx.refund_status === 'REFUNDED';
    if (filterStatus === 'FAILED') return tx.status === 'FAILED';
    if (filterStatus === 'SUCCESS') return tx.status === 'SUCCESS';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={22} color="#fbbf24" />
            <span>Transaction Risk Workspace</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Inspect raw transactions, refund velocity, shared payment identity signals, and ML risk scores.
          </p>
        </div>

        <button className="btn-secondary btn-sm" onClick={loadTransactions}>
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
            placeholder="Search by Transaction ID (TX_...), Merchant ID (M...), or Customer ID (C...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: '0.85rem', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={14} color="#94a3b8" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status Filter:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ background: '#0f172a', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.8rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="REFUNDED">Refunded Transactions</option>
            <option value="SUCCESS">Successful</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="saas-table-container">
        <table className="saas-table">
          <thead>
            <tr>
              <th>Tx ID</th>
              <th>Merchant</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Refund Status</th>
              <th>Tx Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Loading transactions...
                </td>
              </tr>
            ) : filteredTxs.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No transactions found matching search criteria.
                </td>
              </tr>
            ) : (
              filteredTxs.map(tx => {
                const isRefunded = tx.refund_status === 'REFUNDED';
                return (
                  <tr key={tx.transaction_id} className="clickable-row" onClick={() => openTransactionDetail(tx)}>
                    <td style={{ fontFamily: 'monospace', fontWeight: '700', color: 'white' }}>{tx.transaction_id}</td>
                    <td>
                      <span
                        onClick={(e) => { e.stopPropagation(); if (onSelectMerchant) onSelectMerchant(tx.merchant_id); }}
                        style={{ color: '#818cf8', fontWeight: '600', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        {tx.merchant_id}
                      </span>
                    </td>
                    <td>
                      <span
                        onClick={(e) => { e.stopPropagation(); if (onSelectCustomer) onSelectCustomer(tx.customer_id); }}
                        style={{ color: '#2dd4bf', fontWeight: '600', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        {tx.customer_id}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700', color: 'white' }}>₹{Number(tx.amount || 0).toLocaleString()}</td>
                    <td>
                      <span style={{ fontSize: '0.725rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: isRefunded ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: isRefunded ? '#f43f5e' : '#10b981' }}>
                        {tx.refund_status || 'NORMAL'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.725rem', color: tx.status === 'SUCCESS' ? '#10b981' : '#f59e0b' }}>
                        ● {tx.status || 'SUCCESS'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); openTransactionDetail(tx); }}>
                        Inspect Risk
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Transaction Detail Workspace Modal */}
      {selectedTx && (
        <div className="modal-overlay" onClick={() => setSelectedTx(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', pb: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'white' }}>Transaction Detail & Risk Intelligence</h3>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  ID: <code style={{ color: '#fbbf24' }}>{selectedTx.transaction_id}</code>
                </div>
              </div>
              <button onClick={() => setSelectedTx(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Overview Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: 'var(--bg-subtle)', padding: '14px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Amount</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'white' }}>₹{Number(selectedTx.amount || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Merchant</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#818cf8', cursor: 'pointer' }} onClick={() => { setSelectedTx(null); if (onSelectMerchant) onSelectMerchant(selectedTx.merchant_id); }}>
                    {selectedTx.merchant_id}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Customer</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#2dd4bf', cursor: 'pointer' }} onClick={() => { setSelectedTx(null); if (onSelectCustomer) onSelectCustomer(selectedTx.customer_id); }}>
                    {selectedTx.customer_id}
                  </div>
                </div>
              </div>

              {/* Risk Breakdown & ML Explainability */}
              {mlScoreData ? (
                <>
                  <RiskBreakdownCard
                    finalRiskScore={mlScoreData.final_risk_score ?? mlScoreData.ml_risk_score}
                    finalRiskLevel={mlScoreData.final_risk_level ?? mlScoreData.ml_risk_level ?? 'LOW'}
                    transactionRiskScore={mlScoreData.transaction_risk_score ?? 0}
                    networkRiskScore={mlScoreData.network_risk_score ?? 0}
                    mlRiskScore={mlScoreData.ml_risk_score ?? 0}
                    breakdown={mlScoreData.scoring_breakdown || []}
                  />

                  <MLExplainabilityCard
                    mlRiskScore={mlScoreData.ml_risk_score}
                    modelVersion={mlScoreData.model_version}
                    algorithm={mlScoreData.algorithm}
                    topFeatures={mlScoreData.top_features}
                  />
                </>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Calculating real-time ML risk score & explainability...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
