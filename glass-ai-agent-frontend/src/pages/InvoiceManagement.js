import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
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

/* ─── dark tokens ─────────────────────────────────────────────────────────── */
const T = {
  bgCard:   "rgba(17,27,53,0.9)",
  bgInput:  "rgba(255,255,255,0.06)",
  accent:   "#4F5DFF",
  success:  "#37E3A5",
  warning:  "#FFB95E",
  danger:   "#FF6B81",
  textPri:  "#FFFFFF",
  textSec:  "#A9B3D1",
  textMut:  "#7180A6",
  border:   "rgba(255,255,255,0.08)",
};

const darkInput = {
  background: T.bgInput,
  border: "1.5px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  height: 44,
  padding: "0 12px",
  color: "#fff",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

const darkLabel = {
  fontSize: 11,
  fontWeight: 700,
  color: T.textMut,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  display: "block",
  marginBottom: 6,
};

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
    const estW = 190;
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
            borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
            background: open ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
            color: T.textSec, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: "'Inter',-apple-system,sans-serif",
            transition: 'all 140ms ease', whiteSpace: 'nowrap', justifyContent: 'center',
          }}
          onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
          onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        >
          {icon && <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>}
          {!iconOnly && <span>{label}</span>}
          {!iconOnly && <span style={{ fontSize: 9, color: T.textMut, marginLeft: 1 }}>▾</span>}
        </button>
      </div>
      {open && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left,
            background: 'rgba(17,27,53,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            minWidth: 190, maxWidth: '90vw',
            zIndex: 99999, overflow: 'hidden',
          }}
        >
          {items.map((item, i) => (
            <button key={i} onClick={() => { item.onClick(); setOpen(false); }}
              style={{
                width: '100%', padding: '9px 14px',
                background: 'transparent', border: 'none', textAlign: 'left',
                cursor: 'pointer', fontSize: 13, color: T.textSec,
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

/* ─── Compact meta field cell ────────────────────────────────────────────────── */
function InvMetaField({ label, children }) {
  if (!children) return null;
  return (
    <div style={{ padding: '10px 16px', borderRight: `1px solid ${T.border}`, minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: T.textMut, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3, fontFamily: "'Inter',-apple-system,sans-serif", whiteSpace: 'nowrap' }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

/* ─── KPI amount cell ─────────────────────────────────────────────────────────── */
function InvKpiCell({ label, value, highlight, color }) {
  const v = parseFloat(value) || 0;
  return (
    <div style={{ padding: '12px 18px', borderRight: `1px solid ${T.border}`, minWidth: 0, background: highlight ? 'rgba(79,93,255,0.1)' : 'transparent' }}>
      <div style={{ fontSize: 10.5, color: T.textMut, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, whiteSpace: 'nowrap', fontFamily: "'Inter',-apple-system,sans-serif" }}>{label}</div>
      <div style={{ fontSize: highlight ? 18 : 14, fontWeight: highlight ? 800 : 600, color: color || (highlight ? T.accent : T.textPri), letterSpacing: '-0.02em', fontFamily: "'Inter',-apple-system,sans-serif", whiteSpace: 'nowrap' }}>
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
      try {
        const statusResponse = await getQuotationsByStatus("CONFIRMED");
        console.log("Confirmed quotations from status endpoint:", statusResponse.data?.length || 0);
        setQuotations(statusResponse.data || []);
        if (!statusResponse.data || statusResponse.data.length === 0) {
          setMessage("ℹ️ No confirmed quotations available. Please confirm a quotation first.");
        } else {
          setMessage("");
        }
        return;
      } catch (statusError) {
        console.log("Status endpoint failed, falling back to filter:", statusError);
      }

      const response = await getQuotations();
      console.log("All quotations received:", response.data?.map(q => ({
        id: q.id,
        number: q.quotationNumber,
        status: q.status
      })) || []);

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
        setMessage("");
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
      PAID:    { bg: 'rgba(55,227,165,0.15)', color: '#37E3A5', border: 'rgba(55,227,165,0.3)', dot: '#37E3A5' },
      PARTIAL: { bg: 'rgba(255,185,94,0.15)', color: '#FFB95E', border: 'rgba(255,185,94,0.3)', dot: '#FFB95E' },
      DUE:     { bg: 'rgba(255,107,129,0.15)', color: '#FF6B81', border: 'rgba(255,107,129,0.3)', dot: '#FF6B81' },
    };
    const s = map[status] || { bg: 'rgba(113,128,166,0.15)', color: '#7180A6', border: 'rgba(113,128,166,0.3)', dot: '#7180A6' };
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

  const pageStyle = { minHeight: "100vh", background: "linear-gradient(135deg,#050b1f 0%,#0d1535 50%,#111b3d 100%)" };

  return (
    <div style={pageStyle}>
      <div style={{ padding: isMobile ? "12px" : "16px 16px 24px", maxWidth: "1400px", margin: "0 auto", width: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: T.textPri, margin: "0 0 6px", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>
            🧾 Invoices
          </h1>
          <p style={{ color: T.textSec, fontSize: 14, margin: 0 }}>
            Manage invoices, payments, and convert confirmed quotations to invoices
          </p>
        </div>

        {message && (
          <div style={{
            padding: "10px 14px",
            marginBottom: 20,
            backgroundColor: message.includes("✅") ? "rgba(55,227,165,0.15)" : "rgba(255,107,129,0.15)",
            color: message.includes("✅") ? T.success : T.danger,
            borderRadius: 8,
            border: `1px solid ${message.includes("✅") ? "rgba(55,227,165,0.3)" : "rgba(255,107,129,0.3)"}`,
            fontSize: 13,
            fontWeight: 500,
          }}>
            {message}
          </div>
        )}

        <div style={{ marginBottom: 20, display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12 }}>
          <button
            onClick={() => {
              setShowConvertModal(true);
              loadConfirmedQuotations();
            }}
            style={{
              padding: "10px 20px",
              background: `linear-gradient(135deg, ${T.accent}, #7B61FF)`,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 14px rgba(79,93,255,0.35)",
              transition: "all 0.2s",
              width: isMobile ? "100%" : "auto",
            }}
            onMouseOver={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(79,93,255,0.45)"; }}
            onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(79,93,255,0.35)"; }}
          >
            ➕ Convert Quotation to Invoice
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: T.textSec, padding: "20px" }}>Loading...</div>
        ) : isMobile ? (
          /* ── MOBILE: card list ── */
          <div style={{ background: "#111B35", borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden", width: "100%", boxSizing: "border-box" }}>
            {invoices.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.5 }}>🧾</div>
                <p style={{ fontSize: "16px", fontWeight: "500", marginBottom: "8px", color: T.textPri }}>No invoices found</p>
                <p style={{ fontSize: "14px", color: T.textMut }}>Convert a confirmed quotation to create your first invoice</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10 }}>
                {invoices.map((invoice) => (
                  <div key={invoice.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 12, border: `1px solid ${T.border}`, width: "100%", boxSizing: "border-box" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPri, wordBreak: "break-all", minWidth: 0, flex: 1 }}>
                        {invoice.invoiceNumber}
                      </div>
                      <div style={{ flexShrink: 0 }}>{getPaymentStatusBadge(invoice.paymentStatus)}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10, fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: T.textMut, fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Customer</span>
                        <span style={{ color: T.textSec, fontWeight: 500, textAlign: "right", maxWidth: "60%", wordBreak: "break-word" }}>{invoice.customerName}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: T.textMut, fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Amount</span>
                        <span style={{ color: T.success, fontWeight: 700 }}>₹{(parseFloat(invoice.grandTotal) || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: T.textMut, fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Paid</span>
                        <span style={{ color: T.success, fontWeight: 500 }}>₹{(parseFloat(invoice.paidAmount) || 0).toFixed(2)}</span>
                      </div>
                      {parseFloat(invoice.dueAmount) > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: T.textMut, fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Due</span>
                          <span style={{ color: T.danger, fontWeight: 600 }}>₹{(parseFloat(invoice.dueAmount) || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: T.textMut, fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Date</span>
                        <span style={{ color: T.textSec }}>{invoice.invoiceDate}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                      <button
                        title="View"
                        onClick={() => handleViewInvoice(invoice.id)}
                        style={{ width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid rgba(79,93,255,0.4)`, background: "rgba(79,93,255,0.12)", color: T.accent, cursor: "pointer", fontSize: 16, padding: 0, flexShrink: 0, transition: "all 200ms ease" }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
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
                          style={{ width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid rgba(55,227,165,0.4)`, background: "rgba(55,227,165,0.12)", color: T.success, cursor: "pointer", fontSize: 16, padding: 0, flexShrink: 0, transition: "all 200ms ease" }}
                          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                        >💳</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── DESKTOP: table ── */
          <div style={{ background: "#111B35", borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden" }}>
            <div style={{ overflowX: "auto", background: "#111B35" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px", background: "#111B35" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                    {["ID","Invoice #","Customer","Type","Billing","Status","Total","Paid","Due","Date","Actions"].map((h, i) => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: i === 10 ? "center" : "left", fontSize: 11, fontWeight: 700, color: T.textMut, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice, idx) => (
                    <tr
                      key={invoice.id}
                      style={{ borderTop: `1px solid ${T.border}`, transition: "background-color 0.15s", backgroundColor: "#111B35" }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#0A0F1E"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "#111B35"}
                    >
                      <td style={{ padding: "9px 12px", fontSize: 12, color: T.textMut, whiteSpace: "nowrap" }}>#{invoice.id}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, fontSize: 13, color: "#E2E8F0" }}>{invoice.invoiceNumber}</td>
                      <td style={{ padding: "9px 12px", fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{invoice.customerName}</td>
                      <td style={{ padding: "9px 12px", fontSize: 13, color: T.textSec }}>{invoice.invoiceType}</td>
                      <td style={{ padding: "9px 12px", fontSize: 13, color: T.textSec }}>{invoice.billingType}</td>
                      <td style={{ padding: "9px 12px" }}>{getPaymentStatusBadge(invoice.paymentStatus)}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, fontSize: 13, color: T.success }}>₹{(parseFloat(invoice.grandTotal) || 0).toFixed(2)}</td>
                      <td style={{ padding: "9px 12px", fontSize: 13, color: T.textSec }}>₹{(parseFloat(invoice.paidAmount) || 0).toFixed(2)}</td>
                      <td style={{ padding: "9px 12px", fontSize: 13, color: invoice.dueAmount > 0 ? T.danger : T.success, fontWeight: 600 }}>
                        ₹{(parseFloat(invoice.dueAmount) || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: "9px 12px", fontSize: 13, color: T.textSec }}>{invoice.invoiceDate}</td>
                      <td style={{ padding: "7px 12px" }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "center" }}>
                          <button title="View"
                            onClick={() => handleViewInvoice(invoice.id)}
                            style={{ width: 30, height: 30, borderRadius: 6, padding: 0, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", border: `1px solid rgba(79,93,255,0.3)`, background: "rgba(79,93,255,0.1)", color: T.accent, cursor: "pointer", fontSize: 14, transition: "all 120ms ease" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(79,93,255,0.2)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(79,93,255,0.1)"; }}>👁</button>
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
                              style={{ width: 30, height: 30, borderRadius: 6, padding: 0, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", border: `1px solid rgba(55,227,165,0.3)`, background: "rgba(55,227,165,0.1)", color: T.success, cursor: "pointer", fontSize: 14, transition: "all 120ms ease" }}
                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(55,227,165,0.2)"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "rgba(55,227,165,0.1)"; }}>💳</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {invoices.length === 0 && (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.5 }}>🧾</div>
                <p style={{ fontSize: "16px", fontWeight: "500", marginBottom: "8px", color: T.textPri }}>No invoices found</p>
                <p style={{ fontSize: "14px", color: T.textMut }}>Convert a confirmed quotation to create your first invoice</p>
              </div>
            )}
          </div>
        )}

        {/* Convert Quotation Modal */}
        {showConvertModal && (
          <div
            style={{
              position: "fixed", inset: 0,
              background: "rgba(5,11,31,0.85)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 10004, padding: isMobile ? "20px 12px" : "80px 20px 20px 20px", overflowY: "auto",
            }}
            onClick={() => { setShowConvertModal(false); setSelectedQuotation(null); }}
          >
            <div
              style={{
                background: "rgba(17,27,53,0.98)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20,
                padding: isMobile ? "16px" : "28px",
                maxWidth: isMobile ? "100%" : "620px",
                width: "100%",
                maxHeight: isMobile ? "calc(100vh - 40px)" : "90vh",
                overflowY: "auto",
                boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
                position: "relative", zIndex: 10005, boxSizing: "border-box",
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ marginBottom: 22, borderBottom: `1px solid ${T.border}`, paddingBottom: 16 }}>
                <h2 style={{ margin: 0, color: T.textPri, fontSize: isMobile ? 18 : 22, fontWeight: 700 }}>🔄 Convert Quotation to Invoice</h2>
                <p style={{ margin: "5px 0 0 0", color: T.textSec, fontSize: 13 }}>Select a confirmed quotation to create an invoice</p>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={darkLabel}>Select Quotation *</label>
                <select
                  value={selectedQuotation?.id?.toString() || ""}
                  onChange={e => {
                    const selectedId = e.target.value;
                    console.log("Selected quotation ID:", selectedId, "Type:", typeof selectedId);
                    console.log("Available quotations:", quotations.map(q => ({ id: q.id, type: typeof q.id })));
                    if (!selectedId) { setSelectedQuotation(null); return; }
                    const quotation = quotations.find(q => {
                      const qId = String(q.id);
                      const match = qId === selectedId || q.id === parseInt(selectedId);
                      console.log(`Comparing: q.id=${q.id} (${typeof q.id}) with selectedId=${selectedId} (${typeof selectedId}) -> match=${match}`);
                      return match;
                    });
                    console.log("Found quotation:", quotation);
                    setSelectedQuotation(quotation || null);
                  }}
                  style={{ ...darkInput, height: 44, padding: "0 12px", cursor: "pointer", appearance: "none" }}
                  onFocus={e => e.target.style.borderColor = T.accent}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                >
                  <option value="" style={{ background: "#111b3d" }}>🔍 Select a confirmed quotation...</option>
                  {quotations.length === 0 ? (
                    <option value="" disabled style={{ background: "#111b3d" }}>No confirmed quotations available</option>
                  ) : (
                    quotations.map(q => {
                      const quotationId = q.id?.toString() || String(q.id);
                      return (
                        <option key={quotationId} value={quotationId} style={{ background: "#111b3d" }}>
                          {q.quotationNumber} - {q.customerName} - ₹{parseFloat(q.grandTotal || 0).toFixed(2)}
                        </option>
                      );
                    })
                  )}
                </select>
                {quotations.length === 0 && (
                  <p style={{ marginTop: 8, color: T.warning, fontSize: 12 }}>
                    ⚠️ No confirmed quotations found. Please confirm a quotation first in the Quotations page.
                  </p>
                )}
              </div>
              {selectedQuotation && (
                <>
                  <div style={{ marginBottom: 18 }}>
                    <label style={darkLabel}>Invoice Type *</label>
                    <select
                      value={convertForm.invoiceType}
                      onChange={e => setConvertForm({ ...convertForm, invoiceType: e.target.value })}
                      style={{ ...darkInput, height: 44, padding: "0 12px", cursor: "pointer", appearance: "none" }}
                      onFocus={e => e.target.style.borderColor = T.accent}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                    >
                      <option value="ADVANCE" style={{ background: "#111b3d" }}>Advance Bill</option>
                      <option value="FINAL" style={{ background: "#111b3d" }}>Final Bill</option>
                    </select>
                    <p style={{ marginTop: 5, color: T.textMut, fontSize: 12 }}>💡 Select invoice type</p>
                  </div>
                  <div style={{ marginBottom: 18 }}>
                    <label style={darkLabel}>Invoice Date *</label>
                    <input
                      type="date"
                      required
                      value={convertForm.invoiceDate}
                      onChange={e => setConvertForm({ ...convertForm, invoiceDate: e.target.value })}
                      style={{ ...darkInput, height: 44, padding: "0 12px" }}
                      onFocus={e => e.target.style.borderColor = T.accent}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                    />
                    <p style={{ marginTop: 5, color: T.textMut, fontSize: 12 }}>📅 Date for the invoice</p>
                  </div>
                  <div style={{ marginBottom: 18, padding: 16, background: "rgba(79,93,255,0.08)", borderRadius: 12, border: "1px solid rgba(79,93,255,0.25)" }}>
                    <h4 style={{ margin: "0 0 12px 0", color: T.accent, fontSize: 15, fontWeight: 600 }}>📄 Selected Quotation</h4>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, color: T.textMut, marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Quotation Number</div>
                        <div style={{ fontSize: 14, color: T.textPri, fontWeight: 600 }}>{selectedQuotation.quotationNumber}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: T.textMut, marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Customer</div>
                        <div style={{ fontSize: 14, color: T.textPri, fontWeight: 600 }}>{selectedQuotation.customerName}</div>
                      </div>
                      <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                        <div style={{ fontSize: 11, color: T.textMut, marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Grand Total</div>
                        <div style={{ fontSize: 22, color: T.success, fontWeight: 800 }}>₹{(parseFloat(selectedQuotation.grandTotal) || 0).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                <button
                  onClick={handleConvertToInvoice}
                  disabled={!selectedQuotation}
                  style={{
                    flex: 1, padding: "12px 20px",
                    background: selectedQuotation ? `linear-gradient(135deg, ${T.accent}, #7B61FF)` : "rgba(255,255,255,0.08)",
                    color: "white", border: "none", borderRadius: 10,
                    cursor: selectedQuotation ? "pointer" : "not-allowed",
                    fontSize: 14, fontWeight: 600, minHeight: 44,
                    boxShadow: selectedQuotation ? "0 4px 14px rgba(79,93,255,0.35)" : "none",
                  }}
                >
                  ✅ Convert to Invoice
                </button>
                <button
                  onClick={() => { setShowConvertModal(false); setSelectedQuotation(null); }}
                  style={{ flex: 1, padding: "12px 20px", background: "rgba(255,255,255,0.07)", color: T.textSec, border: `1px solid ${T.border}`, borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 500, minHeight: 44 }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                  onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
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
              position: "fixed", inset: 0,
              background: "rgba(5,11,31,0.85)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 10004,
              padding: isMobile ? "80px 15px 15px 15px" : "80px 20px 20px 20px",
            }}
            onClick={() => { setShowPaymentModal(false); setCurrentInvoiceId(null); resetPaymentForm(); }}
          >
            <div
              style={{
                background: "rgba(17,27,53,0.98)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20,
                padding: isMobile ? "20px" : "28px",
                maxWidth: "660px", width: "100%",
                maxHeight: "calc(100vh - 100px)", overflow: "auto",
                boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
                position: "relative", zIndex: 10005,
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ marginBottom: 20, borderBottom: `1px solid ${T.border}`, paddingBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <h2 style={{ margin: 0, color: T.textPri, fontSize: isMobile ? 20 : 24, fontWeight: 700 }}>
                      💳 Add Payment
                    </h2>
                    <p style={{ margin: "6px 0 0 0", color: T.textSec, fontSize: 13 }}>
                      Record payment for Invoice #{currentInvoiceForPayment.invoiceNumber}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowPaymentModal(false); setCurrentInvoiceId(null); resetPaymentForm(); }}
                    style={{ padding: "7px 12px", background: "rgba(255,107,129,0.15)", color: T.danger, border: `1px solid rgba(255,107,129,0.3)`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {/* Invoice Summary */}
              <div style={{ marginBottom: 20, padding: 16, background: "rgba(79,93,255,0.08)", borderRadius: 12, border: "1px solid rgba(79,93,255,0.2)" }}>
                <h3 style={{ margin: "0 0 12px 0", color: T.accent, fontSize: 16, fontWeight: 600 }}>📄 Invoice Summary</h3>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: T.textMut, marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>Grand Total</div>
                    <div style={{ fontSize: 20, color: T.textPri, fontWeight: 700 }}>₹{(parseFloat(currentInvoiceForPayment.grandTotal) || 0).toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: T.textMut, marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>Already Paid</div>
                    <div style={{ fontSize: 18, color: T.success, fontWeight: 600 }}>₹{(parseFloat(currentInvoiceForPayment.paidAmount) || 0).toFixed(2)}</div>
                  </div>
                  <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                    <div style={{ fontSize: 11, color: T.textMut, marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>Due Amount</div>
                    <div style={{ fontSize: 24, color: currentInvoiceForPayment.dueAmount > 0 ? T.danger : T.success, fontWeight: 800 }}>
                      ₹{(parseFloat(currentInvoiceForPayment.dueAmount) || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Type Selection */}
              <div style={{ marginBottom: 20 }}>
                <label style={darkLabel}>Payment Type *</label>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10 }}>
                  {[
                    { type: "FULL", icon: "💯", label: "Full Payment", amt: (parseFloat(currentInvoiceForPayment.dueAmount) || 0).toFixed(2), accentColor: T.success, accentBg: "rgba(55,227,165,0.15)", accentBorder: "rgba(55,227,165,0.4)" },
                    { type: "HALF", icon: "➗", label: "Half Payment", amt: ((parseFloat(currentInvoiceForPayment.dueAmount) || 0) / 2).toFixed(2), accentColor: T.warning, accentBg: "rgba(255,185,94,0.15)", accentBorder: "rgba(255,185,94,0.4)" },
                    { type: "MANUAL", icon: "✏️", label: "Manual Amount", amt: null, accentColor: T.accent, accentBg: "rgba(79,93,255,0.15)", accentBorder: "rgba(79,93,255,0.4)" },
                  ].map(({ type, icon, label, amt, accentColor, accentBg, accentBorder }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handlePaymentTypeChange(type)}
                      style={{
                        padding: 14, borderRadius: 10,
                        border: paymentForm.paymentType === type ? `2px solid ${accentBorder}` : `1px solid ${T.border}`,
                        background: paymentForm.paymentType === type ? accentBg : "rgba(255,255,255,0.04)",
                        cursor: "pointer", textAlign: "center", transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                      <div style={{ fontWeight: 600, color: T.textPri, fontSize: 13 }}>{label}</div>
                      {amt !== null && <div style={{ fontSize: 12, color: accentColor, marginTop: 4, fontWeight: 600 }}>₹{amt}</div>}
                      {amt === null && <div style={{ fontSize: 12, color: T.textMut, marginTop: 4 }}>Enter custom</div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Details Form */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={darkLabel}>Payment Amount (₹) *</label>
                  <input
                    type="number" required step="0.01" min="0"
                    max={currentInvoiceForPayment.dueAmount || currentInvoiceForPayment.grandTotal}
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value, paymentType: "MANUAL" })}
                    placeholder="0.00"
                    style={{ ...darkInput }}
                    onFocus={e => e.target.style.borderColor = T.accent}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                  />
                  <p style={{ marginTop: 5, color: T.textMut, fontSize: 12 }}>
                    💰 Maximum: ₹{(parseFloat(currentInvoiceForPayment.dueAmount) || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <label style={darkLabel}>Payment Date *</label>
                  <input
                    type="date" required
                    value={paymentForm.paymentDate}
                    onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    style={{ ...darkInput }}
                    onFocus={e => e.target.style.borderColor = T.accent}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                  />
                  <p style={{ marginTop: 5, color: T.textMut, fontSize: 12 }}>📅 Date of payment</p>
                </div>
                <div>
                  <label style={darkLabel}>Payment Mode *</label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={e => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                    style={{ ...darkInput, cursor: "pointer", appearance: "none" }}
                    onFocus={e => e.target.style.borderColor = T.accent}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                  >
                    <option value="CASH" style={{ background: "#111b3d" }}>💵 Cash</option>
                    <option value="UPI" style={{ background: "#111b3d" }}>📱 UPI</option>
                    <option value="BANK" style={{ background: "#111b3d" }}>🏦 Bank Transfer</option>
                    <option value="SPLIT" style={{ background: "#111b3d" }}>💳 Split Payment</option>
                  </select>
                  <p style={{ marginTop: 5, color: T.textMut, fontSize: 12 }}>💳 Payment method</p>
                </div>
              </div>

              {/* Conditional Fields */}
              {paymentForm.paymentMode === "BANK" && (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={darkLabel}>Bank Name</label>
                    <input
                      type="text"
                      value={paymentForm.bankName}
                      onChange={e => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                      placeholder="e.g., State Bank of India"
                      style={{ ...darkInput }}
                      onFocus={e => e.target.style.borderColor = T.accent}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                    />
                  </div>
                  <div>
                    <label style={darkLabel}>Cheque Number</label>
                    <input
                      type="text"
                      value={paymentForm.chequeNumber}
                      onChange={e => setPaymentForm({ ...paymentForm, chequeNumber: e.target.value })}
                      placeholder="e.g., 123456"
                      style={{ ...darkInput }}
                      onFocus={e => e.target.style.borderColor = T.accent}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                    />
                  </div>
                </div>
              )}
              {(paymentForm.paymentMode === "UPI" || paymentForm.paymentMode === "BANK") && (
                <div style={{ marginBottom: 16 }}>
                  <label style={darkLabel}>Transaction ID / Reference Number</label>
                  <input
                    type="text"
                    value={paymentForm.transactionId}
                    onChange={e => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                    placeholder="Enter transaction or reference number"
                    style={{ ...darkInput }}
                    onFocus={e => e.target.style.borderColor = T.accent}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                  />
                  <p style={{ marginTop: 5, color: T.textMut, fontSize: 12 }}>🔗 UPI transaction ID or bank reference number</p>
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                <label style={darkLabel}>Notes (Optional)</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Add any additional notes about this payment..."
                  style={{
                    ...darkInput,
                    height: "auto",
                    minHeight: 90, resize: "vertical", padding: "10px 12px", fontFamily: "inherit",
                  }}
                  onFocus={e => e.target.style.borderColor = T.accent}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
                <p style={{ marginTop: 5, color: T.textMut, fontSize: 12 }}>📝 Additional payment notes or remarks</p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                <button
                  onClick={handleAddPayment}
                  disabled={!paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
                  style={{
                    flex: 1, padding: "13px 24px",
                    background: paymentForm.amount && parseFloat(paymentForm.amount) > 0
                      ? `linear-gradient(135deg, ${T.success}, #2BC893)` : "rgba(255,255,255,0.08)",
                    color: "white", border: "none", borderRadius: 10,
                    cursor: paymentForm.amount && parseFloat(paymentForm.amount) > 0 ? "pointer" : "not-allowed",
                    fontSize: 14, fontWeight: 600,
                    boxShadow: paymentForm.amount && parseFloat(paymentForm.amount) > 0 ? "0 4px 14px rgba(55,227,165,0.3)" : "none",
                  }}
                >
                  ✅ Add Payment
                </button>
                <button
                  onClick={() => { setShowPaymentModal(false); setCurrentInvoiceId(null); resetPaymentForm(); }}
                  style={{ flex: 1, padding: "13px 24px", background: "rgba(255,255,255,0.07)", color: T.textSec, border: `1px solid ${T.border}`, borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 500 }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                  onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
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
              position: 'fixed', inset: 0,
              background: 'rgba(5,11,31,0.85)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10004,
              padding: isMobile ? '70px 12px 12px' : '70px 20px 20px',
            }}
            onClick={() => { setSelectedInvoice(null); setSelectedQuotationDetails(null); }}
          >
            <div
              style={{
                background: 'rgba(17,27,53,0.98)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: 0,
                borderRadius: 16, maxWidth: 1100, width: '100%',
                maxHeight: 'calc(100vh - 90px)', overflow: 'auto',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                position: 'relative', zIndex: 10005,
                display: 'flex', flexDirection: 'column',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* ═══ Sticky header ═══ */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 12px', borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, background: 'rgba(17,27,53,0.98)', zIndex: 10, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.textMut, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Invoice</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: T.textPri, letterSpacing: '-0.02em' }}>{selectedInvoice.invoiceNumber}</span>
                    {getPaymentStatusBadge(selectedInvoice.paymentStatus)}
                  </div>
                  <div style={{ fontSize: 11.5, color: T.textMut, marginTop: 2 }}>
                    {selectedInvoice.invoiceDate}{selectedInvoice.invoiceType ? ` · ${selectedInvoice.invoiceType}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <InvDropdownBtn label="Print" icon="🖨️" iconOnly={isMobile} items={[
                    { icon: '📄', label: 'Final Bill', onClick: async () => { try { const r = await printInvoice(selectedInvoice.id); const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' })); const w = window.open(url, '_blank'); if (w) w.onload = () => w.print(); } catch { toast.error('Failed to print invoice'); } } },
                    { icon: '📋', label: 'Estimate', onClick: async () => { try { const r = await printBasicInvoice(selectedInvoice.id); const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' })); const w = window.open(url, '_blank'); if (w) w.onload = () => w.print(); } catch { toast.error('Failed to print estimate'); } } },
                    { icon: '📦', label: 'Delivery Challan', onClick: async () => { try { const r = await printDeliveryChallan(selectedInvoice.id); const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' })); const w = window.open(url, '_blank'); if (w) w.onload = () => w.print(); } catch { toast.error('Failed to print challan'); } } },
                  ]} />
                  <InvDropdownBtn label="Download" icon="⬇️" iconOnly={isMobile} items={[
                    { icon: '📥', label: 'Final Bill PDF', onClick: async () => { try { const r = await downloadInvoice(selectedInvoice.id); const url = window.URL.createObjectURL(new Blob([r.data])); const a = document.createElement('a'); a.href = url; a.setAttribute('download', `invoice-${selectedInvoice.invoiceNumber}.pdf`); document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url); } catch { toast.error('Failed to download invoice'); } } },
                    { icon: '📋', label: 'Estimate PDF', onClick: async () => { try { const r = await downloadBasicInvoice(selectedInvoice.id); const url = window.URL.createObjectURL(new Blob([r.data])); const a = document.createElement('a'); a.href = url; a.setAttribute('download', `estimate-${selectedInvoice.invoiceNumber}.pdf`); document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url); } catch { toast.error('Failed to download estimate'); } } },
                    { icon: '📦', label: 'Challan PDF', onClick: async () => { try { const r = await downloadTransportChallan(selectedInvoice.id); const url = window.URL.createObjectURL(new Blob([r.data])); const a = document.createElement('a'); a.href = url; a.setAttribute('download', `challan-${selectedInvoice.invoiceNumber}.pdf`); document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url); } catch { toast.error('Failed to download challan'); } } },
                  ]} />
                  <button
                    onClick={() => { setSelectedInvoice(null); setSelectedQuotationDetails(null); }}
                    style={{ width: 32, height: 32, borderRadius: '50%', border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.06)', cursor: 'pointer', fontSize: 14, color: T.textSec, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 140ms ease', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  >✕</button>
                </div>
              </div>

              {/* ═══ Meta strip ═══ */}
              <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)' }}>
                <InvMetaField label="Customer">
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.textPri }}>{selectedInvoice.customerName}</div>
                </InvMetaField>
                <InvMetaField label="Billing">
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.textPri }}>{selectedInvoice.billingType}</span>
                </InvMetaField>
                <InvMetaField label="Type">
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.textPri }}>{selectedInvoice.invoiceType}</span>
                </InvMetaField>
                {selectedInvoice.quotationId && (
                  <InvMetaField label="Quotation">
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.textSec }}>
                      {selectedQuotationDetails?.quotationNumber || `#${selectedInvoice.quotationId}`}
                    </span>
                  </InvMetaField>
                )}
                {selectedInvoice.billingType === 'GST' && selectedInvoice.cgst && (
                  <InvMetaField label="CGST / SGST">
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.textSec }}>
                      ₹{(parseFloat(selectedInvoice.cgst) || 0).toFixed(2)} / ₹{(parseFloat(selectedInvoice.sgst) || 0).toFixed(2)}
                    </span>
                  </InvMetaField>
                )}
                {selectedInvoice.billingType === 'GST' && selectedInvoice.igst && parseFloat(selectedInvoice.igst) > 0 && (
                  <InvMetaField label="IGST">
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.textSec }}>
                      ₹{(parseFloat(selectedInvoice.igst) || 0).toFixed(2)}
                    </span>
                  </InvMetaField>
                )}
              </div>

              {/* ═══ Financial KPI strip ═══ */}
              <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: `1px solid ${T.border}` }}>
                <InvKpiCell label="Grand Total" value={selectedInvoice.grandTotal} highlight />
                <InvKpiCell label="Paid" value={selectedInvoice.paidAmount} color={T.success} />
                <InvKpiCell label="Due" value={selectedInvoice.dueAmount} color={parseFloat(selectedInvoice.dueAmount) > 0 ? T.danger : T.success} />
                {parseFloat(selectedInvoice.subtotal) > 0 && <InvKpiCell label="Subtotal" value={selectedInvoice.subtotal} />}
                {selectedInvoice.billingType === 'GST' && parseFloat(selectedInvoice.gstAmount) > 0 && (
                  <InvKpiCell label={`GST (${selectedInvoice.gstPercentage}%)`} value={selectedInvoice.gstAmount} />
                )}
              </div>

              {/* ═══ Items table ═══ */}
              <div style={{ padding: '0 0 16px', flex: 1 }}>
                <div style={{ padding: '12px 20px 8px', fontSize: 11, fontWeight: 700, color: T.textMut, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Items ({selectedInvoice.items?.length || 0})
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: `1.5px solid ${T.border}` }}>
                        {['#', 'Glass Type', 'Thickness', 'Size', 'Qty', 'Rate/SqFt', 'Amount'].map((h, i) => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: i === 0 || i >= 4 ? 'right' : 'left', fontSize: '10.5px', fontWeight: 700, color: T.textMut, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items?.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 120ms ease' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: T.textMut, fontWeight: 600, width: 32 }}>{idx + 1}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: T.textPri }}>{item.glassType || 'N/A'}</td>
                          <td style={{ padding: '8px 12px', color: T.textSec }}>{item.thickness || '—'}</td>
                          <td style={{ padding: '8px 12px', color: T.textSec, whiteSpace: 'nowrap' }}>{(v => isNaN(parseFloat(v)) ? v : String(parseFloat(v)))(item.height)} × {(v => isNaN(parseFloat(v)) ? v : String(parseFloat(v)))(item.width)} {item.heightUnit === 'MM' ? 'mm' : item.heightUnit === 'INCH' ? 'in' : "ft"}</td>
                          <td style={{ padding: '8px 12px', color: T.textSec, textAlign: 'right' }}>{item.quantity}</td>
                          <td style={{ padding: '8px 12px', color: T.textSec, textAlign: 'right', whiteSpace: 'nowrap' }}>₹{(parseFloat(item.ratePerSqft) || 0).toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: T.success, textAlign: 'right', whiteSpace: 'nowrap' }}>₹{(parseFloat(item.subtotal) || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ═══ Payment history ═══ */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div style={{ padding: '0 0 20px', borderTop: `1px solid ${T.border}` }}>
                  <div style={{ padding: '12px 20px 8px', fontSize: 11, fontWeight: 700, color: T.textMut, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Payment History ({selectedInvoice.payments.length})
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '420px', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: `1.5px solid ${T.border}` }}>
                          {['Date', 'Mode', 'Amount', 'Reference'].map((h, i) => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: i === 2 ? 'right' : 'left', fontSize: '10.5px', fontWeight: 700, color: T.textMut, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.payments.map((payment, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 120ms ease' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '8px 12px', color: T.textSec }}>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                            <td style={{ padding: '8px 12px', color: T.textPri, fontWeight: 500 }}>{payment.paymentMode}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: T.success, textAlign: 'right', whiteSpace: 'nowrap' }}>₹{(parseFloat(payment.amount) || 0).toFixed(2)}</td>
                            <td style={{ padding: '8px 12px', color: T.textMut }}>{payment.transactionId || payment.referenceNumber || '—'}</td>
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
    </div>
  );
}

export default InvoiceManagement;
