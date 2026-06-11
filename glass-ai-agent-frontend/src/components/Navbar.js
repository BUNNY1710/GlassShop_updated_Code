import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { hasPermission, hasAnyPermission, isAdmin } from "../utils/permissions";
import api from "../api/api";

function getUsername() {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) return "User";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || payload.username || "User";
  } catch {
    return "User";
  }
}

const SIDEBAR_W = 240;

/* ── SVG Icon system ─────────────────────────────────────────────────────── */
function NavIcon({ d, size = 14 }) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, display: "block" }}
    >
      {paths.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}

const IC = {
  dashboard:    ["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", "M9 22V12h6v10"],
  stock_view:   ["M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z", "M3.27 6.96L12 12.01l8.73-5.05", "M12 22.08V12"],
  stock_manage: ["M12 5v14", "M5 12h14"],
  transfer:     ["M7 16V4m0 0L3 8m4-4l4 4", "M17 8v12m0 0l4-4m-4 4l-4-4"],
  customers:    ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 7a4 4 0 100 8 4 4 0 000-8z", "M23 21v-2a4 4 0 00-3-3.87", "M16 3.13a4 4 0 010 7.75"],
  architects:   ["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", "M9 22V12h6v10"],
  quotations:   ["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z", "M14 2v6h6", "M16 13H8", "M16 17H8", "M10 9H8"],
  invoices:     ["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z", "M14 2v6h6", "M12 18v-6", "M9 15h6"],
  optimization: ["M12 2L2 7l10 5 10-5-10-5z", "M2 17l10 5 10-5", "M2 12l10 5 10-5"],
  price_master: ["M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z", "M7 7h.01"],
  ai:           ["M12 2a2 2 0 00-2 2v2M12 2a2 2 0 012 2v2M8 6H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-4", "M8 10h.01M12 10h.01M16 10h.01M8 14h8"],
  audit:        ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
  staff:        ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 7a4 4 0 100 8 4 4 0 000-8z"],
  profile:      ["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2", "M12 3a4 4 0 100 8 4 4 0 000-8z"],
  logout:       ["M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  quotation_s:  ["M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2", "M13 3H11a2 2 0 00-2 2v0a2 2 0 002 2h2a2 2 0 002-2v0a2 2 0 00-2-2z", "M9 12h6M9 16h6"],
  menu:         ["M3 12h18", "M3 6h18", "M3 18h18"],
  x:            ["M18 6L6 18", "M6 6l12 12"],
  chevron_down: "M6 9l6 6 6-6",
  chevron_up:   "M18 15l-6-6-6 6",
  settings:     ["M12 15a3 3 0 100-6 3 3 0 000 6z", "M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"],
  search:       ["M21 21l-4.35-4.35", "M17 11A6 6 0 105 11a6 6 0 0012 0z"],
};

/* ── Bottom nav icons ────────────────────────────────────────────────────── */
const BOTTOM_NAV_ICONS = {
  dashboard:  ["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z","M9 22V12h6v10"],
  inventory:  ["M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z","M3.27 6.96L12 12.01l8.73-5.05","M12 22.08V12"],
  invoices:   ["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z","M14 2v6h6","M12 18v-6","M9 15h6"],
  quotations: ["M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2","M13 3H11a2 2 0 00-2 2v0a2 2 0 002 2h2a2 2 0 002-2v0a2 2 0 00-2-2z","M9 12h6M9 16h6"],
  profile:    ["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2","M12 3a4 4 0 100 8 4 4 0 000-8z"],
};

/* ── Section label ───────────────────────────────────────────────────────── */
function Section({ label }) {
  return (
    <div style={{
      fontSize: "10px",
      fontWeight: 700,
      color: "rgba(255,255,255,0.38)",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      padding: "0 14px",
      marginTop: 24,
      marginBottom: 5,
      fontFamily: "'Inter',-apple-system,sans-serif",
      userSelect: "none",
    }}>
      {label}
    </div>
  );
}

/* ── Nav item ────────────────────────────────────────────────────────────── */
function Item({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "8px 12px",
        borderRadius: 10,
        textDecoration: "none",
        fontSize: 13.5,
        fontWeight: isActive ? 700 : 600,
        color: isActive ? "#ffffff" : "rgba(255,255,255,0.65)",
        background: isActive ? "rgba(79,93,255,0.22)" : "transparent",
        borderLeft: isActive ? "3px solid #4F5DFF" : "3px solid transparent",
        transition: "all 130ms ease",
        fontFamily: "'Inter',-apple-system,sans-serif",
        userSelect: "none",
        lineHeight: 1,
        letterSpacing: isActive ? "-0.01em" : "normal",
      })}
      onMouseEnter={(e) => {
        const active = e.currentTarget.getAttribute("aria-current") === "page";
        if (!active) {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          e.currentTarget.style.color = "#ffffff";
        }
      }}
      onMouseLeave={(e) => {
        const active = e.currentTarget.getAttribute("aria-current") === "page";
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "rgba(255,255,255,0.65)";
        }
      }}
    >
      <span style={{ color: "currentColor", display: "flex", alignItems: "center", flexShrink: 0 }}>
        <NavIcon d={icon} size={15} />
      </span>
      <span style={{ lineHeight: 1.3 }}>{label}</span>
    </NavLink>
  );
}

/* ── Logout modal (portal) ───────────────────────────────────────────────── */
function LogoutModal({ onConfirm, onCancel }) {
  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,11,31,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: 16,
        backdropFilter: "blur(8px)",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "rgba(17,27,53,0.98)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 360,
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          padding: 24,
          animation: "scaleIn 200ms cubic-bezier(0.4,0,0.2,1) both",
          fontFamily: "'Inter',-apple-system,sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            margin: "0 auto 14px",
            background: "rgba(255,107,129,0.15)",
            border: "1px solid rgba(255,107,129,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FF6B81",
          }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 6, letterSpacing: "-0.02em" }}>
            Sign out?
          </div>
          <div style={{ fontSize: 13.5, color: "#A9B3D1", lineHeight: 1.5 }}>
            You'll need to sign in again to access your account.
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.08)",
              color: "#A9B3D1",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 140ms ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#A9B3D1"; }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 10,
              border: "none",
              background: "#FF6B81",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 140ms ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#E8506A"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#FF6B81"; }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Profile area (bottom of sidebar) ───────────────────────────────────── */
function ProfileArea({ username, role, onNavClick }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen]     = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const handleLogout = () => {
    api.post("/api/auth/logout").catch(() => {}); // audit, best-effort
    sessionStorage.clear();
    navigate("/login");
  };

  const go = (path) => {
    setMenuOpen(false);
    onNavClick?.();
    navigate(path);
  };

  const menuItem = (iconPaths, label, onClick, danger = false) => (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "8px 12px",
        background: "transparent",
        border: "none",
        borderRadius: 7,
        textAlign: "left",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 9,
        color: danger ? "#FF6B81" : "#A9B3D1",
        fontFamily: "'Inter',-apple-system,sans-serif",
        transition: "background 120ms ease, color 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.07)";
        if (danger) e.currentTarget.style.color = "#ff8fa0";
        else e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = danger ? "#FF6B81" : "#A9B3D1";
      }}
    >
      <span style={{ display: "flex", alignItems: "center", flexShrink: 0, opacity: danger ? 0.9 : 0.7 }}>
        <NavIcon d={iconPaths} size={13} />
      </span>
      {label}
    </button>
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Profile trigger */}
      <button
        onClick={() => setMenuOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "8px 10px",
          background: menuOpen ? "rgba(255,255,255,0.07)" : "transparent",
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          transition: "background 140ms ease",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          if (!menuOpen) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        }}
        onMouseLeave={(e) => {
          if (!menuOpen) e.currentTarget.style.background = "transparent";
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          flexShrink: 0,
          background: "rgba(79,93,255,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "#4F5DFF",
          letterSpacing: "-0.02em",
          border: "1px solid rgba(79,93,255,0.3)",
        }}>
          {username.charAt(0).toUpperCase()}
        </div>

        {/* Name & role */}
        <div style={{ flex: 1, overflow: "hidden", textAlign: "left" }}>
          <div style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "#e2e8f0",
            letterSpacing: "-0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}>
            {username}
          </div>
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", lineHeight: 1.2 }}>
            {role === "ROLE_ADMIN" ? "Administrator" : "Staff"}
          </div>
        </div>

        {/* Chevron */}
        <span style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0, display: "flex" }}>
          <NavIcon d={menuOpen ? IC.chevron_up : IC.chevron_down} size={10} />
        </span>
      </button>

      {/* Popup menu — opens UPWARD */}
      {menuOpen && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 6px)",
          left: 0,
          right: 0,
          background: "rgba(13,27,62,0.98)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14,
          boxShadow: "0 -16px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)",
          overflow: "hidden",
          zIndex: 99998,
          padding: "6px",
          animation: "scaleIn 150ms cubic-bezier(0.4,0,0.2,1) both",
        }}>
          {menuItem(IC.profile, "My Profile", () => go("/profile"))}
          {role === "ROLE_ADMIN" && menuItem(IC.staff, "Staff Management", () => go("/staff-management"))}
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />
          {menuItem(IC.logout, "Sign out", () => { setMenuOpen(false); setShowLogout(true); }, true)}
        </div>
      )}

      {showLogout && (
        <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogout(false)} />
      )}
    </div>
  );
}

/* ── Brand logo SVG icon ─────────────────────────────────────────────────── */
function BrandIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

/* ── Sidebar body ────────────────────────────────────────────────────────── */
function SidebarBody({ role, username, onNavClick }) {
  return (
    <div style={{
      width: SIDEBAR_W,
      height: "100vh",
      background: "linear-gradient(180deg, #0D1B3E 0%, #07122D 100%)",
      borderRight: "1px solid rgba(255,255,255,0.07)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      fontFamily: "'Inter',-apple-system,sans-serif",
    }}>
      {/* Brand */}
      <div
        style={{
          padding: "16px 14px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          cursor: "pointer",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
        onClick={() => onNavClick?.()}
      >
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          flexShrink: 0,
          background: "linear-gradient(135deg,#4F5DFF 0%,#7C3AED 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(79,93,255,0.4)",
        }}>
          <BrandIcon size={18} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em", lineHeight: "1.2" }}>
            GlassShop
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 400, letterSpacing: "0.01em" }}>
            Management
          </div>
        </div>
      </div>

      {/* Navigation — gated by permission (admin sees everything) */}
      {(() => {
        const admin          = isAdmin();
        const showDashboard  = hasPermission("VIEW_DASHBOARD");
        const showViewStock  = hasPermission("VIEW_STOCK");
        const showManage     = hasAnyPermission(["VIEW_STOCK", "ADD_STOCK", "EDIT_STOCK", "DELETE_STOCK"]);
        const showTransfer   = hasAnyPermission(["VIEW_TRANSFER", "CREATE_TRANSFER"]);
        const showOptim      = hasAnyPermission(["VIEW_OPTIMIZATION", "RUN_OPTIMIZATION", "VIEW_PLANS"]);
        const showCustomers  = hasPermission("VIEW_CUSTOMER");
        const showQuotations = hasPermission("VIEW_QUOTATION");
        const showInvoices   = hasPermission("VIEW_INVOICE");

        const showInventory      = showViewStock || showManage || showTransfer;
        const showBilling        = showCustomers || showQuotations || showInvoices || showOptim;
        const showAdministration = admin;

        return (
          <nav style={{ flex: 1, overflowY: "auto", padding: "4px 8px 12px", scrollbarWidth: "none" }}>
            {showDashboard && <>
              <Section label="Overview" />
              <Item to="/dashboard" icon={IC.dashboard} label="Dashboard" onClick={onNavClick} />
            </>}

            {showInventory && <Section label="Inventory" />}
            {showViewStock && <Item to="/view-stock"     icon={IC.stock_view}   label="View Stock"     onClick={onNavClick} />}
            {showManage    && <Item to="/manage-stock"   icon={IC.stock_manage} label="Manage Stock"   onClick={onNavClick} />}
            {showTransfer  && <Item to="/stock-transfer" icon={IC.transfer}     label="Transfer Stock" onClick={onNavClick} />}

            {showBilling && <Section label="Billing & Tools" />}
            {showCustomers  && <Item to="/customers"    icon={IC.customers}    label="Customers"    onClick={onNavClick} />}
            {admin          && <Item to="/architects"   icon={IC.architects}   label="Architects"   onClick={onNavClick} />}
            {showQuotations && <Item to="/quotations"   icon={IC.quotations}   label="Quotations"   onClick={onNavClick} />}
            {showInvoices   && <Item to="/invoices"     icon={IC.invoices}     label="Invoices"     onClick={onNavClick} />}
            {showOptim      && <Item to="/optimization" icon={IC.optimization} label="Optimization" onClick={onNavClick} />}

            {showAdministration && <>
              <Section label="Administration" />
              <Item to="/staff-management"   icon={IC.staff}        label="Staff"        onClick={onNavClick} />
              <Item to="/stand-management"   icon={IC.stock_manage} label="Stands"       onClick={onNavClick} />
              <Item to="/glass-price-master" icon={IC.price_master} label="Price Master" onClick={onNavClick} />
              <Item to="/ai"                 icon={IC.ai}           label="AI Assistant" onClick={onNavClick} />
              <Item to="/audit"              icon={IC.audit}        label="Audit Log"    onClick={onNavClick} />
            </>}
          </nav>
        );
      })()}

      {/* Profile area */}
      <div style={{
        padding: "8px",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
      }}>
        <ProfileArea username={username} role={role} onNavClick={onNavClick} />
      </div>
    </div>
  );
}

/* ── Bottom Navigation Bar (mobile) ─────────────────────────────────────── */
function BottomNav({ role }) {
  const location = useLocation();

  const adminItems = [
    { key: "dashboard",  label: "Dashboard", to: "/dashboard",  icon: BOTTOM_NAV_ICONS.dashboard },
    { key: "inventory",  label: "Inventory",  to: "/view-stock", icon: BOTTOM_NAV_ICONS.inventory },
    { key: "invoices",   label: "Invoices",   to: "/invoices",   icon: BOTTOM_NAV_ICONS.invoices },
    { key: "profile",    label: "Profile",    to: "/profile",    icon: BOTTOM_NAV_ICONS.profile },
  ];

  const staffItems = [
    { key: "dashboard",  label: "Dashboard",  to: "/dashboard",         icon: BOTTOM_NAV_ICONS.dashboard },
    { key: "inventory",  label: "Inventory",  to: "/view-stock",        icon: BOTTOM_NAV_ICONS.inventory },
    { key: "quotations", label: "Quotations", to: "/staff-quotations",  icon: BOTTOM_NAV_ICONS.quotations },
    { key: "profile",    label: "Profile",    to: "/profile",           icon: BOTTOM_NAV_ICONS.profile },
  ];

  const items = role === "ROLE_ADMIN" ? adminItems : staffItems;

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: 68,
      background: "rgba(7,18,45,0.95)",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      display: "flex",
      alignItems: "stretch",
      zIndex: 10000,
      fontFamily: "'Inter',-apple-system,sans-serif",
    }}>
      {items.map((item) => {
        const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
        return (
          <NavLink
            key={item.key}
            to={item.to}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              paddingTop: 10,
              gap: 3,
              textDecoration: "none",
              color: isActive ? "#37E3A5" : "rgba(255,255,255,0.35)",
              position: "relative",
              transition: "color 150ms ease",
            }}
          >
            {/* Active indicator pill */}
            {isActive && (
              <div style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: 32,
                height: 3,
                borderRadius: "0 0 3px 3px",
                background: "#37E3A5",
                boxShadow: "0 0 8px rgba(55,227,165,0.6)",
              }} />
            )}
            <svg
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {item.icon.map((p, i) => <path key={i} d={p} />)}
            </svg>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.02em",
              lineHeight: 1,
              textShadow: isActive ? "0 0 12px rgba(55,227,165,0.5)" : "none",
            }}>
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </div>
  );
}

/* ── Main Navbar ─────────────────────────────────────────────────────────── */
function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const role      = sessionStorage.getItem("role");
  const username  = getUsername();
  const [isDesktop, setIsDesktop]     = useState(window.innerWidth >= 1024);
  const [drawerOpen, setDrawerOpen]   = useState(false);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close drawer whenever the route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  /* ── Desktop ── */
  if (isDesktop) {
    return (
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 10000 }}>
        <SidebarBody role={role} username={username} />
      </div>
    );
  }

  /* ── Mobile / Tablet — top bar + hamburger → full sidebar drawer ── */
  return (
    <>
      {/* Top bar */}
      <div style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        height: 56,
        background: "rgba(7,18,45,0.97)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        gap: 12,
        zIndex: 10001,
        fontFamily: "'Inter',-apple-system,sans-serif",
      }}>
        {/* Hamburger */}
        <button
          onClick={() => setDrawerOpen(v => !v)}
          style={{
            width: 36, height: 36, borderRadius: 9,
            background: drawerOpen ? "rgba(79,93,255,0.2)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${drawerOpen ? "rgba(79,93,255,0.4)" : "rgba(255,255,255,0.08)"}`,
            cursor: "pointer",
            color: drawerOpen ? "#818CF8" : "#A9B3D1",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 150ms ease", flexShrink: 0,
          }}
        >
          <NavIcon d={drawerOpen ? IC.x : IC.menu} size={18} />
        </button>

        {/* Brand */}
        <div
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}
          onClick={() => { navigate("/dashboard"); setDrawerOpen(false); }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg,#4F5DFF 0%,#7C3AED 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 10px rgba(79,93,255,0.4)",
          }}>
            <BrandIcon size={15} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em" }}>
            GlassShop
          </span>
        </div>

        {/* Search shortcut */}
        <button
          onClick={() => { navigate("/view-stock"); setDrawerOpen(false); }}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer", color: "#A9B3D1",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 130ms ease", flexShrink: 0,
          }}
        >
          <NavIcon d={IC.search} size={17} />
        </button>
      </div>

      {/* Drawer backdrop */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 9999,
          }}
        />
      )}

      {/* Drawer sidebar — slides in from left */}
      <div style={{
        position: "fixed",
        top: 0, left: 0, bottom: 0,
        zIndex: 10000,
        transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 260ms cubic-bezier(0.4,0,0.2,1)",
        willChange: "transform",
      }}>
        <SidebarBody
          role={role}
          username={username}
          onNavClick={() => setDrawerOpen(false)}
        />
      </div>
    </>
  );
}

export { SIDEBAR_W };
export default Navbar;
