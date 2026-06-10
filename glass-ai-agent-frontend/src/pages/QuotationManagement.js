import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../components/PageWrapper";
import { useGlassTypes } from "../api/glassTypeApi";
import {
  getCustomers,
  createCustomer,
  getQuotations,
  createQuotation,
  confirmQuotation,
  getQuotationById,
  getAllStock,
  deleteQuotation,
  downloadQuotationPdf,
  printCuttingPad,
  getArchitects,
} from "../api/quotationApi";
import { useResponsive } from "../hooks/useResponsive";
import { getUserRole } from "../utils/auth";
import { Badge } from "../components/ui";
import "../styles/design-system.css";

/* ─── Compact icon-action button for table rows ─────────────────────────────── */
const ICON_BTN_VARIANTS = {
  view:    { idle: { bg: "transparent", color: "#7180A6", border: "1px solid rgba(255,255,255,0.1)" }, hover: { bg: "rgba(79,93,255,0.15)", color: "#818CF8", border: "1px solid rgba(79,93,255,0.35)" } },
  confirm: { idle: { bg: "transparent", color: "#7180A6", border: "1px solid rgba(255,255,255,0.1)" }, hover: { bg: "rgba(55,227,165,0.15)", color: "#37E3A5", border: "1px solid rgba(55,227,165,0.35)" } },
  reject:  { idle: { bg: "transparent", color: "#7180A6", border: "1px solid rgba(255,255,255,0.1)" }, hover: { bg: "rgba(255,185,94,0.15)", color: "#FFB95E", border: "1px solid rgba(255,185,94,0.35)" } },
  delete:  { idle: { bg: "transparent", color: "#7180A6", border: "1px solid rgba(255,255,255,0.1)" }, hover: { bg: "rgba(255,107,129,0.15)", color: "#FF6B81", border: "1px solid rgba(255,107,129,0.35)" } },
};

function QuotaActBtn({ variant = "view", title, onClick, children }) {
  const [hov, setHov] = useState(false);
  const v = ICON_BTN_VARIANTS[variant];
  const s = hov ? v.hover : v.idle;
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 30, height: 30, borderRadius: 7, padding: 0,
        background: s.bg, color: s.color, border: s.border,
        cursor: "pointer", fontSize: 14, lineHeight: 1,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        transition: "all 140ms ease", flexShrink: 0, userSelect: "none",
        transform: hov ? "scale(1.08)" : "scale(1)",
        boxShadow: hov ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
        fontFamily: "inherit",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  );
}


/* ─── Viewport-safe dropdown button — renders via Portal to avoid overflow clipping ── */
function DocDropdownBtn({ label, icon, items, iconOnly = false }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const calcPos = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const estW = 180;
    const estH = items.length * 44 + 8;
    // Right-align to trigger, clamp to stay inside viewport
    let left = r.right - estW;
    left = Math.max(8, Math.min(left, vw - estW - 8));
    // Open below trigger; flip above if too close to bottom
    let top = r.bottom + 5;
    if (top + estH > vh - 8) top = Math.max(8, r.top - estH - 5);
    setPos({ top, left });
  };

  const toggle = () => { if (!open) calcPos(); setOpen(v => !v); };

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onUpdate = () => calcPos();
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', onUpdate, true);
    window.addEventListener('resize', onUpdate);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', onUpdate, true);
      window.removeEventListener('resize', onUpdate);
    };
  }, [open]);

  return (
    <>
      <div ref={triggerRef} style={{ display: 'inline-block' }}>
        <button
          onClick={toggle}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: iconOnly ? 0 : 5,
            padding: iconOnly ? '0' : '6px 11px',
            width: iconOnly ? 32 : 'auto', height: 32,
            borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
            background: open ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
            color: '#A9B3D1', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: "'Inter',-apple-system,sans-serif",
            transition: 'all 140ms ease', whiteSpace: 'nowrap',
            justifyContent: 'center',
          }}
          onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
        >
          {icon && <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>}
          {!iconOnly && <span>{label}</span>}
          {!iconOnly && <span style={{ fontSize: 9, color: '#7180A6', marginLeft: 1 }}>▾</span>}
        </button>
      </div>
      {open && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left,
            background: 'rgba(17,27,53,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            minWidth: 168, maxWidth: '90vw',
            zIndex: 99999, overflow: 'hidden',
          }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false); }}
              style={{
                width: '100%', padding: '9px 14px',
                background: 'transparent', border: 'none', textAlign: 'left',
                cursor: 'pointer', fontSize: 13, color: '#A9B3D1',
                fontFamily: "'Inter',-apple-system,sans-serif", fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {item.icon && <span style={{ fontSize: 14, width: 18, flexShrink: 0, textAlign: 'center' }}>{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

/* ─── Compact meta field ─────────────────────────────────────────────────────── */
function MetaField({ label, children }) {
  if (!children) return null;
  return (
    <div style={{ padding: '10px 16px', borderRight: '1px solid rgba(255,255,255,0.08)', minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: '#7180A6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3, fontFamily: "'Inter',-apple-system,sans-serif", whiteSpace: 'nowrap' }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

/* ─── KPI amount cell ────────────────────────────────────────────────────────── */
function KpiCell({ label, value, highlight, negative, color }) {
  const v = parseFloat(value) || 0;
  return (
    <div style={{
      padding: '12px 18px', borderRight: '1px solid rgba(255,255,255,0.08)', minWidth: 0,
      background: highlight ? 'rgba(79,93,255,0.15)' : 'transparent',
    }}>
      <div style={{ fontSize: 10.5, color: '#7180A6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, whiteSpace: 'nowrap', fontFamily: "'Inter',-apple-system,sans-serif" }}>{label}</div>
      <div style={{ fontSize: highlight ? 18 : 14, fontWeight: highlight ? 800 : 600, color: color || (highlight ? '#818CF8' : '#E2E8F0'), letterSpacing: '-0.02em', fontFamily: "'Inter',-apple-system,sans-serif", whiteSpace: 'nowrap' }}>
        {negative ? '−' : ''}₹{v.toFixed(2)}
      </div>
    </div>
  );
}

function QuotationManagement() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [allStock, setAllStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const { isMobile, isTablet } = useResponsive(); // Use responsive hook
  const [showStockDropdown, setShowStockDropdown] = useState({}); // { [index]: true/false }
  const [stockDropdownType, setStockDropdownType] = useState({}); // { [index]: 'glassType' | 'thickness' }
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'CONFIRM'|'REJECT'|'DELETE', quotationId: number, quotationNumber: string }
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [pendingRejection, setPendingRejection] = useState(null); // { quotationId, action }
  const [architects,      setArchitects]      = useState([]);
  const [archSearch,      setArchSearch]      = useState("");
  const [archDropOpen,    setArchDropOpen]    = useState(false);
  const [showCharges,     setShowCharges]     = useState(false); // collapsible Additional Charges
  const [selectedArch,    setSelectedArch]    = useState(null);

  const getDefaultValidUntil = (quotationDate) => {
    if (!quotationDate) return "";
    const date = new Date(quotationDate);
    date.setDate(date.getDate() + 15);
    return date.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    customerSelectionMode: "SELECT_FROM_LIST", // "SELECT_FROM_LIST" or "MANUAL"
    customerId: "",
    referenceArchitectId: null,
    manualCustomerName: "",
    manualCustomerMobile: "",
    manualCustomerEmail: "",
    manualCustomerAddress: "",
    billingType: "GST",
    quotationDate: new Date().toISOString().split("T")[0],
    validUntil: getDefaultValidUntil(new Date().toISOString().split("T")[0]),
    gstPercentage: 18,
    customerState: "",
    installationCharge: 0,
    transportCharge: 0,
    transportationRequired: false,
    discount: 0,
    discountType: "AMOUNT", // "AMOUNT" or "PERCENTAGE"
    discountValue: 0,
    shippingAddress: "", // Shipping address for delivery
    items: [
      {
        glassType: "", // Glass type: Plan, Extra Clear, etc.
        thickness: "", // Thickness value
        height: "",
        width: "",
        heightUnit: "INCH",
        widthUnit: "INCH",
        quantity: 1,
        ratePerSqft: "",
        sellingPrice: "", // Selling price from stock (per SqFt)
        purchasePrice: "", // Purchase price from stock (for profit calculation, admin only)
        design: "",
        hsnCode: "",
        description: "",
        // New fields for quotation features
        sizeInMM: false, // Toggle for MM/INCH mode
        heightUnit: "INCH", // Default to INCH
        widthUnit: "INCH", // Default to INCH
        heightTableNumber: 6, // Default table number for height
        widthTableNumber: 6, // Default table number for width
        selectedHeightTableValue: null, // Selected value from height table
        selectedWidthTableValue: null, // Selected value from width table
        polishSelection: [
          { side: "Height 1", checked: false, type: null, rate: 0 },
          { side: "Width 1", checked: false, type: null, rate: 0 },
          { side: "Height 2", checked: false, type: null, rate: 0 },
          { side: "Width 2", checked: false, type: null, rate: 0 },
        ],
        polishRates: { P: 15, H: 75, B: 75 }, // Default rates
        polish: "", // Hand-Polish or CNC Polish (per item)
        heightOriginal: "", // Store original fraction string
        widthOriginal: "", // Store original fraction string
        heightMM: "", // Store original MM value when sizeInMM is true
        widthMM: "", // Store original MM value when sizeInMM is true
      },
    ],
  });

  useEffect(() => {
    loadCustomers();
    loadQuotations();
    loadStock();
    getArchitects().then(r => setArchitects(r.data || [])).catch(() => {});
  }, []);

  const loadStock = async () => {
    try {
      const response = await getAllStock();
      setAllStock(response.data);
    } catch (error) {
      console.error("Failed to load stock", error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await getCustomers();
      setCustomers(response.data);
    } catch (error) {
      console.error("Failed to load customers", error);
    }
  };

  const loadQuotations = async () => {
    try {
      setLoading(true);
      const response = await getQuotations();
      setQuotations(response.data);
    } catch (error) {
      setMessage("❌ Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          glassType: "",
          thickness: "",
          height: "",
          width: "",
          heightUnit: "INCH",
          widthUnit: "INCH",
          quantity: 1,
          ratePerSqft: "",
          design: "",
          hsnCode: "",
          description: "",
          // New fields for quotation features
          sizeInMM: false,
          heightTableNumber: 6,
          widthTableNumber: 6,
          selectedHeightTableValue: null,
          selectedWidthTableValue: null,
          polishSelection: [
            { side: "Height 1", checked: false, type: null, rate: 0 },
            { side: "Width 1", checked: false, type: null, rate: 0 },
            { side: "Height 2", checked: false, type: null, rate: 0 },
            { side: "Width 2", checked: false, type: null, rate: 0 },
          ],
          polishRates: { P: 15, H: 75, B: 75 },
          polish: "",
          heightOriginal: "",
          widthOriginal: "",
          heightMM: "", // Store original MM value when sizeInMM is true
          widthMM: "", // Store original MM value when sizeInMM is true
        },
      ],
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const convertToFeet = (value, unit) => {
    if (!value) return 0;
    const numValue = parseFloat(value);
    switch (unit) {
      case "MM":
        return numValue / 304.8; // 1 foot = 304.8 mm
      case "INCH":
        return numValue / 12; // 1 foot = 12 inches
      case "FEET":
        return numValue;
      default:
        return numValue;
    }
  };

  const calculateAreaInUnit = (height, width, heightUnit, widthUnit) => {
    if (!height || !width) return 0;
    const h = parseFloat(height) || 0;
    const w = parseFloat(width) || 0;
    if (h === 0 || w === 0) return 0;
    
    const hUnit = heightUnit || "FEET";
    const wUnit = widthUnit || "FEET";
    
    // If both units are the same, calculate directly
    if (hUnit === wUnit) {
      return h * w;
    }
    
    // If different units, convert both to MM for consistency, then convert back to height unit
    let hInMM = h;
    let wInMM = w;
    
    if (hUnit === "FEET") hInMM = h * 304.8;
    else if (hUnit === "INCH") hInMM = h * 25.4;
    // else MM, no conversion needed
    
    if (wUnit === "FEET") wInMM = w * 304.8;
    else if (wUnit === "INCH") wInMM = w * 25.4;
    // else MM, no conversion needed
    
    const areaInMM = hInMM * wInMM;
    
    // Convert back to the primary unit (height unit) for display
    if (hUnit === "FEET") return areaInMM / (304.8 * 304.8);
    else if (hUnit === "INCH") return areaInMM / (25.4 * 25.4);
    else return areaInMM; // MM
  };

  const getAreaUnitLabel = (heightUnit, widthUnit) => {
    const unit = heightUnit || widthUnit || "FEET";
    switch (unit) {
      case "MM":
        return "SqMM";
      case "INCH":
        return "SqInch";
      case "FEET":
        return "SqFt";
      default:
        return "SqFt";
    }
  };

  // ==================== QUOTATION FEATURE HELPER FUNCTIONS ====================
  
  /**
   * Parse fraction input to decimal
   * Supports: "9 1/2", "9-1/2", "1/2", "9.5", "9"
   */
  const parseFraction = (input) => {
    if (!input || input === "") return 0;
    
    // Remove whitespace
    const cleaned = input.trim();
    
    // Handle decimal format
    if (/^\d+\.?\d*$/.test(cleaned)) {
      return parseFloat(cleaned) || 0;
    }
    
    // Handle fraction formats: "9 1/2", "9-1/2", "1/2"
    const fractionMatch = cleaned.match(/^(\d+)?[\s-]?(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const whole = fractionMatch[1] ? parseFloat(fractionMatch[1]) : 0;
      const numerator = parseFloat(fractionMatch[2]);
      const denominator = parseFloat(fractionMatch[3]);
      if (denominator === 0) return 0;
      return whole + (numerator / denominator);
    }
    
    // Try to parse as regular number
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  /**
   * Generate table values based on table number (unlimited)
   * Table 6: [6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, ...]
   * Generates up to 1000 multiples for unlimited table support
   */
  const generateTableValues = (tableNumber) => {
    const num = parseInt(tableNumber) || 6;
    const values = [];
    // Generate up to 1000 multiples for unlimited table support
    for (let i = 1; i <= 1000; i++) {
      values.push(num * i);
    }
    return values;
  };

  /**
   * Find exact match or next value greater than input
   */
  const findNextTableValue = (input, tableNumber) => {
    if (!input || input === "") return null;
    
    const decimalValue = typeof input === 'string' ? parseFraction(input) : parseFloat(input);
    if (isNaN(decimalValue)) return null;
    
    const tableValues = generateTableValues(tableNumber);
    
    // Find exact match
    const exactMatch = tableValues.find(v => Math.abs(v - decimalValue) < 0.01);
    if (exactMatch !== undefined) return exactMatch;
    
    // Find next value greater than input
    const nextValue = tableValues.find(v => v > decimalValue);
    return nextValue !== undefined ? nextValue : tableValues[tableValues.length - 1];
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    const item = newItems[index];
    
    // Handle sizeInMM toggle
    if (field === "sizeInMM") {
      item.sizeInMM = value;
      // Store the unit that matches what the user selected
      item.heightUnit = value ? "MM" : "INCH";
      item.widthUnit  = value ? "MM" : "INCH";

      if (!value) {
        // Toggling OFF: if we had MM values stored, clear them so user re-enters in INCH
        if (item.heightMM) { item.height = ""; item.heightMM = ""; item.heightOriginal = ""; }
        if (item.widthMM)  { item.width  = ""; item.widthMM  = ""; item.widthOriginal  = ""; }
      }
    } else {
      item[field] = value;
      // When glass type changes, reset thickness so the user picks from the
      // new filtered list rather than keeping a value that may not exist for
      // the newly selected type.
      if (field === "glassType") {
        item.thickness = "";
      }
    }

    // Handle height/width input - parse fraction and auto-select table value
    if (field === "height" || field === "width") {
      let decimalValue;

      // If sizeInMM is checked, store the MM value directly.
      // Convert to INCH only for the cutting-table lookup (decimalValue), not for storage.
      if (item.sizeInMM) {
        const mmValue = parseFloat(value) || 0;

        // Store the original MM value in height/width so the API receives MM
        if (field === "height") {
          item.height         = String(value);   // MM value stored as-is
          item.heightMM       = String(value);   // kept for backward-compat display
          item.heightOriginal = String(value);
        } else if (field === "width") {
          item.width         = String(value);
          item.widthMM       = String(value);
          item.widthOriginal = String(value);
        }

        // Convert to INCH only for table-lookup decimal calculation
        decimalValue = mmValue / 25.4;
      } else {
        // Normal inch input mode
        if (field === "height") {
          item.heightOriginal = value;
        } else if (field === "width") {
          item.widthOriginal = value;
        }
        
        // Parse fraction input
        decimalValue = parseFraction(value);
      }
      
      // Auto-select table value (always use inch values for table selection)
      if (field === "height" && decimalValue > 0) {
        const tableValue = findNextTableValue(decimalValue, item.heightTableNumber || 6);
        item.selectedHeightTableValue = tableValue;
        // Update polish selection row labels
        updatePolishSelectionNumbers(item);
      } else if (field === "width" && decimalValue > 0) {
        const tableValue = findNextTableValue(decimalValue, item.widthTableNumber || 6);
        item.selectedWidthTableValue = tableValue;
        // Update polish selection row labels
        updatePolishSelectionNumbers(item);
      }
    }

    // Handle table number change - recalculate selected values
    if (field === "heightTableNumber") {
      // Store the value as-is (string during typing, number on blur)
      // Only recalculate table value if we have a valid number
      const numValue = typeof value === 'string' ? parseInt(value) : value;
      if (!isNaN(numValue) && numValue > 0) {
        const tableValue = findNextTableValue(item.height || 0, numValue);
        item.selectedHeightTableValue = tableValue;
        updatePolishSelectionNumbers(item);
      }
    }
    if (field === "widthTableNumber") {
      // Store the value as-is (string during typing, number on blur)
      // Only recalculate table value if we have a valid number
      const numValue = typeof value === 'string' ? parseInt(value) : value;
      if (!isNaN(numValue) && numValue > 0) {
        const tableValue = findNextTableValue(item.width || 0, numValue);
        item.selectedWidthTableValue = tableValue;
        updatePolishSelectionNumbers(item);
      }
    }

    // Auto-calculate area and subtotal
    if (field === "height" || field === "width" || field === "heightUnit" || field === "widthUnit" || field === "sizeInMM" || field === "heightTableNumber" || field === "widthTableNumber" || field === "selectedHeightTableValue" || field === "selectedWidthTableValue") {
      // Calculate area in the input unit for display (use input values for display)
      const heightValue = parseFraction(item.height || 0);
      const widthValue = parseFraction(item.width || 0);
      const areaInUnit = calculateAreaInUnit(
        heightValue,
        widthValue,
        item.heightUnit || "FEET",
        item.widthUnit || "FEET"
      );
      item.area = areaInUnit;
      
      // For subtotal calculation, use table values (same as Running Ft)
      // Use table values if available, otherwise fallback to input values
      const heightTableValue = item.selectedHeightTableValue ? parseFloat(item.selectedHeightTableValue) : heightValue;
      const widthTableValue = item.selectedWidthTableValue ? parseFloat(item.selectedWidthTableValue) : widthValue;
      
      // Convert table values to feet
      const heightInFeet = convertToFeet(heightTableValue, item.heightUnit || "FEET");
      const widthInFeet = convertToFeet(widthTableValue, item.widthUnit || "FEET");
      const areaInFeet = heightInFeet * widthInFeet;
      // Use sellingPrice if available, otherwise fall back to ratePerSqft
      const rate = parseFloat(item.sellingPrice || item.ratePerSqft) || 0;
      const qty = parseInt(item.quantity) || 0;
      item.subtotal = areaInFeet * rate * qty;
      
      // Recalculate Running Ft (depends on height/width in feet)
      calculateRunningFt(item);
    }

    if (field === "ratePerSqft" || field === "sellingPrice" || field === "quantity") {
      // Recalculate subtotal when rate or quantity changes - use table values
      const heightValue = parseFraction(item.height || 0);
      const widthValue = parseFraction(item.width || 0);
      
      // Use table values if available, otherwise fallback to input values
      const heightTableValue = item.selectedHeightTableValue ? parseFloat(item.selectedHeightTableValue) : heightValue;
      const widthTableValue = item.selectedWidthTableValue ? parseFloat(item.selectedWidthTableValue) : widthValue;
      
      // Convert table values to feet
      const heightInFeet = convertToFeet(heightTableValue, item.heightUnit || "FEET");
      const widthInFeet = convertToFeet(widthTableValue, item.widthUnit || "FEET");
      const areaInFeet = heightInFeet * widthInFeet;
      // Use sellingPrice if available, otherwise fall back to ratePerSqft
      const rate = parseFloat(item.sellingPrice || item.ratePerSqft) || 0;
      const qty = parseInt(item.quantity) || 0;
      item.subtotal = areaInFeet * rate * qty;
      
      // Recalculate Running Ft (quantity affects the result)
      calculateRunningFt(item);
    }
    
    // Recalculate Running Ft when polish selection changes
    if (field === "polishSelection" || field === "polishRates" || field === "polish") {
      calculateRunningFt(item);
    }

    setFormData({ ...formData, items: newItems });
  };

  /**
   * Update polish selection row numbers based on table values
   */
  const updatePolishSelectionNumbers = (item) => {
    const heightValue = item.selectedHeightTableValue || parseFraction(item.height || 0);
    const widthValue = item.selectedWidthTableValue || parseFraction(item.width || 0);
    
    if (item.polishSelection && item.polishSelection.length >= 4) {
      item.polishSelection[0].side = `Height 1 (${heightValue})`;
      item.polishSelection[1].side = `Width 1 (${widthValue})`;
      item.polishSelection[2].side = `Height 2 (${heightValue})`;
      item.polishSelection[3].side = `Width 2 (${widthValue})`;
    }
  };

  /**
   * Handle polish selection checkbox change
   */
  const handlePolishCheckboxChange = (itemIndex, rowIndex, checked) => {
    const newItems = [...formData.items];
    const item = newItems[itemIndex];
    
    if (!item.polishSelection) {
      item.polishSelection = [
        { side: "Height 1", checked: false, type: null, rate: 0 },
        { side: "Width 1", checked: false, type: null, rate: 0 },
        { side: "Height 2", checked: false, type: null, rate: 0 },
        { side: "Width 2", checked: false, type: null, rate: 0 },
      ];
    }
    
    item.polishSelection[rowIndex].checked = checked;
    if (!checked) {
      item.polishSelection[rowIndex].type = null;
      item.polishSelection[rowIndex].rate = 0;
    }
    
    // Recalculate Running Ft
    calculateRunningFt(item);
    
    setFormData({ ...formData, items: newItems });
  };

  /**
   * Handle polish type radio button change
   */
  const handlePolishTypeChange = (itemIndex, rowIndex, type) => {
    const newItems = [...formData.items];
    const item = newItems[itemIndex];
    
    if (!item.polishSelection) return;
    if (!item.polishRates) item.polishRates = { P: 15, H: 75, B: 75 };
    
    item.polishSelection[rowIndex].type = type;
    item.polishSelection[rowIndex].rate = item.polishRates[type] || 0;
    
    // Recalculate Running Ft
    calculateRunningFt(item);
    
    setFormData({ ...formData, items: newItems });
  };

  /**
   * Calculate Running Ft based on polish selection rates
   * Formula: 
   * 1. Use table values (selectedHeightTableValue and selectedWidthTableValue) instead of input height/width
   * 2. Group sides by polish type (P, H, B)
   * 3. For each group, sum the side lengths (already in correct unit from table), multiply by polish rate
   * 4. Sum all groups
   * 5. Multiply by quantity
   */
  const calculateRunningFt = (item) => {
    if (!item.polishSelection || !item.selectedHeightTableValue || !item.selectedWidthTableValue) {
      item.runningFt = 0;
      return;
    }
    
    // Use table values instead of input height/width
    // Table values are already in the correct unit (they match the input unit)
    const heightTableValue = parseFloat(item.selectedHeightTableValue) || 0;
    const widthTableValue = parseFloat(item.selectedWidthTableValue) || 0;
    
    // Convert table values to feet (table values are in the same unit as input)
    const heightInFeet = convertToFeet(heightTableValue, item.heightUnit || "FEET");
    const widthInFeet = convertToFeet(widthTableValue, item.widthUnit || "FEET");
    
    // Group sides by polish type and calculate
    const polishGroups = {
      'P': { sides: [], rate: item.polishRates?.P || 15 },
      'H': { sides: [], rate: item.polishRates?.H || 75 },
      'B': { sides: [], rate: item.polishRates?.B || 75 }
    };
    
    // Process each polish selection row and group by type
    if (item.polishSelection && item.polishSelection.length >= 4) {
      // Height 1 (index 0)
      if (item.polishSelection[0].checked && item.polishSelection[0].type) {
        const type = item.polishSelection[0].type;
        if (polishGroups[type]) {
          polishGroups[type].sides.push(heightInFeet);
        }
      }
      
      // Width 1 (index 1)
      if (item.polishSelection[1].checked && item.polishSelection[1].type) {
        const type = item.polishSelection[1].type;
        if (polishGroups[type]) {
          polishGroups[type].sides.push(widthInFeet);
        }
      }
      
      // Height 2 (index 2)
      if (item.polishSelection[2].checked && item.polishSelection[2].type) {
        const type = item.polishSelection[2].type;
        if (polishGroups[type]) {
          polishGroups[type].sides.push(heightInFeet);
        }
      }
      
      // Width 2 (index 3)
      if (item.polishSelection[3].checked && item.polishSelection[3].type) {
        const type = item.polishSelection[3].type;
        if (polishGroups[type]) {
          polishGroups[type].sides.push(widthInFeet);
        }
      }
    }
    
    // Calculate for each polish type group
    let totalRunningFt = 0;
    Object.keys(polishGroups).forEach(type => {
      const group = polishGroups[type];
      if (group.sides.length > 0) {
        // Sum all sides in this group
        const totalLengthInFeet = group.sides.reduce((sum, side) => sum + side, 0);
        // Multiply by polish rate for this type
        totalRunningFt += totalLengthInFeet * group.rate;
      }
    });
    
    // Multiply by quantity (NO Rate per SqFt multiplication)
    const quantity = parseInt(item.quantity) || 1;
    item.runningFt = totalRunningFt * quantity;
  };

  /**
   * Parse POLISH_DATA JSON stored inside item.description (if present)
   */
  const parsePolishDataFromDescription = (description) => {
    if (!description || typeof description !== "string") return null;
    const marker = "POLISH_DATA:";
    const idx = description.indexOf(marker);
    if (idx === -1) return null;
    const jsonPart = description.substring(idx + marker.length).trim();
    try {
      return JSON.parse(jsonPart);
    } catch (e) {
      console.warn("Failed to parse POLISH_DATA from description", e);
      return null;
    }
  };

  /**
   * Compute Running Ft summary (total + breakdown by polish type)
   * for a given quotation object coming from the backend.
   */
  const getRunningFtSummaryFromQuotation = (quotation) => {
    const summary = {
      total: 0,
      polish: 0, // P
      halfRound: 0, // H
      beveling: 0, // B
    };

    if (!quotation || !quotation.items || !Array.isArray(quotation.items)) {
      return summary;
    }

    quotation.items.forEach((item) => {
      // Try to get full polish data from description first (what we stored when creating)
      const polishData = parsePolishDataFromDescription(item.description) || {};

      const selectedHeightTableValue =
        parseFloat(
          polishData.selectedHeightTableValue ?? item.selectedHeightTableValue
        ) || 0;
      const selectedWidthTableValue =
        parseFloat(
          polishData.selectedWidthTableValue ?? item.selectedWidthTableValue
        ) || 0;

      if (!selectedHeightTableValue || !selectedWidthTableValue) {
        // No table values → we can't compute Running Ft breakdown for this item
        return;
      }

      const heightUnit = item.heightUnit || polishData.heightUnit || "FEET";
      const widthUnit = item.widthUnit || polishData.widthUnit || "FEET";

      const heightInFeet = convertToFeet(selectedHeightTableValue, heightUnit);
      const widthInFeet = convertToFeet(selectedWidthTableValue, widthUnit);

      const polishSelection =
        polishData.polishSelection || item.polishSelection || [];
      const polishRates = {
        P: (polishData.polishRates && polishData.polishRates.P) || 15,
        H: (polishData.polishRates && polishData.polishRates.H) || 75,
        B: (polishData.polishRates && polishData.polishRates.B) || 75,
      };

      if (!polishSelection || polishSelection.length < 4) {
        return;
      }

      const quantity =
        parseInt(item.quantity ?? polishData.quantity ?? 1, 10) || 1;

      const groups = {
        P: { sides: [], rate: polishRates.P },
        H: { sides: [], rate: polishRates.H },
        B: { sides: [], rate: polishRates.B },
      };

      // Use the same logic as calculateRunningFt to group sides by polish type
      // Height 1 (index 0)
      if (polishSelection[0].checked && polishSelection[0].type) {
        const type = polishSelection[0].type;
        if (groups[type]) {
          groups[type].sides.push(heightInFeet);
        }
      }

      // Width 1 (index 1)
      if (polishSelection[1].checked && polishSelection[1].type) {
        const type = polishSelection[1].type;
        if (groups[type]) {
          groups[type].sides.push(widthInFeet);
        }
      }

      // Height 2 (index 2)
      if (polishSelection[2].checked && polishSelection[2].type) {
        const type = polishSelection[2].type;
        if (groups[type]) {
          groups[type].sides.push(heightInFeet);
        }
      }

      // Width 2 (index 3)
      if (polishSelection[3].checked && polishSelection[3].type) {
        const type = polishSelection[3].type;
        if (groups[type]) {
          groups[type].sides.push(widthInFeet);
        }
      }

      let itemTotal = 0;

      const accumulate = (type, amount) => {
        if (!amount || amount <= 0) return;
        itemTotal += amount;
        if (type === "P") {
          summary.polish += amount;
        } else if (type === "H") {
          summary.halfRound += amount;
        } else if (type === "B") {
          summary.beveling += amount;
        }
      };

      Object.keys(groups).forEach((type) => {
        const group = groups[type];
        if (group.sides.length > 0) {
          const totalLengthInFeet = group.sides.reduce(
            (sum, side) => sum + side,
            0
          );
          const amount = totalLengthInFeet * (group.rate || 0) * quantity;
          accumulate(type, amount);
        }
      });

      summary.total += itemTotal;
    });

    return summary;
  };

  /**
   * Get Running Ft for a single quotation item (safe for old data)
   */
  const getRunningFtForItem = (item) => {
    if (!item) return 0;

    // Prefer value stored in POLISH_DATA (most accurate for new quotations)
    const polishData = parsePolishDataFromDescription(item.description);
    if (polishData && polishData.runningFt !== undefined) {
      return parseFloat(polishData.runningFt) || 0;
    }

    // Fallback to direct field on item (if backend sends it)
    return parseFloat(item.runningFt) || 0;
  };

  /**
   * Handle polish rate change
   */
  const handlePolishRateChange = (itemIndex, type, rate) => {
    const newItems = [...formData.items];
    const item = newItems[itemIndex];
    
    if (!item.polishRates) item.polishRates = { P: 15, H: 75, B: 75 };
    
    // Allow string values during typing, parse to number on blur
    if (typeof rate === 'string' && rate !== '') {
      item.polishRates[type] = rate; // Store as string during typing
    } else {
      item.polishRates[type] = parseFloat(rate) || 0;
    }
    
    // Update rates for all selected rows with this type (only if it's a number)
    if (item.polishSelection && typeof rate !== 'string') {
      const numRate = parseFloat(rate) || 0;
      item.polishSelection.forEach((row) => {
        if (row.type === type && row.checked) {
          row.rate = numRate;
        }
      });
    }
    
    // Recalculate Running Ft
    calculateRunningFt(item);
    
    setFormData({ ...formData, items: newItems });
  };

  /**
   * Handle "Select All" checkbox for polish type columns
   */
  const handlePolishSelectAll = (itemIndex, type, checked) => {
    const newItems = [...formData.items];
    const item = newItems[itemIndex];
    
    if (!item.polishSelection) {
      item.polishSelection = [
        { side: "Height 1", checked: false, type: null, rate: 0 },
        { side: "Width 1", checked: false, type: null, rate: 0 },
        { side: "Height 2", checked: false, type: null, rate: 0 },
        { side: "Width 2", checked: false, type: null, rate: 0 },
      ];
    }
    
    if (!item.polishRates) item.polishRates = { P: 15, H: 75, B: 75 };
    
    // If checking "Select All", check all rows and set the type
    if (checked) {
      item.polishSelection.forEach((row) => {
        row.checked = true;
        row.type = type;
        row.rate = item.polishRates[type] || 0;
      });
    } else {
      // If unchecking "Select All", uncheck all rows with this type
      item.polishSelection.forEach((row) => {
        if (row.type === type) {
          row.checked = false;
          row.type = null;
          row.rate = 0;
        }
      });
    }
    
    // Recalculate Running Ft
    calculateRunningFt(item);
    
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    let finalCustomerId = formData.customerId;

    // If manual mode, create customer first
    if (formData.customerSelectionMode === "MANUAL") {
      if (!formData.manualCustomerName || !formData.manualCustomerMobile) {
        setMessage("❌ Please provide customer name and mobile number");
        return;
      }
      try {
        // Validate and clean mobile number before sending
        let mobile = formData.manualCustomerMobile?.trim();
        if (mobile) {
          // Remove spaces, dashes, and parentheses
          let cleaned = mobile.replace(/[\s\-\(\)]/g, "");
          
          // Remove leading zero if present (Indian mobile numbers sometimes have leading 0)
          if (cleaned.length === 11 && cleaned.startsWith("0")) {
            cleaned = cleaned.substring(1);
          }
          
          // Check if it starts with +91
          if (cleaned.startsWith("+91")) {
            const digits = cleaned.substring(3);
            if (digits.length !== 10 || !/^\d+$/.test(digits)) {
              setMessage("❌ Mobile number with +91 must have 10 digits after country code");
              return;
            }
            mobile = cleaned; // Use cleaned version with +91
          } else if (!/^\d+$/.test(cleaned)) {
            setMessage("❌ Mobile number must contain only digits (or +91 followed by 10 digits)");
            return;
          } else if (cleaned.length !== 10) {
            setMessage(`❌ Mobile number must be exactly 10 digits (you entered ${cleaned.length} digits)`);
            return;
          } else {
            mobile = cleaned; // Use cleaned version without leading zero
          }
        }

        const customerResponse = await createCustomer({
          name: formData.manualCustomerName.trim(),
          mobile: mobile,
          email: formData.manualCustomerEmail?.trim() || null,
          address: formData.manualCustomerAddress?.trim() || null,
        });
        finalCustomerId = customerResponse.data.id;
        // Reload customers list
        await loadCustomers();
      } catch (error) {
        const errorMessage = error.response?.data?.error || error.message || "Failed to create customer. Please try again.";
        setMessage(`❌ ${errorMessage}`);
        console.error("Customer creation error:", error.response?.data || error);
        return;
      }
    } else {
      if (!formData.customerId) {
        setMessage("❌ Please select a customer");
        return;
      }
    }

    if (formData.items.length === 0) {
      setMessage("❌ Please add at least one item");
      return;
    }

    if (formData.billingType === "GST" && !formData.gstPercentage) {
      setMessage("❌ GST percentage is required for GST billing");
      return;
    }

    try {
      // Calculate subtotal from items first
      let totalSubtotal = 0;
      formData.items.forEach((item) => {
        const heightValue = parseFraction(item.height || 0);
        const widthValue = parseFraction(item.width || 0);
        const heightTableValue = item.selectedHeightTableValue ? parseFloat(item.selectedHeightTableValue) : heightValue;
        const widthTableValue = item.selectedWidthTableValue ? parseFloat(item.selectedWidthTableValue) : widthValue;
        const heightInFeet = convertToFeet(heightTableValue, item.heightUnit || "FEET");
        const widthInFeet = convertToFeet(widthTableValue, item.widthUnit || "FEET");
        const areaInFeet = heightInFeet * widthInFeet;
        // Use sellingPrice if available, otherwise fall back to ratePerSqft
        const rate = parseFloat(item.sellingPrice || item.ratePerSqft || 0);
        const itemSubtotal = areaInFeet * rate * parseInt(item.quantity || 1);
        totalSubtotal += itemSubtotal;
      });

      // Calculate discount amount based on type
      let calculatedDiscount = 0;
      if (formData.discountValue > 0) {
        if (formData.discountType === "PERCENTAGE") {
          // Calculate percentage discount on subtotal + installation + transport
          const baseAmount = totalSubtotal + (formData.installationCharge || 0) + (formData.transportCharge || 0);
          calculatedDiscount = (baseAmount * formData.discountValue) / 100;
        } else {
          // Absolute amount
          calculatedDiscount = formData.discountValue;
        }
      }

      const payload = {
        ...formData,
        customerId: finalCustomerId,
        transportationRequired: formData.transportationRequired || false,
        discount: calculatedDiscount, // Send calculated discount amount
        discountType: formData.discountType, // Send discount type
        discountValue: formData.discountValue, // Send discount value
        shippingAddress: formData.shippingAddress || "", // Shipping address for delivery
        items: formData.items.map((item) => {
          // Parse height/width (handle fractions)
          const heightValue = parseFraction(item.height || 0);
          const widthValue = parseFraction(item.width || 0);
          
          // Calculate area in the input unit for storage
          const areaInUnit = calculateAreaInUnit(
            heightValue,
            widthValue,
            item.heightUnit || "FEET",
            item.widthUnit || "FEET"
          );
          
          // For subtotal calculation, use table values (same as Running Ft)
          // Use table values if available, otherwise fallback to input values
          const heightTableValue = item.selectedHeightTableValue ? parseFloat(item.selectedHeightTableValue) : heightValue;
          const widthTableValue = item.selectedWidthTableValue ? parseFloat(item.selectedWidthTableValue) : widthValue;
          
          // Convert table values to feet
          const heightInFeet = convertToFeet(heightTableValue, item.heightUnit || "FEET");
          const widthInFeet = convertToFeet(widthTableValue, item.widthUnit || "FEET");
          const areaInFeet = heightInFeet * widthInFeet;
          // Use sellingPrice if available, otherwise fall back to ratePerSqft
          const rate = parseFloat(item.sellingPrice || item.ratePerSqft || 0);
          const subtotal = areaInFeet * rate * parseInt(item.quantity || 1);

          // Calculate Running Ft: Use table values, group by polish type, sum sides, convert to ft, multiply by polish rate, sum all, then multiply by quantity
          let runningFt = 0;
          if (item.polishSelection && item.polishSelection.length >= 4 && item.selectedHeightTableValue && item.selectedWidthTableValue) {
            // Use table values instead of input height/width
            const heightTableValue = parseFloat(item.selectedHeightTableValue) || 0;
            const widthTableValue = parseFloat(item.selectedWidthTableValue) || 0;
            
            // Convert table values to feet
            const heightInFeet = convertToFeet(heightTableValue, item.heightUnit || "FEET");
            const widthInFeet = convertToFeet(widthTableValue, item.widthUnit || "FEET");
            
            // Group sides by polish type
            const polishGroups = {
              'P': { sides: [], rate: item.polishRates?.P || 15 },
              'H': { sides: [], rate: item.polishRates?.H || 75 },
              'B': { sides: [], rate: item.polishRates?.B || 75 }
            };
            
            // Process each polish selection row and group by type
            // Height 1 (index 0)
            if (item.polishSelection[0].checked && item.polishSelection[0].type) {
              const type = item.polishSelection[0].type;
              if (polishGroups[type]) {
                polishGroups[type].sides.push(heightInFeet);
              }
            }
            
            // Width 1 (index 1)
            if (item.polishSelection[1].checked && item.polishSelection[1].type) {
              const type = item.polishSelection[1].type;
              if (polishGroups[type]) {
                polishGroups[type].sides.push(widthInFeet);
              }
            }
            
            // Height 2 (index 2)
            if (item.polishSelection[2].checked && item.polishSelection[2].type) {
              const type = item.polishSelection[2].type;
              if (polishGroups[type]) {
                polishGroups[type].sides.push(heightInFeet);
              }
            }
            
            // Width 2 (index 3)
            if (item.polishSelection[3].checked && item.polishSelection[3].type) {
              const type = item.polishSelection[3].type;
              if (polishGroups[type]) {
                polishGroups[type].sides.push(widthInFeet);
              }
            }
            
            // Calculate for each polish type group
            let totalRunningFt = 0;
            Object.keys(polishGroups).forEach(type => {
              const group = polishGroups[type];
              if (group.sides.length > 0) {
                // Sum all sides in this group
                const totalLengthInFeet = group.sides.reduce((sum, side) => sum + side, 0);
                // Multiply by polish rate for this type
                totalRunningFt += totalLengthInFeet * group.rate;
              }
            });
            
            // Multiply by quantity (NO Rate per SqFt multiplication)
            const quantity = parseInt(item.quantity) || 1;
            runningFt = totalRunningFt * quantity;
          }

          // Build polish selection JSON for description
          const polishData = {
            heightTableNumber: item.heightTableNumber || 6,
            widthTableNumber: item.widthTableNumber || 6,
            selectedHeightTableValue: item.selectedHeightTableValue,
            selectedWidthTableValue: item.selectedWidthTableValue,
            polishSelection: item.polishSelection || [],
            polishRates: item.polishRates || { P: 15, H: 75, B: 75 },
            itemPolish: item.polish || "", // Hand-Polish or CNC Polish
            heightOriginal: item.heightOriginal || item.height || "",
            widthOriginal: item.widthOriginal || item.width || "",
            sizeInMM: item.sizeInMM || false,
            runningFt: runningFt, // Store Running Ft in polish data
          };
          
          // Combine existing description with polish data JSON
          const descriptionParts = [];
          if (item.description) {
            descriptionParts.push(item.description);
          }
          descriptionParts.push(`POLISH_DATA:${JSON.stringify(polishData)}`);

          return {
            ...item,
            height: heightValue,
            width: widthValue,
            quantity: parseInt(item.quantity),
            ratePerSqft: parseFloat(item.sellingPrice || item.ratePerSqft),
            area: areaInFeet, // Store area in feet for backend (since rate is per SqFt)
            subtotal: subtotal,
            runningFt: runningFt, // Store Running Ft
            heightUnit: item.heightUnit || "FEET",
            widthUnit: item.widthUnit || "FEET",
            description: descriptionParts.join('\n'),
            // Remove frontend-only fields before sending to API
            sizeInMM: undefined,
            heightMM: undefined,
            widthMM: undefined,
            heightTableNumber: undefined,
            widthTableNumber: undefined,
            selectedHeightTableValue: undefined,
            selectedWidthTableValue: undefined,
            polishSelection: undefined,
            polishRates: undefined,
            polish: undefined,
            heightOriginal: undefined,
            widthOriginal: undefined,
          };
        }),
      };

      await createQuotation(payload);
      setMessage("✅ Quotation created successfully");
      setShowForm(false);
      resetForm();
      loadQuotations();
    } catch (error) {
      setMessage("❌ Failed to create quotation");
    }
  };

  const handleConfirm = async (quotationId, action) => {
    try {
      // If rejecting, show rejection reason modal first
      if (action === "REJECTED") {
        setConfirmAction(null); // Close confirmation modal
        setPendingRejection({ quotationId, action });
        setShowRejectionModal(true);
        setRejectionReason("");
        return;
      }
      
      // For confirm action, proceed directly
      await confirmQuotation(quotationId, {
        action: action,
        rejectionReason: null,
      });
      setMessage("✅ Quotation confirmed");
      setConfirmAction(null);
      loadQuotations();
    } catch (error) {
      setMessage("❌ Failed to update quotation");
      setConfirmAction(null);
    }
  };

  const handleRejectionSubmit = async () => {
    if (!rejectionReason.trim()) {
      setMessage("❌ Please enter a rejection reason");
      return;
    }

    try {
      await confirmQuotation(pendingRejection.quotationId, {
        action: "REJECTED",
        rejectionReason: rejectionReason.trim(),
      });
      setMessage("✅ Quotation rejected");
      setConfirmAction(null);
      setShowRejectionModal(false);
      setRejectionReason("");
      setPendingRejection(null);
      loadQuotations();
    } catch (error) {
      setMessage("❌ Failed to reject quotation");
      setShowRejectionModal(false);
      setPendingRejection(null);
    }
  };

  const handleDelete = async (quotationId) => {
    try {
      await deleteQuotation(quotationId);
      setMessage("✅ Quotation deleted successfully");
      setConfirmAction(null);
      loadQuotations();
    } catch (error) {
      setMessage("❌ Failed to delete quotation");
      setConfirmAction(null);
    }
  };

  const showConfirmDialog = (type, quotation) => {
    setConfirmAction({
      type,
      quotationId: quotation.id,
      quotationNumber: quotation.quotationNumber,
      customerName: quotation.customerName,
    });
  };

  const handleView = async (id) => {
    try {
      const response = await getQuotationById(id);
      setSelectedQuotation(response.data);
    } catch (error) {
      setMessage("❌ Failed to load quotation details");
    }
  };

  const resetForm = () => {
    setSelectedArch(null);
    setArchSearch("");
    setArchDropOpen(false);
    const today = new Date().toISOString().split("T")[0];
    setFormData({
      customerSelectionMode: "SELECT_FROM_LIST",
      customerId: "",
      referenceArchitectId: null,
      manualCustomerName: "",
      manualCustomerMobile: "",
      manualCustomerEmail: "",
      manualCustomerAddress: "",
      billingType: "GST",
      quotationDate: today,
      validUntil: getDefaultValidUntil(today),
      gstPercentage: 18,
      customerState: "",
      installationCharge: 0,
      transportCharge: 0,
      transportationRequired: false,
      discount: 0,
      discountType: "AMOUNT",
      discountValue: 0,
      items: [
        {
          glassType: "",
          thickness: "",
          height: "",
          width: "",
          heightUnit: "INCH",
          widthUnit: "INCH",
          quantity: 1,
          ratePerSqft: "",
          design: "",
          hsnCode: "",
          description: "",
          // New fields for quotation features
          sizeInMM: false,
          heightTableNumber: 6,
          widthTableNumber: 6,
          selectedHeightTableValue: null,
          selectedWidthTableValue: null,
          polishSelection: [
            { side: "Height 1", checked: false, type: null, rate: 0 },
            { side: "Width 1", checked: false, type: null, rate: 0 },
            { side: "Height 2", checked: false, type: null, rate: 0 },
            { side: "Width 2", checked: false, type: null, rate: 0 },
          ],
          polishRates: { P: 15, H: 75, B: 75 },
          polish: "",
          heightOriginal: "",
          widthOriginal: "",
        },
      ],
    });
  };

  const getStatusBadge = (status) => <Badge status={status} dot label={status} />;

  const getAvailableGlassTypes = () => {
    const glassTypes = new Set();
    allStock.forEach((stock) => {
      if (stock.glass?.type) {
        glassTypes.add(stock.glass.type);
      }
    });
    return Array.from(glassTypes).sort();
  };

  const getStockForGlassType = (glassType) => {
    return allStock.filter((stock) => stock.glass?.type === glassType);
  };

  // Returns distinct sorted numeric thickness values for the selected glass type.
  // Only considers in-stock items (quantity > 0) so the dropdown never shows
  // thicknesses that cannot be fulfilled.
  const getThicknessesForGlassType = (glassType) => {
    if (!glassType) return [];
    const seen = new Set();
    allStock.forEach((stock) => {
      if (
        stock.glass?.type === glassType &&
        stock.glass?.thickness != null &&
        stock.quantity > 0
      ) {
        seen.add(Number(stock.glass.thickness));
      }
    });
    return Array.from(seen).sort((a, b) => a - b);
  };

  const handleGlassTypeSelect = (index, glassType, stockItem) => {
    const newItems = [...formData.items];
    newItems[index].glassType = glassType; // Set glass type (Plan, Extra Clear, etc.)
    // DO NOT auto-fill thickness - user should select it separately
    // Set default selling price per SqFt from stock if available
    if (stockItem?.sellingPrice) {
      // sellingPrice from stock is per SqFt, convert to number and set it directly
      const sellingPricePerSqFt = parseFloat(stockItem.sellingPrice) || 0;
      newItems[index].sellingPrice = sellingPricePerSqFt;
      // Also update ratePerSqft for backward compatibility
      newItems[index].ratePerSqft = sellingPricePerSqFt;
      
      // Recalculate subtotal if dimensions are already set
      const heightValue = parseFraction(newItems[index].height || 0);
      const widthValue = parseFraction(newItems[index].width || 0);
      if (heightValue > 0 && widthValue > 0) {
        const heightTableValue = newItems[index].selectedHeightTableValue ? parseFloat(newItems[index].selectedHeightTableValue) : heightValue;
        const widthTableValue = newItems[index].selectedWidthTableValue ? parseFloat(newItems[index].selectedWidthTableValue) : widthValue;
        const heightInFeet = convertToFeet(heightTableValue, newItems[index].heightUnit || "FEET");
        const widthInFeet = convertToFeet(widthTableValue, newItems[index].widthUnit || "FEET");
        const areaInFeet = heightInFeet * widthInFeet;
        const qty = parseInt(newItems[index].quantity) || 1;
        newItems[index].subtotal = areaInFeet * sellingPricePerSqFt * qty;
      }
    }
    // Store purchase price for profit calculation (not shown to user, only for admin profit display)
    if (stockItem?.purchasePrice) {
      newItems[index].purchasePrice = stockItem.purchasePrice;
    }
    setFormData({ ...formData, items: newItems });
    setShowStockDropdown({ ...showStockDropdown, [index]: false });
    setStockDropdownType({ ...stockDropdownType, [index]: null });
  };

  // Separate handler for thickness selection (doesn't change glass type, height, or width)
  const handleThicknessSelect = (index, stockItem) => {
    const newItems = [...formData.items];
    
    // CRITICAL: Preserve existing height and width - DO NOT change them
    const existingHeight = newItems[index].height || "";
    const existingWidth = newItems[index].width || "";
    const existingHeightUnit = newItems[index].heightUnit || "INCH";
    const existingWidthUnit = newItems[index].widthUnit || "INCH";
    const existingHeightTableValue = newItems[index].selectedHeightTableValue;
    const existingWidthTableValue = newItems[index].selectedWidthTableValue;
    const existingHeightTableNumber = newItems[index].heightTableNumber;
    const existingWidthTableNumber = newItems[index].widthTableNumber;
    
    // ONLY set thickness - do NOT change glass type, height, or width
    // Thickness is always in MM, regardless of stock unit
    // IMPORTANT: stockItem.glass.thickness is a NUMBER, stockItem.glass.unit is separate
    // We always use MM for thickness, never use the stock item's unit
    if (stockItem?.glass?.thickness !== undefined && stockItem?.glass?.thickness !== null) {
      // Extract numeric thickness value only (always in MM)
      // stockItem.glass.thickness is already a number from the database
      const thicknessValue = typeof stockItem.glass.thickness === 'number' 
        ? stockItem.glass.thickness 
        : parseFloat(stockItem.glass.thickness);
      
      if (!isNaN(thicknessValue) && thicknessValue > 0) {
        // Always set thickness in MM format, regardless of stock item's unit
        newItems[index].thickness = `${thicknessValue}MM`;
      }
    }
    
    // Set default selling price per SqFt from stock if available
    if (stockItem?.sellingPrice) {
      // sellingPrice from stock is per SqFt, convert to number and set it directly
      const sellingPricePerSqFt = parseFloat(stockItem.sellingPrice) || 0;
      newItems[index].sellingPrice = sellingPricePerSqFt;
      // Also update ratePerSqft for backward compatibility
      newItems[index].ratePerSqft = sellingPricePerSqFt;
      
      // Recalculate subtotal if dimensions are already set (but don't change the dimensions themselves)
      const heightValue = parseFraction(newItems[index].height || 0);
      const widthValue = parseFraction(newItems[index].width || 0);
      if (heightValue > 0 && widthValue > 0) {
        const heightTableValue = newItems[index].selectedHeightTableValue ? parseFloat(newItems[index].selectedHeightTableValue) : heightValue;
        const widthTableValue = newItems[index].selectedWidthTableValue ? parseFloat(newItems[index].selectedWidthTableValue) : widthValue;
        const heightInFeet = convertToFeet(heightTableValue, newItems[index].heightUnit || "FEET");
        const widthInFeet = convertToFeet(widthTableValue, newItems[index].widthUnit || "FEET");
        const areaInFeet = heightInFeet * widthInFeet;
        const qty = parseInt(newItems[index].quantity) || 1;
        newItems[index].subtotal = areaInFeet * sellingPricePerSqFt * qty;
      }
    }
    
    // Store purchase price for profit calculation
    if (stockItem?.purchasePrice) {
      newItems[index].purchasePrice = stockItem.purchasePrice;
    }
    
    // CRITICAL: Restore height and width to their original values - DO NOT use stockItem height/width
    // NEVER use stockItem.height, stockItem.width, or stockItem.glass.unit for dimensions
    // Thickness selection should ONLY affect thickness field, nothing else
    newItems[index].height = existingHeight;
    newItems[index].width = existingWidth;
    newItems[index].heightUnit = existingHeightUnit;
    newItems[index].widthUnit = existingWidthUnit;
    newItems[index].selectedHeightTableValue = existingHeightTableValue;
    newItems[index].selectedWidthTableValue = existingWidthTableValue;
    newItems[index].heightTableNumber = existingHeightTableNumber;
    newItems[index].widthTableNumber = existingWidthTableNumber;
    
    // Ensure glass type is NOT changed when selecting thickness
    // (glass type should remain as user selected it)
    
    setFormData({ ...formData, items: newItems });
    setShowStockDropdown({ ...showStockDropdown, [index]: false });
    setStockDropdownType({ ...stockDropdownType, [index]: null });
  };

  // Glass type options (dynamic — from the Glass Type master)
  const { names: glassTypeOptions } = useGlassTypes();

  return (
    <PageWrapper>
      <div style={{
        maxWidth: isMobile ? "100%" : "1400px",
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}>
        <div style={{ marginBottom: isMobile ? "16px" : "24px" }}>
          <h1 style={{
            color: "#ffffff",
            margin: "0 0 4px",
            fontSize: isMobile ? "24px" : "28px",
            fontWeight: "800",
            letterSpacing: "-0.02em",
            lineHeight: "1.2",
          }}>
            Quotation Management
          </h1>
          <p style={{
            color: "#A9B3D1",
            fontSize: "13px",
            margin: 0,
            fontWeight: "400",
          }}>
            Create and manage quotations for your customers
          </p>
        </div>

        {message && (
          <div
            style={{
              padding: "10px 14px",
              marginBottom: "16px",
              backgroundColor: message.includes("✅") ? "rgba(55,227,165,0.15)" : "rgba(255,107,129,0.15)",
              color: message.includes("✅") ? "#37E3A5" : "#FF6B81",
              border: `1px solid ${message.includes("✅") ? "rgba(55,227,165,0.3)" : "rgba(255,107,129,0.3)"}`,
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {message}
          </div>
        )}

        <button
          onClick={() => {
            setShowForm(true);
            resetForm();
          }}
          style={{
            padding: isMobile ? "14px 20px" : "10px 20px",
            backgroundColor: "#4F5DFF",
            color: "white",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            marginBottom: "20px",
            fontSize: "14px",
            fontWeight: "600",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: "0 2px 12px rgba(79,93,255,0.35)",
            transition: "all 0.2s",
            width: isMobile ? "100%" : "auto",
            minHeight: "44px",
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#3D4DE8";
            e.target.style.transform = "translateY(-1px)";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = "#4F5DFF";
            e.target.style.transform = "translateY(0)";
          }}
        >
          + Create New Quotation
        </button>

        {showForm && (
          <div
            style={{
              backgroundColor: "rgba(17,27,53,0.9)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: isMobile ? "12px" : "20px",
              borderRadius: "16px",
              marginBottom: isMobile ? "16px" : "20px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              overflowX: "hidden",
              colorScheme: "dark",
            }}
          >
            {/* ── Compact header ── */}
            <div style={{ marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <h2 style={{ margin: 0, color: "#ffffff", fontSize: isMobile ? "16px" : "18px", fontWeight: "700", letterSpacing: "-0.02em" }}>
                  Create Quotation
                </h2>
                <p style={{ margin: "2px 0 0 0", color: "#7180A6", fontSize: "12px", fontWeight: 400 }}>
                  Customer · Glass Details · Pricing
                </p>
              </div>
            </div>
            {/* ── Layout: form fields (left) + sticky summary (right, desktop only) ── */}
            <div style={{ display: "flex", gap: isMobile ? 0 : 18, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
              {/* Customer & Billing Section */}
              <div style={{
                marginBottom: isMobile ? "14px" : "18px",
                width: "100%",
                boxSizing: "border-box",
              }}>
                <h3 style={{ color: "#A9B3D1", fontSize: "13px", fontWeight: "700", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  👤 Customer & Billing
                </h3>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: isMobile ? "12px" : "14px",
                  width: "100%",
                  boxSizing: "border-box",
                }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>
                      Customer Selection * <span style={{ color: "#ef4444" }}>●</span>
                    </label>
                    <select
                      value={formData.customerSelectionMode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customerSelectionMode: e.target.value,
                          customerId: "",
                          manualCustomerName: "",
                          manualCustomerMobile: "",
                          manualCustomerEmail: "",
                          manualCustomerAddress: "",
                        })
                      }
                        style={{
                          width: "100%",
                          padding: isMobile ? "14px 12px" : "12px",
                          borderRadius: "8px",
                          border: "1.5px solid rgba(255,255,255,0.1)",
                          fontSize: "16px",
                          backgroundColor: "rgba(255,255,255,0.06)",
                          color: "#E2E8F0",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          marginBottom: "15px",
                          minHeight: "44px",
                          boxSizing: "border-box",
                        }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(79,93,255,0.6)")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                    >
                      <option value="SELECT_FROM_LIST">📋 Select from List</option>
                      <option value="MANUAL">✏️ Manual Entry</option>
                    </select>

                    {formData.customerSelectionMode === "SELECT_FROM_LIST" ? (
                      <>
                        <select
                          required={formData.customerSelectionMode === "SELECT_FROM_LIST"}
                          value={formData.customerId}
                          onChange={(e) => {
                            const cid = e.target.value;
                            const found = customers.find(c => String(c.id) === cid);
                            const arch = found?.referenceArchitect;
                            // Auto-prefill architect if customer has one and none is selected yet
                            if (arch && !selectedArch) {
                              setSelectedArch(arch);
                              setArchSearch(arch.name);
                              setFormData(p => ({ ...p, customerId: cid, referenceArchitectId: arch.id }));
                            } else {
                              setFormData({ ...formData, customerId: cid });
                            }
                          }}
                          style={{
                            width: "100%",
                            padding: isMobile ? "14px 12px" : "12px",
                            borderRadius: "8px",
                            border: "1.5px solid rgba(255,255,255,0.1)",
                            fontSize: "16px",
                            backgroundColor: "rgba(255,255,255,0.06)",
                            color: "#E2E8F0",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            minHeight: "44px",
                            boxSizing: "border-box",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "rgba(79,93,255,0.6)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                        >
                          <option value="">🔍 Select a customer...</option>
                          {customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name} {customer.mobile ? `(${customer.mobile})` : ""}{customer.referenceArchitect ? ` 🏛️` : ""}
                            </option>
                          ))}
                        </select>
                        {customers.length === 0 && (
                          <p style={{ marginTop: "5px", color: "#FFB95E", fontSize: "12px" }}>
                            ⚠️ No customers found. Switch to "Manual Entry" to add a new customer.
                          </p>
                        )}
                      </>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "15px" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>
                            Name * <span style={{ color: "#ef4444" }}>●</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.manualCustomerName}
                            onChange={(e) => setFormData({ ...formData, manualCustomerName: e.target.value })}
                            placeholder="Enter customer name"
                            style={{
                              width: "100%",
                              padding: isMobile ? "14px 12px" : "12px", // Larger touch target
                              borderRadius: "8px",
                              border: "1px solid rgba(255,255,255,0.1)",
                              fontSize: "16px", // Prevent iOS zoom
                              transition: "all 0.2s",
                              minHeight: "44px", // Touch target
                              boxSizing: "border-box",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#4F5DFF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>
                            Mobile * <span style={{ color: "#ef4444" }}>●</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={formData.manualCustomerMobile}
                            onChange={(e) => setFormData({ ...formData, manualCustomerMobile: e.target.value })}
                            placeholder="Enter mobile number"
                            style={{
                              width: "100%",
                              padding: isMobile ? "14px 12px" : "12px", // Larger touch target
                              borderRadius: "8px",
                              border: "1px solid rgba(255,255,255,0.1)",
                              fontSize: "16px", // Prevent iOS zoom
                              transition: "all 0.2s",
                              minHeight: "44px", // Touch target
                              boxSizing: "border-box",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#4F5DFF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>
                            Email (Optional)
                          </label>
                          <input
                            type="email"
                            value={formData.manualCustomerEmail}
                            onChange={(e) => setFormData({ ...formData, manualCustomerEmail: e.target.value })}
                            placeholder="Enter email address"
                            style={{
                              width: "100%",
                              padding: isMobile ? "14px 12px" : "12px", // Larger touch target
                              borderRadius: "8px",
                              border: "1px solid rgba(255,255,255,0.1)",
                              fontSize: "16px", // Prevent iOS zoom
                              transition: "all 0.2s",
                              minHeight: "44px", // Touch target
                              boxSizing: "border-box",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#4F5DFF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>
                            Address (Optional)
                          </label>
                          <input
                            type="text"
                            value={formData.manualCustomerAddress}
                            onChange={(e) => setFormData({ ...formData, manualCustomerAddress: e.target.value })}
                            placeholder="Enter address"
                            style={{
                              width: "100%",
                              padding: isMobile ? "14px 12px" : "12px", // Larger touch target
                              borderRadius: "8px",
                              border: "1px solid rgba(255,255,255,0.1)",
                              fontSize: "16px", // Prevent iOS zoom
                              transition: "all 0.2s",
                              minHeight: "44px", // Touch target
                              boxSizing: "border-box",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#4F5DFF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {/* ── Reference By (Architect) ─────────────────────────── */}
                  <div style={{ position: "relative" }}>
                    <label style={{ display: "block", marginBottom: "8px", color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>
                      🏛️ Reference By (Architect)
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        placeholder="Search architect…"
                        value={archSearch}
                        onChange={e => {
                          setArchSearch(e.target.value);
                          setArchDropOpen(true);
                          if (!e.target.value.trim()) {
                            setSelectedArch(null);
                            setFormData(p => ({ ...p, referenceArchitectId: null }));
                          }
                        }}
                        onFocus={() => setArchDropOpen(true)}
                        onBlur={() => setTimeout(() => setArchDropOpen(false), 180)}
                        style={{
                          width: "100%", padding: "12px 36px 12px 12px", borderRadius: "8px",
                          border: "1.5px solid rgba(255,255,255,0.1)", fontSize: "14px", boxSizing: "border-box",
                          backgroundColor: selectedArch ? "rgba(55,227,165,0.1)" : "rgba(255,255,255,0.06)",
                          color: "#E2E8F0", outline: "none",
                        }}
                      />
                      {selectedArch && (
                        <button type="button" onClick={() => { setSelectedArch(null); setArchSearch(""); setFormData(p => ({ ...p, referenceArchitectId: null })); }}
                          style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#7180A6", fontSize: 16 }}>✕</button>
                      )}
                    </div>
                    {archDropOpen && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000, background: "rgba(17,27,53,0.98)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", boxShadow: "0 8px 25px rgba(0,0,0,0.5)", maxHeight: 200, overflowY: "auto", marginTop: 2 }}>
                        <div onMouseDown={() => { setSelectedArch(null); setArchSearch(""); setFormData(p => ({ ...p, referenceArchitectId: null })); setArchDropOpen(false); }}
                          style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, color: "#7180A6", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          — None
                        </div>
                        {architects.filter(a => !archSearch.trim() || a.name.toLowerCase().includes(archSearch.toLowerCase()) || a.mobile.includes(archSearch)).map(a => (
                          <div key={a.id}
                            onMouseDown={() => { setSelectedArch(a); setArchSearch(a.name); setFormData(p => ({ ...p, referenceArchitectId: a.id })); setArchDropOpen(false); }}
                            style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)", backgroundColor: selectedArch?.id === a.id ? "rgba(79,93,255,0.15)" : "transparent" }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                            onMouseLeave={e => e.currentTarget.style.background = selectedArch?.id === a.id ? "rgba(79,93,255,0.15)" : "transparent"}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "#E2E8F0" }}>🏛️ {a.name}</div>
                            <div style={{ fontSize: 12, color: "#7180A6" }}>📱 {a.mobile}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedArch
                      ? <p style={{ marginTop: 5, fontSize: 12, color: "#37E3A5", fontWeight: 500 }}>✅ {selectedArch.name} · 📱 {selectedArch.mobile}</p>
                      : <p style={{ marginTop: 5, color: "#7180A6", fontSize: 12 }}>🏛️ Architect who referred this quotation (optional)</p>}
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>
                      Billing Type * <span style={{ color: "#ef4444" }}>●</span>
                    </label>
                    <div
                      style={{
                        display: "flex",
                        gap: isMobile ? "10px" : "15px", // Smaller gap on mobile
                        padding: isMobile ? "10px" : "12px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        backgroundColor: "rgba(255,255,255,0.04)",
                        flexWrap: isMobile ? "wrap" : "nowrap", // Wrap on mobile
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          padding: isMobile ? "12px 16px" : "8px 12px", // Larger touch target
                          borderRadius: "6px",
                          backgroundColor: formData.billingType === "GST" ? "rgba(79,93,255,0.15)" : "transparent",
                          border: formData.billingType === "GST" ? "2px solid #6366f1" : "2px solid transparent",
                          transition: "all 0.2s",
                          flex: isMobile ? "1 1 100%" : "1", // Full width on mobile
                          minHeight: "44px", // Touch target
                          justifyContent: "center",
                        }}
                      >
                        <input
                          type="radio"
                          value="GST"
                          checked={formData.billingType === "GST"}
                          onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                          style={{ cursor: "pointer" }}
                        />
                        <span style={{ 
                          fontWeight: formData.billingType === "GST" ? "600" : "400",
                          color: "#ffffff",
                          fontSize: "14px"
                        }}>💰 GST</span>
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          padding: isMobile ? "12px 16px" : "8px 12px", // Larger touch target
                          borderRadius: "6px",
                          backgroundColor: formData.billingType === "NON_GST" ? "rgba(79,93,255,0.15)" : "transparent",
                          border: formData.billingType === "NON_GST" ? "2px solid #6366f1" : "2px solid transparent",
                          transition: "all 0.2s",
                          flex: isMobile ? "1 1 100%" : "1", // Full width on mobile
                          minHeight: "44px", // Touch target
                          justifyContent: "center",
                        }}
                      >
                        <input
                          type="radio"
                          value="NON_GST"
                          checked={formData.billingType === "NON_GST"}
                          onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                          style={{ cursor: "pointer" }}
                        />
                        <span style={{ 
                          fontWeight: formData.billingType === "NON_GST" ? "600" : "400",
                          color: "#ffffff",
                          fontSize: "14px"
                        }}>💵 Non-GST</span>
                      </label>
                    </div>
                    <p style={{ marginTop: "5px", color: "#7180A6", fontSize: "12px" }}>
                      {formData.billingType === "GST"
                        ? "ℹ️ GST billing includes tax calculations (CGST/SGST or IGST)"
                        : "ℹ️ Non-GST billing - no tax calculations"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dates Section */}
              <div style={{
                marginBottom: isMobile ? "14px" : "18px",
                width: "100%",
                boxSizing: "border-box",
              }}>
                <h3 style={{ color: "#A9B3D1", fontSize: "13px", fontWeight: "700", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  📅 Quotation Dates
                </h3>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: isMobile ? "12px" : "14px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}>
                    <div style={{
                      width: "100%",
                      boxSizing: "border-box",
                    }}>
                      <label style={{ display: "block", marginBottom: "8px", color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>
                        Quotation Date * <span style={{ color: "#ef4444" }}>●</span>
                      </label>
                    <input
                      type="date"
                      required
                      value={formData.quotationDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setFormData({
                          ...formData,
                          quotationDate: newDate,
                          validUntil: getDefaultValidUntil(newDate),
                        });
                      }}
                      style={{
                        width: "100%",
                        maxWidth: "100%",
                        padding: isMobile ? "14px 12px" : "12px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        fontSize: "16px", // Prevent iOS zoom
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                        minHeight: "44px", // Touch target
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#4F5DFF")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                    />
                  </div>
                  <div style={{
                    width: "100%",
                    boxSizing: "border-box",
                  }}>
                    <label style={{ display: "block", marginBottom: "8px", color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>
                      Valid Until (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                      placeholder="Select expiry date"
                      style={{
                        width: "100%",
                        maxWidth: "100%",
                        padding: isMobile ? "14px 12px" : "12px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        fontSize: "16px", // Prevent iOS zoom
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                        minHeight: "44px", // Touch target
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#4F5DFF")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                    />
                  </div>
                </div>
              </div>

              {/* GST Fields (Conditional) */}
              {formData.billingType === "GST" && (
                <div style={{ marginBottom: "18px", padding: "14px", backgroundColor: "rgba(79,93,255,0.08)", borderRadius: "8px", border: "1px solid rgba(79,93,255,0.3)" }}>
                  <h3 style={{ color: "#A9B3D1", fontSize: "13px", fontWeight: "700", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    🧾 GST Information
                  </h3>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: isMobile ? "12px" : "14px",
                    width: "100%",
                  }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>
                        GST Percentage (%) * <span style={{ color: "#ef4444" }}>●</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.gstPercentage}
                        onChange={(e) => setFormData({ ...formData, gstPercentage: parseFloat(e.target.value) })}
                        placeholder="e.g., 18 for 18%"
                        style={{
                          width: "100%",
                          padding: isMobile ? "14px 12px" : "12px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255,255,255,0.1)",
                          fontSize: "16px", // Prevent iOS zoom
                          transition: "all 0.2s",
                          minHeight: "44px", // Touch target
                          boxSizing: "border-box",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#4F5DFF")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>
                        Customer State (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.customerState}
                        onChange={(e) => setFormData({ ...formData, customerState: e.target.value })}
                        placeholder="e.g., Maharashtra, Karnataka"
                        style={{
                          width: "100%",
                          padding: isMobile ? "14px 12px" : "12px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255,255,255,0.1)",
                          fontSize: "16px", // Prevent iOS zoom
                          transition: "all 0.2s",
                          minHeight: "44px", // Touch target
                          boxSizing: "border-box",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#4F5DFF")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                      />
                    </div>
                  </div>
                </div>
              )}


              {/* Shipping Address Section */}
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#A9B3D1", fontSize: "18px", fontWeight: "600", marginBottom: "15px" }}>
                  📦 Shipping Address (Optional)
                </h3>
                <div style={{ 
                  width: "100%",
                  boxSizing: "border-box",
                }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "8px", 
                    color: "#A9B3D1", 
                    fontWeight: "500", 
                    fontSize: "14px" 
                  }}>
                    Delivery Address
                  </label>
                  <textarea
                    value={formData.shippingAddress || ""}
                    onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                    placeholder="Enter shipping/delivery address (will be included in quotation, invoice, estimate, and challan)..."
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      padding: isMobile ? "14px 12px" : "12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      fontSize: "16px", // Prevent iOS zoom
                      minHeight: isMobile ? "100px" : "80px",
                      resize: "vertical",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#4F5DFF")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                  <p style={{ marginTop: "5px", color: "#7180A6", fontSize: "12px" }}>
                    📦 This address will be displayed in quotation, invoice, estimate, and delivery challan PDFs
                  </p>
                </div>
              </div>

              {/* Items Section */}
              <div style={{ marginBottom: "18px" }}>
                <div style={{ marginBottom: "12px" }}>
                  <h3 style={{ color: "#A9B3D1", fontSize: "13px", fontWeight: "700", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    📦 Quotation Items
                  </h3>
                </div>

                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      border: "1.5px solid rgba(255,255,255,0.08)",
                      padding: isMobile ? "12px" : "16px",
                      marginBottom: isMobile ? "12px" : "14px",
                      borderRadius: "12px",
                      backgroundColor: "rgba(17,27,53,0.95)",
                      transition: "all 0.2s",
                      width: "100%",
                      maxWidth: "100%",
                      boxSizing: "border-box",
                      overflow: "hidden", // Prevent content from overflowing
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#4F5DFF";
                      e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#818CF8", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "12px" }}>
                          {index + 1}
                        </div>
                        <strong style={{ color: "#ffffff", fontSize: "14px" }}>Item {index + 1}</strong>
                      </div>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          style={{ padding: "5px 12px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "500", transition: "all 0.2s" }}
                          onMouseOver={(e) => (e.target.style.backgroundColor = "#dc2626")}
                          onMouseOut={(e) => (e.target.style.backgroundColor = "#ef4444")}
                        >
                          🗑️ Remove
                        </button>
                      )}
                    </div>

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)",
                      gap: isMobile ? "16px" : "20px",
                      marginBottom: isMobile ? "16px" : "20px",
                      width: "100%",
                      minWidth: 0,
                    }}>
                      {/* Glass Type Dropdown */}
                      <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", marginBottom: "8px", color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>
                          Glass Type * <span style={{ color: "#ef4444" }}>●</span>
                        </label>
                        <select
                          required
                          value={item.glassType}
                          onChange={(e) => handleItemChange(index, "glassType", e.target.value)}
                          style={{
                            width: "100%",
                            padding: isMobile ? "14px 12px" : "12px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            fontSize: "16px",
                            minHeight: "44px",
                            boxSizing: "border-box",
                          }}
                        >
                          <option value="">Select glass type</option>
                          {glassTypeOptions.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>

                      {/* Thickness — stock-item picker filtered to selected Glass Type */}
                      <div style={{ position: "relative" }}>
                        <label style={{ display: "block", marginBottom: "8px", color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>
                          Thickness * <span style={{ color: "#ef4444" }}>●</span>
                        </label>
                        <div style={{ position: "relative" }}>
                          <input
                            type="text"
                            required
                            value={item.thickness}
                            disabled={!item.glassType}
                            onChange={(e) => {
                              let inputVal = e.target.value;
                              const numberMatch = inputVal.match(/^(\d+)$/);
                              if (numberMatch) inputVal = numberMatch[1] + "MM";
                              const numberMmMatch = inputVal.match(/^(\d+)\s*mm$/i);
                              if (numberMmMatch) inputVal = numberMmMatch[1] + "MM";
                              handleItemChange(index, "thickness", inputVal);
                            }}
                            onBlur={(e) => {
                              let inputVal = e.target.value.trim();
                              if (inputVal && /^\d+$/.test(inputVal)) { inputVal += "MM"; handleItemChange(index, "thickness", inputVal); }
                              if (inputVal && /^\d+\s*mm$/i.test(inputVal)) { handleItemChange(index, "thickness", inputVal.match(/^(\d+)/i)[1] + "MM"); }
                              setTimeout(() => {
                                e.target.style.borderColor = "rgba(255,255,255,0.1)";
                                setShowStockDropdown({ ...showStockDropdown, [index]: false });
                              }, 200);
                            }}
                            placeholder={!item.glassType ? "Select glass type first" : "e.g., 5MM — or click 📦 to pick"}
                            style={{
                              width: "100%",
                              padding: isMobile ? "14px 40px 14px 12px" : "12px 40px 12px 12px",
                              borderRadius: "8px",
                              border: "1px solid rgba(255,255,255,0.1)",
                              fontSize: "16px",
                              transition: "all 0.2s",
                              boxSizing: "border-box",
                              minHeight: "44px",
                              opacity: !item.glassType ? 0.55 : 1,
                              cursor: !item.glassType ? "not-allowed" : "text",
                            }}
                            onFocus={(e) => {
                              if (!item.glassType) return;
                              e.target.style.borderColor = "#4F5DFF";
                              setShowStockDropdown({ ...showStockDropdown, [index]: true });
                              setStockDropdownType({ ...stockDropdownType, [index]: "thickness" });
                            }}
                          />
                          <span
                            style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "18px", cursor: item.glassType ? "pointer" : "not-allowed", opacity: item.glassType ? 1 : 0.35 }}
                            onClick={() => {
                              if (!item.glassType) return;
                              const isOpen = showStockDropdown[index];
                              setShowStockDropdown({ ...showStockDropdown, [index]: !isOpen });
                              if (!isOpen) setStockDropdownType({ ...stockDropdownType, [index]: "thickness" });
                            }}
                          >📦</span>
                        </div>

                        {showStockDropdown[index] && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000, backgroundColor: "rgba(17,27,53,0.97)", border: "2px solid rgba(79,93,255,0.6)", borderRadius: "8px", marginTop: "4px", maxHeight: "400px", overflowY: "auto", boxShadow: "0 10px 24px rgba(0,0,0,0.5)" }}>
                            {(() => {
                              const filtered = allStock.filter(s =>
                                s.quantity > 0 &&
                                (s.glass?.type || "").toLowerCase() === (item.glassType || "").toLowerCase()
                              );
                              return (
                                <>
                                  <div style={{ padding: "8px 12px", backgroundColor: "rgba(17,27,53,0.7)", borderBottom: "1px solid rgba(255,255,255,0.07)", fontWeight: "600", fontSize: "12px", color: "#7180A6" }}>
                                    {item.glassType} Stock ({filtered.length} item{filtered.length !== 1 ? "s" : ""})
                                  </div>
                                  {filtered.length === 0 ? (
                                    <div style={{ padding: "16px", textAlign: "center", color: "#FF6B81", fontSize: "13px", fontWeight: "500" }}>
                                      No stock available for the selected Glass Type.
                                    </div>
                                  ) : (
                                    filtered.map((stockItem, si) => {
                                      const thickness = stockItem.glass?.thickness || "";
                                      const thicknessDisplay = thickness ? `${thickness}MM` : "—";
                                      const size = stockItem.height && stockItem.width ? `${stockItem.height} × ${stockItem.width}` : "N/A";
                                      return (
                                        <div
                                          key={`${stockItem.id}-${si}`}
                                          style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", transition: "background-color 0.15s" }}
                                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
                                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
                                          onClick={(e) => {
                                            e.preventDefault(); e.stopPropagation();
                                            handleThicknessSelect(index, stockItem);
                                            setShowStockDropdown({ ...showStockDropdown, [index]: false });
                                            setStockDropdownType({ ...stockDropdownType, [index]: null });
                                          }}
                                        >
                                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <div style={{ flex: 1 }}>
                                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                                <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "15px" }}>{thicknessDisplay}</div>
                                                <span style={{ fontSize: "11px", color: "#4F5DFF", backgroundColor: "rgba(79,93,255,0.15)", padding: "2px 7px", borderRadius: "4px", fontWeight: "600" }}>{stockItem.glass?.type || "—"}</span>
                                              </div>
                                              <div style={{ fontSize: "12px", color: "#7180A6", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                                <span>📏 {size} {(stockItem.glass?.unit || "MM").toUpperCase()}</span>
                                                <span>📍 Stand #{stockItem.standNo}</span>
                                                <span>📦 Qty: {stockItem.quantity}</span>
                                                {stockItem.sellingPrice && <span>💵 ₹{parseFloat(stockItem.sellingPrice).toFixed(2)}/SqFt</span>}
                                                {stockItem.hsnNo && <span>🏷️ {stockItem.hsnNo}</span>}
                                              </div>
                                            </div>
                                            <span style={{ fontSize: "18px", color: "#37E3A5", marginLeft: "8px", flexShrink: 0 }}>✓</span>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      {/* Size Input with MM/INCH Toggle */}
                      <div style={{ gridColumn: isMobile ? "1" : "1 / -1", marginBottom: "10px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={item.sizeInMM || false}
                            onChange={(e) => handleItemChange(index, "sizeInMM", e.target.checked)}
                            style={{ cursor: "pointer", width: "18px", height: "18px" }}
                          />
                          <span style={{ color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>Size in mm</span>
                        </label>
                      </div>
                      
                      {/* Height & Width — always in one row (50/50) */}
                      <div style={{ display: "flex", gap: 8, width: "100%", boxSizing: "border-box" }}>
                        {/* Height */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <label style={{ display: "block", marginBottom: 5, color: "#A9B3D1", fontWeight: "500", fontSize: 13 }}>
                            H * <span style={{ color: "#ef4444" }}>●</span>
                          </label>
                          <div style={{ display: "flex", gap: 4 }}>
                            <input
                              type="text"
                              required
                              value={item.sizeInMM ? (item.heightMM || "") : (item.height || "")}
                              onChange={(e) => handleItemChange(index, "height", e.target.value)}
                              placeholder={item.sizeInMM ? "e.g. 3000" : "e.g. 9 1/2"}
                              style={{
                                flex: 1, minWidth: 0,
                                padding: "10px 8px",
                                borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)",
                                fontSize: 16, boxSizing: "border-box", minHeight: 44,
                              }}
                              onFocus={(e) => (e.target.style.borderColor = "#4F5DFF")}
                              onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                            />
                            <div style={{
                              width: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                              borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(17,27,53,0.7)",
                              fontSize: 12, color: "#7180A6", minHeight: 44,
                            }}>
                              {item.sizeInMM ? "MM" : "IN"}
                            </div>
                          </div>
                        </div>

                        {/* Width */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <label style={{ display: "block", marginBottom: 5, color: "#A9B3D1", fontWeight: "500", fontSize: 13 }}>
                            W * <span style={{ color: "#ef4444" }}>●</span>
                          </label>
                          <div style={{ display: "flex", gap: 4 }}>
                            <input
                              type="text"
                              required
                              value={item.sizeInMM ? (item.widthMM || "") : (item.width || "")}
                              onChange={(e) => handleItemChange(index, "width", e.target.value)}
                              placeholder={item.sizeInMM ? "e.g. 2000" : "e.g. 6 1/2"}
                              style={{
                                flex: 1, minWidth: 0,
                                padding: "10px 8px",
                                borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)",
                                fontSize: 16, boxSizing: "border-box", minHeight: 44,
                              }}
                              onFocus={(e) => (e.target.style.borderColor = "#4F5DFF")}
                              onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                            />
                            <div style={{
                              width: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                              borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(17,27,53,0.7)",
                              fontSize: 12, color: "#7180A6", minHeight: 44,
                            }}>
                              {item.sizeInMM ? "MM" : "IN"}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Table Selection — always 2 columns */}
                      <div style={{ gridColumn: isMobile ? "1" : "1 / -1", marginTop: "8px", marginBottom: "6px" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#7180A6", marginBottom: 6 }}>📊 Table Selection</div>
                        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "8px" }}>
                          {/* Height Table */}
                          <div style={{
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "7px",
                            padding: "10px",
                            backgroundColor: "rgba(17,27,53,0.95)",
                          }}>
                            <label style={{ display: "block", marginBottom: "6px", color: "#A9B3D1", fontWeight: "500", fontSize: "12px" }}>
                              Height Tbl
                            </label>
                            <div style={{ display: "flex", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
                              <input
                                type="text"
                                value={item.heightTableNumber !== undefined && item.heightTableNumber !== null ? String(item.heightTableNumber) : "6"}
                                onChange={(e) => {
                                  const inputVal = e.target.value;
                                  // Allow empty string for deletion
                                  if (inputVal === "") {
                                    const newItems = [...formData.items];
                                    newItems[index].heightTableNumber = "";
                                    setFormData({ ...formData, items: newItems });
                                    return;
                                  }
                                  // Allow digits, max 3 digits for larger table numbers
                                  const digitsOnly = inputVal.replace(/[^0-9]/g, '');
                                  if (digitsOnly.length <= 3 && digitsOnly !== "") {
                                    const newItems = [...formData.items];
                                    newItems[index].heightTableNumber = digitsOnly;
                                    // Recalculate table value if we have height
                                    if (newItems[index].height) {
                                      const numValue = parseInt(digitsOnly);
                                      if (!isNaN(numValue) && numValue > 0) {
                                        const tableValue = findNextTableValue(parseFraction(newItems[index].height || 0), numValue);
                                        newItems[index].selectedHeightTableValue = tableValue;
                                        updatePolishSelectionNumbers(newItems[index]);
                                      }
                                    }
                                    setFormData({ ...formData, items: newItems });
                                  }
                                }}
                                onBlur={(e) => {
                                  const inputVal = e.target.value;
                                  if (!inputVal || inputVal === "") {
                                    handleItemChange(index, "heightTableNumber", 6);
                                    return;
                                  }
                                  const num = parseInt(inputVal);
                                  if (isNaN(num) || num < 1) {
                                    handleItemChange(index, "heightTableNumber", 1);
                                  } else {
                                    // Allow unlimited table numbers
                                    handleItemChange(index, "heightTableNumber", num);
                                  }
                                }}
                                style={{
                                  width: isMobile ? "70px" : "60px",
                                  padding: "8px",
                                  borderRadius: "6px",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  fontSize: "14px",
                                  textAlign: "center",
                                }}
                              />
                            </div>
                            {item.selectedHeightTableValue && (
                              <div style={{ marginTop: "6px", padding: "5px 8px", backgroundColor: "rgba(79,93,255,0.15)", borderRadius: "5px", border: "1px solid rgba(79,93,255,0.5)" }}>
                                <p style={{ fontSize: "12px", color: "#818CF8", fontWeight: "600", margin: 0 }}>
                                  ✓ {item.selectedHeightTableValue}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Width Table */}
                          <div style={{
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "7px",
                            padding: "10px",
                            backgroundColor: "rgba(17,27,53,0.95)",
                            boxSizing: "border-box",
                          }}>
                            <label style={{ display: "block", marginBottom: "6px", color: "#A9B3D1", fontWeight: "500", fontSize: "12px" }}>
                              Width Tbl
                            </label>
                            <div style={{ display: "flex", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
                              <input
                                type="text"
                                value={item.widthTableNumber !== undefined && item.widthTableNumber !== null ? String(item.widthTableNumber) : "6"}
                                onChange={(e) => {
                                  const inputVal = e.target.value;
                                  // Allow empty string for deletion
                                  if (inputVal === "") {
                                    const newItems = [...formData.items];
                                    newItems[index].widthTableNumber = "";
                                    setFormData({ ...formData, items: newItems });
                                    return;
                                  }
                                  // Allow digits, max 3 digits for larger table numbers
                                  const digitsOnly = inputVal.replace(/[^0-9]/g, '');
                                  if (digitsOnly.length <= 3 && digitsOnly !== "") {
                                    const newItems = [...formData.items];
                                    newItems[index].widthTableNumber = digitsOnly;
                                    // Recalculate table value if we have width
                                    if (newItems[index].width) {
                                      const numValue = parseInt(digitsOnly);
                                      if (!isNaN(numValue) && numValue > 0) {
                                        const tableValue = findNextTableValue(parseFraction(newItems[index].width || 0), numValue);
                                        newItems[index].selectedWidthTableValue = tableValue;
                                        updatePolishSelectionNumbers(newItems[index]);
                                      }
                                    }
                                    setFormData({ ...formData, items: newItems });
                                  }
                                }}
                                onBlur={(e) => {
                                  const inputVal = e.target.value;
                                  if (!inputVal || inputVal === "") {
                                    handleItemChange(index, "widthTableNumber", 6);
                                    return;
                                  }
                                  const num = parseInt(inputVal);
                                  if (isNaN(num) || num < 1) {
                                    handleItemChange(index, "widthTableNumber", 1);
                                  } else {
                                    // Allow unlimited table numbers
                                    handleItemChange(index, "widthTableNumber", num);
                                  }
                                }}
                                style={{
                                  width: isMobile ? "70px" : "60px",
                                  padding: "8px",
                                  borderRadius: "6px",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  fontSize: "14px",
                                  textAlign: "center",
                                }}
                              />
                            </div>
                            {item.selectedWidthTableValue && (
                              <div style={{ marginTop: "6px", padding: "5px 8px", backgroundColor: "rgba(79,93,255,0.15)", borderRadius: "5px", border: "1px solid rgba(79,93,255,0.5)" }}>
                                <p style={{ fontSize: "12px", color: "#818CF8", fontWeight: "600", margin: 0 }}>
                                  ✓ {item.selectedWidthTableValue}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>


                      {/* Polish Type Section */}
                      <div style={{ gridColumn: isMobile ? "1" : "1 / -1", marginTop: "8px", marginBottom: "6px" }}>
                        <label style={{ display: "block", marginBottom: "8px", color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>
                          Polish Type (Optional)
                        </label>
                        <div style={{
                          display: "flex",
                          gap: "8px",
                          padding: "6px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255,255,255,0.1)",
                          backgroundColor: "rgba(255,255,255,0.04)",
                          flexWrap: "nowrap",
                        }}>
                          <label style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            cursor: "pointer",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            backgroundColor: item.polish === "Hand-Polish" ? "rgba(79,93,255,0.15)" : "transparent",
                            border: item.polish === "Hand-Polish" ? "2px solid #6366f1" : "2px solid transparent",
                            transition: "all 0.2s",
                            flex: 1,
                            minHeight: "40px",
                            justifyContent: "center",
                          }}>
                            <input
                              type="radio"
                              name={`polish-type-${index}`}
                              value="Hand-Polish"
                              checked={item.polish === "Hand-Polish"}
                              onChange={(e) => handleItemChange(index, "polish", e.target.value)}
                              style={{ cursor: "pointer" }}
                            />
                            <span style={{ fontWeight: item.polish === "Hand-Polish" ? "600" : "400", color: "#A9B3D1", fontSize: "13px" }}>Hand-Polish</span>
                          </label>
                          <label style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            cursor: "pointer",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            backgroundColor: item.polish === "CNC Polish" ? "rgba(79,93,255,0.15)" : "transparent",
                            border: item.polish === "CNC Polish" ? "2px solid #6366f1" : "2px solid transparent",
                            transition: "all 0.2s",
                            flex: 1,
                            minHeight: "40px",
                            justifyContent: "center",
                          }}>
                            <input
                              type="radio"
                              name={`polish-type-${index}`}
                              value="CNC Polish"
                              checked={item.polish === "CNC Polish"}
                              onChange={(e) => handleItemChange(index, "polish", e.target.value)}
                              style={{ cursor: "pointer" }}
                            />
                            <span style={{ fontWeight: item.polish === "CNC Polish" ? "600" : "400", color: "#A9B3D1", fontSize: "13px" }}>CNC Polish</span>
                          </label>
                        </div>
                        <p style={{ marginTop: "5px", color: "#7180A6", fontSize: "11px" }}>✨ Select the type of polish for this item</p>
                      </div>

                      {/* Polish Selection Section */}
                      <div style={{ gridColumn: isMobile ? "1" : "1 / -1", marginTop: "6px", marginBottom: "6px" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#7180A6", marginBottom: 6 }}>✨ Polish Selection</div>

                        {/* Rate Configuration — always 3 columns */}
                        <div style={{
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "7px",
                          padding: "10px",
                          marginBottom: "8px",
                          backgroundColor: "rgba(17,27,53,0.95)",
                        }}>
                          <label style={{ display: "block", marginBottom: "6px", color: "#A9B3D1", fontWeight: "500", fontSize: "12px" }}>
                            Rate/Rft
                          </label>
                          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)", gap: "8px" }}>
                            <div>
                              <label style={{ display: "block", marginBottom: "5px", fontSize: isMobile ? "11px" : "13px", color: "#7180A6" }}>{isMobile ? "Polish" : "P (Polish)"}</label>
                              <input
                                type="text"
                                value={item.polishRates?.P !== undefined && item.polishRates?.P !== null ? String(item.polishRates.P) : "15"}
                                onChange={(e) => {
                                  const inputVal = e.target.value;
                                  // Allow empty string for deletion
                                  if (inputVal === "") {
                                    const newItems = [...formData.items];
                                    if (!newItems[index].polishRates) newItems[index].polishRates = { P: 15, H: 75, B: 75 };
                                    newItems[index].polishRates.P = "";
                                    setFormData({ ...formData, items: newItems });
                                    return;
                                  }
                                  // Allow digits and decimal point
                                  const validInput = inputVal.replace(/[^0-9.]/g, '');
                                  // Ensure only one decimal point
                                  const parts = validInput.split('.');
                                  const finalInput = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : validInput;
                                  if (finalInput !== "") {
                                    const newItems = [...formData.items];
                                    if (!newItems[index].polishRates) newItems[index].polishRates = { P: 15, H: 75, B: 75 };
                                    newItems[index].polishRates.P = finalInput;
                                    setFormData({ ...formData, items: newItems });
                                  }
                                }}
                                onBlur={(e) => {
                                  const inputVal = e.target.value;
                                  if (!inputVal || inputVal === "") {
                                    handlePolishRateChange(index, "P", 15);
                                  } else {
                                    const num = parseFloat(inputVal);
                                    if (isNaN(num) || num < 0) {
                                      handlePolishRateChange(index, "P", 0);
                                    } else {
                                      handlePolishRateChange(index, "P", num);
                                    }
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "8px",
                                  borderRadius: "6px",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  fontSize: "14px",
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", marginBottom: "5px", fontSize: isMobile ? "11px" : "13px", color: "#7180A6" }}>{isMobile ? "Half-Rnd" : "H (Half-round)"}</label>
                              <input
                                type="text"
                                value={item.polishRates?.H !== undefined && item.polishRates?.H !== null ? String(item.polishRates.H) : "75"}
                                onChange={(e) => {
                                  const inputVal = e.target.value;
                                  // Allow empty string for deletion
                                  if (inputVal === "") {
                                    const newItems = [...formData.items];
                                    if (!newItems[index].polishRates) newItems[index].polishRates = { P: 15, H: 75, B: 75 };
                                    newItems[index].polishRates.H = "";
                                    setFormData({ ...formData, items: newItems });
                                    return;
                                  }
                                  // Allow digits and decimal point
                                  const validInput = inputVal.replace(/[^0-9.]/g, '');
                                  // Ensure only one decimal point
                                  const parts = validInput.split('.');
                                  const finalInput = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : validInput;
                                  if (finalInput !== "") {
                                    const newItems = [...formData.items];
                                    if (!newItems[index].polishRates) newItems[index].polishRates = { P: 15, H: 75, B: 75 };
                                    newItems[index].polishRates.H = finalInput;
                                    setFormData({ ...formData, items: newItems });
                                  }
                                }}
                                onBlur={(e) => {
                                  const inputVal = e.target.value;
                                  if (!inputVal || inputVal === "") {
                                    handlePolishRateChange(index, "H", 75);
                                  } else {
                                    const num = parseFloat(inputVal);
                                    if (isNaN(num) || num < 0) {
                                      handlePolishRateChange(index, "H", 0);
                                    } else {
                                      handlePolishRateChange(index, "H", num);
                                    }
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "8px",
                                  borderRadius: "6px",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  fontSize: "14px",
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", marginBottom: "5px", fontSize: isMobile ? "11px" : "13px", color: "#7180A6" }}>{isMobile ? "Beveling" : "B (Beveling)"}</label>
                              <input
                                type="text"
                                value={item.polishRates?.B !== undefined && item.polishRates?.B !== null ? String(item.polishRates.B) : "75"}
                                onChange={(e) => {
                                  const inputVal = e.target.value;
                                  // Allow empty string for deletion
                                  if (inputVal === "") {
                                    const newItems = [...formData.items];
                                    if (!newItems[index].polishRates) newItems[index].polishRates = { P: 15, H: 75, B: 75 };
                                    newItems[index].polishRates.B = "";
                                    setFormData({ ...formData, items: newItems });
                                    return;
                                  }
                                  // Allow digits and decimal point
                                  const validInput = inputVal.replace(/[^0-9.]/g, '');
                                  // Ensure only one decimal point
                                  const parts = validInput.split('.');
                                  const finalInput = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : validInput;
                                  if (finalInput !== "") {
                                    const newItems = [...formData.items];
                                    if (!newItems[index].polishRates) newItems[index].polishRates = { P: 15, H: 75, B: 75 };
                                    newItems[index].polishRates.B = finalInput;
                                    setFormData({ ...formData, items: newItems });
                                  }
                                }}
                                onBlur={(e) => {
                                  const inputVal = e.target.value;
                                  if (!inputVal || inputVal === "") {
                                    handlePolishRateChange(index, "B", 75);
                                  } else {
                                    const num = parseFloat(inputVal);
                                    if (isNaN(num) || num < 0) {
                                      handlePolishRateChange(index, "B", 0);
                                    } else {
                                      handlePolishRateChange(index, "B", num);
                                    }
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "8px",
                                  borderRadius: "6px",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  fontSize: "14px",
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Polish Selection Table */}
                        <div style={{
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "7px",
                          padding: "8px",
                          backgroundColor: "rgba(17,27,53,0.95)",
                        }}>
                          {isMobile ? (
                            // Mobile: flex card layout — no horizontal scroll
                            <div>
                              {/* Header */}
                              <div style={{ display: "flex", alignItems: "center", padding: "6px 4px 8px", borderBottom: "2px solid rgba(255,255,255,0.08)" }}>
                                <div style={{ width: 28, flexShrink: 0 }}>
                                  <input
                                    type="checkbox"
                                    checked={item.polishSelection?.every(row => row.checked) || false}
                                    onChange={(e) => {
                                      const newItems = [...formData.items];
                                      const itm = newItems[index];
                                      if (!itm.polishSelection) itm.polishSelection = [
                                        { side: "Height 1", checked: false, type: null, rate: 0 },
                                        { side: "Width 1",  checked: false, type: null, rate: 0 },
                                        { side: "Height 2", checked: false, type: null, rate: 0 },
                                        { side: "Width 2",  checked: false, type: null, rate: 0 },
                                      ];
                                      itm.polishSelection.forEach(row => {
                                        row.checked = e.target.checked;
                                        if (!e.target.checked) { row.type = null; row.rate = 0; }
                                      });
                                      setFormData({ ...formData, items: newItems });
                                    }}
                                    style={{ cursor: "pointer", width: 16, height: 16 }}
                                  />
                                </div>
                                <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: "#A9B3D1", textTransform: "uppercase", letterSpacing: "0.05em" }}>Side</div>
                                <div style={{ display: "flex" }}>
                                  {["P", "H", "B"].map(type => (
                                    <label key={type} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 52, cursor: "pointer" }}>
                                      <span style={{ fontSize: 13, fontWeight: 700, color: "#A9B3D1" }}>{type}</span>
                                      <input
                                        type="checkbox"
                                        checked={item.polishSelection?.every(row => row.checked && row.type === type) || false}
                                        onChange={(e) => handlePolishSelectAll(index, type, e.target.checked)}
                                        style={{ cursor: "pointer", width: 16, height: 16 }}
                                      />
                                    </label>
                                  ))}
                                </div>
                              </div>
                              {/* Rows */}
                              {(item.polishSelection || [
                                { side: "Height 1", checked: false, type: null, rate: 0 },
                                { side: "Width 1",  checked: false, type: null, rate: 0 },
                                { side: "Height 2", checked: false, type: null, rate: 0 },
                                { side: "Width 2",  checked: false, type: null, rate: 0 },
                              ]).map((row, rowIndex) => (
                                <div key={rowIndex} style={{ display: "flex", alignItems: "center", padding: "10px 4px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                                  <div style={{ width: 28, flexShrink: 0 }}>
                                    <input
                                      type="checkbox"
                                      checked={row.checked || false}
                                      onChange={(e) => handlePolishCheckboxChange(index, rowIndex, e.target.checked)}
                                      style={{ cursor: "pointer", width: 18, height: 18 }}
                                    />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, color: "#A9B3D1", fontWeight: 500 }}>{row.side}</div>
                                    {row.checked && row.type && (
                                      <div style={{ fontSize: 11, color: "#818CF8", fontWeight: 600, marginTop: 2 }}>₹{row.rate || 0}/ft</div>
                                    )}
                                  </div>
                                  <div style={{ display: "flex" }}>
                                    {["P", "H", "B"].map(type => (
                                      <div key={type} style={{ width: 52, display: "flex", justifyContent: "center" }}>
                                        <input
                                          type="radio"
                                          name={`polish-${index}-${rowIndex}`}
                                          checked={row.type === type}
                                          onChange={() => handlePolishTypeChange(index, rowIndex, type)}
                                          disabled={!row.checked}
                                          style={{ cursor: row.checked ? "pointer" : "not-allowed", width: 20, height: 20 }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            // Desktop: original table with scroll
                            <div style={{ overflowX: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.08)" }}>
                                    <th style={{ padding: "10px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#A9B3D1" }}>
                                      <label style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", cursor: "pointer" }}>
                                        <span>Side</span>
                                        <input
                                          type="checkbox"
                                          checked={item.polishSelection?.every(row => row.checked) || false}
                                          onChange={(e) => {
                                            const newItems = [...formData.items];
                                            const item = newItems[index];
                                            if (!item.polishSelection) {
                                              item.polishSelection = [
                                                { side: "Height 1", checked: false, type: null, rate: 0 },
                                                { side: "Width 1",  checked: false, type: null, rate: 0 },
                                                { side: "Height 2", checked: false, type: null, rate: 0 },
                                                { side: "Width 2",  checked: false, type: null, rate: 0 },
                                              ];
                                            }
                                            item.polishSelection.forEach((row) => {
                                              row.checked = e.target.checked;
                                              if (!e.target.checked) { row.type = null; row.rate = 0; }
                                            });
                                            setFormData({ ...formData, items: newItems });
                                          }}
                                          style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                        />
                                      </label>
                                    </th>
                                    <th style={{ padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#A9B3D1" }}>
                                      <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                                        <span>P</span>
                                        <input
                                          type="checkbox"
                                          checked={item.polishSelection?.every(row => row.checked && row.type === "P") || false}
                                          onChange={(e) => handlePolishSelectAll(index, "P", e.target.checked)}
                                          style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                        />
                                      </label>
                                    </th>
                                    <th style={{ padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#A9B3D1" }}>
                                      <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                                        <span>H</span>
                                        <input
                                          type="checkbox"
                                          checked={item.polishSelection?.every(row => row.checked && row.type === "H") || false}
                                          onChange={(e) => handlePolishSelectAll(index, "H", e.target.checked)}
                                          style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                        />
                                      </label>
                                    </th>
                                    <th style={{ padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#A9B3D1" }}>
                                      <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                                        <span>B</span>
                                        <input
                                          type="checkbox"
                                          checked={item.polishSelection?.every(row => row.checked && row.type === "B") || false}
                                          onChange={(e) => handlePolishSelectAll(index, "B", e.target.checked)}
                                          style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                        />
                                      </label>
                                    </th>
                                    <th style={{ padding: "10px", textAlign: "right", fontSize: "13px", fontWeight: "600", color: "#A9B3D1" }}>Rate</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(item.polishSelection || [
                                    { side: "Height 1", checked: false, type: null, rate: 0 },
                                    { side: "Width 1",  checked: false, type: null, rate: 0 },
                                    { side: "Height 2", checked: false, type: null, rate: 0 },
                                    { side: "Width 2",  checked: false, type: null, rate: 0 },
                                  ]).map((row, rowIndex) => (
                                    <tr key={rowIndex} style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                                      <td style={{ padding: "10px" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                          <input
                                            type="checkbox"
                                            checked={row.checked || false}
                                            onChange={(e) => handlePolishCheckboxChange(index, rowIndex, e.target.checked)}
                                            style={{ cursor: "pointer", width: "18px", height: "18px" }}
                                          />
                                          <span style={{ fontSize: "13px", color: "#A9B3D1" }}>{row.side}</span>
                                        </label>
                                      </td>
                                      <td style={{ padding: "10px", textAlign: "center" }}>
                                        <input
                                          type="radio"
                                          name={`polish-${index}-${rowIndex}`}
                                          checked={row.type === "P"}
                                          onChange={() => handlePolishTypeChange(index, rowIndex, "P")}
                                          disabled={!row.checked}
                                          style={{ cursor: row.checked ? "pointer" : "not-allowed", width: "18px", height: "18px" }}
                                        />
                                      </td>
                                      <td style={{ padding: "10px", textAlign: "center" }}>
                                        <input
                                          type="radio"
                                          name={`polish-${index}-${rowIndex}`}
                                          checked={row.type === "H"}
                                          onChange={() => handlePolishTypeChange(index, rowIndex, "H")}
                                          disabled={!row.checked}
                                          style={{ cursor: row.checked ? "pointer" : "not-allowed", width: "18px", height: "18px" }}
                                        />
                                      </td>
                                      <td style={{ padding: "10px", textAlign: "center" }}>
                                        <input
                                          type="radio"
                                          name={`polish-${index}-${rowIndex}`}
                                          checked={row.type === "B"}
                                          onChange={() => handlePolishTypeChange(index, rowIndex, "B")}
                                          disabled={!row.checked}
                                          style={{ cursor: row.checked ? "pointer" : "not-allowed", width: "18px", height: "18px" }}
                                        />
                                      </td>
                                      <td style={{ padding: "10px", textAlign: "right", fontSize: "13px", color: "#7180A6" }}>
                                        {row.checked && row.type ? `₹${row.rate || 0}` : "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quantity and Selling Price — always 2-per-row */}
                      <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "8px", marginTop: "8px", width: "100%", minWidth: 0 }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>
                          Quantity * <span style={{ color: "#ef4444" }}>●</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                          placeholder="e.g., 2"
                          style={{
                            width: "100%",
                            padding: isMobile ? "14px 12px" : "12px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            fontSize: "16px", // Prevent iOS zoom
                            transition: "all 0.2s",
                            minHeight: "44px", // Touch target
                            boxSizing: "border-box",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "#4F5DFF")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                        />
                        <p style={{ marginTop: "5px", color: "#7180A6", fontSize: "11px" }}>🔢 Number of pieces</p>
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>
                          Selling Price (₹) * <span style={{ color: "#ef4444" }}>●</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={item.sellingPrice || item.ratePerSqft || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            handleItemChange(index, "sellingPrice", value);
                            // Also update ratePerSqft for backward compatibility
                            handleItemChange(index, "ratePerSqft", value);
                          }}
                          placeholder="e.g., 50.00"
                          style={{
                            width: "100%",
                            padding: isMobile ? "14px 12px" : "12px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            fontSize: "16px", // Prevent iOS zoom
                            transition: "all 0.2s",
                            boxSizing: "border-box",
                            minHeight: "44px", // Touch target
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "#4F5DFF")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                        />
                        <p style={{ marginTop: "5px", color: "#7180A6", fontSize: "11px" }}>
                          💰 Selling price per square foot (modifiable)
                          {(() => {
                            // Show calculated default price as helper text
                            const height = parseFloat(item.height) || 0;
                            const width = parseFloat(item.width) || 0;
                            const quantity = parseFloat(item.quantity) || 1;
                            const sellingPrice = parseFloat(item.sellingPrice || item.ratePerSqft) || 0;
                            if (height > 0 && width > 0 && sellingPrice > 0) {
                              // Convert to feet per the selected unit (MM ÷ 304.8,
                              // INCH ÷ 12, FEET ×1) — never treat MM as inches.
                              const hFt = convertToFeet(height, item.heightUnit || "FEET");
                              const wFt = convertToFeet(width, item.widthUnit || "FEET");
                              const areaInSqFt = hFt * wFt;
                              const totalArea = areaInSqFt * quantity;
                              const totalPrice = sellingPrice * totalArea;
                              const mmNote = (item.heightUnit === "MM" || item.widthUnit === "MM")
                                ? ` · ${(height / 25.4).toFixed(2)} × ${(width / 25.4).toFixed(2)} IN`
                                : "";
                              return ` | Default Total: ₹${totalPrice.toFixed(2)} (${totalArea.toFixed(2)} SqFt × ₹${sellingPrice.toFixed(2)})${mmNote}`;
                            }
                            return "";
                          })()}
                        </p>
                      </div>
                      </div>

                      <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "8px", width: "100%", minWidth: 0 }}>
                      <div style={{
                        width: "100%",
                        boxSizing: "border-box",
                      }}>
                        <label style={{ display: "block", marginBottom: "6px", color: "#A9B3D1", fontWeight: "500", fontSize: 13 }}>
                          Area (SqFT) 🔒
                        </label>
                        <input
                          type="number"
                          readOnly
                          value={(
                            convertToFeet(parseFloat(item.height) || 0, item.heightUnit || "FEET") *
                            convertToFeet(parseFloat(item.width)  || 0, item.widthUnit  || "FEET")
                          ).toFixed(2)}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: "7px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            fontSize: "16px",
                            backgroundColor: "rgba(17,27,53,0.7)",
                            color: "#7180A6",
                            cursor: "not-allowed",
                            boxSizing: "border-box",
                            minHeight: 44,
                          }}
                        />
                        <p style={{ marginTop: "4px", color: "#7180A6", fontSize: "11px" }}>
                          Auto-calculated in square feet
                        </p>
                      </div>
                      <div style={{
                        width: "100%",
                        boxSizing: "border-box",
                      }}>
                        <label style={{ 
                          display: "block", 
                          marginBottom: "8px", 
                          color: "#A9B3D1", 
                          fontWeight: "500", 
                          fontSize: isMobile ? "13px" : "14px" 
                        }}>
                          Subtotal (₹) 🔒
                        </label>
                        <input
                          type="number"
                          readOnly
                          value={
                            (() => {
                              // Use table values if available, otherwise fallback to input values
                              const heightTableValue = item.selectedHeightTableValue ? parseFloat(item.selectedHeightTableValue) : parseFraction(item.height || 0);
                              const widthTableValue = item.selectedWidthTableValue ? parseFloat(item.selectedWidthTableValue) : parseFraction(item.width || 0);
                              
                              // Convert table values to feet
                              const heightInFeet = convertToFeet(heightTableValue, item.heightUnit || "FEET");
                              const widthInFeet = convertToFeet(widthTableValue, item.widthUnit || "FEET");
                              
                              // Calculate subtotal: area × rate × quantity
                              const areaInFeet = heightInFeet * widthInFeet;
                              // Use sellingPrice if available, otherwise fall back to ratePerSqft
                              const rate = parseFloat(item.sellingPrice || item.ratePerSqft) || 0;
                              const qty = parseInt(item.quantity) || 0;
                              return (areaInFeet * rate * qty).toFixed(2);
                            })()
                          }
                          style={{
                            width: "100%",
                            maxWidth: "100%",
                            padding: isMobile ? "14px 12px" : "12px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            fontSize: "16px", // Prevent iOS zoom
                            backgroundColor: "rgba(255,185,94,0.1)",
                            color: "#FFB95E",
                            fontWeight: "600",
                            cursor: "not-allowed",
                            boxSizing: "border-box",
                            minHeight: "44px", // Touch target
                          }}
                        />
                        <p style={{ marginTop: "5px", color: "#7180A6", fontSize: isMobile ? "11px" : "11px" }}>✨ Auto-calculated: (Table height × Table width in ft) × Rate per SqFt × Quantity</p>
                      </div>
                      
                      {/* Profit Field - Read Only */}
                      <div style={{
                        width: "100%",
                        boxSizing: "border-box",
                      }}>
                        <label style={{ 
                          display: "block", 
                          marginBottom: "8px", 
                          color: "#A9B3D1", 
                          fontWeight: "500", 
                          fontSize: isMobile ? "13px" : "14px" 
                        }}>
                          Profit (₹) 🔒
                        </label>
                        <input
                          type="number"
                          readOnly
                          value={
                            (() => {
                              // Calculate profit for this item
                              const purchasePrice = parseFloat(item.purchasePrice) || 0;
                              const sellingPrice = parseFloat(item.sellingPrice || item.ratePerSqft) || 0;
                              
                              // Use table values if available, otherwise fallback to input values
                              const heightTableValue = item.selectedHeightTableValue ? parseFloat(item.selectedHeightTableValue) : parseFraction(item.height || 0);
                              const widthTableValue = item.selectedWidthTableValue ? parseFloat(item.selectedWidthTableValue) : parseFraction(item.width || 0);
                              
                              // Convert table values to feet
                              const heightInFeet = convertToFeet(heightTableValue, item.heightUnit || "FEET");
                              const widthInFeet = convertToFeet(widthTableValue, item.widthUnit || "FEET");
                              
                              // Calculate area and profit
                              const areaInFeet = heightInFeet * widthInFeet;
                              const qty = parseInt(item.quantity) || 0;
                              const totalArea = areaInFeet * qty;
                              
                              // Profit = (Selling Price - Purchase Price) × Area
                              const profit = (sellingPrice - purchasePrice) * totalArea;
                              return profit.toFixed(2);
                            })()
                          }
                          style={{
                            width: "100%",
                            maxWidth: "100%",
                            padding: isMobile ? "14px 12px" : "12px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            fontSize: "16px", // Prevent iOS zoom
                            backgroundColor: "#d1fae5",
                            color: "#065f46",
                            fontWeight: "600",
                            cursor: "not-allowed",
                            boxSizing: "border-box",
                            minHeight: "44px", // Touch target
                          }}
                        />
                        <p style={{ marginTop: "5px", color: "#7180A6", fontSize: isMobile ? "11px" : "11px" }}>
                          ✨ Auto-calculated: (Selling Price - Purchase Price) × Area × Quantity
                        </p>
                      </div>
                      <div style={{
                        width: "100%",
                        boxSizing: "border-box",
                      }}>
                        <label style={{ 
                          display: "block", 
                          marginBottom: "8px", 
                          color: "#A9B3D1", 
                          fontWeight: "500", 
                          fontSize: isMobile ? "13px" : "14px" 
                        }}>
                          Running Ft (₹) 🔒
                        </label>
                        <input
                          type="number"
                          readOnly
                          value={
                            (() => {
                              if (!item.polishSelection || !item.selectedHeightTableValue || !item.selectedWidthTableValue) return "0.00";
                              
                              // Use table values instead of input height/width
                              const heightTableValue = parseFloat(item.selectedHeightTableValue) || 0;
                              const widthTableValue = parseFloat(item.selectedWidthTableValue) || 0;
                              
                              // Convert table values to feet
                              const heightInFeet = convertToFeet(heightTableValue, item.heightUnit || "FEET");
                              const widthInFeet = convertToFeet(widthTableValue, item.widthUnit || "FEET");
                              
                              // Group sides by polish type
                              const polishGroups = {
                                'P': { sides: [], rate: item.polishRates?.P || 15 },
                                'H': { sides: [], rate: item.polishRates?.H || 75 },
                                'B': { sides: [], rate: item.polishRates?.B || 75 }
                              };
                              
                              // Process each polish selection row and group by type
                              if (item.polishSelection && item.polishSelection.length >= 4) {
                                // Height 1 (index 0)
                                if (item.polishSelection[0].checked && item.polishSelection[0].type) {
                                  const type = item.polishSelection[0].type;
                                  if (polishGroups[type]) {
                                    polishGroups[type].sides.push(heightInFeet);
                                  }
                                }
                                
                                // Width 1 (index 1)
                                if (item.polishSelection[1].checked && item.polishSelection[1].type) {
                                  const type = item.polishSelection[1].type;
                                  if (polishGroups[type]) {
                                    polishGroups[type].sides.push(widthInFeet);
                                  }
                                }
                                
                                // Height 2 (index 2)
                                if (item.polishSelection[2].checked && item.polishSelection[2].type) {
                                  const type = item.polishSelection[2].type;
                                  if (polishGroups[type]) {
                                    polishGroups[type].sides.push(heightInFeet);
                                  }
                                }
                                
                                // Width 2 (index 3)
                                if (item.polishSelection[3].checked && item.polishSelection[3].type) {
                                  const type = item.polishSelection[3].type;
                                  if (polishGroups[type]) {
                                    polishGroups[type].sides.push(widthInFeet);
                                  }
                                }
                              }
                              
                              // Calculate for each polish type group
                              let totalRunningFt = 0;
                              Object.keys(polishGroups).forEach(type => {
                                const group = polishGroups[type];
                                if (group.sides.length > 0) {
                                  // Sum all sides in this group
                                  const totalLengthInFeet = group.sides.reduce((sum, side) => sum + side, 0);
                                  // Multiply by polish rate for this type
                                  totalRunningFt += totalLengthInFeet * group.rate;
                                }
                              });
                              
                              // Multiply by quantity (NO Rate per SqFt multiplication)
                              const quantity = parseInt(item.quantity) || 1;
                              return (totalRunningFt * quantity).toFixed(2);
                            })()
                          }
                          style={{
                            width: "100%",
                            maxWidth: "100%",
                            padding: isMobile ? "14px 12px" : "12px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            fontSize: "16px", // Prevent iOS zoom
                            backgroundColor: "rgba(79,93,255,0.1)",
                            color: "#0c4a6e",
                            fontWeight: "600",
                            cursor: "not-allowed",
                            boxSizing: "border-box",
                            minHeight: "44px", // Touch target
                          }}
                        />
                        <p style={{ marginTop: "5px", color: "#7180A6", fontSize: "11px" }}>✨ Auto-calculated: Group by polish type, sum sides, convert to ft, × polish rate, sum all, × Quantity</p>
                      </div>
                      </div>
                    </div>

                    {formData.billingType === "GST" && (
                      <div style={{ 
                        marginBottom: isMobile ? "12px" : "15px",
                        width: "100%",
                        boxSizing: "border-box",
                      }}>
                        <label style={{ 
                          display: "block", 
                          marginBottom: "8px", 
                          color: "#A9B3D1", 
                          fontWeight: "500", 
                          fontSize: isMobile ? "13px" : "14px" 
                        }}>
                          HSN Code (Optional)
                        </label>
                        <input
                          type="text"
                          value={item.hsnCode}
                          onChange={(e) => handleItemChange(index, "hsnCode", e.target.value)}
                          placeholder="e.g., 7003, 7004"
                          style={{
                            width: "100%",
                            maxWidth: "100%",
                            padding: isMobile ? "14px 12px" : "12px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            fontSize: "16px", // Prevent iOS zoom
                            transition: "all 0.2s",
                            boxSizing: "border-box",
                            minHeight: "44px", // Touch target
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "#4F5DFF")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                        />
                        <p style={{ marginTop: "5px", color: "#7180A6", fontSize: isMobile ? "11px" : "11px" }}>📋 HSN code for GST (optional)</p>
                      </div>
                    )}

                    <div style={{
                      width: "100%",
                      boxSizing: "border-box",
                    }}>
                      <label style={{ 
                        display: "block", 
                        marginBottom: "8px", 
                        color: "#A9B3D1", 
                        fontWeight: "500", 
                        fontSize: isMobile ? "13px" : "14px" 
                      }}>
                        Description (Optional)
                      </label>
                      <textarea
                        value={item.description}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        placeholder="Add any additional notes or specifications for this item..."
                        style={{
                          width: "100%",
                          maxWidth: "100%",
                          padding: isMobile ? "14px 12px" : "12px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255,255,255,0.1)",
                          fontSize: "16px", // Prevent iOS zoom
                          minHeight: isMobile ? "100px" : "80px",
                          resize: "vertical",
                          fontFamily: "inherit",
                          transition: "all 0.2s",
                          boxSizing: "border-box",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#4F5DFF")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                      />
                    </div>
                  </div>
                ))}
                
                {/* Add Item Button at Bottom */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "center", 
                  marginTop: "20px",
                  paddingTop: "20px",
                  borderTop: "1px solid rgba(255,255,255,0.07)"
                }}>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    style={{
                      padding: "12px 24px",
                      backgroundColor: "#818CF8",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "all 0.2s",
                      boxShadow: "0 4px 6px -1px rgba(99, 102, 241, 0.3)",
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = "#3D4DE8";
                      e.target.style.boxShadow = "0 6px 8px -1px rgba(99, 102, 241, 0.4)";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = "#4F5DFF";
                      e.target.style.boxShadow = "0 4px 6px -1px rgba(99, 102, 241, 0.3)";
                    }}
                  >
                    ➕ Add Item
                  </button>
                </div>
              </div>

              {/* ── Additional Charges (collapsible) — after all items ── */}
              <div style={{ marginBottom: "16px", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden" }}>
                {/* Toggle header */}
                <button
                  type="button"
                  onClick={() => setShowCharges(v => !v)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "11px 14px", background: "rgba(17,27,53,0.9)",
                    border: "none", cursor: "pointer", borderBottom: showCharges ? "1.5px solid rgba(255,255,255,0.08)" : "none",
                    fontFamily: "inherit", transition: "background 140ms ease",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#A9B3D1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    💰 Additional Charges
                    {(parseFloat(formData.installationCharge) > 0 || parseFloat(formData.transportCharge) > 0 || parseFloat(formData.discountValue) > 0 || formData.transportationRequired) && (
                      <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: "#818CF8", textTransform: "none", letterSpacing: 0 }}>
                        (applied)
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 11, color: "#7180A6", fontWeight: 500 }}>
                    {showCharges ? "▲ Collapse" : "▼ Expand"}
                  </span>
                </button>

                {showCharges && (
                  <div style={{ padding: "14px" }}>
                    {/* Transportation checkbox */}
                    <div style={{ marginBottom: "12px", padding: "10px 14px", backgroundColor: "rgba(79,93,255,0.08)", borderRadius: "8px", border: "1px solid rgba(79,93,255,0.3)" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", color: "#A9B3D1", fontWeight: "500", fontSize: "14px" }}>
                        <input
                          type="checkbox"
                          checked={formData.transportationRequired}
                          onChange={(e) => setFormData({ ...formData, transportationRequired: e.target.checked })}
                          style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                        <span>🚚 Customer Requires Transportation</span>
                      </label>
                    </div>

                    {/* Charges grid */}
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: isMobile ? "12px" : "14px", width: "100%" }}>
                      {/* Installation */}
                      <div>
                        <label style={{ display: "block", marginBottom: "5px", color: "#A9B3D1", fontWeight: "600", fontSize: "12.5px" }}>
                          Installation Charge (₹)
                        </label>
                        <input
                          type="number" min="0" step="0.01"
                          value={formData.installationCharge === 0 ? "" : formData.installationCharge}
                          onChange={(e) => setFormData({ ...formData, installationCharge: parseFloat(e.target.value) || 0 })}
                          onFocus={(e) => { e.target.style.borderColor = "#4F5DFF"; if (e.target.value === "0" || e.target.value === "") e.target.value = ""; }}
                          onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; if (e.target.value === "" || e.target.value === "0") setFormData({ ...formData, installationCharge: 0 }); }}
                          placeholder="0.00"
                          style={{ width: "100%", padding: isMobile ? "14px 12px" : "9px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", fontSize: "16px", transition: "all 0.2s", boxSizing: "border-box", minHeight: isMobile ? "44px" : "auto" }}
                        />
                      </div>

                      {/* Transport */}
                      <div>
                        <label style={{ display: "block", marginBottom: "5px", color: "#A9B3D1", fontWeight: "600", fontSize: "12.5px" }}>
                          Transport Charge (₹)
                        </label>
                        <input
                          type="number" min="0" step="0.01"
                          value={formData.transportCharge === 0 ? "" : formData.transportCharge}
                          onChange={(e) => setFormData({ ...formData, transportCharge: parseFloat(e.target.value) || 0 })}
                          onFocus={(e) => { e.target.style.borderColor = "#4F5DFF"; if (e.target.value === "0" || e.target.value === "") e.target.value = ""; }}
                          onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; if (e.target.value === "" || e.target.value === "0") setFormData({ ...formData, transportCharge: 0 }); }}
                          placeholder="0.00"
                          style={{ width: "100%", padding: isMobile ? "14px 12px" : "9px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", fontSize: "16px", transition: "all 0.2s", boxSizing: "border-box", minHeight: isMobile ? "44px" : "auto" }}
                        />
                      </div>

                      {/* Discount */}
                      <div>
                        <label style={{ display: "block", marginBottom: "5px", color: "#A9B3D1", fontWeight: "600", fontSize: "12.5px" }}>
                          Discount
                        </label>
                        <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                          <button type="button"
                            onClick={() => setFormData({ ...formData, discountType: "AMOUNT", discountValue: 0, discount: 0 })}
                            style={{ flex: 1, padding: "7px 10px", backgroundColor: formData.discountType === "AMOUNT" ? "#4F5DFF" : "rgba(255,255,255,0.08)", color: formData.discountType === "AMOUNT" ? "white" : "#374151", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "500", transition: "all 0.2s" }}
                          >Amount (₹)</button>
                          <button type="button"
                            onClick={() => setFormData({ ...formData, discountType: "PERCENTAGE", discountValue: 0, discount: 0 })}
                            style={{ flex: 1, padding: "7px 10px", backgroundColor: formData.discountType === "PERCENTAGE" ? "#4F5DFF" : "rgba(255,255,255,0.08)", color: formData.discountType === "PERCENTAGE" ? "white" : "#374151", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "500", transition: "all 0.2s" }}
                          >Percentage (%)</button>
                        </div>
                        <input
                          type="number" min="0" step="0.01"
                          max={formData.discountType === "PERCENTAGE" ? "100" : undefined}
                          value={formData.discountValue === 0 ? "" : formData.discountValue}
                          onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                          onFocus={(e) => { e.target.style.borderColor = "#4F5DFF"; if (e.target.value === "0" || e.target.value === "") e.target.value = ""; }}
                          onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; if (e.target.value === "" || e.target.value === "0") setFormData({ ...formData, discountValue: 0, discount: 0 }); }}
                          placeholder="0.00"
                          style={{ width: "100%", padding: isMobile ? "14px 12px" : "9px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", fontSize: "16px", transition: "all 0.2s", boxSizing: "border-box", minHeight: isMobile ? "44px" : "auto" }}
                        />
                        <p style={{ marginTop: "5px", color: "#7180A6", fontSize: "12px" }}>
                          🎁 {formData.discountType === "PERCENTAGE" ? "Discount percentage (0-100%)" : "Discount amount in ₹"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "10px", paddingTop: "14px", borderTop: "1.5px solid rgba(255,255,255,0.07)", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  style={{ padding: "9px 20px", backgroundColor: "#7180A6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "500", transition: "all 0.2s" }}
                  onMouseOver={(e) => (e.target.style.backgroundColor = "rgba(255,255,255,0.14)")}
                  onMouseOut={(e) => (e.target.style.backgroundColor = "rgba(255,255,255,0.08)")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "9px 20px", backgroundColor: "#22c55e", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s", boxShadow: "0 2px 6px rgba(34,197,94,0.3)" }}
                  onMouseOver={(e) => { e.target.style.backgroundColor = "#16a34a"; }}
                  onMouseOut={(e) => { e.target.style.backgroundColor = "#22c55e"; }}
                >
                  ✅ Create Quotation
                </button>
              </div>
                </form>
              </div>
              {/* ── Sticky financial summary — desktop only ── */}
              {!isMobile && (() => {
                const _sub  = formData.items.reduce((s, i) => s + (parseFloat(i.subtotal)  || 0), 0);
                const _rft  = formData.items.reduce((s, i) => s + (parseFloat(i.runningFt) || 0), 0);
                const _inst = parseFloat(formData.installationCharge) || 0;
                const _tr   = parseFloat(formData.transportCharge)    || 0;
                const _dv   = parseFloat(formData.discountValue)       || 0;
                const _disc = formData.discountType === "PERCENTAGE" ? (_sub + _inst + _tr) * _dv / 100 : _dv;
                const _gst  = formData.billingType === "GST" ? (_sub + _inst + _tr - _disc) * ((parseFloat(formData.gstPercentage) || 18) / 100) : 0;
                const _tot  = _sub + _inst + _tr - _disc + _gst;
                const SRow = ({ label, value, hi, color, last }) => (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: 12, color: hi ? "#ffffff" : "#A9B3D1", fontWeight: hi ? 700 : 500 }}>{label}</span>
                    <span style={{ fontSize: hi ? 14 : 13, fontWeight: hi ? 800 : 600, color: color || (hi ? "#4F5DFF" : "#ffffff"), letterSpacing: "-0.01em" }}>{value}</span>
                  </div>
                );
                return (
                  <div style={{ width: 210, flexShrink: 0, position: "sticky", top: 16, background: "rgba(22,36,69,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Live Summary</div>
                    <SRow label="Subtotal"                       value={`₹${_sub.toFixed(2)}`} />
                    {_rft  > 0 && <SRow label="Running Ft"       value={`₹${_rft.toFixed(2)}`} />}
                    {_inst > 0 && <SRow label="Installation"     value={`₹${_inst.toFixed(2)}`} />}
                    {_tr   > 0 && <SRow label="Transport"        value={`₹${_tr.toFixed(2)}`} />}
                    {_disc > 0 && <SRow label="Discount"         value={`−₹${_disc.toFixed(2)}`} color="#16a34a" />}
                    {_gst  > 0 && <SRow label={`GST ${formData.gstPercentage}%`} value={`₹${_gst.toFixed(2)}`} />}
                    <SRow label="Grand Total" value={`₹${_tot.toFixed(2)}`} hi last />
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: 11, color: "#7180A6", textAlign: "center" }}>
                      {formData.items.length} item{formData.items.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: "#7180A6", padding: "20px" }}>Loading...</div>
        ) : (
          <div
            style={{
              backgroundColor: "#111B35",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ overflowX: "auto", background: "#111B35" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isMobile ? "auto" : "720px", fontSize: "13px", background: "#111B35" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    {[
                      ["ID",         "60px"],
                      [isMobile ? "Quotation #" : "Quotation #", isMobile ? "auto" : "auto"],
                      ["Customer",   "auto"],
                      ...(!isMobile ? [
                        ["Billing",  "80px"],
                        ["Architect","130px"],
                        ["Status",   "100px"],
                        ["Amount",   "100px"],
                        ["Date",     "100px"],
                      ] : []),
                      ["Actions",   "116px"],
                    ].map(([label, w]) => (
                      <th key={label} style={{
                        padding: "10px 12px", textAlign: "left",
                        fontSize: "10.5px", fontWeight: 700, color: "#7180A6",
                        textTransform: "uppercase", letterSpacing: "0.08em",
                        whiteSpace: "nowrap", width: w,
                      }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                {quotations.map((quotation, idx) => (
                  <tr
                    key={quotation.id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      backgroundColor: "#111B35",
                      transition: "background 120ms ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0A0F1E")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#111B35")}
                  >
                    <td style={{ padding: isMobile ? "9px 8px" : "10px 12px", color: "#7180A6", fontSize: 12, whiteSpace: "nowrap", width: 60 }}>
                      #{quotation.id}
                    </td>
                    <td style={{ padding: isMobile ? "9px 8px" : "10px 12px", fontWeight: 700, color: "#E2E8F0", whiteSpace: "nowrap" }}>
                      {isMobile
                        ? `#${(quotation.quotationNumber || "").split("-").pop()}`
                        : quotation.quotationNumber}
                    </td>
                    <td style={{ padding: isMobile ? "9px 8px" : "10px 12px", fontWeight: 600, color: "#E2E8F0", maxWidth: isMobile ? "none" : 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{quotation.customerName}</td>
                    {!isMobile && (
                      <>
                        <td style={{ padding: "10px 12px", color: "#7180A6", fontSize: "12px" }}>{quotation.billingType}</td>
                        <td style={{ padding: "10px 12px" }}>
                          {quotation.referenceArchitect
                            ? <Badge status="INFO" dot label={`🏛️ ${quotation.referenceArchitect.name}`} />
                            : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                        </td>
                        <td style={{ padding: "10px 12px" }}>{getStatusBadge(quotation.status)}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#37E3A5", whiteSpace: "nowrap" }}>₹{(parseFloat(quotation.grandTotal) || 0).toFixed(2)}</td>
                        <td style={{ padding: "10px 12px", color: "#7180A6", fontSize: "12px", whiteSpace: "nowrap" }}>{quotation.quotationDate}</td>
                      </>
                    )}
                    {/* ── Action group ── */}
                    <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <QuotaActBtn variant="view"    title="View details"   onClick={() => handleView(quotation.id)}>👁</QuotaActBtn>
                        {(quotation.status === "DRAFT" || quotation.status === "SENT") && (<>
                          <QuotaActBtn variant="confirm" title="Confirm quotation" onClick={() => showConfirmDialog("CONFIRM", quotation)}>✓</QuotaActBtn>
                          <QuotaActBtn variant="reject"  title="Reject quotation"  onClick={() => showConfirmDialog("REJECT",  quotation)}>✕</QuotaActBtn>
                        </>)}
                        <QuotaActBtn variant="delete"  title="Delete quotation"  onClick={() => showConfirmDialog("DELETE",  quotation)}>🗑</QuotaActBtn>
                      </div>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
            

            {/* Empty State */}
            {quotations.length === 0 && (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px", opacity: 0.3 }}>📄</div>
                <p style={{ fontSize: "15px", fontWeight: "600", marginBottom: "6px", color: "#ffffff" }}>No quotations found</p>
                <p style={{ fontSize: "13px", color: "#7180A6" }}>Click 'Create New Quotation' to get started</p>
              </div>
            )}
          </div>
        )}

        {selectedQuotation && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(5,11,31,0.85)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10002,
              paddingTop: "80px",
              paddingBottom: "20px",
              paddingLeft: isMobile ? "15px" : "20px",
              paddingRight: isMobile ? "15px" : "20px",
            }}
            onClick={() => setSelectedQuotation(null)}
          >
            <div
              style={{
                backgroundColor: "rgba(17,27,53,0.98)",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: 0,
                borderRadius: "14px",
                maxWidth: "1100px",
                width: "100%",
                maxHeight: "calc(100vh - 100px)",
                overflow: "auto",
                boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
                position: "relative",
                zIndex: 10003,
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ═══ PREMIUM QUOTATION VIEWER ═══ */}

              {/* Sticky header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px 12px', borderBottom:'1px solid rgba(255,255,255,0.08)', position:'sticky', top:0, background:'rgba(17,27,53,0.98)', zIndex:10, flexWrap:'wrap', gap:8 }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'#7180A6', fontFamily:"'Inter',-apple-system,sans-serif", textTransform:'uppercase', letterSpacing:'0.06em' }}>Quotation</span>
                    <span style={{ fontSize:15, fontWeight:700, color:'#E2E8F0', fontFamily:"'Inter',-apple-system,sans-serif", letterSpacing:'-0.02em' }}>{selectedQuotation.quotationNumber}</span>
                    {getStatusBadge(selectedQuotation.status)}
                  </div>
                  <div style={{ fontSize:11.5, color:'#7180A6', marginTop:2, fontFamily:"'Inter',-apple-system,sans-serif" }}>
                    {selectedQuotation.quotationDate}{selectedQuotation.createdBy ? ` · ${selectedQuotation.createdBy}` : ''}
                  </div>
                </div>
                <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                  <DocDropdownBtn label="Print" icon="🖨️" iconOnly={isMobile} items={[
                    { icon:'📄', label:'Quotation PDF', onClick: async () => { try { const r = await downloadQuotationPdf(selectedQuotation.id); const url = window.URL.createObjectURL(new Blob([r.data],{type:'application/pdf'})); const w = window.open(url,'_blank'); if(w) w.onload=()=>w.print(); } catch { alert('Failed to print quotation PDF'); } } },
                    { icon:'✂️', label:'Cutting Pad',   onClick: async () => { try { const r = await printCuttingPad(selectedQuotation.id); const url = window.URL.createObjectURL(new Blob([r.data],{type:'application/pdf'})); const w = window.open(url,'_blank'); if(w) w.onload=()=>w.print(); } catch { alert('Failed to print cutting-pad PDF'); } } },
                  ]} />
                  <DocDropdownBtn label="Download" icon="⬇️" iconOnly={isMobile} items={[
                    { icon:'📥', label:'Quotation PDF', onClick: async () => { try { const r = await downloadQuotationPdf(selectedQuotation.id); const url = window.URL.createObjectURL(new Blob([r.data])); const a = document.createElement('a'); a.href=url; a.setAttribute('download',`quotation-${selectedQuotation.quotationNumber}.pdf`); document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url); } catch { alert('Failed to download quotation PDF'); } } },
                  ]} />
                  <button onClick={() => setSelectedQuotation(null)} style={{ width:32, height:32, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.08)', cursor:'pointer', fontSize:14, color:'#A9B3D1', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 140ms ease', flexShrink:0 }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.15)'; e.currentTarget.style.color='#E2E8F0'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.color='#A9B3D1'; }}>✕</button>
                </div>
              </div>

              {/* Meta strip */}
              <div style={{ display:'flex', flexWrap:'wrap', borderBottom:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)' }}>
                <MetaField label="Customer">
                  <div style={{ fontSize:13, fontWeight:600, color:'#E2E8F0', fontFamily:"'Inter',-apple-system,sans-serif" }}>{selectedQuotation.customerName}</div>
                  {selectedQuotation.customerMobile && <div style={{ fontSize:11.5, color:'#7180A6' }}>📱 {selectedQuotation.customerMobile}</div>}
                </MetaField>
                {selectedQuotation.referenceArchitect && (
                  <MetaField label="Ref. Architect">
                    <div style={{ fontSize:13, fontWeight:600, color:'#E2E8F0', fontFamily:"'Inter',-apple-system,sans-serif" }}>{selectedQuotation.referenceArchitect.name}</div>
                    {selectedQuotation.referenceArchitect.mobile && <div style={{ fontSize:11.5, color:'#7180A6' }}>📱 {selectedQuotation.referenceArchitect.mobile}</div>}
                  </MetaField>
                )}
                <MetaField label="Billing">
                  <span style={{ fontSize:13, fontWeight:600, color:'#E2E8F0', fontFamily:"'Inter',-apple-system,sans-serif" }}>{selectedQuotation.billingType}</span>
                </MetaField>
                {selectedQuotation.validUntil && <MetaField label="Valid Until"><span style={{ fontSize:13, fontWeight:500, color:'#A9B3D1', fontFamily:"'Inter',-apple-system,sans-serif" }}>{selectedQuotation.validUntil}</span></MetaField>}
                {selectedQuotation.customerState && <MetaField label="State"><span style={{ fontSize:13, fontWeight:500, color:'#A9B3D1', fontFamily:"'Inter',-apple-system,sans-serif" }}>{selectedQuotation.customerState}</span></MetaField>}
              </div>

              {/* Financial KPI strip */}
              {(() => {
                const rsum = getRunningFtSummaryFromQuotation(selectedQuotation);
                return (
                  <div style={{ display:'flex', flexWrap:'wrap', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                    <KpiCell label="Subtotal" value={selectedQuotation.subtotal} />
                    {(rsum?.total || 0) > 0 && <KpiCell label="Running Ft" value={rsum.total} />}
                    {parseFloat(selectedQuotation.installationCharge) > 0 && <KpiCell label="Installation" value={selectedQuotation.installationCharge} />}
                    {parseFloat(selectedQuotation.transportCharge)    > 0 && <KpiCell label="Transport"    value={selectedQuotation.transportCharge} />}
                    {parseFloat(selectedQuotation.discount)           > 0 && <KpiCell label="Discount"     value={selectedQuotation.discount} negative />}
                    {selectedQuotation.billingType === 'GST' && parseFloat(selectedQuotation.gstAmount) > 0 && (
                      <KpiCell label={`GST${selectedQuotation.gstPercentage ? ` (${selectedQuotation.gstPercentage}%)` : ''}`} value={selectedQuotation.gstAmount} />
                    )}
                    <KpiCell label="Grand Total" value={selectedQuotation.grandTotal} highlight />
                    {(() => {
                      if (getUserRole() !== 'ROLE_ADMIN') return null;
                      let cost = 0, sell = 0;
                      (selectedQuotation.items || []).forEach(item => {
                        const toFt = (v, u) => { const n = parseFloat(v) || 0; return u === 'FEET' ? n : u === 'INCH' ? n/12 : n/304.8; };
                        const area = toFt(item.height, item.heightUnit || 'FEET') * toFt(item.width, item.widthUnit || 'FEET') * (parseFloat(item.quantity) || 0);
                        cost += (parseFloat(item.purchasePrice) || 0) * area;
                        sell += (parseFloat(item.sellingPrice || item.ratePerSqft) || 0) * area;
                      });
                      const profit = sell - cost;
                      if (cost === 0 && sell === 0) return null;
                      return <KpiCell label="Profit (Admin)" value={profit} color={profit >= 0 ? '#16a34a' : '#dc2626'} />;
                    })()}
                  </div>
                );
              })()}

              {/* Items table */}
              <div style={{ padding:'0 0 16px', flex:1 }}>
                <div style={{ padding:'12px 20px 8px', fontSize:11, fontWeight:700, color:'#7180A6', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:"'Inter',-apple-system,sans-serif" }}>
                  Items ({selectedQuotation.items?.length || 0})
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'580px', fontSize:13, fontFamily:"'Inter',-apple-system,sans-serif" }}>
                    <thead>
                      <tr style={{ background:'rgba(255,255,255,0.04)', borderBottom:'1.5px solid rgba(255,255,255,0.1)' }}>
                        {['#','Glass Type','Thickness','Size','Design','Qty','Rate/SqFt','Amount','Running Ft'].map((h,i) => (
                          <th key={h} style={{ padding:'8px 12px', textAlign: i===0||i===5||i===6||i===7||i===8 ? 'right':'left', fontSize:'10.5px', fontWeight:700, color:'#7180A6', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedQuotation.items?.map((item, idx) => {
                        const running = getRunningFtForItem(item);
                        return (
                          <tr key={idx} style={{ borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(17,27,53,0.5)', transition:'background 120ms ease' }}
                            onMouseEnter={e=>e.currentTarget.style.background='#0A0F1E'}
                            onMouseLeave={e=>e.currentTarget.style.background='rgba(17,27,53,0.5)'}>
                            <td style={{ padding:'8px 12px', textAlign:'right', color:'#7180A6', fontWeight:600, width:32 }}>{idx+1}</td>
                            <td style={{ padding:'8px 12px', fontWeight:600, color:'#E2E8F0' }}>{item.glassType||'N/A'}</td>
                            <td style={{ padding:'8px 12px', color:'#A9B3D1' }}>{item.thickness||'—'}</td>
                            <td style={{ padding:'8px 12px', color:'#A9B3D1', whiteSpace:'nowrap' }}>{(v=>isNaN(parseFloat(v))?v:String(parseFloat(v)))(item.height)} {item.heightUnit||'FEET'} × {(v=>isNaN(parseFloat(v))?v:String(parseFloat(v)))(item.width)} {item.widthUnit||'FEET'}</td>
                            <td style={{ padding:'8px 12px', color:'#7180A6' }}>{item.design ? (item.design==='POLISH'?'Polish':item.design==='BEVELING'?'Beveling':item.design==='HALF_ROUND'?'Half Round':item.design):'—'}</td>
                            <td style={{ padding:'8px 12px', color:'#A9B3D1', textAlign:'right' }}>{item.quantity}</td>
                            <td style={{ padding:'8px 12px', color:'#A9B3D1', textAlign:'right', whiteSpace:'nowrap' }}>₹{(parseFloat(item.sellingPrice||item.ratePerSqft)||0).toFixed(2)}</td>
                            <td style={{ padding:'8px 12px', fontWeight:700, color:'#37E3A5', textAlign:'right', whiteSpace:'nowrap' }}>₹{(parseFloat(item.subtotal)||0).toFixed(2)}</td>
                            <td style={{ padding:'8px 12px', fontWeight:600, color:'#818CF8', textAlign:'right', whiteSpace:'nowrap' }}>{running>0?`₹${running.toFixed(2)}`:'—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── legacy cards hidden – premium viewer above is the active UI ── */}
              <div style={{ display:'none' }}>
              {/* Quotation Header Info */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "20px", marginBottom: "25px" }}>
                <div style={{ padding: "15px", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: "12px", color: "#7180A6", marginBottom: "5px", fontWeight: "500" }}>Quotation Number</div>
                  <div style={{ fontSize: "18px", color: "#ffffff", fontWeight: "700" }}>{selectedQuotation.quotationNumber}</div>
                </div>
                <div style={{ padding: "15px", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: "12px", color: "#7180A6", marginBottom: "5px", fontWeight: "500" }}>Status</div>
                  <div>{getStatusBadge(selectedQuotation.status)}</div>
                </div>
                <div style={{ padding: "15px", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: "12px", color: "#7180A6", marginBottom: "5px", fontWeight: "500" }}>Customer</div>
                  <div style={{ fontSize: "16px", color: "#ffffff", fontWeight: "600" }}>{selectedQuotation.customerName}</div>
                  {selectedQuotation.customerMobile && (
                    <div style={{ fontSize: "13px", color: "#7180A6", marginTop: "4px" }}>📱 {selectedQuotation.customerMobile}</div>
                  )}
                </div>
                {selectedQuotation.referenceArchitect && (
                  <div style={{ padding: "15px", backgroundColor: "rgba(55,227,165,0.08)", borderRadius: "10px", border: "1px solid rgba(55,227,165,0.25)" }}>
                    <div style={{ fontSize: "12px", color: "#37E3A5", marginBottom: "5px", fontWeight: "500" }}>🏛️ Reference By</div>
                    <div style={{ fontSize: "16px", color: "#0f172a", fontWeight: "600" }}>{selectedQuotation.referenceArchitect.name}</div>
                    {selectedQuotation.referenceArchitect.mobile && <div style={{ fontSize: "13px", color: "#7180A6", marginTop: "4px" }}>📱 {selectedQuotation.referenceArchitect.mobile}</div>}
                    {selectedQuotation.referenceArchitect.email  && <div style={{ fontSize: "13px", color: "#7180A6", marginTop: "2px" }}>📧 {selectedQuotation.referenceArchitect.email}</div>}
                  </div>
                )}
                <div style={{ padding: "15px", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: "12px", color: "#7180A6", marginBottom: "5px", fontWeight: "500" }}>Billing Type</div>
                  <div style={{ fontSize: "16px", color: "#ffffff", fontWeight: "600" }}>{selectedQuotation.billingType}</div>
                </div>
              </div>

              {/* Financial Summary */}
              <div style={{ marginBottom: "25px", padding: "20px", backgroundColor: "rgba(255,185,94,0.1)", borderRadius: "12px", border: "2px solid rgba(255,185,94,0.4)" }}>
                <h3 style={{ margin: "0 0 15px 0", color: "#FFB95E", fontSize: "18px", fontWeight: "600" }}>💰 Financial Summary</h3>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "15px" }}>
                  <div>
                    <div style={{ fontSize: "13px", color: "#FFB95E", marginBottom: "5px" }}>Subtotal</div>
                    <div style={{ fontSize: "20px", color: "#78350f", fontWeight: "700" }}>₹{(parseFloat(selectedQuotation.subtotal) || 0).toFixed(2)}</div>
                  </div>
                  {(() => {
                    const runningSummary = getRunningFtSummaryFromQuotation(selectedQuotation);
                    if (!runningSummary || runningSummary.total <= 0) return null;
                    return (
                      <div>
                        <div style={{ fontSize: "13px", color: "#FFB95E", marginBottom: "5px" }}>Running Ft</div>
                        <div style={{ fontSize: "20px", color: "#78350f", fontWeight: "700" }}>₹{runningSummary.total.toFixed(2)}</div>
                        {(runningSummary.polish > 0 ||
                          runningSummary.halfRound > 0 ||
                          runningSummary.beveling > 0) && (
                          <div style={{ marginTop: "6px", fontSize: "12px", color: "#FFB95E" }}>
                            {runningSummary.polish > 0 && (
                              <div>Polish: ₹{runningSummary.polish.toFixed(2)}</div>
                            )}
                            {runningSummary.halfRound > 0 && (
                              <div>Half Round: ₹{runningSummary.halfRound.toFixed(2)}</div>
                            )}
                            {runningSummary.beveling > 0 && (
                              <div>Beveling: ₹{runningSummary.beveling.toFixed(2)}</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {selectedQuotation.installationCharge > 0 && (
                    <div>
                      <div style={{ fontSize: "13px", color: "#FFB95E", marginBottom: "5px" }}>Installation Charge</div>
                      <div style={{ fontSize: "16px", color: "#78350f", fontWeight: "600" }}>₹{(parseFloat(selectedQuotation.installationCharge) || 0).toFixed(2)}</div>
                    </div>
                  )}
                  {selectedQuotation.transportCharge > 0 && (
                    <div>
                      <div style={{ fontSize: "13px", color: "#FFB95E", marginBottom: "5px" }}>
                        Transport Charge {selectedQuotation.transportationRequired && "🚚"}
                      </div>
                      <div style={{ fontSize: "16px", color: "#78350f", fontWeight: "600" }}>₹{(parseFloat(selectedQuotation.transportCharge) || 0).toFixed(2)}</div>
                    </div>
                  )}
                  {selectedQuotation.discount > 0 && (
                    <div>
                      <div style={{ fontSize: "13px", color: "#FFB95E", marginBottom: "5px" }}>
                        Discount {selectedQuotation.discountType === "PERCENTAGE" && selectedQuotation.discountValue 
                          ? `(${selectedQuotation.discountValue}%)` 
                          : ""}
                      </div>
                      <div style={{ fontSize: "16px", color: "#78350f", fontWeight: "600" }}>₹{(parseFloat(selectedQuotation.discount) || 0).toFixed(2)}</div>
                    </div>
                  )}
                  {selectedQuotation.billingType === "GST" && selectedQuotation.gstAmount > 0 && (
                    <>
                      <div>
                        <div style={{ fontSize: "13px", color: "#FFB95E", marginBottom: "5px" }}>GST ({selectedQuotation.gstPercentage}%)</div>
                        <div style={{ fontSize: "16px", color: "#78350f", fontWeight: "600" }}>₹{(parseFloat(selectedQuotation.gstAmount) || 0).toFixed(2)}</div>
                      </div>
                      {selectedQuotation.cgst > 0 && (
                        <div>
                          <div style={{ fontSize: "13px", color: "#FFB95E", marginBottom: "5px" }}>CGST / SGST</div>
                          <div style={{ fontSize: "14px", color: "#78350f" }}>
                            ₹{(parseFloat(selectedQuotation.cgst) || 0).toFixed(2)} / ₹{(parseFloat(selectedQuotation.sgst) || 0).toFixed(2)}
                          </div>
                        </div>
                      )}
                      {selectedQuotation.igst > 0 && (
                        <div>
                          <div style={{ fontSize: "13px", color: "#FFB95E", marginBottom: "5px" }}>IGST</div>
                          <div style={{ fontSize: "16px", color: "#78350f", fontWeight: "600" }}>₹{(parseFloat(selectedQuotation.igst) || 0).toFixed(2)}</div>
                        </div>
                      )}
                    </>
                  )}
                  {(() => {
                    // Calculate profit for admin only
                    const userRole = getUserRole();
                    if (userRole !== "ROLE_ADMIN") return null;
                    
                    let totalPurchaseCost = 0;
                    let totalSellingPrice = 0;
                    
                    selectedQuotation.items?.forEach((item) => {
                      const purchasePrice = parseFloat(item.purchasePrice) || 0;
                      const sellingPrice = parseFloat(item.sellingPrice || item.ratePerSqft) || 0;
                      const height = parseFloat(item.height) || 0;
                      const width = parseFloat(item.width) || 0;
                      const quantity = parseFloat(item.quantity) || 0;
                      
                      // Convert dimensions to feet based on unit
                      const convertToFeet = (value, unit) => {
                        if (!value || value === 0) return 0;
                        const numValue = parseFloat(value) || 0;
                        if (unit === 'FEET') return numValue;
                        if (unit === 'INCH') return numValue / 12;
                        if (unit === 'MM') return numValue / 304.8;
                        return numValue; // Default assume feet
                      };
                      
                      const heightUnit = item.heightUnit || 'FEET';
                      const widthUnit = item.widthUnit || 'FEET';
                      const heightInFeet = convertToFeet(height, heightUnit);
                      const widthInFeet = convertToFeet(width, widthUnit);
                      
                      // Calculate area in square feet
                      const areaInSqFt = heightInFeet * widthInFeet;
                      const itemArea = areaInSqFt * quantity;
                      
                      // Purchase cost = purchase price per SqFt * area
                      totalPurchaseCost += purchasePrice * itemArea;
                      
                      // Selling price = selling price per SqFt * area
                      totalSellingPrice += sellingPrice * itemArea;
                    });
                    
                    const profit = totalSellingPrice - totalPurchaseCost;
                    const profitMargin = totalSellingPrice > 0 ? (profit / totalSellingPrice) * 100 : 0;
                    
                    if (totalPurchaseCost === 0 && totalSellingPrice === 0) return null;
                    
                    return (
                      <div style={{ 
                        gridColumn: isMobile ? "1" : "1 / -1", 
                        marginTop: "15px", 
                        paddingTop: "15px", 
                        borderTop: "2px solid #fbbf24" 
                      }}>
                        <div style={{ fontSize: "13px", color: "#FFB95E", marginBottom: "5px", fontWeight: "600" }}>
                          💰 Profit (Admin Only)
                        </div>
                        <div style={{ 
                          fontSize: "20px", 
                          color: profit >= 0 ? "#059669" : "#dc2626", 
                          fontWeight: "700" 
                        }}>
                          ₹{profit.toFixed(2)}
                        </div>
                        <div style={{ 
                          marginTop: "6px", 
                          fontSize: "12px", 
                          color: "#FFB95E" 
                        }}>
                          Purchase Cost: ₹{totalPurchaseCost.toFixed(2)} | 
                          Selling Price: ₹{totalSellingPrice.toFixed(2)} | 
                          Margin: {profitMargin.toFixed(2)}%
                        </div>
                      </div>
                    );
                  })()}
                  <div style={{ gridColumn: isMobile ? "1" : "1 / -1", paddingTop: "15px", borderTop: "2px solid #fbbf24" }}>
                    <div style={{ fontSize: "14px", color: "#FFB95E", marginBottom: "8px", fontWeight: "500" }}>Grand Total</div>
                    <div style={{ fontSize: "28px", color: "#78350f", fontWeight: "800" }}>₹{(parseFloat(selectedQuotation.grandTotal) || 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ marginBottom: "25px" }}>
                <h3 style={{ margin: "0 0 15px 0", color: "#A9B3D1", fontSize: "18px", fontWeight: "600" }}>📦 Quotation Items</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "rgba(17,27,53,0.7)" }}>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#A9B3D1" }}>#</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#A9B3D1" }}>Glass Type</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#A9B3D1" }}>Thickness</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#A9B3D1" }}>Size</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#A9B3D1" }}>Design</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#A9B3D1" }}>Qty</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#A9B3D1" }}>Selling Price</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#A9B3D1" }}>Subtotal</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#A9B3D1" }}>Running Ft</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedQuotation.items?.map((item, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderTop: "1px solid rgba(255,255,255,0.07)",
                            backgroundColor: idx % 2 === 0 ? "rgba(17,27,53,0.5)" : "rgba(17,27,53,0.8)",
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "rgba(17,27,53,0.5)" : "rgba(17,27,53,0.8)")}
                        >
                          <td style={{ padding: "12px", fontWeight: "600", color: "#818CF8" }}>{idx + 1}</td>
                          <td style={{ padding: "12px", fontWeight: "500" }}>{item.glassType || "N/A"}</td>
                          <td style={{ padding: "12px" }}>{item.thickness || "N/A"}</td>
                          <td style={{ padding: "12px" }}>
                            {item.height} {item.heightUnit || "FEET"} × {item.width} {item.widthUnit || "FEET"}
                          </td>
                          <td style={{ padding: "12px", color: "#7180A6" }}>
                            {item.design
                              ? item.design === "POLISH"
                                ? "Polish"
                                : item.design === "BEVELING"
                                ? "Beveling"
                                : item.design === "HALF_ROUND"
                                ? "Half Round"
                                : item.design
                              : "-"}
                          </td>
                          <td style={{ padding: "12px" }}>{item.quantity}</td>
                          <td style={{ padding: "12px" }}>₹{(parseFloat(item.sellingPrice || item.ratePerSqft) || 0).toFixed(2)}</td>
                          <td style={{ padding: "12px", fontWeight: "600", color: "#ffffff" }}>₹{(parseFloat(item.subtotal) || 0).toFixed(2)}</td>
                          <td style={{ padding: "12px", fontWeight: "600", color: "#818CF8" }}>
                            {(() => {
                              const running = getRunningFtForItem(item);
                              return running > 0 ? `₹${running.toFixed(2)}` : "-";
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>{/* end legacy-cards display:none */}
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmAction && (
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
              zIndex: 10004,
              padding: isMobile ? "15px" : "20px",
            }}
            onClick={() => setConfirmAction(null)}
          >
            <div
              style={{
                backgroundColor: "rgba(17,27,53,0.98)",
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
                <div style={{ fontSize: "48px", marginBottom: "15px" }}>
                  {confirmAction.type === "CONFIRM" ? "⚠️" : confirmAction.type === "REJECT" ? "⚠️" : "🗑️"}
                </div>
                <h2
                  style={{
                    margin: 0,
                    color: "#E2E8F0",
                    fontSize: isMobile ? "20px" : "24px",
                    fontWeight: "700",
                    marginBottom: "10px",
                  }}
                >
                  {confirmAction.type === "CONFIRM"
                    ? "Confirm Quotation?"
                    : confirmAction.type === "REJECT"
                    ? "Reject Quotation?"
                    : "Delete Quotation?"}
                </h2>
                <p style={{ margin: "8px 0 0 0", color: "#A9B3D1", fontSize: "14px", lineHeight: "1.6" }}>
                  {confirmAction.type === "CONFIRM"
                    ? `Are you sure you want to confirm quotation "${confirmAction.quotationNumber}"? This action will lock the quotation and enable invoice conversion.`
                    : confirmAction.type === "REJECT"
                    ? `Are you sure you want to reject quotation "${confirmAction.quotationNumber}"? You will be asked to provide a rejection reason.`
                    : `Are you sure you want to permanently delete quotation "${confirmAction.quotationNumber}"? This action cannot be undone.`}
                </p>
                <div
                  style={{
                    marginTop: "15px",
                    padding: "12px",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderRadius: "8px",
                    textAlign: "left",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#7180A6", marginBottom: "4px" }}>Quotation Details:</div>
                  <div style={{ fontSize: "14px", color: "#E2E8F0", fontWeight: "600" }}>
                    #{confirmAction.quotationNumber}
                  </div>
                  <div style={{ fontSize: "13px", color: "#A9B3D1", marginTop: "4px" }}>
                    Customer: {confirmAction.customerName}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "12px" }}>
                <button
                  onClick={() => {
                    if (confirmAction.type === "DELETE") {
                      handleDelete(confirmAction.quotationId);
                    } else {
                      handleConfirm(
                        confirmAction.quotationId,
                        confirmAction.type === "CONFIRM" ? "CONFIRMED" : "REJECTED"
                      );
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    backgroundColor:
                      confirmAction.type === "CONFIRM"
                        ? "#22c55e"
                        : confirmAction.type === "REJECT"
                        ? "#f59e0b"
                        : "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
                  }}
                  onMouseOver={(e) => {
                    if (confirmAction.type === "CONFIRM") {
                      e.target.style.backgroundColor = "#16a34a";
                    } else if (confirmAction.type === "REJECT") {
                      e.target.style.backgroundColor = "#d97706";
                    } else {
                      e.target.style.backgroundColor = "#dc2626";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (confirmAction.type === "CONFIRM") {
                      e.target.style.backgroundColor = "#22c55e";
                    } else if (confirmAction.type === "REJECT") {
                      e.target.style.backgroundColor = "#FFB95E";
                    } else {
                      e.target.style.backgroundColor = "#ef4444";
                    }
                  }}
                >
                  {confirmAction.type === "CONFIRM"
                    ? "✅ Yes, Confirm"
                    : confirmAction.type === "REJECT"
                    ? "⚠️ Yes, Reject"
                    : "🗑️ Yes, Delete"}
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    backgroundColor: "#7180A6",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => (e.target.style.backgroundColor = "rgba(255,255,255,0.14)")}
                  onMouseOut={(e) => (e.target.style.backgroundColor = "rgba(255,255,255,0.08)")}
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REJECTION REASON MODAL */}
        {showRejectionModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100000,
              animation: "fadeIn 0.2s ease-in-out",
            }}
            onClick={() => {
              setShowRejectionModal(false);
              setRejectionReason("");
              setPendingRejection(null);
            }}
          >
            <div
              style={{
                background: "rgba(17,27,53,0.98)",
                borderRadius: "16px",
                padding: "32px",
                maxWidth: "500px",
                width: "90%",
                boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.1)",
                animation: "slideUp 0.3s ease-out",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    fontWeight: "bold",
                    marginRight: "16px",
                    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                  }}
                >
                  ⚠️
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#E2E8F0",
                      margin: 0,
                      marginBottom: "4px",
                    }}
                  >
                    Enter Rejection Reason
                  </h3>
                  <p style={{ fontSize: "13px", color: "#7180A6", margin: 0 }}>
                    Please provide a reason for rejecting this quotation
                  </p>
                </div>
              </div>

              <textarea
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "120px",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#E2E8F0",
                  outline: "none",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  resize: "vertical",
                  transition: "all 0.2s ease",
                  marginBottom: "24px",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(79,93,255,0.6)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(79,93,255,0.15)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.1)";
                  e.target.style.boxShadow = "none";
                }}
                autoFocus
              />

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setRejectionReason("");
                    setPendingRejection(null);
                  }}
                  style={{
                    padding: "12px 24px",
                    background: "#ef4444",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    color: "white",
                    fontWeight: "600",
                    fontSize: "14px",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 4px rgba(239, 68, 68, 0.2)",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "scale(1.02)";
                    e.target.style.boxShadow = "0 4px 8px rgba(239, 68, 68, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "scale(1)";
                    e.target.style.boxShadow = "0 2px 4px rgba(239, 68, 68, 0.2)";
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectionSubmit}
                  disabled={!rejectionReason.trim()}
                  style={{
                    padding: "12px 24px",
                    background: rejectionReason.trim()
                      ? "linear-gradient(135deg, #f59e0b, #d97706)"
                      : "rgba(255,255,255,0.1)",
                    border: "none",
                    borderRadius: "8px",
                    cursor: rejectionReason.trim() ? "pointer" : "not-allowed",
                    color: "white",
                    fontWeight: "600",
                    fontSize: "14px",
                    transition: "all 0.2s ease",
                    boxShadow: rejectionReason.trim()
                      ? "0 2px 4px rgba(245, 158, 11, 0.2)"
                      : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (rejectionReason.trim()) {
                      e.target.style.transform = "scale(1.02)";
                      e.target.style.boxShadow = "0 4px 8px rgba(245, 158, 11, 0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (rejectionReason.trim()) {
                      e.target.style.transform = "scale(1)";
                      e.target.style.boxShadow = "0 2px 4px rgba(245, 158, 11, 0.2)";
                    }
                  }}
                >
                  Submit Rejection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Next Button to Invoice Page */}
        <div style={{ 
          display: "flex", 
          justifyContent: "flex-end", 
          marginTop: "30px",
          paddingTop: "20px",
          borderTop: "2px solid rgba(255, 255, 255, 0.2)"
        }}>
          <button
            onClick={() => navigate("/invoices")}
            style={{
              padding: "12px 32px",
              backgroundColor: "#4F5DFF",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              transition: "all 0.2s",
              boxShadow: "0 4px 6px -1px rgba(99, 102, 241, 0.3)",
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#3D4DE8";
              e.target.style.boxShadow = "0 6px 8px -1px rgba(99, 102, 241, 0.4)";
              e.target.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "#4F5DFF";
              e.target.style.boxShadow = "0 4px 6px -1px rgba(99, 102, 241, 0.3)";
              e.target.style.transform = "translateY(0)";
            }}
          >
            Next: Invoices
            <span style={{ fontSize: "18px" }}>→</span>
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}

export default QuotationManagement;





