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
    totalLogs: 0,  lowStock: 0,      totalQuantity: 0,
    pendingCutting: 0, confirmedOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = sessionStorage.getItem("token");
        if (!token) { setLoading(false); return; }
        setLoading(true);

        const [stockRes, staffRes, auditRes, transferRes, quotationsRes] = await Promise.all([
          api.get("/api/stock/all").then(r => r.data).catch(() => []),
          role === "ROLE_ADMIN" ? api.get("/api/auth/staff").then(r => r.data).catch(() => []) : [],
          role === "ROLE_ADMIN" ? api.get("/api/audit/recent").then(r => r.data).catch(() => []) : [],
          api.get("/api/audit/transfer-count").then(r => {
            const d = r.data;
            return typeof d === "object" && "count" in d ? +d.count : +d || 0;
          }).catch(() => 0),
          api.get("/api/quotations").then(r => r.data).catch(() => []),
        ]);

        if (role === "ROLE_ADMIN") setAuditLogs((auditRes || []).slice(0, 5));

        const active   = (Array.isArray(stockRes) ? stockRes : []).filter(i => i.quantity > 0);
        const lowItems = active.filter(i => i.quantity < (i.minQuantity || 10));
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
          lowStock:        lowItems.length,
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

  const lowStockItems = stockData
    .filter(i => i.quantity < (i.minQuantity || 10))
    .slice(0, 6);

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
            <StatCard icon="⚠️" label="Low Stock"      value={stats.lowStock}       color={stats.lowStock > 0 ? "#ef4444" : "#22c55e"} />
            <StatCard icon="🔄" label="Transfers"      value={stats.totalTransfers} color="#8b5cf6" />
            <StatCard icon="👥" label="Staff"          value={stats.totalStaff}     color="#22c55e" />
            <StatCard icon="📜" label="Activity Logs"  value={stats.totalLogs}      color="#f59e0b" />
          </>
        ) : (
          <>
            <StatCard icon="📦" label="Stock Items"       value={stats.totalStock}      color="#4f46e5" />
            <StatCard icon="🔢" label="Total Qty"         value={stats.totalQuantity}   color="#3b82f6" />
            <StatCard icon="✂️" label="Pending Cutting"   value={stats.pendingCutting}  color={stats.pendingCutting > 0 ? "#f59e0b" : "#22c55e"} />
            <StatCard icon="⚠️" label="Low Stock"         value={stats.lowStock}        color={stats.lowStock > 0 ? "#ef4444" : "#22c55e"} />
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
          {!loading && stats.lowStock > 0 && (
            <Card>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div>
                  <h3 style={{ fontSize:15, fontWeight:700, color:"#0f172a", margin:"0 0 2px", letterSpacing:"-0.02em" }}>
                    Low Stock Alerts
                  </h3>
                  <p style={{ fontSize:12.5, color:"#64748b", margin:0 }}>
                    {stats.lowStock} item{stats.lowStock !== 1 ? "s" : ""} below threshold
                  </p>
                </div>
                <Badge status="WARNING" dot label={`${stats.lowStock} low`} />
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {lowStockItems.map((item, i) => (
                  <div key={i} style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"9px 12px", borderRadius:8,
                    background: i%2===0 ? "#fafbff" : "#fff",
                    border:"1px solid #f1f5f9",
                  }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:"#0f172a" }}>
                        {item.glass?.type || "N/A"} · {item.glass?.thickness || ""}{item.glass?.unit || "MM"}
                      </div>
                      <div style={{ fontSize:11.5, color:"#94a3b8", marginTop:2 }}>
                        Stand #{item.standNo} · {item.height}×{item.width} {item.glass?.unit || "MM"}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:15, fontWeight:700, color:"#ef4444" }}>{item.quantity}</div>
                      <div style={{ fontSize:10.5, color:"#94a3b8" }}>/ {item.minQuantity || 10}</div>
                    </div>
                  </div>
                ))}
              </div>
              {stats.lowStock > 6 && (
                <div style={{ marginTop:10, textAlign:"center" }}>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/view-stock")}>
                    +{stats.lowStock - 6} more — view all →
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
                  { label:"Low Stock",     value: stats.lowStock,       color: stats.lowStock>0?"#ef4444":"#22c55e" },
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
    </PageWrapper>
  );
}

export default Dashboard;
