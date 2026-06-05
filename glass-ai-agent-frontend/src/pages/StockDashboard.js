import { useEffect, useState, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import api from "../api/api";
import ConfirmModal from "../components/ConfirmModal";
import { getUserRole } from "../utils/auth";
import "../styles/design-system.css";

// Short unit label: INCH→in, FEET→ft, MM→mm
const unitAbbr = (u) => ({ INCH: "in", FEET: "ft", MM: "mm" }[(u || "MM").toUpperCase()] || (u || "mm").toLowerCase());

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

  // Dark modal input style
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

  const darkLabel = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "#7180A6",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 6,
  };

  const modalOverlay = {
    position: "fixed",
    inset: 0,
    background: "rgba(5,11,31,0.85)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backdropFilter: "blur(8px)",
  };

  const modalCard = {
    background: "rgba(17,27,53,0.98)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
    boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
  };

  const modalHeader = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  };

  const modalBody = {
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  };

  const modalFooter = {
    padding: "14px 20px",
    borderTop: "1px solid rgba(255,255,255,0.07)",
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
  };

  const stockInfoBox = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "12px 14px",
  };

  return (
    <div style={{ padding: "16px 16px 24px", minHeight: "100vh" }}>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          View Stock
        </h1>
        <p style={{ fontSize: 13, color: "#A9B3D1", margin: 0 }}>
          <span style={{ color: "#37E3A5", fontWeight: 700 }}>{filteredStock.length}</span>
          {" "}total items found in inventory
        </p>
      </div>

      {/* KPI CARDS — desktop: scrollable row | mobile: 3-column mini strip */}
      {isMobile ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
          {/* STOCK */}
          <div style={{ background: "rgba(17,27,53,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, minHeight: 68 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F5DFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            {loading
              ? <div style={{ height: 22, width: 36, borderRadius: 4, background: "rgba(255,255,255,0.06)" }} />
              : <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>{totalQuantity.toLocaleString()}</div>
            }
            <div style={{ fontSize: 10, fontWeight: 600, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.06em" }}>Stock</div>
          </div>

          {/* LOW */}
          <div style={{ background: lowStockCount > 0 ? "rgba(255,107,129,0.1)" : "rgba(17,27,53,0.9)", border: lowStockCount > 0 ? "1px solid rgba(255,107,129,0.3)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, minHeight: 68 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B81" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            {loading
              ? <div style={{ height: 22, width: 24, borderRadius: 4, background: "rgba(255,255,255,0.06)" }} />
              : <div style={{ fontSize: 22, fontWeight: 800, color: lowStockCount > 0 ? "#FF6B81" : "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>{lowStockCount}</div>
            }
            <div style={{ fontSize: 10, fontWeight: 600, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.06em" }}>Low</div>
          </div>

          {/* ITEMS */}
          <div style={{ background: "rgba(17,27,53,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, minHeight: 68 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#37E3A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            {loading
              ? <div style={{ height: 22, width: 28, borderRadius: 4, background: "rgba(255,255,255,0.06)" }} />
              : <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>{totalStock}</div>
            }
            <div style={{ fontSize: 10, fontWeight: 600, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.06em" }}>Items</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4, marginBottom: 20, scrollbarWidth: "none" }}>
          {/* TOTAL STOCK card — desktop */}
          <div style={{ minWidth: 150, background: "rgba(17,27,53,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 16px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(79,93,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F5DFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.08em" }}>TOTAL STOCK</div>
            </div>
            {loading ? (
              <div style={{ height: 22, width: 80, borderRadius: 6, background: "rgba(255,255,255,0.06)" }} />
            ) : (
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>{totalQuantity.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500, color: "#A9B3D1" }}>Units</span></div>
            )}
          </div>

          {/* LOW STOCK card — desktop */}
          <div style={{ minWidth: 150, background: lowStockCount > 0 ? "rgba(255,107,129,0.1)" : "rgba(17,27,53,0.9)", border: lowStockCount > 0 ? "1px solid rgba(255,107,129,0.3)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 16px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,107,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B81" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.08em" }}>LOW STOCK</div>
            </div>
            {loading ? (
              <div style={{ height: 22, width: 60, borderRadius: 6, background: "rgba(255,255,255,0.06)" }} />
            ) : (
              <div style={{ fontSize: 20, fontWeight: 800, color: lowStockCount > 0 ? "#FF6B81" : "#fff", letterSpacing: "-0.03em" }}>{lowStockCount} <span style={{ fontSize: 12, fontWeight: 500, color: "#A9B3D1" }}>Stands</span></div>
            )}
          </div>

          {/* TOTAL ITEMS card — desktop */}
          <div style={{ minWidth: 140, background: "rgba(17,27,53,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 16px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(55,227,165,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#37E3A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.08em" }}>ITEMS</div>
            </div>
            {loading ? (
              <div style={{ height: 22, width: 50, borderRadius: 6, background: "rgba(255,255,255,0.06)" }} />
            ) : (
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>{totalStock}</div>
            )}
          </div>
        </div>
      )}

      {/* SEARCH BAR */}
      <div style={{ position: "relative", marginBottom: isMobile ? 8 : 12 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7180A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input
          className="app-input"
          style={{ paddingLeft: 42 }}
          placeholder="Search by type or dimensions..."
          value={filterThickness}
          onChange={e => setFilterThickness(e.target.value)}
        />
      </div>

      {/* FILTER CHIPS */}
      <div style={{
        display: "flex",
        gap: isMobile ? 6 : 8,
        marginBottom: isMobile ? 10 : 16,
        ...(isMobile
          ? { flexWrap: "nowrap" }
          : { overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }),
      }}>
        {/* Thickness */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: isMobile ? "0 8px" : "8px 14px", height: isMobile ? 38 : undefined, borderRadius: isMobile ? 8 : 999, background: "rgba(17,27,53,0.9)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", ...(isMobile ? { flex: 1, minWidth: 0 } : { flexShrink: 0 }) }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A9B3D1" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M21 3H3v7l9 11 9-11V3z"/></svg>
          <input
            style={{ background: "transparent", border: "none", color: "#A9B3D1", fontSize: isMobile ? 12 : 13, fontWeight: 500, width: isMobile ? "100%" : 70, outline: "none", minWidth: 0 }}
            placeholder={isMobile ? "T" : "Thickness"}
            value={filterThickness}
            onChange={e => setFilterThickness(e.target.value)}
          />
        </div>
        {/* Height */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: isMobile ? "0 8px" : "8px 14px", height: isMobile ? 38 : undefined, borderRadius: isMobile ? 8 : 999, background: "rgba(17,27,53,0.9)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", ...(isMobile ? { flex: 1, minWidth: 0 } : { flexShrink: 0 }) }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A9B3D1" strokeWidth="2" style={{ flexShrink: 0 }}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
          <input
            style={{ background: "transparent", border: "none", color: "#A9B3D1", fontSize: isMobile ? 12 : 13, fontWeight: 500, width: isMobile ? "100%" : 60, outline: "none", minWidth: 0 }}
            placeholder={isMobile ? "H" : "Height"}
            value={filterHeight}
            onChange={e => setFilterHeight(e.target.value)}
          />
        </div>
        {/* Width */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: isMobile ? "0 8px" : "8px 14px", height: isMobile ? 38 : undefined, borderRadius: isMobile ? 8 : 999, background: "rgba(17,27,53,0.9)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", ...(isMobile ? { flex: 1, minWidth: 0 } : { flexShrink: 0 }) }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A9B3D1" strokeWidth="2" style={{ flexShrink: 0 }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          <input
            style={{ background: "transparent", border: "none", color: "#A9B3D1", fontSize: isMobile ? 12 : 13, fontWeight: 500, width: isMobile ? "100%" : 60, outline: "none", minWidth: 0 }}
            placeholder={isMobile ? "W" : "Width"}
            value={filterWidth}
            onChange={e => setFilterWidth(e.target.value)}
          />
        </div>
        {/* Unit */}
        <select
          value={searchUnit}
          onChange={e => setSearchUnit(e.target.value)}
          style={{ padding: isMobile ? "0 6px" : "8px 14px", height: isMobile ? 38 : undefined, borderRadius: isMobile ? 8 : 999, background: "rgba(17,27,53,0.9)", border: "1px solid rgba(255,255,255,0.1)", color: "#A9B3D1", fontSize: isMobile ? 12 : 13, fontWeight: 500, cursor: "pointer", outline: "none", ...(isMobile ? { flex: "0 0 56px" } : { flexShrink: 0 }) }}
        >
          <option value="MM">MM</option>
          <option value="INCH">IN</option>
          <option value="FEET">FT</option>
        </select>
        {/* Clear */}
        {(filterThickness || filterHeight || filterWidth) && (
          <button
            onClick={() => { setFilterThickness(""); setFilterHeight(""); setFilterWidth(""); setSearchUnit("MM"); }}
            style={isMobile
              ? { width: 38, height: 38, borderRadius: 8, background: "rgba(255,107,129,0.15)", border: "1px solid rgba(255,107,129,0.3)", color: "#FF6B81", fontSize: 16, fontWeight: 700, cursor: "pointer", flexShrink: 0, outline: "none", display: "flex", alignItems: "center", justifyContent: "center" }
              : { padding: "8px 14px", borderRadius: 999, background: "rgba(255,107,129,0.15)", border: "1px solid rgba(255,107,129,0.3)", color: "#FF6B81", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0, outline: "none" }
            }
          >
            {isMobile ? "×" : "Clear"}
          </button>
        )}
      </div>

      {/* STOCK LIST */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 8 : 10 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: isMobile ? 96 : 148, borderRadius: isMobile ? 12 : 16, background: "rgba(255,255,255,0.04)", backgroundSize: "200% 100%", backgroundImage: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%)" }} />
          ))}
        </div>
      ) : filteredStock.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "rgba(17,27,53,0.9)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📦</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#fff", margin: "0 0 6px" }}>No stock found</p>
          <p style={{ fontSize: 13, color: "#7180A6", margin: 0 }}>{filterThickness || filterHeight || filterWidth ? "Try adjusting your filters" : "Add stock to get started"}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 8 : 12 }}>
          {filteredStock.map((s, i) => {
            const isLow = s.quantity < s.minQuantity;
            const isReverseMatch = s.isReverseMatch || false;
            const unit = s.glass?.unit || "MM";
            const dimStr = (s.height && s.width) ? `${s.height}×${s.width} ${unitAbbr(unit)}` : null;
            const thickStr = s.glass?.thickness ? formatThicknessMM(s.glass.thickness).replace(" mm", "MM") : null;

            const cardBase = {
              background: isLow ? "rgba(255,107,129,0.07)" : "rgba(17,27,53,0.9)",
              border: isLow ? "1px solid rgba(255,107,129,0.25)" : "1px solid rgba(255,255,255,0.08)",
              borderLeft: isLow ? "3px solid #FF6B81" : "3px solid transparent",
              transition: "all 160ms ease",
            };

            if (isMobile) {
              /* ── COMPACT MOBILE CARD (~100px) ── */
              return (
                <div key={i} style={{ ...cardBase, borderRadius: 12, padding: "10px 12px" }}>
                  {/* Row 1: Stand + reverse badge | Status dot */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ padding: "2px 7px", borderRadius: 5, background: "rgba(79,93,255,0.2)", border: "1px solid rgba(79,93,255,0.3)", color: "#818CF8", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em" }}>
                        STAND #{s.standNo}
                      </span>
                      {isReverseMatch && (
                        <span style={{ padding: "2px 5px", borderRadius: 4, background: "rgba(255,185,94,0.2)", color: "#FFB95E", fontSize: 9, fontWeight: 700 }}>REV</span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: isLow ? "#FF6B81" : "#37E3A5", display: "inline-block", boxShadow: isLow ? "0 0 5px #FF6B81" : "0 0 5px #37E3A5" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: isLow ? "#FF6B81" : "#37E3A5" }}>{isLow ? "LOW" : "OK"}</span>
                    </div>
                  </div>

                  {/* Row 2: Type • Thickness • Size */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {[s.glass?.type || "N/A", thickStr, dimStr].filter(Boolean).join(" • ")}
                    {s.status === "PENDING" && <span style={{ marginLeft: 6, fontSize: 10, color: "#FFB95E", fontWeight: 600 }}>⏳</span>}
                  </div>

                  {/* Row 3: Qty | icon buttons */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.05em" }}>Qty</span>
                      <span style={{ fontSize: 19, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.03em", lineHeight: 1 }}>{s.quantity}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => openEditModal(s)}
                        title="Edit"
                        style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#A9B3D1", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, outline: "none", transition: "all 120ms ease" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.13)"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#A9B3D1"; }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button
                        onClick={() => openTransferModal(s)}
                        title="Move"
                        style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#A9B3D1", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, outline: "none", transition: "all 120ms ease" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.13)"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#A9B3D1"; }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
                      </button>
                      <button
                        onClick={() => openAddRemoveModal(s)}
                        title="Add/Remove"
                        style={{ width: 32, height: 32, borderRadius: 8, background: "#4F5DFF", border: "none", color: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, outline: "none", boxShadow: "0 2px 10px rgba(79,93,255,0.4)", transition: "all 120ms ease" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#3D4DE8"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#4F5DFF"; }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            /* ── DESKTOP CARD (unchanged premium style) ── */
            const thickStrFull = s.glass?.thickness ? `${formatThicknessMM(s.glass.thickness)} thickness` : null;
            const dimStrFull = (s.height && s.width) ? `${s.height} × ${s.width} ${unitAbbr(unit)}` : null;
            return (
              <div
                key={i}
                style={{ ...cardBase, borderRadius: 16, padding: "14px 16px" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = isLow ? "rgba(255,107,129,0.4)" : "rgba(255,255,255,0.14)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isLow ? "rgba(255,107,129,0.25)" : "rgba(255,255,255,0.08)"; }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 6, background: "rgba(79,93,255,0.2)", border: "1px solid rgba(79,93,255,0.3)", color: "#818CF8", fontSize: 10.5, fontWeight: 700, flexShrink: 0, letterSpacing: "0.04em" }}>
                      STAND #{s.standNo}
                    </span>
                    {isReverseMatch && (
                      <span style={{ display: "inline-flex", padding: "3px 7px", borderRadius: 6, background: "rgba(255,185,94,0.2)", color: "#FFB95E", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>REVERSED</span>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end", marginBottom: 2 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: isLow ? "#FF6B81" : "#37E3A5", display: "inline-block", boxShadow: isLow ? "0 0 6px #FF6B81" : "0 0 6px #37E3A5" }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: isLow ? "#FF6B81" : "#37E3A5", letterSpacing: "0.02em" }}>{isLow ? "LOW" : "OK"}</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.quantity}</div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.08em" }}>UNITS</div>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 3, letterSpacing: "-0.01em" }}>
                    {s.glass?.type || "N/A"}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#A9B3D1" }}>
                    {[thickStrFull, dimStrFull].filter(Boolean).join(" | ")}
                  </div>
                  {s.status === "PENDING" && (
                    <span style={{ display: "inline-flex", marginTop: 5, padding: "2px 8px", borderRadius: 999, background: "rgba(255,185,94,0.15)", color: "#FFB95E", fontSize: 10.5, fontWeight: 600 }}>⏳ Pending approval</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => openEditModal(s)}
                    style={{ flex: 1, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#A9B3D1", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all 140ms ease", fontFamily: "inherit", outline: "none" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#A9B3D1"; }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                  </button>
                  <button
                    onClick={() => openTransferModal(s)}
                    style={{ flex: 1, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#A9B3D1", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all 140ms ease", fontFamily: "inherit", outline: "none" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#A9B3D1"; }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
                    Move
                  </button>
                  <button
                    onClick={() => openAddRemoveModal(s)}
                    style={{ width: 36, height: 36, borderRadius: 10, background: "#4F5DFF", border: "none", color: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 140ms ease", flexShrink: 0, fontFamily: "inherit", outline: "none", boxShadow: "0 2px 12px rgba(79,93,255,0.35)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#3D4DE8"; e.currentTarget.style.transform = "scale(1.05)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#4F5DFF"; e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ConfirmModal */}
      <ConfirmModal
        show={showConfirm}
        payload={pendingPayload || {}}
        onCancel={() => setShowConfirm(false)}
        onConfirm={confirmSaveStock}
      />

      {/* Add/Remove Modal */}
      {showAddRemoveModal && selectedStock && (
        <div style={modalOverlay} onClick={closeAddRemoveModal}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>Add / Remove Stock</h3>
              <button
                onClick={closeAddRemoveModal}
                style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "none", color: "#A9B3D1", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}
              >✕</button>
            </div>
            <div style={modalBody}>
              {/* Stock summary */}
              <div style={stockInfoBox}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  Stand #{selectedStock.standNo} &mdash; {selectedStock.glass?.type || "N/A"}
                </div>
                <div style={{ fontSize: 12, color: "#A9B3D1" }}>
                  {formatThicknessMM(selectedStock.glass?.thickness)} &nbsp;|&nbsp; {selectedStock.height}×{selectedStock.width} {unitAbbr(selectedStock.glass?.unit)} &nbsp;|&nbsp; Qty {selectedStock.quantity}
                </div>
                {selectedStock.status === "PENDING" && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "#FFB95E" }}>⚠️ This stock is pending price approval from Admin</div>
                )}
              </div>

              <div>
                <label style={darkLabel}>Quantity</label>
                <input
                  type="number"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  style={darkInput}
                  min="1"
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => updateStock("ADD")}
                  style={{ flex: 1, height: 40, borderRadius: 10, background: "rgba(55,227,165,0.15)", border: "1px solid rgba(55,227,165,0.3)", color: "#37E3A5", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", outline: "none" }}
                >
                  + Add
                </button>
                <button
                  onClick={() => updateStock("REMOVE")}
                  style={{ flex: 1, height: 40, borderRadius: 10, background: "rgba(255,107,129,0.15)", border: "1px solid rgba(255,107,129,0.3)", color: "#FF6B81", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", outline: "none" }}
                >
                  − Remove
                </button>
              </div>

              {showUndo && (
                <button
                  onClick={undoLastAction}
                  style={{ width: "100%", height: 40, borderRadius: 10, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#A9B3D1", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", outline: "none" }}
                >
                  ↩ Undo Last Action
                </button>
              )}

              {stockMessage && (
                <div style={{ fontSize: 12.5, color: stockMessage.includes("✅") ? "#37E3A5" : "#FF6B81", padding: "10px 12px", background: stockMessage.includes("✅") ? "rgba(55,227,165,0.08)" : "rgba(255,107,129,0.08)", borderRadius: 8, border: `1px solid ${stockMessage.includes("✅") ? "rgba(55,227,165,0.2)" : "rgba(255,107,129,0.2)"}` }}>
                  {stockMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && transferStock && (
        <div style={modalOverlay} onClick={closeTransferModal}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>Transfer Stock</h3>
              <button
                onClick={closeTransferModal}
                style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "none", color: "#A9B3D1", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}
              >✕</button>
            </div>
            <div style={modalBody}>
              <div style={stockInfoBox}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  Stand #{transferStock.standNo} &mdash; {transferStock.glass?.type || "N/A"}
                </div>
                <div style={{ fontSize: 12, color: "#A9B3D1" }}>
                  {formatThicknessMM(transferStock.glass?.thickness)} &nbsp;|&nbsp; {transferStock.height}×{transferStock.width} {unitAbbr(transferStock.glass?.unit)} &nbsp;|&nbsp; Available: {transferStock.quantity}
                </div>
              </div>

              <div>
                <label style={darkLabel}>To Stand Number</label>
                <input
                  type="number"
                  placeholder="Destination stand"
                  value={toStand}
                  onChange={e => setToStand(e.target.value)}
                  style={darkInput}
                  min="1"
                />
              </div>

              <div>
                <label style={darkLabel}>Quantity to Transfer</label>
                <input
                  type="number"
                  placeholder="Enter quantity"
                  value={transferQuantity}
                  onChange={e => setTransferQuantity(e.target.value)}
                  style={darkInput}
                  min="1"
                />
                <div style={{ fontSize: 11, color: "#7180A6", marginTop: 4 }}>Max: {transferStock.quantity}</div>
              </div>

              <button
                onClick={handleTransfer}
                style={{ width: "100%", height: 42, borderRadius: 10, background: "#4F5DFF", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", outline: "none", boxShadow: "0 2px 12px rgba(79,93,255,0.35)" }}
              >
                Transfer Stock
              </button>

              {transferMessage && (
                <div style={{ fontSize: 12.5, color: typeof transferMessage === 'string' && transferMessage.includes("✅") ? "#37E3A5" : "#FF6B81", padding: "10px 12px", background: typeof transferMessage === 'string' && transferMessage.includes("✅") ? "rgba(55,227,165,0.08)" : "rgba(255,107,129,0.08)", borderRadius: 8, border: `1px solid ${typeof transferMessage === 'string' && transferMessage.includes("✅") ? "rgba(55,227,165,0.2)" : "rgba(255,107,129,0.2)"}` }}>
                  {transferMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Confirm Modal */}
      {showTransferConfirm && transferStock && (
        <div style={modalOverlay} onClick={() => setShowTransferConfirm(false)}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>Confirm Transfer</h3>
              <button
                onClick={() => setShowTransferConfirm(false)}
                style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "none", color: "#A9B3D1", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}
              >✕</button>
            </div>
            <div style={modalBody}>
              <div style={stockInfoBox}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Transfer Summary</div>
                {[
                  ["Glass Type", transferStock.glass?.type || "N/A"],
                  ["Size", `${transferStock.height} × ${transferStock.width} ${unitAbbr(transferStock.glass?.unit)}`],
                  ["From Stand", `#${transferStock.standNo}`],
                  ["To Stand", `#${toStand}`],
                  ["Quantity", `${transferQuantity} units`],
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.06em" }}>{lbl}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={modalFooter}>
              <button
                onClick={() => { setShowTransferConfirm(false); setShowTransferModal(true); }}
                style={{ height: 38, padding: "0 18px", borderRadius: 10, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#A9B3D1", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", outline: "none" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmTransfer}
                style={{ height: 38, padding: "0 18px", borderRadius: 10, background: "#4F5DFF", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", outline: "none", boxShadow: "0 2px 12px rgba(79,93,255,0.35)" }}
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Stock Modal */}
      {showEditModal && editStock && (
        <div style={modalOverlay} onClick={closeEditModal}>
          <div style={{ ...modalCard, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>Edit Stock · Stand #{editStock.standNo}</h3>
              <button
                onClick={closeEditModal}
                style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "none", color: "#A9B3D1", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}
              >✕</button>
            </div>
            <div style={modalBody}>
              {/* Glass Type */}
              <div>
                <label style={darkLabel}>Glass Type <span style={{ color: "#FF6B81" }}>*</span></label>
                <select
                  value={editGlassType}
                  onChange={e => setEditGlassType(e.target.value)}
                  style={darkSelect}
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={darkLabel}>Thickness (MM) <span style={{ color: "#FF6B81" }}>*</span></label>
                  <select
                    value={editThickness}
                    onChange={e => setEditThickness(e.target.value)}
                    style={darkSelect}
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
                  <label style={darkLabel}>Unit <span style={{ color: "#FF6B81" }}>*</span></label>
                  <select
                    value={editUnit}
                    onChange={e => setEditUnit(e.target.value)}
                    style={darkSelect}
                  >
                    <option value="">Select unit</option>
                    <option value="MM">MM</option>
                    <option value="INCH">INCH</option>
                    <option value="FEET">FEET</option>
                  </select>
                </div>
              </div>

              {/* Height & Width side by side */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={darkLabel}>Height <span style={{ color: "#FF6B81" }}>*</span></label>
                  <input
                    type="text"
                    value={editHeight}
                    onChange={e => setEditHeight(e.target.value)}
                    placeholder="e.g. 10"
                    style={darkInput}
                  />
                </div>
                <div>
                  <label style={darkLabel}>Width <span style={{ color: "#FF6B81" }}>*</span></label>
                  <input
                    type="text"
                    value={editWidth}
                    onChange={e => setEditWidth(e.target.value)}
                    placeholder="e.g. 10"
                    style={darkInput}
                  />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label style={darkLabel}>Quantity <span style={{ color: "#FF6B81" }}>*</span></label>
                <input
                  type="number"
                  value={editQuantity}
                  onChange={e => setEditQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  min="0"
                  style={darkInput}
                />
              </div>

              {editMessage && (
                <div style={{ fontSize: 12.5, color: editMessage.includes("✅") ? "#37E3A5" : "#FF6B81", padding: "10px 12px", background: editMessage.includes("✅") ? "rgba(55,227,165,0.08)" : "rgba(255,107,129,0.08)", borderRadius: 8, border: `1px solid ${editMessage.includes("✅") ? "rgba(55,227,165,0.2)" : "rgba(255,107,129,0.2)"}` }}>
                  {editMessage}
                </div>
              )}
            </div>
            <div style={modalFooter}>
              <button
                onClick={closeEditModal}
                style={{ height: 38, padding: "0 18px", borderRadius: 10, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#A9B3D1", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", outline: "none" }}
              >
                Cancel
              </button>
              <button
                onClick={saveEditStock}
                style={{ height: 38, padding: "0 18px", borderRadius: 10, background: "#4F5DFF", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", outline: "none", boxShadow: "0 2px 12px rgba(79,93,255,0.35)" }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockDashboard;
