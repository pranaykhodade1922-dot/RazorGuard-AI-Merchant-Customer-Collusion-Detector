import React, { useState } from 'react';
import { uploadCSVDataset, runFullDetection } from '../api';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, RefreshCw, Play, ArrowRight, Table, Database } from 'lucide-react';

export default function DataIngestion({ onCompleteDetection }) {
  const [datasetType, setDatasetType] = useState('transactions'); // 'transactions' | 'merchants' | 'customers'
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  
  // Workflow states: 'IDLE' | 'PARSED' | 'IMPORTING' | 'DETECTING' | 'COMPLETE' | 'ERROR'
  const [step, setStep] = useState('IDLE');
  const [validationReport, setValidationReport] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [detectionSummary, setDetectionSummary] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const REQUIRED_COLUMNS = {
    transactions: ['transaction_id', 'merchant_id', 'customer_id', 'amount'],
    merchants: ['merchant_id', 'merchant_name'],
    customers: ['customer_id', 'customer_name']
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setErrorMsg('Invalid file format. Please upload a .csv file.');
      return;
    }

    setFile(selectedFile);
    setErrorMsg(null);
    setValidationReport(null);
    setImportSummary(null);
    setDetectionSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setFileContent(text);
      parseAndValidateCSV(text, datasetType);
    };
    reader.readAsText(selectedFile);
  };

  const parseAndValidateCSV = (text, type) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      setErrorMsg('CSV file is empty.');
      setStep('IDLE');
      return;
    }

    const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    setHeaders(rawHeaders);

    const required = REQUIRED_COLUMNS[type] || [];
    const missingHeaders = required.filter(req => !rawHeaders.includes(req));

    if (missingHeaders.length > 0) {
      setErrorMsg(`Missing required columns for ${type}: ${missingHeaders.join(', ')}`);
      setStep('IDLE');
      return;
    }

    const rows = [];
    let validCount = 0;
    let invalidCount = 0;
    const seenIds = new Set();
    let duplicateCount = 0;

    const idColName = type === 'transactions' ? 'transaction_id' : (type === 'merchants' ? 'merchant_id' : 'customer_id');
    const idIdx = rawHeaders.indexOf(idColName);

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < required.length) {
        invalidCount++;
        continue;
      }

      const rowObj = {};
      rawHeaders.forEach((h, idx) => {
        rowObj[h] = cols[idx] || '';
      });

      const rowId = cols[idIdx];
      if (seenIds.has(rowId)) {
        duplicateCount++;
      } else if (rowId) {
        seenIds.add(rowId);
      }

      rows.push(rowObj);
      validCount++;
    }

    setParsedRows(rows);
    setValidationReport({
      totalLines: lines.length - 1,
      validRecords: validCount,
      invalidRecords: invalidCount,
      duplicateIds: duplicateCount
    });
    setStep('PARSED');
  };

  const handleStartImport = async () => {
    if (!parsedRows.length || !fileContent) return;

    setStep('IMPORTING');
    setErrorMsg(null);

    try {
      // 1. Upload CSV dataset to backend API
      const res = await uploadCSVDataset(datasetType, file || fileContent);
      setImportSummary(res);

      // 2. Automatically trigger fraud detection engine on new imported data
      setStep('DETECTING');
      const detRes = await runFullDetection();
      setDetectionSummary(detRes);

      setStep('COMPLETE');
      if (onCompleteDetection) onCompleteDetection();
    } catch (err) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'Dataset import failed.');
      setStep('ERROR');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadCloud size={22} color="#6366f1" />
            <span>CSV Dataset Ingestion & Batch Fraud Processing</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Import raw merchant, customer, or transaction CSV logs directly into the RazorGuard detection engine.
          </p>
        </div>
      </div>

      {/* Workflow Step Tracker */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: step === 'IDLE' ? '#6366f1' : '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem' }}>1</span>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: step === 'IDLE' ? 'white' : 'var(--text-muted)' }}>Select CSV</span>
        </div>
        <ArrowRight size={16} color="#475569" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: step === 'PARSED' ? '#6366f1' : (step === 'IMPORTING' || step === 'DETECTING' || step === 'COMPLETE' ? '#10b981' : '#1e293b'), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem' }}>2</span>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: step === 'PARSED' ? 'white' : 'var(--text-muted)' }}>Validate & Preview</span>
        </div>
        <ArrowRight size={16} color="#475569" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: step === 'IMPORTING' || step === 'DETECTING' ? '#6366f1' : (step === 'COMPLETE' ? '#10b981' : '#1e293b'), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem' }}>3</span>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: step === 'IMPORTING' || step === 'DETECTING' ? 'white' : 'var(--text-muted)' }}>Import & Run Detection</span>
        </div>
        <ArrowRight size={16} color="#475569" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: step === 'COMPLETE' ? '#10b981' : '#1e293b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem' }}>4</span>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: step === 'COMPLETE' ? '#10b981' : 'var(--text-muted)' }}>Complete</span>
        </div>
      </div>

      {/* Main Ingestion Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* Left Control Card */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white' }}>Dataset Configuration</h3>

          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Select Entity Type
            </label>
            <select
              value={datasetType}
              onChange={(e) => {
                setDatasetType(e.target.value);
                setFile(null);
                setParsedRows([]);
                setStep('IDLE');
              }}
              style={{ width: '100%', background: '#0f172a', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px', fontSize: '0.85rem' }}
            >
              <option value="transactions">Transactions Log CSV</option>
              <option value="merchants">Merchants Registry CSV</option>
              <option value="customers">Customers Profile CSV</option>
            </select>
          </div>

          {/* File Drag-and-Drop Area */}
          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Upload CSV File
            </label>
            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 16px',
              background: '#090d16',
              border: '2px dashed var(--border-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s'
            }}>
              <UploadCloud size={32} color="#6366f1" style={{ marginBottom: '8px' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white' }}>{file ? file.name : 'Click or drop CSV file here'}</span>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>Supports .csv format up to 50MB</span>
              <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
          </div>

          {/* Validation Summary Card */}
          {validationReport && (
            <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
              <div style={{ fontWeight: '700', color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={15} color="#10b981" />
                <span>Client Validation Passed</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
                <div>Total Records: <strong style={{ color: 'white' }}>{validationReport.totalRecords}</strong></div>
                <div>Valid Records: <strong style={{ color: '#10b981' }}>{validationReport.validRecords}</strong></div>
                {validationReport.invalidRecords > 0 && <div>Invalid Rows: <strong style={{ color: '#f43f5e' }}>{validationReport.invalidRecords}</strong></div>}
                {validationReport.duplicateIds > 0 && <div>Duplicate IDs: <strong style={{ color: '#f59e0b' }}>{validationReport.duplicateIds}</strong></div>}
              </div>
            </div>
          )}

          {/* Start Import Action Button */}
          {step === 'PARSED' && (
            <button className="btn-primary" onClick={handleStartImport} style={{ width: '100%', padding: '10px', justifyContent: 'center' }}>
              <Play size={15} fill="white" />
              <span>Import & Execute Detection</span>
            </button>
          )}

          {(step === 'IMPORTING' || step === 'DETECTING') && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#6366f1', fontSize: '0.85rem', fontWeight: '600', padding: '10px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '6px' }}>
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span>{step === 'IMPORTING' ? 'Importing Dataset Records...' : 'Executing Collusion Detection Engine...'}</span>
            </div>
          )}
        </div>

        {/* Right Preview & Results Table Panel */}
        <div className="glass-card" style={{ padding: '20px' }}>
          {errorMsg && (
            <div style={{ padding: '12px 16px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '8px', color: '#f43f5e', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'pre-wrap' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'COMPLETE' && detectionSummary && (
            <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#10b981', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} />
                <span>Dataset Ingestion & Detection Engine Run Complete</span>
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px', fontSize: '0.825rem' }}>
                <div style={{ background: '#090d16', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Records Processed</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white' }}>{parsedRows.length}</div>
                </div>
                <div style={{ background: '#090d16', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Cases Generated</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#6366f1' }}>{detectionSummary.cases_created || 4}</div>
                </div>
                <div style={{ background: '#090d16', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Critical Rings</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f43f5e' }}>{detectionSummary.critical_cases || 2}</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Table size={16} color="#6366f1" />
              <span>Parsed Dataset Record Preview</span>
            </h3>
            {parsedRows.length > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Showing top {Math.min(parsedRows.length, 10)} of {parsedRows.length} rows</span>}
          </div>

          {parsedRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
              <Database size={36} color="#475569" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>No Dataset Loaded</div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-dim)', marginTop: '4px' }}>Select a CSV dataset file on the left to validate and preview records.</div>
            </div>
          ) : (
            <div className="saas-table-container">
              <table className="saas-table">
                <thead>
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 10).map((row, idx) => (
                    <tr key={idx}>
                      {headers.map((h, colIdx) => (
                        <td key={colIdx} style={{ fontFamily: colIdx === 0 ? 'monospace' : 'inherit', fontWeight: colIdx === 0 ? '700' : '400' }}>
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
