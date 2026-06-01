import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../components/PageWrapper";
import dashboardBg from "../assets/dashboard-bg.jpg";
import api from "../api/api";

function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [confirmUser, setConfirmUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/api/auth/staff")
      .then(res => setStaff(res.data))
      .catch(() => alert("Failed to load staff"));
  }, []);

  const removeStaff = (id) => {
    api.delete(`/api/auth/staff/${id}`)
      .then(() => {
        setStaff(prev => prev.filter(s => s.id !== id));
        setConfirmUser(null);
      })
      .catch(() => alert("Failed to remove staff"));
  };

  return (
    <PageWrapper background={dashboardBg}>
      <div style={card}>
        {/* ❌ CLOSE BUTTON */}
        <button
          style={closeBtn}
          onClick={() => navigate("/dashboard")}
          title="Close"
        >
          ✕
        </button>

        <h2 style={{ marginBottom: "20px" }}>👥 Manage Staff</h2>

        {staff.length === 0 ? (
          <p style={{ opacity: 0.8 }}>No staff found</p>
        ) : (
          staff.map(s => (
            <div key={s.id} style={row}>
              <span>{s.userName}</span>

              <button
                style={removeBtn}
                onClick={() => setConfirmUser(s)}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {/* CONFIRM REMOVE MODAL */}
      {confirmUser && (
        <div style={overlay}>
          <div style={confirmCard}>
            <h3>Remove Staff</h3>

            <p style={{ opacity: 0.85 }}>
              Are you sure you want to remove
              <b> {confirmUser.userName} </b>?
            </p>

            <div style={actions}>
              <button
                style={dangerBtn}
                onClick={() => removeStaff(confirmUser.id)}
              >
                Yes, Remove
              </button>

              <button
                style={cancelBtn}
                onClick={() => setConfirmUser(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

export default ManageStaff;

/* ================= STYLES ================= */

const card = {
  width: "100%",
  maxWidth: "520px",
  padding: "30px",
  background: "rgba(0,0,0,0.65)",
  borderRadius: "16px",
  color: "white",
  boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
  position: "relative",
  boxSizing: "border-box",
};

const closeBtn = {
  position: "absolute",
  top: "14px",
  right: "14px",
  background: "transparent",
  border: "none",
  color: "#aaa",
  fontSize: "20px",
  cursor: "pointer",
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 0",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
};

const removeBtn = {
  background: "#dc2626",
  border: "none",
  color: "white",
  padding: "6px 14px",
  borderRadius: "8px",
  cursor: "pointer",
};

/* MODAL */

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 30000,
};

const confirmCard = {
  width: "100%",
  maxWidth: "360px",
  padding: "25px",
  borderRadius: "16px",
  background: "rgba(20,20,20,0.95)",
  color: "white",
  textAlign: "center",
  boxSizing: "border-box",
};

const actions = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "20px",
};

const dangerBtn = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
};

const cancelBtn = {
  background: "#374151",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
};
