import { useEffect, useState } from "react";
import PageWrapper from "../components/PageWrapper";
import api from "../api/api";
import { useResponsive } from "../hooks/useResponsive";

const ROLE_LABEL = { ROLE_ADMIN: "Administrator", ROLE_STAFF: "Staff" };
const ROLE_COLOR = {
  ROLE_ADMIN: { bg: "rgba(79,93,255,0.2)", color: "#818CF8", border: "rgba(79,93,255,0.3)" },
  ROLE_STAFF: { bg: "rgba(55,227,165,0.15)", color: "#37E3A5", border: "rgba(55,227,165,0.3)" },
};

function Field({ label, type = "text", value, onChange, placeholder, required, autoComplete, readOnly }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
        {label}{required && <span style={{ color: "#FF6B81", marginLeft: 2 }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        autoComplete={autoComplete}
        style={{
          width: "100%", padding: "9px 12px", borderRadius: 8, boxSizing: "border-box",
          border: `1.5px solid ${focused ? "rgba(79,93,255,0.6)" : "rgba(255,255,255,0.1)"}`,
          fontSize: 14, color: readOnly ? "#7180A6" : "#fff", outline: "none",
          background: readOnly ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
          transition: "border-color 140ms ease", cursor: readOnly ? "not-allowed" : "text",
        }}
        onFocus={() => { if (!readOnly) setFocused(true); }}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

function Banner({ msg }) {
  if (!msg) return null;
  const ok = msg.startsWith("✅");
  return (
    <div style={{
      padding: "9px 12px", borderRadius: 8, marginBottom: 14, fontSize: 13,
      background: ok ? "rgba(55,227,165,0.1)" : "rgba(255,107,129,0.1)",
      color: ok ? "#37E3A5" : "#FF6B81",
      border: `1px solid ${ok ? "rgba(55,227,165,0.3)" : "rgba(255,107,129,0.3)"}`,
    }}>
      {msg}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: 12.5, color: "#7180A6", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ fontSize: 13.5, color: "#fff", fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );
}

export default function Profile() {
  const { isMobile } = useResponsive();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [cp, setCp]         = useState({ old: "", newPw: "", confirm: "" });
  const [cpMsg, setCpMsg]   = useState("");
  const [cpBusy, setCpBusy] = useState(false);

  useEffect(() => {
    api.get("/api/auth/profile")
      .then((r) => setProfile(r.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  const handleChangeMyPw = async (e) => {
    e.preventDefault();
    setCpMsg("");
    if (cp.newPw.length < 4) return setCpMsg("❌ New password must be at least 4 characters");
    if (cp.newPw !== cp.confirm) return setCpMsg("❌ Passwords do not match");
    setCpBusy(true);
    try {
      await api.post("/api/auth/change-password", { oldPassword: cp.old, newPassword: cp.newPw });
      setCp({ old: "", newPw: "", confirm: "" });
      setCpMsg("✅ Password changed successfully");
    } catch (err) {
      setCpMsg("❌ " + (err.response?.data?.error || "Failed to change password"));
    } finally {
      setCpBusy(false);
    }
  };

  const card = {
    background: "rgba(17,27,53,0.9)", borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
  };

  const primaryBtn = (busy) => ({
    padding: "9px 20px", borderRadius: 8, border: "none",
    background: busy ? "rgba(79,93,255,0.4)" : "#4F5DFF", color: "#fff",
    fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
    transition: "all 140ms ease",
  });

  const rc = profile ? (ROLE_COLOR[profile.role] || { bg: "rgba(255,255,255,0.08)", color: "#A9B3D1", border: "rgba(255,255,255,0.12)" }) : null;

  return (
    <PageWrapper>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: isMobile ? "12px" : "20px", fontFamily: "'Inter',-apple-system,sans-serif" }}>

        {/* ── Profile card ── */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ padding: "18px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 50, height: 50, borderRadius: 12, flexShrink: 0,
              background: "rgba(79,93,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 700, color: "#818CF8",
              boxShadow: "0 3px 10px rgba(79,70,229,.2)",
            }}>
              {profile ? profile.username.charAt(0).toUpperCase() : "?"}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>
                {loading ? "Loading…" : profile?.username || "—"}
              </div>
              {profile && rc && (
                <span style={{
                  display: "inline-flex", alignItems: "center", marginTop: 4,
                  padding: "2px 10px", borderRadius: 99, fontSize: 11.5, fontWeight: 700,
                  background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
                }}>
                  {ROLE_LABEL[profile.role] || profile.role}
                </span>
              )}
            </div>
          </div>

          <div style={{ padding: "4px 20px 16px" }}>
            {loading ? (
              <div style={{ color: "#7180A6", fontSize: 13.5, padding: "20px 0", textAlign: "center" }}>Loading profile…</div>
            ) : profile ? (
              <>
                <InfoRow label="Username"  value={profile.username} />
                <InfoRow label="Role"      value={ROLE_LABEL[profile.role] || profile.role} />
                <InfoRow label="Shop"      value={profile.shopName} />
              </>
            ) : (
              <div style={{ color: "#FF6B81", fontSize: 13.5, padding: "16px 0" }}>Failed to load profile</div>
            )}
          </div>
        </div>

        {/* ── Change password card ── */}
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
            🔒 Change My Password
          </div>
          <Banner msg={cpMsg} />
          <form onSubmit={handleChangeMyPw}>
            <Field label="Current Password" type="password" value={cp.old}
              onChange={(e) => setCp({ ...cp, old: e.target.value })}
              placeholder="Enter current password" required autoComplete="current-password" />
            <Field label="New Password" type="password" value={cp.newPw}
              onChange={(e) => setCp({ ...cp, newPw: e.target.value })}
              placeholder="Min 4 characters" required autoComplete="new-password" />
            <Field label="Confirm New Password" type="password" value={cp.confirm}
              onChange={(e) => setCp({ ...cp, confirm: e.target.value })}
              placeholder="Repeat new password" required autoComplete="new-password" />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button type="submit" disabled={cpBusy} style={primaryBtn(cpBusy)}>
                {cpBusy ? "Saving…" : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageWrapper>
  );
}
