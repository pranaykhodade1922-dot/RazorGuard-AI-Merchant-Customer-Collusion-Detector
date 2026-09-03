import React from 'react';
import { LayoutDashboard, ArrowLeftRight, ShieldAlert, Search, Network } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'cases', label: 'Risk Cases', icon: ShieldAlert },
    { id: 'investigations', label: 'Investigations', icon: Search },
    { id: 'network', label: 'Network Intelligence', icon: Network, isPhase3: true },
  ];

  return (
    <aside style={{ width: '240px', background: '#0f172a', borderRight: '1px solid #1e293b', padding: '20px 12px', minHeight: 'calc(100vh - 61px)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ padding: '0 12px 12px 12px', fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Navigation
      </div>
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(79, 70, 229, 0.1) 100%)' : 'transparent',
              color: isActive ? '#ffffff' : '#94a3b8',
              fontWeight: isActive ? '700' : '500',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icon size={18} color={isActive ? '#818cf8' : '#64748b'} />
              <span>{item.label}</span>
            </div>
            {item.isPhase3 && (
              <span style={{ fontSize: '0.65rem', background: '#6366f1', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                P3
              </span>
            )}
          </button>
        );
      })}
    </aside>
  );
}
