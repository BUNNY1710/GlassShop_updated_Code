import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import PageWrapper from "../components/PageWrapper";
import { StatCard, Card, Button } from "../components/ui";
import { Badge } from "../components/ui";
import api from "../api/api";
import { useResponsive } from "../hooks/useResponsive";
import "../styles/design-system.css";

// ─── Chart colours ────────────────────────────────────────────────────────────
const CHART_COLORS = ["#4f46e5","#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6"];

// ─── Action-badge colours ──────────────────────────────────────────────────────
const ACTION_COLORS = {
  ADD:      { bg:"#dcfce7", color:"#15803d" },
  REMOVE:   { bg:"#fee2e2", color:"#b91c1c" },
  EDIT:     { bg:"#dbeafe", color:"#1d4ed8" },
  TRANSFER: { bg:"#ede9fe", color:"#6d28d9" },
  DEFAULT:  { bg:"#f1f5f9", color:"#475569" },
};

// ─── Page-header component ────────────────────────────────────────────────────
function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      marginBottom: 24, gap: 16, flexWrap: "wrap",
    }}>
      <div>
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: "#0f172a",
          letterSpacing: "-0.03em", margin: "0 0 4px 0",
          fontFamily: "'Inter',-apple-system,sans-serif",
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: 13.5, color: "#64748b", margin: 0, fontWeight: 400,
            fontFamily: "'Inter',-apple-system,sans-serif",
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {actions}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────
function Skeleton({ h = 80, r = 10 }) {
  return (
    <div style={{
      height: h, borderRadius: r,
      background: "linear-gradient(90deg,#f1f5f9 25%,#e8edf2 50%,#f1f5f9 75%)",
      backgroundSize: "300% 100%",
      animation: "shimmer 1.4s ease-in-out infinite",
    }} />
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.25 }}>{icon}</div>
      <p style={{ fontSize: 14, fontWeight: 600, color: "#475569", margin: "0 0 4px" }}>{title}</p>
      {subtitle && <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>{subtitle}</p>}
    </div>
  );
}

// ─── Pie chart tooltip ────────────────────────────────────────────────────────
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0",
      boxShadow: "0 4px 12px rgba(15,23,42,.1)", padding: "10px 14px",
    }}>
      <p style={{ margin: 0, fontWeight: 600, color: "#0f172a", fontSize: 13 }}>
        {payload[0].name}
      </p>
      <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12.5 }}>
        Qty: <strong>{payload[0].value.toLocaleString()}</strong>
      </p>
      <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: 11.5 }}>
        Items: {payload[0].payload.count}
      </p>
    </div>
  );
}

// ─── Quick-action card ────────────────────────────────────────────────────────
function QuickCard({ icon, label, to, color }) {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => navigate(to)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "13px 16px", borderRadius: 10, cursor: "pointer",
        border: "1px solid #e8edf2",
        background: hov ? "#fafbff" : "#fff",
        boxShadow: hov ? "0 4px 12px rgba(79,70,229,.08)" : "0 1px 3px rgba(15,23,42,.05)",
        transform: hov ? "translateY(-1px)" : "none",
        transition: "all 160ms ease",
        fontFamily: "'Inter',-apple-system,sans-serif",
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `${color}18`, color, fontSize: 16,
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: "#374151" }}>{label}</span>
      <span style={{ marginLeft: "auto", color: "#94a3b8", fontSize: 12 }}>→</span>
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

        // Load persisted threshold (admin only; default 5 for staff)
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

  // Low-stock derived values — reactive to both stockData and threshold
  const lowStockItems = stockData.filter(i => i.quantity <= threshold).slice(0, 6);
  const lowStockCount = stockData.filter(i => i.quantity <= threshold).length;

  // Unit short label for display
  const unitShort = (u) =>
    ({ INCH: "IN", MM: "MM", FEET: "FT" }[(u || "MM").toUpperCase()] || u || "MM");

  // Save threshold to backend and update local state
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

  // ── Column layout helpers ──
  const colsStats = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr 1fr" : role === "ROLE_ADMIN" ? "repeat(6,1fr)" : "repeat(4,1fr)",
    gap: 12, marginBottom: 20,
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <PageWrapper>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <PageHeader
        title={`${greeting} 👋`}
        subtitle="Here's what's happening with your inventory today."
        actions={role === "ROLE_ADMIN" && [
          <Button key="add" variant="primary" size="sm" icon="+" onClick={() => navigate("/manage-stock")}>
            Add Stock
          </Button>,
          <Button key="view" variant="secondary" size="sm" onClick={() => navigate("/view-stock")}>
            View Stock
          </Button>,
        ]}
      />

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div style={colsStats}>
        {loading ? (
          Array.from({ length: role === "ROLE_ADMIN" ? 6 : 4 }).map((_, i) => (
            <div key={i} style={{ borderRadius: 12, overflow: "hidden" }}>
              <Skeleton h={96} r={12} />
            </div>
          ))
        ) : role === "ROLE_ADMIN" ? (
          <>
            <StatCard icon="📦" label="Stock Items"    value={stats.totalStock}     color="#4f46e5" />
            <StatCard icon="🔢" label="Total Qty"      value={stats.totalQuantity}  color="#3b82f6" />
            <StatCard icon="⚠️" label="Low Stock"      value={lowStockCount}        color={lowStockCount > 0 ? "#ef4444" : "#22c55e"} />
            <StatCard icon="🔄" label="Transfers"      value={stats.totalTransfers} color="#8b5cf6" />
            <StatCard icon="👥" label="Staff"          value={stats.totalStaff}     color="#22c55e" />
            <StatCard icon="📜" label="Activity Logs"  value={stats.totalLogs}      color="#f59e0b" />
          </>
        ) : (
          <>
            <StatCard icon="📦" label="Stock Items"       value={stats.totalStock}      color="#4f46e5" />
            <StatCard icon="🔢" label="Total Qty"         value={stats.totalQuantity}   color="#3b82f6" />
            <StatCard icon="✂️" label="Pending Cutting"   value={stats.pendingCutting}  color={stats.pendingCutting > 0 ? "#f59e0b" : "#22c55e"} />
            <StatCard icon="⚠️" label="Low Stock"         value={lowStockCount}        color={lowStockCount > 0 ? "#ef4444" : "#22c55e"} />
          </>
        )}
      </div>

      {/* ── Main content grid ──────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: 16, alignItems: "start" }}>
        {/* LEFT column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Stock overview card */}
          <Card>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <h3 style={{ fontSize:15, fontWeight:700, color:"#0f172a", margin:"0 0 2px", letterSpacing:"-0.02em" }}>
                  Stock Overview
                </h3>
                <p style={{ fontSize:12.5, color:"#64748b", margin:0 }}>
                  Inventory distribution by glass type
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/view-stock")}>
                View all →
              </Button>
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
                display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 12,
                paddingTop: 12, borderTop: "1px solid #f1f5f9",
              }}>
                {pieData.map((d, i) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:CHART_COLORS[i%CHART_COLORS.length], flexShrink:0 }} />
                    <span style={{ fontSize:11.5, color:"#64748b" }}>{d.name}</span>
                    <span style={{ fontSize:11, color:"#94a3b8" }}>({d.value})</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Low stock alert */}
          {!loading && lowStockCount > 0 && (
            <Card>
              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div>
                  <h3 style={{ fontSize:15, fontWeight:700, color:"#0f172a", margin:"0 0 2px", letterSpacing:"-0.02em", display:"flex", alignItems:"center", gap:6 }}>
                    Low Stock Alerts
                    {role === "ROLE_ADMIN" && (
                      <button
                        title={`Threshold: ≤ ${threshold}. Click to change.`}
                        onClick={() => { setThresholdInput(String(threshold)); setShowThresholdModal(true); }}
                        style={{ width:22, height:22, borderRadius:5, border:"1px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", fontSize:12, color:"#64748b", display:"inline-flex", alignItems:"center", justifyContent:"center", padding:0, lineHeight:1, flexShrink:0 }}
                        onMouseEnter={e => { e.currentTarget.style.background="#f1f5f9"; e.currentTarget.style.color="#374151"; }}
                        onMouseLeave={e => { e.currentTarget.style.background="#f8fafc"; e.currentTarget.style.color="#64748b"; }}
                      >⚙</button>
                    )}
                  </h3>
                  <p style={{ fontSize:12.5, color:"#64748b", margin:0 }}>
                    {lowStockCount} item{lowStockCount !== 1 ? "s" : ""} with qty ≤ {threshold}
                  </p>
                </div>
                <Badge status="WARNING" dot label={`${lowStockCount} low`} />
              </div>

              {/* Item cards */}
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {lowStockItems.map((item, i) => {
                  const t    = item.glass?.thickness;
                  const thick = t != null ? `${Number(t)}MM` : "";
                  const type  = item.glass?.type || "N/A";
                  const unit  = unitShort(item.glass?.unit);
                  const desc  = [thick, type, `Stand #${item.standNo}`, (item.height && item.width) ? `${item.height}×${item.width} ${unit}` : ""].filter(Boolean).join(" ");
                  return (
                    <div key={i} style={{
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"7px 11px", borderRadius:8,
                      background: i % 2 === 0 ? "#fafbff" : "#fff",
                      border:"1px solid #f1f5f9",
                    }}>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"#0f172a", lineHeight:1.3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {desc}
                        </div>
                        <div style={{ fontSize:11, color:"#94a3b8", marginTop:1 }}>
                          Qty Left: <span style={{ color:"#ef4444", fontWeight:700 }}>{item.quantity}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {lowStockCount > 6 && (
                <div style={{ marginTop:10, textAlign:"center" }}>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/view-stock")}>
                    +{lowStockCount - 6} more — view all →
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Recent activity — admin */}
          {role === "ROLE_ADMIN" && (
            <Card>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div>
                  <h3 style={{ fontSize:15, fontWeight:700, color:"#0f172a", margin:"0 0 2px", letterSpacing:"-0.02em" }}>
                    Recent Activity
                  </h3>
                  <p style={{ fontSize:12.5, color:"#64748b", margin:0 }}>
                    Latest stock updates from your team
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/audit")}>
                  View all →
                </Button>
              </div>

              {loading ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[1,2,3].map(i => <Skeleton key={i} h={56} r={8} />)}
                </div>
              ) : auditLogs.length === 0 ? (
                <EmptyState icon="📋" title="No recent activity" subtitle="Activity will appear here as your team updates stock" />
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {auditLogs.map((log, i) => {
                    const ac = ACTION_COLORS[log.action] || ACTION_COLORS.DEFAULT;
                    return (
                      <div key={i} style={{
                        display:"flex", gap:12, alignItems:"flex-start",
                        padding:"10px 12px", borderRadius:8,
                        background: i%2===0 ? "#f8fafc" : "#fff",
                        border:"1px solid #f1f5f9",
                      }}>
                        {/* Avatar */}
                        <div style={{
                          width:32, height:32, borderRadius:8, flexShrink:0,
                          background:"#4f46e5", display:"flex", alignItems:"center",
                          justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff",
                        }}>
                          {(log.username||"U").charAt(0).toUpperCase()}
                        </div>
                        {/* Content */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                            <span style={{ fontSize:13, fontWeight:600, color:"#0f172a" }}>
                              {log.username || "Unknown"}
                            </span>
                            <span style={{
                              fontSize:10.5, fontWeight:600, padding:"2px 7px",
                              borderRadius:999, background:ac.bg, color:ac.color,
                            }}>
                              {log.action}
                            </span>
                          </div>
                          <div style={{ fontSize:12, color:"#64748b" }}>
                            <strong>{log.quantity}</strong> × {log.glassType || "N/A"}
                            {log.standNo && ` · Stand #${log.standNo}`}
                            {log.height && log.width && ` · ${log.height}×${log.width}`}
                          </div>
                          <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* RIGHT column — quick actions */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Quick actions */}
          <Card>
            <h3 style={{ fontSize:14, fontWeight:700, color:"#0f172a", margin:"0 0 12px", letterSpacing:"-0.02em" }}>
              Quick Actions
            </h3>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <QuickCard icon="📦" label="View Stock" to="/view-stock" color="#4f46e5" />
              {role === "ROLE_ADMIN" && (
                <>
                  <QuickCard icon="✏️" label="Manage Stock"   to="/manage-stock"   color="#3b82f6" />
                  <QuickCard icon="🔁" label="Transfer Stock" to="/stock-transfer" color="#8b5cf6" />
                  <QuickCard icon="👥" label="Customers"      to="/customers"      color="#22c55e" />
                  <QuickCard icon="📄" label="Quotations"     to="/quotations"     color="#f59e0b" />
                  <QuickCard icon="🧾" label="Invoices"       to="/invoices"       color="#ef4444" />
                </>
              )}
              {role === "ROLE_STAFF" && (
                <QuickCard icon="⊞" label="Optimization" to="/optimization" color="#6366f1" />
              )}
            </div>
          </Card>

          {/* Stock snapshot */}
          <Card>
            <h3 style={{ fontSize:14, fontWeight:700, color:"#0f172a", margin:"0 0 14px", letterSpacing:"-0.02em" }}>
              Inventory Snapshot
            </h3>
            {loading ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[1,2,3].map(i => <Skeleton key={i} h={38} r={6} />)}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {[
                  { label:"Total Items",   value: stats.totalStock,     color:"#4f46e5" },
                  { label:"Total Qty",     value: stats.totalQuantity,  color:"#3b82f6" },
                  { label:"Low Stock",     value: lowStockCount,       color: lowStockCount>0?"#ef4444":"#22c55e" },
                  ...(role==="ROLE_ADMIN" ? [
                    { label:"Transfers",         value: stats.totalTransfers, color:"#8b5cf6" },
                    { label:"Staff",             value: stats.totalStaff,     color:"#22c55e" },
                  ] : [
                    { label:"Pending Cutting",   value: stats.pendingCutting,  color: stats.pendingCutting>0?"#f59e0b":"#22c55e" },
                    { label:"Total Orders",      value: stats.confirmedOrders, color:"#6366f1" },
                  ]),
                ].map((row) => (
                  <div key={row.label} style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"8px 0", borderBottom:"1px solid #f1f5f9",
                  }}>
                    <span style={{ fontSize:13, color:"#64748b", fontWeight:500 }}>{row.label}</span>
                    <span style={{ fontSize:15, fontWeight:700, color:row.color }}>
                      {row.value?.toLocaleString?.() ?? row.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Low-stock threshold modal ─────────────────────────────────────── */}
      {showThresholdModal && (
        <div
          style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.52)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10000, padding:16 }}
          onClick={() => setShowThresholdModal(false)}
        >
          <div
            style={{ background:"#fff", borderRadius:14, padding:"22px 20px 18px", width:"100%", maxWidth:340, boxShadow:"0 20px 40px rgba(15,23,42,0.18)", fontFamily:"'Inter',-apple-system,sans-serif" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize:16, fontWeight:700, color:"#0f172a", marginBottom:4 }}>Low Stock Threshold</div>
            <p style={{ fontSize:13, color:"#64748b", margin:"0 0 14px", lineHeight:1.5 }}>
              Show an alert when stock quantity is ≤ this value.
            </p>

            {/* Quick-select presets */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
              {[1, 2, 3, 5, 10, 15, 20].map(v => {
                const active = thresholdInput === String(v);
                return (
                  <button
                    key={v}
                    onClick={() => setThresholdInput(String(v))}
                    style={{
                      padding:"5px 13px", borderRadius:6, fontSize:13, fontWeight:600, cursor:"pointer",
                      border: `1.5px solid ${active ? "#4f46e5" : "#e2e8f0"}`,
                      background: active ? "#eef2ff" : "#fff",
                      color:      active ? "#4f46e5" : "#374151",
                      transition: "all 120ms ease",
                    }}
                  >{v}</button>
                );
              })}
            </div>

            {/* Custom numeric input */}
            <input
              type="number" min="1" max="9999"
              value={thresholdInput}
              onChange={e => setThresholdInput(e.target.value)}
              onFocus={e => { e.target.style.borderColor = "#6366f1"; }}
              onBlur={e =>  { e.target.style.borderColor = "#e2e8f0"; }}
              style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:16, fontFamily:"inherit", color:"#0f172a" }}
            />

            {/* Actions */}
            <div style={{ display:"flex", gap:8 }}>
              <button
                onClick={() => setShowThresholdModal(false)}
                style={{ flex:1, padding:"9px 0", borderRadius:8, border:"1.5px solid #e2e8f0", background:"#fff", color:"#374151", fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}
              >Cancel</button>
              <button
                onClick={saveThreshold}
                disabled={thresholdSaving}
                style={{ flex:1, padding:"9px 0", borderRadius:8, border:"none", background: thresholdSaving ? "#a5b4fc" : "#4f46e5", color:"#fff", fontSize:13, fontWeight:600, cursor: thresholdSaving ? "not-allowed" : "pointer", fontFamily:"inherit", transition:"background 140ms ease" }}
              >{thresholdSaving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

export default Dashboard;
