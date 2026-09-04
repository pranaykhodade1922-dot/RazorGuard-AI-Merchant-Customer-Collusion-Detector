import React, { useState, useEffect } from 'react';
import { Shield, Play, RefreshCw, Search, Bell, Activity, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onRunDetection, isRunning, engineStatus, onOpenSearch }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();

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

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : (user?.email ? user.email.substring(0, 2).toUpperCase() : 'US');

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
          <span>{engineStatus || 'RazorGuard Engine Ready'}</span>
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
                <span style={{ fontSize: '0.7rem', color: '#6366f1', background: 'rgba(99, 102, 241, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>Active System</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.775rem' }}>
                <div style={{ padding: '8px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                  <div style={{ fontWeight: '700', color: '#f43f5e' }}>Critical Collusion Ring Detected</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>High-density cycle pattern flagged by network detector.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill & Dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setProfileOpen(!profileOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '12px', borderLeft: '1px solid var(--border-color)', cursor: 'pointer' }}
          >
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #2dd4bf)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem', color: 'white', overflow: 'hidden' }}>
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {user?.displayName || (user?.email ? user.email.split('@')[0] : 'Authenticated User')}
                <span style={{ fontSize: '0.65rem', background: isAdmin ? 'rgba(99, 102, 241, 0.2)' : 'rgba(45, 212, 191, 0.2)', color: isAdmin ? '#818cf8' : '#2dd4bf', padding: '1px 5px', borderRadius: '4px' }}>
                  {user?.role || 'ANALYST'}
                </span>
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user?.email || 'Authenticated User'}</span>
            </div>
          </div>

          {profileOpen && (
            <div className="glass-panel" style={{ position: 'absolute', right: 0, top: '48px', width: '220px', padding: '12px', zIndex: 110, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '4px' }}>
                Signed in as <strong style={{ color: 'white' }}>{user?.displayName || user?.email || 'User'}</strong>
              </div>
              <button
                className="btn-secondary btn-sm"
                onClick={() => { setProfileOpen(false); logout(); }}
                style={{ width: '100%', justifyContent: 'flex-start', color: '#f43f5e' }}
              >
                <LogOut size={14} color="#f43f5e" />
                <span>Log Out Session</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
