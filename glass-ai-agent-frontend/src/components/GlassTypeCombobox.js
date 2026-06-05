import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Premium searchable combobox for glass type selection — dark theme.
 * Props:
 *   options     – string[]   all available glass types
 *   value       – string     currently selected value (or "")
 *   onChange    – fn(string) called with new value ("" = cleared)
 *   placeholder – string
 */
function GlassTypeCombobox({ options = [], value = "", onChange, placeholder = "All glass types" }) {
  const [inputText, setInputText] = useState("");   // live search text
  const [isOpen, setIsOpen]       = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);   // keyboard nav

  const wrapperRef = useRef(null);
  const inputRef   = useRef(null);
  const listRef    = useRef(null);

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
        <mark style={{ background: "rgba(79,93,255,0.3)", color: "#fff", fontWeight: 700, borderRadius: 2 }}>
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

      <style>{`
        .glass-combobox-input::placeholder {
          color: rgba(113,128,166,0.7);
        }
        @keyframes gtFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
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
    fontFamily: "'Inter',-apple-system,sans-serif",
  },

  trigger: (isOpen, hasValue) => ({
    display: "flex",
    alignItems: "center",
    height: "40px",
    borderRadius: isOpen ? "10px 10px 0 0" : "10px",
    border: isOpen || hasValue
      ? "1.5px solid rgba(79,93,255,0.6)"
      : "1.5px solid rgba(255,255,255,0.1)",
    background: isOpen
      ? "rgba(255,255,255,0.09)"
      : "rgba(255,255,255,0.06)",
    boxShadow: isOpen
      ? "0 0 0 3px rgba(79,93,255,0.15)"
      : "none",
    cursor: "text",
    overflow: "hidden",
    transition: "border-color 150ms ease, box-shadow 150ms ease, background 150ms ease",
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
    color: "#fff",
    fontFamily: "inherit",
    padding: "0",
    minWidth: 0,
    cursor: "text",
    letterSpacing: "-0.01em",
  },

  selectedPill: {
    flex: 1,
    fontSize: "13.5px",
    color: "#fff",
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
    color: "rgba(113,128,166,0.7)",
  },

  clearBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.1)",
    border: "none",
    borderRadius: "50%",
    width: "22px",
    height: "22px",
    cursor: "pointer",
    color: "#A9B3D1",
    padding: 0,
    transition: "background 120ms ease",
  },

  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "rgba(17,27,53,0.98)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "0 0 12px 12px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    zIndex: 1000,
    maxHeight: "232px",
    overflowY: "auto",
    animation: "gtFadeIn 0.12s ease-out",
  },

  option: (selected, highlighted) => ({
    padding: "9px 12px",
    fontSize: "13px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: selected
      ? "rgba(79,93,255,0.2)"
      : highlighted
        ? "rgba(255,255,255,0.07)"
        : "transparent",
    color: selected || highlighted ? "#fff" : "#A9B3D1",
    fontWeight: selected ? "600" : "400",
    fontFamily: "inherit",
    userSelect: "none",
    transition: "background 80ms ease",
  }),

  allIcon: {
    fontSize: "13px",
    color: "rgba(113,128,166,0.7)",
    flexShrink: 0,
  },

  divider: {
    height: "1px",
    background: "rgba(255,255,255,0.06)",
    margin: "2px 0",
  },

  empty: {
    padding: "12px",
    fontSize: "13px",
    color: "#7180A6",
    textAlign: "center",
  },
};

export default GlassTypeCombobox;
