import { useState, useEffect, useCallback } from "react";
import PageWrapper from "../components/PageWrapper";
import { useResponsive } from "../hooks/useResponsive";
import ConfirmationModal from "../components/ConfirmationModal";
import { getStands, createStand, updateStand, setStandActive, deleteStand, getStandDeleteInfo, transferAndDeleteStand } from "../api/standApi";

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
  const [delTarget, setDelTarget] = useState(null); // empty-stand simple delete
  const [delInfoLoading, setDelInfoLoading] = useState(false);
  // transfer-and-delete modal
  const [xfer, setXfer] = useState(null); // { stand, source, targets }
  const [xferTo, setXferTo] = useState("");

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

  // Smart delete: empty stand → confirm; stand with stock → transfer-and-delete.
  const onDeleteClick = async (s) => {
    setDelInfoLoading(true);
    try {
      const info = await getStandDeleteInfo(s.id);
      if ((info.source?.itemCount || 0) === 0) {
        setDelTarget(s);
      } else {
        const rec = [...(info.targets || [])].sort((a, b) => a.itemCount - b.itemCount)[0];
        setXfer({ stand: s, source: info.source, targets: info.targets || [] });
        setXferTo(rec ? String(rec.standNumber) : "");
      }
    } catch (e) {
      toast(errMsg(e, "Failed to check stand stock"), false);
    } finally { setDelInfoLoading(false); }
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    setBusy(true);
    try {
      await deleteStand(delTarget.id);
      toast(`✅ Stand #${delTarget.standNumber} deleted successfully`);
      setDelTarget(null);
      load();
    } catch (e) {
      toast(errMsg(e, "Unable to delete stand"), false);
      setDelTarget(null);
    } finally { setBusy(false); }
  };

  const confirmTransferDelete = async () => {
    if (!xfer) return;
    const to = parseInt(xferTo, 10);
    if (!Number.isInteger(to) || to < 1) { toast("Please select a destination stand.", false); return; }
    setBusy(true);
    try {
      const r = await transferAndDeleteStand(xfer.stand.id, to);
      toast(`✅ ${r.moved} stock item${r.moved !== 1 ? "s" : ""} moved to Stand #${r.to}. Stand #${r.from} deleted successfully.`);
      setXfer(null); setXferTo("");
      load();
    } catch (e) {
      toast(errMsg(e, "Unable to transfer & delete stand"), false);
    } finally { setBusy(false); }
  };

  const total = stands.length;
  const active = stands.filter(s => s.isActive).length;

  const card = { background: "#111B35", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
  const inp = { background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 9, height: 40, padding: "0 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", width: "100%" };
  // Compact input/label for the mobile add-form.
  const mInp = { ...inp, height: isMobile ? 38 : 40, fontSize: isMobile ? 13 : 14, borderRadius: isMobile ? 8 : 9 };
  const mLbl = { ...lbl, marginBottom: isMobile ? 3 : 5, fontSize: isMobile ? 10.5 : 11 };
  const btn = (bg, col, bd) => ({ height: 36, padding: "0 16px", borderRadius: 8, background: bg, color: col, border: bd || "none", fontSize: 13, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 });
  // Compact mobile action button — equal-width, single row, no wrap.
  const mbtn = (bg, col, bd) => ({ flex: 1, minWidth: 0, height: 32, padding: "0 4px", borderRadius: 7, background: bg, color: col, border: bd || "none", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", justifyContent: "center", gap: 3, overflow: "hidden" });
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
        <div style={{ ...card, padding: isMobile ? "12px 14px" : "16px 20px", marginBottom: isMobile ? 10 : 16 }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "#fff" }}>🗄 Stand Management</h2>
          <p style={{ margin: isMobile ? "2px 0 10px" : "2px 0 12px", fontSize: isMobile ? 11.5 : 12.5, color: "#7180A6", lineHeight: 1.4 }}>
            {isMobile ? "Only these stands are selectable in Manage Stock, Transfers & Remnants." : "Define the physical stands where stock can be stored. Only these stands are selectable in Manage Stock, Transfers, and Remnant Storage."}
          </p>
          <div style={{ display: isMobile ? "grid" : "flex", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : undefined, gap: isMobile ? 8 : 12, flexWrap: isMobile ? undefined : "wrap" }}>
            {[{ l: "Total", v: total, c: "#4F5DFF" }, { l: "Active", v: active, c: "#37E3A5" }, { l: "Inactive", v: total - active, c: "#FFB95E" }].map(x => (
              <div key={x.l} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: isMobile ? "7px 4px" : "10px 18px", textAlign: "center" }}>
                <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: x.c, lineHeight: 1.1 }}>{x.v}</div>
                <div style={{ fontSize: isMobile ? 9 : 10.5, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.04em" }}>{x.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Add stand */}
        <div style={{ ...card, padding: isMobile ? "12px 14px" : "16px 20px", marginBottom: isMobile ? 10 : 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: isMobile ? 8 : 10 }}>+ Add Stand</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "120px 1fr 1fr auto", gap: isMobile ? 8 : 10, alignItems: "end" }}>
            <div><div style={mLbl}>Stand No *</div><input type="number" min="1" step="1" value={num} onChange={e => setNum(e.target.value)} style={mInp} placeholder="e.g. 6" /></div>
            <div><div style={mLbl}>Name</div><input value={name} onChange={e => setName(e.target.value)} style={mInp} placeholder="e.g. Wall" /></div>
            <div style={{ gridColumn: isMobile ? "1 / -1" : "auto" }}><div style={mLbl}>Description</div><input value={desc} onChange={e => setDesc(e.target.value)} style={mInp} placeholder="Notes" /></div>
            <button onClick={handleAdd} disabled={busy} style={{ ...btn("#4F5DFF", "#fff"), ...(isMobile ? { gridColumn: "1 / -1", height: 38 } : {}) }}>Add</button>
          </div>
        </div>

        {/* List */}
        <div style={{ ...card, overflow: "hidden" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#7180A6" }}>Loading…</div>
          ) : stands.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#7180A6" }}>No stands yet. Add one above.</div>
          ) : isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12 }}>
              {stands.map(s => (
                <div key={s.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, background: "rgba(255,255,255,0.03)", padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: s.standName ? 2 : 9 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Stand #{s.standNumber}</span>
                    <span style={{ padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: s.isActive ? "rgba(55,227,165,0.15)" : "rgba(255,185,94,0.15)", color: s.isActive ? "#37E3A5" : "#FFB95E" }}>{s.isActive ? "Active" : "Inactive"}</span>
                  </div>
                  {s.standName && <div style={{ fontSize: 12, color: "#7180A6", marginBottom: 9 }}>{s.standName}</div>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
                    <button onClick={() => setEdit({ ...s })} style={mbtn("rgba(79,93,255,0.15)", "#818CF8", "1px solid rgba(79,93,255,0.3)")}>✏ Edit</button>
                    <button onClick={() => toggleActive(s)} style={mbtn("rgba(255,255,255,0.07)", "#A9B3D1", "1px solid rgba(255,255,255,0.12)")}>{s.isActive ? "⏸ Disable" : "▶ Enable"}</button>
                    <button onClick={() => onDeleteClick(s)} disabled={delInfoLoading} style={mbtn("rgba(255,107,129,0.12)", "#FF6B81", "1px solid rgba(255,107,129,0.3)")}>🗑 Delete</button>
                  </div>
                </div>
              ))}
            </div>
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
                          <button onClick={() => onDeleteClick(s)} disabled={delInfoLoading} style={btn("rgba(255,107,129,0.12)", "#FF6B81", "1px solid rgba(255,107,129,0.3)")}>Delete</button>
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

      <ConfirmationModal
        open={!!delTarget}
        type="danger"
        title="Delete Stand"
        message={delTarget
          ? `Are you sure you want to delete Stand #${delTarget.standNumber}?\n\nThis action cannot be undone. Any stock associated with this stand may be affected.`
          : ""}
        confirmText="Delete Stand"
        cancelText="Cancel"
        loading={busy}
        onConfirm={confirmDelete}
        onCancel={() => !busy && setDelTarget(null)}
      />

      {/* Transfer-and-delete modal (stand has stock) */}
      {xfer && (() => {
        const recommended = [...(xfer.targets || [])].sort((a, b) => a.itemCount - b.itemCount)[0];
        return (
          <div onClick={() => !busy && setXfer(null)} style={{ position: "fixed", inset: 0, zIndex: 20050, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto", background: "rgba(5,11,31,0.62)", backdropFilter: "blur(6px)" }}>
            <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "linear-gradient(180deg, rgba(23,33,60,0.98), rgba(17,27,53,0.98))", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, boxShadow: "0 24px 70px rgba(0,0,0,0.6)" }}>
              <div style={{ padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>↪ Transfer Stock Before Deletion</div>
                  <div style={{ fontSize: 12.5, color: "#7180A6", marginTop: 2 }}>Stand #{xfer.source.standNumber} contains stock and cannot be deleted directly.</div>
                </div>
                <button onClick={() => setXfer(null)} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "none", color: "#A9B3D1", cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ padding: "18px 20px" }}>
                {/* Stock summary */}
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  {[{ l: "Current Stand", v: `#${xfer.source.standNumber}`, c: "#FF6B81" }, { l: "Stock Items", v: xfer.source.itemCount, c: "#FFB95E" }, { l: "Total Qty", v: xfer.source.totalQty, c: "#818CF8" }].map(x => (
                    <div key={x.l} style={{ flex: 1, textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 8px" }}>
                      <div style={{ fontSize: 19, fontWeight: 800, color: x.c }}>{x.v}</div>
                      <div style={{ fontSize: 10, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{x.l}</div>
                    </div>
                  ))}
                </div>

                {xfer.targets.length === 0 ? (
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,107,129,0.1)", border: "1px solid rgba(255,107,129,0.3)", color: "#FF6B81", fontSize: 13 }}>
                    No other active stand available. Add or enable another stand first.
                  </div>
                ) : (
                  <>
                    {recommended && (
                      <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(55,227,165,0.08)", border: "1px solid rgba(55,227,165,0.3)" }}>
                        <span style={{ fontSize: 12.5, color: "#37E3A5", fontWeight: 700 }}>★ Recommended: Stand #{recommended.standNumber}</span>
                        <span style={{ fontSize: 11.5, color: "#7180A6", marginLeft: 6 }}>— least loaded ({recommended.itemCount} item{recommended.itemCount !== 1 ? "s" : ""})</span>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "#A9B3D1", fontWeight: 600, marginBottom: 6 }}>Transfer To</div>
                    <select value={xferTo} onChange={e => setXferTo(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 9, height: 42, padding: "0 12px", color: "#fff", fontSize: 14, outline: "none", marginBottom: 12 }}>
                      <option value="">Select destination stand…</option>
                      {xfer.targets.map(tg => (
                        <option key={tg.standNumber} value={tg.standNumber}>
                          Stand #{tg.standNumber}{tg.standName ? ` (${tg.standName})` : ""} — {tg.itemCount} item{tg.itemCount !== 1 ? "s" : ""}, qty {tg.totalQty}
                        </option>
                      ))}
                    </select>
                    {/* Load table */}
                    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden", marginBottom: 4 }}>
                      <div style={{ display: "flex", padding: "7px 12px", background: "rgba(255,255,255,0.04)", fontSize: 10.5, fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        <span style={{ flex: 1 }}>Stand</span><span style={{ width: 70, textAlign: "right" }}>Items</span><span style={{ width: 70, textAlign: "right" }}>Qty</span>
                      </div>
                      {xfer.targets.map(tg => (
                        <div key={tg.standNumber} style={{ display: "flex", padding: "7px 12px", fontSize: 12.5, color: "#E2E8F0", borderTop: "1px solid rgba(255,255,255,0.05)", background: String(tg.standNumber) === xferTo ? "rgba(79,93,255,0.1)" : "transparent" }}>
                          <span style={{ flex: 1 }}>#{tg.standNumber}{tg.standName ? ` · ${tg.standName}` : ""}</span>
                          <span style={{ width: 70, textAlign: "right" }}>{tg.itemCount}</span>
                          <span style={{ width: 70, textAlign: "right" }}>{tg.totalQty}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setXfer(null)} disabled={busy} style={btn("rgba(255,255,255,0.08)", "#A9B3D1", "1px solid rgba(255,255,255,0.12)")}>Cancel</button>
                <button onClick={confirmTransferDelete} disabled={busy || !xferTo || xfer.targets.length === 0}
                  style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#FF6B81,#E0556A)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: (busy || !xferTo) ? "not-allowed" : "pointer", opacity: (busy || !xferTo || xfer.targets.length === 0) ? 0.5 : 1, display: "flex", alignItems: "center", gap: 8 }}>
                  {busy && <span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
                  {busy ? "Transferring…" : "Transfer & Delete Stand"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </PageWrapper>
  );
}

const lbl = { fontSize: 11, color: "#A9B3D1", fontWeight: 600, marginBottom: 5 };
