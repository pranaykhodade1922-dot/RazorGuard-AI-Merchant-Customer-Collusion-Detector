import React, { useState } from 'react';
import { LayoutDashboard, CreditCard, Store, Users, Network, ShieldAlert, Bell, BarChart3, Settings, Shield, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'merchants', label: 'Merchants', icon: Store },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'network', label: 'Network Intelligence', icon: Network },
    { id: 'cases', label: 'Cases Workspace', icon: ShieldAlert },
    { id: 'alerts', label: 'Active Alerts', icon: Bell },
    { id: 'analytics', label: 'Fraud Analytics', icon: BarChart3 },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <aside style={{
      width: collapsed ? '72px' : '260px',
      background: '#0b0f19',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      zIndex: 90,
      flexShrink: 0
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '20px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            <Shield size={20} color="white" />
          </div>

          {!collapsed && (
            <div>
              <div style={{ fontSize: '1rem', fontWeight: '800', color: 'white', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                RazorGuard <span style={{ color: '#6366f1', fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>AI</span>
              </div>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Risk & Collusion Intelligence</div>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', padding: '4px' }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.18) 0%, rgba(99, 102, 241, 0.05) 100%)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                fontWeight: isActive ? '700' : '500',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                justifyContent: collapsed ? 'center' : 'flex-start'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon size={18} color={isActive ? '#6366f1' : '#94a3b8'} />
              {!collapsed && (
                <span style={{ flex: 1 }}>{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Environment / Footer */}
      {!collapsed && (
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.5)' }}>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginBottom: '4px' }}>Buildathon 2026 Edition</div>
          <div style={{ fontSize: '0.775rem', fontWeight: '600', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="#6366f1" />
            <span>RazorGuard AI Active</span>
          </div>
        </div>
      )}
    </aside>
  );
}
