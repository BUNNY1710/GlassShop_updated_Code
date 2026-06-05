import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import api from "../api/api";
import { useResponsive } from "../hooks/useResponsive";
import "../styles/design-system.css";

// ─── Chart colours ────────────────────────────────────────────────────────────
const CHART_COLORS = ["#4F5DFF","#37E3A5","#FFB95E","#FF6B81","#8B5CF6","#60A5FA","#F472B6","#34D399"];

// ─── Action-badge colours (dark) ──────────────────────────────────────────────
const ACTION_COLORS = {
  ADD:      { bg: "rgba(55,227,165,0.15)",  color: "#37E3A5" },
  REMOVE:   { bg: "rgba(255,107,129,0.15)", color: "#FF6B81" },
  EDIT:     { bg: "rgba(79,93,255,0.15)",   color: "#818CF8" },
  TRANSFER: { bg: "rgba(255,185,94,0.15)",  color: "#FFB95E" },
  DEFAULT:  { bg: "rgba(113,128,166,0.15)", color: "#7180A6" },
};

// ─── Time greeting ────────────────────────────────────────────────────────────
function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────
function Skeleton({ h = 80, r = 10 }) {
  return (
    <div style={{
      height: h, borderRadius: r,
      background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%)",
      backgroundSize: "300% 100%",
      animation: "shimmer 1.4s ease-in-out infinite",
    }} />
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 24px" }}>
      <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>{icon}</div>
      <p style={{ fontSize: 14, fontWeight: 600, color: "#A9B3D1", margin: "0 0 4px" }}>{title}</p>
      {subtitle && <p style={{ fontSize: 12.5, color: "#7180A6", margin: 0 }}>{subtitle}</p>}
    </div>
  );
}

// ─── Dark pie chart tooltip ───────────────────────────────────────────────────
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(17,27,53,0.98)",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.1)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      padding: "10px 14px",
    }}>
      <p style={{ margin: 0, fontWeight: 600, color: "#ffffff", fontSize: 13 }}>
        {payload[0].name}
      </p>
      <p style={{ margin: "4px 0 0", color: "#A9B3D1", fontSize: 12.5 }}>
        Qty: <strong style={{ color: "#37E3A5" }}>{payload[0].value.toLocaleString()}</strong>
      </p>
      <p style={{ margin: "2px 0 0", color: "#7180A6", fontSize: 11.5 }}>
        Items: {payload[0].payload.count}
      </p>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, iconPaths, color, compact }) {
  if (compact) {
    return (
      <div style={{
        background: "rgba(17,27,53,0.9)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: 64,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: `${color}26`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color,
        }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {(Array.isArray(iconPaths) ? iconPaths : [iconPaths]).map((p, i) => <path key={i} d={p} />)}
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {label}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {(value ?? 0).toLocaleString()}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{
      minWidth: 140,
      background: "rgba(17,27,53,0.9)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      padding: "14px 16px",
      flexShrink: 0,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${color}26`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: color, marginBottom: 10,
      }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {(Array.isArray(iconPaths) ? iconPaths : [iconPaths]).map((p, i) => <path key={i} d={p} />)}
        </svg>
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.03em", lineHeight: 1 }}>
        {(value ?? 0).toLocaleString()}
      </div>
    </div>
  );
}

// ─── Quick-action card ────────────────────────────────────────────────────────
function QuickCard({ iconPaths, title, subtitle, to, color }) {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => navigate(to)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "rgba(22,36,69,0.95)" : "rgba(17,27,53,0.9)",
        border: `1px solid ${hov ? "rgba(79,93,255,0.3)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 14,
        padding: 16,
        cursor: "pointer",
        boxShadow: hov ? "0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(79,93,255,0.15)" : "0 2px 8px rgba(0,0,0,0.3)",
        transform: hov ? "translateY(-2px)" : "none",
        transition: "all 160ms ease",
        fontFamily: "'Inter',-apple-system,sans-serif",
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `${color}22`, color, marginBottom: 10,
      }}>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {(Array.isArray(iconPaths) ? iconPaths : [iconPaths]).map((p, i) => <path key={i} d={p} />)}
        </svg>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", marginBottom: 2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11.5, color: "#7180A6" }}>{subtitle}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
function Dashboard() {
  const navigate  = useNavigate();
  const role      = sessionStorage.getItem("role");
  const { isMobile } = useResponsive();

  const [auditLogs, setAuditLogs]  = useState([]);
  const [stockData, setStockData]  = useState([]);
  const [stats, setStats]          = useState({
    totalStock: 0, totalTransfers: 0, totalStaff: 0,
    totalLogs: 0,  totalQuantity: 0,
    pendingCutting: 0, confirmedOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  // ── Configurable low-stock threshold ──────────────────────────────────────
  const [threshold,          setThreshold]          = useState(5);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [thresholdInput,     setThresholdInput]     = useState("5");
  const [thresholdSaving,    setThresholdSaving]    = useState(false);

  const username = (() => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) return "User";
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.sub || payload.username || "User";
    } catch { return "User"; }
  })();

  useEffect(() => {
    const load = async () => {
      try {
        const token = sessionStorage.getItem("token");
        if (!token) { setLoading(false); return; }
        setLoading(true);

        const [stockRes, staffRes, auditRes, transferRes, quotationsRes, settingsRes] = await Promise.all([
          api.get("/api/stock/all").then(r => r.data).catch(() => []),
          role === "ROLE_ADMIN" ? api.get("/api/auth/staff").then(r => r.data).catch(() => []) : [],
          role === "ROLE_ADMIN" ? api.get("/api/audit/recent").then(r => r.data).catch(() => []) : [],
          api.get("/api/audit/transfer-count").then(r => {
            const d = r.data;
            return typeof d === "object" && "count" in d ? +d.count : +d || 0;
          }).catch(() => 0),
          api.get("/api/quotations").then(r => r.data).catch(() => []),
          role === "ROLE_ADMIN"
            ? api.get("/api/settings").then(r => r.data).catch(() => ({ lowStockThreshold: 5 }))
            : Promise.resolve({ lowStockThreshold: 5 }),
        ]);

        if (role === "ROLE_ADMIN") setAuditLogs((auditRes || []).slice(0, 5));

        const savedThreshold = settingsRes?.lowStockThreshold ?? 5;
        setThreshold(savedThreshold);
        setThresholdInput(String(savedThreshold));

        const active   = (Array.isArray(stockRes) ? stockRes : []).filter(i => i.quantity > 0);
        const totalQty = active.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);

        const allQuotations = Array.isArray(quotationsRes) ? quotationsRes : [];
        const pendingCutting  = allQuotations.filter(q => q.status === "CONFIRMED").length;
        const confirmedOrders = allQuotations.filter(q => q.status === "CONFIRMED" || q.status === "DRAFT").length;

        setStockData(active);
        setStats({
          totalStock:      active.length,
          totalTransfers:  +transferRes || (Array.isArray(auditRes) ? auditRes.filter(l => l.action === "TRANSFER").length : 0),
          totalStaff:      role === "ROLE_ADMIN" && Array.isArray(staffRes) ? staffRes.length : 0,
          totalLogs:       Array.isArray(auditRes) ? auditRes.length : 0,
          totalQuantity:   totalQty,
          pendingCutting,
          confirmedOrders,
        });
      } catch (err) {
        console.error("Dashboard load error", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [role]);

  // ── Pie chart data ──
  const pieData = Object.entries(
    stockData.reduce((acc, item) => {
      const t = item.glass?.type || "Unknown";
      if (!acc[t]) acc[t] = { count: 0, quantity: 0 };
      acc[t].count    += 1;
      acc[t].quantity += parseInt(item.quantity) || 0;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 8)
    .map(([name, d]) => ({ name, value: d.quantity, count: d.count }));

  // Low-stock derived values
  const lowStockItems = stockData.filter(i => i.quantity <= threshold).slice(0, 6);
  const lowStockCount = stockData.filter(i => i.quantity <= threshold).length;

  // Unique stands count
  const uniqueStands = new Set(stockData.map(i => i.standNo).filter(Boolean)).size;

  const unitShort = (u) =>
    ({ INCH: "IN", MM: "MM", FEET: "FT" }[(u || "MM").toUpperCase()] || u || "MM");

  const saveThreshold = async () => {
    const val = parseInt(thresholdInput, 10);
    if (!val || val < 1) return;
    setThresholdSaving(true);
    try {
      await api.put("/api/settings", { lowStockThreshold: val });
      setThreshold(val);
      setShowThresholdModal(false);
    } catch (err) {
      console.error("Failed to save threshold", err);
    } finally {
      setThresholdSaving(false);
    }
  };

  const pad = isMobile ? 16 : 24;

  return (
    <div style={{
      padding: pad,
      maxWidth: 1400,
      margin: "0 auto",
      fontFamily: "'Inter',-apple-system,sans-serif",
      animation: "fadeIn 0.3s ease-out",
    }}>

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: "#ffffff", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Good {getTimeGreeting()}, {username} 👋
        </h1>
        <p style={{ fontSize: 13.5, color: "#A9B3D1", margin: 0 }}>
          Here's what's happening with your inventory today.
        </p>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div style={isMobile ? {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
        marginBottom: 20,
      } : {
        display: "flex",
        gap: 12,
        overflowX: "auto",
        paddingBottom: 4,
        marginBottom: 20,
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}>
        {loading ? (
          [1,2,3,4].map(i => isMobile
            ? <Skeleton key={i} h={64} r={12} />
            : <div key={i} style={{ minWidth: 140, flexShrink: 0 }}><Skeleton h={108} r={16} /></div>
          )
        ) : (
          <>
            <KpiCard
              label={isMobile ? "Stock" : "Stock Items"}
              value={stats.totalStock}
              color="#4F5DFF"
              compact={isMobile}
              iconPaths={["M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z","M3.27 6.96L12 12.01l8.73-5.05","M12 22.08V12"]}
            />
            <KpiCard
              label={isMobile ? "Qty" : "Total Qty"}
              value={stats.totalQuantity}
              color="#37E3A5"
              compact={isMobile}
              iconPaths={["M8 6h13","M8 12h13","M8 18h13","M3 6h.01","M3 12h.01","M3 18h.01"]}
            />
            <KpiCard
              label="Low Stock"
              value={lowStockCount}
              color={lowStockCount > 0 ? "#FF6B81" : "#37E3A5"}
              compact={isMobile}
              iconPaths={["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z","M12 9v4","M12 17h.01"]}
            />
            <KpiCard
              label="Stands"
              value={uniqueStands}
              color="#FFB95E"
              compact={isMobile}
              iconPaths={["M3 3h7v7H3z","M14 3h7v7h-7z","M14 14h7v7h-7z","M3 14h7v7H3z"]}
            />
            {role === "ROLE_ADMIN" && (
              <>
                <KpiCard
                  label={isMobile ? "Moves" : "Transfers"}
                  value={stats.totalTransfers}
                  color="#8B5CF6"
                  compact={isMobile}
                  iconPaths={["M7 16V4m0 0L3 8m4-4l4 4","M17 8v12m0 0l4-4m-4 4l-4-4"]}
                />
                <KpiCard
                  label="Staff"
                  value={stats.totalStaff}
                  color="#60A5FA"
                  compact={isMobile}
                  iconPaths={["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M9 7a4 4 0 100 8 4 4 0 000-8z"]}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: 16, alignItems: "start" }}>

        {/* LEFT column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Stock Overview card */}
          <div style={{
            background: "rgba(17,27,53,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: "0 0 2px", letterSpacing: "-0.02em" }}>
                  Stock Overview
                </h3>
                <p style={{ fontSize: 12, color: "#7180A6", margin: 0 }}>
                  Inventory distribution
                </p>
              </div>
              <button
                onClick={() => navigate("/view-stock")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 600, color: "#4F5DFF",
                  fontFamily: "inherit", letterSpacing: "0.04em",
                  padding: "4px 8px", borderRadius: 6,
                  transition: "background 130ms ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(79,93,255,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
              >
                VIEW ALL →
              </button>
            </div>

            {loading ? (
              <Skeleton h={220} r={8} />
            ) : stockData.length === 0 ? (
              <EmptyState icon="📦" title="No stock items" subtitle="Add stock items to see your overview" />
            ) : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Legend */}
            {!loading && pieData.length > 0 && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "5px 12px",
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid rgba(255,255,255,0.07)",
              }}>
                {pieData.map((d, i) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: "#A9B3D1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                    <span style={{ fontSize: 11, color: "#7180A6", marginLeft: "auto", flexShrink: 0 }}>({d.value})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low Stock Alerts */}
          {!loading && lowStockCount > 0 && (
            <div style={{
              background: "rgba(17,27,53,0.9)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#FFB95E", margin: 0 }}>
                    🔔 Low Stock Alerts
                  </h3>
                  {role === "ROLE_ADMIN" && (
                    <button
                      title={`Threshold: ≤ ${threshold}. Click to change.`}
                      onClick={() => { setThresholdInput(String(threshold)); setShowThresholdModal(true); }}
                      style={{
                        width: 22, height: 22, borderRadius: 5,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.06)",
                        cursor: "pointer", fontSize: 12, color: "#7180A6",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        padding: 0, lineHeight: 1, flexShrink: 0,
                        transition: "all 130ms ease",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#A9B3D1"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#7180A6"; }}
                    >⚙</button>
                  )}
                </div>
                <span style={{
                  background: "rgba(255,107,129,0.15)", color: "#FF6B81",
                  border: "1px solid rgba(255,107,129,0.3)",
                  borderRadius: 999, padding: "3px 9px",
                  fontSize: 11, fontWeight: 600,
                }}>
                  {lowStockCount} item{lowStockCount !== 1 ? "s" : ""}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "#7180A6", margin: "0 0 12px" }}>
                {lowStockCount} item{lowStockCount !== 1 ? "s" : ""} with qty ≤ {threshold}
              </p>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {lowStockItems.map((item, i) => {
                  const t     = item.glass?.thickness;
                  const thick = t != null ? `${Number(t)}MM` : "";
                  const type  = item.glass?.type || "N/A";
                  const unit  = unitShort(item.glass?.unit);
                  const desc  = [thick, type, `Stand #${item.standNo}`, (item.height && item.width) ? `${item.height}×${item.width} ${unit}` : ""].filter(Boolean).join(" ");
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: i < lowStockItems.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: "rgba(79,93,255,0.2)", display: "flex",
                          alignItems: "center", justifyContent: "center",
                          fontSize: 14, color: "#818CF8",
                        }}>
                          🪟
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: isMobile ? 180 : 300 }}>
                            {desc}
                          </div>
                          <div style={{ fontSize: 11.5, color: "#7180A6", marginTop: 1 }}>
                            Stand #{item.standNo}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#FF6B81", lineHeight: 1 }}>
                          {item.quantity}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          LEFT
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {lowStockCount > 6 && (
                <div style={{ marginTop: 10, textAlign: "center" }}>
                  <button
                    onClick={() => navigate("/view-stock")}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 600, color: "#4F5DFF",
                      fontFamily: "inherit", padding: "6px 12px",
                    }}
                  >
                    +{lowStockCount - 6} more — view all →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Recent Activity */}
          {role === "ROLE_ADMIN" && (
            <div style={{
              background: "rgba(17,27,53,0.9)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0, letterSpacing: "-0.02em" }}>
                  Recent Activity
                </h3>
                <button
                  onClick={() => navigate("/audit")}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: 600, color: "#4F5DFF",
                    fontFamily: "inherit", padding: "4px 8px", borderRadius: 6,
                    transition: "background 130ms ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(79,93,255,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                >
                  View all →
                </button>
              </div>

              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[1,2,3].map(i => <Skeleton key={i} h={56} r={8} />)}
                </div>
              ) : auditLogs.length === 0 ? (
                <EmptyState icon="📋" title="No recent activity" subtitle="Activity will appear here as your team updates stock" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {auditLogs.map((log, i) => {
                    const ac = ACTION_COLORS[log.action] || ACTION_COLORS.DEFAULT;
                    return (
                      <div key={i} style={{
                        display: "flex", gap: 12, alignItems: "flex-start",
                        padding: "10px 0",
                        borderBottom: i < auditLogs.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      }}>
                        {/* Avatar */}
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: "rgba(79,93,255,0.25)",
                          border: "1px solid rgba(79,93,255,0.3)",
                          display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#818CF8",
                        }}>
                          {(log.username || "U").charAt(0).toUpperCase()}
                        </div>
                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>
                              {log.username || "Unknown"}
                            </span>
                            <span style={{
                              fontSize: 10.5, fontWeight: 600, padding: "2px 7px",
                              borderRadius: 999, background: ac.bg, color: ac.color,
                            }}>
                              {log.action}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "#A9B3D1" }}>
                            <strong style={{ color: "#fff" }}>{log.quantity}</strong> × {log.glassType || "N/A"}
                            {log.standNo && ` · Stand #${log.standNo}`}
                            {log.height && log.width && ` · ${log.height}×${log.width}`}
                          </div>
                        </div>
                        {/* Time */}
                        <div style={{ fontSize: 11, color: "#7180A6", flexShrink: 0, whiteSpace: "nowrap" }}>
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Quick Actions */}
          <div style={{
            background: "rgba(17,27,53,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
              Quick Actions
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <QuickCard
                iconPaths={["M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z","M3.27 6.96L12 12.01l8.73-5.05","M12 22.08V12"]}
                title="View Stock"
                subtitle="Browse inventory"
                to="/view-stock"
                color="#4F5DFF"
              />
              {role === "ROLE_ADMIN" && (
                <>
                  <QuickCard
                    iconPaths={["M12 5v14","M5 12h14"]}
                    title="Manage Stock"
                    subtitle="Add / edit items"
                    to="/manage-stock"
                    color="#37E3A5"
                  />
                  <QuickCard
                    iconPaths={["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M9 7a4 4 0 100 8 4 4 0 000-8z","M23 21v-2a4 4 0 00-3-3.87","M16 3.13a4 4 0 010 7.75"]}
                    title="Customers"
                    subtitle="Manage clients"
                    to="/customers"
                    color="#FFB95E"
                  />
                  <QuickCard
                    iconPaths={["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z","M14 2v6h6","M12 18v-6","M9 15h6"]}
                    title="Invoices"
                    subtitle="Billing & payments"
                    to="/invoices"
                    color="#FF6B81"
                  />
                  <QuickCard
                    iconPaths={["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z","M14 2v6h6","M16 13H8","M16 17H8","M10 9H8"]}
                    title="Quotations"
                    subtitle="Create quotes"
                    to="/quotations"
                    color="#8B5CF6"
                  />
                  <QuickCard
                    iconPaths={["M12 2L2 7l10 5 10-5-10-5z","M2 17l10 5 10-5","M2 12l10 5 10-5"]}
                    title="Optimization"
                    subtitle="Cut planning"
                    to="/optimization"
                    color="#60A5FA"
                  />
                </>
              )}
              {role === "ROLE_STAFF" && (
                <QuickCard
                  iconPaths={["M12 2L2 7l10 5 10-5-10-5z","M2 17l10 5 10-5","M2 12l10 5 10-5"]}
                  title="Optimization"
                  subtitle="Cut planning"
                  to="/optimization"
                  color="#60A5FA"
                />
              )}
            </div>
          </div>

          {/* Inventory Snapshot */}
          <div style={{
            background: "rgba(17,27,53,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: "0 0 14px", letterSpacing: "-0.02em" }}>
              Inventory Snapshot
            </h3>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1,2,3].map(i => <Skeleton key={i} h={38} r={6} />)}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[
                  { label: "Total Items",   value: stats.totalStock,    color: "#4F5DFF" },
                  { label: "Total Qty",     value: stats.totalQuantity, color: "#37E3A5" },
                  { label: "Low Stock",     value: lowStockCount,       color: lowStockCount > 0 ? "#FF6B81" : "#37E3A5" },
                  ...(role === "ROLE_ADMIN" ? [
                    { label: "Transfers",   value: stats.totalTransfers, color: "#8B5CF6" },
                    { label: "Staff",       value: stats.totalStaff,     color: "#60A5FA" },
                  ] : [
                    { label: "Pending Cutting",  value: stats.pendingCutting,  color: stats.pendingCutting > 0 ? "#FFB95E" : "#37E3A5" },
                    { label: "Total Orders",     value: stats.confirmedOrders, color: "#4F5DFF" },
                  ]),
                ].map((row, i, arr) => (
                  <div key={row.label} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 0",
                    borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  }}>
                    <span style={{ fontSize: 13, color: "#A9B3D1", fontWeight: 500 }}>{row.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: row.color }}>
                      {row.value?.toLocaleString?.() ?? row.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Low-stock threshold modal ─────────────────────────────────────── */}
      {showThresholdModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(5,11,31,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 16, backdropFilter: "blur(8px)" }}
          onClick={() => setShowThresholdModal(false)}
        >
          <div
            style={{ background: "rgba(17,27,53,0.98)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "22px 20px 18px", width: "100%", maxWidth: 340, boxShadow: "0 24px 64px rgba(0,0,0,0.6)", fontFamily: "'Inter',-apple-system,sans-serif", animation: "scaleIn 0.2s ease-out" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>Low Stock Threshold</div>
            <p style={{ fontSize: 13, color: "#A9B3D1", margin: "0 0 14px", lineHeight: 1.5 }}>
              Show an alert when stock quantity is ≤ this value.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {[1, 2, 3, 5, 10, 15, 20].map(v => {
                const active = thresholdInput === String(v);
                return (
                  <button
                    key={v}
                    onClick={() => setThresholdInput(String(v))}
                    style={{
                      padding: "5px 13px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      border: `1.5px solid ${active ? "#4F5DFF" : "rgba(255,255,255,0.12)"}`,
                      background: active ? "rgba(79,93,255,0.2)" : "rgba(255,255,255,0.05)",
                      color: active ? "#818CF8" : "#A9B3D1",
                      transition: "all 120ms ease",
                      fontFamily: "inherit",
                    }}
                  >{v}</button>
                );
              })}
            </div>

            <input
              type="number" min="1" max="9999"
              value={thresholdInput}
              onChange={e => setThresholdInput(e.target.value)}
              onFocus={e => { e.target.style.borderColor = "rgba(79,93,255,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(79,93,255,0.15)"; }}
              onBlur={e =>  { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16, fontFamily: "inherit", color: "#ffffff", background: "rgba(255,255,255,0.06)", transition: "border-color 150ms ease, box-shadow 150ms ease" }}
            />

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowThresholdModal(false)}
                style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#A9B3D1", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 140ms ease" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#A9B3D1"; }}
              >Cancel</button>
              <button
                onClick={saveThreshold}
                disabled={thresholdSaving}
                style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", background: thresholdSaving ? "rgba(79,93,255,0.4)" : "#4F5DFF", color: "#fff", fontSize: 13, fontWeight: 600, cursor: thresholdSaving ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 140ms ease" }}
                onMouseEnter={e => { if (!thresholdSaving) e.currentTarget.style.background = "#3D4DE8"; }}
                onMouseLeave={e => { if (!thresholdSaving) e.currentTarget.style.background = "#4F5DFF"; }}
              >{thresholdSaving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
