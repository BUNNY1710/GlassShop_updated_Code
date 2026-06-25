import { useState } from "react";
import api from "../api/api";
import { useResponsive } from "../hooks/useResponsive";

// Field config — rendered inline (NOT as a nested component) so inputs are never
// remounted on re-render, which previously caused focus loss after each keystroke.
const FIELDS = [
  { k: "shopName", label: "Shop Name", placeholder: "e.g. Sai Glass House", type: "text" },
  { k: "username", label: "Username", placeholder: "Choose a login username", type: "text" },
  { k: "email", label: "Email Address", placeholder: "you@example.com", type: "email" },
  { k: "password", label: "Password", placeholder: "Min 6 characters", type: "password" },
  { k: "confirm", label: "Confirm Password", placeholder: "Repeat password", type: "password" },
];

export default function RegisterShop({ onBack, onRegistered }) {
  const { isMobile } = useResponsive();
  const [f, setF] = useState({ shopName: "", username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onField = (k) => (e) => {
    const v = e.target.value;
    setF((prev) => ({ ...prev, [k]: v }));
    if (error) setError("");
  };

  const validate = () => {
    if (!f.shopName.trim()) return "Shop name is required";
    if (!f.username.trim()) return "Username is required";
    if (!f.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return "Enter a valid email address";
    if (f.password.length < 6) return "Password must be at least 6 characters";
    if (f.password !== f.confirm) return "Passwords do not match";
    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setLoading(true); setError("");
    try {
      await api.post("/api/auth/register-shop", {
        shopName: f.shopName.trim(), username: f.username.trim(),
        email: f.email.trim(), password: f.password,
      });
      // No auto-login — hand the username back so Login can prefill + show success.
      onRegistered && onRegistered(f.username.trim());
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "Registration failed");
    } finally { setLoading(false); }
  };

  const inp = {
    width: "100%", height: 42, padding: "0 12px", borderRadius: 9,
    border: "1.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)",
    color: "#E2E8F0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#07122D 0%,#040A18 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "24px 16px" : "40px", fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <div style={{ background: "rgba(17,27,53,0.95)", borderRadius: 20, boxShadow: "0 24px 64px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)", padding: isMobile ? "28px 22px" : "40px", width: "100%", maxWidth: 420 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#E2E8F0", margin: "0 0 6px", letterSpacing: "-0.03em" }}>🏪 Register Your Shop</h2>
          <p style={{ fontSize: 13.5, color: "#7180A6", margin: 0 }}>Create your shop — you become the Owner and are logged in straight away.</p>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {FIELDS.map(({ k, label, placeholder, type }) => (
            <div key={k}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#A9B3D1", marginBottom: 5 }}>
                {label}<span style={{ color: "#FF6B81" }}> *</span>
              </label>
              <input
                type={type}
                value={f[k]}
                onChange={onField(k)}
                placeholder={placeholder}
                style={inp}
                autoComplete={k === "password" || k === "confirm" ? "new-password" : "off"}
                onFocus={(e) => { e.target.style.borderColor = "rgba(79,93,255,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(79,93,255,0.15)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          ))}

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "rgba(255,107,129,0.1)", border: "1px solid rgba(255,107,129,0.3)", borderRadius: 8, color: "#FF6B81", fontSize: 13 }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onBack} disabled={loading}
              style={{ flex: "0 0 auto", padding: "0 16px", height: 44, borderRadius: 10, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "#A9B3D1", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
              ← Back
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 1, height: 44, borderRadius: 10, border: "none", background: loading ? "#6366f1" : "#4f46e5", color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" }}>
              {loading && <span style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
              {loading ? "Creating shop…" : "Create Shop & Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
