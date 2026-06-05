import React from 'react';

/* ─── Design tokens ────────────────────────────────────────────────────────── */
const V = {
  primary: {
    bg: '#4f46e5', color: '#fff', border: 'none',
    shadow: '0 1px 2px rgba(79,70,229,.20)',
    hBg: '#4338ca', hShadow: '0 4px 12px rgba(79,70,229,.30)',
  },
  secondary: {
    bg: '#ffffff', color: '#374151', border: '1.5px solid #e2e8f0',
    shadow: '0 1px 2px rgba(15,23,42,.04)',
    hBg: '#f8fafc', hShadow: '0 2px 6px rgba(15,23,42,.07)',
  },
  success: {
    bg: '#10b981', color: '#fff', border: 'none',
    shadow: '0 1px 2px rgba(16,185,129,.20)',
    hBg: '#059669', hShadow: '0 4px 12px rgba(16,185,129,.28)',
  },
  danger: {
    bg: '#f43f5e', color: '#fff', border: 'none',
    shadow: '0 1px 2px rgba(244,63,94,.20)',
    hBg: '#e11d48', hShadow: '0 4px 12px rgba(244,63,94,.28)',
  },
  warning: {
    bg: '#f59e0b', color: '#fff', border: 'none',
    shadow: '0 1px 2px rgba(245,158,11,.20)',
    hBg: '#d97706', hShadow: '0 4px 12px rgba(245,158,11,.28)',
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
  xs: { p: '0 9px',  fs: '11.5px', h: '28px', r: '6px',  gap: '4px', spinSz: '10px' },
  sm: { p: '0 10px', fs: '12px',   h: '30px', r: '8px',  gap: '5px', spinSz: '11px' },
  md: { p: '0 16px', fs: '13px',   h: '36px', r: '10px', gap: '6px', spinSz: '12px' },
  lg: { p: '0 24px', fs: '14px',   h: '42px', r: '12px', gap: '7px', spinSz: '13px' },
};

/* ─── Button ────────────────────────────────────────────────────────────────── */
const Button = ({
  children,
  variant      = 'primary',
  size         = 'md',
  fullWidth    = false,
  loading      = false,
  icon,
  iconOnly     = false,
  iconPosition = 'left',
  onClick,
  type         = 'button',
  disabled     = false,
  title,
  className    = '',
  style: extra = {},
  ...rest
}) => {
  const v   = V[variant] || V.primary;
  const s   = S[size]    || S.md;
  const off = disabled || loading;

  const base = {
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            iconOnly ? 0 : s.gap,
    fontWeight:     500,
    fontSize:       s.fs,
    fontFamily:     "'Inter',-apple-system,sans-serif",
    letterSpacing:  '-0.01em',
    lineHeight:     1,
    borderRadius:   s.r,
    border:         v.border || 'none',
    cursor:         off ? 'not-allowed' : 'pointer',
    transition:     'background 150ms ease, box-shadow 150ms ease, transform 150ms ease, opacity 150ms ease',
    width:          fullWidth ? '100%' : 'auto',
    opacity:        off ? 0.5 : 1,
    padding:        iconOnly ? '0' : s.p,
    height:         iconOnly ? s.h : s.h,
    minWidth:       iconOnly ? s.h : undefined,
    background:     v.bg,
    color:          v.color,
    boxShadow:      v.shadow,
    whiteSpace:     'nowrap',
    touchAction:    'manipulation',
    textDecoration: 'none',
    userSelect:     'none',
    flexShrink:     0,
    boxSizing:      'border-box',
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

  /* Spinner color: white for filled variants, muted for ghost/secondary */
  const spinBorder = (variant === 'secondary' || variant === 'ghost' || variant === 'outline')
    ? 'rgba(100,116,139,0.3)'
    : 'rgba(255,255,255,0.3)';
  const spinTop = (variant === 'secondary' || variant === 'ghost' || variant === 'outline')
    ? '#64748b'
    : '#ffffff';

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
            width:          s.spinSz,
            height:         s.spinSz,
            border:         `1.5px solid ${spinBorder}`,
            borderTopColor: spinTop,
            borderRadius:   '50%',
            animation:      'spin 0.7s linear infinite',
            flexShrink:     0,
            display:        'block',
          }} />
          {!iconOnly && <span>Loading…</span>}
        </>
      ) : iconOnly ? (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon || children}
        </span>
      ) : (
        <>
          {icon && iconPosition === 'left'  && (
            <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
          )}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && (
            <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
          )}
        </>
      )}
    </button>
  );
};

export default Button;
