import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, ShieldAlert, Lock, RefreshCw } from 'lucide-react';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, isLoading, isAdmin, user } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#070a12',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        gap: '16px'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
        }}>
          <Shield size={30} color="white" />
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
          RazorGuard <span style={{ color: '#6366f1' }}>AI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Verifying Security Token & Authentication State...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Parent App component will render Login screen
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div style={{ padding: '40px 24px', display: 'flex', justifyContent: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '520px', padding: '32px', textAlign: 'center', borderLeft: '4px solid #f43f5e' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Lock size={24} color="#f43f5e" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white', marginBottom: '8px' }}>
            Restricted Action (Admin Authorization Required)
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Your account (<code style={{ color: '#818cf8' }}>{user?.email}</code>) currently has the role <strong style={{ color: '#fbbf24' }}>{user?.role || 'ANALYST'}</strong>. Changing system configuration or running dataset ingestion requires an <strong style={{ color: '#6366f1' }}>ADMIN</strong> role.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
