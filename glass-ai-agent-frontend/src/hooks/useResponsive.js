import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive design
 * Returns device type and breakpoint information
 */
export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowSize.width < 768;
  const isTablet = windowSize.width >= 768 && windowSize.width < 1024;
  const isDesktop = windowSize.width >= 1024;
  const isSmallMobile = windowSize.width < 480;
  const isLargeMobile = windowSize.width >= 480 && windowSize.width < 768;

  return {
    width: windowSize.width,
    height: windowSize.height,
    isMobile,
    isTablet,
    isDesktop,
    isSmallMobile,
    isLargeMobile,
    isMobileOrTablet: isMobile || isTablet,
  };
};

export default useResponsive;

