import React, { useState, useEffect } from 'react';
import { Shield, Play, RefreshCw, Search, Bell, Activity, Database, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Navbar({ onRunDetection, isRunning, engineStatus, onOpenSearch }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (onOpenSearch) onOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  return (
    <header style={{
      height: '64px',
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Search Input Trigger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onOpenSearch}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '8px 14px',
            color: 'var(--text-muted)',
            fontSize: '0.825rem',
            cursor: 'pointer',
            width: '320px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <Search size={16} color="#6366f1" />
          <span style={{ flex: 1, textAlign: 'left' }}>Global Command Search...</span>
          <kbd style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', padding: '1px 6px', fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
            Ctrl+K
          </kbd>
        </button>

        {/* Engine Live Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>
          <Activity size={13} />
          <span>{engineStatus || 'Phase 4 ML Engine Ready'}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Detection Run Button */}
        <button
          className="btn-primary"
          onClick={onRunDetection}
          disabled={isRunning}
          style={{ opacity: isRunning ? 0.7 : 1 }}
        >
          {isRunning ? (
            <>
              <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Analyzing Network & ML...</span>
            </>
          ) : (
            <>
              <Play size={15} fill="white" />
              <span>Run Detection Engine</span>
            </>
          )}
        </button>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', position: 'relative' }}
          >
            <Bell size={18} />
            <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }} />
          </button>

          {/* Notifications Dropdown Modal */}
          {notificationsOpen && (
            <div className="glass-panel" style={{ position: 'absolute', right: 0, top: '48px', width: '320px', padding: '16px', zIndex: 110 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '700' }}>Investigation Alerts</h4>
                <span style={{ fontSize: '0.7rem', color: '#6366f1', background: 'rgba(99, 102, 241, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>3 Unread</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.775rem' }}>
                <div style={{ padding: '8px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                  <div style={{ fontWeight: '700', color: '#f43f5e' }}>Critical Collusion Ring Detected</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>Merchant M089 flagged with 4 shared payment identities.</div>
                </div>
                <div style={{ padding: '8px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                  <div style={{ fontWeight: '700', color: '#f59e0b' }}>ML Score Alert (87.5)</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>High refund velocity anomaly predicted by Random Forest.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '12px', borderLeft: '1px solid var(--border-color)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #2dd4bf)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem', color: 'white' }}>
            IR
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: '700', color: 'white' }}>Investigator Lead</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Razorpay Fraud Ops</span>
          </div>
        </div>
      </div>
    </header>
  );
}
