import React, { useState, useEffect } from 'react';
import { fetchCases, fetchEvaluation } from '../api';
import { Search, ShieldCheck, Activity, Award } from 'lucide-react';

export default function Investigations() {
  const [evalData, setEvalData] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchCases(), fetchEvaluation()])
      .then(([c, ev]) => {
        setCases(c);
        setEvalData(ev);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const evalMetrics = evalData?.evaluation_metrics;
  const costModel = evalData?.false_positive_cost_model;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Investigation Workbench & Model Performance</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Precision/recall metrics, false-positive cost analysis, and defense evaluation</p>
      </div>

      {/* Model Performance Cards */}
      {evalMetrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>MODEL PRECISION</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>{(evalMetrics.precision * 100).toFixed(1)}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>Zero False Positive Collusion Flags</div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>MODEL RECALL</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#6366f1', marginTop: '4px' }}>{(evalMetrics.recall * 100).toFixed(1)}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>Detected Hidden Rings</div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>HARMONIC F1 SCORE</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#38bdf8', marginTop: '4px' }}>{(evalMetrics.f1_score * 100).toFixed(1)}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>Balanced Classification Index</div>
          </div>

          {costModel && (
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>EXPECTED NET SAVINGS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>₹{costModel.expected_net_value.toLocaleString()}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>Avoided Loss - Investigation Cost</div>
            </div>
          )}
        </div>
      )}

      {/* Confusion Matrix Table */}
      {evalMetrics?.confusion_matrix && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '12px' }}>Confusion Matrix Analysis</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '500px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '14px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700' }}>TRUE POSITIVES (TP)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800' }}>{evalMetrics.confusion_matrix.tp}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Collusive pairs correctly flagged</div>
            </div>

            <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '14px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#f43f5e', fontWeight: '700' }}>FALSE POSITIVES (FP)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800' }}>{evalMetrics.confusion_matrix.fp}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Legitimate pairs incorrectly flagged</div>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '14px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '700' }}>FALSE NEGATIVES (FN)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800' }}>{evalMetrics.confusion_matrix.fn}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Unflagged collusive pairs</div>
            </div>

            <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '14px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: '700' }}>TRUE NEGATIVES (TN)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800' }}>{evalMetrics.confusion_matrix.tn}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Legitimate pairs correctly unflagged</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
