import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../components/PageWrapper";
import api from "../api/api";
import { useResponsive } from "../hooks/useResponsive";
import { getUserRole } from "../utils/auth";
import { useGlassTypes } from "../api/glassTypeApi";
import GlassTypeManager from "../components/GlassTypeManager";
import "../styles/design-system.css";

function GlassPriceMaster() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [priceMaster, setPriceMaster] = useState([]);
  const [allPriceMaster, setAllPriceMaster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPending, setShowPending] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [glassTypeMode, setGlassTypeMode] = useState("SELECT");
  const [thicknessMode, setThicknessMode] = useState("SELECT");
  const [manualGlassType, setManualGlassType] = useState("");
  const [manualThickness, setManualThickness] = useState("");
  const [thicknessFocused, setThicknessFocused] = useState(false);
  const [formData, setFormData] = useState({
    glassType: "",
    thickness: "",
    purchasePrice: "",
    sellingPrice: ""
  });
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, glassType, thickness }

  // Glass type options (dynamic — from the Glass Type master)
  const { names: defaultGlassTypeOptions, reload: reloadGlassTypes } = useGlassTypes();
  const [showGlassMgr, setShowGlassMgr] = useState(false);

  // Load custom glass types from localStorage (same as Manage Stock)
  const [customGlassTypes, setCustomGlassTypes] = useState(() => {
    try {
      const saved = localStorage.getItem("customGlassTypes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Combine default and custom glass types (reactive to customGlassTypes changes)
  const glassTypeOptions = [...defaultGlassTypeOptions, ...customGlassTypes];

  // Thickness options
  const thicknessOptions = [3.5, 4, 5, 6, 8, 10, 12, 15, 19];

  // Reload custom glass types from localStorage when component mounts
  useEffect(() => {
    try {
      const saved = localStorage.getItem("customGlassTypes");
      if (saved) {
        const parsed = JSON.parse(saved);
        setCustomGlassTypes(parsed);
      }
    } catch (error) {
      console.error("Failed to load custom glass types:", error);
    }
  }, []);

  useEffect(() => {
    // Check if user is admin
    const role = getUserRole();
    if (role !== "ROLE_ADMIN") {
      navigate("/dashboard");
      return;
    }
    loadPriceMaster();
  }, [showPending]);

  const loadPriceMaster = async () => {
    try {
      setLoading(true);
      const params = showPending ? { pending: "true" } : {};
      const res = await api.get("/api/glass-price-master", { params });
      // Sort: pending entries first, then approved entries
      const sortedData = [...res.data].sort((a, b) => {
        if (a.isPending && !b.isPending) return -1;
        if (!a.isPending && b.isPending) return 1;
        return 0;
      });
      setPriceMaster(sortedData);

      // Also load all data for counts
      if (!showPending) {
        const allRes = await api.get("/api/glass-price-master");
        setAllPriceMaster(allRes.data);
      }
    } catch (error) {
      console.error("Error loading price master:", error);
      setMessage("❌ Failed to load price master data");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setShowForm(true);
    setGlassTypeMode("SELECT");
    setThicknessMode("SELECT");
    setManualGlassType("");
    setManualThickness("");
    setThicknessFocused(false);
    setFormData({
      glassType: "",
      thickness: "",
      purchasePrice: "",
      sellingPrice: ""
    });
    setMessage("");
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setShowForm(true);
    // Check if glass type is in the combined list (default + custom from localStorage)
    // Reload custom types first to ensure we have the latest
    const savedCustomTypes = (() => {
      try {
        const saved = localStorage.getItem("customGlassTypes");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    })();
    const allGlassTypes = [...defaultGlassTypeOptions, ...savedCustomTypes];
    const isPredefinedGlassType = allGlassTypes.includes(entry.glassType);
    setGlassTypeMode(isPredefinedGlassType ? "SELECT" : "MANUAL");
    setManualGlassType(isPredefinedGlassType ? "" : entry.glassType);

    // Check if thickness is in the predefined list
    // Compare with tolerance for floating point numbers
    const entryThicknessValue = parseFloat(entry.thickness);
    const matchingThicknessOption = thicknessOptions.find(opt =>
      Math.abs(parseFloat(opt) - entryThicknessValue) < 0.01
    );
    const isPredefinedThickness = matchingThicknessOption !== undefined;
    setThicknessMode(isPredefinedThickness ? "SELECT" : "MANUAL");
    setManualThickness(isPredefinedThickness ? "" : entryThicknessValue.toString());

    // For SELECT mode, use the matching option value (as string to match option value)
    // For MANUAL mode, leave empty (manualThickness will be used)
    const thicknessFormValue = isPredefinedThickness
      ? matchingThicknessOption.toString()
      : "";

    setFormData({
      glassType: isPredefinedGlassType ? entry.glassType : "",
      thickness: thicknessFormValue,
      purchasePrice: entry.purchasePrice ? entry.purchasePrice.toString() : "",
      sellingPrice: entry.sellingPrice ? entry.sellingPrice.toString() : ""
    });
    setMessage("");
  };

  const handleSave = async () => {
    try {
      setMessage("");

      // Get final glass type and thickness values
      const finalGlassType = glassTypeMode === "SELECT"
        ? formData.glassType
        : manualGlassType;
      const finalThickness = thicknessMode === "SELECT"
        ? parseFloat(formData.thickness)
        : parseFloat(manualThickness);

      if (!finalGlassType || !finalThickness || isNaN(finalThickness)) {
        setMessage("❌ Glass type and thickness are required");
        return;
      }

      const payload = {
        glassType: finalGlassType,
        thickness: finalThickness,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : null
      };

      if (editingId) {
        await api.put(`/api/glass-price-master/${editingId}`, payload);
        setMessage("✅ Price master updated successfully");
      } else {
        await api.post("/api/glass-price-master", payload);
        setMessage("✅ Price master added successfully");
      }

      await loadPriceMaster();
      setEditingId(null);
      setShowForm(false);
      setFormData({
        glassType: "",
        thickness: "",
        purchasePrice: "",
        sellingPrice: ""
      });
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || "Failed to save";
      setMessage(`❌ ${errorMsg}`);
    }
  };

  const handleDelete = async (id) => {
    const entry = priceMaster.find(p => p.id === id);
    if (entry) {
      setConfirmDelete({
        id: id,
        glassType: entry.glassType,
        thickness: entry.thickness
      });
    }
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;

    try {
      await api.delete(`/api/glass-price-master/${confirmDelete.id}`);
      setMessage("✅ Entry deleted successfully");
      setConfirmDelete(null);
      await loadPriceMaster();
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || "Failed to delete";
      setMessage(`❌ ${errorMsg}`);
      setConfirmDelete(null);
    }
  };

  const pendingCount = allPriceMaster.filter(p => p.isPending).length;
  const approvedCount = allPriceMaster.filter(p => !p.isPending).length;

  const darkCard = {
    background: "rgba(17,27,53,0.9)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
  };

  const darkInput = {
    width: "100%", padding: "0 12px", height: 44, borderRadius: 10,
    border: "1.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)",
    color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box",
    transition: "border 140ms ease",
  };

  const darkSelect = {
    ...darkInput, cursor: "pointer",
  };

  const darkLabel = {
    display: "block", fontSize: 11, fontWeight: 700, color: "#7180A6",
    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
  };

  const primaryBtn = {
    padding: "9px 18px", borderRadius: 10, border: "none",
    background: "#4F5DFF", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
  };

  const secondaryBtn = {
    padding: "9px 18px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.08)",
    color: "#A9B3D1", fontSize: 13, fontWeight: 500, cursor: "pointer",
  };

  return (
    <PageWrapper>
      <div style={getContainerStyle(isMobile)}>
        {/* Header */}
        <div style={getHeaderSectionStyle(isMobile)}>
          <div>
            <h1 style={{ fontSize: isMobile ? "24px" : "32px", fontWeight: 800, color: "#fff", margin: "0 0 8px 0" }}>
              Glass Price Master
            </h1>
            <p style={{ fontSize: isMobile ? "14px" : "15px", color: "#A9B3D1", margin: 0 }}>
              Manage glass type pricing (Admin only)
            </p>
          </div>
          <div style={getHeaderActionsStyle(isMobile)}>
            <button
              style={{
                padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: !showPending ? "#4F5DFF" : "rgba(255,255,255,0.08)",
                color: !showPending ? "#fff" : "#A9B3D1",
                border: !showPending ? "none" : "1px solid rgba(255,255,255,0.12)",
              }}
              onClick={() => { setShowPending(false); loadPriceMaster(); }}
            >
              All ({priceMaster.length})
            </button>
            <button
              style={{
                padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: showPending ? "#4F5DFF" : "rgba(255,255,255,0.08)",
                color: showPending ? "#fff" : "#A9B3D1",
                border: showPending ? "none" : "1px solid rgba(255,255,255,0.12)",
              }}
              onClick={() => { setShowPending(true); loadPriceMaster(); }}
            >
              Pending ({pendingCount})
            </button>
            <button
              style={{ padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "rgba(79,93,255,0.12)", color: "#818CF8", border: "1px solid rgba(79,93,255,0.3)" }}
              onClick={() => setShowGlassMgr(true)}
            >
              ⚙ Manage Glass Types
            </button>
            <button style={primaryBtn} onClick={handleAdd}>
              ➕ Add New
            </button>
          </div>
        </div>

        {/* Form Card */}
        {showForm && (
          <div style={{ ...darkCard, padding: isMobile ? "24px" : "32px", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", margin: "0 0 24px 0" }}>
              {editingId ? "Edit Price Entry" : "Add New Price Entry"}
            </h3>
            <div style={getFormGridStyle(isMobile)}>
              {/* Glass Type Selection Mode */}
              <div>
                <label style={darkLabel}>Glass Type Mode</label>
                <select
                  style={darkSelect}
                  value={glassTypeMode}
                  onChange={e => {
                    setGlassTypeMode(e.target.value);
                    if (e.target.value === "SELECT") {
                      setManualGlassType("");
                    } else {
                      setFormData({ ...formData, glassType: "" });
                    }
                  }}
                >
                  <option value="SELECT" style={{ background: "#0b1226" }}>Select from list</option>
                  <option value="MANUAL" style={{ background: "#0b1226" }}>Manual entry</option>
                </select>
              </div>

              {/* Glass Type - Select or Manual */}
              {glassTypeMode === "SELECT" ? (
                <div>
                  <label style={darkLabel}>Glass Type *</label>
                  <select
                    style={darkSelect}
                    value={formData.glassType}
                    onChange={e => setFormData({ ...formData, glassType: e.target.value })}
                    required
                  >
                    <option value="" style={{ background: "#0b1226" }}>Select glass type</option>
                    {glassTypeOptions.map(type => (
                      <option key={type} value={type} style={{ background: "#0b1226" }}>{type}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label style={darkLabel}>Manual Glass Type *</label>
                  <input
                    style={darkInput}
                    type="text"
                    placeholder="Enter custom glass type"
                    value={manualGlassType}
                    onChange={e => setManualGlassType(e.target.value)}
                    required
                    onFocus={e => e.target.style.borderColor = "rgba(79,93,255,0.6)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                  />
                </div>
              )}

              {/* Thickness Selection Mode */}
              <div>
                <label style={darkLabel}>Thickness Mode</label>
                <select
                  style={darkSelect}
                  value={thicknessMode}
                  onChange={e => {
                    setThicknessMode(e.target.value);
                    setThicknessFocused(false);
                    if (e.target.value === "SELECT") {
                      setManualThickness("");
                    } else {
                      setFormData({ ...formData, thickness: "" });
                    }
                  }}
                >
                  <option value="SELECT" style={{ background: "#0b1226" }}>Select from list</option>
                  <option value="MANUAL" style={{ background: "#0b1226" }}>Manual entry</option>
                </select>
              </div>

              {/* Thickness - Select or Manual */}
              {thicknessMode === "SELECT" ? (
                <div>
                  <label style={darkLabel}>Thickness (MM) *</label>
                  <select
                    style={darkSelect}
                    value={formData.thickness}
                    onChange={e => setFormData({ ...formData, thickness: e.target.value })}
                    required
                  >
                    <option value="" style={{ background: "#0b1226" }}>Select thickness</option>
                    {thicknessOptions.map(th => (
                      <option key={th} value={th} style={{ background: "#0b1226" }}>{th} MM</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label style={darkLabel}>Manual Thickness (MM) *</label>
                  <input
                    style={darkInput}
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
                      e.target.style.borderColor = "rgba(79,93,255,0.6)";
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
                      e.target.style.borderColor = "rgba(255,255,255,0.1)";
                    }}
                    required
                  />
                </div>
              )}

              <div>
                <label style={darkLabel}>Purchase Price (₹)</label>
                <input
                  style={darkInput}
                  type="number"
                  placeholder="Enter purchase price"
                  value={formData.purchasePrice}
                  onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
                  min="0"
                  step="0.01"
                  onFocus={e => e.target.style.borderColor = "rgba(79,93,255,0.6)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
              </div>

              <div>
                <label style={darkLabel}>Selling Price (₹)</label>
                <input
                  style={darkInput}
                  type="number"
                  placeholder="Enter selling price"
                  value={formData.sellingPrice}
                  onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })}
                  min="0"
                  step="0.01"
                  onFocus={e => e.target.style.borderColor = "rgba(79,93,255,0.6)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
              </div>
            </div>

            <div style={getFormActionsStyle(isMobile)}>
              <button style={primaryBtn} onClick={handleSave}>
                {editingId ? "Update" : "Add"} Entry
              </button>
              <button style={secondaryBtn} onClick={() => {
                setEditingId(null);
                setShowForm(false);
                setGlassTypeMode("SELECT");
                setThicknessMode("SELECT");
                setManualGlassType("");
                setManualThickness("");
                setThicknessFocused(false);
                setFormData({ glassType: "", thickness: "", purchasePrice: "", sellingPrice: "" });
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div style={{
            padding: "16px 20px", borderRadius: 12, marginBottom: "24px",
            background: message.includes("✅") ? "rgba(55,227,165,0.1)" : "rgba(255,107,129,0.1)",
            border: `1.5px solid ${message.includes("✅") ? "rgba(55,227,165,0.3)" : "rgba(255,107,129,0.3)"}`,
            color: message.includes("✅") ? "#37E3A5" : "#FF6B81",
            fontSize: "14px", fontWeight: "500",
          }}>
            {message}
          </div>
        )}

        {/* Price Master Table */}
        <div style={{ ...darkCard, background: "#111B35", overflow: "hidden", padding: isMobile ? "16px" : "0" }}>
          {loading ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#7180A6", fontSize: "16px" }}>Loading...</div>
          ) : priceMaster.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: "64px", marginBottom: "16px", opacity: 0.3 }}>💰</div>
              <p style={{ color: "#A9B3D1", fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0" }}>
                {showPending ? "No pending entries" : "No price entries found"}
              </p>
              <p style={{ color: "#7180A6", fontSize: "14px", margin: "0" }}>
                {showPending ? "All entries have been approved" : "Add new entries to get started"}
              </p>
            </div>
          ) : isMobile ? (
            // Mobile: Card-based layout
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {priceMaster.map((entry) => (
                <div key={entry.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Glass Type</div>
                      <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#fff", margin: "0 0 4px 0" }}>{entry.glassType || <span style={{ color: "#7180A6", fontStyle: "italic", fontWeight: 400 }}>—</span>}</h3>
                      <p style={{ fontSize: "14px", color: "#7180A6", margin: "0" }}>
                        {entry.thickness ? `${parseFloat(entry.thickness).toFixed(2)} MM` : "—"}
                      </p>
                    </div>
                    <span style={getStatusBadgeStyle(entry.isPending)}>
                      {entry.isPending ? "⏳ Pending" : "✅ Approved"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "13px", color: "#7180A6", fontWeight: "500" }}>Purchase Price:</span>
                      <span style={{ fontSize: "14px", color: "#fff", fontWeight: "600", textAlign: "right" }}>
                        {entry.purchasePrice
                          ? `₹${parseFloat(entry.purchasePrice).toFixed(2)}`
                          : <span style={{color: "#7180A6"}}>—</span>}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "13px", color: "#7180A6", fontWeight: "500" }}>Selling Price:</span>
                      <span style={{ fontSize: "14px", color: "#37E3A5", fontWeight: "600", textAlign: "right" }}>
                        {entry.sellingPrice
                          ? `₹${parseFloat(entry.sellingPrice).toFixed(2)}`
                          : <span style={{color: "#7180A6"}}>—</span>}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <button
                      style={{ ...secondaryBtn, fontSize: 12, padding: "7px 14px" }}
                      onClick={() => handleEdit(entry)}
                    >✏️ Edit</button>
                    <button
                      style={{ padding: "7px 14px", borderRadius: 10, background: "rgba(255,107,129,0.15)", color: "#FF6B81", border: "1px solid rgba(255,107,129,0.3)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      onClick={() => handleDelete(entry.id)}
                    >🗑️ Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Desktop: Table layout
            <div style={{ overflowX: "auto", width: "100%", background: "#111B35" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Glass Type", "Thickness", "Purchase Price", "Selling Price", "Status", "Actions"].map(h => (
                      <th key={h} style={{
                        padding: "10px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 700,
                        color: "#7180A6", background: "rgba(255,255,255,0.04)",
                        borderBottom: "1px solid rgba(255,255,255,0.07)",
                        textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {priceMaster.map((entry) => (
                    <tr key={entry.id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#111B35" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#0A0F1E"}
                      onMouseLeave={e => e.currentTarget.style.background = "#111B35"}>
                      <td style={{ padding: "11px 14px", color: "#E2E8F0", fontSize: 13, fontWeight: 700 }}>{entry.glassType || <span style={{ color: "#7180A6", fontStyle: "italic" }}>—</span>}</td>
                      <td style={{ padding: "11px 14px", color: "#A9B3D1", fontSize: 13 }}>
                        {entry.thickness ? `${parseFloat(entry.thickness).toFixed(2)} MM` : "—"}
                      </td>
                      <td style={{ padding: "11px 14px", color: "#A9B3D1", fontSize: 13 }}>
                        {entry.purchasePrice
                          ? `₹${parseFloat(entry.purchasePrice).toFixed(2)}`
                          : <span style={{color: "#7180A6"}}>—</span>}
                      </td>
                      <td style={{ padding: "11px 14px", color: "#37E3A5", fontSize: 13, fontWeight: 600 }}>
                        {entry.sellingPrice
                          ? `₹${parseFloat(entry.sellingPrice).toFixed(2)}`
                          : <span style={{color: "#7180A6"}}>—</span>}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={getStatusBadgeStyle(entry.isPending)}>
                          {entry.isPending ? "⏳ Pending" : "✅ Approved"}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            style={{ ...secondaryBtn, fontSize: 12, padding: "6px 12px", height: "auto" }}
                            onClick={() => handleEdit(entry)}
                          >✏️ Edit</button>
                          <button
                            style={{ padding: "6px 12px", borderRadius: 10, background: "rgba(255,107,129,0.15)", color: "#FF6B81", border: "1px solid rgba(255,107,129,0.3)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                            onClick={() => handleDelete(entry.id)}
                          >🗑️ Delete</button>
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

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10004,
            padding: isMobile ? "15px" : "20px",
          }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            style={{
              background: "rgba(17,27,53,0.98)",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: isMobile ? "25px" : "35px",
              borderRadius: "16px",
              maxWidth: "500px",
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: "20px", textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "15px" }}>🗑️</div>
              <h2 style={{ margin: 0, color: "#fff", fontSize: isMobile ? "20px" : "24px", fontWeight: "700", marginBottom: "10px" }}>
                Delete Entry?
              </h2>
              <p style={{ margin: "8px 0 0 0", color: "#A9B3D1", fontSize: "14px", lineHeight: "1.6" }}>
                Are you sure you want to permanently delete this entry? This action cannot be undone.
              </p>
              <div style={{ marginTop: "15px", padding: "12px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", textAlign: "left", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: "13px", color: "#7180A6", marginBottom: "4px" }}>Entry Details:</div>
                <div style={{ fontSize: "14px", color: "#fff", fontWeight: "600" }}>
                  {confirmDelete.glassType} - {confirmDelete.thickness} MM
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "12px" }}>
              <button
                onClick={confirmDeleteAction}
                style={{
                  flex: 1, padding: "12px 24px",
                  background: "rgba(255,107,129,0.15)", color: "#FF6B81",
                  border: "1px solid rgba(255,107,129,0.3)",
                  borderRadius: "8px", cursor: "pointer",
                  fontSize: "14px", fontWeight: "600", transition: "all 0.2s",
                }}
                onMouseOver={(e) => { e.target.style.background = "rgba(255,107,129,0.25)"; }}
                onMouseOut={(e) => { e.target.style.background = "rgba(255,107,129,0.15)"; }}
              >
                🗑️ Yes, Delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  flex: 1, padding: "12px 24px",
                  background: "rgba(255,255,255,0.08)", color: "#A9B3D1",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "8px", cursor: "pointer",
                  fontSize: "14px", fontWeight: "500", transition: "all 0.2s",
                }}
                onMouseOver={(e) => (e.target.style.background = "rgba(255,255,255,0.12)")}
                onMouseOut={(e) => (e.target.style.background = "rgba(255,255,255,0.08)")}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <GlassTypeManager
        open={showGlassMgr}
        onClose={() => setShowGlassMgr(false)}
        onChanged={reloadGlassTypes}
      />
    </PageWrapper>
  );
}

export default GlassPriceMaster;

/* ================= STYLES ================= */

const getContainerStyle = (isMobile) => ({
  maxWidth: "1400px",
  margin: "0 auto",
  padding: isMobile ? "24px 16px" : "40px 24px",
  width: "100%",
});

const getHeaderSectionStyle = (isMobile) => ({
  display: "flex",
  flexDirection: isMobile ? "column" : "row",
  justifyContent: "space-between",
  alignItems: isMobile ? "flex-start" : "flex-start",
  marginBottom: isMobile ? "24px" : "32px",
  gap: isMobile ? "16px" : "16px",
});

const getHeaderActionsStyle = (isMobile) => ({
  display: "flex",
  flexDirection: isMobile ? "column" : "row",
  gap: isMobile ? "8px" : "12px",
  width: isMobile ? "100%" : "auto",
});

const getFormGridStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
  gap: isMobile ? "16px" : "20px",
  marginBottom: "24px",
});

const getFormActionsStyle = (isMobile) => ({
  display: "flex",
  flexDirection: isMobile ? "column" : "row",
  gap: "12px",
  width: "100%",
});

const getStatusBadgeStyle = (isPending) => ({
  padding: "3px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "700",
  background: isPending ? "rgba(255,185,94,0.15)" : "rgba(55,227,165,0.15)",
  color: isPending ? "#FFB95E" : "#37E3A5",
  border: `1px solid ${isPending ? "rgba(255,185,94,0.3)" : "rgba(55,227,165,0.3)"}`,
  whiteSpace: "nowrap",
});
