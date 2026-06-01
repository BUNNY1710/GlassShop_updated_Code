import { useEffect, useState, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import api from "../api/api";
import PageWrapper from "../components/PageWrapper";
import { Card, Button, Input, Select, StatCard } from "../components/ui";
import ConfirmModal from "../components/ConfirmModal";
import { getUserRole } from "../utils/auth";
import "../styles/design-system.css";

// Removes trailing zeros: 5.00 → "5 mm", 10.50 → "10.5 mm"
const formatThickness = (value) =>
  value != null && value !== "" ? `${Number(value)} mm` : "N/A";

// Uppercase compact form: 5.00 → "5MM"
const formatThicknessMM = (value) =>
  value != null && value !== "" ? `${Number(value)}MM` : "?";

// Helper functions for dimension parsing and conversion
const parseDimension = (value) => {
  if (!value || value.trim() === "") return null;
  
  const trimmed = value.trim();
  
  // Handle fraction format (e.g., "5 1/4")
  const fractionMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const whole = parseFloat(fractionMatch[1]);
    const numerator = parseFloat(fractionMatch[2]);
    const denominator = parseFloat(fractionMatch[3]);
    return whole + (numerator / denominator);
  }
  
  // Handle decimal format (e.g., "5.5")
  const decimal = parseFloat(trimmed);
  if (!isNaN(decimal)) {
    return decimal;
  }
  
  return null;
};

const convertToMM = (value, unit) => {
  if (value === null || value === undefined) return null;
  
  switch (unit?.toUpperCase()) {
    case "MM":
      return value;
    case "INCH":
      return value * 25.4;
    case "FEET":
      return value * 304.8;
    default:
      return value;
  }
};

const convertFromMM = (valueInMM, targetUnit) => {
  if (valueInMM === null || valueInMM === undefined) return null;
  
  switch (targetUnit?.toUpperCase()) {
    case "MM":
      return valueInMM;
    case "INCH":
      return valueInMM / 25.4;
    case "FEET":
      return valueInMM / 304.8;
    default:
      return valueInMM;
  }
};

function StockDashboard() {
  const [allStock, setAllStock] = useState([]);
  const [filterThickness, setFilterThickness] = useState("");
  const [filterHeight, setFilterHeight] = useState("");
  const [filterWidth, setFilterWidth] = useState("");
  const [searchUnit, setSearchUnit] = useState("MM");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(true);
  const userRole = getUserRole();
  const isAdmin = userRole === "ROLE_ADMIN";

  // Add/Remove Modal State
  const [showAddRemoveModal, setShowAddRemoveModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [stockMessage, setStockMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [showUndo, setShowUndo] = useState(false);

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferStock, setTransferStock] = useState(null);
  const [toStand, setToStand] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStock, setEditStock] = useState(null);
  const [editGlassType, setEditGlassType] = useState("");
  const [editThickness, setEditThickness] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [editWidth, setEditWidth] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editMessage, setEditMessage] = useState("");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  const loadStock = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/stock/all");
      const stockWithQuantity = res.data.filter(item => 
        item.quantity != null && item.quantity > 0
      );
      setAllStock(stockWithQuantity);

      stockWithQuantity.forEach(item => {
        if (item.quantity < item.minQuantity) {
          const glassTypeLabel = item.glass?.type || 'N/A';
          const thicknessLabel = item.glass?.thickness ? formatThicknessMM(item.glass.thickness) : '';
          toast.error(
            `🚨 LOW STOCK: ${glassTypeLabel} ${thicknessLabel} (Stand ${item.standNo})`,
            { toastId: `${item.standNo}-${item.glass?.id}` }
          );
        }
      });
    } catch (err) {
      console.error(err);
      if (err.response?.status !== 401) {
        toast.error("Failed to load stock. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, []);

  const openAddRemoveModal = (stock) => {
    setSelectedStock(stock);
    setQuantity("");
    setStockMessage("");
    setShowAddRemoveModal(true);
  };

  const closeAddRemoveModal = () => {
    setShowAddRemoveModal(false);
    setSelectedStock(null);
    setQuantity("");
    setStockMessage("");
  };

  const updateStock = (action) => {
    setStockMessage("");

    if (!quantity || Number(quantity) <= 0) {
      setStockMessage("❌ Please enter a valid quantity");
      return;
    }

    if (!selectedStock) {
      setStockMessage("❌ No stock item selected");
      return;
    }

    const payload = {
      standNo: selectedStock.standNo,
      quantity: Number(quantity),
      action,
      glassType: selectedStock.glass?.type, // Glass type (Plan, Extra Clear, etc.)
      thickness: selectedStock.glass?.thickness, // Thickness value
      height: selectedStock.height,
      width: selectedStock.width,
      unit: selectedStock.glass?.unit || "MM"
    };

    setPendingPayload(payload);
    setShowConfirm(true);
    setShowAddRemoveModal(false);
  };

  const confirmSaveStock = async () => {
    try {
      // Update stock quantity if there's a pending payload
      if (pendingPayload) {
        await api.post("/api/stock/update", pendingPayload);
      }
      
      setShowConfirm(false);
      setPendingPayload(null);
      toast.success("✅ Stock updated successfully");
      setShowUndo(true);
      await loadStock();
      closeAddRemoveModal();
      setShowUndo(false);
    } catch (error) {
      setShowConfirm(false);
      setPendingPayload(null);
      setShowAddRemoveModal(true);
      const errorMessage = error.response?.data || error.message || "❌ Failed to update stock";
      setStockMessage(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }
  };

  const undoLastAction = async () => {
    try {
      const res = await api.post("/api/stock/undo");
      setStockMessage(res.data);
      setShowUndo(false);
      await loadStock();
    } catch {
      setStockMessage("❌ Failed to undo last action");
    }
  };

  const openTransferModal = (stock) => {
    setTransferStock(stock);
    setToStand("");
    setTransferQuantity("");
    setTransferMessage("");
    setShowTransferModal(true);
  };

  const closeTransferModal = () => {
    setShowTransferModal(false);
    setTransferStock(null);
    setToStand("");
    setTransferQuantity("");
    setTransferMessage("");
  };

  const handleTransfer = () => {
    setTransferMessage("");

    if (!toStand || Number(toStand) <= 0) {
      setTransferMessage("❌ Please enter a valid destination stand number");
      return;
    }

    if (!transferQuantity || Number(transferQuantity) <= 0) {
      setTransferMessage("❌ Please enter a valid quantity");
      return;
    }

    if (!transferStock) {
      setTransferMessage("❌ No stock item selected");
      return;
    }

    if (Number(toStand) === transferStock.standNo) {
      setTransferMessage("❌ From stand and to stand cannot be the same");
      return;
    }

    setShowTransferConfirm(true);
    setShowTransferModal(false);
  };

  const confirmTransfer = async () => {
    try {
      const res = await api.post("/api/stock/transfer", {
        glassType: transferStock.glass?.type || "",
        thickness: transferStock.glass?.thickness || 0,
        unit: transferStock.glass?.unit || "MM",
        height: transferStock.height,
        width: transferStock.width,
        fromStand: Number(transferStock.standNo),
        toStand: Number(toStand),
        quantity: Number(transferQuantity)
      });

      const responseMessage = typeof res.data === 'string' 
        ? res.data 
        : (res.data?.message || "✅ Transfer completed successfully");
      setTransferMessage(responseMessage);
      setShowTransferConfirm(false);
      await loadStock();
      setTimeout(() => {
        closeTransferModal();
        setTransferMessage("");
      }, 2000);
    } catch (error) {
      const errorData = error.response?.data;
      const errorMessage = typeof errorData === 'string' 
        ? errorData 
        : (errorData?.error || error.message || "❌ Transfer failed");
      setTransferMessage(errorMessage);
      setShowTransferConfirm(false);
      setShowTransferModal(true);
    }
  };

  const openEditModal = (stock) => {
    setEditStock(stock);
    setEditGlassType(stock.glass?.type || "");
    setEditThickness(stock.glass?.thickness ? String(stock.glass.thickness) : "");
    setEditUnit(stock.glass?.unit || "");
    setEditHeight(stock.height || "");
    setEditWidth(stock.width || "");
    setEditQuantity(String(stock.quantity));
    setEditMessage("");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditStock(null);
    setEditMessage("");
  };

  const saveEditStock = async () => {
    setEditMessage("");

    if (!editGlassType.trim()) {
      setEditMessage("❌ Please enter glass type");
      return;
    }
    if (!editThickness || parseFloat(editThickness) <= 0) {
      setEditMessage("❌ Please enter valid thickness");
      return;
    }
    if (!editUnit) {
      setEditMessage("❌ Please select the unit");
      return;
    }
    if (!editHeight.trim() || !editWidth.trim()) {
      setEditMessage("❌ Please enter height and width");
      return;
    }
    if (editQuantity === "" || parseInt(editQuantity) < 0) {
      setEditMessage("❌ Please enter valid quantity");
      return;
    }

    try {
      await api.post(`/api/stock/edit/${editStock.id}`, {
        glassType: editGlassType.trim(),
        thickness: parseFloat(editThickness),
        unit: editUnit,
        height: editHeight.trim(),
        width: editWidth.trim(),
        quantity: parseInt(editQuantity)
      });
      setEditMessage("✅ Stock updated successfully");
      await loadStock();
      setTimeout(() => {
        closeEditModal();
      }, 1500);
    } catch (error) {
      const msg = error.response?.data || error.message || "❌ Failed to update stock";
      setEditMessage(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  const filteredStock = useMemo(() => {
    const stockWithQuantity = allStock.filter(s => 
      s.quantity != null && s.quantity > 0
    );
    
    const searchHeightValue = parseDimension(filterHeight);
    const searchWidthValue = parseDimension(filterWidth);
    
    const searchHeightMM = searchHeightValue !== null 
      ? convertToMM(searchHeightValue, searchUnit) 
      : null;
    const searchWidthMM = searchWidthValue !== null 
      ? convertToMM(searchWidthValue, searchUnit) 
      : null;

    const filtered = stockWithQuantity.map(s => {
      // Live search by thickness
      let matchThickness = true;
      if (filterThickness && filterThickness.trim() !== "") {
        const searchValue = filterThickness.trim().toLowerCase();
        const stockThickness = s.glass?.thickness;
        
        if (stockThickness) {
          // Match exact number or contains match for instant results
          // e.g., typing "5" will immediately show all items with thickness 5mm
          const stockThicknessStr = String(stockThickness).toLowerCase();
          matchThickness = stockThicknessStr === searchValue || 
                          stockThicknessStr.includes(searchValue) ||
                          stockThicknessStr.startsWith(searchValue);
        } else {
          matchThickness = false;
        }
      }

      if (!matchThickness) return null; // Return null for proper filtering

      // Normal search: height matches height, width matches width
      let matchHeight = true;
      let matchWidth = true;
      
      if (searchHeightMM !== null) {
        const stockHeightValue = parseDimension(s.height);
        if (stockHeightValue !== null) {
          const stockHeightMM = convertToMM(stockHeightValue, s.glass?.unit);
          if (stockHeightMM !== null) {
            matchHeight = stockHeightMM >= searchHeightMM;
          } else {
            matchHeight = false;
          }
        } else {
          matchHeight = false;
        }
      }

      if (searchWidthMM !== null) {
        const stockWidthValue = parseDimension(s.width);
        if (stockWidthValue !== null) {
          const stockWidthMM = convertToMM(stockWidthValue, s.glass?.unit);
          if (stockWidthMM !== null) {
            matchWidth = stockWidthMM >= searchWidthMM;
          } else {
            matchWidth = false;
          }
        } else {
          matchWidth = false;
        }
      }

      const normalMatch = matchHeight && matchWidth;
      let isReverseMatch = false;

      // Reverse search: height matches width, width matches height (only if both height and width are searched)
      if (normalMatch) {
        return { ...s, isReverseMatch: false }; // Normal match found
      }

      // If normal match not found, try reverse search
      if (searchHeightMM !== null && searchWidthMM !== null) {
        let reverseMatchHeight = true;
        let reverseMatchWidth = true;

        // Check if searched height matches stock width
        const stockWidthValue = parseDimension(s.width);
        if (stockWidthValue !== null) {
          const stockWidthMM = convertToMM(stockWidthValue, s.glass?.unit);
          if (stockWidthMM !== null) {
            reverseMatchHeight = stockWidthMM >= searchHeightMM;
          } else {
            reverseMatchHeight = false;
          }
        } else {
          reverseMatchHeight = false;
        }

        // Check if searched width matches stock height
        const stockHeightValue = parseDimension(s.height);
        if (stockHeightValue !== null) {
          const stockHeightMM = convertToMM(stockHeightValue, s.glass?.unit);
          if (stockHeightMM !== null) {
            reverseMatchWidth = stockHeightMM >= searchWidthMM;
          } else {
            reverseMatchWidth = false;
          }
        } else {
          reverseMatchWidth = false;
        }

        isReverseMatch = reverseMatchHeight && reverseMatchWidth;
        if (isReverseMatch) {
          return { ...s, isReverseMatch: true };
        }
      }

      if (normalMatch) {
        return { ...s, isReverseMatch: false };
      }

      return null; // No match
    }).filter(s => s !== null);

    return filtered.sort((a, b) => {
      // Prioritize reverse matches over normal matches (show reverse matches at top)
      if (a.isReverseMatch !== b.isReverseMatch) {
        return a.isReverseMatch ? -1 : 1; // Reverse matches first
      }
      
      const aHeightValue = parseDimension(a.height);
      const bHeightValue = parseDimension(b.height);
      const aWidthValue = parseDimension(a.width);
      const bWidthValue = parseDimension(b.width);
      
      const aHeightMM = aHeightValue !== null ? convertToMM(aHeightValue, a.glass?.unit) : 0;
      const bHeightMM = bHeightValue !== null ? convertToMM(bHeightValue, b.glass?.unit) : 0;
      const aWidthMM = aWidthValue !== null ? convertToMM(aWidthValue, a.glass?.unit) : 0;
      const bWidthMM = bWidthValue !== null ? convertToMM(bWidthValue, b.glass?.unit) : 0;

      if (aHeightMM !== bHeightMM) {
        return aHeightMM - bHeightMM;
      }
      return aWidthMM - bWidthMM;
    });
  }, [allStock, filterThickness, filterHeight, filterWidth, searchUnit]);

  // Calculate stats
  const totalStock = filteredStock.length;
  const lowStockCount = filteredStock.filter(s => s.quantity < s.minQuantity).length;
  const totalQuantity = filteredStock.reduce((sum, s) => sum + (s.quantity || 0), 0);

  return (
    <PageWrapper>
      <div style={getContainerStyle(isMobile)}>
        {/* Header Section */}
        <div style={headerSection}>
          <div>
            <h1 style={getPageTitleStyle(isMobile)}>View Stock</h1>
            <p style={pageSubtitle}>Browse and manage your inventory</p>
          </div>
        </div>

        {/* Stats Cards — compact single-row KPI layout */}
        <div style={getStatsGridStyle(isMobile)}>
          <StatCard compact icon="📦" label="Total Items"    value={totalStock}                   color="#6366f1" loading={loading} />
          <StatCard compact icon="⚠️" label="Low Stock"      value={lowStockCount}                color="#ef4444" loading={loading} trend={lowStockCount > 0 ? -1 : undefined} />
          <StatCard compact icon="🔢" label="Total Quantity"  value={totalQuantity.toLocaleString()} color="#22c55e" loading={loading} />
        </div>

        {/* Filters Card */}
        <Card style={getFilterCardStyle(isMobile)}>
          <div style={filterHeader}>
            <div style={filterIcon}>🔍</div>
            <div>
              <h3 style={filterTitle}>Search & Filter</h3>
              <p style={filterSubtitle}>Search & Filter stock by type, dimensions, or unit</p>
            </div>
          </div>

          <div style={getFilterGridStyle(isMobile)}>
            <Input
              placeholder="Thickness (e.g., 5, 8, 10)"
              value={filterThickness}
              onChange={e => setFilterThickness(e.target.value)}
              icon="📏"
            />
            <Input
              type="text"
              placeholder="Height (e.g. 5, 5.5, 5 1/4)"
              value={filterHeight}
              onChange={e => setFilterHeight(e.target.value)}
              icon="📏"
            />
            <Input
              type="text"
              placeholder="Width (e.g. 7, 7.5, 7 3/8)"
              value={filterWidth}
              onChange={e => setFilterWidth(e.target.value)}
              icon="📐"
            />
            <Select
              value={searchUnit}
              onChange={e => setSearchUnit(e.target.value)}
              icon="📏"
            >
              <option value="MM">MM</option>
              <option value="INCH">INCH</option>
              <option value="FEET">FEET</option>
            </Select>
            <Button
              variant="secondary"
              onClick={() => {
                setFilterThickness("");
                setFilterHeight("");
                setFilterWidth("");
                setSearchUnit("MM");
              }}
              fullWidth={isMobile}
            >
              Clear Filters
            </Button>
          </div>
        </Card>

        {/* Stock Table Card */}
        <Card style={getTableCardStyle(isMobile)}>
          <div style={tableHeader}>
            <div>
              <h3 style={tableTitle}>Stock Inventory</h3>
              <p style={tableSubtitle}>
                {filteredStock.length} {filteredStock.length === 1 ? "item" : "items"} found
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon="🔄"
              onClick={loadStock}
            >
              Refresh
            </Button>
          </div>

          <div style={tableWrapper}>
            {loading ? (
              <div style={loadingState}>
                <div style={skeletonRow}></div>
                <div style={skeletonRow}></div>
                <div style={skeletonRow}></div>
              </div>
            ) : filteredStock.length === 0 ? (
              <div style={emptyState}>
                <div style={emptyIcon}>📦</div>
                <p style={emptyText}>No stock found</p>
                <p style={emptySubtext}>
                  {filterThickness || filterHeight || filterWidth 
                    ? "Try adjusting your filters" 
                    : "Add stock to get started"}
                </p>
              </div>
            ) : isMobile ? (
              /* ── MOBILE: ultra-compact single-line cards ── */
              <div style={mobileCardList}>
                {filteredStock.map((s, i) => {
                  const isLow = s.quantity < s.minQuantity;
                  const isReverseMatch = s.isReverseMatch || false;
                  const unit = s.glass?.unit || "MM";
                  const summary = [
                    `#${s.standNo}`,
                    s.glass?.thickness ? formatThicknessMM(s.glass.thickness) : null,
                    s.glass?.type || "N/A",
                    (s.height && s.width) ? `${s.height}×${s.width} ${unit}` : null,
                    `Qty ${s.quantity}`,
                  ].filter(Boolean).join(" • ");

                  return (
                    <div
                      key={i}
                      style={{
                        ...mobileCard,
                        borderLeft: isLow ? "3px solid #ef4444" : "3px solid #e2e8f0",
                        background: isReverseMatch ? "#fef9ec" : "#fff",
                      }}
                    >
                      {/* Single info line */}
                      <div style={mobileSummaryRow}>
                        <span style={mobileSummaryText}>{summary}</span>
                        <span style={getMobileStatusChip(isLow)}>
                          {isLow ? "LOW" : "OK"}
                        </span>
                      </div>

                      {/* Pending tag + reverse tag (only when needed) */}
                      {(s.status === "PENDING" || isReverseMatch) && (
                        <div style={{ display: "flex", gap: "6px", marginTop: "3px", flexWrap: "wrap" }}>
                          {s.status === "PENDING" && <span style={mobilePendingTag}>⏳ Pending</span>}
                          {isReverseMatch && <span style={mobileRevTag}>🔄 Reversed</span>}
                        </div>
                      )}

                      {/* Icon-only action row */}
                      <div style={mobileCardActions}>
                        <button title="Add / Remove Stock" style={mobileIconBtn("primary")} onClick={() => openAddRemoveModal(s)}>±</button>
                        <button title="Transfer Stock"     style={mobileIconBtn("outline")}  onClick={() => openTransferModal(s)}>⇄</button>
                        <button title="Edit Stock"         style={mobileIconBtn("secondary")} onClick={() => openEditModal(s)}>✎</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── DESKTOP: existing table ── */
              <div style={tableContainer}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={tableHeaderCell}>Stand</th>
                      <th style={tableHeaderCell}>Thickness</th>
                      <th style={tableHeaderCell}>Glass Type</th>
                      <th style={tableHeaderCell}>Height</th>
                      <th style={tableHeaderCell}>Width</th>
                      <th style={tableHeaderCell}>Quantity</th>
                      <th style={tableHeaderCell}>Status</th>
                      <th style={{ ...tableHeaderCell, width: "116px", textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.map((s, i) => {
                      const isLow = s.quantity < s.minQuantity;
                      const isReverseMatch = s.isReverseMatch || false;
                      return (
                        <tr
                          key={i}
                          className={isLow ? "low-stock" : ""}
                          style={{
                            ...getTableRowStyle(isLow),
                            ...(isReverseMatch ? { backgroundColor: "#fef3c7" } : {})
                          }}
                        >
                          <td style={tableCell}>
                            <span style={standBadge}>#{s.standNo}</span>
                            {isReverseMatch && (
                              <span style={{ marginLeft: "6px", fontSize: "10px", padding: "2px 6px", backgroundColor: "#f59e0b", color: "white", borderRadius: "4px", fontWeight: "600" }}>
                                🔄 REVERSED
                              </span>
                            )}
                          </td>
                          <td style={tableCell}>{formatThickness(s.glass?.thickness)}</td>
                          <td style={{ ...tableCell, ...glassTypeCell }}>
                            <strong>{s.glass?.type || "N/A"}</strong>
                          </td>
                          <td style={tableCell}>
                            {s.height || "N/A"}{" "}
                            {s.glass?.unit === "FEET" && "ft"}
                            {s.glass?.unit === "INCH" && "in"}
                            {s.glass?.unit === "MM" && "mm"}
                            {isReverseMatch && <span style={{ marginLeft: "4px", fontSize: "11px", color: "#f59e0b", fontWeight: "600" }}>(matches width)</span>}
                          </td>
                          <td style={tableCell}>
                            {s.width || "N/A"}{" "}
                            {s.glass?.unit === "FEET" && "ft"}
                            {s.glass?.unit === "INCH" && "in"}
                            {s.glass?.unit === "MM" && "mm"}
                            {isReverseMatch && <span style={{ marginLeft: "4px", fontSize: "11px", color: "#f59e0b", fontWeight: "600" }}>(matches height)</span>}
                          </td>
                          <td style={tableCell}>
                            <span style={getQuantityBadgeStyle(isLow)}>{s.quantity}</span>
                          </td>
                          <td style={tableCell}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={getStatusBadgeStyle(isLow)}>{isLow ? "🔴 LOW" : "✅ OK"}</span>
                              {s.status === "PENDING" && (
                                <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: "600" }}>⏳ Pending</span>
                              )}
                            </div>
                          </td>
                          <td style={actionCell}>
                            <div style={iconActionRow}>
                              <button title="Add / Remove Stock" style={iconBtnStyle("primary")} onClick={() => openAddRemoveModal(s)} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.opacity = "0.88"; }} onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.opacity = "1"; }}>±</button>
                              <button title="Transfer Stock" style={iconBtnStyle("outline")} onClick={() => openTransferModal(s)} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = "#667eea"; e.currentTarget.style.color = "#fff"; }} onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#667eea"; }}>⇄</button>
                              <button title="Edit Stock" style={iconBtnStyle("secondary")} onClick={() => openEditModal(s)} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = "#e2e8f0"; }} onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = "#f1f5f9"; }}>✎</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Add/Remove Modal */}
      {showAddRemoveModal && selectedStock && (
        <div style={getModalOverlayStyle(isMobile)} onClick={closeAddRemoveModal}>
          <Card style={getModalCardStyle(isMobile)} onClick={(e) => e.stopPropagation()}>

            {/* Drag handle — mobile only */}
            {isMobile && <div style={dragHandle} />}

            {/* Header */}
            <div style={{ ...getModalHeaderStyle(isMobile), padding: isMobile ? "0 0 8px" : undefined }}>
              <h3 style={getModalTitleStyle(isMobile)}>Add / Remove Stock</h3>
              <button style={getCloseModalBtnStyle(isMobile)} onClick={closeAddRemoveModal}>✕</button>
            </div>

            <div style={getModalContentStyle(isMobile)}>

              {/* Stock summary — compact on mobile, detailed card on desktop */}
              {isMobile ? (
                <div style={compactStockSummary}>
                  <div style={compactSummaryRow}>
                    <span style={compactSummaryMain}>
                      #{selectedStock.standNo} • {formatThicknessMM(selectedStock.glass?.thickness)} • {selectedStock.glass?.type || "N/A"}
                    </span>
                    <span style={getCompactStatusPill(selectedStock.status === "PENDING")}>
                      {selectedStock.status === "PENDING" ? "Pending" : "Approved"}
                    </span>
                  </div>
                  <span style={compactSummaryDetail}>
                    {selectedStock.height}×{selectedStock.width} {selectedStock.glass?.unit || "MM"} • Qty {selectedStock.quantity}
                  </span>
                </div>
              ) : (
                <Card style={getStockInfoCardStyle(isMobile)}>
                  <h4 style={getInfoTitleStyle(isMobile)}>Stock Details</h4>
                  <div style={getInfoGridStyle(isMobile)}>
                    <div style={getInfoItemStyle(isMobile)}>
                      <span style={getInfoLabelStyle(isMobile)}>Glass Type</span>
                      <span style={getInfoValueStyle(isMobile)}>{selectedStock.glass?.type || "N/A"}</span>
                    </div>
                    <div style={getInfoItemStyle(isMobile)}>
                      <span style={getInfoLabelStyle(isMobile)}>Thickness</span>
                      <span style={getInfoValueStyle(isMobile)}>{formatThickness(selectedStock.glass?.thickness)}</span>
                    </div>
                    <div style={getInfoItemStyle(isMobile)}>
                      <span style={getInfoLabelStyle(isMobile)}>Size</span>
                      <span style={getInfoValueStyle(isMobile)}>{selectedStock.height} × {selectedStock.width} {selectedStock.glass?.unit || "MM"}</span>
                    </div>
                    <div style={getInfoItemStyle(isMobile)}>
                      <span style={getInfoLabelStyle(isMobile)}>Stand No</span>
                      <span style={getInfoValueStyle(isMobile)}>#{selectedStock.standNo}</span>
                    </div>
                    <div style={getInfoItemStyle(isMobile)}>
                      <span style={getInfoLabelStyle(isMobile)}>Current Qty</span>
                      <span style={getInfoValueStyle(isMobile)}>{selectedStock.quantity}</span>
                    </div>
                  </div>
                </Card>
              )}

              <Input
                label="Quantity"
                type="number"
                placeholder="Enter quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                icon="🔢"
                required
                min="1"
                size={isMobile ? "sm" : "md"}
              />

              {selectedStock.status === "PENDING" && !isMobile && (
                <p style={{ margin: "0", fontSize: "12px", color: "#f59e0b" }}>
                  ⚠️ This stock is pending price approval from Admin
                </p>
              )}

              <div style={getButtonGroupStyle(isMobile)}>
                <Button variant="success" icon="➕" fullWidth={isMobile} size={isMobile ? "sm" : "md"} onClick={() => updateStock("ADD")}>
                  Add Stock
                </Button>
                <Button variant="danger" icon="➖" fullWidth={isMobile} size={isMobile ? "sm" : "md"} onClick={() => updateStock("REMOVE")}>
                  Remove Stock
                </Button>
              </div>

              {showUndo && (
                <Button variant="outline" icon="↩" fullWidth size={isMobile ? "sm" : "md"} onClick={undoLastAction}>
                  Undo Last Action
                </Button>
              )}

              {stockMessage && (
                <div style={getMessageStyle(stockMessage.includes("✅"))}>
                  <span style={messageIcon}>{stockMessage.includes("✅") ? "✅" : "❌"}</span>
                  <span>{stockMessage.replace("✅", "").replace("❌", "").trim()}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && transferStock && (
        <div style={getModalOverlayStyle(isMobile)} onClick={closeTransferModal}>
          <Card style={getModalCardStyle(isMobile)} onClick={(e) => e.stopPropagation()}>

            {isMobile && <div style={dragHandle} />}

            <div style={{ ...getModalHeaderStyle(isMobile), padding: isMobile ? "0 0 8px" : undefined }}>
              <h3 style={getModalTitleStyle(isMobile)}>Transfer Stock</h3>
              <button style={getCloseModalBtnStyle(isMobile)} onClick={closeTransferModal}>✕</button>
            </div>

            <div style={getModalContentStyle(isMobile)}>

              {isMobile ? (
                <div style={compactStockSummary}>
                  <span style={compactSummaryMain}>
                    #{transferStock.standNo} • {formatThicknessMM(transferStock.glass?.thickness)} • {transferStock.glass?.type || "N/A"}
                  </span>
                  <span style={compactSummaryDetail}>
                    {transferStock.height}×{transferStock.width} {transferStock.glass?.unit || "MM"} • Available {transferStock.quantity}
                  </span>
                </div>
              ) : (
                <Card style={getStockInfoCardStyle(isMobile)}>
                  <h4 style={getInfoTitleStyle(isMobile)}>Stock Details</h4>
                  <div style={getInfoGridStyle(isMobile)}>
                    <div style={getInfoItemStyle(isMobile)}>
                      <span style={getInfoLabelStyle(isMobile)}>Glass Type</span>
                      <span style={getInfoValueStyle(isMobile)}>{transferStock.glass?.type || "N/A"}</span>
                    </div>
                    <div style={getInfoItemStyle(isMobile)}>
                      <span style={getInfoLabelStyle(isMobile)}>Thickness</span>
                      <span style={getInfoValueStyle(isMobile)}>{formatThickness(transferStock.glass?.thickness)}</span>
                    </div>
                    <div style={getInfoItemStyle(isMobile)}>
                      <span style={getInfoLabelStyle(isMobile)}>Size</span>
                      <span style={getInfoValueStyle(isMobile)}>{transferStock.height} × {transferStock.width} {transferStock.glass?.unit || "MM"}</span>
                    </div>
                    <div style={getInfoItemStyle(isMobile)}>
                      <span style={getInfoLabelStyle(isMobile)}>From Stand</span>
                      <span style={getInfoValueStyle(isMobile)}>#{transferStock.standNo}</span>
                    </div>
                    <div style={getInfoItemStyle(isMobile)}>
                      <span style={getInfoLabelStyle(isMobile)}>Available</span>
                      <span style={getInfoValueStyle(isMobile)}>{transferStock.quantity} units</span>
                    </div>
                  </div>
                </Card>
              )}

              <Input
                label="To Stand Number"
                type="number"
                placeholder="Destination stand"
                value={toStand}
                onChange={(e) => setToStand(e.target.value)}
                icon="🏷️"
                required
                min="1"
                size={isMobile ? "sm" : "md"}
              />

              <Input
                label="Quantity to Transfer"
                type="number"
                placeholder="Enter quantity"
                value={transferQuantity}
                onChange={(e) => setTransferQuantity(e.target.value)}
                icon="🔢"
                required
                min="1"
                helperText={`Max: ${transferStock.quantity}`}
                size={isMobile ? "sm" : "md"}
              />

              <Button variant="primary" icon="⇄" fullWidth size={isMobile ? "sm" : "md"} onClick={handleTransfer}>
                Transfer Stock
              </Button>

              {transferMessage && (
                <div style={getMessageStyle(typeof transferMessage === 'string' && transferMessage.includes("✅"))}>
                  <span style={messageIcon}>{transferMessage.includes("✅") ? "✅" : "❌"}</span>
                  <span>{transferMessage.replace("✅", "").replace("❌", "").trim()}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Transfer Confirm Modal */}
      {showTransferConfirm && transferStock && (
        <div style={getModalOverlayStyle(isMobile)} onClick={() => setShowTransferConfirm(false)}>
          <Card style={getModalCardStyle(isMobile)} onClick={(e) => e.stopPropagation()}>

            {isMobile && <div style={dragHandle} />}

            <div style={{ ...getModalHeaderStyle(isMobile), padding: isMobile ? "0 0 8px" : undefined }}>
              <h3 style={getModalTitleStyle(isMobile)}>Confirm Transfer</h3>
              <button style={getCloseModalBtnStyle(isMobile)} onClick={() => setShowTransferConfirm(false)}>✕</button>
            </div>

            <div style={getModalContentStyle(isMobile)}>

              {isMobile ? (
                <div style={compactStockSummary}>
                  <span style={compactSummaryMain}>
                    #{transferStock.standNo} → Stand #{toStand}
                  </span>
                  <span style={compactSummaryDetail}>
                    {transferStock.glass?.type} • {formatThicknessMM(transferStock.glass?.thickness)} • {transferStock.height}×{transferStock.width} {transferStock.glass?.unit || "MM"} • Qty {transferQuantity}
                  </span>
                </div>
              ) : (
                <Card style={getStockInfoCardStyle(isMobile)}>
                  <h4 style={getInfoTitleStyle(isMobile)}>Transfer Summary</h4>
                  <div style={getInfoGridStyle(isMobile)}>
                    <div style={getInfoItemStyle(isMobile)}>
                      <span style={getInfoLabelStyle(isMobile)}>Glass Type</span>
                      <span style={getInfoValueStyle(isMobile)}>{transferStock.glass?.type || "N/A"}</span>
                    </div>
                    <div style={getInfoItemStyle(isMobile)}>
                      <span style={getInfoLabelStyle(isMobile)}>Size</span>
                      <span style={getInfoValueStyle(isMobile)}>{transferStock.height} × {transferStock.width} {transferStock.glass?.unit || "MM"}</span>
                    </div>
                    <div style={getInfoItemStyle(isMobile)}>
                      <span style={getInfoLabelStyle(isMobile)}>From Stand</span>
                      <span style={getInfoValueStyle(isMobile)}>#{transferStock.standNo}</span>
                    </div>
                    <div style={getInfoItemStyle(isMobile)}>
                      <span style={getInfoLabelStyle(isMobile)}>To Stand</span>
                      <span style={getInfoValueStyle(isMobile)}>#{toStand}</span>
                    </div>
                    <div style={getInfoItemStyle(isMobile)}>
                      <span style={getInfoLabelStyle(isMobile)}>Quantity</span>
                      <span style={getInfoValueStyle(isMobile)}>{transferQuantity} units</span>
                    </div>
                  </div>
                </Card>
              )}

              <div style={getButtonGroupStyle(isMobile)}>
                <Button variant="secondary" fullWidth={isMobile} size={isMobile ? "sm" : "md"}
                  onClick={() => { setShowTransferConfirm(false); setShowTransferModal(true); }}>
                  Cancel
                </Button>
                <Button variant="primary" icon="✅" fullWidth={isMobile} size={isMobile ? "sm" : "md"} onClick={confirmTransfer}>
                  Confirm Transfer
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Stock Modal */}
      {showEditModal && editStock && (
        <div style={getModalOverlayStyle(isMobile)} onClick={closeEditModal}>
          <Card style={{ ...getModalCardStyle(isMobile), maxWidth: isMobile ? "100%" : "460px" }} onClick={(e) => e.stopPropagation()}>

            {isMobile && <div style={dragHandle} />}

            <div style={{ ...getModalHeaderStyle(isMobile), padding: isMobile ? "0 0 8px" : undefined }}>
              <h3 style={getModalTitleStyle(isMobile)}>Edit Stock · Stand #{editStock.standNo}</h3>
              <button style={getCloseModalBtnStyle(isMobile)} onClick={closeEditModal}>✕</button>
            </div>

            <div style={getModalContentStyle(isMobile)}>
              {/* Glass Type */}
              <div>
                <label style={editLabelStyle}>Glass Type <span style={{ color: "#ef4444" }}>*</span></label>
                <select
                  value={editGlassType}
                  onChange={e => setEditGlassType(e.target.value)}
                  style={editSelectStyle}
                >
                  <option value="">Select glass type</option>
                  {["Plan","Extra Clear","Grey Tinted","Brown Tinted","One Way","Star","Karakachi","Bajari","Diomand","Mirror"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  {!["Plan","Extra Clear","Grey Tinted","Brown Tinted","One Way","Star","Karakachi","Bajari","Diomand","Mirror"].includes(editGlassType) && editGlassType && (
                    <option value={editGlassType}>{editGlassType}</option>
                  )}
                </select>
              </div>

              {/* Thickness & Unit side by side */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isMobile ? "8px" : "12px" }}>
                <div>
                  <label style={editLabelStyle}>Thickness (MM) <span style={{ color: "#ef4444" }}>*</span></label>
                  <select
                    value={editThickness}
                    onChange={e => setEditThickness(e.target.value)}
                    style={editSelectStyle}
                  >
                    <option value="">Select thickness</option>
                    {["3.5","4","5","6","8","10","12","15","19"].map(t => (
                      <option key={t} value={t}>{t} MM</option>
                    ))}
                    {!["3.5","4","5","6","8","10","12","15","19"].includes(editThickness) && editThickness && (
                      <option value={editThickness}>{editThickness} MM</option>
                    )}
                  </select>
                </div>
                <div>
                  <label style={editLabelStyle}>Unit <span style={{ color: "#ef4444" }}>*</span></label>
                  <select
                    value={editUnit}
                    onChange={e => setEditUnit(e.target.value)}
                    style={editSelectStyle}
                  >
                    <option value="">Select unit</option>
                    <option value="MM">MM</option>
                    <option value="INCH">INCH</option>
                    <option value="FEET">FEET</option>
                  </select>
                </div>
              </div>

              {/* Height & Width side by side */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isMobile ? "8px" : "12px" }}>
                <div>
                  <label style={editLabelStyle}>Height <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="text"
                    value={editHeight}
                    onChange={e => setEditHeight(e.target.value)}
                    placeholder="e.g. 10"
                    style={editInputStyle}
                  />
                </div>
                <div>
                  <label style={editLabelStyle}>Width <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="text"
                    value={editWidth}
                    onChange={e => setEditWidth(e.target.value)}
                    placeholder="e.g. 10"
                    style={editInputStyle}
                  />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label style={editLabelStyle}>Quantity <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="number"
                  value={editQuantity}
                  onChange={e => setEditQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  min="0"
                  style={editInputStyle}
                />
              </div>

              <div style={getButtonGroupStyle(isMobile)}>
                <Button variant="secondary" fullWidth={isMobile} size={isMobile ? "sm" : "md"} onClick={closeEditModal}>
                  Cancel
                </Button>
                <Button variant="primary" icon="💾" fullWidth={isMobile} size={isMobile ? "sm" : "md"} onClick={saveEditStock}>
                  Save Changes
                </Button>
              </div>

              {editMessage && (
                <div style={getMessageStyle(editMessage.includes("✅"))}>
                  <span style={messageIcon}>{editMessage.includes("✅") ? "✅" : "❌"}</span>
                  <span>{editMessage.replace("✅", "").replace("❌", "").trim()}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Confirm Modal for Add/Remove */}
      <ConfirmModal
        show={showConfirm}
        payload={pendingPayload || {}}
        onCancel={() => setShowConfirm(false)}
        onConfirm={confirmSaveStock}
      />
    </PageWrapper>
  );
}

export default StockDashboard;

/* ================= STYLES ================= */

const getContainerStyle = (isMobile) => ({
  maxWidth: "1400px",
  margin: "0 auto",
  padding: isMobile ? "16px 12px" : "20px 16px",
  width: "100%",
  boxSizing: "border-box",
  overflowX: "hidden",
});

const headerSection = {
  marginBottom: "14px",
};

const getPageTitleStyle = (isMobile) => ({
  fontSize: isMobile ? "22px" : "28px",
  fontWeight: "800",
  color: "#0f172a",
  margin: "0 0 8px 0",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
});

const pageSubtitle = {
  fontSize: "16px",
  color: "#64748b",
  margin: "0",
  fontWeight: "400",
};

const getStatsGridStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: isMobile ? "8px" : "10px",
  marginBottom: isMobile ? "12px" : "14px",
});

const getFilterCardStyle = (isMobile) => ({
  padding: isMobile ? "14px" : "18px",
  marginBottom: "14px",
});

const filterHeader = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "12px",
};

const filterIcon = {
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

const filterTitle = {
  fontSize: "15px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 4px 0",
};

const filterSubtitle = {
  fontSize: "14px",
  color: "#64748b",
  margin: "0",
};

const getFilterGridStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
  alignItems: "start",
});

const getTableCardStyle = (isMobile) => ({
  padding: isMobile ? "14px" : "18px",
});

const tableHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "12px",
  flexWrap: "wrap",
  gap: "10px",
};

const tableTitle = {
  fontSize: "15px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 4px 0",
};

const tableSubtitle = {
  fontSize: "14px",
  color: "#64748b",
  margin: "0",
};

const tableWrapper = {
  width: "100%",
};

const tableContainer = {
  overflowX: "auto",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
};

const table = {
  width: "100%",
  minWidth: "900px",
  borderCollapse: "collapse",
  background: "#ffffff",
  tableLayout: "fixed", // Fixed layout to prevent column shifting
};

const getTableRowStyle = (isLow) => ({
  borderBottom: "1px solid #e2e8f0",
  transition: "all 0.2s ease",
  backgroundColor: isLow ? "rgba(239, 68, 68, 0.05)" : "transparent",
});

const standBadge = {
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: "8px",
  background: "linear-gradient(135deg, #667eea15, #764ba225)",
  color: "#667eea",
  fontWeight: "600",
  fontSize: "13px",
};

const glassTypeCell = {
  fontWeight: "600",
  color: "#0f172a",
};

const getQuantityBadgeStyle = (isLow) => ({
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "14px",
  background: isLow ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
  color: isLow ? "#dc2626" : "#16a34a",
  minWidth: "40px",
  textAlign: "center",
  boxSizing: "border-box",
});

const tableHeaderCell = {
  padding: "10px 12px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: "600",
  color: "#475569",
  backgroundColor: "#f8fafc",
  borderBottom: "2px solid #e2e8f0",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const tableCell = {
  padding: "10px 12px",
  textAlign: "left",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  boxSizing: "border-box",
};

const getStatusBadgeStyle = (isLow) => ({
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "12px",
  background: isLow ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
  color: isLow ? "#dc2626" : "#16a34a",
  width: "85px", // Fixed width to accommodate both "🔴 LOW" and "✅ OK"
  textAlign: "center",
  boxSizing: "border-box",
});

const actionCell = {
  padding: "8px 10px",
  textAlign: "center",
  verticalAlign: "middle",
  width: "116px",
  whiteSpace: "nowrap",
};

const iconActionRow = {
  display: "flex",
  gap: "6px",
  justifyContent: "center",
  alignItems: "center",
};

const iconBtnStyle = (variant) => {
  const variants = {
    primary: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "#fff",
      border: "none",
      boxShadow: "0 2px 6px rgba(102,126,234,0.4)",
    },
    outline: {
      background: "transparent",
      color: "#667eea",
      border: "1.5px solid #667eea",
      boxShadow: "none",
    },
    secondary: {
      background: "#f1f5f9",
      color: "#475569",
      border: "1px solid #e2e8f0",
      boxShadow: "none",
    },
  };
  return {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "700",
    lineHeight: 1,
    transition: "all 0.15s ease",
    padding: 0,
    flexShrink: 0,
    ...variants[variant],
  };
};

const emptyState = {
  textAlign: "center",
  padding: "60px 20px",
};

const emptyIcon = {
  fontSize: "64px",
  marginBottom: "16px",
  opacity: 0.3,
};

const emptyText = {
  color: "#475569",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 8px 0",
};

const emptySubtext = {
  color: "#94a3b8",
  fontSize: "14px",
  margin: "0",
};

const loadingState = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  padding: "20px",
};

const skeletonRow = {
  height: "60px",
  borderRadius: "8px",
  background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite",
};

const getModalOverlayStyle = (isMobile) => ({
  position: "fixed",
  top: 0, left: 0,
  width: "100vw", height: "100vh",
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  justifyContent: isMobile ? "stretch" : "center",
  alignItems: isMobile ? "flex-end" : "center",
  zIndex: 10000,
  backdropFilter: "blur(4px)",
  padding: isMobile ? "0" : "20px",
});

const getModalCardStyle = (isMobile) => ({
  width: "100%",
  maxWidth: isMobile ? "100%" : "390px",
  maxHeight: isMobile ? "82vh" : "88vh",
  overflowY: "auto",
  padding: isMobile ? "0 16px 28px" : "18px",
  animation: isMobile ? "slideUp 0.25s cubic-bezier(0.32,0.72,0,1)" : "fadeIn 0.2s ease-out",
  display: "flex",
  flexDirection: "column",
  borderRadius: isMobile ? "20px 20px 0 0" : "14px",
  boxShadow: isMobile
    ? "0 -4px 32px rgba(15,23,42,0.14)"
    : "0 8px 32px rgba(15,23,42,0.12)",
  border: "none",
});

const getModalHeaderStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: isMobile ? "10px" : "14px",
  paddingBottom: isMobile ? "8px" : "10px",
  borderBottom: isMobile ? "none" : "1px solid #e2e8f0",
});

const getModalTitleStyle = (isMobile) => ({
  fontSize: isMobile ? "15px" : "18px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0",
  letterSpacing: "-0.02em",
});

const getModalSubtitleStyle = (isMobile) => ({
  fontSize: "11px",
  color: "#94a3b8",
  margin: "0",
  display: isMobile ? "none" : "block",
});

const getCloseModalBtnStyle = (isMobile) => ({
  background: isMobile ? "#f1f5f9" : "transparent",
  border: "none",
  fontSize: "14px",
  color: "#64748b",
  cursor: "pointer",
  width: "28px", height: "28px",
  borderRadius: "50%",
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
});

const getModalContentStyle = (isMobile) => ({
  display: "flex",
  flexDirection: "column",
  gap: isMobile ? "10px" : "12px",
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
});

const getStockInfoCardStyle = (isMobile) => ({
  background: "#f8fafc",
  padding: isMobile ? "10px 12px" : "14px",
  border: "1px solid #e8edf2",
  borderRadius: "8px",
});

const getInfoTitleStyle = (isMobile) => ({
  fontSize: "13px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 8px 0",
});

const getInfoGridStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: isMobile ? "5px" : "7px",
});

const getInfoItemStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: isMobile ? "3px 0" : "5px 0",
  borderBottom: isMobile ? "none" : "1px solid #f1f5f9",
});

const getInfoLabelStyle = (isMobile) => ({
  fontSize: "12px",
  fontWeight: "600",
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.4px",
});

const getInfoValueStyle = (isMobile) => ({
  fontSize: "13px",
  fontWeight: "500",
  color: "#1e293b",
});

const getButtonGroupStyle = (isMobile) => ({
  display: "flex",
  gap: "8px",
  flexWrap: isMobile ? "nowrap" : "wrap",
});

const getMessageStyle = (isSuccess) => ({
  padding: "16px",
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

/* ── Mobile card styles (ultra-compact) ── */

const mobileCardList = {
  display: "flex",
  flexDirection: "column",
  gap: "5px",
  width: "100%",
  boxSizing: "border-box",
};

const mobileCard = {
  background: "#fff",
  borderRadius: "8px",
  padding: "8px 10px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
  border: "1px solid #e2e8f0",
  width: "100%",
  boxSizing: "border-box",
  overflow: "hidden",
};

const mobileSummaryRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "6px",
  marginBottom: "5px",
};

const mobileSummaryText = {
  fontSize: "12px",
  color: "#1e293b",
  fontWeight: "500",
  flex: 1,
  lineHeight: 1.4,
  wordBreak: "break-word",
};

const getMobileStatusChip = (isLow) => ({
  fontSize: "10px",
  fontWeight: "700",
  padding: "2px 7px",
  borderRadius: "99px",
  flexShrink: 0,
  background: isLow ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
  color: isLow ? "#dc2626" : "#16a34a",
});

const mobilePendingTag = {
  fontSize: "10px",
  color: "#f59e0b",
  fontWeight: "600",
};

const mobileRevTag = {
  fontSize: "10px",
  color: "#f59e0b",
  fontWeight: "600",
};

const mobileCardActions = {
  display: "flex",
  gap: "6px",
  marginTop: "6px",
  paddingTop: "6px",
  borderTop: "1px solid #f1f5f9",
};

const mobileIconBtn = (variant) => {
  const variants = {
    primary: {
      background: "linear-gradient(135deg,#667eea,#764ba2)",
      color: "#fff",
      border: "none",
      boxShadow: "0 1px 4px rgba(102,126,234,0.35)",
    },
    outline: {
      background: "transparent",
      color: "#667eea",
      border: "1.5px solid #667eea",
    },
    secondary: {
      background: "#f1f5f9",
      color: "#475569",
      border: "1px solid #e2e8f0",
    },
  };
  return {
    flex: 1,
    height: "32px",
    borderRadius: "7px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "700",
    padding: 0,
    lineHeight: 1,
    ...variants[variant],
  };
};

/* keep unused refs from previous version from breaking */
const mobileCardTop = {};
const mobileRow = {};
const mobileLabel = {};
const mobileValue = {};


/* ── Bottom-sheet drag handle ── */
const dragHandle = {
  width: "36px", height: "4px",
  borderRadius: "2px",
  background: "#e2e8f0",
  margin: "8px auto 12px",
  flexShrink: 0,
};

/* ── Compact stock summary (mobile modals) ── */
const compactStockSummary = {
  background: "#f8fafc",
  border: "1px solid #e8edf2",
  borderRadius: "9px",
  padding: "10px 12px",
  display: "flex",
  flexDirection: "column",
  gap: "3px",
};

const compactSummaryRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
};

const compactSummaryMain = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#0f172a",
  letterSpacing: "-0.01em",
};

const compactSummaryDetail = {
  fontSize: "12px",
  color: "#64748b",
  fontWeight: "400",
};

const getCompactStatusPill = (isPending) => ({
  fontSize: "10px",
  fontWeight: "700",
  padding: "2px 8px",
  borderRadius: "99px",
  flexShrink: 0,
  background: isPending ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)",
  color: isPending ? "#d97706" : "#16a34a",
});

const editLabelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  color: "#475569",
  marginBottom: "6px",
};

const editInputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1.5px solid #e2e8f0",
  borderRadius: "8px",
  fontSize: "14px",
  color: "#0f172a",
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};

const editSelectStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1.5px solid #e2e8f0",
  borderRadius: "8px",
  fontSize: "14px",
  color: "#0f172a",
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
  cursor: "pointer",
};
