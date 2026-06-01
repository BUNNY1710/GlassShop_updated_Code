function ConfirmModal({ show, onCancel, onConfirm, payload }) {
  // 🛡️ Safety guard
  if (!show || !payload) return null;

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3>⚠️ Confirm Stock Update</h3>

        <div style={{ marginTop: "10px", fontSize: "14px" }}>
          <p><b>Glass Type:</b> {payload.glassType}</p>
          <p><b>Thickness:</b> {payload.thickness} MM</p>
          <p><b>Height:</b> {payload.height} {payload.unit}</p>
          <p><b>Width:</b> {payload.width} {payload.unit}</p>
          <p><b>Stand No:</b> {payload.standNo}</p>
          <p><b>Quantity:</b> {payload.quantity}</p>
          <p><b>Action:</b> {payload.action}</p>
        </div>

        <div style={btnRow}>
          <button style={cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button style={confirmBtn} onClick={onConfirm}>
            Yes, Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const overlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000
};

const modal = {
  background: "#1e1e1e",
  padding: "25px",
  borderRadius: "12px",
  width: "360px",
  color: "white",
  boxShadow: "0 0 25px rgba(0,0,0,0.8)"
};

const btnRow = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "20px"
};

const cancelBtn = {
  padding: "8px 14px",
  background: "#555",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer"
};

const confirmBtn = {
  padding: "8px 14px",
  background: "#2ecc71",
  color: "black",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold"
};

export default ConfirmModal;
