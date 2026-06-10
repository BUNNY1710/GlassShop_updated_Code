import { PERMISSION_GROUPS } from "../utils/permissions";

/**
 * Grouped permission checkboxes. Controlled.
 *   value    — array of permission keys
 *   onChange — (nextArray) => void
 */
export default function PermissionSelector({ value = [], onChange }) {
  const set = new Set(value);

  const toggle = (key) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange([...next]);
  };

  const toggleGroup = (keys, allOn) => {
    const next = new Set(set);
    keys.forEach(k => (allOn ? next.delete(k) : next.add(k)));
    onChange([...next]);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
      {PERMISSION_GROUPS.map(group => {
        const keys = group.permissions.map(p => p.key);
        const allOn = keys.every(k => set.has(k));
        const someOn = keys.some(k => set.has(k));
        return (
          <div key={group.module} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{group.module}</span>
              <button
                type="button"
                onClick={() => toggleGroup(keys, allOn)}
                style={{ background: "none", border: "none", color: someOn ? "#FF6B81" : "#818CF8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
              >
                {allOn ? "Clear" : "All"}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {group.permissions.map(p => (
                <label key={p.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#A9B3D1", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={set.has(p.key)}
                    onChange={() => toggle(p.key)}
                    style={{ width: 15, height: 15, accentColor: "#4F5DFF", flexShrink: 0 }}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
