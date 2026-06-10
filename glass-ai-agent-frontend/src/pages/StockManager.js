import { useState, useEffect } from "react";
import api from "../api/api";
import ConfirmModal from "../components/ConfirmModal";
import GlassTypeManager from "../components/GlassTypeManager";
import { useGlassTypes } from "../api/glassTypeApi";
import { useStands } from "../api/standApi";
import { hasPermission } from "../utils/permissions";
import "../styles/design-system.css";

function StockManager() {
  const [glassType, setGlassType] = useState(""); // New: Glass type dropdown (Plan, Extra Clear, etc.)
  const [thickness, setThickness] = useState(""); // Changed: Thickness (was glassTypeStock)
  const [standNo, setStandNo] = useState("");
  const [quantity, setQuantity] = useState("");
  const [stockMessage, setStockMessage] = useState("");
  const [glassTypeMode, setGlassTypeMode] = useState("SELECT"); // SELECT or MANUAL
  const [manualGlassType, setManualGlassType] = useState(""); // Manual glass type entry
  const [thicknessMode, setThicknessMode] = useState("SELECT"); // Changed: was glassMode
  const [manualThickness, setManualThickness] = useState("");
  const [thicknessFocused, setThicknessFocused] = useState(false);
  const [height, setHeight] = useState("");
  const [width, setWidth] = useState("");
  const [unit, setUnit] = useState("");
  const [hsnNo, setHsnNo] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [showUndo, setShowUndo] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Glass-type master (dynamic — no hardcoded dropdown values)
  const { names: glassTypeNames, reload: reloadGlassTypes } = useGlassTypes();
  const [showGlassMgr, setShowGlassMgr] = useState(false);

  // Stand master — only valid stands are selectable
  const { standNumbers } = useStands();

  // Default glass type options
  const defaultGlassTypeOptions = [
    "Plain",
    "Extra Clear",
    "Grey Tinted",
    "Brown Tinted",
    "One Way",
    "Star",
    "Karakachi",
    "Bajari",
    "Diomand",
    "Mirror"
  ];

  // Load custom glass types from localStorage
  const [customGlassTypes, setCustomGlassTypes] = useState(() => {
    try {
      const saved = localStorage.getItem("customGlassTypes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Combine default and custom glass types
  const allGlassTypeOptions = [...defaultGlassTypeOptions, ...customGlassTypes];

  // Save custom glass types to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("customGlassTypes", JSON.stringify(customGlassTypes));
    } catch (error) {
      console.error("Failed to save custom glass types:", error);
    }
  }, [customGlassTypes]);

  // Add custom glass type when manual entry is used
  const addCustomGlassType = (type) => {
    if (type && type.trim() && !allGlassTypeOptions.includes(type.trim())) {
      setCustomGlassTypes([...customGlassTypes, type.trim()]);
    }
  };

  // Remove custom glass type
  const removeCustomGlassType = (typeToRemove) => {
    setCustomGlassTypes(customGlassTypes.filter(type => type !== typeToRemove));
    // If the removed type was selected, clear it
    if (glassType === typeToRemove) {
      setGlassType("");
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const updateStock = (action) => {
    setStockMessage("");

    if (!standNo || !quantity || !height || !width) {
      setStockMessage("❌ Please fill all required fields");
      return;
    }

    const standNoValue = Number(standNo);
    if (!Number.isInteger(standNoValue) || standNoValue < 1) {
      setStockMessage("❌ Stand number must be 1 or greater (whole numbers only)");
      return;
    }
    if (standNumbers.length > 0 && !standNumbers.includes(standNoValue)) {
      setStockMessage(`❌ Enter valid stand number. Stand #${standNoValue} does not exist`);
      return;
    }

    const quantityValue = Number(quantity);
    if (!Number.isInteger(quantityValue) || quantityValue < 1) {
      setStockMessage("❌ Enter valid quantity (must be 1 or greater)");
      return;
    }

    if (!unit) {
      setStockMessage("❌ Please select the unit");
      return;
    }

    const finalGlassType = glassTypeMode === "SELECT" ? glassType : (manualGlassType || "").trim();
    if (!finalGlassType) {
      setStockMessage("❌ Please select or enter glass type");
      return;
    }

    if (thicknessMode === "SELECT" && !thickness) {
      setStockMessage("❌ Please select thickness");
      return;
    }

    if (thicknessMode === "MANUAL" && !manualThickness) {
      setStockMessage("❌ Please enter manual thickness");
      return;
    }

    const thicknessValue = thicknessMode === "SELECT"
      ? parseFloat(thickness)
      : parseFloat(manualThickness);

    // Add custom glass type if manual entry was used
    if (glassTypeMode === "MANUAL" && finalGlassType) {
      addCustomGlassType(finalGlassType);
    }

    const payload = {
      standNo: Number(standNo),
      quantity: Number(quantity),
      action,
      glassType: finalGlassType, // New: actual glass type (Plan, Extra Clear, etc.)
      thickness: thicknessValue, // Thickness value
      height,
      width,
      unit,
      hsnNo: hsnNo || null
    };

    setPendingPayload(payload);
    setShowConfirm(true);
  };

  const confirmSaveStock = async () => {
    try {
      await api.post("/api/stock/update", pendingPayload);
      setStockMessage("✅ Stock updated successfully");
      setShowUndo(true);

      // Reset form
      setStandNo("");
      setQuantity("");
      setHeight("");
      setWidth("");
      setManualThickness("");
      setThicknessFocused(false);
      setThickness("");
      setGlassType("");
      setManualGlassType("");
      setHsnNo("");
    } catch (error) {
      const errorData = error.response?.data;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : (errorData?.error || errorData?.message || error.message || "❌ Failed to update stock");
      setStockMessage(errorMessage);
    } finally {
      setShowConfirm(false);
      setPendingPayload(null);
    }
  };

  const undoLastAction = async () => {
    try {
      const res = await api.post("/api/stock/undo");
      const responseMessage = typeof res.data === 'string'
        ? res.data
        : (res.data?.message || "✅ Stock updated successfully");
      setStockMessage(responseMessage);
      setShowUndo(false);
    } catch {
      setStockMessage("❌ Failed to undo last action");
    }
  };

  const getPlaceholder = (dimension, currentUnit) => {
    if (currentUnit === "MM") {
      return dimension === "height" ? "e.g. 26 1/4" : "e.g. 18 3/8";
    } else if (currentUnit === "INCH") {
      return "e.g. 10, 20, 30";
    } else {
      return "e.g. 5, 10, 15";
    }
  };

  // ── Shared dark style tokens ──
  const darkInput = {
    width: "100%",
    height: 44,
    padding: "0 12px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const darkSelect = {
    ...darkInput,
    cursor: "pointer",
  };

  const fieldLabel = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "#7180A6",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 6,
  };

  const sectionCard = {
    background: "rgba(17,27,53,0.9)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  };

  const sectionHeaderRow = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  };

  const formGrid2 = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    gap: 14,
  };

  const formGrid4 = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
    gap: 14,
  };

  // Stand must be a valid, existing stand (from Stand Management). Lenient only
  // if no stands are defined yet (standNumbers empty).
  const standNoNum = Number(standNo);
  const standNoTouched = standNo !== "";
  const standNoInvalid = !standNoTouched
    || !Number.isInteger(standNoNum) || standNoNum < 1
    || (standNumbers.length > 0 && !standNumbers.includes(standNoNum));

  // Quantity (amount to add/remove) must be a whole number ≥ 1. No 0, negatives, blank.
  const quantityNum = Number(quantity);
  const quantityTouched = quantity !== "";
  const quantityInvalid = !quantityTouched || !Number.isInteger(quantityNum) || quantityNum < 1;

  const formInvalid = standNoInvalid || quantityInvalid;

  return (
    <div style={{ padding: "16px 16px 24px", minHeight: "100vh" }}>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Manage Stock
        </h1>
        <p style={{ fontSize: 13, color: "#A9B3D1", margin: 0 }}>
          Add or remove stock from your inventory with precision.
        </p>
      </div>

      {/* SECTION 1: Glass Type & Thickness */}
      <div style={sectionCard}>
        <div style={sectionHeaderRow}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(79,93,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F5DFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Glass Type &amp; Thickness</div>
            <div style={{ fontSize: 11.5, color: "#7180A6" }}>Select glass type, mode, and thickness</div>
          </div>
        </div>

        <div style={formGrid4}>
          {/* Glass Type Mode */}
          <div>
            <label style={fieldLabel}>Glass Type Mode</label>
            <select
              value={glassTypeMode}
              onChange={e => {
                setGlassTypeMode(e.target.value);
                setGlassType("");
                setManualGlassType("");
              }}
              style={darkSelect}
            >
              <option value="SELECT">Select from list</option>
              <option value="MANUAL">Manual entry</option>
            </select>
          </div>

          {/* Glass Type value */}
          {glassTypeMode === "SELECT" ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <label style={fieldLabel}>Glass Type <span style={{ color: "#FF6B81" }}>*</span></label>
                <button
                  type="button"
                  onClick={() => setShowGlassMgr(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(79,93,255,0.12)", border: "1px solid rgba(79,93,255,0.3)", color: "#818CF8", borderRadius: 7, padding: "3px 9px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", marginBottom: 6 }}
                  title="Add, edit or delete glass types"
                >
                  ⚙ Manage
                </button>
              </div>
              <div>
                <select
                  value={glassType}
                  onChange={e => setGlassType(e.target.value)}
                  style={darkSelect}
                  required
                >
                  <option value="">Select glass type</option>
                  {glassTypeNames.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                  {customGlassTypes.length > 0 && (
                    <>
                      <option disabled>--- Custom Types ---</option>
                      {customGlassTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </>
                  )}
                </select>
                {customGlassTypes.length > 0 && (
                  <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ fontSize: 11, color: "#7180A6", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Custom Glass Types:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {customGlassTypes.map((type) => (
                        <span
                          key={type}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "rgba(79,93,255,0.15)", border: "1px solid rgba(79,93,255,0.25)", borderRadius: 6, fontSize: 12, color: "#A9B3D1" }}
                        >
                          {type}
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeCustomGlassType(type); }}
                            style={{ background: "none", border: "none", color: "#FF6B81", cursor: "pointer", padding: 0, marginLeft: 2, fontSize: 13, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
                            title="Remove custom glass type"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label style={fieldLabel}>Manual Glass Type <span style={{ color: "#FF6B81" }}>*</span></label>
              <input
                type="text"
                placeholder="Enter custom glass type"
                value={manualGlassType}
                onChange={e => setManualGlassType(e.target.value)}
                style={darkInput}
                required
              />
              <div style={{ marginTop: 4, fontSize: 11, color: "#7180A6" }}>Will be added to the dropdown after saving</div>
            </div>
          )}

          {/* Thickness Selection Mode */}
          <div>
            <label style={fieldLabel}>Selection Mode</label>
            <select
              value={thicknessMode}
              onChange={e => {
                setThicknessMode(e.target.value);
                setThicknessFocused(false);
              }}
              style={darkSelect}
            >
              <option value="SELECT">Select from list</option>
              <option value="MANUAL">Manual entry</option>
            </select>
          </div>

          {/* Thickness value */}
          {thicknessMode === "SELECT" ? (
            <div>
              <label style={fieldLabel}>Thickness <span style={{ color: "#FF6B81" }}>*</span></label>
              <select
                value={thickness}
                onChange={e => setThickness(e.target.value)}
                style={darkSelect}
                required
              >
                <option value="">Select thickness</option>
                <option value="3.5">3.5 MM</option>
                <option value="4">4 MM</option>
                <option value="5">5 MM</option>
                <option value="6">6 MM</option>
                <option value="8">8 MM</option>
                <option value="10">10 MM</option>
                <option value="12">12 MM</option>
                <option value="15">15 MM</option>
                <option value="19">19 MM</option>
              </select>
            </div>
          ) : (
            <div>
              <label style={fieldLabel}>Manual Thickness (MM) <span style={{ color: "#FF6B81" }}>*</span></label>
              <input
                type="text"
                placeholder="Enter thickness (e.g., 2)"
                value={thicknessFocused ? manualThickness : (manualThickness ? `${manualThickness} MM` : "")}
                onChange={e => {
                  let inputVal = e.target.value;
                  inputVal = inputVal.replace(/mm/gi, '').trim();
                  inputVal = inputVal.replace(/[^\d.]/g, '');
                  setManualThickness(inputVal);
                }}
                onFocus={(e) => {
                  setThicknessFocused(true);
                  let inputVal = e.target.value.replace(/mm/gi, '').trim();
                  inputVal = inputVal.replace(/[^\d.]/g, '');
                  setManualThickness(inputVal);
                }}
                onBlur={(e) => {
                  setThicknessFocused(false);
                  let inputVal = e.target.value.replace(/mm/gi, '').trim();
                  inputVal = inputVal.replace(/[^\d.]/g, '');
                  if (inputVal && !isNaN(parseFloat(inputVal))) {
                    setManualThickness(inputVal);
                  } else if (!inputVal) {
                    setManualThickness("");
                  }
                }}
                style={darkInput}
                required
              />
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Dimensions */}
      <div style={sectionCard}>
        <div style={sectionHeaderRow}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(55,227,165,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#37E3A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Dimensions</div>
            <div style={{ fontSize: 11.5, color: "#7180A6" }}>Enter glass dimensions</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 14 }}>
          <div>
            <label style={fieldLabel}>Unit</label>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value)}
              style={darkSelect}
            >
              <option value="">Select unit</option>
              <option value="MM">MM (Millimeters)</option>
              <option value="INCH">INCH (Inches)</option>
              <option value="FEET">FEET (Feet)</option>
            </select>
          </div>

          <div>
            <label style={fieldLabel}>Height <span style={{ color: "#FF6B81" }}>*</span></label>
            <input
              type="text"
              placeholder={getPlaceholder("height", unit)}
              value={height}
              onChange={e => setHeight(e.target.value)}
              style={darkInput}
              required
            />
          </div>

          <div>
            <label style={fieldLabel}>Width <span style={{ color: "#FF6B81" }}>*</span></label>
            <input
              type="text"
              placeholder={getPlaceholder("width", unit)}
              value={width}
              onChange={e => setWidth(e.target.value)}
              style={darkInput}
              required
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: Stock Details */}
      <div style={sectionCard}>
        <div style={sectionHeaderRow}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,185,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB95E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Stock Details</div>
            <div style={{ fontSize: 11.5, color: "#7180A6" }}>Stand number and quantity</div>
          </div>
        </div>

        <div style={formGrid2}>
          <div>
            <label style={fieldLabel}>Stand <span style={{ color: "#FF6B81" }}>*</span></label>
            <select
              value={standNo}
              onChange={e => setStandNo(e.target.value)}
              style={{ ...darkSelect, border: standNoTouched && standNoInvalid ? "1.5px solid #FF6B81" : darkSelect.border }}
              required
            >
              <option value="">Select stand</option>
              {standNumbers.map(n => (
                <option key={n} value={n}>Stand #{n}</option>
              ))}
            </select>
            {standNumbers.length === 0 && (
              <p style={{ marginTop: 6, color: "#FFB95E", fontSize: 12 }}>
                No stands defined yet. Ask an admin to add stands in Stand Management.
              </p>
            )}
            {standNoTouched && standNoInvalid && standNumbers.length > 0 && (
              <p style={{ marginTop: 6, color: "#FF6B81", fontSize: 12, fontWeight: 500 }}>
                ⚠️ Enter valid stand number. Stand #{standNo} does not exist.
              </p>
            )}
          </div>

          <div>
            <label style={fieldLabel}>Quantity <span style={{ color: "#FF6B81" }}>*</span></label>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Enter quantity"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              style={{ ...darkInput, border: quantityTouched && quantityInvalid ? "1.5px solid #FF6B81" : darkInput.border }}
              required
            />
            {quantityTouched && quantityInvalid && (
              <p style={{ marginTop: 6, color: "#FF6B81", fontSize: 12, fontWeight: 500 }}>
                ⚠️ Quantity must be greater than or equal to 1 (whole numbers only).
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: Additional Information */}
      <div style={sectionCard}>
        <div style={sectionHeaderRow}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(169,179,209,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A9B3D1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Additional Information</div>
            <div style={{ fontSize: 11.5, color: "#7180A6" }}>Optional details for GST</div>
          </div>
        </div>

        <div>
          <label style={fieldLabel}>HSN Code (Optional)</label>
          <input
            type="text"
            placeholder="e.g., 7003, 7004"
            value={hsnNo}
            onChange={e => setHsnNo(e.target.value)}
            style={darkInput}
          />
          <div style={{ marginTop: 4, fontSize: 11, color: "#7180A6" }}>HSN code for GST billing (optional)</div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        {hasPermission("ADD_STOCK") && (
        <button
          onClick={() => updateStock("ADD")}
          disabled={formInvalid}
          style={{ flex: 1, height: 46, borderRadius: 12, background: "rgba(55,227,165,0.15)", border: "1px solid rgba(55,227,165,0.3)", color: "#37E3A5", fontSize: 15, fontWeight: 700, cursor: formInvalid ? "not-allowed" : "pointer", opacity: formInvalid ? 0.45 : 1, fontFamily: "inherit", outline: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Stock
        </button>
        )}
        {hasPermission("EDIT_STOCK") && (
        <button
          onClick={() => updateStock("REMOVE")}
          disabled={formInvalid}
          style={{ flex: 1, height: 46, borderRadius: 12, background: "rgba(255,107,129,0.15)", border: "1px solid rgba(255,107,129,0.3)", color: "#FF6B81", fontSize: 15, fontWeight: 700, cursor: formInvalid ? "not-allowed" : "pointer", opacity: formInvalid ? 0.45 : 1, fontFamily: "inherit", outline: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Remove Stock
        </button>
        )}
      </div>

      {showUndo && (
        <button
          onClick={undoLastAction}
          style={{ width: "100%", height: 42, borderRadius: 12, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#A9B3D1", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", outline: "none", marginBottom: 12 }}
        >
          ↩ Undo Last Action
        </button>
      )}

      {/* Message Display */}
      {stockMessage && (
        <div style={{
          padding: "14px 16px",
          borderRadius: 12,
          background: stockMessage && typeof stockMessage === 'string' && stockMessage.includes("✅") ? "rgba(55,227,165,0.08)" : "rgba(255,107,129,0.08)",
          border: `1px solid ${stockMessage && typeof stockMessage === 'string' && stockMessage.includes("✅") ? "rgba(55,227,165,0.25)" : "rgba(255,107,129,0.25)"}`,
          color: stockMessage && typeof stockMessage === 'string' && stockMessage.includes("✅") ? "#37E3A5" : "#FF6B81",
          fontSize: 13.5,
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>
            {stockMessage.includes("✅") ? "✅" : "❌"}
          </span>
          <span>{stockMessage.replace("✅", "").replace("❌", "").trim()}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        show={showConfirm}
        payload={pendingPayload || {}}
        onCancel={() => setShowConfirm(false)}
        onConfirm={confirmSaveStock}
      />

      <GlassTypeManager
        open={showGlassMgr}
        onClose={() => setShowGlassMgr(false)}
        onChanged={reloadGlassTypes}
      />
    </div>
  );
}

export default StockManager;
