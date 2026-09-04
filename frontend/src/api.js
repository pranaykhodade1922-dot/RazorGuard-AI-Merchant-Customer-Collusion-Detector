const API_BASE = '/api';

function getAuthHeaders() {
  const headers = {};
  try {
    const userStr = localStorage.getItem('razorguard_auth_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user && user.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
    }
  } catch (e) {
    console.warn('Error reading auth headers:', e);
  }
  return headers;
}

async function authFetch(url, options = {}) {
  const defaultHeaders = getAuthHeaders();
  const mergedOptions = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  };

  const res = await fetch(url, mergedOptions);
  if (res.status === 401) {
    console.warn('Unauthorized API response (401).');
  }
  return res;
}

export async function fetchHealth() {
  const res = await authFetch('/health');
  return res.json();
}

export async function verifyRoleRegistration(email, role) {
  const res = await authFetch(`${API_BASE}/auth/register-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const msg = errorData?.message || errorData?.detail?.message || 'Unauthorized to create selected role.';
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchDashboardSummary() {
  const res = await authFetch(`${API_BASE}/dashboard/summary`);
  return res.json();
}

export async function fetchEvaluation() {
  const res = await authFetch(`${API_BASE}/evaluation`);
  return res.json();
}

export async function generateDataset(seed = 42) {
  const res = await authFetch(`${API_BASE}/dataset/generate?seed=${seed}`, { method: 'POST' });
  return res.json();
}

export async function runFullDetection() {
  const res = await authFetch(`${API_BASE}/detection/run`, { method: 'POST' });
  return res.json();
}

export async function fetchCases(status = '', riskLevel = '', limit = '') {
  let url = `${API_BASE}/cases?`;
  if (status) url += `status=${status}&`;
  if (riskLevel) url += `risk_level=${riskLevel}&`;
  if (limit) url += `limit=${limit}&`;
  const res = await authFetch(url);
  return res.json();
}

export async function fetchCaseDetail(caseId) {
  const res = await authFetch(`${API_BASE}/cases/${caseId}`);
  return res.json();
}

export async function updateCaseStatus(caseId, status) {
  const res = await authFetch(`${API_BASE}/cases/${caseId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function addCaseNote(caseId, note) {
  const res = await authFetch(`${API_BASE}/cases/${caseId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
  return res.json();
}

export async function fetchCaseGraph(caseId) {
  const res = await authFetch(`${API_BASE}/cases/${caseId}/graph`);
  return res.json();
}

// Phase 3 Network Endpoints
export async function fetchNetworkOverview() {
  const res = await authFetch(`${API_BASE}/network/overview`);
  return res.json();
}

export async function fetchNetworkNodes(entityType = '', minRiskScore = '') {
  let url = `${API_BASE}/network/nodes?`;
  if (entityType) url += `entity_type=${entityType}&`;
  if (minRiskScore) url += `min_risk_score=${minRiskScore}&`;
  const res = await authFetch(url);
  return res.json();
}

export async function fetchNetworkEdges(relationship = '', minRiskScore = '') {
  let url = `${API_BASE}/network/edges?`;
  if (relationship) url += `relationship=${relationship}&`;
  if (minRiskScore) url += `min_risk_score=${minRiskScore}&`;
  const res = await authFetch(url);
  return res.json();
}

export async function fetchNetworkClusters() {
  const res = await authFetch(`${API_BASE}/network/clusters`);
  return res.json();
}

export async function fetchRiskyRelationships() {
  const res = await authFetch(`${API_BASE}/network/risky-relationships`);
  return res.json();
}

export async function fetchEntityNetworkDetail(entityId) {
  const res = await authFetch(`${API_BASE}/network/entity/${entityId}`);
  return res.json();
}

export async function fetchEntityConnections(entityId) {
  const res = await authFetch(`${API_BASE}/network/entity/${entityId}/connections`);
  return res.json();
}

export async function fetchShortestPath(sourceId, targetId) {
  const res = await authFetch(`${API_BASE}/network/path/${sourceId}/${targetId}`);
  return res.json();
}

// Global Search Endpoint
export async function fetchGlobalSearch(query) {
  if (!query || query.trim().length === 0) return [];
  const res = await authFetch(`${API_BASE}/search?q=${encodeURIComponent(query.trim())}`);
  return res.json();
}

// Phase 5 Persistent Entities Endpoints
export async function fetchMerchants() {
  const res = await authFetch(`${API_BASE}/merchants`);
  return res.json();
}

export async function fetchMerchantDetail(merchantId) {
  const res = await authFetch(`${API_BASE}/merchants/${merchantId}`);
  return res.json();
}

export async function fetchCustomers() {
  const res = await authFetch(`${API_BASE}/customers`);
  return res.json();
}

export async function fetchCustomerDetail(customerId) {
  const res = await authFetch(`${API_BASE}/customers/${customerId}`);
  return res.json();
}

export async function fetchTransactions(limit = 100) {
  const res = await authFetch(`${API_BASE}/transactions?limit=${limit}`);
  return res.json();
}

export async function fetchTransactionDetail(transactionId) {
  const res = await authFetch(`${API_BASE}/transactions/${transactionId}`);
  return res.json();
}

export async function fetchAlerts() {
  const res = await authFetch(`${API_BASE}/alerts`);
  return res.json();
}

// Phase 4 ML Risk Intelligence Endpoints
export async function fetchMLScore(payload) {
  const res = await authFetch(`${API_BASE}/ml/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchModelInfo() {
  const res = await authFetch(`${API_BASE}/ml/model-info`);
  return res.json();
}

// Phase 6 Ingestion & Auth Endpoints
export async function uploadCSVDataset(datasetType, fileOrContent) {
  const formData = new FormData();
  if (typeof fileOrContent === 'string') {
    const blob = new Blob([fileOrContent], { type: 'text/csv' });
    formData.append('file', blob, `${datasetType}.csv`);
  } else {
    formData.append('file', fileOrContent);
  }
  formData.append('dataset_type', datasetType);

  const res = await authFetch(`${API_BASE}/ingest/csv`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    let formattedMsg = 'CSV dataset upload failed.';
    if (Array.isArray(errorData.detail)) {
      formattedMsg = 'CSV Validation Failed:\n• ' + errorData.detail.map(d => {
        const fieldName = d.loc ? d.loc.slice(1).join('.') : 'field';
        return `${fieldName}: ${d.msg}`;
      }).join('\n• ');
    } else if (typeof errorData.detail === 'object' && errorData.detail !== null) {
      formattedMsg = errorData.detail.message || JSON.stringify(errorData.detail);
    } else if (typeof errorData.detail === 'string') {
      formattedMsg = errorData.detail;
    }
    throw new Error(formattedMsg);
  }
  return res.json();
}

export async function fetchCurrentUser() {
  const res = await authFetch(`${API_BASE}/auth/me`);
  return res.json();
}

export async function fetchAuditLogs(limit = 50) {
  const res = await authFetch(`${API_BASE}/audit-logs?limit=${limit}`);
  return res.json();
}
