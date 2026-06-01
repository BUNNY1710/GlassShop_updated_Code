import { useState, useEffect } from "react";
import PageWrapper from "../components/PageWrapper";
import api from "../api/api";
import { useResponsive } from "../hooks/useResponsive";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const initials = (name) => name ? name.charAt(0).toUpperCase() : "?";

const ROLE_LABEL = { ROLE_ADMIN: "Admin", ROLE_STAFF: "Staff" };
const ROLE_COLOR = {
  ROLE_ADMIN: { bg: "#eef2ff", color: "#4f46e5", border: "#c7d2fe" },
  ROLE_STAFF: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
};

function RoleBadge({ role }) {
  const c = ROLE_COLOR[role] || { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 9px", borderRadius: 99,
      fontSize: 11.5, fontWeight: 700,
      background: c.bg, color: c.color,
      border: `1px solid ${c.border}`,
      letterSpacing: "0.02em",
    }}>
      {ROLE_LABEL[role] || role}
    </span>
  );
}

function IconBtn({ title, onClick, icon, hoverBg = "#f1f5f9", hoverColor = "#374151" }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 30, height: 30, borderRadius: 6,
        border: "1px solid #e5e7eb",
        background: hov ? hoverBg : "transparent",
        color: hov ? hoverColor : "#6b7280",
        cursor: "pointer", fontSize: 14, padding: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        transition: "all 120ms ease", flexShrink: 0,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {icon}
    </button>
  );
}

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10050, padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 14, width: "100%", maxWidth: 420,
          boxShadow: "0 20px 40px rgba(15,23,42,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 2 }}>{subtitle}</div>}
        </div>
        <div style={{ padding: "18px 20px 20px" }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, required, autoComplete }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#475569", marginBottom: 5 }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        style={{
          width: "100%", padding: "9px 12px", borderRadius: 8, boxSizing: "border-box",
          border: `1.5px solid ${focused ? "#6366f1" : "#e2e8f0"}`,
          fontSize: 14, color: "#0f172a", outline: "none",
          background: "#fff", transition: "border-color 140ms ease",
        }}
        onFocus={() => setFocused(true)}
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
      padding: "9px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13,
      background: ok ? "#f0fdf4" : "#fef2f2",
      color: ok ? "#15803d" : "#dc2626",
      border: `1px solid ${ok ? "#bbf7d0" : "#fecaca"}`,
    }}>
      {msg}
    </div>
  );
}

export default function StaffManagement() {
  const { isMobile } = useResponsive();

  const [staff, setStaff]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash]     = useState({ text: "", ok: true });

  const [showCreate, setShowCreate]   = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [delTarget, setDelTarget]     = useState(null);

  const [cf, setCf]         = useState({ username: "", password: "", confirm: "" });
  const [cfErr, setCfErr]   = useState("");
  const [cfBusy, setCfBusy] = useState(false);

  const [rf, setRf]         = useState({ password: "", confirm: "" });
  const [rfErr, setRfErr]   = useState("");
  const [rfBusy, setRfBusy] = useState(false);

  const [delBusy, setDelBusy] = useState(false);

  const [cp, setCp]         = useState({ old: "", newPw: "", confirm: "" });
  const [cpMsg, setCpMsg]   = useState("");
  const [cpBusy, setCpBusy] = useState(false);

  const toast = (text, ok = true) => {
    setFlash({ text, ok });
    setTimeout(() => setFlash({ text: "", ok: true }), 4500);
  };

  const loadStaff = async () => {
    try {
      setLoading(true);
      const r = await api.get("/api/auth/staff");
      setStaff(r.data || []);
    } catch {
      toast("Failed to load staff list", false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStaff(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCfErr("");
    if (!cf.username.trim()) return setCfErr("Username is required");
    if (cf.password.length < 4) return setCfErr("Password must be at least 4 characters");
    if (cf.password !== cf.confirm) return setCfErr("Passwords do not match");
    setCfBusy(true);
    try {
      await api.post("/api/auth/create-staff", { username: cf.username.trim(), password: cf.password });
      setShowCreate(false);
      setCf({ username: "", password: "", confirm: "" });
      toast("✅ Staff account created successfully");
      loadStaff();
    } catch (err) {
      setCfErr(err.response?.data?.error || "Failed to create staff");
    } finally {
      setCfBusy(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setRfErr("");
    if (rf.password.length < 4) return setRfErr("Password must be at least 4 characters");
    if (rf.password !== rf.confirm) return setRfErr("Passwords do not match");
    setRfBusy(true);
    try {
      await api.put(`/api/auth/staff/${resetTarget.id}/password`, { newPassword: rf.password });
      setResetTarget(null);
      setRf({ password: "", confirm: "" });
      toast(`✅ Password reset for ${resetTarget.userName}`);
    } catch (err) {
      setRfErr(err.response?.data?.error || "Failed to reset password");
    } finally {
      setRfBusy(false);
    }
  };

  const handleDelete = async () => {
    setDelBusy(true);
    try {
      await api.delete(`/api/auth/staff/${delTarget.id}`);
      toast(`✅ ${delTarget.userName} removed`);
      setDelTarget(null);
      loadStaff();
    } catch (err) {
      toast(err.response?.data?.error || "Failed to delete staff", false);
      setDelTarget(null);
    } finally {
      setDelBusy(false);
    }
  };

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
    background: "#fff", borderRadius: 12,
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
  };

  const primaryBtn = (busy) => ({
    padding: "9px 18px", borderRadius: 8, border: "none",
    background: busy ? "#a5b4fc" : "#4f46e5", color: "#fff",
    fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
    transition: "all 140ms ease",
  });

  const dangerBtn = (busy) => ({
    padding: "9px 18px", borderRadius: 8, border: "none",
    background: busy ? "#fca5a5" : "#ef4444", color: "#fff",
    fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
  });

  const ghostBtn = {
    padding: "9px 18px", borderRadius: 8,
    border: "1.5px solid #e2e8f0", background: "#fff",
    color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer",
  };

  return (
    <PageWrapper>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "12px" : "20px", fontFamily: "'Inter',-apple-system,sans-serif" }}>

        {flash.text && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13,
            background: flash.ok ? "#f0fdf4" : "#fef2f2",
            color: flash.ok ? "#15803d" : "#dc2626",
            border: `1px solid ${flash.ok ? "#bbf7d0" : "#fecaca"}`,
          }}>
            {flash.text}
          </div>
        )}

        {/* ── Staff List Card ── */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{
            padding: "16px 20px", borderBottom: "1px solid #f1f5f9",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 10,
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                👥 Staff Management
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#94a3b8" }}>
                {loading ? "Loading…" : `${staff.length} staff account${staff.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <button
              onClick={() => { setShowCreate(true); setCfErr(""); setCf({ username: "", password: "", confirm: "" }); }}
              style={primaryBtn(false)}
            >
              + Create Staff
            </button>
          </div>

          <div style={{ padding: isMobile ? "12px" : "16px" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 14 }}>Loading staff…</div>
            ) : staff.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ fontSize: 42, marginBottom: 10, opacity: 0.3 }}>👤</div>
                <p style={{ fontSize: 15, color: "#64748b", fontWeight: 600, margin: "0 0 4px" }}>No staff accounts yet</p>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Create your first staff account above</p>
              </div>
            ) : isMobile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {staff.map((s) => (
                  <div key={s.id} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fafbfc" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                        background: "#eef2ff", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#4f46e5",
                      }}>
                        {initials(s.userName)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.userName}
                        </div>
                        <div style={{ marginTop: 3 }}><RoleBadge role={s.role} /></div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 7, borderTop: "1px solid #f1f5f9", paddingTop: 9 }}>
                      <IconBtn title="Reset Password" icon="🔑" hoverBg="#fffbeb" hoverColor="#d97706"
                        onClick={() => { setResetTarget(s); setRfErr(""); setRf({ password: "", confirm: "" }); }} />
                      <IconBtn title="Delete Staff" icon="🗑" hoverBg="#fef2f2" hoverColor="#dc2626"
                        onClick={() => setDelTarget(s)} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                    {["Avatar", "Username", "Role", "Actions"].map((h) => (
                      <th key={h} style={{
                        padding: "9px 12px", textAlign: "left", fontSize: 11.5,
                        fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #f8fafc", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                      <td style={{ padding: "11px 12px" }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: "#eef2ff", display: "inline-flex", alignItems: "center",
                          justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#4f46e5",
                        }}>
                          {initials(s.userName)}
                        </div>
                      </td>
                      <td style={{ padding: "11px 12px", fontWeight: 600, color: "#0f172a" }}>{s.userName}</td>
                      <td style={{ padding: "11px 12px" }}><RoleBadge role={s.role} /></td>
                      <td style={{ padding: "11px 12px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <IconBtn title="Reset Password" icon="🔑" hoverBg="#fffbeb" hoverColor="#d97706"
                            onClick={() => { setResetTarget(s); setRfErr(""); setRf({ password: "", confirm: "" }); }} />
                          <IconBtn title="Delete Staff" icon="🗑" hoverBg="#fef2f2" hoverColor="#dc2626"
                            onClick={() => setDelTarget(s)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Change My Password Card ── */}
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
            🔒 Change My Password
          </div>
          <Banner msg={cpMsg} />
          <form onSubmit={handleChangeMyPw}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: "0 16px" }}>
              <Field label="Current Password" type="password" value={cp.old}
                onChange={(e) => setCp({ ...cp, old: e.target.value })}
                placeholder="Current password" required autoComplete="current-password" />
              <Field label="New Password" type="password" value={cp.newPw}
                onChange={(e) => setCp({ ...cp, newPw: e.target.value })}
                placeholder="Min 4 characters" required autoComplete="new-password" />
              <Field label="Confirm New Password" type="password" value={cp.confirm}
                onChange={(e) => setCp({ ...cp, confirm: e.target.value })}
                placeholder="Repeat new password" required autoComplete="new-password" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={cpBusy} style={primaryBtn(cpBusy)}>
                {cpBusy ? "Saving…" : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ════ CREATE STAFF MODAL ════ */}
      {showCreate && (
        <Modal title="Create Staff Account" subtitle="New staff will have ROLE_STAFF access" onClose={() => setShowCreate(false)}>
          <Banner msg={cfErr ? `❌ ${cfErr}` : ""} />
          <form onSubmit={handleCreate}>
            <Field label="Username" value={cf.username} onChange={(e) => setCf({ ...cf, username: e.target.value })} placeholder="e.g. john_staff" required autoComplete="off" />
            <Field label="Password" type="password" value={cf.password} onChange={(e) => setCf({ ...cf, password: e.target.value })} placeholder="Min 4 characters" required autoComplete="new-password" />
            <Field label="Confirm Password" type="password" value={cf.confirm} onChange={(e) => setCf({ ...cf, confirm: e.target.value })} placeholder="Repeat password" required autoComplete="new-password" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button type="button" onClick={() => setShowCreate(false)} style={ghostBtn}>Cancel</button>
              <button type="submit" disabled={cfBusy} style={primaryBtn(cfBusy)}>{cfBusy ? "Creating…" : "Create Staff"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════ RESET PASSWORD MODAL ════ */}
      {resetTarget && (
        <Modal title="Reset Password" subtitle={`Set a new password for "${resetTarget.userName}"`} onClose={() => setResetTarget(null)}>
          <Banner msg={rfErr ? `❌ ${rfErr}` : ""} />
          <form onSubmit={handleReset}>
            <Field label="New Password" type="password" value={rf.password} onChange={(e) => setRf({ ...rf, password: e.target.value })} placeholder="Min 4 characters" required autoComplete="new-password" />
            <Field label="Confirm Password" type="password" value={rf.confirm} onChange={(e) => setRf({ ...rf, confirm: e.target.value })} placeholder="Repeat new password" required autoComplete="new-password" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button type="button" onClick={() => setResetTarget(null)} style={ghostBtn}>Cancel</button>
              <button type="submit" disabled={rfBusy} style={primaryBtn(rfBusy)}>{rfBusy ? "Resetting…" : "Reset Password"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════ DELETE CONFIRMATION MODAL ════ */}
      {delTarget && (
        <Modal title="Delete Staff Account" subtitle="This action cannot be undone" onClose={() => setDelTarget(null)}>
          <div style={{ textAlign: "center", padding: "8px 0 18px" }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12, margin: "0 auto 14px",
              background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
            }}>🗑</div>
            <p style={{ fontSize: 14.5, color: "#0f172a", margin: "0 0 6px", fontWeight: 600 }}>
              Delete <span style={{ color: "#ef4444" }}>{delTarget.userName}</span>?
            </p>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
              This account will be permanently removed and cannot be restored.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setDelTarget(null)} style={ghostBtn}>Cancel</button>
            <button onClick={handleDelete} disabled={delBusy} style={dangerBtn(delBusy)}>
              {delBusy ? "Deleting…" : "Delete Account"}
            </button>
          </div>
        </Modal>
      )}
    </PageWrapper>
  );
}
