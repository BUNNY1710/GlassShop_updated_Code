import React from 'react';

const Select = ({
  label,
  error,
  hint,
  helperText,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  size = 'md',
  disabled,
  children,
  ...props
}) => {
  // Support both `hint` and legacy `helperText` prop names
  const hintText = hint || helperText;

  const selectStyle = {
    width: fullWidth ? '100%' : 'auto',
    height: '40px',
    paddingTop: '0',
    paddingBottom: '0',
    paddingLeft: icon && iconPosition === 'left' ? '38px' : '12px',
    paddingRight: '36px',
    fontSize: '14px',
    fontFamily: "'Inter',-apple-system,sans-serif",
    borderRadius: '10px',
    border: error
      ? '1.5px solid #FF6B81'
      : '1.5px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    transition: 'border-color 150ms ease, box-shadow 150ms ease, background 150ms ease',
    boxSizing: 'border-box',
    cursor: disabled ? 'not-allowed' : 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%237180A6' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundPosition: 'right 10px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '16px',
    outline: 'none',
    lineHeight: '1.5',
    opacity: disabled ? 0.4 : 1,
  };

  return (
    <div style={{ width: fullWidth ? '100%' : 'auto', marginBottom: (hintText || error) ? '18px' : '0' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '11.5px',
          fontWeight: '600',
          color: '#A9B3D1',
          marginBottom: '5px',
          fontFamily: "'Inter',-apple-system,sans-serif",
        }}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        {icon && iconPosition === 'left' && (
          <span style={{
            position: 'absolute',
            top: '50%',
            left: '11px',
            transform: 'translateY(-50%)',
            fontSize: '16px',
            color: 'rgba(113,128,166,0.7)',
            pointerEvents: 'none',
            lineHeight: 1,
            zIndex: 1,
          }}>
            {icon}
          </span>
        )}

        <select
          style={selectStyle}
          disabled={disabled}
          onFocus={(e) => {
            if (disabled) return;
            e.currentTarget.style.borderColor = error
              ? '#FF6B81'
              : 'rgba(79,93,255,0.6)';
            e.currentTarget.style.boxShadow = error
              ? '0 0 0 3px rgba(255,107,129,0.15)'
              : '0 0 0 3px rgba(79,93,255,0.15)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.09)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error
              ? '#FF6B81'
              : 'rgba(255,255,255,0.1)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          }}
          {...props}
        >
          {children}
        </select>
      </div>

      {error && (
        <p style={{
          fontSize: '11.5px',
          marginTop: '4px',
          marginBottom: 0,
          color: '#FF6B81',
          fontFamily: "'Inter',-apple-system,sans-serif",
        }}>
          {error}
        </p>
      )}

      {!error && hintText && (
        <p style={{
          fontSize: '11.5px',
          marginTop: '4px',
          marginBottom: 0,
          color: '#7180A6',
          fontFamily: "'Inter',-apple-system,sans-serif",
        }}>
          {hintText}
        </p>
      )}
    </div>
  );
};

/* Inject dark option background via a global style tag (only once) */
if (typeof document !== 'undefined' && !document.getElementById('dark-select-options')) {
  const style = document.createElement('style');
  style.id = 'dark-select-options';
  style.textContent = 'select option { background: #0D1B3E; color: #fff; }';
  document.head.appendChild(style);
}

export default Select;
