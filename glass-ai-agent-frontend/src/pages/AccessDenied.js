import { useNavigate } from "react-router-dom";
import PageWrapper from "../components/PageWrapper";

function AccessDenied() {
  const navigate = useNavigate();
  return (
    <PageWrapper>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "60vh", textAlign: "center",
        gap: 12, fontFamily: "'Inter',-apple-system,sans-serif",
      }}>
        <div style={{ fontSize: 52, opacity: 0.15, lineHeight: 1 }}>⊘</div>
        <div style={{
          fontSize: 52, fontWeight: 800, color: "#ef4444",
          letterSpacing: "-0.04em", lineHeight: 1,
        }}>
          403
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "8px 0 0" }}>
          Access Denied
        </h2>
        <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0", maxWidth: 340, lineHeight: 1.6 }}>
          You do not have permission to access this module.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            marginTop: 16, padding: "10px 28px", borderRadius: 8,
            background: "#4f46e5", color: "#fff", border: "none",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
            transition: "background 140ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#4338ca"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#4f46e5"; }}
        >
          Back to Dashboard
        </button>
      </div>
    </PageWrapper>
  );
}

export default AccessDenied;
