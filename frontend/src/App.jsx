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

import { fetchHealth, fetchDashboardSummary, runFullDetection, generateDataset } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [summary, setSummary] = useState(null);
  const [engineStatus, setEngineStatus] = useState('Phase 4 Active');
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

  // Update URL query string on state change
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
      .then(res => setEngineStatus(res.engine || 'Phase 4 Active'))
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
      {/* Top Navbar */}
      <Navbar
        onRunDetection={handleRunDetection}
        isRunning={isRunning}
        engineStatus={engineStatus}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Main SaaS Layout */}
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
            <Customers
              initialCustomerId={selectedCustomerId}
            />
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

          {activeTab === 'settings' && <SystemSettings />}
        </main>
      </div>

      {/* Global Command Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSearchResultSelect}
      />
    </div>
  );
}
