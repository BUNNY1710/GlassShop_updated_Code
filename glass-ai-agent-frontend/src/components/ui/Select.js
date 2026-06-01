import React from 'react';

const Select = ({
  label,
  error,
  helperText,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  size = 'md',
  children,
  ...props
}) => {
  const paddingV = size === 'sm' ? '7px' : size === 'lg' ? '11px' : '9px';
  const paddingH = size === 'sm' ? '11px' : size === 'lg' ? '15px' : '13px';

  const selectStyle = {
    width: fullWidth ? '100%' : 'auto',
    paddingTop: paddingV,
    paddingBottom: paddingV,
    paddingLeft: icon && iconPosition === 'left' ? '38px' : paddingH,
    paddingRight: '36px',
    fontSize: '14px',
    fontFamily: "'Inter', -apple-system, sans-serif",
    borderRadius: '8px',
    border: error ? '1.5px solid #dc2626' : '1.5px solid #e2e8f0',
    background: '#ffffff',
    color: '#0f172a',
    transition: 'border-color 160ms ease, box-shadow 160ms ease',
    boxSizing: 'border-box',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundPosition: 'right 10px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '16px',
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    outline: 'none',
    minHeight: size === 'lg' ? '44px' : size === 'sm' ? '32px' : '38px',
    lineHeight: '1.5',
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
            fontSize: '16px', color: '#94a3b8', pointerEvents: 'none',
            lineHeight: 1, zIndex: 1,
          }}>
            {icon}
          </span>
        )}

        <select
          style={selectStyle}
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
        >
          {children}
        </select>
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

export default Select;
