import { useNavigate } from "react-router-dom";

function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{
        background: "rgba(17,27,53,0.9)",
        border: "1.5px solid rgba(255,107,129,0.35)",
        borderRadius: 20,
        padding: "48px 40px",
        maxWidth: 420,
        width: "100%",
        textAlign: "center",
        boxShadow: "0 4px 40px rgba(0,0,0,0.5)",
      }}>
        {/* Icon */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "rgba(255,107,129,0.12)",
          border: "2px solid rgba(255,107,129,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          fontSize: 36,
        }}>
          🚫
        </div>

        {/* 403 */}
        <div style={{
          fontSize: 56,
          fontWeight: 800,
          color: "#FF6B81",
          letterSpacing: "-0.04em",
          lineHeight: 1,
          marginBottom: 12,
        }}>
          403
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#FFFFFF",
          margin: "0 0 10px",
          letterSpacing: "-0.01em",
        }}>
          Access Denied
        </h2>

        {/* Subtitle */}
        <p style={{
          fontSize: 14,
          color: "#A9B3D1",
          margin: "0 0 32px",
          lineHeight: 1.6,
          maxWidth: 300,
          marginLeft: "auto",
          marginRight: "auto",
        }}>
          You do not have permission to access this module.
        </p>

        {/* Button */}
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            padding: "11px 32px",
            borderRadius: 10,
            background: "#4F5DFF",
            color: "#fff",
            border: "none",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 140ms ease",
            height: 44,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#3D4DE8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#4F5DFF"; }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default AccessDenied;
