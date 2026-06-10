import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../components/PageWrapper";
import api from "../api/api";
import { useStands } from "../api/standApi";

function StockTransfer() {
  const navigate = useNavigate();
  const { standNumbers } = useStands();
  const [step, setStep] = useState(1); // 1: Enter source stand, 2: Select stock, 3: Enter destination, 4: Confirm
  const [sourceStand, setSourceStand] = useState("");
  const [destinationStand, setDestinationStand] = useState("");
  const [availableStock, setAvailableStock] = useState([]);
  const [selectedStockIds, setSelectedStockIds] = useState(new Set());
  const [selectedStockItems, setSelectedStockItems] = useState([]);
  const [transferQuantities, setTransferQuantities] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load stock for source stand
  const loadStockForStand = async (standNo) => {
    try {
      setLoading(true);
      setMessage("");
      const response = await api.get("/api/stock/all");
      const allStock = response.data;

      // Filter by stand number and quantity > 0 (exclude items with 0 or null quantity)
      const standStock = allStock.filter(
        (stock) =>
          stock.standNo === parseInt(standNo) &&
          stock.quantity != null &&
          stock.quantity > 0
      );

      if (standStock.length === 0) {
        setMessage("⚠️ No stock available in stand " + standNo);
        setAvailableStock([]);
      } else {
        setAvailableStock(standStock);
        setMessage(`✅ Found ${standStock.length} item(s) in stand ${standNo}`);
      }
    } catch (error) {
      setMessage("❌ Failed to load stock for stand " + standNo);
      setAvailableStock([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle source stand input
  const handleSourceStandSubmit = (e) => {
    e.preventDefault();
    if (!sourceStand || parseInt(sourceStand) <= 0) {
      setMessage("❌ Please enter a valid stand number");
      return;
    }
    loadStockForStand(sourceStand);
    setStep(2);
  };

  // Handle checkbox selection
  const handleCheckboxChange = (stockId, stock) => {
    const newSelectedIds = new Set(selectedStockIds);
    if (newSelectedIds.has(stockId)) {
      newSelectedIds.delete(stockId);
      // Remove from selected items
      setSelectedStockItems(prev => prev.filter(item => item.id !== stockId));
      // Remove quantity
      const newQuantities = { ...transferQuantities };
      delete newQuantities[stockId];
      setTransferQuantities(newQuantities);
    } else {
      newSelectedIds.add(stockId);
      // Add to selected items
      setSelectedStockItems(prev => [...prev, stock]);
      // Set default quantity to full available
      setTransferQuantities(prev => ({
        ...prev,
        [stockId]: stock.quantity.toString()
      }));
    }
    setSelectedStockIds(newSelectedIds);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedStockIds.size === availableStock.length) {
      // Deselect all
      setSelectedStockIds(new Set());
      setSelectedStockItems([]);
      setTransferQuantities({});
    } else {
      // Select all
      const allIds = new Set(availableStock.map(s => s.id));
      setSelectedStockIds(allIds);
      setSelectedStockItems([...availableStock]);
      const quantities = {};
      availableStock.forEach(stock => {
        quantities[stock.id] = stock.quantity.toString();
      });
      setTransferQuantities(quantities);
    }
  };

  // Handle proceed to next step
  const handleProceedToDestination = () => {
    if (selectedStockIds.size === 0) {
      setMessage("❌ Please select at least one stock item");
      return;
    }
    setStep(3);
  };

  // Handle quantity change
  const handleQuantityChange = (stockId, value) => {
    const stock = selectedStockItems.find(s => s.id === stockId);
    if (stock) {
      const numValue = parseInt(value) || 0;
      if (numValue > stock.quantity) {
        setMessage(`❌ Quantity cannot exceed available quantity (${stock.quantity})`);
        return;
      }
      if (numValue < 1) {
        setMessage("❌ Quantity must be at least 1");
        return;
      }
      setTransferQuantities(prev => ({
        ...prev,
        [stockId]: value
      }));
      setMessage("");
    }
  };

  // Handle destination stand submit
  const handleDestinationStandSubmit = (e) => {
    e.preventDefault();
    if (!destinationStand || parseInt(destinationStand) <= 0) {
      setMessage("❌ Please enter a valid destination stand number");
      return;
    }
    if (parseInt(destinationStand) === parseInt(sourceStand)) {
      setMessage("❌ Destination stand cannot be same as source stand");
      return;
    }
    // Validate all quantities
    for (const stockId of selectedStockIds) {
      const stock = selectedStockItems.find(s => s.id === stockId);
      const quantity = transferQuantities[stockId];
      if (!quantity || parseInt(quantity) <= 0) {
        setMessage(`❌ Please enter a valid quantity for ${stock?.glass?.type || "selected item"}`);
        return;
      }
      if (parseInt(quantity) > stock.quantity) {
        setMessage(`❌ Quantity for ${stock?.glass?.type || "selected item"} exceeds available (${stock.quantity})`);
        return;
      }
    }
    setMessage("");
    setShowConfirm(true);
  };

  // Confirm and transfer
  const confirmTransfer = async () => {
    try {
      setLoading(true);
      setMessage("");

      // Transfer each selected item
      const transferPromises = Array.from(selectedStockIds).map(async (stockId) => {
        const stock = selectedStockItems.find(s => s.id === stockId);
        if (!stock) return null;

        const glassType = stock.glass?.type || "";
        const thickness = stock.glass?.thickness || "";
        const unit = stock.glass?.unit || "MM";
        const quantity = parseInt(transferQuantities[stockId]);

        const transferData = {
          glassType: glassType,
          thickness: thickness,
          unit: unit,
          height: stock.height || "",
          width: stock.width || "",
          fromStand: parseInt(sourceStand),
          toStand: parseInt(destinationStand),
          quantity: quantity,
        };

        return api.post("/api/stock/transfer", transferData);
      });

      const results = await Promise.all(transferPromises);
      const successCount = results.filter(r => r !== null).length;
      setMessage(`✅ Successfully transferred ${successCount} item(s)`);
      setShowConfirm(false);

      // Reset form after 2 seconds
      setTimeout(() => {
        setStep(1);
        setSourceStand("");
        setDestinationStand("");
        setAvailableStock([]);
        setSelectedStockIds(new Set());
        setSelectedStockItems([]);
        setTransferQuantities({});
        setMessage("");
      }, 2000);
    } catch (error) {
      setMessage("❌ Transfer failed: " + (error.response?.data || error.message));
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setStep(1);
    setSourceStand("");
    setDestinationStand("");
    setAvailableStock([]);
    setSelectedStockIds(new Set());
    setSelectedStockItems([]);
    setTransferQuantities({});
    setMessage("");
  };

  return (
    <PageWrapper>
      <div style={{ padding: isMobile ? "15px" : "20px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "25px", padding: "20px", background: "rgba(17,27,53,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
          <h1 style={{ color: "#fff", marginBottom: "8px", fontSize: isMobile ? "26px" : "32px", fontWeight: "800" }}>
            🔁 Transfer Stock
          </h1>
          <p style={{ color: "#A9B3D1", fontSize: "15px", margin: 0, fontWeight: "500" }}>
            Move stock between stands safely
          </p>
        </div>

        {message && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000,
              padding: isMobile ? "15px" : "20px",
            }}
            onClick={() => setMessage("")}
          >
            <div
              style={{
                backgroundColor: message.includes("✅") ? "#22c55e" : message.includes("⚠️") ? "#f59e0b" : "#ef4444",
                color: "white",
                padding: "20px 30px",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "600",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                maxWidth: "400px",
                width: "100%",
                textAlign: "center",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {message}
            </div>
          </div>
        )}

        <div
          style={{
            background: "rgba(17,27,53,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: isMobile ? "20px" : "30px",
            borderRadius: "16px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          {/* Progress Steps */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px", position: "relative" }}>
            {[
              { num: 1, label: "Source Stand" },
              { num: 2, label: "Select Stock" },
              { num: 3, label: "Destination" },
              { num: 4, label: "Confirm" },
            ].map(({ num, label }) => (
              <div key={num} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: step >= num ? "#4F5DFF" : "rgba(255,255,255,0.08)",
                    color: step >= num ? "white" : "#7180A6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "600",
                    fontSize: "16px",
                    marginBottom: "8px",
                    border: step >= num ? "none" : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {step > num ? "✓" : num}
                </div>
                <div style={{ fontSize: "12px", color: step >= num ? "#4F5DFF" : "#7180A6", fontWeight: "500", textAlign: "center" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Step 1: Enter Source Stand */}
          {step === 1 && (
            <form onSubmit={handleSourceStandSubmit}>
              <div style={{ marginBottom: "25px" }}>
                <label style={{ display: "block", marginBottom: "10px", color: "#A9B3D1", fontWeight: "600", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  📍 Enter Source Stand Number *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={sourceStand}
                  onChange={(e) => setSourceStand(e.target.value)}
                  placeholder="Enter stand number..."
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "1.5px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    fontSize: "16px",
                    transition: "all 0.2s",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(79,93,255,0.6)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                  autoFocus
                />
                <p style={{ marginTop: "8px", color: "#7180A6", fontSize: "13px" }}>
                  Enter the stand number from which you want to transfer stock
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "#4F5DFF",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => !loading && (e.target.style.background = "#3D4DE8")}
                onMouseOut={(e) => !loading && (e.target.style.background = "#4F5DFF")}
              >
                {loading ? "⏳ Loading..." : "➡️ Next: View Stock"}
              </button>
            </form>
          )}

          {/* Step 2: Select Stock */}
          {step === 2 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <h3 style={{ margin: 0, color: "#fff", fontSize: "20px", fontWeight: "600" }}>
                  📦 Available Stock in Stand {sourceStand}
                </h3>
                <div style={{ display: "flex", gap: "8px" }}>
                  {availableStock.length > 0 && (
                    <button
                      onClick={handleSelectAll}
                      style={{
                        padding: "8px 16px",
                        background: selectedStockIds.size === availableStock.length ? "#4F5DFF" : "rgba(255,255,255,0.08)",
                        color: selectedStockIds.size === availableStock.length ? "white" : "#A9B3D1",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "8px",
                        fontSize: "14px",
                        cursor: "pointer",
                        fontWeight: "500",
                      }}
                    >
                      {selectedStockIds.size === availableStock.length ? "✓ Deselect All" : "Select All"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setStep(1);
                      setAvailableStock([]);
                      setSelectedStockIds(new Set());
                      setSelectedStockItems([]);
                      setTransferQuantities({});
                      setMessage("");
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "rgba(255,255,255,0.08)",
                      color: "#A9B3D1",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    ← Back
                  </button>
                </div>
              </div>

              {selectedStockIds.size > 0 && (
                <div style={{
                  marginBottom: "20px",
                  padding: "12px 16px",
                  background: "rgba(79,93,255,0.1)",
                  borderRadius: "8px",
                  border: "1px solid rgba(79,93,255,0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span style={{ fontSize: "16px", color: "#4F5DFF" }}>✓</span>
                  <span style={{ color: "#fff", fontWeight: "600", fontSize: "14px" }}>
                    {selectedStockIds.size} item(s) selected
                  </span>
                  <button
                    onClick={handleProceedToDestination}
                    style={{
                      marginLeft: "auto",
                      padding: "8px 20px",
                      background: "#4F5DFF",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    ➡️ Proceed to Destination
                  </button>
                </div>
              )}

              {loading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#7180A6" }}>Loading stock...</div>
              ) : availableStock.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#7180A6" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.5 }}>📦</div>
                  <p style={{ fontSize: "16px", fontWeight: "500", marginBottom: "8px", color: "#A9B3D1" }}>No stock available</p>
                  <p style={{ fontSize: "14px", color: "#7180A6" }}>This stand has no stock items</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                  {availableStock.map((stock, idx) => {
                    const isSelected = selectedStockIds.has(stock.id);
                    return (
                      <div
                        key={stock.id || idx}
                        style={{
                          padding: "20px",
                          borderRadius: "12px",
                          border: isSelected ? "2px solid #4F5DFF" : "1px solid rgba(255,255,255,0.08)",
                          transition: "all 0.2s",
                          background: isSelected ? "rgba(79,93,255,0.12)" : "rgba(255,255,255,0.04)",
                          cursor: "pointer",
                        }}
                        onClick={() => handleCheckboxChange(stock.id, stock)}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = "rgba(79,93,255,0.4)";
                            e.currentTarget.style.background = "rgba(79,93,255,0.08)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                          }
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleCheckboxChange(stock.id, stock)}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: "20px",
                              height: "20px",
                              cursor: "pointer",
                              marginTop: "2px",
                              accentColor: "#4F5DFF",
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                              <div>
                                <div style={{ fontSize: "18px", fontWeight: "700", color: "#fff", marginBottom: "4px" }}>
                                  {stock.glass?.type || "N/A"}
                                </div>
                                <div style={{ fontSize: "13px", color: "#7180A6" }}>
                                  Thickness: {stock.glass?.thickness}{stock.glass?.unit || "MM"}
                                </div>
                              </div>
                              <div
                                style={{
                                  padding: "6px 12px",
                                  background: "rgba(55,227,165,0.15)",
                                  color: "#37E3A5",
                                  border: "1px solid rgba(55,227,165,0.3)",
                                  borderRadius: "6px",
                                  fontSize: "14px",
                                  fontWeight: "600",
                                }}
                              >
                                Qty: {stock.quantity}
                              </div>
                            </div>
                            {(stock.height || stock.width) && (
                              <div style={{ fontSize: "14px", color: "#A9B3D1", marginTop: "8px" }}>
                                Size: {stock.height || "-"} × {stock.width || "-"}
                              </div>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div style={{ marginTop: "12px", padding: "8px", background: "#4F5DFF", borderRadius: "6px", fontSize: "12px", color: "white", fontWeight: "500", textAlign: "center" }}>
                            ✓ Selected
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Enter Destination Stand */}
          {step === 3 && selectedStockItems.length > 0 && (
            <form onSubmit={handleDestinationStandSubmit}>
              <div style={{ marginBottom: "25px", padding: "20px", background: "rgba(79,93,255,0.1)", borderRadius: "12px", border: "1px solid rgba(79,93,255,0.3)" }}>
                <h3 style={{ margin: "0 0 15px 0", color: "#fff", fontSize: "18px", fontWeight: "600" }}>
                  Selected Stock Items ({selectedStockItems.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {selectedStockItems.map((stock) => (
                    <div
                      key={stock.id}
                      style={{
                        padding: "16px",
                        background: "rgba(255,255,255,0.04)",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px", fontSize: "14px", marginBottom: "12px" }}>
                        <div>
                          <span style={{ color: "#7180A6" }}>Glass Type:</span>{" "}
                          <span style={{ fontWeight: "600", color: "#fff" }}>{stock.glass?.type || "N/A"}</span>
                        </div>
                        <div>
                          <span style={{ color: "#7180A6" }}>Available:</span>{" "}
                          <span style={{ fontWeight: "600", color: "#fff" }}>{stock.quantity} pieces</span>
                        </div>
                        {stock.height && stock.width && (
                          <div>
                            <span style={{ color: "#7180A6" }}>Size:</span>{" "}
                            <span style={{ fontWeight: "600", color: "#fff" }}>{stock.height} × {stock.width}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", color: "#A9B3D1", fontWeight: "600", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Quantity to Transfer *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          max={stock.quantity}
                          value={transferQuantities[stock.id] || ""}
                          onChange={(e) => handleQuantityChange(stock.id, e.target.value)}
                          placeholder={`Enter quantity (max: ${stock.quantity})`}
                          style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1.5px solid rgba(255,255,255,0.1)",
                            background: "rgba(255,255,255,0.06)",
                            color: "#fff",
                            fontSize: "14px",
                            transition: "all 0.2s",
                            boxSizing: "border-box",
                            outline: "none",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "rgba(79,93,255,0.6)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "10px", color: "#A9B3D1", fontWeight: "600", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  📍 Enter Destination Stand Number *
                </label>
                <select
                  required
                  value={destinationStand}
                  onChange={(e) => setDestinationStand(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "1.5px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    fontSize: "16px",
                    transition: "all 0.2s",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                  autoFocus
                >
                  <option value="">Select destination stand</option>
                  {standNumbers.map((n) => (
                    <option key={n} value={n}>Stand #{n}</option>
                  ))}
                </select>
                <p style={{ marginTop: "8px", color: "#7180A6", fontSize: "13px" }}>
                  {standNumbers.length === 0
                    ? "No stands defined. Ask an admin to add stands in Stand Management."
                    : "Select the stand where you want to transfer the stock"}
                </p>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                    setDestinationStand("");
                    setMessage("");
                  }}
                  style={{
                    flex: 1,
                    padding: "14px",
                    background: "rgba(255,255,255,0.08)",
                    color: "#A9B3D1",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: "14px",
                    background: "#4F5DFF",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1,
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => !loading && (e.target.style.background = "#3D4DE8")}
                  onMouseOut={(e) => !loading && (e.target.style.background = "#4F5DFF")}
                >
                  {loading ? "⏳ Processing..." : "➡️ Review & Confirm"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Confirmation Modal */}
        {showConfirm && selectedStockItems.length > 0 && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10005,
              padding: isMobile ? "15px" : "20px",
            }}
            onClick={() => setShowConfirm(false)}
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
                <div style={{ fontSize: "48px", marginBottom: "15px" }}>⚠️</div>
                <h2
                  style={{
                    margin: 0,
                    color: "#fff",
                    fontSize: isMobile ? "20px" : "24px",
                    fontWeight: "700",
                    marginBottom: "10px",
                  }}
                >
                  Confirm Stock Transfer?
                </h2>
                <p style={{ margin: "8px 0 0 0", color: "#A9B3D1", fontSize: "14px", lineHeight: "1.6" }}>
                  Please review the transfer details before confirming
                </p>
              </div>

              <div
                style={{
                  marginTop: "20px",
                  padding: "20px",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: "12px",
                  marginBottom: "20px",
                  maxHeight: "400px",
                  overflowY: "auto",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontSize: "14px", color: "#A9B3D1", lineHeight: "1.8" }}>
                  {selectedStockItems.map((stock, idx) => (
                    <div key={stock.id} style={{ marginBottom: idx < selectedStockItems.length - 1 ? "16px" : "0", paddingBottom: idx < selectedStockItems.length - 1 ? "16px" : "0", borderBottom: idx < selectedStockItems.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                      <div style={{ fontWeight: "600", color: "#fff", marginBottom: "8px" }}>
                        {stock.glass?.type || "N/A"}
                      </div>
                      {stock.height && stock.width && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ color: "#7180A6" }}>Size:</span>
                          <span style={{ fontWeight: "600", color: "#fff" }}>
                            {stock.height} × {stock.width}
                          </span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ color: "#7180A6" }}>Quantity:</span>
                        <span style={{ fontWeight: "600", color: "#fff" }}>{transferQuantities[stock.id] || 0} pieces</span>
                      </div>
                    </div>
                  ))}
                  <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "12px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ color: "#7180A6" }}>From Stand:</span>
                    <span style={{ fontWeight: "600", color: "#fff" }}>#{sourceStand}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#7180A6" }}>To Stand:</span>
                    <span style={{ fontWeight: "600", color: "#fff" }}>#{destinationStand}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "12px" }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    background: "rgba(255,255,255,0.08)",
                    color: "#A9B3D1",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => (e.target.style.background = "rgba(255,255,255,0.12)")}
                  onMouseOut={(e) => (e.target.style.background = "rgba(255,255,255,0.08)")}
                >
                  ❌ Cancel
                </button>
                <button
                  onClick={confirmTransfer}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    background: loading ? "rgba(55,227,165,0.3)" : "rgba(55,227,165,0.2)",
                    color: "#37E3A5",
                    border: "1px solid rgba(55,227,165,0.3)",
                    borderRadius: "8px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => !loading && (e.target.style.background = "rgba(55,227,165,0.3)")}
                  onMouseOut={(e) => !loading && (e.target.style.background = "rgba(55,227,165,0.2)")}
                >
                  {loading ? "⏳ Transferring..." : "✅ Confirm Transfer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

export default StockTransfer;
