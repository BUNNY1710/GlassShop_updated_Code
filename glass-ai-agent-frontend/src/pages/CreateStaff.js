

// import api from "../api/api";
// import { useState } from "react";

// function CreateStaff() {
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [msg, setMsg] = useState("");

//   const createStaff = async () => {
//     try {
//       await api.post("/auth/create-staff", {
//         username: username,
//         password: password,
//       });

//       setMsg("✅ Staff created successfully");
//       setUsername("");
//       setPassword("");
//     } catch (err) {
//       console.error(err);
//       setMsg("❌ Failed to create staff");
//     }
//   };

//   return (
//     <div style={{ padding: "30px" }}>
//       <h2>Create Staff</h2>

//       <input
//         placeholder="Username"
//         value={username}
//         onChange={e => setUsername(e.target.value)}
//       />

//       <input
//         type="password"
//         placeholder="Password"
//         value={password}
//         onChange={e => setPassword(e.target.value)}
//       />

//       <button onClick={createStaff}>Create</button>

//       {msg && <p>{msg}</p>}
//     </div>
//   );
// }

// export default CreateStaff;

import api from "../api/api";
import { useState } from "react";
import PageWrapper from "../components/PageWrapper";
import PermissionSelector from "../components/PermissionSelector";

function CreateStaff() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const createStaff = async () => {
    if (!username || !password) {
      setMsg("❌ Username and password are required");
      return;
    }

    try {
      setLoading(true);
      setMsg(""); // Clear previous messages
      await api.post("/api/auth/create-staff", {
        username: username.trim(),
        password: password.trim(),
        permissions,
      });

      setMsg("✅ Staff created successfully");
      setUsername("");
      setPassword("");
      setPermissions([]);
    } catch (err) {
      console.error("Error creating staff:", err);
      // Extract error message from response
      const errorMessage = err.response?.data?.error || err.message || "Failed to create staff";
      setMsg(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div style={page}>
        <div style={card}>
          <h2 style={title}>👤 Create Staff</h2>
          <p style={subtitle}>Add a new staff member to your shop</p>

          <div style={field}>
            <label style={label}>Username</label>
            <input
              style={input}
              placeholder="Enter staff username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div style={field}>
            <label style={label}>Password</label>
            <input
              type="password"
              style={input}
              placeholder="Enter secure password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ ...label, fontSize: 13, fontWeight: 700, opacity: 1, color: "#fff", display: "block", marginBottom: 4 }}>
              Permissions
            </label>
            <p style={{ fontSize: 12, color: "#A9B3D1", margin: "0 0 12px" }}>
              Choose exactly which modules and actions this staff member can access. ({permissions.length} selected)
            </p>
            <PermissionSelector value={permissions} onChange={setPermissions} />
          </div>

          <button
            style={button}
            onClick={createStaff}
            disabled={loading}
          >
            {loading ? "⏳ Creating..." : "➕ Create Staff"}
          </button>

          {msg && (
            <div
              style={{
                ...message,
                background: msg.includes("❌") 
                  ? "rgba(239, 68, 68, 0.1)" 
                  : "rgba(34, 197, 94, 0.1)",
                color: msg.includes("❌") ? "#dc2626" : "#16a34a",
                border: `1px solid ${msg.includes("❌") 
                  ? "rgba(239, 68, 68, 0.2)" 
                  : "rgba(34, 197, 94, 0.2)"}`,
              }}
            >
              {msg}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

/* ===== STYLES ===== */

const page = {
  minHeight: "calc(100vh - 80px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: "24px 0",
};

// const card = {
//   width: "420px",
//   padding: "30px",
//   borderRadius: "18px",
//   background: "rgba(0,0,0,0.65)",
//   backdropFilter: "blur(14px)",
//   boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
//   color: "white",
// };

const card = {
  width: "100%",
  maxWidth: "780px",
  padding: "26px",
  borderRadius: "18px",
  background: "rgba(0,0,0,0.65)",
  backdropFilter: "blur(14px)",
  boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
  color: "white",
};


const title = {
  textAlign: "center",
  fontSize: "24px",
  fontWeight: "700",
  marginBottom: "5px",
};

const subtitle = {
  textAlign: "center",
  fontSize: "13px",
  opacity: 0.8,
  marginBottom: "25px",
};

const field = {
  display: "flex",
  flexDirection: "column",
  marginBottom: "16px",
};

const label = {
  fontSize: "12px",
  marginBottom: "6px",
  opacity: 0.85,
};

const input = {
  padding: "12px 16px",
  borderRadius: "8px",
  border: "1.5px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.06)",
  color: "#E2E8F0",
  outline: "none",
  fontSize: "14px",
  transition: "all 0.2s ease",
  width: "100%",
  boxSizing: "border-box",
};

const inputFocus = {
  borderColor: "rgba(79,93,255,0.6)",
  boxShadow: "0 0 0 3px rgba(79,93,255,0.15)",
};

const button = {
  width: "100%",
  marginTop: "8px",
  padding: "14px 20px",
  borderRadius: "8px",
  border: "none",
  fontSize: "15px",
  fontWeight: "600",
  cursor: "pointer",
  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
  color: "white",
  transition: "all 0.2s ease",
  boxShadow: "0 2px 4px rgba(99, 102, 241, 0.2)",
};

const message = {
  marginTop: "16px",
  padding: "12px 16px",
  borderRadius: "8px",
  textAlign: "center",
  fontWeight: "600",
  fontSize: "14px",
};

export default CreateStaff;
