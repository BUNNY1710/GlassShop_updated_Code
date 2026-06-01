import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../components/PageWrapper";
import dashboardBg from "../assets/dashboard-bg.jpg";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, searchCustomers, getArchitects } from "../api/quotationApi";
import { useResponsive } from "../hooks/useResponsive";
import { Button } from "../components/ui";
import "../styles/design-system.css";

/* ─── shared inline styles ─────────────────────────────────────────────────── */
const inputCss = {
  width: "100%", padding: "9px 12px", borderRadius: "8px",
  border: "1.5px solid #e2e8f0", fontSize: "13.5px",
  background: "#fff", color: "#0f172a", boxSizing: "border-box",
  fontFamily: "'Inter',-apple-system,sans-serif", outline: "none",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
};
const focusCss  = { borderColor: "#6366f1", boxShadow: "0 0 0 3px rgba(99,102,241,.12)" };
const blurCss   = { borderColor: "#e2e8f0", boxShadow: "none" };
const labelCss  = { display: "block", marginBottom: "5px", fontSize: "12.5px", fontWeight: 600, color: "#475569", fontFamily: "'Inter',-apple-system,sans-serif" };
const hintCss   = { marginTop: "4px", color: "#94a3b8", fontSize: "11.5px" };
const errCss    = { marginTop: "4px", color: "#dc2626", fontSize: "11.5px", fontWeight: 500 };

function FInput({ label, hint, error, type = "text", value, onChange, placeholder, required, maxLength }) {
  return (
    <div>
      {label && <label style={labelCss}>{label}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        required={required} maxLength={maxLength}
        style={inputCss}
        onFocus={e => Object.assign(e.target.style, focusCss)}
        onBlur={e => Object.assign(e.target.style, blurCss)} />
      {error ? <p style={errCss}>⚠️ {error}</p> : hint ? <p style={hintCss}>{hint}</p> : null}
    </div>
  );
}

function FTextarea({ label, hint, value, onChange, placeholder }) {
  return (
    <div>
      {label && <label style={labelCss}>{label}</label>}
      <textarea value={value} onChange={onChange} placeholder={placeholder}
        style={{ ...inputCss, minHeight: "90px", resize: "vertical", fontFamily: "inherit" }}
        onFocus={e => Object.assign(e.target.style, focusCss)}
        onBlur={e => Object.assign(e.target.style, blurCss)} />
      {hint && <p style={hintCss}>{hint}</p>}
    </div>
  );
}

function CustomerManagement() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { isMobile, isTablet, isSmallMobile } = useResponsive(); // Use responsive hook

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
  const [architects,     setArchitects]     = useState([]);
  const [archSearch,     setArchSearch]     = useState("");
  const [archDropOpen,   setArchDropOpen]   = useState(false);
  const [selectedArch,   setSelectedArch]   = useState(null);

  useEffect(() => {
    loadCustomers();
    loadArchitects();
    // Removed manual resize handler - useResponsive hook handles it
  }, []);

  const loadArchitects = async () => {
    try {
      const r = await getArchitects();
      setArchitects(r.data || []);
    } catch { /* architects are optional */ }
  };

  // Live search with debouncing
  useEffect(() => {
    // Clear any existing timeout
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim() === "") {
        // If search is empty, load all customers
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
        // Perform search
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
          // On error, reload all customers
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
    }, 500); // 500ms debounce delay

    // Cleanup timeout on unmount or when searchQuery changes
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
      setMessage(""); // Clear any previous messages
      const response = await searchCustomers(searchQuery);
      setCustomers(response.data);
      if (response.data.length === 0) {
        setMessage("No customers found matching your search");
      } else {
        setMessage(""); // Clear message if results found
      }
    } catch (error) {
      console.error("Search error:", error);
      setMessage("❌ Failed to search customers");
      // On error, reload all customers
      loadCustomers();
    } finally {
      setLoading(false);
    }
  };

  // Validate mobile number
  const validateMobile = (mobile) => {
    if (!mobile || mobile.trim() === "") {
      return ""; // Mobile is optional, so empty is valid
    }
    
    // Remove spaces, dashes, and parentheses
    const cleaned = mobile.replace(/[\s\-\(\)]/g, "");
    
    // Check if it starts with +91 (India country code)
    if (cleaned.startsWith("+91")) {
      const digits = cleaned.substring(3);
      if (digits.length === 10 && /^\d+$/.test(digits)) {
        return "";
      }
      return "Mobile number with +91 must have 10 digits after country code";
    }
    
    // Check if it's just digits (10 digits for Indian numbers)
    if (/^\d+$/.test(cleaned)) {
      if (cleaned.length === 10) {
        return "";
      }
      return "Mobile number must be exactly 10 digits";
    }
    
    return "Mobile number must contain only digits (or +91 followed by 10 digits)";
  };

  // Handle mobile number input change
  const handleMobileChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, mobile: value });
    
    // Validate on change
    const error = validateMobile(value);
    setMobileError(error);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setMobileError("");

    // Validate mobile number before submission
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
    // Restore the selected architect label
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

  return (
    <PageWrapper backgroundImage={dashboardBg}>
      <div style={{ padding: isMobile ? "15px" : "20px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "25px", padding: "20px", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: "12px", backdropFilter: "blur(10px)" }}>
          <h1 style={{ color: "#fff", marginBottom: "8px", fontSize: isMobile ? "26px" : "32px", fontWeight: "800", textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}>
            👥 Customer Management
          </h1>
          <p style={{ color: "#fff", fontSize: "15px", margin: 0, fontWeight: "500", textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>
            Manage your customer database - add, edit, and search customers
          </p>
        </div>

        {message && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: "20px",
              backgroundColor: message.includes("✅") ? "#22c55e" : "#ef4444",
              color: "white",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            {message}
          </div>
        )}

        {/* Toolbar */}
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <div style={{ flex: 1, position: "relative", maxWidth: isMobile ? "100%" : 280 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, pointerEvents: "none", color: "#94a3b8" }}>🔍</span>
            <input
              type="text"
              placeholder="Search customers…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="search-input"
              style={{ maxWidth: "100%", width: "100%" }}
            />
          </div>
          <Button size="sm" variant="outline" onClick={handleSearch}>Search</Button>
          <Button
            size="sm" variant="success" icon="+"
            onClick={() => { setShowForm(true); setEditingCustomer(null); resetForm(); }}
            style={{ marginLeft: "auto" }}
          >
            Add Customer
          </Button>
        </div>

        {showForm && (
          <div
            style={{
              backgroundColor: "white",
              padding: isMobile ? "20px" : "30px",
              borderRadius: "12px",
              marginBottom: "20px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            }}
          >
            <div style={{ marginBottom: "25px", borderBottom: "2px solid #e5e7eb", paddingBottom: "15px" }}>
              <h2 style={{ margin: 0, color: "#1f2937", fontSize: isMobile ? "20px" : "24px", fontWeight: "600" }}>
                {editingCustomer ? "✏️ Edit Customer" : "➕ Add New Customer"}
              </h2>
              <p style={{ margin: "5px 0 0 0", color: "#6b7280", fontSize: "14px" }}>
                {editingCustomer
                  ? "Update customer information below"
                  : "Fill in the customer details to add them to your database"}
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              {/* Basic Information */}
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#374151", fontSize: "18px", fontWeight: "600", marginBottom: "15px" }}>
                  👤 Basic Information
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: "20px",
                  }}
                >
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Customer Name * <span style={{ color: "#ef4444" }}>●</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., John Doe, ABC Enterprises"
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
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>📝 Full name or company name</p>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Mobile Number {formData.mobile && <span style={{ color: "#ef4444" }}>*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.mobile}
                      onChange={handleMobileChange}
                      onBlur={(e) => {
                        e.target.style.borderColor = mobileError ? "#ef4444" : "#d1d5db";
                        // Validate on blur as well
                        const error = validateMobile(formData.mobile);
                        setMobileError(error);
                      }}
                      placeholder="e.g., 9876543210 or +91 9876543210"
                      maxLength={15}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: mobileError ? "2px solid #ef4444" : "1px solid #d1d5db",
                        fontSize: "14px",
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                        backgroundColor: mobileError ? "#fef2f2" : "white",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = mobileError ? "#ef4444" : "#6366f1";
                        e.target.style.backgroundColor = mobileError ? "#fef2f2" : "white";
                      }}
                    />
                    {mobileError ? (
                      <p style={{ marginTop: "5px", color: "#ef4444", fontSize: "12px", fontWeight: "500" }}>
                        ⚠️ {mobileError}
                      </p>
                    ) : (
                      <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>
                        📱 10 digits (e.g., 9876543210) or with country code (e.g., +91 9876543210)
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g., customer@example.com"
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
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>📧 Customer email (optional)</p>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                      placeholder="e.g., 27ABCDE1234F1Z5"
                      maxLength="15"
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
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>🧾 15-character GST identification number</p>
                  </div>
                </div>
              </div>

              {/* Reference By (Architect) */}
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#374151", fontSize: "18px", fontWeight: "600", marginBottom: "15px" }}>
                  🏛️ Reference
                </h3>
                <div style={{ position: "relative", maxWidth: isMobile ? "100%" : "50%" }}>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                    Reference By (Architect)
                  </label>
                  {/* Searchable dropdown trigger */}
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder="🏛️ Search architect or type name…"
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
                        width: "100%", padding: "12px 38px 12px 12px", borderRadius: "8px",
                        border: "1px solid #d1d5db", fontSize: "14px", boxSizing: "border-box",
                        transition: "all 0.2s", backgroundColor: selectedArch ? "#f0fdf4" : "white",
                      }}
                      onFocusCapture={e => { e.target.style.borderColor = "#6366f1"; }}
                      onBlurCapture={e => { e.target.style.borderColor = "#d1d5db"; }}
                    />
                    {/* Clear button */}
                    {selectedArch && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedArch(null);
                          setArchSearch("");
                          setFormData(p => ({ ...p, referenceArchitectId: null }));
                        }}
                        style={{
                          position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                          background: "none", border: "none", cursor: "pointer", color: "#94a3b8",
                          fontSize: "16px", padding: "2px 4px",
                        }}
                        title="Clear selection"
                      >✕</button>
                    )}
                  </div>
                  {/* Dropdown */}
                  {archDropOpen && (
                    <div style={{
                      position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000,
                      background: "white", border: "1px solid #d1d5db", borderRadius: "8px",
                      boxShadow: "0 8px 25px rgba(0,0,0,0.12)", maxHeight: "220px", overflowY: "auto",
                      marginTop: "2px",
                    }}>
                      <div
                        onMouseDown={() => {
                          setSelectedArch(null);
                          setArchSearch("");
                          setFormData(p => ({ ...p, referenceArchitectId: null }));
                          setArchDropOpen(false);
                        }}
                        style={{
                          padding: "10px 14px", cursor: "pointer", fontSize: "13px",
                          color: "#94a3b8", borderBottom: "1px solid #f1f5f9",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8fafc"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        — None
                      </div>
                      {architects
                        .filter(a =>
                          !archSearch.trim() ||
                          a.name.toLowerCase().includes(archSearch.toLowerCase()) ||
                          a.mobile.includes(archSearch)
                        )
                        .map(a => (
                          <div
                            key={a.id}
                            onMouseDown={() => {
                              setSelectedArch(a);
                              setArchSearch(a.name);
                              setFormData(p => ({ ...p, referenceArchitectId: a.id }));
                              setArchDropOpen(false);
                            }}
                            style={{
                              padding: "10px 14px", cursor: "pointer",
                              borderBottom: "1px solid #f1f5f9", transition: "background 0.15s",
                              backgroundColor: selectedArch?.id === a.id ? "#f0fdf4" : "transparent",
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f5f3ff"}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedArch?.id === a.id ? "#f0fdf4" : "transparent"}
                          >
                            <div style={{ fontWeight: 600, fontSize: "13px", color: "#0f172a" }}>
                              🏛️ {a.name}
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>📱 {a.mobile}</div>
                          </div>
                        ))
                      }
                      {architects.filter(a =>
                        !archSearch.trim() ||
                        a.name.toLowerCase().includes(archSearch.toLowerCase()) ||
                        a.mobile.includes(archSearch)
                      ).length === 0 && (
                        <div style={{ padding: "12px 14px", fontSize: 13, color: "#94a3b8", textAlign: "center" }}>
                          No architects found
                        </div>
                      )}
                    </div>
                  )}
                  {selectedArch && (
                    <p style={{ marginTop: "6px", fontSize: "12px", color: "#16a34a", fontWeight: 500 }}>
                      ✅ {selectedArch.name} · 📱 {selectedArch.mobile}
                      {selectedArch.email ? ` · 📧 ${selectedArch.email}` : ""}
                    </p>
                  )}
                  {!selectedArch && (
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>
                      🏛️ Architect who referred this customer (optional)
                    </p>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#374151", fontSize: "18px", fontWeight: "600", marginBottom: "15px" }}>
                  📍 Address Information
                </h3>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                    Full Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g., 123 Main Street, Building Name, Area Name"
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
                  <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>🏠 Complete address with street, building, area</p>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
                    gap: "20px",
                  }}
                >
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="e.g., Maharashtra, Karnataka"
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
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>📍 State name</p>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g., Mumbai, Bangalore"
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
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>🏙️ City name</p>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="e.g., 400001, 560001"
                      maxLength="6"
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
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>📮 6-digit postal code</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: "15px",
                  paddingTop: "20px",
                  borderTop: "2px solid #e5e7eb",
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  fullWidth={isMobile}
                  onClick={() => { setShowForm(false); setEditingCustomer(null); resetForm(); }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  size="md"
                  fullWidth={isMobile}
                >
                  {editingCustomer ? "Update Customer" : "Save Customer"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div
            style={{
              textAlign: "center",
              color: "#64748b",
              padding: "40px",
              backgroundColor: "#f8fafc",
              borderRadius: "12px",
              fontSize: "16px",
            }}
          >
            ⏳ Loading customers...
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            }}
          >
            <div style={{ padding: "20px", borderBottom: "2px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
              <h3 style={{ margin: 0, color: "#1f2937", fontSize: "18px", fontWeight: "600" }}>
                📋 Customer List ({customers.length} {customers.length === 1 ? "customer" : "customers"})
              </h3>
            </div>
            {/* Mobile Card View */}
            {isMobile && customers.length > 0 && (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                width: "100%",
              }}>
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      padding: "16px",
                      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    {/* Customer Name - Header */}
                    <div style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#1f2937",
                      marginBottom: "12px",
                      paddingBottom: "12px",
                      borderBottom: "1px solid #e5e7eb",
                    }}>
                      {customer.name}
                    </div>

                    {/* Contact Info */}
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      marginBottom: "12px",
                    }}>
                      {customer.mobile && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4b5563" }}>
                          <span>📱</span>
                          <span>{customer.mobile}</span>
                        </div>
                      )}
                      {customer.email && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4b5563" }}>
                          <span>📧</span>
                          <span style={{ fontSize: "14px", wordBreak: "break-word" }}>{customer.email}</span>
                        </div>
                      )}
                      {customer.gstin && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4b5563" }}>
                          <span>🧾</span>
                          <span>{customer.gstin}</span>
                        </div>
                      )}
                      {(customer.state || customer.city) && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4b5563" }}>
                          <span>📍</span>
                          <span>
                            {customer.city && customer.state ? `${customer.city}, ${customer.state}` : customer.city || customer.state}
                          </span>
                        </div>
                      )}
                      {customer.referenceArchitect && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px",
                          background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6,
                          padding: "3px 8px", fontSize: 12, color: "#16a34a", fontWeight: 500 }}>
                          🏛️ {customer.referenceArchitect.name}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{
                      display: "flex", gap: "8px",
                      flexDirection: isSmallMobile ? "column" : "row",
                      marginTop: "10px", paddingTop: "10px",
                      borderTop: "1px solid #f1f5f9",
                    }}>
                      <Button
                        variant="outline" size="sm"
                        fullWidth={isSmallMobile}
                        icon="✏️"
                        onClick={() => handleEdit(customer)}
                      >Edit</Button>
                      <Button
                        variant="danger" size="sm"
                        fullWidth={isSmallMobile}
                        icon="🗑️"
                        onClick={() => setConfirmDelete({ id: customer.id, name: customer.name })}
                      >Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {customers.length === 0 && (
              <div
                style={{
                  padding: "60px 20px",
                  textAlign: "center",
                  color: "#6b7280",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.5 }}>👥</div>
                <p style={{ fontSize: "16px", fontWeight: "500", marginBottom: "8px" }}>No customers found</p>
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>
                  {searchQuery
                    ? "Try a different search term or clear the search"
                    : "Click 'Add Customer' to create your first customer"}
                </p>
              </div>
            )}

            {/* Desktop Table View */}
            {!isMobile && customers.length > 0 && (
              <div
                style={{
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                  width: "100%",
                }}
                className="table-wrapper"
              >
                <table style={{ 
                  width: "100%", 
                  borderCollapse: "collapse", 
                  fontSize: "14px",
                }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f3f4f6" }}>
                      <th
                        style={{
                          padding: isMobile ? "10px 8px" : "16px",
                          textAlign: "left",
                          color: "#374151",
                          fontWeight: "600",
                          fontSize: isMobile ? "12px" : "13px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Name
                      </th>
                      <th
                        style={{
                          padding: isMobile ? "10px 8px" : "16px",
                          textAlign: "left",
                          color: "#374151",
                          fontWeight: "600",
                          fontSize: isMobile ? "12px" : "13px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Contact
                      </th>
                      {!isMobile && (
                        <>
                          <th
                            style={{
                              padding: isMobile ? "10px 8px" : "16px",
                              textAlign: "left",
                              color: "#374151",
                              fontWeight: "600",
                              fontSize: isMobile ? "12px" : "13px",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Email
                          </th>
                          <th
                            style={{
                              padding: isMobile ? "10px 8px" : "16px",
                              textAlign: "left",
                              color: "#374151",
                              fontWeight: "600",
                              fontSize: isMobile ? "12px" : "13px",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            GSTIN
                          </th>
                          <th
                            style={{
                              padding: isMobile ? "10px 8px" : "16px",
                              textAlign: "left",
                              color: "#374151",
                              fontWeight: "600",
                              fontSize: isMobile ? "12px" : "13px",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Location
                          </th>
                          <th
                            style={{
                              padding: isMobile ? "10px 8px" : "16px",
                              textAlign: "left",
                              color: "#374151",
                              fontWeight: "600",
                              fontSize: isMobile ? "12px" : "13px",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Ref. Architect
                          </th>
                        </>
                      )}
                      <th
                        style={{
                          padding: isMobile ? "10px 8px" : "16px",
                          textAlign: "left",
                          color: "#374151",
                          fontWeight: "600",
                          fontSize: isMobile ? "12px" : "13px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer, index) => (
                      <tr
                        key={customer.id}
                        style={{
                          borderTop: "1px solid #e5e7eb",
                          transition: "background-color 0.2s",
                          backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#f9fafb")}
                      >
                        <td style={{ padding: isMobile ? "10px 8px" : "16px", color: "#1f2937", fontWeight: "500" }}>{customer.name}</td>
                        <td style={{ padding: isMobile ? "10px 8px" : "16px", color: "#4b5563" }}>
                          {customer.mobile ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              📱 {customer.mobile}
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>-</span>
                          )}
                        </td>
                        {/* Desktop-only columns */}
                        {(
                          <>
                            <td style={{ padding: isMobile ? "10px 8px" : "16px", color: "#4b5563" }}>
                              {customer.email ? (
                                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  📧 {customer.email}
                                </span>
                              ) : (
                                <span style={{ color: "#9ca3af" }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: isMobile ? "10px 8px" : "16px", color: "#4b5563" }}>
                              {customer.gstin ? (
                                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  🧾 {customer.gstin}
                                </span>
                              ) : (
                                <span style={{ color: "#9ca3af" }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: isMobile ? "10px 8px" : "16px", color: "#4b5563" }}>
                              {customer.state || customer.city ? (
                                <span>
                                  {customer.city && customer.state ? `${customer.city}, ${customer.state}` : customer.city || customer.state}
                                </span>
                              ) : (
                                <span style={{ color: "#9ca3af" }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: isMobile ? "10px 8px" : "16px" }}>
                              {customer.referenceArchitect ? (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 5,
                                  background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6,
                                  padding: "3px 10px", fontSize: 12, color: "#16a34a", fontWeight: 600,
                                  whiteSpace: "nowrap" }}>
                                  🏛️ {customer.referenceArchitect.name}
                                </span>
                              ) : (
                                <span style={{ color: "#9ca3af" }}>—</span>
                              )}
                            </td>
                          </>
                        )}
                        <td style={{ padding: "7px 12px" }}>
                          <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "center" }}>
                            <button title="Edit"   onClick={() => handleEdit(customer)}
                              style={{ width:30,height:30,borderRadius:6,padding:0,flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center",border:"1px solid #e5e7eb",background:"transparent",color:"#6b7280",cursor:"pointer",fontSize:14,transition:"all 120ms ease" }}
                              onMouseEnter={e=>{e.currentTarget.style.background="#f9fafb";e.currentTarget.style.borderColor="#d1d5db";e.currentTarget.style.color="#111827";}}
                              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="#e5e7eb";e.currentTarget.style.color="#6b7280";}}>✏️</button>
                            <button title="Delete" onClick={() => setConfirmDelete({ id: customer.id, name: customer.name })}
                              style={{ width:30,height:30,borderRadius:6,padding:0,flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center",border:"1px solid #e5e7eb",background:"transparent",color:"#6b7280",cursor:"pointer",fontSize:14,transition:"all 120ms ease" }}
                              onMouseEnter={e=>{e.currentTarget.style.background="#fef2f2";e.currentTarget.style.borderColor="#fecaca";e.currentTarget.style.color="#ef4444";}}
                              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="#e5e7eb";e.currentTarget.style.color="#6b7280";}}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmDelete && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: isMobile ? "flex-end" : "center",
              justifyContent: "center",
              zIndex: 10004,
              padding: isMobile ? "0" : "20px",
              paddingTop: "80px",
            }}
            onClick={() => setConfirmDelete(null)}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: isMobile ? "20px 16px" : "35px",
                borderRadius: isMobile ? "20px 20px 0 0" : "16px",
                maxWidth: isMobile ? "100%" : isTablet ? "600px" : "500px",
                width: "100%",
                maxHeight: isMobile ? "90vh" : "85vh",
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                position: "relative",
                zIndex: 10005,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: "20px", textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "48px",
                    marginBottom: "15px",
                    color: "#ef4444",
                  }}
                >
                  🗑️
                </div>
                <h2
                  style={{
                    margin: 0,
                    color: "#1f2937",
                    fontSize: isMobile ? "20px" : "24px",
                    fontWeight: "700",
                    marginBottom: "10px",
                  }}
                >
                  Delete Customer?
                </h2>
                <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: "14px", lineHeight: "1.6" }}>
                  Are you sure you want to permanently delete customer <strong>"{confirmDelete.name}"</strong>? This action cannot be undone.
                </p>
                <div
                  style={{
                    marginTop: "15px",
                    padding: "12px",
                    backgroundColor: "#fef2f2",
                    borderRadius: "8px",
                    textAlign: "left",
                    border: "1px solid #fecaca",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#991b1b", marginBottom: "4px", fontWeight: "600" }}>⚠️ Warning:</div>
                  <div style={{ fontSize: "13px", color: "#7f1d1d" }}>
                    If this customer has associated quotations or invoices, they may be affected.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "10px" }}>
                <Button variant="danger" size="md" fullWidth onClick={() => handleDelete(confirmDelete.id)}>Delete</Button>
                <Button variant="secondary" size="md" fullWidth onClick={() => setConfirmDelete(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {/* Next Button to Quotation Page */}
        <div style={{ 
          display: "flex", 
          justifyContent: "flex-end", 
          marginTop: "30px",
          paddingTop: "20px",
          borderTop: "2px solid rgba(255, 255, 255, 0.2)"
        }}>
          <Button variant="primary" size="md" icon="→" iconPosition="right" onClick={() => navigate("/quotations")}>
            Next: Quotations
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}

export default CustomerManagement;
