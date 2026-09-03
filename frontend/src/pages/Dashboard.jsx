import React from 'react';
import { ShieldAlert, Users, Store, ArrowLeftRight, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

export default function Dashboard({ summary, onGenerateDataset }) {
  if (!summary) {
    return <div style={{ padding: '24px', color: '#94a3b8' }}>Loading dashboard summary metrics...</div>;
  }

  const cards = [
    { label: 'Total Collusion Cases', value: summary.total_cases, icon: ShieldAlert, color: '#6366f1' },
    { label: 'Critical Risk Cases', value: summary.critical_cases, icon: AlertTriangle, color: '#f43f5e' },
    { label: 'High Risk Cases', value: summary.high_risk_cases, icon: AlertTriangle, color: '#f59e0b' },
    { label: 'New / Unassigned Cases', value: summary.new_cases, icon: FileText, color: '#38bdf8' },
    { label: 'Under Review', value: summary.under_review, icon: CheckCircle, color: '#eab308' },
    { label: 'Confirmed Fraud', value: summary.confirmed_fraud, icon: CheckCircle, color: '#10b981' },
    { label: 'Merchants Analyzed', value: summary.total_merchants_analyzed, icon: Store, color: '#818cf8' },
    { label: 'Customers Analyzed', value: summary.total_customers_analyzed, icon: Users, color: '#2dd4bf' },
    { label: 'Transactions Analyzed', value: summary.total_transactions_analyzed, icon: ArrowLeftRight, color: '#a78bfa' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Executive Fraud Dashboard</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Overview of merchant-customer collusion detection metrics and case statistics</p>
        </div>
        <button className="btn-secondary" onClick={onGenerateDataset}>Re-generate Dataset (Seed 42)</button>
      </div>

      {/* Grid of Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={22} color={c.color} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>{c.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '2px' }}>{c.value ?? 0}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Collusion Prevention Overview Banner */}
      <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px', color: '#818cf8' }}>Collusion Ring Defense Status</h3>
        <p style={{ fontSize: '0.875rem', color: '#cbd5e1', maxWidth: '800px', lineHeight: '1.6' }}>
          RazorGuard AI has evaluated merchant payment flows and identified <strong>{summary.fraud_rings_detected ?? summary.total_cases} suspicious collusion rings</strong> operating across shared payment identities, device fingerprints, and rapid refund velocity loops.
        </p>
      </div>
    </div>
  );
}
