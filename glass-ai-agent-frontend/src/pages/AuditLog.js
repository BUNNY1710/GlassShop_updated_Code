import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import api from "../api/api";
import PageWrapper from "../components/PageWrapper";
import "../styles/design-system.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 25;

const ACTION_STYLES = {
  ADD:      { bg: "rgba(55,227,165,0.15)",  color: "#37E3A5", dot: "#37E3A5" },
  REMOVE:   { bg: "rgba(255,107,129,0.15)", color: "#FF6B81", dot: "#FF6B81" },
  EDIT:     { bg: "rgba(79,93,255,0.15)",   color: "#818CF8", dot: "#818CF8" },
  TRANSFER: { bg: "rgba(255,185,94,0.15)",  color: "#FFB95E", dot: "#FFB95E" },
  ADD_REMNANT:      { bg: "rgba(255,159,64,0.18)",  color: "#FF9F40", dot: "#FF9F40" },
  OPTIMIZE_CONFIRM: { bg: "rgba(124,58,237,0.18)",  color: "#A78BFA", dot: "#A78BFA" },
  DELETE_STAND:     { bg: "rgba(255,107,129,0.15)", color: "#FF6B81", dot: "#FF6B81" },
  DELETE_GLASS_TYPE:  { bg: "rgba(255,107,129,0.15)", color: "#FF6B81", dot: "#FF6B81" },
  RESTORE_GLASS_TYPE: { bg: "rgba(55,227,165,0.15)",  color: "#37E3A5", dot: "#37E3A5" },
  STAFF_PERMISSION_UPDATED: { bg: "rgba(79,93,255,0.15)", color: "#818CF8", dot: "#818CF8" },
  CREATE_QUOTATION: { bg: "rgba(55,227,165,0.15)", color: "#37E3A5", dot: "#37E3A5" },
  EDIT_QUOTATION:   { bg: "rgba(79,93,255,0.15)",  color: "#818CF8", dot: "#818CF8" },
  DELETE_QUOTATION: { bg: "rgba(255,107,129,0.15)", color: "#FF6B81", dot: "#FF6B81" },
  CREATE_INVOICE:   { bg: "rgba(55,227,165,0.15)", color: "#37E3A5", dot: "#37E3A5" },
  ADD_STAND:        { bg: "rgba(55,227,165,0.15)", color: "#37E3A5", dot: "#37E3A5" },
  EDIT_STAND:       { bg: "rgba(79,93,255,0.15)",  color: "#818CF8", dot: "#818CF8" },
  DISABLE_STAND:    { bg: "rgba(255,185,94,0.15)", color: "#FFB95E", dot: "#FFB95E" },
  ADD_GLASS_TYPE:   { bg: "rgba(55,227,165,0.15)", color: "#37E3A5", dot: "#37E3A5" },
  EDIT_GLASS_TYPE:  { bg: "rgba(79,93,255,0.15)",  color: "#818CF8", dot: "#818CF8" },
  CREATE_STAFF:     { bg: "rgba(55,227,165,0.15)", color: "#37E3A5", dot: "#37E3A5" },
  USER_LOGIN:       { bg: "rgba(113,128,166,0.15)", color: "#A9B3D1", dot: "#7180A6" },
  USER_LOGOUT:      { bg: "rgba(113,128,166,0.15)", color: "#A9B3D1", dot: "#7180A6" },
  CREATE:   { bg: "rgba(79,93,255,0.15)",   color: "#818CF8", dot: "#818CF8" },
  DELETE:   { bg: "rgba(255,107,129,0.15)", color: "#FF6B81", dot: "#FF6B81" },
  APPROVE:  { bg: "rgba(55,227,165,0.15)",  color: "#37E3A5", dot: "#37E3A5" },
  REJECT:   { bg: "rgba(255,107,129,0.15)", color: "#FF6B81", dot: "#FF6B81" },
};

const AVATAR_PALETTE = [
  "#4F5DFF", "#0284c7", "#37E3A5", "#FFB95E",
  "#FF6B81", "#7c3aed", "#0891b2", "#059669",
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function avatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function formatIST(ts) {
  if (!ts) return "N/A";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "Invalid";
    const f = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit",
      year: "numeric", hour: "2-digit", minute: "2-digit",
      second: "2-digit", hour12: false,
    });
    return f.format(d).replace(",", "") + " IST";
  } catch { return "N/A"; }
}

function formatDate(ts) {
  if (!ts) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric",
    }).format(new Date(ts));
  } catch { return ""; }
}

function formatTime(ts) {
  if (!ts) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
    }).format(new Date(ts));
  } catch { return ""; }
}

function formatDateGroupLabel(ts) {
  if (!ts) return "Unknown";
  try {
    const d   = new Date(ts);
    const now = new Date();
    const yest = new Date(now); yest.setDate(yest.getDate() - 1);
    if (d.toDateString() === now.toDateString())  return "Today";
    if (d.toDateString() === yest.toDateString()) return "Yesterday";
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata", weekday: "short", day: "numeric",
      month: "short", year: "numeric",
    }).format(d);
  } catch { return "Unknown"; }
}

function isToday(ts) {
  try { return new Date(ts).toDateString() === new Date().toDateString(); }
  catch { return false; }
}

function buildDescription(log) {
  // A stored free-text description (e.g. permission changes) wins over derived text.
  if (log.details) return log.details;
  const glass = [log.glassType, log.thickness ? `${+log.thickness}MM` : ""].filter(Boolean).join(" ");
  const size  = log.height && log.width
    ? `${log.height}×${log.width} ${log.unit || "MM"}`
    : "";
  const qty   = log.quantity
    ? `${log.quantity} unit${+log.quantity !== 1 ? "s" : ""}`
    : "";

  switch ((log.action || "").toUpperCase()) {
    case "ADD":
      return `Added ${qty} of ${glass}${size ? ` (${size})` : ""} to Stand #${log.standNo || "?"}`;
    case "REMOVE":
      return `Removed ${qty} of ${glass}${size ? ` (${size})` : ""} from Stand #${log.standNo || "?"}`;
    case "EDIT":
      return `Updated ${glass}${size ? ` · ${size}` : ""}${log.standNo ? ` at Stand #${log.standNo}` : ""}`;
    case "TRANSFER":
      return `Transferred ${qty} of ${glass} · Stand #${log.fromStand || "?"} → Stand #${log.toStand || "?"}`;
    case "ADD_REMNANT":
      return `Added remnant stock ${glass}${size ? ` (${size})` : ""} to Stand #${log.standNo || "?"}`;
    case "OPTIMIZE_CONFIRM":
      return glass
        ? `Optimization confirmed · ${qty} of ${glass}${size ? ` (${size})` : ""} from Stand #${log.standNo || "?"}`
        : "Optimization confirmed";
    case "DELETE_STAND": {
      if (!log.toStand) return `Deleted Stand #${log.fromStand || log.standNo || "?"}`;
      const what = glass
        ? `${qty || "0 units"} of ${glass}${size ? ` (${size})` : ""}`
        : (qty || "0 units");
      return `Transferred ${what} from Stand #${log.fromStand} to Stand #${log.toStand}, then deleted Stand #${log.fromStand}`;
    }
    case "DELETE_GLASS_TYPE":
      return `Deleted Glass Type “${log.glassType || "?"}”${log.quantity ? ` · ${log.quantity} record${+log.quantity !== 1 ? "s" : ""} referenced` : ""}`;
    case "RESTORE_GLASS_TYPE":
      return `Restored Glass Type “${log.glassType || "?"}” within the undo window`;
    default:
      return `${log.action || "Action"}${glass ? ` on ${glass}` : ""}${size ? ` (${size})` : ""}`;
  }
}

// ─── Export helpers ───────────────────────────────────────────────────────────
function exportCSV(logs) {
  const H  = ["Time (IST)", "User", "Role", "Action", "Glass", "Size", "Qty", "Stand / Route"];
  const rows = logs.map(l => [
    formatIST(l.timestamp),
    l.username || "",
    l.role === "ROLE_ADMIN" ? "Admin" : "Staff",
    l.action || "",
    l.glassType || "",
    l.height && l.width ? `${l.height}×${l.width} ${l.unit || "MM"}` : "",
    l.quantity || "",
    ["TRANSFER","DELETE_STAND"].includes(l.action) ? `${l.fromStand}→${l.toStand}` : (l.standNo || ""),
  ]);
  const csv  = [H, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printLogs(logs) {
  const rows = logs.map(l => `
    <tr>
      <td>${formatIST(l.timestamp)}</td>
      <td>${l.username || ""}</td>
      <td><b>${l.action || ""}</b></td>
      <td>${buildDescription(l)}</td>
      <td>${l.glassType || ""}${l.height && l.width ? ` (${l.height}×${l.width} ${l.unit || "MM"})` : ""}</td>
      <td>${l.action === "TRANSFER" ? `${l.fromStand}→${l.toStand}` : (l.standNo || "")}</td>
    </tr>`).join("");
  const w = window.open("", "_blank", "width=1000,height=700");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Audit Log</title><style>
    *{box-sizing:border-box}body{font-family:Inter,sans-serif;font-size:12px;color:#111;padding:24px}
    h2{margin-bottom:16px;font-size:18px}table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #e2e8f0;padding:7px 10px;text-align:left;vertical-align:top}
    th{background:#f8fafc;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
    tr:nth-child(even){background:#fafbfd}@media print{body{padding:0}}
  </style></head><body>
  <h2>Audit Log — ${new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST</h2>
  <table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Description</th><th>Glass / Size</th><th>Stand</th></tr></thead>
  <tbody>${rows}</tbody></table></body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

// ─── Debounce ─────────────────────────────────────────────────────────────────
function useDebounce(value, ms = 300) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return dv;
}

// ─── Reusable small components (defined at module level to stay stable) ────────

function ActionBadge({ action }) {
  const s = ACTION_STYLES[(action || "").toUpperCase()] || { bg: "rgba(113,128,166,0.15)", color: "#7180A6", dot: "#7180A6" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 8px", borderRadius: 999,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
      letterSpacing: "0.03em", fontFamily: "'Inter',sans-serif",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {(action || "").toUpperCase()}
    </span>
  );
}

function UserCell({ username, role }) {
  const color   = avatarColor(username);
  const initial = (username || "?").charAt(0).toUpperCase();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: color, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#fff",
      }}>
        {initial}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", lineHeight: 1.2 }}>
          {username || "Unknown"}
        </div>
        <div style={{ fontSize: 10.5, color: "#7180A6" }}>
          {role === "ROLE_ADMIN" ? "Admin" : "Staff"}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color = "#4F5DFF", loading }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px", background: "rgba(17,27,53,0.9)",
      borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
      fontFamily: "'Inter',sans-serif", minWidth: 0,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 15, background: `${color}22`, color,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
          {label}
        </div>
        {loading
          ? <div style={{ height: 18, width: 48, borderRadius: 4, background: "rgba(255,255,255,0.08)" }} />
          : <div style={{ fontSize: 19, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </div>
        }
      </div>
    </div>
  );
}

function PageBtn({ label, onClick, disabled, active }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "5px 10px", borderRadius: 7,
        border: active ? "none" : "1px solid rgba(255,255,255,0.08)",
        background: active ? "#4F5DFF" : (hov && !disabled) ? "rgba(255,255,255,0.06)" : "rgba(17,27,53,0.9)",
        color: active ? "#fff" : disabled ? "#7180A6" : hov ? "#FFFFFF" : "#A9B3D1",
        fontSize: 12.5, fontWeight: active ? 700 : 500,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'Inter',sans-serif", transition: "all 120ms ease",
      }}
    >
      {label}
    </button>
  );
}

function DropMenu({ dropRef, open, setOpen, value, setValue, options, placeholder, icon }) {
  const itemStyle = (active) => ({
    display: "block", width: "100%",
    padding: "8px 14px",
    background: active ? "rgba(79,93,255,0.15)" : "transparent",
    border: "none", textAlign: "left",
    color: active ? "#818CF8" : "#A9B3D1",
    fontSize: 13, fontWeight: active ? 600 : 400,
    cursor: "pointer", fontFamily: "'Inter',sans-serif",
    transition: "background 100ms ease",
  });

  return (
    <div ref={dropRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 12px", borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.08)",
          background: value ? "rgba(79,93,255,0.15)" : "rgba(255,255,255,0.06)",
          color: value ? "#818CF8" : "#A9B3D1",
          fontSize: 13, fontWeight: 500, cursor: "pointer",
          fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap",
          transition: "all 140ms ease",
        }}
      >
        {icon} {value || placeholder}
        <span style={{ fontSize: 9, color: "#7180A6", marginLeft: 2 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          minWidth: 170, background: "rgba(17,27,53,0.98)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          zIndex: 1000, overflow: "hidden",
        }}>
          <button
            onClick={() => { setValue(""); setOpen(false); }}
            style={itemStyle(!value)}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = !value ? "rgba(79,93,255,0.15)" : "transparent"}
          >
            All {placeholder}
          </button>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { setValue(opt); setOpen(false); }}
              style={itemStyle(value === opt)}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = value === opt ? "rgba(79,93,255,0.15)" : "transparent"}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TableRow({ log, idx }) {
  const [hov, setHov] = useState(false);
  const standInfo = ["TRANSFER", "DELETE_STAND"].includes(log.action)
    ? `#${log.fromStand} → #${log.toStand}`
    : log.standNo ? `#${log.standNo}` : "—";

  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: hov ? "#0A0F1E" : "#111B35", transition: "background 100ms ease" }}
    >
      {/* Date / Time */}
      <td style={TD}>
        <div style={{ fontSize: 12.5, color: "#E2E8F0", fontWeight: 500, whiteSpace: "nowrap" }}>
          {formatDate(log.timestamp)}
        </div>
        <div style={{ fontSize: 11, color: "#7180A6", marginTop: 1 }}>
          {formatTime(log.timestamp)} IST
        </div>
      </td>
      {/* User */}
      <td style={TD}>
        <UserCell username={log.username} role={log.role} />
      </td>
      {/* Action */}
      <td style={TD}>
        <ActionBadge action={log.action} />
      </td>
      {/* Description */}
      <td style={{ ...TD, maxWidth: 320 }}>
        <div style={{ fontSize: 13, color: "#A9B3D1", lineHeight: 1.45 }}>
          {buildDescription(log)}
        </div>
      </td>
      {/* Glass / Size */}
      <td style={TD}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#E2E8F0", whiteSpace: "nowrap" }}>
          {log.glassType || "—"}
        </div>
        {log.height && log.width && (
          <div style={{ fontSize: 11, color: "#7180A6", marginTop: 1 }}>
            {log.height}×{log.width} {log.unit || "MM"}
          </div>
        )}
      </td>
      {/* Stand */}
      <td style={TD}>
        <span style={{ fontSize: 12.5, color: "#818CF8", fontWeight: 700 }}>
          {standInfo}
        </span>
      </td>
    </tr>
  );
}

const TD = {
  padding: "9px 14px",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  verticalAlign: "middle",
  fontFamily: "'Inter',sans-serif",
};

function TimelineItem({ log, last }) {
  const color = avatarColor(log.username);
  const s     = ACTION_STYLES[(log.action || "").toUpperCase()] || { bg: "rgba(113,128,166,0.15)", color: "#7180A6", dot: "#7180A6" };

  return (
    <div style={{ display: "flex", gap: 12, paddingBottom: last ? 0 : 14, position: "relative" }}>
      {!last && (
        <div style={{ position: "absolute", left: 15, top: 30, bottom: 0, width: 1, background: "rgba(255,255,255,0.06)" }} />
      )}
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: color, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", zIndex: 1,
      }}>
        {(log.username || "?").charAt(0).toUpperCase()}
      </div>
      {/* Card */}
      <div style={{
        flex: 1, background: "rgba(17,27,53,0.9)", borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)", padding: "10px 14px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>
            {log.username || "Unknown"}
          </span>
          <ActionBadge action={log.action} />
          <span style={{ fontSize: 11.5, color: "#7180A6", marginLeft: "auto" }}>
            {formatTime(log.timestamp)} IST
          </span>
        </div>
        <p style={{ fontSize: 13, color: "#A9B3D1", margin: "0 0 4px", lineHeight: 1.5 }}>
          {buildDescription(log)}
        </p>
        {log.height && log.width && (
          <span style={{ fontSize: 11, color: "#7180A6" }}>
            {log.height}×{log.width} {log.unit || "MM"} · {log.role === "ROLE_ADMIN" ? "Admin" : "Staff"}
          </span>
        )}
      </div>
    </div>
  );
}

function MobileCard({ log }) {
  const color     = avatarColor(log.username);
  const standInfo = ["TRANSFER", "DELETE_STAND"].includes(log.action)
    ? `Stand #${log.fromStand} → #${log.toStand}`
    : log.standNo ? `Stand #${log.standNo}` : "";

  return (
    <div style={{
      background: "rgba(17,27,53,0.9)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
      padding: "12px 14px", boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: color, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff",
        }}>
          {(log.username || "?").charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>{log.username || "Unknown"}</div>
          <div style={{ fontSize: 10.5, color: "#7180A6" }}>
            {log.role === "ROLE_ADMIN" ? "Administrator" : "Staff"}
          </div>
        </div>
        <ActionBadge action={log.action} />
      </div>
      <p style={{ fontSize: 13, color: "#A9B3D1", margin: "0 0 6px", lineHeight: 1.5 }}>
        {buildDescription(log)}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
        {standInfo && <span style={{ fontSize: 11.5, color: "#A9B3D1" }}>{standInfo}</span>}
        <span style={{ fontSize: 11, color: "#7180A6" }}>{formatIST(log.timestamp)}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
function AuditLogs() {
  const [logs, setLogs]         = useState([]);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Filters
  const [search, setSearch]           = useState("");
  const [filterUser, setFilterUser]   = useState("");
  const [filterAction, setFilterAction] = useState("");

  // View + pagination
  const [view, setView] = useState("table");
  const [page, setPage] = useState(1);

  // Dropdown refs
  const userDropRef   = useRef(null);
  const actionDropRef = useRef(null);
  const exportDropRef = useRef(null);
  const exportMenuRef = useRef(null);
  const [userDropOpen,   setUserDropOpen]   = useState(false);
  const [actionDropOpen, setActionDropOpen] = useState(false);
  const [exportDropOpen, setExportDropOpen] = useState(false);
  const [exportMenuPos,  setExportMenuPos]  = useState({ top: 0, left: 0 });

  const dSearch = useDebounce(search, 280);

  // ── Load ──
  useEffect(() => {
    setLoading(true);
    api.get("/api/audit/recent")
      .then(res => { setLogs(res.data || []); setLoading(false); })
      .catch(err => {
        setError(err.response?.status === 403
          ? "You are not authorized to view audit logs."
          : "Failed to load audit logs.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const r = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e) => {
      if (userDropRef.current   && !userDropRef.current.contains(e.target))   setUserDropOpen(false);
      if (actionDropRef.current && !actionDropRef.current.contains(e.target)) setActionDropOpen(false);
      const inExportTrigger = exportDropRef.current?.contains(e.target);
      const inExportMenu    = exportMenuRef.current?.contains(e.target);
      if (!inExportTrigger && !inExportMenu) setExportDropOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Computed stats ──
  const todayCount    = useMemo(() => logs.filter(l => isToday(l.timestamp)).length, [logs]);
  const stockCount    = useMemo(() => logs.filter(l => ["ADD","REMOVE","EDIT","TRANSFER"].includes((l.action||"").toUpperCase())).length, [logs]);
  const transferCount = useMemo(() => logs.filter(l => (l.action||"").toUpperCase() === "TRANSFER").length, [logs]);

  // ── Unique filter options ──
  const users   = useMemo(() => [...new Set(logs.map(l => l.username).filter(Boolean))].sort(), [logs]);
  const actions = useMemo(() => [...new Set(logs.map(l => l.action).filter(Boolean))].sort(), [logs]);

  // ── Filtered logs ──
  const filteredLogs = useMemo(() => {
    let r = logs;
    if (dSearch) {
      const q = dSearch.toLowerCase();
      r = r.filter(l =>
        (l.username  || "").toLowerCase().includes(q) ||
        (l.action    || "").toLowerCase().includes(q) ||
        (l.glassType || "").toLowerCase().includes(q) ||
        buildDescription(l).toLowerCase().includes(q)
      );
    }
    if (filterUser)   r = r.filter(l => l.username === filterUser);
    if (filterAction) r = r.filter(l => (l.action || "").toUpperCase() === filterAction);
    return r;
  }, [logs, dSearch, filterUser, filterAction]);

  useEffect(() => setPage(1), [dSearch, filterUser, filterAction]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pagedLogs  = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Timeline groups ──
  const timelineGroups = useMemo(() => {
    const groups = {};
    filteredLogs.forEach(l => {
      try {
        const key = new Date(l.timestamp).toDateString();
        if (!groups[key]) groups[key] = { label: formatDateGroupLabel(l.timestamp), ts: l.timestamp, items: [] };
        groups[key].items.push(l);
      } catch {}
    });
    return Object.values(groups).sort((a, b) => new Date(b.ts) - new Date(a.ts));
  }, [filteredLogs]);

  const hasFilters  = search || filterUser || filterAction;
  const resetFilters = () => { setSearch(""); setFilterUser(""); setFilterAction(""); };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <div style={{ padding: "16px 16px 24px", minHeight: "100vh", maxWidth: 1400, margin: "0 auto", fontFamily: "'Inter',-apple-system,sans-serif" }}>

        {/* ── Page header ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          marginBottom: 20, flexWrap: "wrap", gap: 12,
        }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", margin: "0 0 4px" }}>
              Audit Log
            </h1>
            <p style={{ fontSize: 13, color: "#A9B3D1", margin: 0 }}>
              Complete activity history
            </p>
          </div>

          {/* Export dropdown — Portal-rendered to avoid overflow clipping */}
          <div ref={exportDropRef} style={{ display: "inline-block" }}>
            <button
              onClick={() => {
                if (!exportDropOpen && exportDropRef.current) {
                  const r = exportDropRef.current.getBoundingClientRect();
                  const vw = window.innerWidth;
                  const vh = window.innerHeight;
                  const estW = 170; const estH = 2 * 44 + 8;
                  let left = r.right - estW;
                  left = Math.max(8, Math.min(left, vw - estW - 8));
                  let top = r.bottom + 4;
                  if (top + estH > vh - 8) top = Math.max(8, r.top - estH - 4);
                  setExportMenuPos({ top, left });
                }
                setExportDropOpen(v => !v);
              }}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "7px 14px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)", background: exportDropOpen ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.06)",
                color: "#A9B3D1", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Inter',sans-serif",
                boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                transition: "all 140ms ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = exportDropOpen ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              ⬇ Export <span style={{ fontSize: 9, color: "#7180A6" }}>▾</span>
            </button>
            {exportDropOpen && createPortal(
              <div ref={exportMenuRef} style={{
                position: "fixed", top: exportMenuPos.top, left: exportMenuPos.left,
                minWidth: 170, maxWidth: "90vw", background: "rgba(17,27,53,0.98)",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)", zIndex: 99999, overflow: "hidden",
              }}>
                {[
                  { icon: "📊", label: "Export CSV",  fn: () => { exportCSV(filteredLogs); setExportDropOpen(false); } },
                  { icon: "🖨️", label: "Print Log",   fn: () => { printLogs(filteredLogs); setExportDropOpen(false); } },
                ].map(it => (
                  <button
                    key={it.label}
                    onClick={it.fn}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "10px 14px", background: "transparent", border: "none",
                      textAlign: "left", cursor: "pointer", fontSize: 13, color: "#A9B3D1",
                      fontFamily: "'Inter',sans-serif", transition: "background 100ms ease",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span>{it.icon}</span> {it.label}
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)",
          gap: 10, marginBottom: 16,
        }}>
          <KpiCard icon="📅" label="Today's Activity" value={loading ? "—" : todayCount}    color="#4F5DFF" loading={loading} />
          <KpiCard icon="📋" label="Total Logs"        value={loading ? "—" : logs.length}   color="#4F5DFF" loading={loading} />
          <KpiCard icon="📦" label="Stock Changes"     value={loading ? "—" : stockCount}    color="#37E3A5" loading={loading} />
          <KpiCard icon="🔄" label="Transfers"         value={loading ? "—" : transferCount} color="#818CF8" loading={loading} />
        </div>

        {/* ── Filter bar ── */}
        <div style={{
          background: "rgba(17,27,53,0.9)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
          padding: "10px 14px", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
        }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
            <span style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              fontSize: 13, color: "#7180A6", pointerEvents: "none",
            }}>
              🔍
            </span>
            <input
              placeholder="Search users, actions, glass types…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "7px 10px 7px 32px",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
                fontSize: 13, fontFamily: "'Inter',sans-serif",
                color: "#FFFFFF", background: "rgba(255,255,255,0.06)", outline: "none",
                transition: "border-color 150ms ease, box-shadow 150ms ease, background 150ms ease",
              }}
              onFocus={e => {
                e.target.style.borderColor = "#4F5DFF";
                e.target.style.boxShadow   = "0 0 0 3px rgba(79,93,255,0.2)";
                e.target.style.background  = "rgba(255,255,255,0.08)";
              }}
              onBlur={e => {
                e.target.style.borderColor = "rgba(255,255,255,0.08)";
                e.target.style.boxShadow   = "none";
                e.target.style.background  = "rgba(255,255,255,0.06)";
              }}
            />
          </div>

          <DropMenu dropRef={userDropRef}   open={userDropOpen}   setOpen={setUserDropOpen}
            value={filterUser}   setValue={setFilterUser}   options={users}   placeholder="All Users"   icon="👤" />
          <DropMenu dropRef={actionDropRef} open={actionDropOpen} setOpen={setActionDropOpen}
            value={filterAction} setValue={setFilterAction} options={actions} placeholder="All Actions" icon="⚡" />

          {hasFilters && (
            <button
              onClick={resetFilters}
              style={{
                padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(255,107,129,0.3)",
                background: "rgba(255,107,129,0.1)", color: "#FF6B81", fontSize: 12.5, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Inter',sans-serif", transition: "all 140ms ease",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,107,129,0.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,107,129,0.1)"}
            >
              ✕ Reset
            </button>
          )}

          {/* View toggle */}
          <div style={{
            marginLeft: "auto", display: "flex",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, overflow: "hidden",
          }}>
            {[
              { id: "table",    label: "⊟ Table" },
              { id: "timeline", label: "≡ Timeline" },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                style={{
                  padding: "6px 12px", border: "none", cursor: "pointer",
                  background: view === v.id ? "#4F5DFF" : "rgba(255,255,255,0.06)",
                  color: view === v.id ? "#fff" : "#A9B3D1",
                  fontSize: 12.5, fontWeight: 600,
                  fontFamily: "'Inter',sans-serif", transition: "all 140ms ease",
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            background: "rgba(255,107,129,0.1)", border: "1px solid rgba(255,107,129,0.3)", borderRadius: 10,
            padding: "40px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🚫</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#FF6B81", margin: "0 0 6px" }}>{error}</p>
            <p style={{ fontSize: 13, color: "#A9B3D1", margin: 0 }}>Contact your administrator if this persists.</p>
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {!error && loading && (
          <div style={{ background: "rgba(17,27,53,0.9)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                display: "flex", gap: 14, padding: "11px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.05)", alignItems: "center",
              }}>
                <div style={{ width: 52, height: 12, borderRadius: 4, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
                <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: "28%", height: 12, borderRadius: 4, background: "rgba(255,255,255,0.08)", marginBottom: 5 }} />
                  <div style={{ width: "55%", height: 11, borderRadius: 4, background: "rgba(255,255,255,0.06)" }} />
                </div>
                <div style={{ width: 56, height: 18, borderRadius: 999, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty ── */}
        {!error && !loading && filteredLogs.length === 0 && (
          <div style={{
            background: "rgba(17,27,53,0.9)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
            padding: "64px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.3 }}>📋</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#A9B3D1", margin: "0 0 6px" }}>
              {hasFilters ? "No matching activities" : "No activity logs found"}
            </p>
            <p style={{ fontSize: 13, color: "#7180A6", margin: "0 0 18px" }}>
              {hasFilters
                ? "Try adjusting your search or filters."
                : "Stock activity will appear here once your team starts making changes."}
            </p>
            {hasFilters && (
              <button
                onClick={resetFilters}
                style={{
                  padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(79,93,255,0.15)", color: "#818CF8", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'Inter',sans-serif",
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* ── TABLE VIEW (desktop) ── */}
        {!error && !loading && filteredLogs.length > 0 && view === "table" && !isMobile && (
          <div style={{
            background: "#111B35", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Inter',sans-serif", background: "#111B35" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1.5px solid rgba(255,255,255,0.08)" }}>
                  {["Date & Time", "User", "Action", "Description", "Glass / Size", "Stand"].map(h => (
                    <th key={h} style={{
                      padding: "9px 14px", textAlign: "left",
                      fontSize: 10.5, fontWeight: 700, color: "#7180A6",
                      textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedLogs.map((log, i) => (
                  <TableRow key={i} log={log} idx={i} />
                ))}
              </tbody>
            </table>

            {/* Table footer */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(255,255,255,0.02)", flexWrap: "wrap", gap: 8,
            }}>
              <span style={{ fontSize: 12.5, color: "#7180A6" }}>
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, filteredLogs.length)}–{Math.min(page * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length.toLocaleString()} entries
              </span>
              {totalPages > 1 && (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <PageBtn label="← Prev" disabled={page === 1}          onClick={() => setPage(p => p - 1)} />
                  {Array.from({ length: totalPages }, (_, i) => i + 1).filter(pg =>
                    pg === 1 || pg === totalPages || Math.abs(pg - page) <= 1
                  ).reduce((acc, pg, idx, arr) => {
                    if (idx > 0 && pg - arr[idx - 1] > 1) acc.push("...");
                    acc.push(pg);
                    return acc;
                  }, []).map((pg, i) =>
                    pg === "..." ? (
                      <span key={`e${i}`} style={{ padding: "0 2px", color: "#7180A6", fontSize: 13 }}>…</span>
                    ) : (
                      <PageBtn key={pg} label={pg} active={pg === page} onClick={() => setPage(pg)} />
                    )
                  )}
                  <PageBtn label="Next →" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TABLE VIEW (mobile cards) ── */}
        {!error && !loading && filteredLogs.length > 0 && view === "table" && isMobile && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pagedLogs.map((log, i) => <MobileCard key={i} log={log} />)}
            </div>
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14, alignItems: "center" }}>
                <PageBtn label="← Prev" disabled={page === 1}          onClick={() => setPage(p => p - 1)} />
                <span style={{ fontSize: 13, color: "#A9B3D1" }}>{page} / {totalPages}</span>
                <PageBtn label="Next →" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} />
              </div>
            )}
          </>
        )}

        {/* ── TIMELINE VIEW ── */}
        {!error && !loading && filteredLogs.length > 0 && view === "timeline" && (
          <div>
            {timelineGroups.map((group, gi) => (
              <div key={gi} style={{ marginBottom: 24 }}>
                {/* Date label */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{
                    fontSize: 11.5, fontWeight: 700, color: "#A9B3D1",
                    textTransform: "uppercase", letterSpacing: "0.07em",
                    padding: "2px 10px", background: "rgba(255,255,255,0.06)", borderRadius: 6,
                    whiteSpace: "nowrap",
                  }}>
                    {group.label}
                  </span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                  <span style={{ fontSize: 11.5, color: "#7180A6", whiteSpace: "nowrap" }}>
                    {group.items.length} event{group.items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {/* Events */}
                <div style={{ paddingLeft: 8 }}>
                  {group.items.map((log, i) => (
                    <TimelineItem key={i} log={log} last={i === group.items.length - 1} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </PageWrapper>
  );
}

export default AuditLogs;
