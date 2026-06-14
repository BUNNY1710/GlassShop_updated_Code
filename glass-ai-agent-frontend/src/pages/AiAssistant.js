import { useState, useEffect, useRef } from "react";
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

  const [waste, setWaste] = useState(null);
  const [wasteLoading, setWasteLoading] = useState(true);

  // Load the AI waste analysis on mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get("/api/ai/waste-analysis");
        if (alive) setWaste(r.data);
      } catch { /* keep null */ }
      finally { if (alive) setWasteLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

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

      const res = await api.post("/api/ai/ask", payload);

      // Animate typing effect
      const response = res.data?.message || res.data || "No response";
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
      color: "#FF6B81",
    },
    {
      id: "PREDICT",
      icon: "🔮",
      title: "Predict Demand",
      description: "AI-powered future demand prediction",
      color: "#A78BFA",
    },
    {
      id: "AVAILABLE",
      icon: "📦",
      title: "Check Stock",
      description: "Find available stock by type",
      color: "#4F5DFF",
    },
    {
      id: "INSTALLED",
      icon: "🏢",
      title: "Installed Glass",
      description: "View glass installed by client",
      color: "#37E3A5",
    },
  ];

  const inputStyle = {
    width: "100%",
    padding: "0 12px",
    height: 44,
    borderRadius: 10,
    border: "1.5px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    transition: "border 140ms ease",
  };

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer",
  };

  return (
    <div style={{ padding: "16px 16px 24px", minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Page header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            🤖 AI Assistant
          </h1>
          <p style={{ fontSize: 13, color: "#A9B3D1", margin: 0 }}>
            Get instant insights about your inventory with AI-powered analysis
          </p>
        </div>
        <button
          style={{
            padding: "0 20px",
            height: 40,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.08)",
            color: "#A9B3D1",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 140ms ease",
            whiteSpace: "nowrap",
          }}
          onClick={() => setShowHistory(!showHistory)}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#A9B3D1"; }}
          title="View Query History"
        >
          📜 History {queryHistory.length > 0 && `(${queryHistory.length})`}
        </button>
      </div>

      {/* ════ AI WASTE ANALYZER ════ */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 12px" }}>♻️ AI Waste Analyzer</h2>
        {wasteLoading ? (
          <div style={{ padding: 30, textAlign: "center", color: "#7180A6", background: "rgba(17,27,53,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 }}>Analyzing inventory…</div>
        ) : !waste ? (
          <div style={{ padding: 30, textAlign: "center", color: "#7180A6", background: "rgba(17,27,53,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 }}>No waste data yet. Run optimizations to generate remnants.</div>
        ) : (
          <>
            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 16 }}>
              {[
                { l: "Waste Generated", v: `${waste.summary.wasteArea} Sq.Ft`, c: "#FF6B81" },
                { l: "Estimated Loss", v: `₹${Number(waste.summary.estLoss).toLocaleString("en-IN")}`, c: "#FFB95E" },
                { l: "Waste %", v: `${waste.summary.wastePct}%`, c: "#A78BFA" },
                { l: "Potential Savings", v: `₹${Number(waste.potentialSavings).toLocaleString("en-IN")}`, c: "#37E3A5" },
              ].map(x => (
                <div key={x.l} style={{ background: "rgba(17,27,53,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: x.c, lineHeight: 1 }}>{x.v}</div>
                  <div style={{ fontSize: 10.5, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 5 }}>{x.l}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              {/* Top waste types + heatmap */}
              <div style={{ background: "rgba(17,27,53,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 12px" }}>🔥 Top Waste-Generating Glass</h3>
                {waste.heat.length === 0 ? <div style={{ color: "#7180A6", fontSize: 13 }}>No remnant waste recorded.</div> :
                  waste.heat.slice(0, 6).map(t => {
                    const dot = t.level === "HIGH" ? "🔴" : t.level === "MEDIUM" ? "🟡" : "🟢";
                    return (
                      <div key={t.type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ fontSize: 13, color: "#E2E8F0" }}>{dot} {t.type}</span>
                        <span style={{ fontSize: 12.5, color: "#A9B3D1" }}>{t.waste} Sq.Ft · <b style={{ color: "#fff" }}>₹{Number(t.loss).toLocaleString("en-IN")}</b></span>
                      </div>
                    );
                  })}
              </div>

              {/* Monthly trend */}
              <div style={{ background: "rgba(17,27,53,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>📉 Monthly Waste Trend</h3>
                {waste.trendPct !== 0 && (
                  <div style={{ fontSize: 12, color: waste.trendPct > 0 ? "#37E3A5" : "#FF6B81", marginBottom: 10 }}>
                    {waste.trendPct > 0 ? `▼ Reduced ${waste.trendPct}% over 6 months` : `▲ Increased ${Math.abs(waste.trendPct)}% over 6 months`}
                  </div>
                )}
                {(() => {
                  const max = Math.max(1, ...waste.trend.map(m => m.waste));
                  return waste.trend.map(m => (
                    <div key={m.month} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "#7180A6", width: 48, flexShrink: 0 }}>{m.month}</span>
                      <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${(m.waste / max) * 100}%`, height: "100%", background: "#A78BFA", borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#A9B3D1", width: 56, textAlign: "right", flexShrink: 0 }}>{m.waste} ft²</span>
                    </div>
                  ));
                })()}
              </div>

              {/* Remnant utilization */}
              <div style={{ background: "rgba(17,27,53,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 12px" }}>♻️ Remnant Utilization</h3>
                {[
                  ["Generated", waste.remnants.generated, "#A78BFA"],
                  ["Available (reusable)", waste.remnants.available, "#37E3A5"],
                  ["Reused / consumed", waste.remnants.reused, "#7180A6"],
                ].map(([l, v, c]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize: 13, color: "#A9B3D1" }}>{l}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI recommendations */}
            <div style={{ marginTop: 14, background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 14, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#A78BFA", margin: "0 0 12px" }}>✨ AI Recommendations</h3>
              {waste.recommendations.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "9px 0", borderTop: i ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <span style={{ fontSize: 13, color: "#E2E8F0", lineHeight: 1.4 }}>{r.text}</span>
                  {r.savings > 0 && <span style={{ fontSize: 12.5, fontWeight: 800, color: "#37E3A5", whiteSpace: "nowrap" }}>~₹{Number(r.savings).toLocaleString("en-IN")}/mo</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 16,
        marginBottom: 24,
      }}>
        {quickActions.map((qa) => (
          <div
            key={qa.id}
            style={{
              background: "rgba(17,27,53,0.9)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
              cursor: "pointer",
              transition: "transform 180ms ease, box-shadow 180ms ease",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.4)";
            }}
            onClick={() => {
              setAction(qa.id);
              if (qa.id === "AVAILABLE") {
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
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              background: `${qa.color}18`,
              border: `1px solid ${qa.color}30`,
            }}>
              {qa.icon}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>{qa.title}</h3>
              <p style={{ fontSize: 12, color: "#A9B3D1", margin: 0 }}>{qa.description}</p>
            </div>
            <button
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: qa.color,
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                alignSelf: "flex-start",
                transition: "opacity 140ms ease",
              }}
              onClick={(e) => {
                e.stopPropagation();
                askAI(qa.id);
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              Ask AI →
            </button>
          </div>
        ))}
      </div>

      {/* Backdrop — only shown on mobile */}
      {showHistory && window.innerWidth < 768 && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 999,
          }}
          onClick={() => setShowHistory(false)}
        />
      )}

      {/* Query History Sidebar */}
      {showHistory && (
        <div style={{
          position: "fixed",
          right: 0,
          top: "70px",
          width: window.innerWidth < 768 ? "100%" : "320px",
          height: "calc(100vh - 70px)",
          background: "rgba(11,18,38,0.98)",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.5)",
          borderLeft: window.innerWidth < 768 ? "none" : "1px solid rgba(255,255,255,0.08)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          padding: 20,
          overflowY: "auto",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            paddingBottom: 16,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}>
            <h3 style={{ margin: 0, color: "#fff", fontSize: 15, fontWeight: 700 }}>Query History</h3>
            <button
              style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "#A9B3D1", padding: "4px 8px" }}
              onClick={() => setShowHistory(false)}
            >✕</button>
          </div>
          {queryHistory.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#7180A6", fontSize: 14 }}>No queries yet</div>
          ) : (
            <>
              <button
                style={{
                  width: "100%",
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,107,129,0.3)",
                  background: "rgba(255,107,129,0.1)",
                  color: "#FF6B81",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  marginBottom: 16,
                }}
                onClick={clearHistory}
              >
                Clear History
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {queryHistory.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      transition: "all 160ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(79,93,255,0.12)";
                      e.currentTarget.style.borderColor = "rgba(79,93,255,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    }}
                    onClick={() => loadFromHistory(item)}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{item.query}</div>
                    <div style={{ fontSize: 11, color: "#7180A6" }}>{new Date(item.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Manual Query Form */}
      <div style={{
        background: "rgba(17,27,53,0.9)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 20px" }}>Custom Query</h3>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Action Type
          </label>
          <select
            style={selectStyle}
            value={action}
            onChange={(e) => setAction(e.target.value)}
            onFocus={(e) => { e.target.style.borderColor = "rgba(79,93,255,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(79,93,255,0.15)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
          >
            <option value="" style={{ background: "#0b1226" }}>Select an action</option>
            <option value="LOW_STOCK" style={{ background: "#0b1226" }}>🚨 Low Stock Alert</option>
            <option value="AVAILABLE" style={{ background: "#0b1226" }}>📦 Available Stock</option>
            <option value="INSTALLED" style={{ background: "#0b1226" }}>🏢 Installed Glass by Client</option>
            <option value="PREDICT" style={{ background: "#0b1226" }}>🔮 Predict Future Demand</option>
          </select>
        </div>

        {action === "AVAILABLE" && (
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Glass Type
            </label>
            <select
              id="glassTypeSelect"
              style={selectStyle}
              value={glassType}
              onChange={(e) => setGlassType(e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = "rgba(79,93,255,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(79,93,255,0.15)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
            >
              <option value="" style={{ background: "#0b1226" }}>Select glass type</option>
              <option value="5MM" style={{ background: "#0b1226" }}>5 MM</option>
              <option value="8MM" style={{ background: "#0b1226" }}>8 MM</option>
              <option value="10MM" style={{ background: "#0b1226" }}>10 MM</option>
            </select>
          </div>
        )}

        {action === "INSTALLED" && (
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#7180A6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Site / Client Name
            </label>
            <input
              id="siteInput"
              style={inputStyle}
              type="text"
              placeholder="Enter site or client name"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = "rgba(79,93,255,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(79,93,255,0.15)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
            />
          </div>
        )}

        <button
          style={{
            width: "100%",
            height: 46,
            borderRadius: 10,
            border: "none",
            background: loading || !action ? "rgba(79,93,255,0.45)" : "#4F5DFF",
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            cursor: loading || !action ? "not-allowed" : "pointer",
            transition: "background 140ms ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          onClick={() => askAI()}
          disabled={loading || !action}
          onMouseEnter={(e) => { if (!loading && action) e.currentTarget.style.background = "#3D4DE8"; }}
          onMouseLeave={(e) => { if (!loading && action) e.currentTarget.style.background = "#4F5DFF"; }}
        >
          {loading ? (
            <>
              <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span> AI is thinking...
            </>
          ) : (
            <>
              <span>✨</span> Ask AI Assistant
            </>
          )}
        </button>
      </div>

      {/* Loading State */}
      {loading && !result && (
        <div style={{
          background: "rgba(17,27,53,0.9)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 40,
          textAlign: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          marginBottom: 24,
        }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#4F5DFF",
                  animation: `bounce 1.4s infinite ease-in-out ${i * 0.16}s`,
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: 14, color: "#A9B3D1", margin: 0 }}>AI is analyzing your request...</p>
        </div>
      )}

      {/* AI Response */}
      {result && (
        <div
          style={{
            background: "rgba(17,27,53,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            borderLeft: "4px solid #4F5DFF",
          }}
          ref={resultRef}
        >
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            paddingBottom: 16,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>🤖</span> AI Response
            </div>
            <button
              id="copyBtn"
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#A9B3D1",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 140ms ease",
              }}
              onClick={copyToClipboard}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#A9B3D1"; }}
              title="Copy to clipboard"
            >
              📋 Copy
            </button>
          </div>
          <div style={{ marginBottom: 16 }}>
            <pre style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: "#37E3A5",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              margin: 0,
              fontFamily: "'Fira Mono', 'Consolas', monospace",
            }}>
              {result}
            </pre>
          </div>
          <div style={{ paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ fontSize: 11, color: "#7180A6" }}>
              Generated at {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default AiAssistant;
