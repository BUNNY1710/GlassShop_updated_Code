import { useState, useEffect, useCallback } from "react";
import { getGlassTypes, createGlassType, updateGlassType, deleteGlassType } from "../api/glassTypeApi";

/**
 * Glass Type Management modal — add / edit / delete the per-shop glass-type
 * master. Reused by any page via the ⚙ Manage button.
 *
 * Props:
 *   open      — boolean
 *   onClose   — () => void
 *   onChanged — () => void   called after any successful mutation so the parent
 *                            can refresh its dropdown options
 */
export default function GlassTypeManager({ open, onClose, onChanged }) {
  const [types, setTypes]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError]     = useState("");
  const [busy, setBusy]       = useState(false);

  const [editId, setEditId]     = useState(null);
  const [editName, setEditName] = useState("");

  // delete-with-replace state: { id, name } currently being deleted
  const [confirmDel, setConfirmDel]   = useState(null);
  const [replaceWith, setReplaceWith] = useState("");

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
      setNewName(""); setError(""); setEditId(null); setConfirmDel(null); setReplaceWith("");
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

  const handleDelete = async (t) => {
    setError("");
    setBusy(true);
    try {
      await deleteGlassType(t.id);
      await afterChange();
    } catch (e) {
      // In use -> open replace flow instead of failing outright.
      if (e?.response?.status === 409 && e?.response?.data?.inUse) {
        setConfirmDel(t);
        setReplaceWith("");
        setError("This Glass Type is already in use. Choose a replacement to migrate existing records, or cancel.");
      } else {
        setError(errMsg(e, "Failed to delete glass type"));
      }
    } finally { setBusy(false); }
  };

  const handleReplaceDelete = async () => {
    if (!replaceWith) { setError("Select a replacement glass type."); return; }
    setBusy(true);
    try {
      await deleteGlassType(confirmDel.id, replaceWith);
      setConfirmDel(null); setReplaceWith(""); setError("");
      await afterChange();
    } catch (e) {
      setError(errMsg(e, "Failed to delete glass type"));
    } finally { setBusy(false); }
  };

  const inp = { background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 9, height: 40, padding: "0 12px", color: "#fff", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };
  const btn = (bg, col, bd) => ({ height: 36, padding: "0 14px", borderRadius: 8, background: bg, color: col, border: bd || "none", fontSize: 13, fontWeight: 700, cursor: busy ? "default" : "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1 });

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(5,11,31,0.85)", backdropFilter: "blur(8px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "rgba(17,27,53,0.98)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>⚙ Glass Type Management</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "none", color: "#A9B3D1", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>

        <div style={{ padding: "16px 18px" }}>
          {/* Add */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input
              style={inp}
              placeholder="New glass type name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
            />
            <button onClick={handleAdd} disabled={busy} style={btn("#4F5DFF", "#fff")}>+ Add</button>
          </div>

          {error && (
            <div style={{ marginBottom: 12, padding: "9px 12px", borderRadius: 9, background: "rgba(255,107,129,0.1)", border: "1px solid rgba(255,107,129,0.3)", color: "#FF6B81", fontSize: 12.5 }}>
              {error}
            </div>
          )}

          {/* Replace-on-delete panel */}
          {confirmDel && (
            <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 10, background: "rgba(255,185,94,0.08)", border: "1px solid rgba(255,185,94,0.3)" }}>
              <div style={{ fontSize: 13, color: "#FFB95E", fontWeight: 700, marginBottom: 8 }}>
                Replace “{confirmDel.name}” with:
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={replaceWith} onChange={e => setReplaceWith(e.target.value)} style={inp}>
                  <option value="">Select replacement…</option>
                  {types.filter(t => t.id !== confirmDel.id).map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
                <button onClick={handleReplaceDelete} disabled={busy} style={btn("rgba(255,107,129,0.2)", "#FF6B81", "1px solid rgba(255,107,129,0.4)")}>Migrate &amp; Delete</button>
              </div>
              <button onClick={() => { setConfirmDel(null); setError(""); }} style={{ marginTop: 8, background: "none", border: "none", color: "#7180A6", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Cancel</button>
            </div>
          )}

          {/* List */}
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
                      <input
                        style={{ ...inp, height: 34 }}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); }}
                        autoFocus
                      />
                      <button onClick={handleSaveEdit} disabled={busy} style={btn("rgba(55,227,165,0.18)", "#37E3A5", "1px solid rgba(55,227,165,0.35)")}>Save</button>
                      <button onClick={() => { setEditId(null); setEditName(""); }} style={btn("rgba(255,255,255,0.07)", "#A9B3D1", "1px solid rgba(255,255,255,0.12)")}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: 13.5, color: "#fff", fontWeight: 500 }}>{t.name}</span>
                      <button onClick={() => { setEditId(t.id); setEditName(t.name); setError(""); }} style={btn("rgba(79,93,255,0.15)", "#818CF8", "1px solid rgba(79,93,255,0.3)")}>Edit</button>
                      <button onClick={() => handleDelete(t)} disabled={busy} style={btn("rgba(255,107,129,0.12)", "#FF6B81", "1px solid rgba(255,107,129,0.3)")}>Delete</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
