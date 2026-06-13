import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import PageWrapper from "../components/PageWrapper";
import { useResponsive } from "../hooks/useResponsive";
import { getGlassTypeAlerts, updateGlassTypeAlert } from "../api/glassTypeApi";
import { isAdmin } from "../utils/permissions";

const STATUS = {
  OUT:  { label: "Out of Stock", dot: "🔴", color: "#FF6B81", bg: "rgba(255,107,129,0.12)", border: "rgba(255,107,129,0.3)" },
  LOW:  { label: "Low Stock",    dot: "🟠", color: "#FFB95E", bg: "rgba(255,185,94,0.12)", border: "rgba(255,185,94,0.3)" },
  SAFE: { label: "Available",    dot: "🟢", color: "#37E3A5", bg: "rgba(55,227,165,0.12)", border: "rgba(55,227,165,0.3)" },
};
const FILTERS = [["all", "All"], ["LOW", "Low Stock"], ["OUT", "Out of Stock"], ["SAFE", "Safe"]];

export default function LowStockAlerts() {
  const { isMobile } = useResponsive();
  const canEdit = isAdmin();
  const [alerts, setAlerts] = useState([]);
  const [globalThreshold, setGlobalThreshold] = useState(5);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState(null); // { id, threshold, enabled }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getGlassTypeAlerts();
      setAlerts(r.alerts || []);
      setGlobalThreshold(r.globalThreshold ?? 5);
    } catch {
      toast.error("Failed to load stock alerts");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = {
    all: alerts.length,
    LOW: alerts.filter(a => a.status === "LOW").length,
    OUT: alerts.filter(a => a.status === "OUT").length,
    SAFE: alerts.filter(a => a.status === "SAFE").length,
  };
  const shown = filter === "all" ? alerts : alerts.filter(a => a.status === filter);

  const saveEdit = async () => {
    setSaving(true);
    try {
      await updateGlassTypeAlert(edit.id, {
        enabled: edit.enabled,
        threshold: edit.threshold === "" ? null : Number(edit.threshold),
      });
      setEdit(null);
      toast.success("✅ Alert settings updated");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to update");
    } finally { setSaving(false); }
  };

  const card = (label, val, color) => (
    <div style={{ flex: 1, minWidth: 0, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: isMobile ? "8px 6px" : "12px 14px", textAlign: "center" }}>
      <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: isMobile ? 9 : 10.5, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <PageWrapper>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? 12 : 20, fontFamily: "'Inter',-apple-system,sans-serif" }}>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>⚠️ Low Stock Alerts</h1>
          <p style={{ fontSize: 13, color: "#A9B3D1", margin: 0 }}>
            Per-glass-type thresholds. Global default: <b style={{ color: "#fff" }}>{globalThreshold}</b>.
            {!canEdit && " (View only — admins configure thresholds.)"}
          </p>
        </div>

        {/* Summary */}
        <div style={{ display: "flex", gap: isMobile ? 6 : 10, marginBottom: 14 }}>
          {card("Total", counts.all, "#4F5DFF")}
          {card("Low Stock", counts.LOW, "#FFB95E")}
          {card("Out of Stock", counts.OUT, "#FF6B81")}
          {card("Safe", counts.SAFE, "#37E3A5")}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {FILTERS.map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                background: filter === k ? "rgba(79,93,255,0.2)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${filter === k ? "rgba(79,93,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                color: filter === k ? "#818CF8" : "#A9B3D1" }}>
              {l}{k !== "all" && counts[k] ? ` (${counts[k]})` : ""}
            </button>
          ))}
        </div>

        {/* Table / cards */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#7180A6" }}>Loading…</div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#7180A6" }}>No glass types in this filter.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shown.map(a => {
              const st = STATUS[a.status];
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: `1px solid ${st.border}`, borderRadius: 10 }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: "#fff" }}>{a.name}</div>
                    <div style={{ fontSize: 11.5, color: "#7180A6", marginTop: 1 }}>
                      Current: <b style={{ color: "#E2E8F0" }}>{a.currentStock}</b> · Threshold: <b style={{ color: "#E2E8F0" }}>{a.threshold}</b>
                      {a.threshold === globalThreshold && a.status !== "OUT" ? " (default)" : ""}
                      {!a.enabled && " · alert off"}
                      {a.shortage > 0 && <span style={{ color: st.color }}> · Short {a.shortage}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 99, padding: "4px 11px", whiteSpace: "nowrap" }}>
                    {st.dot} {st.label}
                  </span>
                  {canEdit && (
                    <button onClick={() => setEdit({ id: a.id, name: a.name, threshold: a.threshold ?? "", enabled: a.enabled })}
                      style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(79,93,255,0.3)", background: "rgba(79,93,255,0.15)", color: "#818CF8", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                      Edit
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {edit && (
        <div onClick={() => !saving && setEdit(null)} style={{ position: "fixed", inset: 0, background: "rgba(5,11,31,0.8)", backdropFilter: "blur(6px)", zIndex: 10050, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, background: "rgba(17,27,53,0.99)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: "20px 22px" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800, color: "#fff" }}>Alert Settings · {edit.name}</h3>
            <label style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14, fontSize: 13.5, color: "#E2E8F0", cursor: "pointer" }}>
              <input type="checkbox" checked={edit.enabled} onChange={e => setEdit({ ...edit, enabled: e.target.checked })} style={{ width: 16, height: 16, accentColor: "#4F5DFF" }} />
              Enable low-stock alert
            </label>
            <div style={{ fontSize: 11.5, color: "#7180A6", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>Alert when stock falls below</div>
            <input type="number" min="0" value={edit.threshold} onChange={e => setEdit({ ...edit, threshold: e.target.value })}
              placeholder={`Default (${globalThreshold})`}
              style={{ width: "100%", boxSizing: "border-box", height: 42, padding: "0 12px", borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.14)", color: "#fff", fontSize: 14, outline: "none" }} />
            <div style={{ fontSize: 11, color: "#7180A6", marginTop: 5 }}>Leave blank to use the global default ({globalThreshold}).</div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setEdit(null)} disabled={saving} style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "#A9B3D1", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveEdit} disabled={saving} style={{ flex: 1, height: 42, borderRadius: 10, border: "none", background: "#4F5DFF", color: "#fff", fontWeight: 800, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
