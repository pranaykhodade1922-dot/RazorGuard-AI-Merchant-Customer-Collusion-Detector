import React from 'react';
import { Shield, Play, RefreshCw, Zap } from 'lucide-react';

export default function Navbar({ onRunDetection, isRunning, engineStatus }) {
  return (
    <nav style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', sticky: 'top', zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
          <Shield size={20} color="#ffffff" />
        </div>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            RAZORGUARD AI
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600', letterSpacing: '0.05em' }}>
            ADVANCED FRAUD NETWORK INTELLIGENCE • PHASE 3
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', background: '#1e293b', padding: '4px 12px', borderRadius: '9999px', border: '1px solid #334155' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          <span style={{ color: '#cbd5e1', fontWeight: '500' }}>Engine: {engineStatus || 'Active'}</span>
        </div>

        <button
          className="btn-primary"
          onClick={onRunDetection}
          disabled={isRunning}
          style={{ opacity: isRunning ? 0.7 : 1 }}
        >
          {isRunning ? <RefreshCw size={16} className="spin" /> : <Zap size={16} />}
          <span>{isRunning ? 'Running Analysis...' : 'Run Detection Pipeline'}</span>
        </button>
      </div>
    </nav>
  );
}
