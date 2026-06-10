import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PageWrapper from "../components/PageWrapper";
import api from "../api/api";

function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [confirmUser, setConfirmUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/api/auth/staff")
      .then(res => setStaff(res.data))
      .catch(() => toast.error("Failed to load staff"));
  }, []);

  const removeStaff = (id) => {
    api.delete(`/api/auth/staff/${id}`)
      .then(() => {
        setStaff(prev => prev.filter(s => s.id !== id));
        setConfirmUser(null);
      })
      .catch(() => toast.error("Failed to remove staff"));
  };

  return (
    <PageWrapper>
      <div style={card}>
        {/* ❌ CLOSE BUTTON */}
        <button
          style={closeBtn}
          onClick={() => navigate("/dashboard")}
          title="Close"
        >
          ✕
        </button>

        <h2 style={{ marginBottom: "20px", color: "#fff" }}>👥 Manage Staff</h2>

        {staff.length === 0 ? (
          <p style={{ color: "#A9B3D1", opacity: 0.8 }}>No staff found</p>
        ) : (
          staff.map(s => (
            <div key={s.id} style={row}>
              <span style={{ color: "#fff" }}>{s.userName}</span>

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
            <h3 style={{ color: "#fff" }}>Remove Staff</h3>

            <p style={{ color: "#A9B3D1", opacity: 0.85 }}>
              Are you sure you want to remove
              <b style={{ color: "#fff" }}> {confirmUser.userName} </b>?
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
  background: "rgba(17,27,53,0.9)",
  borderRadius: "16px",
  color: "white",
  boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
  border: "1px solid rgba(255,255,255,0.08)",
  position: "relative",
  boxSizing: "border-box",
};

const closeBtn = {
  position: "absolute",
  top: "14px",
  right: "14px",
  background: "transparent",
  border: "none",
  color: "#7180A6",
  fontSize: "20px",
  cursor: "pointer",
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 0",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const removeBtn = {
  background: "rgba(255,107,129,0.15)",
  border: "1px solid rgba(255,107,129,0.3)",
  color: "#FF6B81",
  padding: "6px 14px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
};

/* MODAL */

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
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
  background: "rgba(17,27,53,0.98)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "white",
  textAlign: "center",
  boxSizing: "border-box",
  boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
};

const actions = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "20px",
};

const dangerBtn = {
  background: "rgba(255,107,129,0.15)",
  color: "#FF6B81",
  border: "1px solid rgba(255,107,129,0.3)",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "600",
};

const cancelBtn = {
  background: "rgba(255,255,255,0.08)",
  color: "#A9B3D1",
  border: "1px solid rgba(255,255,255,0.12)",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
};
