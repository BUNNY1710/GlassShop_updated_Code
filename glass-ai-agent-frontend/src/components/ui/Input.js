import React from 'react';

const Input = ({
  label,
  error,
  hint,
  helperText,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  size = 'md',
  disabled,
  ...props
}) => {
  // Support both `hint` and legacy `helperText` prop names
  const hintText = hint || helperText;

  const inputStyle = {
    width: '100%',
    height: '40px',
    padding: '0 12px',
    paddingLeft: icon && iconPosition === 'left' ? '38px' : '12px',
    paddingRight: icon && iconPosition === 'right' ? '38px' : '12px',
    background: 'rgba(255,255,255,0.06)',
    border: error
      ? '1.5px solid #FF6B81'
      : '1.5px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '14px',
    fontFamily: "'Inter',-apple-system,sans-serif",
    transition: 'border-color 150ms ease, box-shadow 150ms ease, background 150ms ease',
    boxSizing: 'border-box',
    outline: 'none',
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
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
          }}>
            {icon}
          </span>
        )}

        <input
          style={inputStyle}
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
          onMouseEnter={(e) => {
            if (disabled || e.currentTarget === document.activeElement) return;
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.borderColor = error
              ? '#FF6B81'
              : 'rgba(255,255,255,0.16)';
          }}
          onMouseLeave={(e) => {
            if (disabled || e.currentTarget === document.activeElement) return;
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.borderColor = error
              ? '#FF6B81'
              : 'rgba(255,255,255,0.1)';
          }}
          {...props}
        />

        {icon && iconPosition === 'right' && (
          <span style={{
            position: 'absolute',
            top: '50%',
            right: '11px',
            transform: 'translateY(-50%)',
            fontSize: '16px',
            color: 'rgba(113,128,166,0.7)',
            pointerEvents: 'none',
            lineHeight: 1,
          }}>
            {icon}
          </span>
        )}
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

/* Inject placeholder color via a global style tag (only once) */
if (typeof document !== 'undefined' && !document.getElementById('dark-input-placeholder')) {
  const style = document.createElement('style');
  style.id = 'dark-input-placeholder';
  style.textContent = 'input::placeholder { color: rgba(113,128,166,0.7) !important; }';
  document.head.appendChild(style);
}

export default Input;
