import React from 'react';

/* ─── Status palettes ────────────────────────────────────────────────────────── */
const PALETTE = {
  // Quotation / Order statuses
  DRAFT:      { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
  PENDING:    { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  CONFIRMED:  { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
  APPROVED:   { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
  REJECTED:   { bg: '#ffe4e6', color: '#be123c', dot: '#f43f5e' },
  CANCELLED:  { bg: '#ffe4e6', color: '#be123c', dot: '#f43f5e' },
  // Payment statuses
  PAID:       { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
  DUE:        { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  PARTIAL:    { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  OVERDUE:    { bg: '#ffe4e6', color: '#be123c', dot: '#f43f5e' },
  // Stock statuses
  OK:         { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
  LOW:        { bg: '#ffe4e6', color: '#be123c', dot: '#f43f5e' },
  // Generic
  SUCCESS:    { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
  WARNING:    { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  ERROR:      { bg: '#ffe4e6', color: '#be123c', dot: '#f43f5e' },
  INFO:       { bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6' },
  NEUTRAL:    { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
};

/**
 * Clean pill badge with status mapping.
 *
 * @param {string}   status   – canonical key (case-insensitive). Falls back to NEUTRAL.
 * @param {boolean}  dot      – show a leading 5×5 circle indicator matching text color.
 * @param {string}   label    – override display text (default: status string).
 * @param {'sm'|'md'} size
 * @param {object}   style    – extra inline style overrides.
 */
const Badge = ({ status = 'NEUTRAL', dot = false, label, size = 'sm', style: extra = {} }) => {
  const key = (status || 'NEUTRAL').toUpperCase().replace(/\s+/g, '_');
  const p   = PALETTE[key] || PALETTE.NEUTRAL;

  const fs = size === 'sm' ? '11px' : '12px';
  const px = size === 'sm' ? '8px'  : '10px';
  const py = size === 'sm' ? '2px'  : '3px';

  return (
    <span style={{
      display:       'inline-flex',
      alignItems:    'center',
      gap:           '3px',
      background:    p.bg,
      color:         p.color,
      borderRadius:  '999px',
      padding:       `${py} ${px}`,
      fontSize:      fs,
      fontWeight:    600,
      lineHeight:    1,
      whiteSpace:    'nowrap',
      letterSpacing: '0.02em',
      fontFamily:    "'Inter',-apple-system,sans-serif",
      ...extra,
    }}>
      {dot && (
        <span style={{
          width:        '5px',
          height:       '5px',
          borderRadius: '50%',
          background:   p.dot,
          flexShrink:   0,
          display:      'inline-block',
        }} />
      )}
      {label ?? key}
    </span>
  );
};

export default Badge;
