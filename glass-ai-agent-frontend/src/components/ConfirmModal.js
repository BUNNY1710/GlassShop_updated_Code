function ConfirmModal({ show, onCancel, onConfirm, payload, message, confirmText = "Yes, Save", cancelText = "Cancel" }) {
  // Safety guard — support both old (show+payload) and new (message) usage
  if (!show) return null;
  if (!payload && !message) return null;

  return (
    <div style={overlay}>
      <div style={modal}>
        {/* Warning icon */}
        <div style={iconWrap}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke="#FFB95E"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 style={titleStyle}>Confirm Stock Update</h3>

        {/* Content */}
        {message ? (
          <p style={messageStyle}>{message}</p>
        ) : payload ? (
          <div style={messageStyle}>
            <p style={rowStyle}><span style={labelStyle}>Glass Type:</span> {payload.glassType}</p>
            <p style={rowStyle}><span style={labelStyle}>Thickness:</span> {payload.thickness} MM</p>
            <p style={rowStyle}><span style={labelStyle}>Height:</span> {payload.height} {payload.unit}</p>
            <p style={rowStyle}><span style={labelStyle}>Width:</span> {payload.width} {payload.unit}</p>
            <p style={rowStyle}><span style={labelStyle}>Stand No:</span> {payload.standNo}</p>
            <p style={rowStyle}><span style={labelStyle}>Quantity:</span> {payload.quantity}</p>
            <p style={rowStyle}><span style={labelStyle}>Action:</span> {payload.action}</p>
          </div>
        ) : null}

        {/* Buttons */}
        <div style={btnRow}>
          <button
            style={cancelBtnStyle}
            onClick={onCancel}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = '#A9B3D1';
            }}
          >
            {cancelText}
          </button>
          <button
            style={confirmBtnStyle}
            onClick={onConfirm}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#3D4DE8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#4F5DFF'; }}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ================= STYLES ================= */

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(5,11,31,0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: "16px",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

const modal = {
  background: "rgba(17,27,53,0.98)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "20px",
  padding: "24px",
  maxWidth: "360px",
  width: "100%",
  boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
  animation: "scaleIn 0.2s ease-out",
  fontFamily: "'Inter',-apple-system,sans-serif",
};

const iconWrap = {
  width: "48px",
  height: "48px",
  borderRadius: "12px",
  background: "rgba(255,185,94,0.15)",
  border: "1px solid rgba(255,185,94,0.3)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "14px",
};

const titleStyle = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#fff",
  margin: "0 0 6px 0",
};

const messageStyle = {
  fontSize: "13.5px",
  color: "#A9B3D1",
  margin: 0,
  lineHeight: "1.6",
};

const rowStyle = {
  margin: "3px 0",
};

const labelStyle = {
  color: "#7180A6",
  fontWeight: 600,
  marginRight: "4px",
};

const btnRow = {
  display: "flex",
  gap: "10px",
  marginTop: "20px",
};

const cancelBtnStyle = {
  flex: 1,
  height: "40px",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#A9B3D1",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  transition: "background 150ms ease, color 150ms ease",
  fontFamily: "'Inter',-apple-system,sans-serif",
};

const confirmBtnStyle = {
  flex: 1,
  height: "40px",
  borderRadius: "10px",
  background: "#4F5DFF",
  border: "none",
  color: "#fff",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 150ms ease",
  fontFamily: "'Inter',-apple-system,sans-serif",
};

export default ConfirmModal;
