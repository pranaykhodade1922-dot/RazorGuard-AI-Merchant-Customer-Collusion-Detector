import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export default function Register({ onSwitchToLogin }) {
  const { register, loginWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('ANALYST');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // Simple dynamic password strength calculator
  const calculateStrength = (pass) => {
    let score = 0;
    if (!pass) return { score: 0, label: 'None', color: '#64748b' };
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;

    if (score <= 25) return { score: 25, label: 'Weak', color: '#f43f5e' };
    if (score <= 50) return { score: 50, label: 'Fair', color: '#f59e0b' };
    if (score <= 75) return { score: 75, label: 'Good', color: '#38bdf8' };
    return { score: 100, label: 'Strong', color: '#10b981' };
  };

  const strength = calculateStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all required registration fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await register(name, email, password, role);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #070a12 70%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      color: 'white'
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.45)'
          }}>
            <Shield size={30} color="white" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.03em' }}>
            RazorGuard <span style={{ color: '#6366f1' }}>AI</span>
          </h1>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Create Investigator Account & Access SaaS Platform
          </p>
        </div>

        {/* Register Card */}
        <div className="glass-card" style={{ padding: '28px', border: '1px solid rgba(99, 102, 241, 0.25)', boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6)' }}>
          <div style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Registration Form</h2>
            <span style={{ fontSize: '0.7rem', color: '#6366f1', background: 'rgba(99, 102, 241, 0.15)', padding: '2px 8px', borderRadius: '12px' }}>
              Phase 6 RBAC
            </span>
          </div>

          {error && (
            <div style={{
              padding: '12px',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              borderRadius: '8px',
              color: '#f43f5e',
              fontSize: '0.8rem',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Pranay Khodade"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px 12px 8px 38px',
                    color: 'white',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Work Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  placeholder="pranay@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px 12px 8px 38px',
                    color: 'white',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                  required
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Account Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'white',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                <option value="ANALYST">ANALYST — Read, Investigate & View Analytics</option>
                <option value="ADMIN">ADMIN — Full System Access, Status Updates & Dataset Uploads</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px 38px 8px 38px',
                    color: 'white',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '2px' }}>
                    <span>Strength:</span>
                    <span style={{ color: strength.color, fontWeight: '700' }}>{strength.label}</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${strength.score}%`, height: '100%', background: strength.color, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px 12px 8px 38px',
                    color: 'white',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || isGoogleSubmitting}
              style={{ width: '100%', padding: '10px', fontSize: '0.875rem', justifyContent: 'center', marginTop: '6px' }}
            >
              {isSubmitting ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <span>Create Account & Log In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0 14px', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '600', textTransform: 'lowercase' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
          </div>

          {/* Continue with Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || isGoogleSubmitting}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '0.85rem',
              fontWeight: '600',
              borderRadius: '8px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: isSubmitting || isGoogleSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {isGoogleSubmitting ? (
              <span>Signing in with Google...</span>
            ) : (
              <>
                <GoogleIcon />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Switch to Login link */}
          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              style={{ background: 'transparent', border: 'none', color: '#818cf8', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
