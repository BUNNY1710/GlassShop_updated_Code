import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { Button, Input, Card } from "../components/ui";
import { useResponsive } from "../hooks/useResponsive";
import "../styles/design-system.css";

function Login() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [form, setForm] = useState({
    username: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) {
      setError("");
    }
  };

  const handleLogin = async e => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const res = await api.post("/api/auth/login", form);
      sessionStorage.setItem("token", res.data.token);
      sessionStorage.setItem("role", res.data.role);
      navigate("/dashboard");
    } catch (err) {
      let errorMessage = "Invalid username or password";
      
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.error && typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.message && typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        }
      } else if (err.message && typeof err.message === 'string') {
        errorMessage = err.message;
      }
      
      if (typeof errorMessage !== 'string') {
        errorMessage = "Invalid username or password";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={getAuthContainerStyle(isMobile)}>
      {/* Animated Background Elements */}
      <div style={getBgCircle1Style(isMobile)}></div>
      <div style={getBgCircle2Style(isMobile)}></div>
      <div style={getBgCircle3Style(isMobile)}></div>
      
      {/* Main Content */}
      <div style={getContentWrapperStyle(isMobile)}>
        {/* Left Side - Branding (Desktop Only) */}
        {!isMobile && (
          <div style={brandingSection}>
            <div style={brandingContent}>
              <div style={logoLarge}>🧱</div>
              <h1 style={brandTitle}>Glass Shop</h1>
              <p style={brandSubtitle}>
                Smart Inventory Management System
              </p>
              <div style={featuresList}>
                <div style={featureItem}>
                  <span style={featureIcon}>✓</span>
                  <span>Real-time Stock Tracking</span>
                </div>
                <div style={featureItem}>
                  <span style={featureIcon}>✓</span>
                  <span>AI-Powered Insights</span>
                </div>
                <div style={featureItem}>
                  <span style={featureIcon}>✓</span>
                  <span>Easy Billing Management</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Side - Login Form */}
        <div style={getFormSectionStyle(isMobile)}>
          <Card style={getLoginCardStyle(isMobile)} glass>
            {/* Mobile Logo */}
            {isMobile && (
              <div style={getMobileLogoSectionStyle(isMobile)}>
                <div style={getMobileLogoStyle(isMobile)}>🧱</div>
                <h1 style={getMobileTitleStyle(isMobile)}>Glass Shop</h1>
              </div>
            )}

            <div style={getFormHeaderStyle(isMobile)}>
              <h2 style={getFormTitleStyle(isMobile)}>Welcome Back</h2>
              <p style={getFormSubtitleStyle(isMobile)}>Sign in to continue to your dashboard</p>
            </div>

            <form onSubmit={handleLogin} style={getFormStyle(isMobile)}>
              <Input
                name="username"
                label="Username"
                placeholder="Enter your username"
                value={form.username}
                onChange={handleChange}
                required
                icon="👤"
                iconPosition="left"
                autoComplete="username"
              />

              <Input
                type="password"
                name="password"
                label="Password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
                icon="🔒"
                iconPosition="left"
                autoComplete="current-password"
              />

              {error && (
                <div style={errorCard} role="alert">
                  <span style={errorIcon}>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
                style={{ marginTop: '8px' }}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div style={getFooterSectionStyle(isMobile)}>
              <p style={getFooterTextStyle(isMobile)}>
                Don't have an account?{" "}
                <span 
                  style={footerLink} 
                  onClick={() => navigate("/register")}
                >
                  Create one now
                </span>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Login;

/* ================= STYLES ================= */

const getAuthContainerStyle = (isMobile) => ({
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  padding: isMobile ? "16px" : "20px",
  position: "relative",
  overflow: "hidden",
  boxSizing: "border-box",
});

const getBgCircle1Style = (isMobile) => ({
  position: "absolute",
  top: "-10%",
  right: "-10%",
  width: isMobile ? "300px" : "600px",
  height: isMobile ? "300px" : "600px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
  animation: "pulse 8s ease-in-out infinite",
});

const getBgCircle2Style = (isMobile) => ({
  position: "absolute",
  bottom: "-15%",
  left: "-15%",
  width: isMobile ? "250px" : "500px",
  height: isMobile ? "250px" : "500px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
  animation: "pulse 10s ease-in-out infinite",
});

const getBgCircle3Style = (isMobile) => ({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: isMobile ? "200px" : "400px",
  height: isMobile ? "200px" : "400px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
  animation: "pulse 12s ease-in-out infinite",
});

const getContentWrapperStyle = (isMobile) => ({
  display: "flex",
  width: "100%",
  maxWidth: "1200px",
  gap: isMobile ? "0" : "40px",
  alignItems: "center",
  position: "relative",
  zIndex: 1,
  flexWrap: "wrap",
  justifyContent: "center",
});

const brandingSection = {
  flex: 1,
  minWidth: "400px",
  color: "white",
  padding: "40px",
};

const brandingContent = {
  maxWidth: "500px",
};

const logoLarge = {
  fontSize: "80px",
  marginBottom: "24px",
  display: "block",
  animation: "bounce 2s ease-in-out infinite",
};

const brandTitle = {
  fontSize: "56px",
  fontWeight: "800",
  margin: "0 0 16px 0",
  lineHeight: "1.2",
  textShadow: "0 2px 10px rgba(0,0,0,0.2)",
};

const brandSubtitle = {
  fontSize: "20px",
  margin: "0 0 40px 0",
  opacity: 0.95,
  fontWeight: "400",
};

const featuresList = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const featureItem = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  fontSize: "18px",
  fontWeight: "500",
};

const featureIcon = {
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  background: "rgba(255,255,255,0.2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  fontWeight: "700",
  flexShrink: 0,
};

const getFormSectionStyle = (isMobile) => ({
  flex: 1,
  minWidth: isMobile ? "100%" : "400px",
  maxWidth: isMobile ? "100%" : "480px",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const getLoginCardStyle = (isMobile) => ({
  width: "100%",
  maxWidth: "480px",
  padding: isMobile ? "24px 20px" : "48px",
  animation: "fadeIn 0.5s ease-out",
  boxSizing: "border-box",
});

const getMobileLogoSectionStyle = (isMobile) => ({
  textAlign: "center",
  marginBottom: isMobile ? "24px" : "32px",
  paddingBottom: isMobile ? "24px" : "32px",
  borderBottom: "1px solid #e2e8f0",
});

const getMobileLogoStyle = (isMobile) => ({
  fontSize: isMobile ? "48px" : "64px",
  marginBottom: "16px",
  display: "block",
});

const getMobileTitleStyle = (isMobile) => ({
  fontSize: isMobile ? "24px" : "32px",
  fontWeight: "800",
  margin: "0",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
});

const getFormHeaderStyle = (isMobile) => ({
  marginBottom: isMobile ? "24px" : "32px",
  textAlign: "center",
});

const getFormTitleStyle = (isMobile) => ({
  fontSize: isMobile ? "24px" : "32px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 8px 0",
});

const getFormSubtitleStyle = (isMobile) => ({
  fontSize: isMobile ? "14px" : "16px",
  color: "#64748b",
  margin: "0",
  fontWeight: "400",
});

const getFormStyle = (isMobile) => ({
  display: "flex",
  flexDirection: "column",
  gap: isMobile ? "20px" : "24px",
});

const errorCard = {
  padding: "16px",
  borderRadius: "12px",
  background: "rgba(239, 68, 68, 0.1)",
  border: "1.5px solid rgba(239, 68, 68, 0.2)",
  color: "#dc2626",
  fontSize: "14px",
  fontWeight: "500",
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const errorIcon = {
  fontSize: "20px",
  flexShrink: 0,
};

const getFooterSectionStyle = (isMobile) => ({
  marginTop: isMobile ? "24px" : "32px",
  paddingTop: isMobile ? "20px" : "24px",
  borderTop: "1px solid #e2e8f0",
  textAlign: "center",
});

const getFooterTextStyle = (isMobile) => ({
  margin: "0",
  fontSize: isMobile ? "13px" : "14px",
  color: "#64748b",
  fontWeight: "400",
});

const footerLink = {
  color: "#667eea",
  cursor: "pointer",
  fontWeight: "600",
  textDecoration: "none",
  transition: "color 0.2s ease",
};
