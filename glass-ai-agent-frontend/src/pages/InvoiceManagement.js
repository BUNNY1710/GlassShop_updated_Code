import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PageWrapper from "../components/PageWrapper";
import dashboardBg from "../assets/dashboard-bg.jpg";
import {
  getQuotations,
  getInvoices,
  createInvoiceFromQuotation,
  addPayment,
  getInvoiceById,
  getQuotationById,
  downloadTransportChallan,
  printDeliveryChallan,
  downloadInvoice,
  downloadBasicInvoice,
  printInvoice,
  printBasicInvoice,
  getQuotationsByStatus,
} from "../api/quotationApi";
import api from "../api/api";
import "../styles/design-system.css";

/* ─── Viewport-safe dropdown button — renders via Portal to avoid overflow clipping ── */
function InvDropdownBtn({ label, icon, items, iconOnly = false }) {
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
    let left = r.right - estW;
    left = Math.max(8, Math.min(left, vw - estW - 8));
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
            borderRadius: 8, border: '1px solid #e2e8f0',
            background: open ? '#f1f5f9' : '#fff',
            color: '#374151', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: "'Inter',-apple-system,sans-serif",
            transition: 'all 140ms ease', whiteSpace: 'nowrap', justifyContent: 'center',
          }}
          onMouseEnter={e => { if (!open) e.currentTarget.style.background = '#f8fafc'; }}
          onMouseLeave={e => { if (!open) e.currentTarget.style.background = '#fff'; }}
        >
          {icon && <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>}
          {!iconOnly && <span>{label}</span>}
          {!iconOnly && <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 1 }}>▾</span>}
        </button>
      </div>
      {open && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left,
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(15,23,42,.12)',
            minWidth: 180, maxWidth: '90vw',
            zIndex: 99999, overflow: 'hidden',
          }}
        >
          {items.map((item, i) => (
            <button key={i} onClick={() => { item.onClick(); setOpen(false); }}
              style={{
                width: '100%', padding: '9px 14px',
                background: 'transparent', border: 'none', textAlign: 'left',
                cursor: 'pointer', fontSize: 13, color: '#374151',
                fontFamily: "'Inter',-apple-system,sans-serif", fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: i < items.length - 1 ? '1px solid #f8fafc' : 'none',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
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

/* ─── Compact meta field cell ────────────────────────────────────────────────── */
function InvMetaField({ label, children }) {
  if (!children) return null;
  return (
    <div style={{ padding: '10px 16px', borderRight: '1px solid #f1f5f9', minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3, fontFamily: "'Inter',-apple-system,sans-serif", whiteSpace: 'nowrap' }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

/* ─── KPI amount cell ─────────────────────────────────────────────────────────── */
function InvKpiCell({ label, value, highlight, color }) {
  const v = parseFloat(value) || 0;
  return (
    <div style={{ padding: '12px 18px', borderRight: '1px solid #f1f5f9', minWidth: 0, background: highlight ? '#f5f3ff' : 'transparent' }}>
      <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, whiteSpace: 'nowrap', fontFamily: "'Inter',-apple-system,sans-serif" }}>{label}</div>
      <div style={{ fontSize: highlight ? 18 : 14, fontWeight: highlight ? 800 : 600, color: color || (highlight ? '#4f46e5' : '#1e293b'), letterSpacing: '-0.02em', fontFamily: "'Inter',-apple-system,sans-serif", whiteSpace: 'nowrap' }}>
        ₹{v.toFixed(2)}
      </div>
    </div>
  );
}

function InvoiceManagement() {
  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedQuotationDetails, setSelectedQuotationDetails] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [convertForm, setConvertForm] = useState({
    invoiceType: "FINAL",
    invoiceDate: new Date().toISOString().split("T")[0],
  });

  const [paymentForm, setPaymentForm] = useState({
    paymentType: "MANUAL", // FULL, HALF, MANUAL
    paymentMode: "CASH",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    referenceNumber: "",
    bankName: "",
    chequeNumber: "",
    transactionId: "",
    notes: "",
  });
  const [currentInvoiceForPayment, setCurrentInvoiceForPayment] = useState(null);

  useEffect(() => {
    loadInvoices();
    loadConfirmedQuotations();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await getInvoices();
      setInvoices(response.data);
    } catch (error) {
      setMessage("❌ Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const loadConfirmedQuotations = async () => {
    try {
      // Try using the status endpoint first for better filtering
      try {
        const statusResponse = await getQuotationsByStatus("CONFIRMED");
        console.log("Confirmed quotations from status endpoint:", statusResponse.data?.length || 0);
        setQuotations(statusResponse.data || []);
        if (!statusResponse.data || statusResponse.data.length === 0) {
          setMessage("ℹ️ No confirmed quotations available. Please confirm a quotation first.");
        } else {
          setMessage(""); // Clear message if quotations found
        }
        return;
      } catch (statusError) {
        console.log("Status endpoint failed, falling back to filter:", statusError);
      }
      
      // Fallback: Get all and filter
      const response = await getQuotations();
      console.log("All quotations received:", response.data?.map(q => ({ 
        id: q.id, 
        number: q.quotationNumber, 
        status: q.status 
      })) || []);
      
      // Filter for confirmed quotations - handle case variations
      const confirmed = (response.data || []).filter((q) => {
        const status = String(q.status || '').toUpperCase().trim();
        const isConfirmed = status === 'CONFIRMED';
        console.log(`Quotation ${q.id} (${q.quotationNumber}): status="${q.status}" -> normalized="${status}" -> isConfirmed=${isConfirmed}`);
        return isConfirmed;
      });
      
      console.log("Filtered confirmed quotations:", confirmed.map(q => ({ 
        id: q.id, 
        number: q.quotationNumber, 
        status: q.status 
      })));
      
      setQuotations(confirmed);
      if (confirmed.length === 0) {
        setMessage("ℹ️ No confirmed quotations available. Please confirm a quotation first.");
      } else {
        setMessage(""); // Clear message if quotations found
      }
    } catch (error) {
      console.error("Failed to load quotations", error);
      setMessage("❌ Failed to load quotations");
    }
  };

  const handleConvertToInvoice = async () => {
    if (!selectedQuotation) {
      setMessage("❌ Please select a quotation");
      return;
    }

    try {
      const response = await createInvoiceFromQuotation({
        quotationId: selectedQuotation.id,
        invoiceType: convertForm.invoiceType,
        invoiceDate: convertForm.invoiceDate,
      });
      setMessage("✅ Invoice created successfully");
      setShowConvertModal(false);
      setSelectedQuotation(null);
      setConvertForm({
        invoiceType: "FINAL",
        invoiceDate: new Date().toISOString().split("T")[0],
      });
      loadInvoices();
      loadConfirmedQuotations();
    } catch (error) {
      console.error("Invoice creation error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to create invoice";
      setMessage(`❌ ${errorMessage}`);
    }
  };

  const handleAddPayment = async () => {
    if (!currentInvoiceId) return;

    try {
      await addPayment(currentInvoiceId, {
        ...paymentForm,
        amount: parseFloat(paymentForm.amount),
        paymentDate: new Date(paymentForm.paymentDate).toISOString(),
      });
      setMessage("✅ Payment added successfully");
      setShowPaymentModal(false);
      setCurrentInvoiceId(null);
      resetPaymentForm();
      loadInvoices();
    } catch (error) {
      setMessage("❌ Failed to add payment");
    }
  };

  const handleViewInvoice = async (id) => {
    try {
      const response = await getInvoiceById(id);
      setSelectedInvoice(response.data);
      // Load quotation details if available
      if (response.data.quotationId) {
        try {
          const quotationResponse = await getQuotationById(response.data.quotationId);
          setSelectedQuotationDetails(quotationResponse.data);
        } catch (err) {
          console.error("Failed to load quotation details", err);
        }
      }
    } catch (error) {
      setMessage("❌ Failed to load invoice details");
    }
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      paymentType: "MANUAL",
      paymentMode: "CASH",
      amount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      referenceNumber: "",
      bankName: "",
      chequeNumber: "",
      transactionId: "",
      notes: "",
    });
    setCurrentInvoiceForPayment(null);
  };

  const handlePaymentTypeChange = (paymentType) => {
    if (!currentInvoiceForPayment) return;
    
    let amount = "";
    if (paymentType === "FULL") {
      amount = currentInvoiceForPayment.dueAmount || currentInvoiceForPayment.grandTotal || 0;
    } else if (paymentType === "HALF") {
      amount = (currentInvoiceForPayment.dueAmount || currentInvoiceForPayment.grandTotal || 0) / 2;
    }
    
    setPaymentForm({
      ...paymentForm,
      paymentType,
      amount: amount.toString(),
    });
  };

  const getPaymentStatusBadge = (status) => {
    const map = {
      PAID:    { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', dot: '#22c55e' },
      PARTIAL: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', dot: '#f59e0b' },
      DUE:     { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', dot: '#ef4444' },
    };
    const s = map[status] || { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', dot: '#94a3b8' };
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 8px', borderRadius: 6,
        background: s.bg, border: `1px solid ${s.border}`,
        color: s.color, fontSize: 11.5, fontWeight: 600,
        fontFamily: "'Inter',-apple-system,sans-serif", whiteSpace: 'nowrap',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0, display: 'inline-block' }} />
        {status}
      </span>
    );
  };

  return (
    <PageWrapper backgroundImage={dashboardBg}>
      <div style={{ padding: isMobile ? "12px" : "20px", maxWidth: "1400px", margin: "0 auto", width: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
        <div style={{ marginBottom: "25px", padding: "20px", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: "12px", backdropFilter: "blur(10px)" }}>
          <h1 style={{ color: "#fff", marginBottom: "8px", fontSize: isMobile ? "26px" : "32px", fontWeight: "800", textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}>
            🧾 Invoice & Billing Management
          </h1>
          <p style={{ color: "#fff", fontSize: "15px", margin: 0, fontWeight: "500", textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>
            Manage invoices, payments, and convert confirmed quotations to invoices
          </p>
        </div>

        {message && (
          <div
            style={{
              padding: "10px",
              marginBottom: "20px",
              backgroundColor: message.includes("✅") ? "#4caf50" : "#f44336",
              color: "white",
              borderRadius: "4px",
            }}
          >
            {message}
          </div>
        )}

        <div style={{ marginBottom: "20px", display: "flex", flexDirection: isMobile ? "column" : "row", gap: "12px" }}>
          <button
            onClick={() => {
              setShowConvertModal(true);
              loadConfirmedQuotations();
            }}
            style={{
              padding: "12px 24px",
              backgroundColor: "#22c55e",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 6px -1px rgba(34, 197, 94, 0.3)",
              transition: "all 0.2s",
              width: isMobile ? "100%" : "auto",
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#16a34a";
              e.target.style.boxShadow = "0 6px 8px -1px rgba(34, 197, 94, 0.4)";
              e.target.style.transform = "translateY(-1px)";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "#22c55e";
              e.target.style.boxShadow = "0 4px 6px -1px rgba(34, 197, 94, 0.3)";
              e.target.style.transform = "translateY(0)";
            }}
          >
            ➕ Convert Quotation to Invoice
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#fff", padding: "20px" }}>Loading...</div>
        ) : isMobile ? (
          /* ── MOBILE: card list, no horizontal scroll ── */
          <div style={{ backgroundColor: "white", borderRadius: "8px", overflow: "hidden", width: "100%", boxSizing: "border-box" }}>
            {invoices.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "#6b7280" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.5 }}>🧾</div>
                <p style={{ fontSize: "16px", fontWeight: "500", marginBottom: "8px" }}>No invoices found</p>
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>Convert a confirmed quotation to create your first invoice</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10 }}>
                {invoices.map((invoice) => (
                  <div key={invoice.id} style={{ backgroundColor: "#fff", borderRadius: 10, padding: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", width: "100%", boxSizing: "border-box" }}>
                    {/* Invoice number + status */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", wordBreak: "break-all", minWidth: 0, flex: 1 }}>
                        {invoice.invoiceNumber}
                      </div>
                      <div style={{ flexShrink: 0 }}>{getPaymentStatusBadge(invoice.paymentStatus)}</div>
                    </div>
                    {/* Key details */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10, fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#94a3b8", fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Customer</span>
                        <span style={{ color: "#374151", fontWeight: 500, textAlign: "right", maxWidth: "60%", wordBreak: "break-word" }}>{invoice.customerName}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#94a3b8", fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Amount</span>
                        <span style={{ color: "#0f172a", fontWeight: 700 }}>₹{(parseFloat(invoice.grandTotal) || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#94a3b8", fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Paid</span>
                        <span style={{ color: "#16a34a", fontWeight: 500 }}>₹{(parseFloat(invoice.paidAmount) || 0).toFixed(2)}</span>
                      </div>
                      {parseFloat(invoice.dueAmount) > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#94a3b8", fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Due</span>
                          <span style={{ color: "#ef4444", fontWeight: 600 }}>₹{(parseFloat(invoice.dueAmount) || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#94a3b8", fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Date</span>
                        <span style={{ color: "#64748b" }}>{invoice.invoiceDate}</span>
                      </div>
                    </div>
                    {/* Compact icon action buttons */}
                    <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
                      <button
                        title="View"
                        onClick={() => handleViewInvoice(invoice.id)}
                        style={{ width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", cursor: "pointer", fontSize: 16, padding: 0, flexShrink: 0, transition: "all 200ms ease" }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(37,99,235,0.18)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
                      >👁</button>
                      {invoice.paymentStatus !== "PAID" && (
                        <button
                          title="Add Payment"
                          onClick={async () => {
                            setCurrentInvoiceId(invoice.id);
                            setCurrentInvoiceForPayment(invoice);
                            try {
                              const response = await getInvoiceById(invoice.id);
                              setCurrentInvoiceForPayment(response.data);
                            } catch (error) {
                              console.error("Failed to load invoice details", error);
                            }
                            setShowPaymentModal(true);
                          }}
                          style={{ width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #bbf7d0", background: "#f0fdf4", color: "#16a34a", cursor: "pointer", fontSize: 16, padding: 0, flexShrink: 0, transition: "all 200ms ease" }}
                          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(22,163,74,0.18)"; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
                        >💳</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── DESKTOP: existing table (unchanged) ── */
          <div style={{ backgroundColor: "white", borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5" }}>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "12px", fontWeight: "600" }}>Invoice #</th>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "12px", fontWeight: "600" }}>Customer</th>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "12px", fontWeight: "600" }}>Type</th>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "12px", fontWeight: "600" }}>Billing</th>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "12px", fontWeight: "600" }}>Status</th>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "12px", fontWeight: "600" }}>Total</th>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "12px", fontWeight: "600" }}>Paid</th>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "12px", fontWeight: "600" }}>Due</th>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "12px", fontWeight: "600" }}>Date</th>
                    <th style={{ padding: "9px 10px", textAlign: "center", fontSize: "12px", fontWeight: "600" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice, idx) => (
                    <tr
                      key={invoice.id}
                      style={{
                        borderTop: "1px solid #ddd",
                        backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "#ffffff" : "#f9fafb")}
                    >
                      <td style={{ padding: "8px 10px", fontWeight: "500", fontSize: 13 }}>{invoice.invoiceNumber}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13 }}>{invoice.customerName}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13 }}>{invoice.invoiceType}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13 }}>{invoice.billingType}</td>
                      <td style={{ padding: "8px 10px" }}>{getPaymentStatusBadge(invoice.paymentStatus)}</td>
                      <td style={{ padding: "8px 10px", fontWeight: "600", fontSize: 13 }}>₹{(parseFloat(invoice.grandTotal) || 0).toFixed(2)}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13 }}>₹{(parseFloat(invoice.paidAmount) || 0).toFixed(2)}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13, color: invoice.dueAmount > 0 ? "#ef4444" : "#22c55e", fontWeight: "500" }}>
                        ₹{(parseFloat(invoice.dueAmount) || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: "8px 10px", fontSize: 13 }}>{invoice.invoiceDate}</td>
                      <td style={{ padding: "7px 12px" }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <button title="View"
                            onClick={() => handleViewInvoice(invoice.id)}
                            style={{ width:30,height:30,borderRadius:6,padding:0,flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center",border:"1px solid #e5e7eb",background:"transparent",color:"#6b7280",cursor:"pointer",fontSize:14,transition:"all 120ms ease" }}
                            onMouseEnter={e=>{e.currentTarget.style.background="#f9fafb";e.currentTarget.style.borderColor="#d1d5db";e.currentTarget.style.color="#111827";}}
                            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="#e5e7eb";e.currentTarget.style.color="#6b7280";}}>👁</button>
                          {invoice.paymentStatus !== "PAID" && (
                            <button title="Add Payment"
                              onClick={async () => {
                                setCurrentInvoiceId(invoice.id);
                                setCurrentInvoiceForPayment(invoice);
                                try {
                                  const response = await getInvoiceById(invoice.id);
                                  setCurrentInvoiceForPayment(response.data);
                                } catch (error) {
                                  console.error("Failed to load invoice details", error);
                                }
                                setShowPaymentModal(true);
                              }}
                              style={{ width:30,height:30,borderRadius:6,padding:0,flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center",border:"1px solid #e5e7eb",background:"transparent",color:"#6b7280",cursor:"pointer",fontSize:14,transition:"all 120ms ease" }}
                              onMouseEnter={e=>{e.currentTarget.style.background="#f0fdf4";e.currentTarget.style.borderColor="#bbf7d0";e.currentTarget.style.color="#16a34a";}}
                              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="#e5e7eb";e.currentTarget.style.color="#6b7280";}}>💳</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {invoices.length === 0 && (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "#6b7280" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.5 }}>🧾</div>
                <p style={{ fontSize: "16px", fontWeight: "500", marginBottom: "8px" }}>No invoices found</p>
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>Convert a confirmed quotation to create your first invoice</p>
              </div>
            )}
          </div>
        )}

        {/* Convert Quotation Modal */}
        {showConvertModal && (
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
              zIndex: 10004,
              padding: isMobile ? "20px 12px" : "80px 20px 20px 20px",
              overflowY: "auto",
            }}
            onClick={() => {
              setShowConvertModal(false);
              setSelectedQuotation(null);
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: isMobile ? "16px" : "30px",
                borderRadius: isMobile ? "12px" : "16px",
                maxWidth: isMobile ? "100%" : "700px",
                width: "100%",
                maxHeight: isMobile ? "calc(100vh - 40px)" : "90vh",
                overflowY: "auto",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                position: "relative",
                zIndex: 10005,
                boxSizing: "border-box",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ 
                marginBottom: isMobile ? "16px" : "25px", 
                borderBottom: "2px solid #e5e7eb", 
                paddingBottom: isMobile ? "12px" : "15px" 
              }}>
                <h2 style={{ 
                  margin: 0, 
                  color: "#1f2937", 
                  fontSize: isMobile ? "18px" : "24px", 
                  fontWeight: "600" 
                }}>🔄 Convert Quotation to Invoice</h2>
                <p style={{ 
                  margin: "5px 0 0 0", 
                  color: "#6b7280", 
                  fontSize: isMobile ? "13px" : "14px" 
                }}>Select a confirmed quotation to create an invoice</p>
              </div>
              <div style={{ marginBottom: isMobile ? "16px" : "20px" }}>
                <label style={{ 
                  display: "block", 
                  marginBottom: "8px", 
                  color: "#374151", 
                  fontWeight: "500", 
                  fontSize: isMobile ? "13px" : "14px" 
                }}>
                  Select Quotation * <span style={{ color: "#ef4444" }}>●</span>
                </label>
                <select
                  value={selectedQuotation?.id?.toString() || ""}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    console.log("Selected quotation ID:", selectedId, "Type:", typeof selectedId);
                    console.log("Available quotations:", quotations.map(q => ({ id: q.id, type: typeof q.id })));
                    
                    if (!selectedId) {
                      setSelectedQuotation(null);
                      return;
                    }
                    
                    // Find quotation by matching id (handle both string and number)
                    const quotation = quotations.find((q) => {
                      const qId = String(q.id);
                      const match = qId === selectedId || q.id === parseInt(selectedId);
                      console.log(`Comparing: q.id=${q.id} (${typeof q.id}) with selectedId=${selectedId} (${typeof selectedId}) -> match=${match}`);
                      return match;
                    });
                    
                    console.log("Found quotation:", quotation);
                    setSelectedQuotation(quotation || null);
                  }}
                  style={{
                    width: "100%",
                    padding: isMobile ? "14px 12px" : "12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "16px", // Prevent iOS zoom
                    backgroundColor: "#fff",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxSizing: "border-box",
                    minHeight: "44px", // Touch target
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                  onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                >
                  <option value="">🔍 Select a confirmed quotation...</option>
                  {quotations.length === 0 ? (
                    <option value="" disabled>No confirmed quotations available</option>
                  ) : (
                    quotations.map((q) => {
                      // Ensure id is converted to string for option value
                      const quotationId = q.id?.toString() || String(q.id);
                      return (
                        <option key={quotationId} value={quotationId}>
                          {q.quotationNumber} - {q.customerName} - ₹{parseFloat(q.grandTotal || 0).toFixed(2)}
                        </option>
                      );
                    })
                  )}
                </select>
                {quotations.length === 0 && (
                  <p style={{ marginTop: "8px", color: "#f59e0b", fontSize: "12px" }}>
                    ⚠️ No confirmed quotations found. Please confirm a quotation first in the Quotations page.
                  </p>
                )}
              </div>
              {selectedQuotation && (
                <>
                  <div style={{ marginBottom: isMobile ? "16px" : "20px" }}>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "8px", 
                      color: "#374151", 
                      fontWeight: "500", 
                      fontSize: isMobile ? "13px" : "14px" 
                    }}>
                      Invoice Type * <span style={{ color: "#ef4444" }}>●</span>
                    </label>
                    <select
                      value={convertForm.invoiceType}
                      onChange={(e) => setConvertForm({ ...convertForm, invoiceType: e.target.value })}
                      style={{
                        width: "100%",
                        padding: isMobile ? "14px 12px" : "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "16px", // Prevent iOS zoom
                        backgroundColor: "#fff",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                        minHeight: "44px", // Touch target
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                    >
                      <option value="ADVANCE">Advance Bill</option>
                      <option value="FINAL">Final Bill</option>
                    </select>
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: isMobile ? "11px" : "12px" }}>💡 Select invoice type</p>
                  </div>
                  <div style={{ marginBottom: isMobile ? "16px" : "20px" }}>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "8px", 
                      color: "#374151", 
                      fontWeight: "500", 
                      fontSize: isMobile ? "13px" : "14px" 
                    }}>
                      Invoice Date * <span style={{ color: "#ef4444" }}>●</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={convertForm.invoiceDate}
                      onChange={(e) => setConvertForm({ ...convertForm, invoiceDate: e.target.value })}
                      style={{
                        width: "100%",
                        maxWidth: "100%",
                        padding: isMobile ? "14px 12px" : "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "16px", // Prevent iOS zoom
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                        minHeight: "44px", // Touch target
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                    />
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: isMobile ? "11px" : "12px" }}>📅 Date for the invoice</p>
                  </div>
                  <div
                    style={{
                      marginBottom: isMobile ? "16px" : "20px",
                      padding: isMobile ? "12px" : "20px",
                      backgroundColor: "#f0f9ff",
                      borderRadius: isMobile ? "8px" : "10px",
                      border: "2px solid #bae6fd",
                    }}
                  >
                    <h4 style={{ 
                      margin: "0 0 12px 0", 
                      color: "#1e40af", 
                      fontSize: isMobile ? "14px" : "16px", 
                      fontWeight: "600" 
                    }}>📄 Selected Quotation</h4>
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
                      gap: isMobile ? "10px" : "12px" 
                    }}>
                      <div>
                        <div style={{ 
                          fontSize: isMobile ? "11px" : "12px", 
                          color: "#6b7280", 
                          marginBottom: "4px" 
                        }}>Quotation Number</div>
                        <div style={{ 
                          fontSize: isMobile ? "14px" : "15px", 
                          color: "#1f2937", 
                          fontWeight: "600" 
                        }}>{selectedQuotation.quotationNumber}</div>
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: isMobile ? "11px" : "12px", 
                          color: "#6b7280", 
                          marginBottom: "4px" 
                        }}>Customer</div>
                        <div style={{ 
                          fontSize: isMobile ? "14px" : "15px", 
                          color: "#1f2937", 
                          fontWeight: "600" 
                        }}>{selectedQuotation.customerName}</div>
                      </div>
                      <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                        <div style={{ 
                          fontSize: isMobile ? "11px" : "12px", 
                          color: "#6b7280", 
                          marginBottom: "4px" 
                        }}>Grand Total</div>
                        <div style={{ 
                          fontSize: isMobile ? "18px" : "20px", 
                          color: "#1e40af", 
                          fontWeight: "700" 
                        }}>₹{(parseFloat(selectedQuotation.grandTotal) || 0).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              <div style={{ 
                display: "flex", 
                flexDirection: isMobile ? "column" : "row", 
                gap: isMobile ? "10px" : "12px", 
                paddingTop: isMobile ? "16px" : "20px", 
                borderTop: "2px solid #e5e7eb" 
              }}>
                <button
                  onClick={handleConvertToInvoice}
                  disabled={!selectedQuotation}
                  style={{
                    flex: 1,
                    padding: isMobile ? "14px 20px" : "12px 24px",
                    backgroundColor: selectedQuotation ? "#22c55e" : "#9ca3af",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: selectedQuotation ? "pointer" : "not-allowed",
                    fontSize: isMobile ? "16px" : "14px",
                    fontWeight: "600",
                    transition: "all 0.2s",
                    boxShadow: selectedQuotation ? "0 4px 6px -1px rgba(34, 197, 94, 0.3)" : "none",
                    minHeight: "44px", // Touch target
                    width: isMobile ? "100%" : "auto",
                  }}
                  onMouseOver={(e) => {
                    if (selectedQuotation) {
                      e.target.style.backgroundColor = "#16a34a";
                      e.target.style.boxShadow = "0 6px 8px -1px rgba(34, 197, 94, 0.4)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedQuotation) {
                      e.target.style.backgroundColor = "#22c55e";
                      e.target.style.boxShadow = "0 4px 6px -1px rgba(34, 197, 94, 0.3)";
                    }
                  }}
                >
                  ✅ Convert to Invoice
                </button>
                <button
                  onClick={() => {
                    setShowConvertModal(false);
                    setSelectedQuotation(null);
                  }}
                  style={{
                    flex: 1,
                    padding: isMobile ? "14px 20px" : "12px 24px",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: isMobile ? "16px" : "14px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                    minHeight: "44px", // Touch target
                    width: isMobile ? "100%" : "auto",
                  }}
                  onMouseOver={(e) => (e.target.style.backgroundColor = "#4b5563")}
                  onMouseOut={(e) => (e.target.style.backgroundColor = "#6b7280")}
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && currentInvoiceForPayment && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10004,
              paddingTop: "80px",
              padding: isMobile ? "80px 15px 15px 15px" : "80px 20px 20px 20px",
            }}
            onClick={() => {
              setShowPaymentModal(false);
              setCurrentInvoiceId(null);
              resetPaymentForm();
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: isMobile ? "20px" : "35px",
                borderRadius: "16px",
                maxWidth: "700px",
                width: "100%",
                maxHeight: "calc(100vh - 100px)",
                overflow: "auto",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                position: "relative",
                zIndex: 10005,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: "25px", borderBottom: "3px solid #e5e7eb", paddingBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div>
                    <h2 style={{ margin: 0, color: "#1f2937", fontSize: isMobile ? "22px" : "28px", fontWeight: "700" }}>
                      💳 Add Payment
                    </h2>
                    <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: "14px" }}>
                      Record payment for Invoice #{currentInvoiceForPayment.invoiceNumber}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setCurrentInvoiceId(null);
                      resetPaymentForm();
                    }}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.target.style.backgroundColor = "#dc2626")}
                    onMouseOut={(e) => (e.target.style.backgroundColor = "#ef4444")}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {/* Invoice Summary */}
              <div
                style={{
                  marginBottom: "25px",
                  padding: "20px",
                  backgroundColor: "#f0f9ff",
                  borderRadius: "12px",
                  border: "2px solid #bae6fd",
                }}
              >
                <h3 style={{ margin: "0 0 15px 0", color: "#1e40af", fontSize: "18px", fontWeight: "600" }}>📄 Invoice Summary</h3>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "15px" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", fontWeight: "500" }}>Grand Total</div>
                    <div style={{ fontSize: "20px", color: "#1e40af", fontWeight: "700" }}>₹{(parseFloat(currentInvoiceForPayment.grandTotal) || 0).toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", fontWeight: "500" }}>Already Paid</div>
                    <div style={{ fontSize: "18px", color: "#22c55e", fontWeight: "600" }}>₹{(parseFloat(currentInvoiceForPayment.paidAmount) || 0).toFixed(2)}</div>
                  </div>
                  <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", fontWeight: "500" }}>Due Amount</div>
                    <div
                      style={{
                        fontSize: "24px",
                        color: currentInvoiceForPayment.dueAmount > 0 ? "#ef4444" : "#22c55e",
                        fontWeight: "800",
                      }}
                    >
                      ₹{(parseFloat(currentInvoiceForPayment.dueAmount) || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Type Selection */}
              <div style={{ marginBottom: "25px" }}>
                <label style={{ display: "block", marginBottom: "12px", color: "#374151", fontWeight: "600", fontSize: "15px" }}>
                  Payment Type * <span style={{ color: "#ef4444" }}>●</span>
                </label>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeChange("FULL")}
                    style={{
                      padding: "15px",
                      borderRadius: "10px",
                      border: paymentForm.paymentType === "FULL" ? "3px solid #22c55e" : "2px solid #d1d5db",
                      backgroundColor: paymentForm.paymentType === "FULL" ? "#dcfce7" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "center",
                    }}
                    onMouseOver={(e) => {
                      if (paymentForm.paymentType !== "FULL") {
                        e.currentTarget.style.borderColor = "#22c55e";
                        e.currentTarget.style.backgroundColor = "#f0fdf4";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (paymentForm.paymentType !== "FULL") {
                        e.currentTarget.style.borderColor = "#d1d5db";
                        e.currentTarget.style.backgroundColor = "#ffffff";
                      }
                    }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>💯</div>
                    <div style={{ fontWeight: "600", color: "#1f2937", fontSize: "14px" }}>Full Payment</div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                      ₹{(parseFloat(currentInvoiceForPayment.dueAmount) || 0).toFixed(2)}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeChange("HALF")}
                    style={{
                      padding: "15px",
                      borderRadius: "10px",
                      border: paymentForm.paymentType === "HALF" ? "3px solid #f59e0b" : "2px solid #d1d5db",
                      backgroundColor: paymentForm.paymentType === "HALF" ? "#fef3c7" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "center",
                    }}
                    onMouseOver={(e) => {
                      if (paymentForm.paymentType !== "HALF") {
                        e.currentTarget.style.borderColor = "#f59e0b";
                        e.currentTarget.style.backgroundColor = "#fffbeb";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (paymentForm.paymentType !== "HALF") {
                        e.currentTarget.style.borderColor = "#d1d5db";
                        e.currentTarget.style.backgroundColor = "#ffffff";
                      }
                    }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>➗</div>
                    <div style={{ fontWeight: "600", color: "#1f2937", fontSize: "14px" }}>Half Payment</div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                      ₹{((parseFloat(currentInvoiceForPayment.dueAmount) || 0) / 2).toFixed(2)}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeChange("MANUAL")}
                    style={{
                      padding: "15px",
                      borderRadius: "10px",
                      border: paymentForm.paymentType === "MANUAL" ? "3px solid #6366f1" : "2px solid #d1d5db",
                      backgroundColor: paymentForm.paymentType === "MANUAL" ? "#eef2ff" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "center",
                    }}
                    onMouseOver={(e) => {
                      if (paymentForm.paymentType !== "MANUAL") {
                        e.currentTarget.style.borderColor = "#6366f1";
                        e.currentTarget.style.backgroundColor = "#f5f7ff";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (paymentForm.paymentType !== "MANUAL") {
                        e.currentTarget.style.borderColor = "#d1d5db";
                        e.currentTarget.style.backgroundColor = "#ffffff";
                      }
                    }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>✏️</div>
                    <div style={{ fontWeight: "600", color: "#1f2937", fontSize: "14px" }}>Manual Amount</div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>Enter custom</div>
                  </button>
                </div>
              </div>

              {/* Payment Details Form */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                    Payment Amount (₹) * <span style={{ color: "#ef4444" }}>●</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    max={currentInvoiceForPayment.dueAmount || currentInvoiceForPayment.grandTotal}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value, paymentType: "MANUAL" })}
                    placeholder="0.00"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "16px",
                      fontWeight: "600",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                  />
                  <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>
                    💰 Maximum: ₹{(parseFloat(currentInvoiceForPayment.dueAmount) || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                    Payment Date * <span style={{ color: "#ef4444" }}>●</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                  />
                  <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>📅 Date of payment</p>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                    Payment Mode * <span style={{ color: "#ef4444" }}>●</span>
                  </label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      backgroundColor: "#fff",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                  >
                    <option value="CASH">💵 Cash</option>
                    <option value="UPI">📱 UPI</option>
                    <option value="BANK">🏦 Bank Transfer</option>
                    <option value="SPLIT">💳 Split Payment</option>
                  </select>
                  <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>💳 Payment method</p>
                </div>
              </div>

              {/* Conditional Fields */}
              {paymentForm.paymentMode === "BANK" && (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={paymentForm.bankName}
                      onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                      placeholder="e.g., State Bank of India"
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Cheque Number
                    </label>
                    <input
                      type="text"
                      value={paymentForm.chequeNumber}
                      onChange={(e) => setPaymentForm({ ...paymentForm, chequeNumber: e.target.value })}
                      placeholder="e.g., 123456"
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                    />
                  </div>
                </div>
              )}
              {(paymentForm.paymentMode === "UPI" || paymentForm.paymentMode === "BANK") && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                    Transaction ID / Reference Number
                  </label>
                  <input
                    type="text"
                    value={paymentForm.transactionId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                    placeholder="Enter transaction or reference number"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                  />
                  <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>🔗 UPI transaction ID or bank reference number</p>
                </div>
              )}
              <div style={{ marginBottom: "25px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Add any additional notes about this payment..."
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    minHeight: "100px",
                    resize: "vertical",
                    fontFamily: "inherit",
                    transition: "all 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                  onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                />
                <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>📝 Additional payment notes or remarks</p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "12px", paddingTop: "20px", borderTop: "2px solid #e5e7eb" }}>
                <button
                  onClick={handleAddPayment}
                  disabled={!paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
                  style={{
                    flex: 1,
                    padding: "14px 24px",
                    backgroundColor: paymentForm.amount && parseFloat(paymentForm.amount) > 0 ? "#22c55e" : "#9ca3af",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: paymentForm.amount && parseFloat(paymentForm.amount) > 0 ? "pointer" : "not-allowed",
                    fontSize: "15px",
                    fontWeight: "600",
                    transition: "all 0.2s",
                    boxShadow: paymentForm.amount && parseFloat(paymentForm.amount) > 0 ? "0 4px 6px -1px rgba(34, 197, 94, 0.3)" : "none",
                  }}
                  onMouseOver={(e) => {
                    if (paymentForm.amount && parseFloat(paymentForm.amount) > 0) {
                      e.target.style.backgroundColor = "#16a34a";
                      e.target.style.boxShadow = "0 6px 8px -1px rgba(34, 197, 94, 0.4)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (paymentForm.amount && parseFloat(paymentForm.amount) > 0) {
                      e.target.style.backgroundColor = "#22c55e";
                      e.target.style.boxShadow = "0 4px 6px -1px rgba(34, 197, 94, 0.3)";
                    }
                  }}
                >
                  ✅ Add Payment
                </button>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setCurrentInvoiceId(null);
                    resetPaymentForm();
                  }}
                  style={{
                    flex: 1,
                    padding: "14px 24px",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => (e.target.style.backgroundColor = "#4b5563")}
                  onMouseOut={(e) => (e.target.style.backgroundColor = "#6b7280")}
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Details Modal */}
        {selectedInvoice && (
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10004,
              padding: isMobile ? '70px 12px 12px' : '70px 20px 20px',
            }}
            onClick={() => { setSelectedInvoice(null); setSelectedQuotationDetails(null); }}
          >
            <div
              style={{
                backgroundColor: '#fff', padding: 0,
                borderRadius: 14, maxWidth: 1100, width: '100%',
                maxHeight: 'calc(100vh - 90px)', overflow: 'auto',
                boxShadow: '0 20px 40px -8px rgba(15,23,42,.18), 0 4px 12px -4px rgba(15,23,42,.08)',
                position: 'relative', zIndex: 10005,
                display: 'flex', flexDirection: 'column',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* ═══ Sticky header ═══ */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px 12px', borderBottom:'1px solid #f1f5f9', position:'sticky', top:0, background:'#fff', zIndex:10, flexWrap:'wrap', gap:8 }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'#94a3b8', fontFamily:"'Inter',-apple-system,sans-serif", textTransform:'uppercase', letterSpacing:'0.06em' }}>Invoice</span>
                    <span style={{ fontSize:15, fontWeight:700, color:'#0f172a', fontFamily:"'Inter',-apple-system,sans-serif", letterSpacing:'-0.02em' }}>{selectedInvoice.invoiceNumber}</span>
                    {getPaymentStatusBadge(selectedInvoice.paymentStatus)}
                  </div>
                  <div style={{ fontSize:11.5, color:'#94a3b8', marginTop:2, fontFamily:"'Inter',-apple-system,sans-serif" }}>
                    {selectedInvoice.invoiceDate}{selectedInvoice.invoiceType ? ` · ${selectedInvoice.invoiceType}` : ''}
                  </div>
                </div>
                <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                  <InvDropdownBtn label="Print" icon="🖨️" iconOnly={isMobile} items={[
                    { icon:'📄', label:'Final Bill',       onClick: async () => { try { const r = await printInvoice(selectedInvoice.id); const url = window.URL.createObjectURL(new Blob([r.data],{type:'application/pdf'})); const w = window.open(url,'_blank'); if(w) w.onload=()=>w.print(); } catch { alert('Failed to print invoice'); } } },
                    { icon:'📋', label:'Estimate',         onClick: async () => { try { const r = await printBasicInvoice(selectedInvoice.id); const url = window.URL.createObjectURL(new Blob([r.data],{type:'application/pdf'})); const w = window.open(url,'_blank'); if(w) w.onload=()=>w.print(); } catch { alert('Failed to print estimate'); } } },
                    { icon:'📦', label:'Delivery Challan', onClick: async () => { try { const r = await printDeliveryChallan(selectedInvoice.id); const url = window.URL.createObjectURL(new Blob([r.data],{type:'application/pdf'})); const w = window.open(url,'_blank'); if(w) w.onload=()=>w.print(); } catch { alert('Failed to print challan'); } } },
                  ]} />
                  <InvDropdownBtn label="Download" icon="⬇️" iconOnly={isMobile} items={[
                    { icon:'📥', label:'Final Bill PDF',  onClick: async () => { try { const r = await downloadInvoice(selectedInvoice.id); const url = window.URL.createObjectURL(new Blob([r.data])); const a = document.createElement('a'); a.href=url; a.setAttribute('download',`invoice-${selectedInvoice.invoiceNumber}.pdf`); document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url); } catch { alert('Failed to download invoice'); } } },
                    { icon:'📋', label:'Estimate PDF',    onClick: async () => { try { const r = await downloadBasicInvoice(selectedInvoice.id); const url = window.URL.createObjectURL(new Blob([r.data])); const a = document.createElement('a'); a.href=url; a.setAttribute('download',`estimate-${selectedInvoice.invoiceNumber}.pdf`); document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url); } catch { alert('Failed to download estimate'); } } },
                    { icon:'📦', label:'Challan PDF',     onClick: async () => { try { const r = await downloadTransportChallan(selectedInvoice.id); const url = window.URL.createObjectURL(new Blob([r.data])); const a = document.createElement('a'); a.href=url; a.setAttribute('download',`challan-${selectedInvoice.invoiceNumber}.pdf`); document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url); } catch { alert('Failed to download challan'); } } },
                  ]} />
                  <button
                    onClick={() => { setSelectedInvoice(null); setSelectedQuotationDetails(null); }}
                    style={{ width:32, height:32, borderRadius:'50%', border:'1px solid #e2e8f0', background:'#f8fafc', cursor:'pointer', fontSize:14, color:'#64748b', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 140ms ease', flexShrink:0 }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='#f1f5f9'; e.currentTarget.style.color='#374151'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.color='#64748b'; }}
                  >✕</button>
                </div>
              </div>

              {/* ═══ Meta strip ═══ */}
              <div style={{ display:'flex', flexWrap:'wrap', borderBottom:'1px solid #f1f5f9', background:'#fafbfc' }}>
                <InvMetaField label="Customer">
                  <div style={{ fontSize:13, fontWeight:600, color:'#0f172a', fontFamily:"'Inter',-apple-system,sans-serif" }}>{selectedInvoice.customerName}</div>
                </InvMetaField>
                <InvMetaField label="Billing">
                  <span style={{ fontSize:13, fontWeight:600, color:'#0f172a', fontFamily:"'Inter',-apple-system,sans-serif" }}>{selectedInvoice.billingType}</span>
                </InvMetaField>
                <InvMetaField label="Type">
                  <span style={{ fontSize:13, fontWeight:600, color:'#0f172a', fontFamily:"'Inter',-apple-system,sans-serif" }}>{selectedInvoice.invoiceType}</span>
                </InvMetaField>
                {selectedInvoice.quotationId && (
                  <InvMetaField label="Quotation">
                    <span style={{ fontSize:13, fontWeight:500, color:'#374151', fontFamily:"'Inter',-apple-system,sans-serif" }}>
                      {selectedQuotationDetails?.quotationNumber || `#${selectedInvoice.quotationId}`}
                    </span>
                  </InvMetaField>
                )}
                {selectedInvoice.billingType === 'GST' && selectedInvoice.cgst && (
                  <InvMetaField label="CGST / SGST">
                    <span style={{ fontSize:13, fontWeight:500, color:'#374151', fontFamily:"'Inter',-apple-system,sans-serif" }}>
                      ₹{(parseFloat(selectedInvoice.cgst)||0).toFixed(2)} / ₹{(parseFloat(selectedInvoice.sgst)||0).toFixed(2)}
                    </span>
                  </InvMetaField>
                )}
                {selectedInvoice.billingType === 'GST' && selectedInvoice.igst && parseFloat(selectedInvoice.igst) > 0 && (
                  <InvMetaField label="IGST">
                    <span style={{ fontSize:13, fontWeight:500, color:'#374151', fontFamily:"'Inter',-apple-system,sans-serif" }}>
                      ₹{(parseFloat(selectedInvoice.igst)||0).toFixed(2)}
                    </span>
                  </InvMetaField>
                )}
              </div>

              {/* ═══ Financial KPI strip ═══ */}
              <div style={{ display:'flex', flexWrap:'wrap', borderBottom:'1px solid #f1f5f9' }}>
                <InvKpiCell label="Grand Total" value={selectedInvoice.grandTotal} highlight />
                <InvKpiCell label="Paid"        value={selectedInvoice.paidAmount}  color="#16a34a" />
                <InvKpiCell label="Due"         value={selectedInvoice.dueAmount}   color={parseFloat(selectedInvoice.dueAmount)>0?'#dc2626':'#16a34a'} />
                {parseFloat(selectedInvoice.subtotal) > 0 && <InvKpiCell label="Subtotal" value={selectedInvoice.subtotal} />}
                {selectedInvoice.billingType === 'GST' && parseFloat(selectedInvoice.gstAmount) > 0 && (
                  <InvKpiCell label={`GST (${selectedInvoice.gstPercentage}%)`} value={selectedInvoice.gstAmount} />
                )}
              </div>

              {/* ═══ Items table ═══ */}
              <div style={{ padding:'0 0 16px', flex:1 }}>
                <div style={{ padding:'12px 20px 8px', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:"'Inter',-apple-system,sans-serif" }}>
                  Items ({selectedInvoice.items?.length || 0})
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'520px', fontSize:13, fontFamily:"'Inter',-apple-system,sans-serif" }}>
                    <thead>
                      <tr style={{ background:'#f8fafc', borderBottom:'1.5px solid #e2e8f0' }}>
                        {['#','Glass Type','Thickness','Size','Qty','Rate/SqFt','Amount'].map((h,i) => (
                          <th key={h} style={{ padding:'8px 12px', textAlign:i===0||i>=4?'right':'left', fontSize:'10.5px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items?.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom:'1px solid #f1f5f9', background:'#fff', transition:'background 120ms ease' }}
                          onMouseEnter={e=>e.currentTarget.style.background='#fafbfd'}
                          onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                          <td style={{ padding:'8px 12px', textAlign:'right', color:'#94a3b8', fontWeight:600, width:32 }}>{idx+1}</td>
                          <td style={{ padding:'8px 12px', fontWeight:600, color:'#0f172a' }}>{item.glassType||'N/A'}</td>
                          <td style={{ padding:'8px 12px', color:'#475569' }}>{item.thickness||'—'}</td>
                          <td style={{ padding:'8px 12px', color:'#475569', whiteSpace:'nowrap' }}>{item.height} × {item.width} ft</td>
                          <td style={{ padding:'8px 12px', color:'#374151', textAlign:'right' }}>{item.quantity}</td>
                          <td style={{ padding:'8px 12px', color:'#374151', textAlign:'right', whiteSpace:'nowrap' }}>₹{(parseFloat(item.ratePerSqft)||0).toFixed(2)}</td>
                          <td style={{ padding:'8px 12px', fontWeight:700, color:'#0f172a', textAlign:'right', whiteSpace:'nowrap' }}>₹{(parseFloat(item.subtotal)||0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ═══ Payment history ═══ */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div style={{ padding:'0 0 20px', borderTop:'1px solid #f1f5f9' }}>
                  <div style={{ padding:'12px 20px 8px', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:"'Inter',-apple-system,sans-serif" }}>
                    Payment History ({selectedInvoice.payments.length})
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'420px', fontSize:13, fontFamily:"'Inter',-apple-system,sans-serif" }}>
                      <thead>
                        <tr style={{ background:'#f8fafc', borderBottom:'1.5px solid #e2e8f0' }}>
                          {['Date','Mode','Amount','Reference'].map((h,i) => (
                            <th key={h} style={{ padding:'8px 12px', textAlign:i===2?'right':'left', fontSize:'10.5px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.payments.map((payment, idx) => (
                          <tr key={idx} style={{ borderBottom:'1px solid #f1f5f9', background:'#fff', transition:'background 120ms ease' }}
                            onMouseEnter={e=>e.currentTarget.style.background='#fafbfd'}
                            onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                            <td style={{ padding:'8px 12px', color:'#475569' }}>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                            <td style={{ padding:'8px 12px', color:'#374151', fontWeight:500 }}>{payment.paymentMode}</td>
                            <td style={{ padding:'8px 12px', fontWeight:700, color:'#16a34a', textAlign:'right', whiteSpace:'nowrap' }}>₹{(parseFloat(payment.amount)||0).toFixed(2)}</td>
                            <td style={{ padding:'8px 12px', color:'#64748b' }}>{payment.transactionId||payment.referenceNumber||'—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

export default InvoiceManagement;

