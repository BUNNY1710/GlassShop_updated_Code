import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { useResponsive } from "../hooks/useResponsive";
import "../styles/design-system.css";

/* ── Inline SVG helpers ─────────────────────────────────────────────────── */
function Icon({ d, size = 16, color = "currentColor", strokeWidth = 1.8 }) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}>
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

const EYE_OPEN  = "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z";
const EYE_SHUT  = ["M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24", "M1 1l22 22"];
const CHECK     = "M20 6L9 17l-5-5";
const STAR_LOGO = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
const ALERT     = ["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z", "M12 9v4", "M12 17h.01"];
const USER_IC   = "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 3a4 4 0 100 8 4 4 0 000-8z";
const LOCK_IC   = ["M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z", "M7 11V7a5 5 0 0110 0v4"];

function Login() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [form, setForm]       = useState({ username: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleLogin = async (e) => {
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
        if (typeof errorData === "string") {
          errorMessage = errorData;
        } else if (errorData.error && typeof errorData.error === "string") {
          errorMessage = errorData.error;
        } else if (errorData.message && typeof errorData.message === "string") {
          errorMessage = errorData.message;
        }
      } else if (err.message && typeof err.message === "string") {
        errorMessage = err.message;
      }

      if (typeof errorMessage !== "string") {
        errorMessage = "Invalid username or password";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    "Real-time stock tracking & optimization",
    "Professional quotations & invoicing",
    "AI-powered business insights",
  ];

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      fontFamily: "'Inter',-apple-system,sans-serif",
    }}>
      {/* ── Left panel (desktop only) ── */}
      {!isMobile && (
        <div style={{
          flex: 1,
          minWidth: 480,
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 60,
          position: "relative",
          overflow: "hidden",
          /* Subtle dot grid */
          backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}>
          {/* Gradient overlay on top of dot grid */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(79,70,229,0.12) 0%, transparent 60%)",
            pointerEvents: "none",
          }} />

          <div style={{ position: "relative", zIndex: 1, maxWidth: 420 }}>
            {/* Logo */}
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 28,
              boxShadow: "0 4px 16px rgba(79,70,229,0.4)",
            }}>
              <Icon d={STAR_LOGO} size={22} color="rgba(255,255,255,0.92)" strokeWidth={1.6} />
            </div>

            {/* Title */}
            <h1 style={{
              fontSize: 32,
              fontWeight: 800,
              color: "#ffffff",
              margin: "0 0 12px 0",
              letterSpacing: "-0.04em",
              lineHeight: 1.15,
            }}>
              GlassShop
            </h1>
            <p style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.6)",
              margin: "0 0 44px 0",
              fontWeight: 400,
              lineHeight: 1.6,
            }}>
              Inventory &amp; Billing Management
            </p>

            {/* Feature list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Checkmark circle */}
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "rgba(99,102,241,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "#a5b4fc",
                  }}>
                    <Icon d={CHECK} size={11} color="#a5b4fc" strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
                    {f}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Right panel ── */}
      <div style={{
        flex: 1,
        background: "linear-gradient(180deg,#07122D 0%,#040A18 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "24px 16px" : "40px",
        minHeight: isMobile ? "100vh" : "auto",
      }}>
        <div style={{
          background: "rgba(17,27,53,0.9)",
          borderRadius: 20,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: isMobile ? "28px 24px" : "40px",
          width: "100%",
          maxWidth: 420,
          animation: "fadeIn 0.3s cubic-bezier(0.4,0,0.2,1) both",
        }}>
          {/* Mobile branding */}
          {isMobile && (
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
                boxShadow: "0 4px 14px rgba(79,70,229,0.3)",
              }}>
                <Icon d={STAR_LOGO} size={20} color="rgba(255,255,255,0.92)" strokeWidth={1.6} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#E2E8F0", letterSpacing: "-0.03em" }}>
                GlassShop
              </div>
            </div>
          )}

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#E2E8F0",
              margin: "0 0 6px 0",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
            }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 14, color: "#7180A6", margin: 0, fontWeight: 400 }}>
              Sign in to your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Username */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#A9B3D1", marginBottom: 5 }}>
                Username
              </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                }}>
                  <Icon d={USER_IC} size={15} color="#94a3b8" />
                </span>
                <input
                  name="username"
                  placeholder="Enter your username"
                  value={form.username}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                  style={{
                    width: "100%",
                    height: 40,
                    paddingLeft: 34,
                    paddingRight: 12,
                    border: "1.5px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 14,
                    fontFamily: "inherit",
                    color: "#E2E8F0",
                    background: "rgba(255,255,255,0.06)",
                    outline: "none",
                    transition: "border-color 160ms ease, box-shadow 160ms ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(79,93,255,0.6)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(79,93,255,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.1)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#A9B3D1", marginBottom: 5 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                }}>
                  <Icon d={LOCK_IC} size={15} color="#94a3b8" />
                </span>
                <input
                  type={showPw ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    height: 40,
                    paddingLeft: 34,
                    paddingRight: 40,
                    border: "1.5px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 14,
                    fontFamily: "inherit",
                    color: "#E2E8F0",
                    background: "rgba(255,255,255,0.06)",
                    outline: "none",
                    transition: "border-color 160ms ease, box-shadow 160ms ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(79,93,255,0.6)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(79,93,255,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.boxShadow = "none";
                  }}
                />
                {/* Eye toggle */}
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 4,
                    transition: "color 130ms ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#64748b"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; }}
                  tabIndex={-1}
                >
                  <Icon d={showPw ? EYE_SHUT : EYE_OPEN} size={15} color="currentColor" />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  borderRadius: 8,
                  color: "#be123c",
                  fontSize: 13,
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                <span style={{ flexShrink: 0, color: "#f43f5e" }}>
                  <Icon d={ALERT} size={15} color="#f43f5e" />
                </span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: 40,
                borderRadius: 10,
                border: "none",
                background: loading ? "#6366f1" : "#4f46e5",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 4,
                transition: "background 150ms ease, transform 150ms ease, box-shadow 150ms ease",
                boxShadow: "0 1px 2px rgba(79,70,229,0.2)",
                opacity: loading ? 0.8 : 1,
                letterSpacing: "-0.01em",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = "#4338ca";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(79,70,229,0.30)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#4f46e5";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(79,70,229,0.2)";
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#ffffff",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                    flexShrink: 0,
                  }} />
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Footer */}
          <p style={{
            fontSize: 12,
            color: "#94a3b8",
            textAlign: "center",
            margin: "20px 0 0 0",
            lineHeight: 1.5,
          }}>
            Don't have an account? Contact your administrator
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
