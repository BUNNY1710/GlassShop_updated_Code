import { useState, useEffect } from "react";
import PageWrapper from "../components/PageWrapper";
import api from "../api/api";
import { useResponsive } from "../hooks/useResponsive";
import PermissionSelector from "../components/PermissionSelector";
import StaffActivities from "../components/StaffActivities";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const initials = (name) => name ? name.charAt(0).toUpperCase() : "?";

const ROLE_LABEL = { ROLE_ADMIN: "Admin", ROLE_STAFF: "Staff" };
const ROLE_COLOR = {
  ROLE_ADMIN: { bg: "rgba(79,93,255,0.2)", color: "#818CF8", border: "rgba(79,93,255,0.3)" },
  ROLE_STAFF: { bg: "rgba(55,227,165,0.15)", color: "#37E3A5", border: "rgba(55,227,165,0.3)" },
};

function RoleBadge({ role }) {
  const c = ROLE_COLOR[role] || { bg: "rgba(255,255,255,0.08)", color: "#A9B3D1", border: "rgba(255,255,255,0.12)" };
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

function IconBtn({ title, onClick, icon, hoverBg = "rgba(255,255,255,0.08)", hoverColor = "#fff" }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 30, height: 30, borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.1)",
        background: hov ? hoverBg : "transparent",
        color: hov ? hoverColor : "#7180A6",
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
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10050, padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "rgba(17,27,53,0.98)", borderRadius: 14, width: "100%", maxWidth: 420,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12.5, color: "#7180A6", marginTop: 2 }}>{subtitle}</div>}
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
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
        {label}{required && <span style={{ color: "#FF6B81", marginLeft: 2 }}>*</span>}
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
          border: `1.5px solid ${focused ? "rgba(79,93,255,0.6)" : "rgba(255,255,255,0.1)"}`,
          fontSize: 14, color: "#fff", outline: "none",
          background: "rgba(255,255,255,0.06)", transition: "border-color 140ms ease",
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
      background: ok ? "rgba(55,227,165,0.1)" : "rgba(255,107,129,0.1)",
      color: ok ? "#37E3A5" : "#FF6B81",
      border: `1px solid ${ok ? "rgba(55,227,165,0.3)" : "rgba(255,107,129,0.3)"}`,
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

  // Edit-permissions modal
  const [permTarget, setPermTarget]   = useState(null);
  const [permList, setPermList]       = useState([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permBusy, setPermBusy]       = useState(false);

  // Activities modal target staff
  const [actTarget, setActTarget] = useState(null);

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

  const openPerms = async (s) => {
    setPermTarget(s);
    setPermList([]);
    setPermLoading(true);
    try {
      const r = await api.get(`/api/auth/staff/${s.id}/permissions`);
      setPermList(r.data?.permissions || []);
    } catch {
      toast("Failed to load permissions", false);
    } finally {
      setPermLoading(false);
    }
  };

  const savePerms = async () => {
    setPermBusy(true);
    try {
      await api.put(`/api/auth/staff/${permTarget.id}/permissions`, { permissions: permList });
      toast(`✅ Permissions updated for ${permTarget.userName}`);
      setPermTarget(null);
      loadStaff();
    } catch (err) {
      toast(err.response?.data?.error || "Failed to update permissions", false);
    } finally {
      setPermBusy(false);
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
    background: "#111B35", borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
  };

  const primaryBtn = (busy) => ({
    padding: "9px 18px", borderRadius: 8, border: "none",
    background: busy ? "rgba(79,93,255,0.4)" : "#4F5DFF", color: "#fff",
    fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
    transition: "all 140ms ease",
  });

  const dangerBtn = (busy) => ({
    padding: "9px 18px", borderRadius: 8,
    background: busy ? "rgba(255,107,129,0.1)" : "rgba(255,107,129,0.15)",
    color: "#FF6B81",
    border: "1px solid rgba(255,107,129,0.3)",
    fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
  });

  const ghostBtn = {
    padding: "9px 18px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.08)",
    color: "#A9B3D1", fontSize: 13, fontWeight: 500, cursor: "pointer",
  };

  return (
    <PageWrapper>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "12px" : "20px", fontFamily: "'Inter',-apple-system,sans-serif" }}>

        {flash.text && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13,
            background: flash.ok ? "rgba(55,227,165,0.1)" : "rgba(255,107,129,0.1)",
            color: flash.ok ? "#37E3A5" : "#FF6B81",
            border: `1px solid ${flash.ok ? "rgba(55,227,165,0.3)" : "rgba(255,107,129,0.3)"}`,
          }}>
            {flash.text}
          </div>
        )}

        {/* ── Staff List Card ── */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{
            padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 10,
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#fff" }}>
                👥 Staff Management
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#7180A6" }}>
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
              <div style={{ textAlign: "center", padding: "40px 0", color: "#7180A6", fontSize: 14 }}>Loading staff…</div>
            ) : staff.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ fontSize: 42, marginBottom: 10, opacity: 0.3 }}>👤</div>
                <p style={{ fontSize: 15, color: "#A9B3D1", fontWeight: 600, margin: "0 0 4px" }}>No staff accounts yet</p>
                <p style={{ fontSize: 13, color: "#7180A6", margin: 0 }}>Create your first staff account above</p>
              </div>
            ) : isMobile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {staff.map((s) => (
                  <div key={s.id} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                        background: "rgba(79,93,255,0.2)", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#818CF8",
                      }}>
                        {initials(s.userName)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.userName}
                        </div>
                        <div style={{ marginTop: 3, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <RoleBadge role={s.role} />
                          <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "rgba(79,93,255,0.15)", color: "#818CF8", border: "1px solid rgba(79,93,255,0.3)" }}>
                            {s.permissionCount ?? (s.permissions?.length || 0)} Perms
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 7, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 9 }}>
                      <IconBtn title="Edit Permissions" icon="🛡" hoverBg="rgba(79,93,255,0.15)" hoverColor="#818CF8"
                        onClick={() => openPerms(s)} />
                      <IconBtn title="Reset Password" icon="🔑" hoverBg="rgba(255,185,94,0.15)" hoverColor="#FFB95E"
                        onClick={() => { setResetTarget(s); setRfErr(""); setRf({ password: "", confirm: "" }); }} />
                      <IconBtn title="Delete Staff" icon="🗑" hoverBg="rgba(255,107,129,0.15)" hoverColor="#FF6B81"
                        onClick={() => setDelTarget(s)} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, background: "transparent" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {["Avatar", "Name", "Role", "Permissions", "Actions"].map((h) => (
                      <th key={h} style={{
                        padding: "9px 12px", textAlign: "left", fontSize: 10.5,
                        fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.08em",
                        background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#111B35" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#0A0F1E"}
                      onMouseLeave={e => e.currentTarget.style.background = "#111B35"}>
                      <td style={{ padding: "11px 12px" }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: "rgba(79,93,255,0.2)", display: "inline-flex", alignItems: "center",
                          justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#818CF8",
                        }}>
                          {initials(s.userName)}
                        </div>
                      </td>
                      <td style={{ padding: "11px 12px", fontWeight: 700, color: "#E2E8F0" }}>{s.userName || <span style={{ color: "#7180A6", fontStyle: "italic" }}>—</span>}</td>
                      <td style={{ padding: "11px 12px" }}><RoleBadge role={s.role} /></td>
                      <td style={{ padding: "11px 12px" }}>
                        <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 99, fontSize: 11.5, fontWeight: 700, background: "rgba(79,93,255,0.15)", color: "#818CF8", border: "1px solid rgba(79,93,255,0.3)" }}>
                          {s.permissionCount ?? (s.permissions?.length || 0)} Permission{(s.permissionCount ?? (s.permissions?.length || 0)) !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td style={{ padding: "11px 12px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <IconBtn title="View Activities" icon="📊" hoverBg="rgba(55,227,165,0.15)" hoverColor="#37E3A5"
                            onClick={() => setActTarget(s)} />
                          <IconBtn title="Edit Permissions" icon="🛡" hoverBg="rgba(79,93,255,0.15)" hoverColor="#818CF8"
                            onClick={() => openPerms(s)} />
                          <IconBtn title="Reset Password" icon="🔑" hoverBg="rgba(255,185,94,0.15)" hoverColor="#FFB95E"
                            onClick={() => { setResetTarget(s); setRfErr(""); setRf({ password: "", confirm: "" }); }} />
                          <IconBtn title="Delete Staff" icon="🗑" hoverBg="rgba(255,107,129,0.15)" hoverColor="#FF6B81"
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
          <div style={{ fontSize: 11, fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
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
              background: "rgba(255,107,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
            }}>🗑</div>
            <p style={{ fontSize: 14.5, color: "#fff", margin: "0 0 6px", fontWeight: 600 }}>
              Delete <span style={{ color: "#FF6B81" }}>{delTarget.userName}</span>?
            </p>
            <p style={{ fontSize: 13, color: "#7180A6", margin: 0 }}>
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

      {/* ════ EDIT PERMISSIONS MODAL (wide) ════ */}
      {permTarget && (
        <div
          onClick={() => setPermTarget(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 10060, padding: "24px 16px", overflowY: "auto" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "rgba(17,27,53,0.98)", borderRadius: 14, width: "100%", maxWidth: 820, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>🛡 Edit Permissions</div>
                <div style={{ fontSize: 12.5, color: "#7180A6", marginTop: 2 }}>{permTarget.userName} · {permList.length} selected</div>
              </div>
              <button onClick={() => setPermTarget(null)} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "none", color: "#A9B3D1", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: "18px 20px" }}>
              {permLoading ? (
                <div style={{ textAlign: "center", color: "#7180A6", padding: "30px 0" }}>Loading permissions…</div>
              ) : (
                <PermissionSelector value={permList} onChange={setPermList} />
              )}
            </div>
            <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setPermTarget(null)} style={ghostBtn}>Cancel</button>
              <button onClick={savePerms} disabled={permBusy || permLoading} style={primaryBtn(permBusy || permLoading)}>
                {permBusy ? "Saving…" : "Save Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}

      <StaffActivities
        open={!!actTarget}
        staffId={actTarget?.id}
        staffName={actTarget?.userName}
        onClose={() => setActTarget(null)}
      />
    </PageWrapper>
  );
}
