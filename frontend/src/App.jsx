import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import RiskCases from './pages/RiskCases';
import Investigations from './pages/Investigations';
import NetworkIntelligence from './pages/NetworkIntelligence';

import { fetchHealth, fetchDashboardSummary, runFullDetection, generateDataset } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('network'); // Default to Phase 3 Network view
  const [summary, setSummary] = useState(null);
  const [engineStatus, setEngineStatus] = useState('Phase 3 Active');
  const [isRunning, setIsRunning] = useState(false);

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
      .then(res => setEngineStatus(res.engine || 'Phase 3 Active'))
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

  const handleGenerateDataset = async () => {
    setIsRunning(true);
    try {
      await generateDataset(42);
      await runFullDetection();
      await loadSummary();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        onRunDetection={handleRunDetection}
        isRunning={isRunning}
        engineStatus={engineStatus}
      />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main style={{ flex: 1, padding: '24px', overflowY: 'auto', maxHeight: 'calc(100vh - 61px)' }}>
          {activeTab === 'dashboard' && <Dashboard summary={summary} onGenerateDataset={handleGenerateDataset} />}
          {activeTab === 'transactions' && <Transactions />}
          {activeTab === 'cases' && <RiskCases />}
          {activeTab === 'investigations' && <Investigations />}
          {activeTab === 'network' && <NetworkIntelligence />}
        </main>
      </div>
    </div>
  );
}
