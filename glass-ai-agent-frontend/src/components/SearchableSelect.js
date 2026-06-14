import { useState, useRef, useEffect } from "react";

// Lightweight searchable dropdown (dark theme, mobile-friendly). Strict select:
// the value is always one of `options`. Type to filter; click to choose.
export default function SearchableSelect({
  options = [], value = "", onChange, placeholder = "Select…", isMobile = false, id,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = query.trim()
    ? options.filter(o => o.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const inputStyle = {
    width: "100%", padding: isMobile ? "14px 12px" : "12px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(17,27,53,0.6)",
    color: "#fff", fontSize: 16, boxSizing: "border-box", minHeight: 44, outline: "none",
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        id={id}
        type="text"
        value={open ? query : value}
        placeholder={value || placeholder}
        onFocus={(e) => { setOpen(true); setQuery(""); e.target.style.borderColor = "#4F5DFF"; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
        onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
        style={inputStyle}
        autoComplete="off"
      />
      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#7180A6", fontSize: 12 }}>▼</span>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
          maxHeight: 240, overflowY: "auto", background: "rgba(17,27,53,0.99)",
          border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8,
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "10px 12px", color: "#7180A6", fontSize: 13 }}>No match</div>
          ) : filtered.map(opt => (
            <div
              key={opt}
              onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false); setQuery(""); }}
              style={{
                padding: "10px 12px", fontSize: 14, cursor: "pointer",
                color: opt === value ? "#818CF8" : "#E2E8F0",
                background: opt === value ? "rgba(79,93,255,0.12)" : "transparent",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = opt === value ? "rgba(79,93,255,0.12)" : "transparent"; }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
