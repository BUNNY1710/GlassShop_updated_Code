import React from 'react';
import { useResponsive } from '../../hooks/useResponsive';

const StatCard = ({
  icon,
  label,
  value,
  color = '#818CF8',
  loading = false,
  trend,
  subtitle,
  compact = false,
}) => {
  const { isMobile } = useResponsive();

  /* ── COMPACT mode ─────────────────────────────────────────────────────────── */
  if (compact) {
    return (
      <div
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          isMobile ? 8 : 12,
          padding:      isMobile ? '10px 12px' : '12px 14px',
          background:   'rgba(17,27,53,0.9)',
          borderRadius: 10,
          border:       '1px solid rgba(255,255,255,0.08)',
          boxShadow:    '0 4px 16px rgba(0,0,0,0.3)',
          fontFamily:   "'Inter',-apple-system,sans-serif",
          minWidth:     0,
          overflow:     'hidden',
          transition:   'box-shadow 160ms ease, border-color 160ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow   = '0 6px 20px rgba(0,0,0,0.4)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow   = '0 4px 16px rgba(0,0,0,0.3)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        }}
      >
        <div style={{
          width:          isMobile ? 30 : 32,
          height:         isMobile ? 30 : 32,
          borderRadius:   8,
          flexShrink:     0,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          background:     `${color}20`,
          color,
          fontSize:       isMobile ? 13 : 14,
        }}>
          {icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize:      10.5,
            fontWeight:    600,
            color:         '#7180A6',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom:  2,
            whiteSpace:    'nowrap',
            overflow:      'hidden',
            textOverflow:  'ellipsis',
          }}>
            {label}
          </div>

          {loading ? (
            <div style={{
              height:         16,
              width:          52,
              borderRadius:   4,
              background:     'linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.06) 75%)',
              backgroundSize: '200% 100%',
              animation:      'skeleton-loading 1.5s ease-in-out infinite',
            }} />
          ) : (
            <div style={{
              fontSize:      isMobile ? 16 : 18,
              fontWeight:    700,
              color:         '#E2E8F0',
              letterSpacing: '-0.03em',
              lineHeight:    1.1,
            }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
          )}
        </div>

        {trend && !loading && !isMobile && (
          <span style={{
            fontSize:    10.5,
            fontWeight:  600,
            padding:     '2px 6px',
            borderRadius: 6,
            flexShrink:  0,
            background:  trend > 0 ? 'rgba(55,227,165,0.15)' : 'rgba(255,107,129,0.15)',
            color:       trend > 0 ? '#37E3A5' : '#FF6B81',
          }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    );
  }

  /* ── DEFAULT mode: vertical KPI card ─────────────────────────────────────── */
  return (
    <div
      style={{
        background:   'rgba(17,27,53,0.9)',
        borderRadius: 14,
        border:       '1px solid rgba(255,255,255,0.08)',
        boxShadow:    '0 4px 24px rgba(0,0,0,0.4)',
        padding:      18,
        position:     'relative',
        overflow:     'hidden',
        fontFamily:   "'Inter',-apple-system,sans-serif",
        transition:   'box-shadow 180ms ease, border-color 180ms ease, transform 180ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow   = '0 8px 32px rgba(0,0,0,0.5)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
        e.currentTarget.style.transform   = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow   = '0 4px 24px rgba(0,0,0,0.4)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.transform   = 'translateY(0)';
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position:     'absolute',
        top:          0,
        left:         0,
        right:        0,
        height:       3,
        background:   color,
        borderRadius: '14px 14px 0 0',
        pointerEvents:'none',
      }} />

      {/* Icon + trend row */}
      <div style={{
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'space-between',
        marginBottom:   12,
        paddingTop:     4,
      }}>
        <div style={{
          width:          40,
          height:         40,
          borderRadius:   10,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       18,
          background:     `${color}20`,
          color,
          flexShrink:     0,
        }}>
          {icon}
        </div>

        {trend && !loading && (
          <span style={{
            fontSize:    11,
            fontWeight:  600,
            padding:     '3px 8px',
            borderRadius: 6,
            background:  trend > 0 ? 'rgba(55,227,165,0.15)' : 'rgba(255,107,129,0.15)',
            color:       trend > 0 ? '#37E3A5' : '#FF6B81',
          }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* Label */}
      <p style={{
        fontSize:      11,
        fontWeight:    600,
        color:         '#7180A6',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        margin:        '0 0 5px 0',
      }}>
        {label}
      </p>

      {/* Value */}
      {loading ? (
        <div style={{
          height:         28,
          width:          80,
          borderRadius:   6,
          background:     'linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.06) 75%)',
          backgroundSize: '200% 100%',
          animation:      'skeleton-loading 1.5s ease-in-out infinite',
        }} />
      ) : (
        <p style={{
          fontSize:      isMobile ? '20px' : '26px',
          fontWeight:    800,
          color:         '#E2E8F0',
          lineHeight:    1,
          margin:        0,
          letterSpacing: '-0.03em',
        }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      )}

      {/* Subtitle */}
      {subtitle && (
        <p style={{
          fontSize:   11.5,
          color:      '#7180A6',
          marginTop:  5,
          margin:     '5px 0 0 0',
          lineHeight: 1.4,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default StatCard;
