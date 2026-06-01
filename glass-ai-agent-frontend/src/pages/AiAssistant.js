import { useState, useEffect, useRef } from "react";
import PageWrapper from "../components/PageWrapper";
import aiBg from "../assets/ai-bg.jpg";
import api from "../api/api";

function AiAssistant() {
  const [action, setAction] = useState("");
  const [glassType, setGlassType] = useState("");
  const [site, setSite] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const resultRef = useRef(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("aiQueryHistory");
    if (saved) {
      try {
        setQueryHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history");
      }
    }
  }, []);

  // Auto-scroll to result
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [result]);

  const askAI = async (quickAction = null) => {
    const selectedAction = quickAction || action;
    
    if (!selectedAction) {
      setResult("⚠️ Please select an action or use a quick action button");
      return;
    }

    if (selectedAction === "AVAILABLE" && !glassType) {
      setResult("⚠️ Please select a glass type");
      return;
    }

    if (selectedAction === "INSTALLED" && !site) {
      setResult("⚠️ Please enter a site/client name");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const payload = {
        action: selectedAction,
        glassType: selectedAction === "AVAILABLE" ? glassType : undefined,
        site: selectedAction === "INSTALLED" ? site : undefined,
      };

      const res = await api.post("/ai/ask", payload);
      
      // Animate typing effect
      const response = res.data;
      animateTyping(response);
      
      // Save to history
      const historyItem = {
        id: Date.now(),
        action: selectedAction,
        query: getQueryText(selectedAction, glassType, site),
        response: response,
        timestamp: new Date().toISOString(),
      };
      
      const newHistory = [historyItem, ...queryHistory.slice(0, 9)]; // Keep last 10
      setQueryHistory(newHistory);
      localStorage.setItem("aiQueryHistory", JSON.stringify(newHistory));
      
    } catch (error) {
      console.error(error);
      setResult("❌ Failed to fetch AI response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const animateTyping = (text) => {
    setResult("");
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setResult(text.substring(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 10); // Typing speed
  };

  const getQueryText = (action, glassType, site) => {
    switch (action) {
      case "LOW_STOCK":
        return "Check low stock alerts";
      case "AVAILABLE":
        return `Check available stock for ${glassType}`;
      case "INSTALLED":
        return `Get installed glass for ${site}`;
      case "PREDICT":
        return "Predict future demand";
      default:
        return action;
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      // Show temporary feedback
      const btn = document.getElementById("copyBtn");
      if (btn) {
        const original = btn.textContent;
        btn.textContent = "✓ Copied!";
        setTimeout(() => {
          btn.textContent = original;
        }, 2000);
      }
    }
  };

  const clearHistory = () => {
    setQueryHistory([]);
    localStorage.removeItem("aiQueryHistory");
  };

  const loadFromHistory = (item) => {
    setAction(item.action);
    if (item.action === "AVAILABLE") {
      setGlassType(item.query.includes("5MM") ? "5MM" : item.query.includes("8MM") ? "8MM" : "10MM");
    }
    if (item.action === "INSTALLED") {
      const siteMatch = item.query.match(/for (.+)/);
      if (siteMatch) setSite(siteMatch[1]);
    }
    setResult(item.response);
    setShowHistory(false);
  };

  const quickActions = [
    {
      id: "LOW_STOCK",
      icon: "🚨",
      title: "Low Stock Alert",
      description: "Get alerts for items running low",
      color: "#ef4444",
    },
    {
      id: "PREDICT",
      icon: "🔮",
      title: "Predict Demand",
      description: "AI-powered future demand prediction",
      color: "#8b5cf6",
    },
    {
      id: "AVAILABLE",
      icon: "📦",
      title: "Check Stock",
      description: "Find available stock by type",
      color: "#3b82f6",
    },
    {
      id: "INSTALLED",
      icon: "🏢",
      title: "Installed Glass",
      description: "View glass installed by client",
      color: "#22c55e",
    },
  ];

  return (
    <PageWrapper background={aiBg}>
      <div style={container}>
        {/* Header */}
        <div style={headerCard}>
          <div style={headerContent}>
            <div>
              <h1 style={title}>🤖 Smart AI Assistant</h1>
              <p style={subtitle}>
                Get instant insights about your inventory with AI-powered analysis
              </p>
            </div>
            <div style={headerActions}>
              <button
                style={historyButton}
                onClick={() => setShowHistory(!showHistory)}
                title="View Query History"
              >
                📜 History {queryHistory.length > 0 && `(${queryHistory.length})`}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={quickActionsGrid}>
          {quickActions.map((qa) => (
            <div
              key={qa.id}
              style={quickActionCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 12px -2px rgba(0, 0, 0, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
              }}
              onClick={() => {
                setAction(qa.id);
                if (qa.id === "AVAILABLE") {
                  // Auto-focus glass type selection
                  setTimeout(() => {
                    const select = document.getElementById("glassTypeSelect");
                    if (select) select.focus();
                  }, 100);
                }
                if (qa.id === "INSTALLED") {
                  setTimeout(() => {
                    const input = document.getElementById("siteInput");
                    if (input) input.focus();
                  }, 100);
                }
              }}
            >
              <div style={{ ...quickActionIcon, background: `${qa.color}15`, color: qa.color }}>
                {qa.icon}
              </div>
              <div style={quickActionContent}>
                <h3 style={quickActionTitle}>{qa.title}</h3>
                <p style={quickActionDesc}>{qa.description}</p>
              </div>
              <button
                style={{ ...quickActionBtn, background: qa.color }}
                onClick={(e) => {
                  e.stopPropagation();
                  askAI(qa.id);
                }}
              >
                Ask AI →
              </button>
            </div>
          ))}
        </div>

        {/* Backdrop for mobile */}
        {showHistory && (
          <div
            style={backdrop}
            onClick={() => setShowHistory(false)}
          />
        )}

        {/* Query History Sidebar */}
        {showHistory && (
          <div style={historySidebar}>
            <div style={historyHeader}>
              <h3>Query History</h3>
              <button style={closeBtn} onClick={() => setShowHistory(false)}>✕</button>
            </div>
            {queryHistory.length === 0 ? (
              <div style={emptyHistory}>No queries yet</div>
            ) : (
              <>
                <button style={clearHistoryBtn} onClick={clearHistory}>
                  Clear History
                </button>
                <div style={historyList}>
                  {queryHistory.map((item) => (
                    <div
                      key={item.id}
                      style={historyItem}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f1f5f9";
                        e.currentTarget.style.transform = "translateX(-4px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#f8fafc";
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                      onClick={() => loadFromHistory(item)}
                    >
                      <div style={historyQuery}>{item.query}</div>
                      <div style={historyTime}>
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Manual Query Form */}
        <div style={formCard}>
          <h3 style={formTitle}>Custom Query</h3>
          
          <div style={formGroup}>
            <label style={label}>Action Type</label>
            <select
              style={select}
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              <option value="">Select an action</option>
              <option value="LOW_STOCK">🚨 Low Stock Alert</option>
              <option value="AVAILABLE">📦 Available Stock</option>
              <option value="INSTALLED">🏢 Installed Glass by Client</option>
              <option value="PREDICT">🔮 Predict Future Demand</option>
            </select>
          </div>

          {action === "AVAILABLE" && (
            <div style={formGroup}>
              <label style={label}>Glass Type</label>
              <select
                id="glassTypeSelect"
                style={select}
                value={glassType}
                onChange={(e) => setGlassType(e.target.value)}
              >
                <option value="">Select glass type</option>
                <option value="5MM">5 MM</option>
                <option value="8MM">8 MM</option>
                <option value="10MM">10 MM</option>
              </select>
            </div>
          )}

          {action === "INSTALLED" && (
            <div style={formGroup}>
              <label style={label}>Site/Client Name</label>
              <input
                id="siteInput"
                style={input}
                type="text"
                placeholder="Enter site or client name"
                value={site}
                onChange={(e) => setSite(e.target.value)}
              />
            </div>
          )}

          <button
            style={askButton}
            onClick={() => askAI()}
            disabled={loading || !action}
          >
            {loading ? (
              <>
                <span style={spinner}>⏳</span> AI is thinking...
              </>
            ) : (
              <>
                <span>✨</span> Ask AI Assistant
              </>
            )}
          </button>
        </div>

        {/* AI Response */}
        {result && (
          <div style={resultCard} ref={resultRef}>
            <div style={resultHeader}>
              <div style={resultTitle}>
                <span style={aiIcon}>🤖</span> AI Response
              </div>
              <div style={resultActions}>
                <button
                  id="copyBtn"
                  style={copyButton}
                  onClick={copyToClipboard}
                  title="Copy to clipboard"
                >
                  📋 Copy
                </button>
              </div>
            </div>
            <div style={resultContent}>
              <pre style={resultText}>{result}</pre>
            </div>
            <div style={resultFooter}>
              <span style={resultMeta}>
                Generated at {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !result && (
          <div style={loadingCard}>
            <div style={loadingAnimation}>
              <div style={loadingDot}></div>
              <div style={loadingDot}></div>
              <div style={loadingDot}></div>
            </div>
            <p style={loadingText}>AI is analyzing your request...</p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

export default AiAssistant;

/* ================= STYLES ================= */

const container = {
  maxWidth: "1400px",
  margin: "0 auto",
  padding: "24px 16px",
};

const headerCard = {
  background: "rgba(255, 255, 255, 0.95)",
  borderRadius: "16px",
  padding: "32px",
  marginBottom: "24px",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  border: "1px solid rgba(226, 232, 240, 0.8)",
};

const headerContent = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "16px",
};

const title = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#0f172a",
  margin: 0,
  marginBottom: "8px",
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitle = {
  fontSize: "16px",
  color: "#64748b",
  margin: 0,
};

const headerActions = {
  display: "flex",
  gap: "12px",
};

const historyButton = {
  padding: "10px 20px",
  borderRadius: "8px",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  background: "#ffffff",
  color: "#475569",
  fontWeight: "600",
  fontSize: "14px",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const quickActionsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "20px",
  marginBottom: "24px",
};

const quickActionCard = {
  background: "rgba(255, 255, 255, 0.95)",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  cursor: "pointer",
  transition: "all 0.2s ease",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

// Add hover effect via inline style with onMouseEnter/onMouseLeave

const quickActionIcon = {
  width: "56px",
  height: "56px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px",
  marginBottom: "8px",
};

const quickActionContent = {
  flex: 1,
};

const quickActionTitle = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#0f172a",
  margin: 0,
  marginBottom: "4px",
};

const quickActionDesc = {
  fontSize: "13px",
  color: "#64748b",
  margin: 0,
};

const quickActionBtn = {
  padding: "10px 16px",
  borderRadius: "8px",
  border: "none",
  color: "white",
  fontWeight: "600",
  fontSize: "14px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  alignSelf: "flex-start",
};

const formCard = {
  background: "rgba(255, 255, 255, 0.95)",
  borderRadius: "16px",
  padding: "28px",
  marginBottom: "24px",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  border: "1px solid rgba(226, 232, 240, 0.8)",
};

const formTitle = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#0f172a",
  margin: 0,
  marginBottom: "20px",
};

const formGroup = {
  marginBottom: "20px",
};

const label = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  color: "#475569",
  marginBottom: "8px",
};

const select = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: "8px",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "14px",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const input = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: "8px",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "14px",
  transition: "all 0.2s ease",
};

const askButton = {
  width: "100%",
  padding: "16px 24px",
  borderRadius: "8px",
  border: "none",
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  color: "white",
  fontWeight: "700",
  fontSize: "16px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};

const resultCard = {
  background: "rgba(255, 255, 255, 0.95)",
  borderRadius: "16px",
  padding: "24px",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  marginTop: "24px",
  animation: "slideIn 0.3s ease-out",
};

const resultHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
  paddingBottom: "16px",
  borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
};

const resultTitle = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#0f172a",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const aiIcon = {
  fontSize: "24px",
};

const resultActions = {
  display: "flex",
  gap: "8px",
};

const copyButton = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  background: "#f8fafc",
  color: "#475569",
  fontWeight: "600",
  fontSize: "13px",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const resultContent = {
  marginBottom: "16px",
};

const resultText = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#0f172a",
  whiteSpace: "pre-wrap",
  wordWrap: "break-word",
  margin: 0,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
};

const resultFooter = {
  paddingTop: "12px",
  borderTop: "1px solid rgba(226, 232, 240, 0.8)",
};

const resultMeta = {
  fontSize: "12px",
  color: "#94a3b8",
};

const loadingCard = {
  background: "rgba(255, 255, 255, 0.95)",
  borderRadius: "16px",
  padding: "40px",
  textAlign: "center",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  border: "1px solid rgba(226, 232, 240, 0.8)",
};

const loadingAnimation = {
  display: "flex",
  justifyContent: "center",
  gap: "8px",
  marginBottom: "16px",
};

const loadingDot = {
  width: "12px",
  height: "12px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  animation: "bounce 1.4s infinite ease-in-out",
};

const loadingText = {
  fontSize: "14px",
  color: "#64748b",
  margin: 0,
};

const historySidebar = {
  position: "fixed",
  right: 0,
  top: "70px",
  width: window.innerWidth < 768 ? "100%" : "320px",
  height: "calc(100vh - 70px)",
  background: "rgba(255, 255, 255, 0.98)",
  boxShadow: "-4px 0 6px -1px rgba(0, 0, 0, 0.1)",
  borderLeft: window.innerWidth < 768 ? "none" : "1px solid rgba(226, 232, 240, 0.8)",
  zIndex: 1000,
  display: "flex",
  flexDirection: "column",
  padding: "20px",
  overflowY: "auto",
};

const historyHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
  paddingBottom: "16px",
  borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
};

const closeBtn = {
  background: "transparent",
  border: "none",
  fontSize: "20px",
  cursor: "pointer",
  color: "#64748b",
  padding: "4px 8px",
};

const clearHistoryBtn = {
  width: "100%",
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  background: "#f8fafc",
  color: "#ef4444",
  fontWeight: "600",
  fontSize: "13px",
  cursor: "pointer",
  marginBottom: "16px",
};

const historyList = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const historyItem = {
  padding: "12px",
  borderRadius: "8px",
  background: "#f8fafc",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const historyQuery = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#0f172a",
  marginBottom: "4px",
};

const historyTime = {
  fontSize: "11px",
  color: "#94a3b8",
};

const emptyHistory = {
  textAlign: "center",
  padding: "40px 20px",
  color: "#94a3b8",
  fontSize: "14px",
};

const backdrop = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.5)",
  zIndex: 999,
  display: window.innerWidth < 768 ? "block" : "none",
};

const spinner = {
  display: "inline-block",
  animation: "spin 1s linear infinite",
};
