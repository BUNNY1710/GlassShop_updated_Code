import React from 'react';
import { useResponsive } from '../../hooks/useResponsive';

/**
 * Premium card component — dark theme.
 *
 * Props:
 *   hover       — enables lift shadow on hover
 *   elevated    — starts with a stronger shadow
 *   interactive — adds cursor:pointer and active scale
 *   glass       — frosted-glass variant (kept for Login.js compat)
 *   gradient    — indigo gradient variant (legacy compat)
 *   padding     — 'sm' | 'md' | 'lg' | any CSS string
 *   onClick     — makes the card interactive automatically
 */
const Card = ({
  children,
  className = '',
  onClick,
  hover       = false,
  elevated    = false,
  interactive = false,
  glass       = false,
  gradient    = false,
  padding     = 'lg',
  ...props
}) => {
  const { isMobile } = useResponsive();

  const getPadding = () => {
    if (isMobile) {
      if (padding === 'sm') return '12px';
      if (padding === 'md') return '14px';
      if (padding === 'lg') return '16px';
      return padding;
    }
    if (padding === 'sm') return '14px';
    if (padding === 'md') return '18px';
    if (padding === 'lg') return '20px';
    return padding;
  };

  const isClickable = interactive || !!onClick;

  const baseStyle = {
    background: glass
      ? 'rgba(255,255,255,0.05)'
      : gradient
        ? 'linear-gradient(135deg,#4F5DFF 0%,#3D4DE8 100%)'
        : 'rgba(17,27,53,0.9)',
    backdropFilter:       glass ? 'blur(20px)' : 'none',
    WebkitBackdropFilter: glass ? 'blur(20px)' : 'none',
    borderRadius:         14,
    boxShadow:            elevated
      ? '0 12px 40px rgba(0,0,0,0.5)'
      : '0 4px 24px rgba(0,0,0,0.4)',
    border: glass
      ? '1px solid rgba(255,255,255,0.12)'
      : gradient
        ? 'none'
        : '1px solid rgba(255,255,255,0.08)',
    transition:  'all 180ms ease',
    cursor:      isClickable ? 'pointer' : 'default',
    userSelect:  isClickable ? 'none' : 'auto',
    padding:     getPadding(),
    position:    'relative',
    overflow:    'hidden',
    fontFamily:  "'Inter',-apple-system,sans-serif",
  };

  const { style: propsStyle, ...restProps } = props;

  /* Merge external style, protecting padding so responsive getPadding() is authoritative */
  const cleanPropsStyle = propsStyle
    ? Object.keys(propsStyle).reduce((acc, key) => {
        if (!key.toLowerCase().includes('padding')) acc[key] = propsStyle[key];
        return acc;
      }, {})
    : {};

  const mergedStyle = { ...cleanPropsStyle, ...baseStyle };

  const onEnter = (e) => {
    if (hover || isClickable) {
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
      e.currentTarget.style.boxShadow   = '0 8px 40px rgba(0,0,0,0.5)';
      e.currentTarget.style.transform   = 'translateY(-1px)';
    }
  };

  const onLeave = (e) => {
    if (hover || isClickable) {
      e.currentTarget.style.borderColor = glass
        ? 'rgba(255,255,255,0.12)'
        : gradient
          ? 'transparent'
          : 'rgba(255,255,255,0.08)';
      e.currentTarget.style.boxShadow   = elevated
        ? '0 12px 40px rgba(0,0,0,0.5)'
        : '0 4px 24px rgba(0,0,0,0.4)';
      e.currentTarget.style.transform   = 'translateY(0)';
    }
  };

  const onDown = (e) => {
    if (isClickable) e.currentTarget.style.transform = 'translateY(0) scale(0.99)';
  };

  const onUp = (e) => {
    if (isClickable) e.currentTarget.style.transform = 'translateY(-1px) scale(1)';
  };

  return (
    <div
      className={`card ${className}`}
      style={mergedStyle}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onMouseDown={isClickable ? onDown : undefined}
      onMouseUp={isClickable ? onUp : undefined}
      {...restProps}
    >
      {children}
    </div>
  );
};

export default Card;
