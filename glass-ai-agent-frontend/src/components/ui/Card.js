import React from 'react';
import { useResponsive } from '../../hooks/useResponsive';

const Card = ({
  children,
  className = '',
  onClick,
  hover = false,
  gradient = false,
  glass = false,
  padding = 'lg',
  ...props
}) => {
  const { isMobile } = useResponsive();

  const getPadding = () => {
    if (isMobile) {
      return padding === 'sm' ? '12px' : padding === 'md' ? '14px' : padding === 'lg' ? '16px' : padding;
    }
    return padding === 'sm' ? '14px' : padding === 'md' ? '18px' : padding === 'lg' ? '20px' : padding;
  };

  const baseStyle = {
    background: glass
      ? 'rgba(255,255,255,0.75)'
      : gradient
        ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
        : '#ffffff',
    backdropFilter: glass ? 'blur(16px) saturate(180%)' : 'none',
    WebkitBackdropFilter: glass ? 'blur(16px) saturate(180%)' : 'none',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
    border: glass
      ? '1px solid rgba(255,255,255,0.4)'
      : '1px solid #e8edf2',
    transition: 'box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease',
    cursor: onClick ? 'pointer' : 'default',
    padding: getPadding(),
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', -apple-system, sans-serif",
  };

  const { style: propsStyle, ...restProps } = props;

  const cleanPropsStyle = propsStyle
    ? Object.keys(propsStyle).reduce((acc, key) => {
        if (!key.toLowerCase().includes('padding')) acc[key] = propsStyle[key];
        return acc;
      }, {})
    : {};

  const mergedStyle = { ...cleanPropsStyle, ...baseStyle };

  return (
    <div
      className={`card ${className}`}
      style={mergedStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (hover || onClick) {
          e.currentTarget.style.boxShadow =
            '0 6px 16px rgba(15,23,42,0.09), 0 2px 6px rgba(15,23,42,0.05)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = '#d1d9e0';
        }
      }}
      onMouseLeave={(e) => {
        if (hover || onClick) {
          e.currentTarget.style.boxShadow =
            '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = '#e8edf2';
        }
      }}
      {...restProps}
    >
      {children}
    </div>
  );
};

export default Card;
