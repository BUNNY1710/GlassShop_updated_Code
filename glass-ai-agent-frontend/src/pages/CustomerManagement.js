import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, searchCustomers, getArchitects } from "../api/quotationApi";
import { useResponsive } from "../hooks/useResponsive";

/* ─── dark theme tokens ──────────────────────────────────────────────────────── */
const BG_CARD    = "rgba(17,27,53,0.9)";
const BG_INPUT   = "rgba(255,255,255,0.06)";
const ACCENT     = "#4F5DFF";
const SUCCESS    = "#37E3A5";
const DANGER     = "#FF6B81";
const TEXT_PRI   = "#FFFFFF";
const TEXT_SEC   = "#A9B3D1";
const TEXT_MUT   = "#7180A6";
const BORDER     = "rgba(255,255,255,0.08)";
const BORDER_IN  = "rgba(255,255,255,0.1)";

/* ─── dark input base ────────────────────────────────────────────────────────── */
const darkInput = {
  background: BG_INPUT,
  border: `1.5px solid ${BORDER_IN}`,
  borderRadius: 10,
  height: 44,
  padding: "0 12px",
  color: TEXT_PRI,
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "'Inter',-apple-system,sans-serif",
};
const darkLabel = {
  display: "block",
  marginBottom: 6,
  fontSize: 12.5,
  fontWeight: 600,
  color: TEXT_SEC,
  fontFamily: "'Inter',-apple-system,sans-serif",
};
const darkHint = { marginTop: 4, color: TEXT_MUT, fontSize: 11.5 };
const darkErr  = { marginTop: 4, color: DANGER, fontSize: 11.5, fontWeight: 500 };

/* ── field helpers (module scope — MUST stay outside the component, otherwise
   they get a new identity every render and React remounts the <input> on each
   keystroke, dropping focus and closing the mobile keyboard) ── */
const DField = ({ label, hint, error, type = "text", value, onChange, placeholder, required, maxLength, extraStyle }) => (
  <div>
    {label && <label style={darkLabel}>{label}{required && <span style={{ color: DANGER, marginLeft: 3 }}>*</span>}</label>}
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      required={required} maxLength={maxLength}
      style={{
        ...darkInput, ...(extraStyle || {}),
        border: error ? `1.5px solid ${DANGER}` : `1.5px solid ${BORDER_IN}`,
      }}
      onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = `0 0 0 3px rgba(79,93,255,0.15)`; }}
      onBlur={e => { e.target.style.borderColor = error ? DANGER : BORDER_IN; e.target.style.boxShadow = "none"; }}
    />
    {error ? <p style={darkErr}>⚠️ {error}</p> : hint ? <p style={darkHint}>{hint}</p> : null}
  </div>
);

const DTextarea = ({ label, value, onChange, placeholder }) => (
  <div>
    {label && <label style={darkLabel}>{label}</label>}
    <textarea
      value={value} onChange={onChange} placeholder={placeholder}
      style={{ ...darkInput, height: "auto", minHeight: 90, padding: "10px 12px", resize: "vertical", fontFamily: "inherit" }}
      onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = `0 0 0 3px rgba(79,93,255,0.15)`; }}
      onBlur={e => { e.target.style.borderColor = BORDER_IN; e.target.style.boxShadow = "none"; }}
    />
  </div>
);

function CustomerManagement() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { isMobile, isTablet, isSmallMobile } = useResponsive();

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    address: "",
    gstin: "",
    state: "",
    city: "",
    pincode: "",
    referenceArchitectId: null,
  });
  const [mobileError, setMobileError] = useState("");
  const [architects,   setArchitects]   = useState([]);
  const [archSearch,   setArchSearch]   = useState("");
  const [archDropOpen, setArchDropOpen] = useState(false);
  const [selectedArch, setSelectedArch] = useState(null);

  useEffect(() => {
    loadCustomers();
    loadArchitects();
  }, []);

  const loadArchitects = async () => {
    try {
      const r = await getArchitects();
      setArchitects(r.data || []);
    } catch { /* architects are optional */ }
  };

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim() === "") {
        try {
          setLoading(true);
          setMessage("");
          const response = await getCustomers();
          setCustomers(response.data);
        } catch (error) {
          setMessage("❌ Failed to load customers");
        } finally {
          setLoading(false);
        }
      } else {
        try {
          setLoading(true);
          setMessage("");
          const response = await searchCustomers(searchQuery.trim());
          setCustomers(response.data);
          if (response.data.length === 0) {
            setMessage("No customers found matching your search");
          } else {
            setMessage("");
          }
        } catch (error) {
          console.error("Search error:", error);
          setMessage("❌ Failed to search customers");
          try {
            const response = await getCustomers();
            setCustomers(response.data);
          } catch (loadError) {
            console.error("Load error:", loadError);
          }
        } finally {
          setLoading(false);
        }
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await getCustomers();
      setCustomers(response.data);
    } catch (error) {
      setMessage("❌ Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadCustomers();
      setMessage("");
      return;
    }
    try {
      setLoading(true);
      setMessage("");
      const response = await searchCustomers(searchQuery);
      setCustomers(response.data);
      if (response.data.length === 0) {
        setMessage("No customers found matching your search");
      } else {
        setMessage("");
      }
    } catch (error) {
      console.error("Search error:", error);
      setMessage("❌ Failed to search customers");
      loadCustomers();
    } finally {
      setLoading(false);
    }
  };

  const validateMobile = (mobile) => {
    if (!mobile || mobile.trim() === "") return "";
    const cleaned = mobile.replace(/[\s\-\(\)]/g, "");
    if (cleaned.startsWith("+91")) {
      const digits = cleaned.substring(3);
      if (digits.length === 10 && /^\d+$/.test(digits)) return "";
      return "Mobile number with +91 must have 10 digits after country code";
    }
    if (/^\d+$/.test(cleaned)) {
      if (cleaned.length === 10) return "";
      return "Mobile number must be exactly 10 digits";
    }
    return "Mobile number must contain only digits (or +91 followed by 10 digits)";
  };

  const handleMobileChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, mobile: value });
    const error = validateMobile(value);
    setMobileError(error);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setMobileError("");
    const mobileValidationError = validateMobile(formData.mobile);
    if (mobileValidationError) {
      setMobileError(mobileValidationError);
      setMessage(`❌ ${mobileValidationError}`);
      return;
    }
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, formData);
        setMessage("✅ Customer updated successfully");
      } else {
        await createCustomer(formData);
        setMessage("✅ Customer created successfully");
      }
      setShowForm(false);
      setEditingCustomer(null);
      resetForm();
      setMobileError("");
      loadCustomers();
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to save customer";
      setMessage(`❌ ${errorMessage}`);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || "",
      mobile: customer.mobile || "",
      email: customer.email || "",
      address: customer.address || "",
      gstin: customer.gstin || "",
      state: customer.state || "",
      city: customer.city || "",
      pincode: customer.pincode || "",
      referenceArchitectId: customer.referenceArchitectId || null,
    });
    const arch = customer.referenceArchitect || architects.find(a => a.id === customer.referenceArchitectId);
    setSelectedArch(arch || null);
    setArchSearch(arch ? arch.name : "");
    setMobileError("");
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      mobile: "",
      email: "",
      address: "",
      gstin: "",
      state: "",
      city: "",
      pincode: "",
      referenceArchitectId: null,
    });
    setMobileError("");
    setSelectedArch(null);
    setArchSearch("");
    setArchDropOpen(false);
  };

  const handleDelete = async (customerId) => {
    try {
      await deleteCustomer(customerId);
      setMessage("✅ Customer deleted successfully");
      setConfirmDelete(null);
      loadCustomers();
    } catch (error) {
      setMessage("❌ Failed to delete customer");
      setConfirmDelete(null);
    }
  };

  const sectionTitle = { color: TEXT_SEC, fontSize: 13, fontWeight: 700, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" };

  return (
    <div style={{ padding: "16px 16px 24px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: TEXT_PRI, margin: "0 0 4px", letterSpacing: "-0.02em" }}>Customers</h1>
          <p style={{ fontSize: 13, color: TEXT_SEC, margin: 0 }}>Manage your customer database — add, edit, and search</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingCustomer(null); resetForm(); }}
          style={{ background: ACCENT, color: "#fff", height: 36, padding: "0 16px", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#3D4DE8"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          + Add Customer
        </button>
      </div>

      {/* Message banner */}
      {message && (
        <div style={{
          padding: "10px 14px", marginBottom: 16, borderRadius: 10, fontSize: 13, fontWeight: 500,
          background: message.includes("✅") ? "rgba(55,227,165,0.12)" : "rgba(255,107,129,0.12)",
          border: `1px solid ${message.includes("✅") ? "rgba(55,227,165,0.3)" : "rgba(255,107,129,0.3)"}`,
          color: message.includes("✅") ? SUCCESS : DANGER,
        }}>
          {message}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, position: "relative", maxWidth: isMobile ? "100%" : 300 }}>
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: TEXT_MUT, fontSize: 14, pointerEvents: "none" }}>🔍</span>
          <input
            type="text"
            placeholder="Search customers…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            style={{
              ...darkInput,
              height: 40, paddingLeft: 36, fontSize: 13,
            }}
            onFocus={e => { e.target.style.borderColor = "rgba(79,93,255,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(79,93,255,0.15)"; }}
            onBlur={e => { e.target.style.borderColor = BORDER_IN; e.target.style.boxShadow = "none"; }}
          />
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(5,11,31,0.85)", backdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => { setShowForm(false); setEditingCustomer(null); resetForm(); }}
        >
          <div
            style={{ background: "rgba(17,27,53,0.98)", border: `1px solid ${BORDER_IN}`, borderRadius: 20, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_PRI }}>
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </div>
              <button
                onClick={() => { setShowForm(false); setEditingCustomer(null); resetForm(); }}
                style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "none", color: TEXT_SEC, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
              >✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ padding: "18px 20px" }}>
                {/* Basic Info */}
                <div style={{ marginBottom: 22 }}>
                  <div style={sectionTitle}>Basic Information</div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                    <DField label="Customer Name" required value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., John Doe, ABC Enterprises"
                      hint="Full name or company name" />
                    <div>
                      <label style={darkLabel}>Mobile Number</label>
                      <input
                        type="text"
                        value={formData.mobile}
                        onChange={handleMobileChange}
                        onBlur={() => { const error = validateMobile(formData.mobile); setMobileError(error); }}
                        placeholder="e.g., 9876543210"
                        maxLength={15}
                        style={{ ...darkInput, border: mobileError ? `1.5px solid ${DANGER}` : `1.5px solid ${BORDER_IN}` }}
                        onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = `0 0 0 3px rgba(79,93,255,0.15)`; }}
                      />
                      {mobileError
                        ? <p style={darkErr}>⚠️ {mobileError}</p>
                        : <p style={darkHint}>10 digits or +91 followed by 10 digits</p>}
                    </div>
                    <DField label="Email Address" type="email" value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="customer@example.com" hint="Optional" />
                    <DField label="GSTIN (Optional)" value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                      placeholder="e.g., 27ABCDE1234F1Z5" maxLength="15"
                      hint="15-character GST identification number" />
                  </div>
                </div>

                {/* Reference */}
                <div style={{ marginBottom: 22 }}>
                  <div style={sectionTitle}>Reference (Architect)</div>
                  <div style={{ position: "relative", maxWidth: isMobile ? "100%" : "50%" }}>
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
                          ...darkInput,
                          background: selectedArch ? "rgba(55,227,165,0.08)" : BG_INPUT,
                          border: `1.5px solid ${selectedArch ? "rgba(55,227,165,0.3)" : BORDER_IN}`,
                          paddingRight: 36,
                        }}
                        onFocus2={e => { e.target.style.borderColor = ACCENT; }}
                      />
                      {selectedArch && (
                        <button type="button"
                          onClick={() => { setSelectedArch(null); setArchSearch(""); setFormData(p => ({ ...p, referenceArchitectId: null })); }}
                          style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: TEXT_MUT, fontSize: 14 }}
                        >✕</button>
                      )}
                    </div>
                    {archDropOpen && (
                      <div style={{
                        position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 1000,
                        background: "rgba(17,27,53,0.98)", border: `1px solid ${BORDER_IN}`, borderRadius: 10,
                        boxShadow: "0 8px 25px rgba(0,0,0,0.4)", maxHeight: 220, overflowY: "auto",
                      }}>
                        <div
                          onMouseDown={() => { setSelectedArch(null); setArchSearch(""); setFormData(p => ({ ...p, referenceArchitectId: null })); setArchDropOpen(false); }}
                          style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, color: TEXT_MUT, borderBottom: `1px solid ${BORDER}` }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >— None</div>
                        {architects.filter(a => !archSearch.trim() || a.name.toLowerCase().includes(archSearch.toLowerCase()) || a.mobile.includes(archSearch))
                          .map(a => (
                            <div key={a.id}
                              onMouseDown={() => { setSelectedArch(a); setArchSearch(a.name); setFormData(p => ({ ...p, referenceArchitectId: a.id })); setArchDropOpen(false); }}
                              style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${BORDER}`, background: selectedArch?.id === a.id ? "rgba(79,93,255,0.15)" : "transparent" }}
                              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                              onMouseLeave={e => e.currentTarget.style.background = selectedArch?.id === a.id ? "rgba(79,93,255,0.15)" : "transparent"}
                            >
                              <div style={{ fontWeight: 600, fontSize: 13, color: TEXT_PRI }}>🏛️ {a.name}</div>
                              <div style={{ fontSize: 12, color: TEXT_MUT }}>📱 {a.mobile}</div>
                            </div>
                          ))}
                        {architects.filter(a => !archSearch.trim() || a.name.toLowerCase().includes(archSearch.toLowerCase()) || a.mobile.includes(archSearch)).length === 0 && (
                          <div style={{ padding: "12px 14px", fontSize: 13, color: TEXT_MUT, textAlign: "center" }}>No architects found</div>
                        )}
                      </div>
                    )}
                    {selectedArch && (
                      <p style={{ marginTop: 6, fontSize: 12, color: SUCCESS, fontWeight: 500 }}>
                        ✅ {selectedArch.name} · 📱 {selectedArch.mobile}{selectedArch.email ? ` · 📧 ${selectedArch.email}` : ""}
                      </p>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div style={{ marginBottom: 22 }}>
                  <div style={sectionTitle}>Address Information</div>
                  <div style={{ marginBottom: 16 }}>
                    <DTextarea label="Full Address" value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Street, Building, Area…" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 16 }}>
                    <DField label="State" value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="e.g., Maharashtra" />
                    <DField label="City" value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g., Mumbai" />
                    <DField label="Pincode" value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="e.g., 400001" maxLength="6" />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: `1px solid ${BORDER}` }}>
                <button type="button"
                  onClick={() => { setShowForm(false); setEditingCustomer(null); resetForm(); }}
                  style={{ height: 36, padding: "0 16px", borderRadius: 10, border: `1px solid ${BORDER_IN}`, background: "transparent", color: TEXT_SEC, fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                >Cancel</button>
                <button type="submit"
                  style={{ height: 36, padding: "0 16px", borderRadius: 10, border: "none", background: ACCENT, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#3D4DE8"}
                  onMouseLeave={e => e.currentTarget.style.background = ACCENT}
                >
                  {editingCustomer ? "Update Customer" : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table card */}
      <div style={{ background: "#111B35", border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: TEXT_MUT, padding: 40, fontSize: 14 }}>Loading customers…</div>
        ) : customers.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>👥</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: TEXT_SEC, margin: "0 0 6px" }}>No customers found</p>
            <p style={{ fontSize: 13, color: TEXT_MUT, margin: 0 }}>
              {searchQuery ? "Try a different search term" : "Click '+ Add Customer' to create your first customer"}
            </p>
          </div>
        ) : isMobile ? (
          /* Mobile card view */
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12 }}>
            {customers.map((customer) => (
              <div key={customer.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 14, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0", marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${BORDER}` }}>
                  👤 {customer.name || <span style={{ color: TEXT_MUT, fontWeight: 400, fontStyle: "italic" }}>Unnamed</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10, fontSize: 13 }}>
                  {customer.mobile && <span style={{ color: TEXT_SEC }}>📱 {customer.mobile}</span>}
                  {customer.email && <span style={{ color: TEXT_SEC, wordBreak: "break-word" }}>📧 {customer.email}</span>}
                  {customer.gstin && <span style={{ color: TEXT_SEC }}>🧾 {customer.gstin}</span>}
                  {(customer.state || customer.city) && (
                    <span style={{ color: TEXT_SEC }}>📍 {customer.city && customer.state ? `${customer.city}, ${customer.state}` : customer.city || customer.state}</span>
                  )}
                  {customer.referenceArchitect && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(55,227,165,0.1)", border: "1px solid rgba(55,227,165,0.2)", borderRadius: 6, padding: "3px 8px", fontSize: 12, color: SUCCESS, fontWeight: 500 }}>
                      🏛️ {customer.referenceArchitect.name}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                  <button onClick={() => handleEdit(customer)}
                    style={{ flex: 1, height: 32, borderRadius: 8, border: `1px solid rgba(79,93,255,0.3)`, background: "rgba(79,93,255,0.1)", color: "#818CF8", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                    ✏️ Edit
                  </button>
                  <button onClick={() => setConfirmDelete({ id: customer.id, name: customer.name })}
                    style={{ flex: 1, height: 32, borderRadius: 8, border: `1px solid rgba(255,107,129,0.3)`, background: "rgba(255,107,129,0.1)", color: DANGER, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop table */
          <div style={{ overflowX: "auto", background: "#111B35" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Name", "Contact", "Email", "GSTIN", "Location", "Ref. Architect", "Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", fontSize: 10.5, fontWeight: 700, color: TEXT_MUT, borderBottom: `1px solid rgba(255,255,255,0.07)`, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}
                    onMouseEnter={e => e.currentTarget.style.background = "#0A0F1E"}
                    onMouseLeave={e => e.currentTarget.style.background = "#111B35"}
                    style={{ transition: "background 120ms ease", background: "#111B35" }}
                  >
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid rgba(255,255,255,0.05)`, color: "#E2E8F0", fontSize: 13, fontWeight: 700, verticalAlign: "middle" }}>
                      👤 {customer.name || <span style={{ color: TEXT_MUT, fontWeight: 400, fontStyle: "italic" }}>Unnamed</span>}
                    </td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid rgba(255,255,255,0.05)`, color: TEXT_SEC, fontSize: 13, verticalAlign: "middle" }}>
                      {customer.mobile ? <span>📱 {customer.mobile}</span> : <span style={{ color: TEXT_MUT }}>—</span>}
                    </td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid rgba(255,255,255,0.05)`, color: TEXT_SEC, fontSize: 13, verticalAlign: "middle" }}>
                      {customer.email ? <span>📧 {customer.email}</span> : <span style={{ color: TEXT_MUT }}>—</span>}
                    </td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid rgba(255,255,255,0.05)`, color: TEXT_SEC, fontSize: 13, verticalAlign: "middle" }}>
                      {customer.gstin ? <span>🧾 {customer.gstin}</span> : <span style={{ color: TEXT_MUT }}>—</span>}
                    </td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid rgba(255,255,255,0.05)`, color: TEXT_SEC, fontSize: 13, verticalAlign: "middle" }}>
                      {customer.state || customer.city
                        ? <span>{customer.city && customer.state ? `${customer.city}, ${customer.state}` : customer.city || customer.state}</span>
                        : <span style={{ color: TEXT_MUT }}>—</span>}
                    </td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid rgba(255,255,255,0.05)`, verticalAlign: "middle" }}>
                      {customer.referenceArchitect
                        ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(55,227,165,0.1)", border: "1px solid rgba(55,227,165,0.2)", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: SUCCESS, fontWeight: 600, whiteSpace: "nowrap" }}>🏛️ {customer.referenceArchitect.name}</span>
                        : <span style={{ color: TEXT_MUT }}>—</span>}
                    </td>
                    <td style={{ padding: "7px 14px", borderBottom: `1px solid rgba(255,255,255,0.05)`, verticalAlign: "middle" }}>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <button title="Edit" onClick={() => handleEdit(customer)}
                          style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${BORDER_IN}`, background: "transparent", color: TEXT_SEC, cursor: "pointer", fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all 120ms ease" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(79,93,255,0.2)"; e.currentTarget.style.color = "#818CF8"; e.currentTarget.style.borderColor = "rgba(79,93,255,0.3)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = TEXT_SEC; e.currentTarget.style.borderColor = BORDER_IN; }}>✏️</button>
                        <button title="Delete" onClick={() => setConfirmDelete({ id: customer.id, name: customer.name })}
                          style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${BORDER_IN}`, background: "transparent", color: TEXT_SEC, cursor: "pointer", fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all 120ms ease" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,107,129,0.2)"; e.currentTarget.style.color = DANGER; e.currentTarget.style.borderColor = "rgba(255,107,129,0.3)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = TEXT_SEC; e.currentTarget.style.borderColor = BORDER_IN; }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(5,11,31,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            style={{ background: "rgba(17,27,53,0.98)", border: `1px solid ${BORDER_IN}`, borderRadius: 20, maxWidth: 440, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", padding: "28px 24px" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
              <h2 style={{ margin: "0 0 8px", color: TEXT_PRI, fontSize: 20, fontWeight: 700 }}>Delete Customer?</h2>
              <p style={{ margin: 0, color: TEXT_SEC, fontSize: 14, lineHeight: 1.6 }}>
                Are you sure you want to permanently delete <strong style={{ color: TEXT_PRI }}>"{confirmDelete.name}"</strong>? This cannot be undone.
              </p>
              <div style={{ marginTop: 14, padding: 12, background: "rgba(255,107,129,0.08)", borderRadius: 10, textAlign: "left", border: `1px solid rgba(255,107,129,0.2)` }}>
                <div style={{ fontSize: 13, color: DANGER, marginBottom: 4, fontWeight: 600 }}>⚠️ Warning:</div>
                <div style={{ fontSize: 12, color: TEXT_SEC }}>If this customer has associated quotations or invoices, they may be affected.</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
              <button onClick={() => handleDelete(confirmDelete.id)}
                style={{ flex: 1, height: 40, borderRadius: 10, border: "none", background: DANGER, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#E0556A"}
                onMouseLeave={e => e.currentTarget.style.background = DANGER}
              >Delete</button>
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, height: 40, borderRadius: 10, border: `1px solid ${BORDER_IN}`, background: "transparent", color: TEXT_SEC, fontSize: 14, fontWeight: 500, cursor: "pointer" }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Next Button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
        <button
          onClick={() => navigate("/quotations")}
          style={{ background: ACCENT, color: "#fff", height: 36, padding: "0 18px", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = "#3D4DE8"}
          onMouseLeave={e => e.currentTarget.style.background = ACCENT}
        >Next: Quotations →</button>
      </div>
    </div>
  );
}

export default CustomerManagement;
