import { useState, useEffect } from "react";
import PageWrapper from "../components/PageWrapper";
import { Card, Button, Input, Select } from "../components/ui";
import api from "../api/api";
import ConfirmModal from "../components/ConfirmModal";
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

  // Default glass type options
  const defaultGlassTypeOptions = [
    "Plan",
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

  return (
    <PageWrapper>
      <div style={getContainerStyle(isMobile)}>
        {/* Header Section */}
        <div style={headerSection}>
          <div>
            <h1 style={pageTitle}>Manage Stock</h1>
            <p style={pageSubtitle}>Add or remove stock from your inventory</p>
          </div>
        </div>

        {/* Main Form Card */}
        <Card style={getFormCardStyle(isMobile)}>
          {/* Glass Type and Thickness Section */}
          <div style={section}>
            <div style={sectionHeader}>
              <div style={sectionIcon}>🔷</div>
              <div>
                <h3 style={sectionTitle}>Glass Type & Thickness</h3>
                <p style={sectionSubtitle}>Select glass type, mode, and thickness</p>
              </div>
            </div>

            <div style={getGlassThicknessGridStyle(isMobile)}>
              <div style={formGroup}>
                <Select
                  label="Glass Type Mode"
                  value={glassTypeMode}
                  onChange={e => {
                    setGlassTypeMode(e.target.value);
                    setGlassType("");
                    setManualGlassType("");
                  }}
                  icon="🔷"
                >
                  <option value="SELECT">Select from list</option>
                  <option value="MANUAL">Manual entry</option>
                </Select>
              </div>

              {glassTypeMode === "SELECT" ? (
                <div style={formGroup}>
                  <label style={label}>
                    Glass Type <span style={required}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <Select
                      value={glassType}
                      onChange={e => setGlassType(e.target.value)}
                      icon="🔷"
                      required
                    >
                      <option value="">Select glass type</option>
                      {defaultGlassTypeOptions.map((type) => (
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
                    </Select>
                    {customGlassTypes.length > 0 && (
                      <div style={{
                        marginTop: "8px",
                        padding: "8px",
                        backgroundColor: "#f8fafc",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0"
                      }}>
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px", fontWeight: "600" }}>
                          Custom Glass Types:
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {customGlassTypes.map((type) => (
                            <span
                              key={type}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 8px",
                                backgroundColor: "white",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                fontSize: "12px",
                                color: "#374151"
                              }}
                            >
                              {type}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeCustomGlassType(type);
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#ef4444",
                                  cursor: "pointer",
                                  padding: "0",
                                  marginLeft: "4px",
                                  fontSize: "14px",
                                  lineHeight: "1",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
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
                <div style={formGroup}>
                  <Input
                    label="Manual Glass Type"
                    type="text"
                    placeholder="Enter custom glass type"
                    value={manualGlassType}
                    onChange={e => setManualGlassType(e.target.value)}
                    icon="🔷"
                    required
                  />
                  <p style={{ marginTop: "4px", fontSize: "12px", color: "#6b7280" }}>
                    This will be added to the dropdown list after saving
                  </p>
                </div>
              )}

              <div style={formGroup}>
                  <Select
                    label="Selection Mode"
                    value={thicknessMode} 
                    onChange={e => {
                      setThicknessMode(e.target.value);
                      setThicknessFocused(false);
                    }}
                    icon="📏"
                  >
                  <option value="SELECT">Select from list</option>
                  <option value="MANUAL">Manual entry</option>
                </Select>
              </div>

              {thicknessMode === "SELECT" ? (
                <div style={formGroup}>
                  <Select
                    label="Thickness"
                    value={thickness}
                    onChange={e => setThickness(e.target.value)}
                    icon="📏"
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
                  </Select>
                </div>
              ) : (
                <div style={formGroup}>
                  <Input
                    label="Manual Thickness (MM)"
                    type="text"
                    placeholder="Enter thickness (e.g., 2)"
                    value={thicknessFocused ? manualThickness : (manualThickness ? `${manualThickness} MM` : "")}
                    onChange={e => {
                      let inputVal = e.target.value;
                      // Remove "MM" if user types it, keep only the number
                      inputVal = inputVal.replace(/mm/gi, '').trim();
                      // Extract only numbers and decimal point
                      inputVal = inputVal.replace(/[^\d.]/g, '');
                      setManualThickness(inputVal);
                    }}
                    onFocus={(e) => {
                      // On focus, show just the number (remove MM) so user can edit
                      setThicknessFocused(true);
                      let inputVal = e.target.value.replace(/mm/gi, '').trim();
                      inputVal = inputVal.replace(/[^\d.]/g, '');
                      setManualThickness(inputVal);
                    }}
                    onBlur={(e) => {
                      // On blur (when moving to next field), format with MM if valid number
                      setThicknessFocused(false);
                      let inputVal = e.target.value.replace(/mm/gi, '').trim();
                      inputVal = inputVal.replace(/[^\d.]/g, '');
                      if (inputVal && !isNaN(parseFloat(inputVal))) {
                        setManualThickness(inputVal);
                      } else if (!inputVal) {
                        setManualThickness("");
                      }
                    }}
                    icon="📏"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Dimensions Section */}
          <div style={section}>
            <div style={sectionHeader}>
              <div style={sectionIcon}>📐</div>
              <div>
                <h3 style={sectionTitle}>Dimensions</h3>
                <p style={sectionSubtitle}>Enter glass dimensions</p>
              </div>
            </div>

            <div style={getFormGridStyle(isMobile)}>
              <div style={formGroup}>
                <Select
                  label="Unit"
                  value={unit} 
                  onChange={e => setUnit(e.target.value)}
                  icon="📐"
                >
                  <option value="">Select unit</option>
                  <option value="MM">MM (Millimeters)</option>
                  <option value="INCH">INCH (Inches)</option>
                  <option value="FEET">FEET (Feet)</option>
                </Select>
              </div>

              <div style={formGroup}>
                <Input
                  label="Height"
                  type="text"
                  placeholder={getPlaceholder("height", unit)}
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  icon="📏"
                  required
                />
              </div>

              <div style={formGroup}>
                <Input
                  label="Width"
                  type="text"
                  placeholder={getPlaceholder("width", unit)}
                  value={width}
                  onChange={e => setWidth(e.target.value)}
                  icon="📏"
                  required
                />
              </div>
            </div>
          </div>

          {/* Stock Details Section */}
          <div style={section}>
            <div style={sectionHeader}>
              <div style={sectionIcon}>📦</div>
              <div>
                <h3 style={sectionTitle}>Stock Details</h3>
                <p style={sectionSubtitle}>Stand number and quantity</p>
              </div>
            </div>

            <div style={getFormGridStyle(isMobile)}>
              <div style={formGroup}>
                <Input
                  label="Stand Number"
                  type="number"
                  placeholder="Enter stand number"
                  value={standNo}
                  onChange={e => setStandNo(e.target.value)}
                  icon="🏷️"
                  required
                />
              </div>

              <div style={formGroup}>
                <Input
                  label="Quantity"
                  type="number"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  icon="🔢"
                  required
                />
              </div>
            </div>
          </div>


          {/* Additional Information Section */}
          <div style={section}>
            <div style={sectionHeader}>
              <div style={sectionIcon}>📋</div>
              <div>
                <h3 style={sectionTitle}>Additional Information</h3>
                <p style={sectionSubtitle}>Optional details for GST</p>
              </div>
            </div>

            <div style={formGroup}>
              <Input
                label="HSN Code (Optional)"
                type="text"
                placeholder="e.g., 7003, 7004"
                value={hsnNo}
                onChange={e => setHsnNo(e.target.value)}
                icon="🏷️"
                helperText="HSN code for GST billing (optional)"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={actionsSection}>
            <div style={buttonGroup}>
              <Button
                variant="success"
                size="lg"
                icon="➕"
                fullWidth={isMobile}
                onClick={() => updateStock("ADD")}
                style={{ flex: isMobile ? "1" : "none" }}
              >
                Add Stock
              </Button>

              <Button
                variant="danger"
                size="lg"
                icon="➖"
                fullWidth={isMobile}
                onClick={() => updateStock("REMOVE")}
                style={{ flex: isMobile ? "1" : "none" }}
              >
                Remove Stock
              </Button>
            </div>

            {showUndo && (
              <Button
                variant="outline"
                size="md"
                icon="↩"
                fullWidth
                onClick={undoLastAction}
                style={{ marginTop: "12px" }}
              >
                Undo Last Action
              </Button>
            )}
          </div>

          {/* Message Display */}
          {stockMessage && (
            <div style={getMessageStyle(stockMessage && typeof stockMessage === 'string' && stockMessage.includes("✅"))}>
              <span style={messageIcon}>
                {stockMessage.includes("✅") ? "✅" : "❌"}
              </span>
              <span>{stockMessage.replace("✅", "").replace("❌", "").trim()}</span>
            </div>
          )}
        </Card>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        show={showConfirm}
        payload={pendingPayload || {}}
        onCancel={() => setShowConfirm(false)}
        onConfirm={confirmSaveStock}
      />
    </PageWrapper>
  );
}

export default StockManager;

/* ================= STYLES ================= */

const getContainerStyle = (isMobile) => ({
  maxWidth: "1000px",
  margin: "0 auto",
  padding: isMobile ? "16px 12px" : "20px 16px",
  width: "100%",
});

const headerSection = {
  marginBottom: "16px",
};

const pageTitle = {
  fontSize: "26px",
  fontWeight: "800",
  color: "#0f172a",
  margin: "0 0 8px 0",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

const pageSubtitle = {
  fontSize: "16px",
  color: "#64748b",
  margin: "0",
  fontWeight: "400",
};

const getFormCardStyle = (isMobile) => ({
  padding: isMobile ? "16px" : "24px",
});

const section = {
  marginBottom: "20px",
  paddingBottom: "16px",
  borderBottom: "1px solid #e2e8f0",
};

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "14px",
};

const sectionIcon = {
  width: "36px",
  height: "36px",
  borderRadius: "8px",
  background: "linear-gradient(135deg, #667eea15, #764ba225)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  flexShrink: 0,
};

const sectionTitle = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 4px 0",
};

const sectionSubtitle = {
  fontSize: "14px",
  color: "#64748b",
  margin: "0",
  fontWeight: "400",
};

const getFormGridStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "20px",
});

const getGlassThicknessGridStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
  gap: "20px",
});

const formGroup = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const label = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#475569",
  marginBottom: "4px",
};

const required = {
  color: "#ef4444",
  marginLeft: "2px",
};


const actionsSection = {
  marginTop: "16px",
  paddingTop: "16px",
  borderTop: "2px solid #e2e8f0",
};

const buttonGroup = {
  display: "flex",
  gap: "16px",
  flexWrap: "wrap",
};

const getMessageStyle = (isSuccess) => ({
  marginTop: "24px",
  padding: "16px 20px",
  borderRadius: "12px",
  background: isSuccess 
    ? "rgba(34, 197, 94, 0.1)" 
    : "rgba(239, 68, 68, 0.1)",
  border: `1.5px solid ${isSuccess ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
  color: isSuccess ? "#16a34a" : "#dc2626",
  fontSize: "14px",
  fontWeight: "500",
  display: "flex",
  alignItems: "center",
  gap: "12px",
});

const messageIcon = {
  fontSize: "20px",
  flexShrink: 0,
};
