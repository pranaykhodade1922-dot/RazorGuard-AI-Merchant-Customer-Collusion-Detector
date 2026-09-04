import React from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck, Info } from 'lucide-react';

export default function RiskScoreBadge({ score = 0, level, showScore = true, size = 'md' }) {
  const numScore = Number(score) || 0;
  
  let riskLevel = level;
  if (!riskLevel) {
    if (numScore >= 80) riskLevel = 'CRITICAL';
    else if (numScore >= 60) riskLevel = 'HIGH';
    else if (numScore >= 30) riskLevel = 'MEDIUM';
    else riskLevel = 'LOW';
  }

  const getConfig = (lvl) => {
    switch (lvl) {
      case 'CRITICAL':
        return { class: 'badge-critical', icon: ShieldAlert, label: 'CRITICAL' };
      case 'HIGH':
        return { class: 'badge-high', icon: AlertTriangle, label: 'HIGH' };
      case 'MEDIUM':
        return { class: 'badge-medium', icon: Info, label: 'MEDIUM' };
      default:
        return { class: 'badge-low', icon: ShieldCheck, label: 'LOW' };
    }
  };

  const config = getConfig(riskLevel);
  const IconComponent = config.icon;
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span className={`badge ${config.class}`} style={{ fontSize: size === 'sm' ? '0.7rem' : '0.75rem' }}>
      <IconComponent size={iconSize} />
      <span>{config.label}</span>
      {showScore && <span style={{ opacity: 0.9, fontWeight: 800 }}>({numScore.toFixed(0)})</span>}
    </span>
  );
}
