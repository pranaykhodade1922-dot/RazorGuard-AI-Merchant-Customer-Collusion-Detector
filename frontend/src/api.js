const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch('/health');
  return res.json();
}

export async function fetchDashboardSummary() {
  const res = await fetch(`${API_BASE}/dashboard/summary`);
  return res.json();
}

export async function fetchEvaluation() {
  const res = await fetch(`${API_BASE}/evaluation`);
  return res.json();
}

export async function generateDataset(seed = 42) {
  const res = await fetch(`${API_BASE}/dataset/generate?seed=${seed}`, { method: 'POST' });
  return res.json();
}

export async function runFullDetection() {
  const res = await fetch(`${API_BASE}/detection/run`, { method: 'POST' });
  return res.json();
}

export async function fetchCases(status = '', riskLevel = '', limit = '') {
  let url = `${API_BASE}/cases?`;
  if (status) url += `status=${status}&`;
  if (riskLevel) url += `risk_level=${riskLevel}&`;
  if (limit) url += `limit=${limit}&`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchCaseDetail(caseId) {
  const res = await fetch(`${API_BASE}/cases/${caseId}`);
  return res.json();
}

export async function updateCaseStatus(caseId, status) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function addCaseNote(caseId, note) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
  return res.json();
}

export async function fetchCaseGraph(caseId) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/graph`);
  return res.json();
}

// Phase 3 Network Endpoints
export async function fetchNetworkOverview() {
  const res = await fetch(`${API_BASE}/network/overview`);
  return res.json();
}

export async function fetchNetworkNodes(entityType = '', minRiskScore = '') {
  let url = `${API_BASE}/network/nodes?`;
  if (entityType) url += `entity_type=${entityType}&`;
  if (minRiskScore) url += `min_risk_score=${minRiskScore}&`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchNetworkEdges(relationship = '', minRiskScore = '') {
  let url = `${API_BASE}/network/edges?`;
  if (relationship) url += `relationship=${relationship}&`;
  if (minRiskScore) url += `min_risk_score=${minRiskScore}&`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchNetworkClusters() {
  const res = await fetch(`${API_BASE}/network/clusters`);
  return res.json();
}

export async function fetchRiskyRelationships() {
  const res = await fetch(`${API_BASE}/network/risky-relationships`);
  return res.json();
}

export async function fetchEntityNetworkDetail(entityId) {
  const res = await fetch(`${API_BASE}/network/entity/${entityId}`);
  return res.json();
}

export async function fetchEntityConnections(entityId) {
  const res = await fetch(`${API_BASE}/network/entity/${entityId}/connections`);
  return res.json();
}

export async function fetchShortestPath(sourceId, targetId) {
  const res = await fetch(`${API_BASE}/network/path/${sourceId}/${targetId}`);
  return res.json();
}
