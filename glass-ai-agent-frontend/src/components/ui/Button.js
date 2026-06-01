import React from 'react';

/* ─── Design tokens ────────────────────────────────────────────────────────── */
const V = {
  primary: {
    bg: '#4f46e5', color: '#fff', border: 'none',
    shadow: '0 1px 2px rgba(79,70,229,.20)',
    hBg: '#4338ca', hShadow: '0 3px 10px rgba(79,70,229,.30)',
  },
  secondary: {
    bg: '#f8fafc', color: '#374151', border: '1px solid #e2e8f0',
    shadow: '0 1px 2px rgba(15,23,42,.04)',
    hBg: '#f1f5f9', hShadow: '0 2px 6px rgba(15,23,42,.07)',
  },
  success: {
    bg: '#16a34a', color: '#fff', border: 'none',
    shadow: '0 1px 2px rgba(22,163,74,.20)',
    hBg: '#15803d', hShadow: '0 3px 10px rgba(22,163,74,.28)',
  },
  danger: {
    bg: '#ef4444', color: '#fff', border: 'none',
    shadow: '0 1px 2px rgba(239,68,68,.20)',
    hBg: '#dc2626', hShadow: '0 3px 10px rgba(239,68,68,.28)',
  },
  warning: {
    bg: '#f59e0b', color: '#fff', border: 'none',
    shadow: '0 1px 2px rgba(245,158,11,.20)',
    hBg: '#d97706', hShadow: '0 3px 10px rgba(245,158,11,.28)',
  },
  outline: {
    bg: 'transparent', color: '#4f46e5', border: '1.5px solid #4f46e5',
    shadow: 'none',
    hBg: '#eef2ff', hShadow: 'none',
  },
  ghost: {
    bg: 'transparent', color: '#64748b', border: 'none',
    shadow: 'none',
    hBg: '#f1f5f9', hShadow: 'none',
  },
};

const S = {
  xs: { p: '4px 9px',  fs: '11.5px', h: '28px', r: '6px',  gap: '4px', iconFs: '12px' },
  sm: { p: '5px 11px', fs: '12.5px', h: '30px', r: '7px',  gap: '5px', iconFs: '13px' },
  md: { p: '7px 15px', fs: '13px',   h: '34px', r: '8px',  gap: '6px', iconFs: '14px' },
  lg: { p: '9px 20px', fs: '14px',   h: '38px', r: '9px',  gap: '7px', iconFs: '15px' },
};

/* ─── Button ────────────────────────────────────────────────────────────────── */
const Button = ({
  children,
  variant  = 'primary',
  size     = 'md',
  fullWidth = false,
  loading  = false,
  icon,
  iconOnly = false,
  iconPosition = 'left',
  onClick,
  type     = 'button',
  disabled = false,
  title,
  className = '',
  style: extra = {},
  ...rest
}) => {
  const v = V[variant] || V.primary;
  const s = S[size]    || S.md;
  const off = disabled || loading;

  const base = {
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            iconOnly ? 0 : s.gap,
    fontWeight:     600,
    fontSize:       s.fs,
    fontFamily:     "'Inter',-apple-system,sans-serif",
    letterSpacing:  '-0.01em',
    lineHeight:     1,
    borderRadius:   s.r,
    border:         v.border || 'none',
    cursor:         off ? 'not-allowed' : 'pointer',
    transition:     'background 150ms ease,box-shadow 150ms ease,transform 150ms ease,opacity 150ms ease',
    width:          fullWidth ? '100%' : 'auto',
    opacity:        off ? 0.5 : 1,
    padding:        iconOnly ? '0' : s.p,
    minHeight:      s.h,
    minWidth:       iconOnly ? s.h : undefined,
    background:     v.bg,
    color:          v.color,
    boxShadow:      v.shadow,
    whiteSpace:     'nowrap',
    touchAction:    'manipulation',
    textDecoration: 'none',
    userSelect:     'none',
    flexShrink:     0,
    ...extra,
  };

  const enter = (e) => {
    if (off) return;
    e.currentTarget.style.background  = v.hBg;
    e.currentTarget.style.boxShadow   = v.hShadow;
    e.currentTarget.style.transform   = 'translateY(-1px)';
  };
  const leave = (e) => {
    if (off) return;
    e.currentTarget.style.background  = v.bg;
    e.currentTarget.style.boxShadow   = v.shadow;
    e.currentTarget.style.transform   = 'translateY(0)';
  };
  const down = (e) => { if (!off) e.currentTarget.style.transform = 'translateY(0) scale(0.97)'; };
  const up   = (e) => { if (!off) e.currentTarget.style.transform = 'translateY(-1px) scale(1)'; };

  return (
    <button
      type={type}
      title={title}
      className={`btn btn-${variant} btn-${size} ${className}`}
      style={base}
      onClick={onClick}
      disabled={off}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onMouseDown={down}
      onMouseUp={up}
      {...rest}
    >
      {loading ? (
        <>
          <span style={{
            width: '13px', height: '13px',
            border: `2px solid ${variant === 'secondary' || variant === 'ghost' ? '#cbd5e1' : 'rgba(255,255,255,0.35)'}`,
            borderTopColor: v.color,
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }} />
          {!iconOnly && <span>Loading…</span>}
        </>
      ) : iconOnly ? (
        <span style={{ fontSize: s.iconFs, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon || children}</span>
      ) : (
        <>
          {icon && iconPosition === 'left'  && <span style={{ fontSize: s.iconFs, lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && <span style={{ fontSize: s.iconFs, lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>}
        </>
      )}
    </button>
  );
};

export default Button;
