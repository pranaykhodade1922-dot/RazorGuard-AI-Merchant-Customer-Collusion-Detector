import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Store, User, CreditCard, ShieldAlert, ChevronRight, Loader2 } from 'lucide-react';
import { fetchGlobalSearch } from '../api';
import RiskScoreBadge from './RiskScoreBadge';

export default function SearchModal({ isOpen, onClose, onSelectResult }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query || query.trim().length === 0) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetchGlobalSearch(query);
        setResults(res || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'MERCHANT': return <Store size={16} color="#818cf8" />;
      case 'CUSTOMER': return <User size={16} color="#2dd4bf" />;
      case 'TRANSACTION': return <CreditCard size={16} color="#fbbf24" />;
      case 'CASE': return <ShieldAlert size={16} color="#f43f5e" />;
      default: return <Search size={16} color="#94a3b8" />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', padding: '0', overflow: 'hidden' }}>
        {/* Search Input Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', background: '#0f172a' }}>
          <Search size={20} color="#6366f1" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search merchants, customers, transactions (TX_...), cases (CASE-...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          />
          {isLoading && <Loader2 size={18} color="#6366f1" className="spinner" style={{ animation: 'spin 1s linear infinite' }} />}
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '12px' }}>
          {query.trim().length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              Type a Merchant ID (e.g. <code style={{ color: '#818cf8' }}>M089</code>), Customer ID (<code style={{ color: '#2dd4bf' }}>C002</code>), Transaction ID, or Case ID.
            </div>
          ) : results.length === 0 && !isLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No matching entity or case found for "<strong style={{ color: 'white' }}>{query}</strong>".
            </div>
          ) : (
            results.map((res, i) => (
              <div
                key={i}
                onClick={() => {
                  if (onSelectResult) onSelectResult(res);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginBottom: '4px',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', background: '#0f172a', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    {getTypeIcon(res.type)}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {res.title}
                      <span style={{ fontSize: '0.675rem', color: 'var(--text-dim)', background: '#1e293b', padding: '1px 6px', borderRadius: '4px' }}>{res.type}</span>
                    </div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {res.subtitle}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {res.risk_score !== undefined && <RiskScoreBadge score={res.risk_score} size="sm" />}
                  <ChevronRight size={16} color="var(--text-dim)" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
