import { useState, useEffect, useCallback } from "react";
import PageWrapper from "../components/PageWrapper";
import { useResponsive } from "../hooks/useResponsive";
import { getStands, createStand, updateStand, setStandActive, deleteStand } from "../api/standApi";

export default function StandManagement() {
  const { isMobile } = useResponsive();
  const [stands, setStands]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash]     = useState({ text: "", ok: true });
  const [busy, setBusy]       = useState(false);

  // add form
  const [num, setNum]   = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  // edit modal
  const [edit, setEdit] = useState(null); // { id, standNumber, standName, description }

  const toast = (text, ok = true) => { setFlash({ text, ok }); setTimeout(() => setFlash({ text: "", ok: true }), 4500); };

  const load = useCallback(async () => {
    setLoading(true);
    try { setStands(await getStands(true)); }
    catch { toast("Failed to load stands", false); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const errMsg = (e, f) => e?.response?.data?.message || e?.response?.data?.error || f;

  const handleAdd = async () => {
    const n = parseInt(num, 10);
    if (!Number.isInteger(n) || n < 1) { toast("Stand number must be greater than 0", false); return; }
    setBusy(true);
    try {
      await createStand({ standNumber: n, standName: name.trim(), description: desc.trim() });
      setNum(""); setName(""); setDesc("");
      toast("✅ Stand added");
      load();
    } catch (e) { toast(errMsg(e, "Failed to add stand"), false); }
    finally { setBusy(false); }
  };

  const toggleActive = async (s) => {
    setBusy(true);
    try { await setStandActive(s.id, !s.isActive); load(); }
    catch (e) { toast(errMsg(e, "Failed to update stand"), false); }
    finally { setBusy(false); }
  };

  const saveEdit = async () => {
    const n = parseInt(edit.standNumber, 10);
    if (!Number.isInteger(n) || n < 1) { toast("Stand number must be greater than 0", false); return; }
    setBusy(true);
    try {
      await updateStand(edit.id, { standNumber: n, standName: edit.standName, description: edit.description });
      setEdit(null); toast("✅ Stand updated"); load();
    } catch (e) { toast(errMsg(e, "Failed to update stand"), false); }
    finally { setBusy(false); }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete Stand #${s.standNumber}?`)) return;
    setBusy(true);
    try { await deleteStand(s.id); toast("✅ Stand deleted"); load(); }
    catch (e) { toast(errMsg(e, "Failed to delete stand"), false); }
    finally { setBusy(false); }
  };

  const total = stands.length;
  const active = stands.filter(s => s.isActive).length;

  const card = { background: "#111B35", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
  const inp = { background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 9, height: 40, padding: "0 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", width: "100%" };
  const btn = (bg, col, bd) => ({ height: 36, padding: "0 16px", borderRadius: 8, background: bg, color: col, border: bd || "none", fontSize: 13, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 });
  const th = { padding: "9px 12px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)" };
  const td = { padding: "11px 12px", fontSize: 13.5, color: "#E2E8F0", borderBottom: "1px solid rgba(255,255,255,0.05)" };

  return (
    <PageWrapper>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "12px" : "20px", fontFamily: "'Inter',-apple-system,sans-serif" }}>
        {flash.text && (
          <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13,
            background: flash.ok ? "rgba(55,227,165,0.1)" : "rgba(255,107,129,0.1)",
            color: flash.ok ? "#37E3A5" : "#FF6B81",
            border: `1px solid ${flash.ok ? "rgba(55,227,165,0.3)" : "rgba(255,107,129,0.3)"}` }}>{flash.text}</div>
        )}

        {/* Header + stats */}
        <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff" }}>🗄 Stand Management</h2>
          <p style={{ margin: "2px 0 12px", fontSize: 12.5, color: "#7180A6" }}>Define the physical stands where stock can be stored. Only these stands are selectable in Manage Stock, Transfers, and Remnant Storage.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[{ l: "Total Stands", v: total, c: "#4F5DFF" }, { l: "Active", v: active, c: "#37E3A5" }, { l: "Inactive", v: total - active, c: "#FFB95E" }].map(x => (
              <div key={x.l} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: x.c }}>{x.v}</div>
                <div style={{ fontSize: 10.5, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.05em" }}>{x.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Add stand */}
        <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10 }}>+ Add Stand</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "120px 1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <div><div style={lbl}>Stand Number *</div><input type="number" min="1" step="1" value={num} onChange={e => setNum(e.target.value)} style={inp} placeholder="e.g. 6" /></div>
            <div><div style={lbl}>Name (optional)</div><input value={name} onChange={e => setName(e.target.value)} style={inp} placeholder="e.g. Back wall" /></div>
            <div><div style={lbl}>Description (optional)</div><input value={desc} onChange={e => setDesc(e.target.value)} style={inp} placeholder="Notes" /></div>
            <button onClick={handleAdd} disabled={busy} style={btn("#4F5DFF", "#fff")}>Add</button>
          </div>
        </div>

        {/* List */}
        <div style={{ ...card, overflow: "hidden" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#7180A6" }}>Loading…</div>
          ) : stands.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#7180A6" }}>No stands yet. Add one above.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Stand #", "Name", "Status", "Actions"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {stands.map(s => (
                    <tr key={s.id}>
                      <td style={{ ...td, fontWeight: 800, color: "#fff" }}>#{s.standNumber}</td>
                      <td style={td}>{s.standName || <span style={{ color: "#7180A6" }}>—</span>}</td>
                      <td style={td}>
                        <span style={{ padding: "2px 9px", borderRadius: 99, fontSize: 11.5, fontWeight: 700,
                          background: s.isActive ? "rgba(55,227,165,0.15)" : "rgba(255,185,94,0.15)",
                          color: s.isActive ? "#37E3A5" : "#FFB95E" }}>{s.isActive ? "Active" : "Inactive"}</span>
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button onClick={() => setEdit({ ...s })} style={btn("rgba(79,93,255,0.15)", "#818CF8", "1px solid rgba(79,93,255,0.3)")}>Edit</button>
                          <button onClick={() => toggleActive(s)} style={btn("rgba(255,255,255,0.07)", "#A9B3D1", "1px solid rgba(255,255,255,0.12)")}>{s.isActive ? "Disable" : "Enable"}</button>
                          <button onClick={() => handleDelete(s)} style={btn("rgba(255,107,129,0.12)", "#FF6B81", "1px solid rgba(255,107,129,0.3)")}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {edit && (
        <div onClick={() => setEdit(null)} style={{ position: "fixed", inset: 0, background: "rgba(5,11,31,0.85)", backdropFilter: "blur(8px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, width: "100%", maxWidth: 440 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Edit Stand</div>
              <button onClick={() => setEdit(null)} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "none", color: "#A9B3D1", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div><div style={lbl}>Stand Number *</div><input type="number" min="1" step="1" value={edit.standNumber} onChange={e => setEdit({ ...edit, standNumber: e.target.value })} style={inp} /></div>
              <div><div style={lbl}>Name</div><input value={edit.standName || ""} onChange={e => setEdit({ ...edit, standName: e.target.value })} style={inp} /></div>
              <div><div style={lbl}>Description</div><input value={edit.description || ""} onChange={e => setEdit({ ...edit, description: e.target.value })} style={inp} /></div>
            </div>
            <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setEdit(null)} style={btn("rgba(255,255,255,0.08)", "#A9B3D1", "1px solid rgba(255,255,255,0.12)")}>Cancel</button>
              <button onClick={saveEdit} disabled={busy} style={btn("#4F5DFF", "#fff")}>Save</button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

const lbl = { fontSize: 11, color: "#A9B3D1", fontWeight: 600, marginBottom: 5 };
