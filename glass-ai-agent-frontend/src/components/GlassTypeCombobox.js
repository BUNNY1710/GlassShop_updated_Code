import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Premium searchable combobox for glass type selection.
 * Props:
 *   options   – string[]   all available glass types
 *   value     – string     currently selected value (or "")
 *   onChange  – fn(string) called with new value ("" = cleared)
 *   placeholder – string
 */
function GlassTypeCombobox({ options = [], value = "", onChange, placeholder = "All glass types" }) {
  const [inputText, setInputText]   = useState("");   // live search text
  const [isOpen, setIsOpen]         = useState(false);
  const [activeIdx, setActiveIdx]   = useState(-1);   // keyboard nav

  const wrapperRef  = useRef(null);
  const inputRef    = useRef(null);
  const listRef     = useRef(null);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setInputText("");
        setActiveIdx(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Scroll active item into view */
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-item]");
    if (items[activeIdx]) {
      items[activeIdx].scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  /* The list shown in the dropdown */
  const filteredOptions = useCallback(() => {
    const q = inputText.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.toLowerCase().includes(q));
  }, [options, inputText]);

  const visibleOptions = filteredOptions();
  /* +1 for the "All Glass Types" row at index 0 */
  const totalItems = 1 + visibleOptions.length;

  /* ── Handlers ── */

  const openAndFocus = () => {
    setInputText("");
    setIsOpen(true);
    setActiveIdx(-1);
  };

  const select = (opt) => {
    onChange(opt);
    setInputText("");
    setIsOpen(false);
    setActiveIdx(-1);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange("");
    setInputText("");
    setIsOpen(false);
    setActiveIdx(-1);
    inputRef.current?.blur();
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    setIsOpen(true);
    setActiveIdx(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) { if (e.key !== "Tab") openAndFocus(); return; }

    if (e.key === "Escape") {
      setIsOpen(false);
      setInputText("");
      setActiveIdx(-1);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, totalItems - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx === 0) { select(""); return; }
      const opt = visibleOptions[activeIdx - 1];
      if (opt) select(opt);
      return;
    }
  };

  /* What the input displays when closed */
  const displayValue = isOpen ? inputText : (value || "");

  /* Highlight matched portion */
  const renderLabel = (text) => {
    const q = inputText.trim().toLowerCase();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: "#eef2ff", color: "#4f46e5", fontWeight: 700, borderRadius: 2 }}>
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div ref={wrapperRef} style={styles.wrapper}>
      {/* ── Trigger / input row ── */}
      <div style={styles.trigger(isOpen, !!value)} onClick={() => !isOpen && openAndFocus()}>
        <input
          ref={inputRef}
          type="text"
          style={styles.input}
          placeholder={value ? "" : placeholder}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={openAndFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Selected value pill */}
        {value && !isOpen && (
          <span style={styles.selectedPill}>{value}</span>
        )}

        {/* Right side: clear OR chevron */}
        <span style={styles.rightSlot}>
          {value ? (
            <button style={styles.clearBtn} onClick={clear} type="button" tabIndex={-1} title="Clear">
              <ClearIcon />
            </button>
          ) : (
            <ChevronIcon open={isOpen} />
          )}
        </span>
      </div>

      {/* ── Dropdown ── */}
      {isOpen && (
        <div ref={listRef} style={styles.dropdown} role="listbox">
          {/* All Glass Types */}
          <div
            data-item
            role="option"
            aria-selected={!value}
            style={styles.option(!value, activeIdx === 0)}
            onMouseDown={() => select("")}
            onMouseEnter={() => setActiveIdx(0)}
          >
            <span style={styles.allIcon}>⊘</span>
            All Glass Types
          </div>

          {visibleOptions.length > 0 && <div style={styles.divider} />}

          {visibleOptions.length === 0 ? (
            <div style={styles.empty}>No glass type found</div>
          ) : (
            visibleOptions.map((opt, i) => (
              <div
                key={opt}
                data-item
                role="option"
                aria-selected={value === opt}
                style={styles.option(value === opt, activeIdx === i + 1)}
                onMouseDown={() => select(opt)}
                onMouseEnter={() => setActiveIdx(i + 1)}
              >
                {renderLabel(opt)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── Inline SVG icons ── */

const ClearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg
    width="14" height="14" viewBox="0 0 14 14" fill="none"
    style={{ transition: "transform 160ms ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
  >
    <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── Styles ── */

const styles = {
  wrapper: {
    position: "relative",
    width: "100%",
    fontFamily: "'Inter', -apple-system, sans-serif",
  },

  trigger: (isOpen, hasValue) => ({
    display: "flex",
    alignItems: "center",
    height: "38px",
    borderRadius: isOpen ? "8px 8px 0 0" : "8px",
    border: isOpen || hasValue ? "1.5px solid #6366f1" : "1.5px solid #e2e8f0",
    background: "#fff",
    boxShadow: isOpen
      ? "0 0 0 3px rgba(99,102,241,0.10)"
      : "0 1px 2px rgba(15,23,42,0.04)",
    cursor: "text",
    overflow: "hidden",
    transition: "border-color 160ms ease, box-shadow 160ms ease",
    paddingLeft: "12px",
    paddingRight: "4px",
    gap: "6px",
  }),

  input: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: "13.5px",
    color: "#0f172a",
    fontFamily: "inherit",
    padding: "0",
    minWidth: 0,
    cursor: "text",
    letterSpacing: "-0.01em",
  },

  selectedPill: {
    flex: 1,
    fontSize: "13.5px",
    color: "#0f172a",
    fontWeight: "500",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    pointerEvents: "none",
    letterSpacing: "-0.01em",
  },

  rightSlot: {
    display: "flex",
    alignItems: "center",
    paddingRight: "8px",
    flexShrink: 0,
    color: "#94a3b8",
  },

  clearBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f1f5f9",
    border: "none",
    borderRadius: "50%",
    width: "22px",
    height: "22px",
    cursor: "pointer",
    color: "#64748b",
    padding: 0,
    transition: "background 120ms ease",
  },

  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "#fff",
    border: "1.5px solid #6366f1",
    borderTop: "1px solid #e8edf2",
    borderRadius: "0 0 10px 10px",
    boxShadow: "0 12px 32px rgba(15,23,42,0.12)",
    zIndex: 9999,
    maxHeight: "232px",
    overflowY: "auto",
    animation: "gtFadeIn 0.12s ease-out",
  },

  option: (selected, highlighted) => ({
    padding: "9px 13px",
    fontSize: "13.5px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: highlighted ? "#f5f3ff" : selected ? "#eef2ff" : "transparent",
    color: selected ? "#4f46e5" : "#1e293b",
    fontWeight: selected ? "600" : "400",
    fontFamily: "inherit",
    userSelect: "none",
    transition: "background 80ms ease",
  }),

  allIcon: {
    fontSize: "13px",
    color: "#94a3b8",
    flexShrink: 0,
  },

  divider: {
    height: "1px",
    background: "#f1f5f9",
    margin: "2px 0",
  },

  empty: {
    padding: "14px 13px",
    fontSize: "13px",
    color: "#94a3b8",
    textAlign: "center",
    fontStyle: "italic",
  },
};

export default GlassTypeCombobox;
