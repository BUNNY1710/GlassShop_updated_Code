

// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../api/api";

// function Register() {
//   const [shopName, setShopName] = useState("");
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [email, setEmail] = useState("");
//   const [whatsappNumber, setWhatsappNumber] = useState("");
//   const [error, setError] = useState("");

//   const navigate = useNavigate();

//   const handleRegister = async () => {
//     try {
//       await api.post("/auth/register-shop", {
//         shopName,
//         username,
//         password,
//         email,
//         whatsappNumber
//       });

//       navigate("/login");
//     } catch (err) {
//       setError("Registration failed");
//     }
//   };

//   return (
//     <div style={container}>
//       <h2>🏬 Register Your Shop</h2>

//       <input
//         placeholder="Shop Name"
//         value={shopName}
//         onChange={e => setShopName(e.target.value)}
//       />

//       <input
//         placeholder="Admin Username"
//         value={username}
//         onChange={e => setUsername(e.target.value)}
//       />

//       <input
//         type="password"
//         placeholder="Admin Password"
//         value={password}
//         onChange={e => setPassword(e.target.value)}
//       />
//       <input
//         placeholder="Admin Email"
//         value={email}
//         onChange={(e) => setEmail(e.target.value)}
//       />
//       <input
//         placeholder="WhatsApp Number (e.g., +919876543210)"
//         value={whatsappNumber}
//         onChange={(e) => setWhatsappNumber(e.target.value)}
//       />

//       <button onClick={handleRegister}>Register Shop</button>

//       {error && <p style={{ color: "red" }}>{error}</p>}
//     </div>
//   );
// }

// export default Register;

// const container = {
//   width: "320px",
//   margin: "100px auto",
//   display: "flex",
//   flexDirection: "column",
//   gap: "10px"
// };


  import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

function Register() {
  const [shopName, setShopName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/auth/register-shop", {
        shopName,
        username,
        password,
        email,
        whatsappNumber
      });
      navigate("/login");
    } catch {
      setError("❌ Registration failed. Please try again.");
    }
  };

  return (
    <div style={page}>
      <div style={card}>
        <h2 style={title}>🏬 Create Shop Account</h2>
        <p style={subtitle}>Start managing your glass inventory</p>

        <form onSubmit={handleRegister} style={form}>
          <input
            style={input}
            placeholder="Shop Name"
            value={shopName}
            onChange={e => setShopName(e.target.value)}
            required
          />

          <input
            style={input}
            placeholder="Admin Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />

          <input
            style={input}
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <input
            style={input}
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <input
            style={input}
            placeholder="WhatsApp Number (+91xxxxxxxxxx)"
            value={whatsappNumber}
            onChange={e => setWhatsappNumber(e.target.value)}
          />

          <button style={button}>🚀 Register Shop</button>

          {error && <p style={errorText}>{error}</p>}
        </form>

        <p style={footer}>
          Already have an account?{" "}
          <span style={link} onClick={() => navigate("/login")}>
            Login
          </span>
        </p>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "radial-gradient(circle at top, #1e293b, #020617)",
};

const card = {
  width: "380px",
  padding: "30px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(14px)",
  boxShadow: "0 20px 45px rgba(0,0,0,0.6)",
  textAlign: "center",
  color: "#f9fafb",
};

const title = {
  fontSize: "22px",
  fontWeight: "700",
  marginBottom: "6px",
};

const subtitle = {
  fontSize: "13px",
  opacity: 0.8,
  marginBottom: "20px",
};

const form = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const input = {
  padding: "12px 14px",
  borderRadius: "10px",
  border: "none",
  outline: "none",
  fontSize: "14px",
  background: "rgba(255,255,255,0.15)",
  color: "white",
};

const button = {
  marginTop: "10px",
  padding: "12px",
  borderRadius: "12px",
  border: "none",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: "600",
  color: "white",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
};

const footer = {
  marginTop: "18px",
  fontSize: "13px",
  opacity: 0.85,
};

const link = {
  color: "#60a5fa",
  cursor: "pointer",
  fontWeight: "600",
};

const errorText = {
  color: "#f87171",
  fontSize: "13px",
};


export default Register;
