import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, UserCheck, ShieldAlert, AlertCircle, ArrowRight, X } from 'lucide-react';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export default function GoogleRoleSetupModal() {
  const { pendingGoogleUser, completeGoogleRegistration, cancelGoogleRegistration } = useAuth();
  const [selectedRole, setSelectedRole] = useState('ANALYST');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!pendingGoogleUser) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await completeGoogleRegistration(selectedRole);
    } catch (err) {
      setError(err.message || 'Failed to set account role.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(7, 10, 18, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '500px',
        padding: '32px',
        border: '1px solid rgba(99, 102, 241, 0.35)',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
        position: 'relative'
      }}>
        {/* Close / Cancel Button */}
        <button
          type="button"
          onClick={cancelGoogleRegistration}
          style={{
            position: 'absolute',
            right: '16px',
            top: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <GoogleIcon />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'white', margin: 0 }}>
            Complete Google Registration
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Select your account role for RazorGuard SaaS
          </p>
        </div>

        {/* User Identity Preview */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          {pendingGoogleUser.photoURL ? (
            <img
              src={pendingGoogleUser.photoURL}
              alt={pendingGoogleUser.displayName}
              style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #6366f1' }}
            />
          ) : (
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#6366f1',
              color: 'white',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem'
            }}>
              {(pendingGoogleUser.displayName || 'G')[0].toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'white', truncate: 'true', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pendingGoogleUser.displayName}
            </div>
            <div style={{ fontSize: '0.785rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pendingGoogleUser.email}
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            borderRadius: '8px',
            color: '#f43f5e',
            fontSize: '0.825rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '700', color: 'white', marginBottom: '10px' }}>
              Create account as
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Analyst Option */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px',
                borderRadius: '10px',
                background: selectedRole === 'ANALYST' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                border: `1.5px solid ${selectedRole === 'ANALYST' ? '#6366f1' : 'var(--border-color)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
                <input
                  type="radio"
                  name="googleRole"
                  value="ANALYST"
                  checked={selectedRole === 'ANALYST'}
                  onChange={() => setSelectedRole('ANALYST')}
                  style={{ marginTop: '3px', accentColor: '#6366f1' }}
                />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserCheck size={16} color="#38bdf8" />
                    <span>Analyst</span>
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.4' }}>
                    Investigate fraud alerts, explore network graph, search entities, and view collusion metrics.
                  </div>
                </div>
              </label>

              {/* Admin Option */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px',
                borderRadius: '10px',
                background: selectedRole === 'ADMIN' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                border: `1.5px solid ${selectedRole === 'ADMIN' ? '#6366f1' : 'var(--border-color)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
                <input
                  type="radio"
                  name="googleRole"
                  value="ADMIN"
                  checked={selectedRole === 'ADMIN'}
                  onChange={() => setSelectedRole('ADMIN')}
                  style={{ marginTop: '3px', accentColor: '#6366f1' }}
                />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={16} color="#6366f1" />
                    <span>Admin</span>
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.4' }}>
                    Full platform control, CSV data ingestion, status updates, ML model retraining, and system logs.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={cancelGoogleRegistration}
              className="btn-secondary"
              style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ flex: 2, padding: '10px', justifyContent: 'center' }}
            >
              {isSubmitting ? (
                <span>Registering Profile...</span>
              ) : (
                <>
                  <span>Create Account & Continue</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
