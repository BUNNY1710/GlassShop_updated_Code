import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

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

const SIDEBAR_W = 220;

const ICONS = {
  dashboard:    "◻",
  stock_view:   "▦",
  stock_manage: "⊕",
  transfer:     "⇄",
  customers:    "○",
  architects:   "△",
  quotations:   "▤",
  invoices:     "▣",
  optimization: "⊞",
  price_master: "◇",
  ai:           "◈",
  audit:        "≡",
  staff:        "⊙",
  quotation_s:  "▢",
  profile:      "◉",
};

function Section({ label }) {
  return (
    <div style={{
      fontSize: "10px", fontWeight: 700, color: "#94a3b8",
      letterSpacing: "0.08em", textTransform: "uppercase",
      padding: "0 10px", marginTop: 18, marginBottom: 2,
      fontFamily: "'Inter',-apple-system,sans-serif",
    }}>
      {label}
    </div>
  );
}

function Item({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      style={({ isActive }) => ({
        display: "flex", alignItems: "center", gap: 10,
        padding: "6px 10px", borderRadius: 7,
        textDecoration: "none", fontSize: 13.5,
        fontWeight: isActive ? 600 : 500,
        color: isActive ? "#0f172a" : "#64748b",
        background: isActive ? "#f1f5f9" : "transparent",
        borderLeft: isActive ? "2px solid #4f46e5" : "2px solid transparent",
        transition: "all 140ms ease",
        letterSpacing: "-0.01em",
        fontFamily: "'Inter',-apple-system,sans-serif",
        userSelect: "none",
      })}
      onMouseEnter={(e) => {
        if (!e.currentTarget.getAttribute("aria-current")) {
          e.currentTarget.style.background = "#f8fafc";
          e.currentTarget.style.color = "#374151";
        }
      }}
      onMouseLeave={(e) => {
        if (!e.currentTarget.getAttribute("aria-current")) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#64748b";
        }
      }}
    >
      <span style={{ fontSize: 13, width: 18, flexShrink: 0, textAlign: "center", fontFamily: "monospace, sans-serif", lineHeight: 1 }}>
        {icon}
      </span>
      <span style={{ lineHeight: 1.3 }}>{label}</span>
    </NavLink>
  );
}

/* ── Logout confirmation portal ─────────────────────────────────────────── */
function LogoutModal({ onConfirm, onCancel }) {
  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 99999, padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "#fff", borderRadius: 14, width: "100%", maxWidth: 360,
          boxShadow: "0 20px 40px rgba(15,23,42,0.18)", padding: "24px 22px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, margin: "0 auto 12px",
            background: "#fef2f2", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 22,
          }}>
            ⎋
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
            Logout Confirmation
          </div>
          <div style={{ fontSize: 13.5, color: "#64748b" }}>
            Are you sure you want to logout?
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 8,
              border: "1.5px solid #e2e8f0", background: "#fff",
              color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 8, border: "none",
              background: "#ef4444", color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Profile popup menu ──────────────────────────────────────────────────── */
function ProfileArea({ username, role, onNavClick }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [showLogout, setShowLogout]   = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false); };
    if (menuOpen) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  const go = (path) => { setMenuOpen(false); onNavClick?.(); navigate(path); };

  const menuItem = (icon, label, onClick, danger = false) => (
    <button
      onClick={onClick}
      style={{
        width: "100%", padding: "8px 12px", background: "transparent",
        border: "none", borderRadius: 6, textAlign: "left", cursor: "pointer",
        fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 9,
        color: danger ? "#ef4444" : "#374151",
        fontFamily: "'Inter',-apple-system,sans-serif",
        transition: "background 120ms ease",
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = danger ? "#fef2f2" : "#f8fafc"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >
      <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{icon}</span>
      {label}
    </button>
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Profile trigger */}
      <button
        onClick={() => setMenuOpen((v) => !v)}
        style={{
          width: "100%", padding: "9px 10px",
          background: menuOpen ? "#f1f5f9" : "transparent",
          border: "none", borderRadius: 8, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10,
          transition: "background 140ms ease",
        }}
        onMouseEnter={(e) => { if (!menuOpen) e.currentTarget.style.background = "#f8fafc"; }}
        onMouseLeave={(e) => { if (!menuOpen) e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: "#eef2ff", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#4f46e5",
        }}>
          {username.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, overflow: "hidden", textAlign: "left" }}>
          <div style={{
            fontSize: 12.5, fontWeight: 600, color: "#0f172a", letterSpacing: "-0.01em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {username}
          </div>
          <div style={{ fontSize: 10.5, color: "#94a3b8" }}>
            {role === "ROLE_ADMIN" ? "Administrator" : "Staff"}
          </div>
        </div>
        <span style={{ fontSize: 9, color: "#94a3b8", flexShrink: 0 }}>{menuOpen ? "▴" : "▾"}</span>
      </button>

      {/* Popup menu — opens upward */}
      {menuOpen && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0,
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
          boxShadow: "0 -8px 24px rgba(15,23,42,.10), 0 2px 8px rgba(15,23,42,.06)",
          overflow: "hidden", zIndex: 99998, padding: "6px",
        }}>
          {menuItem("◉", "My Profile",       () => go("/profile"))}
          {role === "ROLE_ADMIN" && menuItem("⊙", "Staff Management", () => go("/staff-management"))}
          <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0" }} />
          {menuItem("⎋", "Logout", () => { setMenuOpen(false); setShowLogout(true); }, true)}
        </div>
      )}

      {showLogout && (
        <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogout(false)} />
      )}
    </div>
  );
}

/* ── Sidebar body ────────────────────────────────────────────────────────── */
function SidebarBody({ role, username, onNavClick }) {
  return (
    <div style={{
      width: SIDEBAR_W, height: "100vh",
      background: "#ffffff", borderRight: "1px solid #e8edf2",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      fontFamily: "'Inter',-apple-system,sans-serif",
    }}>
      {/* Brand */}
      <div
        style={{
          padding: "15px 14px 12px", borderBottom: "1px solid #f1f5f9",
          cursor: "pointer", flexShrink: 0,
          display: "flex", alignItems: "center", gap: 10,
        }}
        onClick={() => { onNavClick?.(); }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, boxShadow: "0 2px 6px rgba(79,70,229,.28)",
        }}>
          🧱
        </div>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: "1.2" }}>
            GlassShop
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>Management System</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "6px 8px 12px" }}>
        <Section label="Overview" />
        <Item to="/dashboard"      icon={ICONS.dashboard}    label="Dashboard"      onClick={onNavClick} />

        <Section label="Inventory" />
        <Item to="/view-stock"     icon={ICONS.stock_view}   label="View Stock"     onClick={onNavClick} />
        <Item to="/manage-stock"   icon={ICONS.stock_manage} label="Manage Stock"   onClick={onNavClick} />
        <Item to="/stock-transfer" icon={ICONS.transfer}     label="Transfer Stock" onClick={onNavClick} />

        {role === "ROLE_STAFF" && (
          <>
            <Section label="Billing" />
            <Item to="/staff-quotations" icon={ICONS.quotation_s} label="Quotations" onClick={onNavClick} />
          </>
        )}

        {role === "ROLE_ADMIN" && (
          <>
            <Section label="Billing" />
            <Item to="/customers"    icon={ICONS.customers}    label="Customers"    onClick={onNavClick} />
            <Item to="/architects"   icon={ICONS.architects}   label="Architects"   onClick={onNavClick} />
            <Item to="/quotations"   icon={ICONS.quotations}   label="Quotations"   onClick={onNavClick} />
            <Item to="/invoices"     icon={ICONS.invoices}     label="Invoices"     onClick={onNavClick} />
            <Item to="/optimization" icon={ICONS.optimization} label="Optimization" onClick={onNavClick} />

            <Section label="Administration" />
            <Item to="/staff-management"   icon={ICONS.staff}        label="Staff"          onClick={onNavClick} />
            <Item to="/glass-price-master" icon={ICONS.price_master} label="Price Master"   onClick={onNavClick} />
            <Item to="/ai"                 icon={ICONS.ai}           label="AI Assistant"   onClick={onNavClick} />
            <Item to="/audit"              icon={ICONS.audit}        label="Audit Log"      onClick={onNavClick} />
          </>
        )}
      </nav>

      {/* Profile area (replaces plain sign-out button) */}
      <div style={{ padding: "8px 8px 10px", borderTop: "1px solid #f1f5f9", flexShrink: 0 }}>
        <ProfileArea username={username} role={role} onNavClick={onNavClick} />
      </div>
    </div>
  );
}

/* ── Main Navbar ─────────────────────────────────────────────────────────── */
function Navbar() {
  const location = useLocation();
  const navigate  = useNavigate();
  const role      = sessionStorage.getItem("role");
  const username  = getUsername();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop]   = useState(window.innerWidth >= 1024);
  const [showMobileLogout, setShowMobileLogout] = useState(false);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = () => { sessionStorage.clear(); navigate("/login"); };

  if (isDesktop) {
    return (
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 10000 }}>
        <SidebarBody role={role} username={username} />
      </div>
    );
  }

  /* ── Mobile / Tablet ── */
  return (
    <>
      {/* Top bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 52,
        background: "#ffffff", borderBottom: "1px solid #e8edf2",
        display: "flex", alignItems: "center", padding: "0 14px",
        gap: 12, zIndex: 10000,
        fontFamily: "'Inter',-apple-system,sans-serif",
      }}>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", width: 36, height: 36, borderRadius: 8, fontSize: 18, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          ☰
        </button>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => navigate("/dashboard")}>
          <span style={{ fontSize: 18 }}>🧱</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>GlassShop</span>
        </div>
        {/* Avatar tap → logout confirm */}
        <button
          onClick={() => setShowMobileLogout(true)}
          title="Account options"
          style={{ width: 30, height: 30, borderRadius: 8, background: "#eef2ff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {username.charAt(0).toUpperCase()}
        </button>
      </div>

      {/* Backdrop */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.4)", zIndex: 10001 }}
          onClick={() => setMobileOpen(false)} />
      )}

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: SIDEBAR_W,
        transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 240ms cubic-bezier(0.4,0,0.2,1)",
        zIndex: 10002,
        boxShadow: mobileOpen ? "4px 0 20px rgba(15,23,42,.12)" : "none",
      }}>
        <SidebarBody role={role} username={username} onNavClick={() => setMobileOpen(false)} />
      </div>

      {/* Mobile logout confirmation */}
      {showMobileLogout && (
        <LogoutModal onConfirm={handleLogout} onCancel={() => setShowMobileLogout(false)} />
      )}
    </>
  );
}

export { SIDEBAR_W };
export default Navbar;
