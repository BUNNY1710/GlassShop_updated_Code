import { useEffect, useState } from "react";

/**
 * Premium confirmation modal — replaces window.confirm().
 *
 * Props:
 *   open        — boolean
 *   title       — string
 *   message     — string (supports \n)
 *   confirmText — default "Confirm"
 *   cancelText  — default "Cancel"
 *   type        — "danger" | "primary"
 *   loading     — boolean (spinner + disabled while the action runs)
 *   onConfirm   — () => void
 *   onCancel    — () => void
 */
export default function ConfirmationModal({
  open, title, message,
  confirmText = "Confirm", cancelText = "Cancel",
  type = "danger", loading = false,
  onConfirm, onCancel,
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setShow(true), 10); // trigger enter transition
      return () => clearTimeout(t);
    }
    setShow(false);
  }, [open]);

  // Esc to cancel
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape" && !loading) onCancel?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const danger = type === "danger";
  const icon   = danger ? "🗑" : "❓";
  const confirmBg = danger
    ? "linear-gradient(135deg,#FF6B81 0%,#E0556A 100%)"
    : "linear-gradient(135deg,#4F5DFF 0%,#7C3AED 100%)";
  const iconBg = danger ? "rgba(255,107,129,0.15)" : "rgba(79,93,255,0.15)";
  const iconBd = danger ? "rgba(255,107,129,0.35)" : "rgba(79,93,255,0.35)";

  return (
    <div
      onClick={() => !loading && onCancel?.()}
      style={{
        position: "fixed", inset: 0, zIndex: 20050,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        background: "rgba(5,11,31,0.62)", backdropFilter: "blur(6px)",
        opacity: show ? 1 : 0, transition: "opacity 220ms ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true"
        style={{
          width: "100%", maxWidth: 420,
          background: "linear-gradient(180deg, rgba(23,33,60,0.98) 0%, rgba(17,27,53,0.98) 100%)",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18,
          boxShadow: "0 24px 70px rgba(0,0,0,0.6)", padding: "26px 24px",
          transform: show ? "scale(1)" : "scale(0.92)", opacity: show ? 1 : 0,
          transition: "transform 240ms cubic-bezier(0.32,0.72,0,1), opacity 220ms ease",
          fontFamily: "'Inter',-apple-system,sans-serif",
        }}
      >
        <div style={{
          width: 54, height: 54, borderRadius: 15, margin: "0 auto 16px",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
          background: iconBg, border: `1px solid ${iconBd}`,
        }}>{icon}</div>

        {title && <h3 style={{ margin: "0 0 8px", textAlign: "center", fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{title}</h3>}
        {message && <p style={{ margin: "0 0 22px", textAlign: "center", fontSize: 13.5, lineHeight: 1.55, color: "#A9B3D1", whiteSpace: "pre-line" }}>{message}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => !loading && onCancel?.()}
            disabled={loading}
            style={{
              flex: 1, height: 44, borderRadius: 11,
              border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)",
              color: "#A9B3D1", fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              fontFamily: "inherit",
            }}
          >{cancelText}</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, height: 44, borderRadius: 11, border: "none",
              background: confirmBg, color: "#fff", fontSize: 14, fontWeight: 800,
              cursor: loading ? "default" : "pointer", opacity: loading ? 0.85 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "inherit",
            }}
          >
            {loading && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
            {loading ? (danger ? "Deleting…" : "Please wait…") : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
