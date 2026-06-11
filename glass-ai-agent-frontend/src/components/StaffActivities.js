import { useState, useEffect, useCallback } from "react";
import api from "../api/api";
import { describeActivity, actionMeta } from "../utils/auditFormat";

const fmtDay  = (ts) => { try { return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return ""; } };
const fmtTime = (ts) => { try { return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };

const RANGES = [["today", "Today"], ["week", "This Week"], ["month", "This Month"], ["all", "All"]];
const TYPES  = [["all", "All"], ["stock", "Stock"], ["transfers", "Transfers"], ["optimization", "Optimization"], ["quotations", "Quotations"], ["orders", "Orders"], ["stands", "Stands"], ["glass", "Glass Types"], ["users", "User"]];

export default function StaffActivities({ open, staffId, staffName, onClose }) {
  const [data, setData]       = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [range, setRange]     = useState("all");
  const [type, setType]       = useState("all");
  const [search, setSearch]   = useState("");
  const [detail, setDetail]   = useState(null);

  const load = useCallback(async () => {
    if (!staffId) return;
    setLoading(true);
    try {
      const { data: res } = await api.get(`/api/auth/staff/${staffId}/activities`, {
        params: { range, type, search: search.trim() || undefined, size: 200 },
      });
      setData(res.data || []);
      setSummary(res.summary || {});
    } catch {
      setData([]); setSummary({});
    } finally { setLoading(false); }
  }, [staffId, range, type, search]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(load, search ? 350 : 0); // debounce search
    return () => clearTimeout(t);
  }, [open, load, search]);

  useEffect(() => { if (open) { setRange("all"); setType("all"); setSearch(""); setDetail(null); } }, [open, staffId]);

  if (!open) return null;

  // Group activities by day (data already sorted newest-first).
  const groups = [];
  const seen = {};
  data.forEach(a => {
    const d = fmtDay(a.timestamp);
    if (!seen[d]) { seen[d] = []; groups.push([d, seen[d]]); }
    seen[d].push(a);
  });

  const cards = [
    { l: "Total",         v: summary.total || 0,        c: "#4F5DFF" },
    { l: "Quotations",    v: summary.quotations || 0,   c: "#37E3A5" },
    { l: "Orders",        v: summary.orders || 0,       c: "#818CF8" },
    { l: "Stock",         v: summary.stock || 0,        c: "#FFB95E" },
    { l: "Transfers",     v: summary.transfers || 0,    c: "#FF9F40" },
    { l: "Optimizations", v: summary.optimization || 0, c: "#A78BFA" },
  ];

  const chip = (active, onClick, label) => (
    <button key={label} onClick={onClick}
      style={{ padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
        background: active ? "rgba(79,93,255,0.2)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${active ? "rgba(79,93,255,0.5)" : "rgba(255,255,255,0.1)"}`,
        color: active ? "#818CF8" : "#A9B3D1" }}>{label}</button>
  );

  return (
    <div className="opt-order-sheet" style={{ position: "fixed", inset: 0, background: "#0A1228", zIndex: 20060, display: "flex", flexDirection: "column", fontFamily: "'Inter',-apple-system,sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(10,18,40,0.99)", flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>📊 Activity & Performance</div>
          <div style={{ fontSize: 12, color: "#7180A6", marginTop: 1 }}>{staffName}</div>
        </div>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", color: "#A9B3D1", cursor: "pointer", fontSize: 15 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 40px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>

          {/* Performance cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 16 }}>
            {cards.map(x => (
              <div key={x.l} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: x.c, lineHeight: 1 }}>{x.v}</div>
                <div style={{ fontSize: 10, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>{x.l}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {RANGES.map(([k, l]) => chip(range === k, () => setRange(k), l))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <select value={type} onChange={e => setType(e.target.value)}
              style={{ height: 36, padding: "0 10px", borderRadius: 8, background: "rgba(17,27,53,0.9)", border: "1px solid rgba(255,255,255,0.12)", color: "#A9B3D1", fontSize: 13, outline: "none", cursor: "pointer" }}>
              {TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search activities…"
              style={{ flex: 1, minWidth: 160, height: 36, padding: "0 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 13, outline: "none" }} />
          </div>

          {/* Timeline */}
          {loading ? (
            <div style={{ textAlign: "center", color: "#7180A6", padding: "40px 0" }}>Loading activities…</div>
          ) : data.length === 0 ? (
            <div style={{ textAlign: "center", color: "#7180A6", padding: "48px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>🗒</div>
              No activities found for this filter.
            </div>
          ) : (
            groups.map(([day, items]) => (
              <div key={day} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#818CF8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{day}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {items.map((a, i) => {
                    const m = actionMeta(a.action);
                    return (
                      <button key={i} onClick={() => setDetail(a)}
                        style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", fontFamily: "inherit" }}>
                        <span style={{ fontSize: 11.5, color: "#7180A6", width: 64, flexShrink: 0 }}>{fmtTime(a.timestamp)}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: m.color, background: `${m.color}22`, borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap", flexShrink: 0 }}>{m.label}</span>
                        <span style={{ flex: 1, fontSize: 13, color: "#E2E8F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{describeActivity(a)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail modal */}
      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 20070, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "rgba(17,27,53,0.99)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{actionMeta(detail.action).label}</div>
              <button onClick={() => setDetail(null)} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "none", color: "#A9B3D1", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ fontSize: 13.5, color: "#E2E8F0", lineHeight: 1.5 }}>{describeActivity(detail)}</div>
              {[
                ["Performed By", staffName],
                ["Date", `${fmtDay(detail.timestamp)} · ${fmtTime(detail.timestamp)}`],
                ["Module", actionMeta(detail.action).module],
                detail.glassType && !detail.details ? ["Glass", detail.glassType] : null,
                detail.height && detail.width ? ["Size", `${detail.height}×${detail.width} ${detail.unit || "MM"}`] : null,
                detail.quantity ? ["Quantity", detail.quantity] : null,
                detail.standNo ? ["Stand", `#${detail.standNo}`] : null,
                detail.fromStand ? ["From", `Stand #${detail.fromStand}`] : null,
                detail.toStand ? ["To", `Stand #${detail.toStand}`] : null,
              ].filter(Boolean).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 7 }}>
                  <span style={{ color: "#7180A6" }}>{k}</span>
                  <span style={{ color: "#fff", fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
