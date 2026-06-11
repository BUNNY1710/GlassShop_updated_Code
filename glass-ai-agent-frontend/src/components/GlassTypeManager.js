import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  getGlassTypes, createGlassType, updateGlassType,
  deleteGlassType, getGlassTypeDeleteInfo, restoreGlassType,
} from "../api/glassTypeApi";

/* Toast body with a live 5-second Undo countdown. */
function UndoToast({ name, onUndo, closeToast }) {
  const [left, setLeft] = useState(5);
  useEffect(() => {
    const i = setInterval(() => setLeft(l => Math.max(0, l - 1)), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>🗑 Glass Type “{name}” deleted</div>
        <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 1 }}>Undo expires in {left}s</div>
      </div>
      <button
        onClick={() => { onUndo(); closeToast && closeToast(); }}
        style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
      >Undo</button>
    </div>
  );
}

/**
 * Glass Type Management modal — add / edit / soft-delete (with undo) the
 * per-shop glass-type master. Reused via the ⚙ Manage button.
 */
export default function GlassTypeManager({ open, onClose, onChanged }) {
  const [types, setTypes]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError]     = useState("");
  const [busy, setBusy]       = useState(false);

  const [editId, setEditId]     = useState(null);
  const [editName, setEditName] = useState("");

  // delete confirmation modal: { id, name, info?, loading }
  const [del, setDel]         = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGlassTypes();
      setTypes(Array.isArray(data) ? data : []);
    } catch {
      setError("Unable to load glass types. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      load();
      setNewName(""); setError(""); setEditId(null); setDel(null);
    }
  }, [open, load]);

  if (!open) return null;

  const errMsg = (e, fallback) =>
    e?.response?.data?.message || e?.response?.data?.error || fallback;

  const afterChange = async () => { await load(); onChanged && onChanged(); };

  const handleAdd = async () => {
    const name = newName.trim();
    setError("");
    if (!name) { setError("Glass type name cannot be empty"); return; }
    setBusy(true);
    try {
      await createGlassType(name);
      setNewName("");
      await afterChange();
    } catch (e) {
      setError(errMsg(e, "Failed to add glass type"));
    } finally { setBusy(false); }
  };

  const handleSaveEdit = async () => {
    const name = editName.trim();
    setError("");
    if (!name) { setError("Glass type name cannot be empty"); return; }
    setBusy(true);
    try {
      await updateGlassType(editId, name);
      setEditId(null); setEditName("");
      await afterChange();
    } catch (e) {
      setError(errMsg(e, "Failed to update glass type"));
    } finally { setBusy(false); }
  };

  // Open the delete modal, loading the stock summary first.
  const onDeleteClick = async (t) => {
    setError("");
    setDel({ id: t.id, name: t.name, info: null, loading: true });
    try {
      const info = await getGlassTypeDeleteInfo(t.id);
      setDel(d => d && d.id === t.id ? { ...d, info, loading: false } : d);
    } catch (e) {
      setDel(d => d && d.id === t.id ? { ...d, loading: false, error: errMsg(e, "Failed to load stock info") } : d);
    }
  };

  const doDelete = async () => {
    if (!del) return;
    const { id, name } = del;
    setDeleting(true);
    try {
      const r = await deleteGlassType(id);
      setDel(null);
      await afterChange();
      const finalName = r.name || name;
      const restoreId = r.id || id;
      // 5-second Undo toast.
      toast(({ closeToast }) => (
        <UndoToast
          name={finalName}
          closeToast={closeToast}
          onUndo={async () => {
            try {
              await restoreGlassType(restoreId);
              await afterChange();
              toast.success(`✅ Glass Type “${finalName}” restored successfully`);
            } catch {
              toast.error("Failed to restore glass type");
            }
          }}
        />
      ), { autoClose: 5000, closeOnClick: false });
    } catch (e) {
      setError(errMsg(e, "Failed to delete glass type"));
      setDel(null);
    } finally { setDeleting(false); }
  };

  const inp = { background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 9, height: 40, padding: "0 12px", color: "#fff", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };
  const btn = (bg, col, bd) => ({ height: 36, padding: "0 14px", borderRadius: 8, background: bg, color: col, border: bd || "none", fontSize: 13, fontWeight: 700, cursor: busy ? "default" : "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1 });

  const hasStock = del?.info && del.info.totalSheets > 0;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(5,11,31,0.85)", backdropFilter: "blur(8px)",
        zIndex: 10000, display: "flex", justifyContent: "center",
        // On mobile, anchor below the navbar with a gap + safe-area so the popup
        // never touches the top bar. Desktop stays centered.
        alignItems: isMobile ? "flex-start" : "center",
        padding: 16,
        paddingTop: isMobile ? "calc(80px + env(safe-area-inset-top, 0px))" : 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "rgba(17,27,53,0.98)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18,
          width: "100%", maxWidth: 480,
          maxHeight: isMobile ? "calc(100vh - 110px - env(safe-area-inset-top, 0px))" : "88vh",
          overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>⚙ Glass Type Management</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "none", color: "#A9B3D1", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>

        <div style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input style={inp} placeholder="New glass type name…" value={newName}
              onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAdd(); }} />
            <button onClick={handleAdd} disabled={busy} style={btn("#4F5DFF", "#fff")}>+ Add</button>
          </div>

          {error && (
            <div style={{ marginBottom: 12, padding: "9px 12px", borderRadius: 9, background: "rgba(255,107,129,0.1)", border: "1px solid rgba(255,107,129,0.3)", color: "#FF6B81", fontSize: 12.5 }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", color: "#7180A6", padding: "20px 0", fontSize: 13 }}>Loading…</div>
          ) : types.length === 0 ? (
            <div style={{ textAlign: "center", color: "#7180A6", padding: "20px 0", fontSize: 13 }}>No glass types yet. Add one above.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {types.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9 }}>
                  {editId === t.id ? (
                    <>
                      <input style={{ ...inp, height: 34 }} value={editName}
                        onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); }} autoFocus />
                      <button onClick={handleSaveEdit} disabled={busy} style={btn("rgba(55,227,165,0.18)", "#37E3A5", "1px solid rgba(55,227,165,0.35)")}>Save</button>
                      <button onClick={() => { setEditId(null); setEditName(""); }} style={btn("rgba(255,255,255,0.07)", "#A9B3D1", "1px solid rgba(255,255,255,0.12)")}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: 13.5, color: "#fff", fontWeight: 500 }}>{t.name}</span>
                      <button onClick={() => { setEditId(t.id); setEditName(t.name); setError(""); }} style={btn("rgba(79,93,255,0.15)", "#818CF8", "1px solid rgba(79,93,255,0.3)")}>Edit</button>
                      <button onClick={() => onDeleteClick(t)} style={btn("rgba(255,107,129,0.12)", "#FF6B81", "1px solid rgba(255,107,129,0.3)")}>Delete</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Delete confirmation modal (with stock details) ── */}
      {del && (
        <div onClick={e => { e.stopPropagation(); if (!deleting) setDel(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 10010, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(5,11,31,0.6)", backdropFilter: "blur(6px)", animation: "fadeIn 0.18s ease-out" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 440, background: "linear-gradient(180deg, rgba(23,33,60,0.98), rgba(17,27,53,0.98))", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, boxShadow: "0 24px 70px rgba(0,0,0,0.6)", padding: "24px 22px", animation: "fadeIn 0.22s cubic-bezier(0.32,0.72,0,1)" }}>
            <div style={{ width: 54, height: 54, borderRadius: 15, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: hasStock ? "rgba(255,185,94,0.15)" : "rgba(255,107,129,0.15)", border: `1px solid ${hasStock ? "rgba(255,185,94,0.35)" : "rgba(255,107,129,0.35)"}` }}>
              {hasStock ? "⚠️" : "🗑"}
            </div>
            <h3 style={{ margin: "0 0 8px", textAlign: "center", fontSize: 18, fontWeight: 800, color: "#fff" }}>
              {hasStock ? "Stock Exists — Delete Anyway?" : "Delete Glass Type"}
            </h3>
            <p style={{ margin: "0 0 14px", textAlign: "center", fontSize: 13.5, color: "#A9B3D1", lineHeight: 1.5 }}>
              You are about to delete <strong style={{ color: "#fff" }}>{del.name}</strong>.
            </p>

            {del.loading ? (
              <div style={{ textAlign: "center", color: "#7180A6", padding: "14px 0", fontSize: 13 }}>Checking stock…</div>
            ) : del.error ? (
              <div style={{ color: "#FF6B81", fontSize: 12.5, textAlign: "center", marginBottom: 14 }}>{del.error}</div>
            ) : hasStock ? (
              <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 12, background: "rgba(255,185,94,0.06)", border: "1px solid rgba(255,185,94,0.25)" }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#FFB95E" }}>{del.info.totalSheets}</div>
                    <div style={{ fontSize: 10, color: "#7180A6", textTransform: "uppercase" }}>Sheets</div>
                  </div>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#818CF8" }}>{del.info.totalQuantity}</div>
                    <div style={{ fontSize: 10, color: "#7180A6", textTransform: "uppercase" }}>Total Qty</div>
                  </div>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#37E3A5" }}>{del.info.standCount}</div>
                    <div style={{ fontSize: 10, color: "#7180A6", textTransform: "uppercase" }}>Stands</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#7180A6", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>Stored In</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {del.info.stands.map(s => (
                    <div key={s.standNo} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#E2E8F0" }}>
                      <span>Stand #{s.standNo}</span><span style={{ fontWeight: 700 }}>{s.qty}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 11.5, color: "#FFB95E" }}>
                  Deleting may affect Inventory, Optimization, Reports & Audit history.
                  {del.info.usedInOrders > 0 && ` Used in ${del.info.usedInOrders} order item${del.info.usedInOrders !== 1 ? "s" : ""}.`}
                </div>
              </div>
            ) : (
              <p style={{ margin: "0 0 16px", textAlign: "center", fontSize: 12.5, color: "#7180A6" }}>
                No stock is currently associated with this glass type.<br />This action can be undone for 5 seconds.
              </p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => !deleting && setDel(null)} disabled={deleting}
                style={{ flex: 1, height: 44, borderRadius: 11, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "#A9B3D1", fontSize: 14, fontWeight: 700, cursor: deleting ? "default" : "pointer" }}>
                Cancel
              </button>
              <button onClick={doDelete} disabled={deleting || del.loading}
                style={{ flex: 1, height: 44, borderRadius: 11, border: "none", background: "linear-gradient(135deg,#FF6B81,#E0556A)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: (deleting || del.loading) ? "default" : "pointer", opacity: (deleting || del.loading) ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {deleting && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
                {deleting ? "Deleting…" : (hasStock ? "Delete Anyway" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
