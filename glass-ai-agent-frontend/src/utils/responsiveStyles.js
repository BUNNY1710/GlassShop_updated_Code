/**
 * Responsive Style Utilities
 * Provides consistent responsive styles across the application
 */

export const getResponsiveStyles = (isMobile, isTablet) => {
  return {
    // Container padding
    containerPadding: isMobile ? "12px" : isTablet ? "20px" : "24px",
    
    // Grid columns
    gridColumns: {
      mobile: "1fr",
      tablet: "repeat(2, 1fr)",
      desktop: "repeat(3, 1fr)",
    },
    
    // Font sizes
    fontSize: {
      h1: isMobile ? "24px" : isTablet ? "28px" : "32px",
      h2: isMobile ? "20px" : isTablet ? "24px" : "28px",
      h3: isMobile ? "18px" : isTablet ? "20px" : "24px",
      body: isMobile ? "14px" : "16px",
      small: isMobile ? "12px" : "14px",
    },
    
    // Button sizes
    button: {
      padding: isMobile ? "12px 16px" : "12px 24px",
      fontSize: isMobile ? "14px" : "16px",
      minHeight: "44px", // Touch-friendly
      minWidth: isMobile ? "100%" : "120px",
    },
    
    // Modal styles
    modal: {
      padding: isMobile ? "20px 16px" : "30px",
      maxWidth: isMobile ? "100%" : isTablet ? "600px" : "700px",
      borderRadius: isMobile ? "20px 20px 0 0" : "16px",
      maxHeight: isMobile ? "90vh" : "85vh",
    },
    
    // Table styles
    table: {
      minWidth: isMobile ? "600px" : "auto",
      fontSize: isMobile ? "13px" : "14px",
      cellPadding: isMobile ? "10px 8px" : "16px",
    },
    
    // Form styles
    form: {
      gap: isMobile ? "16px" : "20px",
      inputPadding: "12px 16px",
      inputFontSize: "16px", // Prevent iOS zoom
    },
    
    // Card styles
    card: {
      padding: isMobile ? "16px" : "24px",
      borderRadius: isMobile ? "12px" : "16px",
      marginBottom: isMobile ? "16px" : "20px",
    },
    
    // Spacing
    spacing: {
      small: isMobile ? "8px" : "12px",
      medium: isMobile ? "16px" : "20px",
      large: isMobile ? "24px" : "32px",
    },
  };
};

export const getTableWrapperStyle = (isMobile) => ({
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  width: "100%",
  margin: isMobile ? "0 -12px" : "0",
  padding: isMobile ? "0 12px" : "0",
});

export const getModalOverlayStyle = (isMobile) => ({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: isMobile ? "flex-end" : "center",
  justifyContent: "center",
  zIndex: 10004,
  padding: isMobile ? "0" : "20px",
  paddingTop: "80px",
});

export const getModalContentStyle = (isMobile, isTablet) => ({
  backgroundColor: "white",
  padding: isMobile ? "20px 16px" : "30px",
  borderRadius: isMobile ? "20px 20px 0 0" : "16px",
  maxWidth: isMobile ? "100%" : isTablet ? "600px" : "700px",
  width: "100%",
  maxHeight: isMobile ? "90vh" : "85vh",
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  position: "relative",
  zIndex: 10005,
});

export const getButtonGroupStyle = (isMobile) => ({
  display: "flex",
  flexDirection: isMobile ? "column" : "row",
  gap: isMobile ? "12px" : "12px",
  width: "100%",
});

export const getButtonStyle = (isMobile, variant = "primary") => {
  const baseStyle = {
    padding: "12px 24px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    transition: "all 0.2s",
    minHeight: "44px", // Touch-friendly
    width: isMobile ? "100%" : "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    touchAction: "manipulation", // Prevent double-tap zoom
  };

  const variants = {
    primary: {
      backgroundColor: "#6366f1",
      color: "white",
    },
    success: {
      backgroundColor: "#22c55e",
      color: "white",
    },
    danger: {
      backgroundColor: "#ef4444",
      color: "white",
    },
    secondary: {
      backgroundColor: "#6b7280",
      color: "white",
    },
  };

  return { ...baseStyle, ...variants[variant] };
};

export const getFormGridStyle = (isMobile, isTablet, columns = 2) => ({
  display: "grid",
  gridTemplateColumns: isMobile 
    ? "1fr" 
    : isTablet 
    ? `repeat(${Math.min(columns, 2)}, 1fr)` 
    : `repeat(${columns}, 1fr)`,
  gap: isMobile ? "16px" : "20px",
});

export const getInputStyle = () => ({
  width: "100%",
  padding: "12px 16px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "16px", // Prevent iOS zoom
  transition: "all 0.2s",
  boxSizing: "border-box",
  WebkitAppearance: "none",
  appearance: "none",
});

export const getCardStyle = (isMobile) => ({
  backgroundColor: "white",
  padding: isMobile ? "16px" : "24px",
  borderRadius: isMobile ? "12px" : "16px",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  marginBottom: isMobile ? "16px" : "20px",
});

