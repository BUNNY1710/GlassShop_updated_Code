import { useState, useEffect, useCallback } from "react";
import PageWrapper from "../components/PageWrapper";
import dashboardBg from "../assets/dashboard-bg.jpg";
import {
  getArchitects, createArchitect, updateArchitect, deleteArchitect,
  searchArchitects, getArchitectById, getArchitectQuotations, getArchitectOrders,
} from "../api/quotationApi";
import { useResponsive } from "../hooks/useResponsive";
import { Button, Badge } from "../components/ui";
import "../styles/design-system.css";

/* ─── helpers ───────────────────────────────────────────────────────────────── */
const fmt  = n => `₹${(parseFloat(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const fmtK = n => { const v = parseFloat(n) || 0; return v >= 1e5 ? `₹${(v/1e5).toFixed(2)}L` : v >= 1e3 ? `₹${(v/1e3).toFixed(1)}K` : fmt(v); };

const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13.5, boxSizing: "border-box", transition: "border-color 150ms ease, box-shadow 150ms ease", outline: "none", fontFamily: "'Inter',-apple-system,sans-serif", color: "#0f172a", background: "#fff" };
const labelSt = { display: "block", marginBottom: 5, color: "#475569", fontWeight: 600, fontSize: 12.5, fontFamily: "'Inter',-apple-system,sans-serif" };

const TABS = ["Details", "Customers", "Quotations", "Orders", "Analytics"];
const StatusBadge = ({ status }) => <Badge status={status} dot label={status} />;

/* ─── FocusInput ────────────────────────────────────────────────────────────── */
function FI({ type = "text", value, onChange, placeholder, required, maxLength }) {
  const [f, setF] = useState(false);
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} maxLength={maxLength}
    style={{ ...inputStyle, borderColor: f ? "#6366f1" : "#d1d5db" }}
    onFocus={() => setF(true)} onBlur={() => setF(false)} />;
}
function FTA({ value, onChange, placeholder, rows = 3 }) {
  const [f, setF] = useState(false);
  return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
    style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", minHeight: rows * 26, borderColor: f ? "#6366f1" : "#d1d5db" }}
    onFocus={() => setF(true)} onBlur={() => setF(false)} />;
}

/* ─── Print report ──────────────────────────────────────────────────────────── */
const printArchitectReport = ({ architect, customers, quotations, orders, opts, shopName }) => {
  const { inclSummary = true, inclCustomers = true, inclQuotations = true, inclOrders = true } = opts;
  const stats = architect.stats || {};
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeNow = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const fmtMoney = n => `₹${(parseFloat(n)||0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const custRows = (customers || []).map(c => `
    <tr><td>${c.name}</td><td>${c.mobile||"—"}</td><td>${c.city||"—"}</td></tr>`).join("");

  const qtnRows = (quotations || []).map(q => `
    <tr><td>${q.quotationNumber}</td><td>${q.customerName}</td><td>${q.quotationDate||""}</td>
    <td>₹${(parseFloat(q.grandTotal)||0).toFixed(2)}</td><td>${q.status}</td></tr>`).join("");

  const ordRows = (orders || []).map(o => `
    <tr><td>${o.invoiceNumber}</td><td>${o.customerName}</td>
    <td>₹${(parseFloat(o.grandTotal)||0).toFixed(2)}</td><td>${o.paymentStatus}</td></tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Architect Report — ${architect.name}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 12mm; }
  * { box-sizing: border-box; font-family: Arial, sans-serif; }
  body { margin: 0; color: #000; font-size: 12px; line-height: 1.4; }
  h1  { font-size: 20px; margin: 0; }
  h2  { font-size: 13px; margin: 0 0 8px; border-bottom: 1.5px solid #000; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { background: #222; color: white; padding: 5px 8px; font-size: 11px; text-align: left; }
  td { padding: 4px 8px; border: 1px solid #ccc; font-size: 11px; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 14px; }
  .stat { background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; padding: 10px; text-align: center; }
  .stat .v { font-size: 22px; font-weight: 800; margin-bottom: 2px; }
  .stat .l { font-size: 10px; color: #555; text-transform: uppercase; }
  .section { margin-bottom: 14px; page-break-inside: avoid; }
  .hdr { display: flex; justify-content: space-between; border-bottom: 2.5px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
  .info td { border: none; padding: 3px 6px; }
  .info td:first-child { font-weight: bold; width: 130px; }
  .page-num { position: fixed; bottom: 8mm; right: 12mm; font-size: 9px; color: #888; }
</style></head><body>
<div class="hdr">
  <div><h1>${shopName || "Glass Shop"}</h1><div style="font-size:13px;font-weight:bold;margin-top:2px;">ARCHITECT REPORT</div></div>
  <div style="text-align:right;font-size:10.5px;color:#444;">
    <div><strong>Date:</strong> ${today}</div><div><strong>Time:</strong> ${timeNow}</div>
    <div style="margin-top:4px;font-size:11px;background:#222;color:white;border-radius:3px;padding:1px 6px;display:inline-block;">${architect.name}</div>
  </div>
</div>
<div class="section">
  <h2>Architect Information</h2>
  <table class="info"><tr><td>Name</td><td>${architect.name}</td></tr>
  <tr><td>Phone</td><td>${architect.mobile||"—"}</td></tr>
  <tr><td>Email</td><td>${architect.email||"—"}</td></tr>
  <tr><td>City</td><td>${[architect.city,architect.state].filter(Boolean).join(", ")||"—"}</td></tr>
  </table>
</div>
${inclSummary ? `
<div class="section">
  <h2>Summary</h2>
  <div class="grid">
    <div class="stat"><div class="v">${stats.totalCustomers||0}</div><div class="l">Customers</div></div>
    <div class="stat"><div class="v">${stats.totalQuotations||0}</div><div class="l">Quotations</div></div>
    <div class="stat"><div class="v">${stats.approvedQuotations||0}</div><div class="l">Approved</div></div>
    <div class="stat"><div class="v">${stats.conversionRate||0}%</div><div class="l">Conversion</div></div>
    <div class="stat"><div class="v">${stats.totalOrders||0}</div><div class="l">Orders</div></div>
    <div class="stat"><div class="v">${fmtMoney(stats.totalRevenue)}</div><div class="l">Revenue</div></div>
  </div>
</div>` : ""}
${inclCustomers && custRows ? `
<div class="section">
  <h2>Customer List (${(customers||[]).length})</h2>
  <table><thead><tr><th>Customer Name</th><th>Phone</th><th>City</th></tr></thead>
  <tbody>${custRows}</tbody></table>
</div>` : ""}
${inclQuotations && qtnRows ? `
<div class="section">
  <h2>Quotation List (${(quotations||[]).length})</h2>
  <table><thead><tr><th>Quote No</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
  <tbody>${qtnRows}</tbody></table>
</div>` : ""}
${inclOrders && ordRows ? `
<div class="section">
  <h2>Order List (${(orders||[]).length})</h2>
  <table><thead><tr><th>Order No</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
  <tbody>${ordRows}</tbody></table>
</div>` : ""}
<div class="page-num">Page 1 of 1</div>
<script>window.onload = () => setTimeout(() => window.print(), 350);</script>
</body></html>`;

  const win = window.open("", "_blank", "width=850,height=1100");
  if (!win) { alert("Please allow popups to print."); return; }
  win.document.write(html);
  win.document.close();
};

/* ─── ArchitectDetailModal (tabs) ───────────────────────────────────────────── */
function ArchitectDetailModal({ id, onClose, onEdit, isMobile }) {
  const [activeTab, setActiveTab]   = useState("Details");
  const [detail, setDetail]         = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [qSearch, setQSearch]       = useState("");
  const [qStatus, setQStatus]       = useState("ALL");
  const [oSearch, setOSearch]       = useState("");
  const [printOpts, setPrintOpts]   = useState({ inclSummary: true, inclCustomers: true, inclQuotations: true, inclOrders: true });
  const [shopName, setShopName]     = useState("Glass Shop");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getArchitectById(id)
      .then(r => setDetail(r.data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
    // fetch shop name
    const token = sessionStorage.getItem("token");
    if (token) {
      try { const p = JSON.parse(atob(token.split(".")[1])); if (p.shopName) setShopName(p.shopName); } catch {}
    }
  }, [id]);

  const loadQuotations = useCallback(() => {
    if (!id) return;
    getArchitectQuotations(id, { status: qStatus, search: qSearch }).then(r => setQuotations(r.data || [])).catch(() => {});
  }, [id, qStatus, qSearch]);

  const loadOrders = useCallback(() => {
    if (!id) return;
    getArchitectOrders(id, { search: oSearch }).then(r => setOrders(r.data || [])).catch(() => {});
  }, [id, oSearch]);

  useEffect(() => { if (activeTab === "Quotations") loadQuotations(); }, [activeTab, loadQuotations]);
  useEffect(() => { if (activeTab === "Orders")     loadOrders();     }, [activeTab, loadOrders]);

  if (!id) return null;
  const stats   = detail?.stats || {};
  const customers = detail?.referredCustomers || [];

  const tabBar = (
    <div style={{ display: "flex", gap: 4, padding: "0 4px", borderBottom: "1px solid #e8edf2", overflowX: "auto", marginBottom: 0 }}>
      {TABS.map(t => (
        <button key={t} onClick={() => setActiveTab(t)}
          style={{ padding: "10px 14px", border: "none", background: "none", cursor: "pointer",
            fontWeight: activeTab === t ? 700 : 500, fontSize: 13, color: activeTab === t ? "#4f46e5" : "#64748b",
            borderBottom: activeTab === t ? "2.5px solid #4f46e5" : "2.5px solid transparent",
            whiteSpace: "nowrap", transition: "all 0.15s" }}>
          {t}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex",
      alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", zIndex: 10010,
      padding: isMobile ? 0 : "20px" }}
      onClick={onClose}>
      <div style={{ background: "white", borderRadius: isMobile ? "20px 20px 0 0" : 16,
        width: isMobile ? "100%" : "min(96vw,720px)", maxHeight: isMobile ? "94vh" : "90vh",
        display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}
        onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div style={{ padding: "16px 20px 0", borderBottom: "1px solid #e8edf2", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 28 }}>🏛️</span>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{detail?.name || "…"}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {detail?.mobile} {detail?.email ? `· ${detail.email}` : ""}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {detail && <Button variant="warning" size="sm" icon="✏️" onClick={() => onEdit(detail)}>Edit</Button>}
              <button onClick={onClose}
                style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748b" }}>✕</button>
            </div>
          </div>
          {tabBar}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>⏳ Loading…</div>
          ) : (
            <>
              {/* ── Details ── */}
              {activeTab === "Details" && detail && (
                <div>
                  <InfoCard title="Contact Information">
                    <IR icon="📱" label="Mobile"  v={detail.mobile} />
                    <IR icon="📧" label="Email"   v={detail.email} />
                    <IR icon="🎂" label="DOB"     v={detail.dob} />
                    <IR icon="🏠" label="Address" v={detail.address} />
                    <IR icon="📍" label="City"    v={[detail.city, detail.state].filter(Boolean).join(", ")} />
                    <IR icon="📮" label="Pincode" v={detail.pincode} />
                  </InfoCard>
                  {detail.notes && (
                    <div style={{ background: "#fffbeb", borderRadius: 10, padding: "12px 16px", marginBottom: 14, border: "1px solid #fde68a" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>📝 Notes</div>
                      <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.6 }}>{detail.notes}</div>
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 14 }}>
                    {[
                      { label: "Customers", v: stats.totalCustomers ?? 0, color: "#6366f1" },
                      { label: "Quotations", v: stats.totalQuotations ?? 0, color: "#f59e0b" },
                      { label: "Orders", v: stats.totalOrders ?? 0, color: "#22c55e" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 8px", textAlign: "center", border: "1px solid #e8edf2" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.v}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Customers ── */}
              {activeTab === "Customers" && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
                    👥 Referred Customers ({customers.length})
                  </div>
                  {customers.length === 0 ? (
                    <Empty icon="👥" msg="No customers referred yet" />
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "#f3f4f6" }}>
                            {["Customer", "Phone", "City", "Joined"].map(h => (
                              <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {customers.map((c, i) => (
                            <tr key={c.id} style={{ borderTop: "1px solid #e5e7eb", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                              <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a" }}>👤 {c.name}</td>
                              <td style={{ padding: "10px 12px", color: "#4b5563" }}>{c.mobile || "—"}</td>
                              <td style={{ padding: "10px 12px", color: "#4b5563" }}>{c.city || "—"}</td>
                              <td style={{ padding: "10px 12px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                                {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Quotations ── */}
              {activeTab === "Quotations" && (
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                    <input placeholder="🔍 Search quotations…" value={qSearch}
                      onChange={e => setQSearch(e.target.value)}
                      style={{ flex: 1, minWidth: 120, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13 }} />
                    <select value={qStatus} onChange={e => setQStatus(e.target.value)}
                      style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13 }}>
                      {["ALL", "DRAFT", "CONFIRMED", "REJECTED"].map(s => <option key={s}>{s}</option>)}
                    </select>
                    <Button variant="primary" size="sm" onClick={loadQuotations}>Search</Button>
                  </div>
                  {quotations.length === 0 ? <Empty icon="📄" msg="No quotations found" /> : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "#f3f4f6" }}>
                            {["Quote #", "Customer", "Date", "Amount", "Status"].map(h => (
                              <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {quotations.map((q, i) => (
                            <tr key={q.id} style={{ borderTop: "1px solid #e5e7eb", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                              <td style={{ padding: "10px 12px", fontWeight: 600, color: "#4f46e5", whiteSpace: "nowrap" }}>{q.quotationNumber}</td>
                              <td style={{ padding: "10px 12px", color: "#0f172a" }}>{q.customerName}</td>
                              <td style={{ padding: "10px 12px", color: "#4b5563", whiteSpace: "nowrap" }}>{q.quotationDate}</td>
                              <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>₹{(parseFloat(q.grandTotal)||0).toFixed(0)}</td>
                              <td style={{ padding: "10px 12px" }}><StatusBadge status={q.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Orders ── */}
              {activeTab === "Orders" && (
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    <input placeholder="🔍 Search orders…" value={oSearch}
                      onChange={e => setOSearch(e.target.value)}
                      style={{ flex: 1, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13 }} />
                    <Button variant="primary" size="sm" onClick={loadOrders}>Search</Button>
                  </div>
                  {orders.length === 0 ? <Empty icon="📦" msg="No orders found" /> : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "#f3f4f6" }}>
                            {["Order #", "Customer", "Date", "Amount", "Payment"].map(h => (
                              <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((o, i) => (
                            <tr key={o.id} style={{ borderTop: "1px solid #e5e7eb", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                              <td style={{ padding: "10px 12px", fontWeight: 600, color: "#4f46e5", whiteSpace: "nowrap" }}>{o.invoiceNumber}</td>
                              <td style={{ padding: "10px 12px", color: "#0f172a" }}>{o.customerName}</td>
                              <td style={{ padding: "10px 12px", color: "#4b5563", whiteSpace: "nowrap" }}>{o.invoiceDate}</td>
                              <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>₹{(parseFloat(o.grandTotal)||0).toFixed(0)}</td>
                              <td style={{ padding: "10px 12px" }}><StatusBadge status={o.paymentStatus} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Analytics ── */}
              {activeTab === "Analytics" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
                    {[
                      { label: "Customers Referred", v: stats.totalCustomers      ?? 0,  color: "#6366f1", icon: "👥" },
                      { label: "Total Quotations",   v: stats.totalQuotations     ?? 0,  color: "#f59e0b", icon: "📄" },
                      { label: "Approved",           v: stats.approvedQuotations  ?? 0,  color: "#22c55e", icon: "✅" },
                      { label: "Rejected",           v: stats.rejectedQuotations  ?? 0,  color: "#ef4444", icon: "❌" },
                      { label: "Draft",              v: stats.draftQuotations     ?? 0,  color: "#94a3b8", icon: "📝" },
                      { label: "Conversion Rate",    v: `${stats.conversionRate   ?? 0}%`, color: "#8b5cf6", icon: "📊" },
                      { label: "Total Orders",       v: stats.totalOrders         ?? 0,  color: "#0ea5e9", icon: "📦" },
                      { label: "Revenue Generated",  v: fmtK(stats.totalRevenue   ?? 0), color: "#16a34a", icon: "💰" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 12px", textAlign: "center", border: "1px solid #e8edf2" }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: "-0.04em" }}>{s.v}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Print report section */}
                  <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e8edf2" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>🖨️ Print Report</div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
                      {[
                        { key: "inclSummary",    label: "Summary" },
                        { key: "inclCustomers",  label: "Customers" },
                        { key: "inclQuotations", label: "Quotations" },
                        { key: "inclOrders",     label: "Orders" },
                      ].map(({ key, label }) => (
                        <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: "#374151" }}>
                          <input type="checkbox" checked={printOpts[key]}
                            onChange={() => setPrintOpts(p => ({ ...p, [key]: !p[key] }))}
                            style={{ width: 15, height: 15, accentColor: "#6366f1" }} />
                          {label}
                        </label>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Button variant="primary" size="sm" icon="🖨️"
                        onClick={() => printArchitectReport({ architect: detail, customers, quotations, orders, opts: printOpts, shopName })}>
                        {isMobile ? "Print" : "Print Report"}
                      </Button>
                      <Button variant="secondary" size="sm" icon="📄"
                        onClick={() => printArchitectReport({ architect: detail, customers, quotations, orders, opts: printOpts, shopName })}>
                        {isMobile ? "PDF" : "Export PDF"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px", marginBottom: 14, border: "1px solid #e8edf2" }}>
      {title && <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>{title}</div>}
      {children}
    </div>
  );
}
function IR({ icon, label, v }) {
  if (!v) return null;
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13 }}>
      <span>{icon}</span>
      <span style={{ color: "#64748b", minWidth: 80 }}>{label}:</span>
      <span style={{ color: "#0f172a", fontWeight: 500, flex: 1, wordBreak: "break-word" }}>{v}</span>
    </div>
  );
}
function Empty({ icon, msg }) {
  return <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}>
    <div style={{ fontSize: 40, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 14, fontWeight: 500 }}>{msg}</div>
  </div>;
}

/* ─── Ghost icon-button helpers (shared across desktop table rows) ─────────── */
const ghostBtn = () => ({
  width: 30, height: 30, borderRadius: 6, padding: 0, flexShrink: 0,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  border: "1px solid #e5e7eb", background: "transparent",
  color: "#6b7280", cursor: "pointer", fontSize: 14,
  transition: "all 120ms ease",
});
const applyGhostHover = (e, danger = false) => {
  e.currentTarget.style.background    = danger ? "#fef2f2" : "#f9fafb";
  e.currentTarget.style.borderColor   = danger ? "#fecaca" : "#d1d5db";
  e.currentTarget.style.color         = danger ? "#ef4444" : "#111827";
};
const resetGhostHover = (e) => {
  e.currentTarget.style.background  = "transparent";
  e.currentTarget.style.borderColor = "#e5e7eb";
  e.currentTarget.style.color       = "#6b7280";
};

/* ─── Main page ─────────────────────────────────────────────────────────────── */
const EMPTY_FORM = { name: "", mobile: "", email: "", dob: "", address: "", city: "", state: "", pincode: "", notes: "" };

export default function ArchitectManagement() {
  const { isMobile, isSmallMobile } = useResponsive();
  const [architects,    setArchitects]  = useState([]);
  const [loading,       setLoading]     = useState(false);
  const [message,       setMessage]     = useState("");
  const [showForm,      setShowForm]    = useState(false);
  const [editingId,     setEditingId]   = useState(null);
  const [viewId,        setViewId]      = useState(null);
  const [confirmDelete, setConfirmDel]  = useState(null);
  const [searchQuery,   setSearch]      = useState("");
  const [formData,      setForm]        = useState(EMPTY_FORM);
  const [mobileErr,     setMobileErr]   = useState("");
  const [emailErr,      setEmailErr]    = useState("");
  const [dupWarn,       setDupWarn]     = useState("");

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    const id = setTimeout(async () => {
      if (!searchQuery.trim()) { loadAll(); return; }
      try {
        setLoading(true);
        const r = await searchArchitects(searchQuery.trim());
        setArchitects(r.data);
        if (!r.data.length) setMessage("No architects found");
        else setMessage("");
      } catch { setMessage("❌ Search failed"); loadAll(); }
      finally { setLoading(false); }
    }, 450);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const loadAll = async () => {
    try { setLoading(true); const r = await getArchitects(); setArchitects(r.data); }
    catch { setMessage("❌ Failed to load architects"); }
    finally { setLoading(false); }
  };

  const validateMobile = v => {
    if (!v?.trim()) return "Mobile is required";
    const c = v.replace(/[\s\-\(\)]/g, "");
    if (c.startsWith("+91")) return (c.substring(3).length === 10 && /^\d+$/.test(c.substring(3))) ? "" : "Mobile +91 must have 10 digits";
    return (/^\d+$/.test(c) && c.length === 10) ? "" : "Mobile must be 10 digits";
  };
  const validateEmail = v => (!v?.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) ? "" : "Invalid email format";

  const field = key => ({
    value: formData[key],
    onChange: e => {
      setForm(p => ({ ...p, [key]: e.target.value }));
      if (key === "mobile") setMobileErr(validateMobile(e.target.value));
      if (key === "email")  setEmailErr(validateEmail(e.target.value));
      if (key === "name")   checkDup(e.target.value);
    },
  });

  const checkDup = name => {
    if (!name?.trim()) { setDupWarn(""); return; }
    const dup = architects.find(a => a.name.toLowerCase() === name.trim().toLowerCase() && a.id !== editingId);
    setDupWarn(dup ? `⚠️ "${dup.name}" already exists.` : "");
  };

  const resetForm = () => { setForm(EMPTY_FORM); setMobileErr(""); setEmailErr(""); setDupWarn(""); };

  const openCreate = () => { resetForm(); setEditingId(null); setShowForm(true); };
  const openEdit   = (a) => {
    setForm({ name: a.name||"", mobile: a.mobile||"", email: a.email||"", dob: a.dob||"",
      address: a.address||"", city: a.city||"", state: a.state||"", pincode: a.pincode||"", notes: a.notes||"" });
    setMobileErr(""); setEmailErr(""); setDupWarn("");
    setEditingId(a.id); setShowForm(true); setViewId(null);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage("");
    const me = validateMobile(formData.mobile), ee = validateEmail(formData.email);
    setMobileErr(me); setEmailErr(ee);
    if (me || ee) return;
    try {
      if (editingId) { await updateArchitect(editingId, formData); setMessage("✅ Architect updated"); }
      else           { await createArchitect(formData);             setMessage("✅ Architect created"); }
      setShowForm(false); setEditingId(null); resetForm(); loadAll();
    } catch (err) { setMessage("❌ " + (err.response?.data?.error || err.message)); }
  };

  const handleDelete = async id => {
    try { await deleteArchitect(id); setMessage("✅ Architect deleted"); setConfirmDel(null); loadAll(); }
    catch { setMessage("❌ Failed to delete architect"); setConfirmDel(null); }
  };

  const grid2 = { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 };
  const grid3 = { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 18 };

  return (
    <PageWrapper backgroundImage={dashboardBg}>
      <div style={{ padding: isMobile ? "15px" : "20px", maxWidth: 1400, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 25, padding: 20, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 12, backdropFilter: "blur(10px)" }}>
          <h1 style={{ color: "#fff", marginBottom: 8, fontSize: isMobile ? 26 : 32, fontWeight: 800, textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}>
            🏛️ Architect Management
          </h1>
          <p style={{ color: "#fff", fontSize: 15, margin: 0, fontWeight: 500 }}>
            Manage architects and track their referrals, quotations, and revenue
          </p>
        </div>

        {message && (
          <div style={{ padding: "12px 16px", marginBottom: 20, backgroundColor: message.includes("✅") ? "#22c55e" : "#ef4444",
            color: "white", borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
            {message}
          </div>
        )}

        {/* Toolbar */}
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <div style={{ flex: 1, position: "relative", maxWidth: isMobile ? "100%" : 280 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, pointerEvents: "none", color: "#94a3b8" }}>🔍</span>
            <input type="text" placeholder="Search architects…" value={searchQuery}
              onChange={e => setSearch(e.target.value)} className="search-input"
              style={{ maxWidth: "100%", width: "100%" }} />
          </div>
          <Button size="sm" variant="success" icon="+" onClick={openCreate} style={{ marginLeft: "auto" }}>
            Add Architect
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <div style={{ backgroundColor: "white", padding: isMobile ? 20 : 30, borderRadius: 12, marginBottom: 20, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
            <div style={{ marginBottom: 22, borderBottom: "2px solid #e5e7eb", paddingBottom: 14 }}>
              <h2 style={{ margin: 0, color: "#1f2937", fontSize: isMobile ? 20 : 22, fontWeight: 600 }}>
                {editingId ? "✏️ Edit Architect" : "➕ Add New Architect"}
              </h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: "#374151", fontSize: 15, fontWeight: 600, marginBottom: 14 }}>🏛️ Basic Information</h3>
                <div style={grid2}>
                  <div>
                    <label style={labelSt}>Architect Name *</label>
                    <FI {...field("name")} placeholder="e.g., Patil Designs" required />
                    {dupWarn && <p style={{ marginTop: 4, fontSize: 12, color: "#d97706", fontWeight: 500 }}>{dupWarn}</p>}
                  </div>
                  <div>
                    <label style={labelSt}>Mobile Number *</label>
                    <FI {...field("mobile")} placeholder="9876543210" required />
                    {mobileErr && <p style={{ marginTop: 4, fontSize: 12, color: "#ef4444", fontWeight: 500 }}>⚠️ {mobileErr}</p>}
                  </div>
                  <div>
                    <label style={labelSt}>Email Address</label>
                    <FI type="email" {...field("email")} placeholder="architect@example.com" />
                    {emailErr && <p style={{ marginTop: 4, fontSize: 12, color: "#ef4444", fontWeight: 500 }}>⚠️ {emailErr}</p>}
                  </div>
                  <div>
                    <label style={labelSt}>Date of Birth</label>
                    <FI type="date" {...field("dob")} />
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: "#374151", fontSize: 15, fontWeight: 600, marginBottom: 14 }}>📍 Address</h3>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelSt}>Full Address</label>
                  <FTA {...field("address")} placeholder="Street, Building, Area…" />
                </div>
                <div style={grid3}>
                  <div><label style={labelSt}>City</label><FI {...field("city")} placeholder="Pune" /></div>
                  <div><label style={labelSt}>State</label><FI {...field("state")} placeholder="Maharashtra" /></div>
                  <div><label style={labelSt}>Pincode</label><FI {...field("pincode")} placeholder="411001" maxLength="6" /></div>
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelSt}>📝 Notes (Optional)</label>
                <FTA {...field("notes")} placeholder="Any notes about this architect…" />
              </div>
              <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row", paddingTop: 14, borderTop: "1px solid #f1f5f9", justifyContent: "flex-end" }}>
                <Button type="button" variant="secondary" size="md" fullWidth={isMobile}
                  onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}>Cancel</Button>
                <Button type="submit" variant="success" size="md" fullWidth={isMobile}>
                  {editingId ? "Update Architect" : "Save Architect"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ textAlign: "center", color: "#64748b", padding: 40, backgroundColor: "#f8fafc", borderRadius: 12 }}>⏳ Loading architects…</div>
        ) : (
          <div style={{ backgroundColor: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
            <div style={{ padding: 20, borderBottom: "2px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
              <h3 style={{ margin: 0, color: "#1f2937", fontSize: 18, fontWeight: 600 }}>
                🏛️ Architect List ({architects.length})
              </h3>
            </div>
            {architects.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "#6b7280" }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🏛️</div>
                <p style={{ fontSize: 16, fontWeight: 500 }}>{searchQuery ? "No architects match your search" : "No architects yet"}</p>
              </div>
            ) : isMobile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12 }}>
                {architects.map(a => (
                  <div key={a.id} style={{ backgroundColor: "#fff", borderRadius: 12, padding: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", marginBottom: 6, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>🏛️ {a.name}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8, fontSize: 13 }}>
                      {a.mobile && <span style={{ color: "#4b5563" }}>📱 {a.mobile}</span>}
                      {a.email  && <span style={{ color: "#4b5563", wordBreak: "break-word" }}>📧 {a.email}</span>}
                      {(a.city || a.state) && <span style={{ color: "#4b5563" }}>📍 {[a.city, a.state].filter(Boolean).join(", ")}</span>}
                    </div>
                    {/* Compact icon-only action row — mobile only */}
                    <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
                      <button
                        title="View"
                        onClick={() => setViewId(a.id)}
                        style={{ width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", cursor: "pointer", fontSize: 16, padding: 0, flexShrink: 0, transition: "all 200ms ease" }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(37,99,235,0.18)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
                      >👁️</button>
                      <button
                        title="Edit"
                        onClick={() => openEdit(a)}
                        style={{ width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #fde68a", background: "#fffbeb", color: "#d97706", cursor: "pointer", fontSize: 16, padding: 0, flexShrink: 0, transition: "all 200ms ease" }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(217,119,6,0.18)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
                      >✏️</button>
                      <button
                        title="Delete"
                        onClick={() => setConfirmDel({ id: a.id, name: a.name })}
                        style={{ width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: 16, padding: 0, flexShrink: 0, transition: "all 200ms ease" }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(220,38,38,0.18)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
                      >🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f3f4f6" }}>
                      {["#", "Name", "Mobile", "Email", "City", "Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: h === "Actions" ? "center" : "left", color: "#374151", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {architects.map((a, idx) => (
                      <tr key={a.id} style={{ borderTop: "1px solid #e5e7eb", backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "#ffffff" : "#f9fafb"}>
                        <td style={{ padding: "9px 12px", color: "#94a3b8", fontSize: 13 }}>{String(a.id).padStart(3, "0")}</td>
                        <td style={{ padding: "9px 12px", fontWeight: 600, color: "#0f172a" }}>🏛️ {a.name}</td>
                        <td style={{ padding: "9px 12px", color: "#4b5563" }}>{a.mobile || "—"}</td>
                        <td style={{ padding: "9px 12px", color: "#4b5563" }}>{a.email || "—"}</td>
                        <td style={{ padding: "9px 12px", color: "#4b5563" }}>{a.city || "—"}</td>
                        <td style={{ padding: "7px 12px" }}>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <button title="View"   onClick={() => setViewId(a.id)}
                              style={ghostBtn()}
                              onMouseEnter={e => applyGhostHover(e, false)}
                              onMouseLeave={e => resetGhostHover(e)}>👁️</button>
                            <button title="Edit"   onClick={() => openEdit(a)}
                              style={ghostBtn()}
                              onMouseEnter={e => applyGhostHover(e, false)}
                              onMouseLeave={e => resetGhostHover(e)}>✏️</button>
                            <button title="Delete" onClick={() => setConfirmDel({ id: a.id, name: a.name })}
                              style={ghostBtn()}
                              onMouseEnter={e => applyGhostHover(e, true)}
                              onMouseLeave={e => resetGhostHover(e)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Detail modal with tabs */}
        {viewId && (
          <ArchitectDetailModal
            id={viewId}
            onClose={() => setViewId(null)}
            onEdit={a => { openEdit(a); }}
            isMobile={isMobile}
          />
        )}

        {/* Delete confirmation */}
        {confirmDelete && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex",
            alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", zIndex: 10010, padding: isMobile ? 0 : "20px" }}
            onClick={() => setConfirmDel(null)}>
            <div style={{ backgroundColor: "white", padding: isMobile ? "20px 16px" : 35, borderRadius: isMobile ? "20px 20px 0 0" : 16,
              maxWidth: isMobile ? "100%" : 480, width: "100%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
                <h2 style={{ margin: "0 0 10px", color: "#1f2937", fontSize: 22, fontWeight: 700 }}>Delete Architect?</h2>
                <p style={{ margin: 0, color: "#6b7280", fontSize: 14, lineHeight: 1.6 }}>
                  Delete <strong>"{confirmDelete.name}"</strong>? All related quotations and orders will lose this architect reference. This cannot be undone.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
                <Button variant="danger"    size="md" fullWidth onClick={() => handleDelete(confirmDelete.id)}>Delete</Button>
                <Button variant="secondary" size="md" fullWidth onClick={() => setConfirmDel(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

