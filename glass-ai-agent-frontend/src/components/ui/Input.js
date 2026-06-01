import React from 'react';

const Input = ({
  label,
  error,
  helperText,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  size = 'md',
  ...props
}) => {
  const paddingMap = {
    sm: { v: '7px', h: '11px' },
    md: { v: '9px', h: '13px' },
    lg: { v: '11px', h: '15px' },
  };
  const p = paddingMap[size] || paddingMap.md;

  const inputStyle = {
    width: fullWidth ? '100%' : 'auto',
    fontSize: '14px',
    fontFamily: "'Inter', -apple-system, sans-serif",
    borderRadius: '8px',
    border: error ? '1.5px solid #dc2626' : '1.5px solid #e2e8f0',
    background: '#ffffff',
    color: '#0f172a',
    transition: 'border-color 160ms ease, box-shadow 160ms ease',
    boxSizing: 'border-box',
    lineHeight: '1.5',
    outline: 'none',
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    paddingTop: p.v,
    paddingBottom: p.v,
    paddingLeft: icon && iconPosition === 'left' ? '38px' : p.h,
    paddingRight: icon && iconPosition === 'right' ? '38px' : p.h,
    minHeight: size === 'lg' ? '44px' : size === 'sm' ? '32px' : '38px',
  };

  return (
    <div style={{ width: fullWidth ? '100%' : 'auto', marginBottom: (helperText || error) ? '18px' : '0' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '12.5px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '6px',
          letterSpacing: '-0.01em',
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        {icon && iconPosition === 'left' && (
          <span style={{
            position: 'absolute', top: '50%', left: '11px',
            transform: 'translateY(-50%)',
            fontSize: '16px', color: '#94a3b8', pointerEvents: 'none', lineHeight: 1,
          }}>
            {icon}
          </span>
        )}

        <input
          style={inputStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? '#dc2626' : '#6366f1';
            e.currentTarget.style.boxShadow = error
              ? '0 0 0 3px rgba(220,38,38,0.10)'
              : '0 0 0 3px rgba(99,102,241,0.12)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? '#dc2626' : '#e2e8f0';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,0.04)';
          }}
          {...props}
        />

        {icon && iconPosition === 'right' && (
          <span style={{
            position: 'absolute', top: '50%', right: '11px',
            transform: 'translateY(-50%)',
            fontSize: '16px', color: '#94a3b8', pointerEvents: 'none', lineHeight: 1,
          }}>
            {icon}
          </span>
        )}
      </div>

      {(error || helperText) && (
        <p style={{
          fontSize: '12px',
          marginTop: '5px',
          marginBottom: 0,
          color: error ? '#dc2626' : '#64748b',
          fontWeight: error ? '500' : '400',
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default Input;
