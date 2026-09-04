import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import SearchModal from './components/SearchModal';

import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Merchants from './pages/Merchants';
import Customers from './pages/Customers';
import NetworkIntelligence from './pages/NetworkIntelligence';
import RiskCases from './pages/RiskCases';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import SystemSettings from './pages/Settings';
import DataIngestion from './pages/DataIngestion';
import AuditLogs from './pages/AuditLogs';
import Login from './pages/Login';
import Register from './pages/Register';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import { fetchHealth, fetchDashboardSummary, runFullDetection } from './api';
import { Shield, RefreshCw } from 'lucide-react';

function MainSaaSLayout({ activeTab, setActiveTab }) {
  const [summary, setSummary] = useState(null);
  const [engineStatus, setEngineStatus] = useState('Phase 6 Active');
  const [isRunning, setIsRunning] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Active investigation entity pointers
  const [selectedMerchantId, setSelectedMerchantId] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  // Sync state from URL params on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const merchantParam = params.get('merchant_id') || params.get('id');
    const caseParam = params.get('case_id');
    const customerParam = params.get('customer_id');

    if (tabParam) setActiveTab(tabParam);
    if (merchantParam) setSelectedMerchantId(merchantParam);
    if (caseParam) setSelectedCaseId(caseParam);
    if (customerParam) setSelectedCustomerId(customerParam);
  }, []);

  const navigateToTab = (tab, extraParams = {}) => {
    setActiveTab(tab);
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (extraParams.merchantId) {
      params.set('merchant_id', extraParams.merchantId);
      setSelectedMerchantId(extraParams.merchantId);
    }
    if (extraParams.caseId) {
      params.set('case_id', extraParams.caseId);
      setSelectedCaseId(extraParams.caseId);
    }
    if (extraParams.customerId) {
      params.set('customer_id', extraParams.customerId);
      setSelectedCustomerId(extraParams.customerId);
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  };

  const loadSummary = async () => {
    try {
      const sum = await fetchDashboardSummary();
      setSummary(sum);
    } catch (err) {
      console.error('Failed fetching summary:', err);
    }
  };

  useEffect(() => {
    fetchHealth()
      .then(res => setEngineStatus(res.engine || 'RazorGuard Phase 6 Active'))
      .catch(() => setEngineStatus('Offline'));
    loadSummary();
  }, []);

  const handleRunDetection = async () => {
    setIsRunning(true);
    try {
      await runFullDetection();
      await loadSummary();
    } catch (err) {
      console.error('Failed running detection:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSearchResultSelect = (result) => {
    if (result.type === 'MERCHANT') {
      setSelectedMerchantId(result.id);
      navigateToTab('merchants', { merchantId: result.id });
    } else if (result.type === 'CUSTOMER') {
      setSelectedCustomerId(result.id);
      navigateToTab('customers', { customerId: result.id });
    } else if (result.type === 'CASE') {
      setSelectedCaseId(result.id);
      navigateToTab('cases', { caseId: result.id });
    } else if (result.type === 'TRANSACTION') {
      navigateToTab('transactions');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        onRunDetection={handleRunDetection}
        isRunning={isRunning}
        engineStatus={engineStatus}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 64px)' }}>
        <Sidebar activeTab={activeTab} setActiveTab={(tab) => navigateToTab(tab)} />

        <main style={{ flex: 1, padding: '24px', overflowY: 'auto', maxHeight: 'calc(100vh - 64px)' }}>
          {activeTab === 'dashboard' && (
            <Dashboard
              summary={summary}
              onNavigateTab={(tab) => navigateToTab(tab)}
              onSelectMerchant={(mId) => { setSelectedMerchantId(mId); navigateToTab('merchants', { merchantId: mId }); }}
              onSelectCase={(cId) => { setSelectedCaseId(cId); navigateToTab('cases', { caseId: cId }); }}
            />
          )}

          {activeTab === 'transactions' && (
            <Transactions
              onSelectMerchant={(mId) => { setSelectedMerchantId(mId); navigateToTab('merchants', { merchantId: mId }); }}
              onSelectCustomer={(cId) => { setSelectedCustomerId(cId); navigateToTab('customers', { customerId: cId }); }}
            />
          )}

          {activeTab === 'merchants' && (
            <Merchants
              initialMerchantId={selectedMerchantId}
              onSelectCase={(cId) => { setSelectedCaseId(cId); navigateToTab('cases', { caseId: cId }); }}
            />
          )}

          {activeTab === 'customers' && (
            <Customers initialCustomerId={selectedCustomerId} />
          )}

          {activeTab === 'network' && (
            <NetworkIntelligence
              onSelectMerchant={(mId) => { setSelectedMerchantId(mId); navigateToTab('merchants', { merchantId: mId }); }}
              onSelectCustomer={(cId) => { setSelectedCustomerId(cId); navigateToTab('customers', { customerId: cId }); }}
              onSelectCase={(cId) => { setSelectedCaseId(cId); navigateToTab('cases', { caseId: cId }); }}
            />
          )}

          {activeTab === 'cases' && (
            <RiskCases
              initialCaseId={selectedCaseId}
              onSelectMerchant={(mId) => { setSelectedMerchantId(mId); navigateToTab('merchants', { merchantId: mId }); }}
            />
          )}

          {activeTab === 'alerts' && (
            <Alerts
              onSelectCase={(cId) => { setSelectedCaseId(cId); navigateToTab('cases', { caseId: cId }); }}
              onSelectMerchant={(mId) => { setSelectedMerchantId(mId); navigateToTab('merchants', { merchantId: mId }); }}
            />
          )}

          {activeTab === 'analytics' && <Analytics />}

          {activeTab === 'ingest' && (
            <ProtectedRoute requireAdmin={true}>
              <DataIngestion onCompleteDetection={() => loadSummary()} />
            </ProtectedRoute>
          )}

          {activeTab === 'audit' && (
            <ProtectedRoute requireAdmin={true}>
              <AuditLogs />
            </ProtectedRoute>
          )}

          {activeTab === 'settings' && (
            <ProtectedRoute requireAdmin={true}>
              <SystemSettings />
            </ProtectedRoute>
          )}
        </main>
      </div>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSearchResultSelect}
      />
    </div>
  );
}

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // 1. Loading state spinner
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
        <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>
          RazorGuard <span style={{ color: '#6366f1' }}>AI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
          <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Verifying Security Session...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Render Register or Login view
  if (!isAuthenticated) {
    if (currentPath === '/register') {
      return <Register onSwitchToLogin={() => navigate('/login')} />;
    }
    return <Login onSwitchToRegister={() => navigate('/register')} />;
  }

  // 3. Authenticated: If on /login or /register, redirect path to /dashboard
  if (currentPath === '/login' || currentPath === '/register') {
    window.history.replaceState({}, '', '/dashboard');
  }

  // 4. Authenticated: Render protected SaaS Layout
  return (
    <ProtectedRoute>
      <MainSaaSLayout activeTab={activeTab} setActiveTab={setActiveTab} />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}


