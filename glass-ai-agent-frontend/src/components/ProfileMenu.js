
// import { useEffect, useState, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../api/api";

// function ProfileMenu() {
//   const [open, setOpen] = useState(false);
//   const [profile, setProfile] = useState(null);

//   const [showChange, setShowChange] = useState(false);
//   const [oldPass, setOldPass] = useState("");
//   const [newPass, setNewPass] = useState("");

//   const menuRef = useRef(null);
//   const navigate = useNavigate();

//   /* ===== LOAD PROFILE ===== */
//   useEffect(() => {
//     api.get("/auth/profile")
//       .then(res => setProfile(res.data))
//       .catch(() => {});
//   }, []);

//   /* ===== CLOSE ON OUTSIDE CLICK ===== */
//   useEffect(() => {
//     const handler = (e) => {
//       if (menuRef.current && !menuRef.current.contains(e.target)) {
//         setOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handler);
//     return () => document.removeEventListener("mousedown", handler);
//   }, []);

//   const logout = () => {
//     localStorage.clear();
//     navigate("/login");
//   };

//   if (!profile) return null;

//   return (
//     <>
//       <div style={wrapper} ref={menuRef}>
//         {/* PROFILE ICON */}
//         <div style={icon} onClick={() => setOpen(!open)}>
//           {profile.username.charAt(0).toUpperCase()}
//         </div>

//         {/* DROPDOWN */}
//         {open && (
//           <div style={dropdown}>
//             <div style={userBlock}>
//               <b>{profile.username}</b>
//               <span>{profile.role.replace("ROLE_", "")}</span>
//               <small>🏪 {profile.shopName}</small>
//             </div>

//             <div style={divider} />

//             {profile.role === "ROLE_ADMIN" && (
//               <div
//                 style={item}
//                 onClick={() => {
//                   setOpen(false);
//                   navigate("/staff");
//                 }}
//               >
//                 👥 Manage Staff
//               </div>
//             )}

//             <div
//               style={item}
//               onClick={() => {
//                 setShowChange(true);
//                 setOpen(false);
//               }}
//             >
//               🔐 Change Password
//             </div>

//             <div style={divider} />

//             <div style={{ ...item, color: "#ef4444" }} onClick={logout}>
//               🚪 Logout
//             </div>
//           </div>
//         )}
//       </div>

//       {/* CHANGE PASSWORD MODAL */}
//       {showChange && (
//   <div style={modalOverlay}>
//     <div style={modalCard}>
//       <h3 style={{ marginBottom: "15px" }}>🔐 Change Password</h3>

//       <input
//         type="password"
//         placeholder="Old password"
//         value={oldPass}
//         onChange={(e) => setOldPass(e.target.value)}
//         style={input}
//       />

//       <input
//         type="password"
//         placeholder="New password"
//         value={newPass}
//         onChange={(e) => setNewPass(e.target.value)}
//         style={input}
//       />

//       <div style={buttonRow}>
//         <button
//           style={saveBtn}
//           onClick={() => {
//             api
//               .post("/auth/change-password", {
//                 oldPassword: oldPass,
//                 newPassword: newPass,
//               })
//               .then(() => {
//                 alert("Password changed successfully");
//                 setShowChange(false);
//                 setOldPass("");
//                 setNewPass("");
//               })
//               .catch((err) => {
//                 alert(err.response?.data || "Failed");
//               });
//           }}
//         >
//           Save
//         </button>

//         <button style={cancelBtn} onClick={() => setShowChange(false)}>
//           Cancel
//         </button>
//       </div>
//     </div>
//   </div>
// )}

//     </>
//   );
// }

// export default ProfileMenu;

// /* ===== STYLES ===== */

// const wrapper = {
//   position: "relative",
// };

// const icon = {
//   width: "42px",
//   height: "42px",
//   borderRadius: "50%",
//   background: "linear-gradient(135deg, #6366f1, #22c55e)",
//   border: "2px solid rgba(255,255,255,0.25)",
//   color: "white",
//   display: "flex",
//   alignItems: "center",
//   justifyContent: "center",
//   fontWeight: "800",
//   fontSize: "16px",
//   cursor: "pointer",
//   boxShadow: "0 6px 18px rgba(0,0,0,0.7)",
// };

// const dropdown = {
//   position: "absolute",
//   right: 0,
//   top: "52px",
//   width: "260px",
//   background: "rgba(18,18,18,0.97)",
//   backdropFilter: "blur(14px)",
//   borderRadius: "14px",
//   boxShadow: "0 30px 70px rgba(0,0,0,0.9)",
//   color: "white",
//   zIndex: 20000,
// };


// const userBlock = {
//   padding: "14px",
//   display: "flex",
//   flexDirection: "column",
//   gap: "4px",
// };

// const divider = {
//   height: "1px",
//   background: "rgba(255,255,255,0.1)",
// };

// const item = {
//   padding: "12px 14px",
//   cursor: "pointer",
// };

// const modalOverlay = {
//   position: "fixed",
//   top: 0,
//   left: 0,
//   width: "100vw",
//   height: "100vh",
//   background: "rgba(0,0,0,0.7)",
//   display: "flex",
//   alignItems: "center",
//   justifyContent: "center",
//   zIndex: 99999, // ABOVE EVERYTHING
// };

// const modalCard = {
//   width: "340px",
//   background: "rgba(15,15,15,0.95)",
//   borderRadius: "16px",
//   padding: "25px",
//   color: "white",
//   boxShadow: "0 30px 80px rgba(0,0,0,0.9)",
//   animation: "fadeIn 0.25s ease-in-out",
// };

// const input = {
//   width: "100%",
//   padding: "10px",
//   marginBottom: "12px",
//   borderRadius: "8px",
//   border: "none",
//   outline: "none",
// };

// const buttonRow = {
//   display: "flex",
//   justifyContent: "space-between",
//   marginTop: "15px",
// };

// const saveBtn = {
//   background: "#22c55e",
//   border: "none",
//   padding: "8px 16px",
//   borderRadius: "8px",
//   cursor: "pointer",
//   color: "black",
//   fontWeight: "600",
// };

// const cancelBtn = {
//   background: "#ef4444",
//   border: "none",
//   padding: "8px 16px",
//   borderRadius: "8px",
//   cursor: "pointer",
//   color: "white",
// };


import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState({
    username: sessionStorage.getItem("username") || "User",
    role: sessionStorage.getItem("role") || "",
    shopName: "Glass Shop",
  });

  const [showChange, setShowChange] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState({ type: "success", text: "" });

  const menuRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  /* ===== LOAD PROFILE (SAFE) ===== */
  useEffect(() => {
    api
      .get("/api/auth/profile")
      .then((res) => setProfile(res.data))
      .catch(() => {
        // ❗ DO NOTHING — fallback already exists
      });
  }, []);

  /* ===== CLOSE ON OUTSIDE CLICK ===== */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ===== ADJUST DROPDOWN POSITION TO STAY WITHIN VIEWPORT ===== */
  useEffect(() => {
    if (!open) {
      setDropdownStyle({});
      return;
    }

    const adjustDropdownPosition = () => {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (menuRef.current) {
          const iconRect = menuRef.current.getBoundingClientRect();
          const dropdownWidth = 260;
          const padding = 8;
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Calculate available space
          const spaceOnRight = viewportWidth - iconRect.right;
          const spaceOnLeft = iconRect.left;
          const spaceBelow = viewportHeight - iconRect.bottom;

          let newStyle = {
            position: "fixed", // Use fixed positioning relative to viewport
          };

          // Calculate horizontal position
          if (spaceOnRight >= dropdownWidth + padding) {
            // Enough space on right - align to icon's right edge
            newStyle.right = `${viewportWidth - iconRect.right}px`;
            newStyle.left = "auto";
          } else if (spaceOnLeft >= dropdownWidth + padding) {
            // Not enough space on right, but enough on left - position to left of icon
            newStyle.left = `${Math.max(padding, iconRect.left - dropdownWidth)}px`;
            newStyle.right = "auto";
          } else {
            // Not enough space on either side - align to viewport edge with padding
            newStyle.right = `${padding}px`;
            newStyle.left = "auto";
            newStyle.maxWidth = `${viewportWidth - padding * 2}px`;
            newStyle.width = `${Math.min(dropdownWidth, viewportWidth - padding * 2)}px`;
          }

          // Calculate vertical position
          if (spaceBelow >= 250) {
            // Enough space below
            newStyle.top = `${iconRect.bottom + 8}px`;
            newStyle.bottom = "auto";
          } else {
            // Not enough space below - position above icon
            newStyle.bottom = `${viewportHeight - iconRect.top + 8}px`;
            newStyle.top = "auto";
          }

          setDropdownStyle(newStyle);

          // Double-check after rendering to ensure it's within bounds
          setTimeout(() => {
            if (dropdownRef.current) {
              const dropdownRect = dropdownRef.current.getBoundingClientRect();
              const currentViewportWidth = window.innerWidth;
              
              // If dropdown is still outside viewport, adjust it
              if (dropdownRect.right > currentViewportWidth - padding) {
                const overflow = dropdownRect.right - (currentViewportWidth - padding);
                setDropdownStyle(prev => ({
                  ...prev,
                  right: `${Math.max(padding, parseFloat(prev.right || 0) + overflow)}px`,
                }));
              }
              
              if (dropdownRect.left < padding) {
                const overflow = padding - dropdownRect.left;
                setDropdownStyle(prev => ({
                  ...prev,
                  left: `${Math.max(padding, parseFloat(prev.left || 0) + overflow)}px`,
                  right: "auto",
                }));
              }
            }
          }, 50);
        }
      });
    };

    // Initial adjustment with small delay to ensure dropdown is rendered
    const timeoutId = setTimeout(adjustDropdownPosition, 10);
    
    // Recalculate on window resize (e.g., when dev tools open/close)
    const handleResize = () => {
      adjustDropdownPosition();
    };
    
    window.addEventListener("resize", handleResize);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  const logout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <>
      <div style={wrapper} ref={menuRef}>
        {/* PROFILE ICON (ALWAYS VISIBLE) */}
        <div style={icon} onClick={() => setOpen(!open)}>
          {profile.username.charAt(0).toUpperCase()}
        </div>

        {/* DROPDOWN */}
        {open && (
          <div ref={dropdownRef} style={{ ...dropdown, ...dropdownStyle }}>
            <div style={userBlock}>
              <b>{profile.username}</b>
              {profile.role && (
                <span>{profile.role.replace("ROLE_", "")}</span>
              )}
              <small>🏪 {profile.shopName}</small>
            </div>

            <div style={divider} />

            {profile.role === "ROLE_ADMIN" && (
              <div
                style={item}
                onClick={() => {
                  setOpen(false);
                  navigate("/staff");
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(99, 102, 241, 0.08)";
                  e.currentTarget.style.color = "#6366f1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#475569";
                }}
              >
                👥 Manage Staff
              </div>
            )}

            <div
              style={item}
              onClick={() => {
                setShowChange(true);
                setOpen(false);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(99, 102, 241, 0.08)";
                e.currentTarget.style.color = "#6366f1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#475569";
              }}
            >
              🔐 Change Password
            </div>

            <div style={divider} />

            <div 
              style={{ 
                ...item, 
                color: "#ef4444",
                background: "rgba(239, 68, 68, 0.05)",
                marginTop: "4px",
              }} 
              onClick={logout}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)";
              }}
            >
              🚪 Logout
            </div>
          </div>
        )}
      </div>

      {/* CHANGE PASSWORD MODAL */}
      {showChange && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h3 style={{ marginBottom: "8px", fontSize: "20px", fontWeight: "700", color: "#0f172a" }}>
              🔐 Change Password
            </h3>
            <p style={{ marginBottom: "20px", fontSize: "13px", color: "#64748b" }}>
              Update your account password
            </p>

            <input
              type="password"
              placeholder="Old password"
              value={oldPass}
              onChange={(e) => setOldPass(e.target.value)}
              style={input}
            />

            <input
              type="password"
              placeholder="New password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              style={input}
            />

            <div style={buttonRow}>
              <button
                style={saveBtn}
                onClick={() => {
                  api
                    .post("/auth/change-password", {
                      oldPassword: oldPass,
                      newPassword: newPass,
                    })
                    .then(() => {
                      setMessage({ 
                        type: "success", 
                        text: "Password changed successfully!" 
                      });
                      setShowMessage(true);
                      setShowChange(false);
                      setOldPass("");
                      setNewPass("");
                      // Auto-close message after 3 seconds
                      setTimeout(() => {
                        setShowMessage(false);
                      }, 3000);
                    })
                    .catch((err) => {
                      const errorMessage = err.response?.data?.error || err.response?.data || "Failed to change password. Please try again.";
                      setMessage({ 
                        type: "error", 
                        text: errorMessage 
                      });
                      setShowMessage(true);
                      // Auto-close error message after 4 seconds
                      setTimeout(() => {
                        setShowMessage(false);
                      }, 4000);
                    });
                }}
              >
                Save
              </button>

              <button style={cancelBtn} onClick={() => setShowChange(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROFESSIONAL MESSAGE MODAL */}
      {showMessage && (
        <div style={messageOverlay} onClick={() => setShowMessage(false)}>
          <div 
            style={messageModal} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px"
            }}>
              {message.type === "success" ? (
                <div style={successIcon}>✓</div>
              ) : (
                <div style={errorIcon}>✕</div>
              )}
            </div>
            <h3 style={{
              fontSize: "18px",
              fontWeight: "700",
              color: "#0f172a",
              marginBottom: "8px",
              textAlign: "center"
            }}>
              {message.type === "success" ? "Success!" : "Error"}
            </h3>
            <p style={{
              fontSize: "14px",
              color: "#64748b",
              textAlign: "center",
              marginBottom: "24px",
              lineHeight: "1.5"
            }}>
              {message.text}
            </p>
            <button
              style={messageButton}
              onClick={() => setShowMessage(false)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(99, 102, 241, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(99, 102, 241, 0.2)";
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ProfileMenu;

/* ===== STYLES ===== */

const wrapper = {
  position: "relative",
};

const icon = {
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
  border: "2px solid rgba(99, 102, 241, 0.2)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "800",
  fontSize: "16px",
  cursor: "pointer",
  boxShadow: "0 4px 6px -1px rgba(99, 102, 241, 0.3), 0 2px 4px -1px rgba(99, 102, 241, 0.2)",
  transition: "all 0.2s ease",
};

const dropdown = {
  position: "fixed", // Will be overridden by dynamic style, but this is fallback
  width: "260px",
  maxWidth: "calc(100vw - 16px)", // Ensure it doesn't exceed viewport
  background: "rgba(255, 255, 255, 0.98)",
  backdropFilter: "blur(14px)",
  borderRadius: "12px",
  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  color: "#0f172a",
  zIndex: 20000,
  overflow: "hidden",
};

const userBlock = {
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(79, 70, 229, 0.05))",
  borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
};

const divider = {
  height: "1px",
  background: "rgba(226, 232, 240, 0.8)",
  margin: "4px 0",
};

const item = {
  padding: "12px 16px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  fontSize: "14px",
  fontWeight: "500",
  color: "#475569",
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 99999,
};

const modalCard = {
  width: "380px",
  background: "rgba(255, 255, 255, 0.98)",
  borderRadius: "16px",
  padding: "28px",
  color: "#0f172a",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  border: "1px solid rgba(226, 232, 240, 0.8)",
};

const input = {
  width: "100%",
  padding: "12px 16px",
  marginBottom: "16px",
  borderRadius: "8px",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  background: "#ffffff",
  color: "#0f172a",
  outline: "none",
  fontSize: "14px",
  transition: "all 0.2s ease",
};

const buttonRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  marginTop: "20px",
};

const saveBtn = {
  flex: 1,
  background: "linear-gradient(135deg, #22c55e, #16a34a)",
  border: "none",
  padding: "12px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
  color: "white",
  fontSize: "14px",
  transition: "all 0.2s ease",
  boxShadow: "0 2px 4px rgba(34, 197, 94, 0.2)",
};

const cancelBtn = {
  flex: 1,
  background: "linear-gradient(135deg, #ef4444, #dc2626)",
  border: "none",
  padding: "12px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  color: "white",
  fontWeight: "600",
  fontSize: "14px",
  transition: "all 0.2s ease",
  boxShadow: "0 2px 4px rgba(239, 68, 68, 0.2)",
};

const messageOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0, 0, 0, 0.5)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100000,
  animation: "fadeIn 0.2s ease-in-out",
};

const messageModal = {
  background: "white",
  borderRadius: "16px",
  padding: "32px",
  maxWidth: "400px",
  width: "90%",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  animation: "slideUp 0.3s ease-out",
};

const successIcon = {
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #22c55e, #16a34a)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "32px",
  fontWeight: "bold",
  boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)",
};

const errorIcon = {
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #ef4444, #dc2626)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "32px",
  fontWeight: "bold",
  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
};

const messageButton = {
  width: "100%",
  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
  border: "none",
  padding: "12px 24px",
  borderRadius: "8px",
  cursor: "pointer",
  color: "white",
  fontWeight: "600",
  fontSize: "14px",
  transition: "all 0.2s ease",
  boxShadow: "0 2px 4px rgba(99, 102, 241, 0.2)",
};

// Add CSS animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  if (!document.head.querySelector('style[data-profile-menu-animations]')) {
    style.setAttribute('data-profile-menu-animations', 'true');
    document.head.appendChild(style);
  }
}
