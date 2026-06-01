import React from 'react';
import Card from './Card';
import { useResponsive } from '../../hooks/useResponsive';

const StatCard = ({
  icon,
  label,
  value,
  color = '#6366f1',
  loading = false,
  trend,
  subtitle,
  compact = false,   // ← horizontal single-row KPI layout at ~68px height
}) => {
  const { isMobile } = useResponsive();

  /* ── COMPACT mode: one-row horizontal layout ─────────────────────────────── */
  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 12,
        padding: isMobile ? '8px 10px' : '12px 14px',
        background: '#ffffff',
        borderRadius: 10,
        border: '1px solid #e8edf2',
        boxShadow: '0 1px 2px rgba(15,23,42,.04)',
        fontFamily: "'Inter',-apple-system,sans-serif",
        minWidth: 0,
        overflow: 'hidden',
        transition: 'box-shadow 160ms ease, border-color 160ms ease',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = '0 3px 10px rgba(15,23,42,.08)';
          e.currentTarget.style.borderColor = '#d1d9e0';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,.04)';
          e.currentTarget.style.borderColor = '#e8edf2';
        }}
      >
        {/* Icon badge */}
        <div style={{
          width: isMobile ? 28 : 34, height: isMobile ? 28 : 34, borderRadius: 8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isMobile ? 13 : 15, background: `${color}14`, color,
        }}>
          {icon}
        </div>

        {/* Label + value */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10.5, fontWeight: 600, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 2, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {label}
          </div>
          {loading ? (
            <div style={{
              height: 18, width: 56, borderRadius: 4,
              background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
              backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
            }} />
          ) : (
            <div style={{
              fontSize: isMobile ? 16 : 19, fontWeight: 700, color: '#0f172a',
              letterSpacing: '-0.03em', lineHeight: 1.1,
            }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
          )}
        </div>

        {/* Optional trend badge — hidden on mobile to save space */}
        {trend && !loading && !isMobile && (
          <span style={{
            fontSize: 10.5, fontWeight: 600, padding: '2px 6px',
            borderRadius: 5, flexShrink: 0,
            background: trend > 0 ? 'rgba(34,197,94,.10)' : 'rgba(239,68,68,.10)',
            color: trend > 0 ? '#16a34a' : '#dc2626',
          }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    );
  }

  /* ── DEFAULT mode: original vertical layout ──────────────────────────────── */
  return (
    <Card hover style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Subtle colour wash in top-right */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '80px', height: '80px',
        borderRadius: '0 12px 0 80px',
        background: `${color}0d`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{
          width: '38px', height: '38px',
          borderRadius: '9px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
          background: `${color}15`,
          color: color,
          flexShrink: 0,
        }}>
          {icon}
        </div>

        {trend && (
          <span style={{
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '600',
            background: trend > 0 ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
            color: trend > 0 ? '#16a34a' : '#dc2626',
          }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div>
        <p style={{
          fontSize: '11px',
          fontWeight: '600',
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          margin: '0 0 5px 0',
          fontFamily: "'Inter', sans-serif",
        }}>
          {label}
        </p>

        {loading ? (
          <div style={{
            height: '26px', width: '80px', borderRadius: '6px',
            background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }} />
        ) : (
          <p style={{
            fontSize: isMobile ? '20px' : '24px',
            fontWeight: '700',
            color: '#0f172a',
            lineHeight: '1',
            margin: '0',
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '-0.03em',
          }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        )}

        {subtitle && (
          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', margin: '4px 0 0 0' }}>
            {subtitle}
          </p>
        )}
      </div>
    </Card>
  );
};

export default StatCard;
