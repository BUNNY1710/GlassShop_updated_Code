import React from 'react';

/* ─── Status palettes ────────────────────────────────────────────────────────── */
const PALETTE = {
  // Quotation / Order statuses
  DRAFT:      { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
  PENDING:    { bg: '#fef9c3', color: '#854d0e', dot: '#f59e0b' },
  CONFIRMED:  { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
  APPROVED:   { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
  REJECTED:   { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' },
  CANCELLED:  { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' },
  // Payment statuses
  PAID:       { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
  DUE:        { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' },
  PARTIAL:    { bg: '#fef9c3', color: '#854d0e', dot: '#f59e0b' },
  OVERDUE:    { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' },
  // Stock statuses
  OK:         { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
  LOW:        { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' },
  // Generic
  SUCCESS:    { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
  WARNING:    { bg: '#fef9c3', color: '#854d0e', dot: '#f59e0b' },
  ERROR:      { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' },
  INFO:       { bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6' },
  NEUTRAL:    { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
};

/**
 * @param {string}  status   – canonical key (case-insensitive). Falls back to NEUTRAL.
 * @param {boolean} dot      – show a leading dot indicator
 * @param {string}  label    – override display text (default: status string)
 * @param {'sm'|'md'} size
 */
const Badge = ({ status = 'NEUTRAL', dot = false, label, size = 'sm', style: extra = {} }) => {
  const key = (status || 'NEUTRAL').toUpperCase().replace(/\s+/g, '_');
  const p   = PALETTE[key] || PALETTE.NEUTRAL;

  const fs = size === 'sm' ? '11px' : '12px';
  const px = size === 'sm' ? '7px'  : '9px';
  const py = size === 'sm' ? '3px'  : '4px';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: p.bg, color: p.color,
      borderRadius: '999px',
      padding: `${py} ${px}`,
      fontSize: fs, fontWeight: 600, lineHeight: 1,
      whiteSpace: 'nowrap', letterSpacing: '0.01em',
      fontFamily: "'Inter',-apple-system,sans-serif",
      ...extra,
    }}>
      {dot && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.dot, flexShrink: 0 }} />}
      {label ?? key}
    </span>
  );
};

export default Badge;
