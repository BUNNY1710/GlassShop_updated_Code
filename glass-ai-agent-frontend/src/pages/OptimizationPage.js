import { useState, useEffect, useMemo, useRef } from "react";
import PageWrapper from "../components/PageWrapper";
import api from "../api/api";
import {
  optimizeGlobal, planCuts, findMatches,
  fmtNum, fmtThickness,
  parseDim, toMM, fromMM, unitLabel,
} from "../utils/optimizationService";
import { printCuttingPlan } from "../utils/printCuttingPlan";
import { useStands } from "../api/standApi";
import "../styles/design-system.css";

/* ─── constants ───────────────────────────────────────────────────────────── */

const PALETTE = ["#4F5DFF","#37E3A5","#FFB95E","#FF6B81","#8B5CF6","#60A5FA","#F472B6","#34D399"];
const MEDALS  = ["🥇","🥈","🥉"];

const matchColors = {
  exact:   { badge:"Exact",   bg:"rgba(55,227,165,0.15)",  color:"#37E3A5", border:"rgba(55,227,165,0.3)" },
  good:    { badge:"Good",    bg:"rgba(255,185,94,0.15)",  color:"#FFB95E", border:"rgba(255,185,94,0.3)" },
  partial: { badge:"Partial", bg:"rgba(79,93,255,0.15)",   color:"#818CF8", border:"rgba(79,93,255,0.3)" },
  none:    { badge:"None",    bg:"rgba(113,128,166,0.15)", color:"#7180A6", border:"rgba(113,128,166,0.3)" },
};

/* ─── tiny helpers ────────────────────────────────────────────────────────── */

const isMob = () => window.innerWidth < 768;
const r2    = n => Math.round(n * 100) / 100;
const fmtSize = (h, w, unit) => `${fmtNum(parseDim(h))} × ${fmtNum(parseDim(w))} ${unitLabel(unit).toUpperCase()}`;

const niceInterval = (range) => {
  if (!range || range <= 0) return 1;
  const raw = range / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const n of [1,2,2.5,5,10]) if (raw <= n * mag) return n * mag;
  return 10 * mag;
};

const parseThickness = (raw) => {
  if (raw == null || raw === "") return null;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
};

const MatchBadge = ({ type }) => {
  const c = matchColors[type] || matchColors.none;
  return <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99, background:c.bg, color:c.color, whiteSpace:"nowrap" }}>{c.badge}</span>;
};

const MetricRow = ({ label, value, highlight }) => {
  const cols = {
    green:  ["rgba(55,227,165,0.12)","#37E3A5"],
    yellow: ["rgba(255,185,94,0.12)","#FFB95E"],
    red:    ["rgba(255,107,129,0.12)","#FF6B81"],
  };
  const [bg,cl] = cols[highlight]||["transparent","#A9B3D1"];
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 8px", borderRadius:6, marginBottom:3, background:bg }}>
      <span style={{ fontSize:12, color:"#7180A6" }}>{label}</span>
      <span style={{ fontSize:12, fontWeight:600, color:cl }}>{value}</span>
    </div>
  );
};

/* ─── Smart Cutting Layout SVG ────────────────────────────────────────────── */

const CuttingLayoutSVG = ({ plan, canvasW = 420, canvasH = 300, responsive = false }) => {
  if (!plan) return null;
  const { stockW, stockH, stockUnit, placed, remnant, steps } = plan;
  const ul = unitLabel(stockUnit);

  const ML=44, MT=30, MR=12, MB=34;
  const drawW = canvasW - ML - MR;
  const drawH = canvasH - MT - MB;
  const sx = drawW / stockW;
  const sy = drawH / stockH;

  const rx = v => ML + v * sx;
  const ry = v => MT + v * sy;

  const xInt = niceInterval(stockW);
  const yInt = niceInterval(stockH);
  const xTicks = [], yTicks = [];
  for (let t=0; t<=stockW+0.001; t+=xInt) xTicks.push(r2(t));
  for (let t=0; t<=stockH+0.001; t+=yInt) yTicks.push(r2(t));

  // Cut lines derived from placed piece boundaries
  const hCuts = [...new Set(placed.map(p => r2(p.y + p.h)).filter(y => y < stockH - 0.01))];
  const vCuts = placed
    .filter(p => r2(p.x + p.w) < stockW - 0.01)
    .map(p => ({ x: r2(p.x + p.w), y: p.y, h: p.h }));

  // Step number for each placed piece
  const pieceStep = {};
  let pStep = 1;
  steps.forEach(s => { if (s.type === "PIECE") { pieceStep[s.piece.idx] = pStep++; } });

  return (
    <svg viewBox={`0 0 ${canvasW} ${canvasH}`} preserveAspectRatio="xMidYMid meet"
      width={responsive ? "100%" : canvasW} height={responsive ? undefined : canvasH}
      style={responsive
        ? { display:"block", overflow:"visible", width:"100%", height:"auto" }
        : { display:"block", overflow:"visible", width:canvasW, height:canvasH, flexShrink:0 }}>
      <defs>
        <pattern id="hatch-w" patternUnits="userSpaceOnUse" width={8} height={8}>
          <path d="M0,8 L8,0 M-2,2 L2,-2 M6,10 L10,6" stroke="#7180A6" strokeWidth={0.7} opacity={0.45}/>
        </pattern>
        <pattern id="hatch-r" patternUnits="userSpaceOnUse" width={8} height={8}>
          <path d="M0,0 L8,8 M-2,6 L2,10 M6,-2 L10,2" stroke="#37E3A5" strokeWidth={0.7} opacity={0.4}/>
        </pattern>
      </defs>

      {/* Sheet background + waste hatch */}
      <rect x={ML} y={MT} width={drawW} height={drawH} fill="rgba(17,27,53,0.9)" stroke="#7180A6" strokeWidth={1.5}/>
      <rect x={ML} y={MT} width={drawW} height={drawH} fill="url(#hatch-w)"/>

      {/* Remnant piece (green hatch) */}
      {remnant && (
        <g>
          <rect x={rx(remnant.x)} y={ry(remnant.y)} width={remnant.w*sx} height={remnant.h*sy}
            fill="rgba(55,227,165,0.1)" stroke="#37E3A5" strokeWidth={1.5} strokeDasharray="5 3"/>
          <rect x={rx(remnant.x)} y={ry(remnant.y)} width={remnant.w*sx} height={remnant.h*sy} fill="url(#hatch-r)"/>
          <text x={rx(remnant.x)+remnant.w*sx/2} y={ry(remnant.y)+remnant.h*sy/2-6}
            textAnchor="middle" fontSize={9} fontWeight={700} fill="#37E3A5">
            REMNANT
          </text>
          <text x={rx(remnant.x)+remnant.w*sx/2} y={ry(remnant.y)+remnant.h*sy/2+7}
            textAnchor="middle" fontSize={8.5} fill="#37E3A5">
            {fmtNum(r2(remnant.w))} × {fmtNum(r2(remnant.h))} {stockUnit}
          </text>
        </g>
      )}

      {/* Order pieces */}
      {placed.map((p, i) => {
        const px = rx(p.x), py = ry(p.y), pw = p.w*sx, ph = p.h*sy;
        const small = pw < 55 || ph < 32;
        const col = PALETTE[p.piece.idx % PALETTE.length];
        const sn  = pieceStep[p.piece.idx];
        return (
          <g key={i}>
            <rect x={px} y={py} width={pw} height={ph}
              fill={col} fillOpacity={0.88} stroke="white" strokeWidth={1.5}/>
            {/* Step number circle */}
            {sn && <circle cx={px+12} cy={py+12} r={9} fill="white" fillOpacity={0.9}/>}
            {sn && <text x={px+12} y={py+16} textAnchor="middle" fontSize={9} fontWeight={800} fill={col}>{sn}</text>}
            {!small && (
              <>
                <text x={px+pw/2} y={py+ph/2-8} textAnchor="middle" fontSize={9} fontWeight={700} fill="white">
                  {(p.piece.customerName||"Order").slice(0,14)}
                </text>
                <text x={px+pw/2} y={py+ph/2+4} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.9)">
                  {fmtNum(r2(p.w))} × {fmtNum(r2(p.h))} {stockUnit}
                </text>
              </>
            )}
            {small && <text x={px+pw/2} y={py+ph/2+4} textAnchor="middle" fontSize={7.5} fontWeight={700} fill="white">{fmtNum(r2(p.w))}×{fmtNum(r2(p.h))}</text>}
          </g>
        );
      })}

      {/* Horizontal cut lines */}
      {hCuts.map((y, i) => (
        <line key={i} x1={ML} y1={ry(y)} x2={ML+drawW} y2={ry(y)}
          stroke="#FF6B81" strokeWidth={1.2} strokeDasharray="6 3" opacity={0.8}/>
      ))}

      {/* Vertical cut lines */}
      {vCuts.map((v, i) => (
        <line key={i} x1={rx(v.x)} y1={ry(v.y)} x2={rx(v.x)} y2={ry(v.y+v.h)}
          stroke="#FF6B81" strokeWidth={1.2} strokeDasharray="6 3" opacity={0.8}/>
      ))}

      {/* Top ruler */}
      {xTicks.map((t,i) => {
        const x = ML + (t/stockW)*drawW;
        return <g key={i}><line x1={x} y1={MT-4} x2={x} y2={MT} stroke="#7180A6" strokeWidth={0.8}/><text x={x} y={MT-7} textAnchor="middle" fontSize={8} fill="#7180A6">{fmtNum(t)}</text></g>;
      })}
      <text x={ML+drawW/2} y={11} textAnchor="middle" fontSize={8} fill="#7180A6">{stockUnit}</text>

      {/* Left ruler */}
      {yTicks.map((t,i) => {
        const y = MT + (t/stockH)*drawH;
        return <g key={i}><line x1={ML-4} y1={y} x2={ML} y2={y} stroke="#7180A6" strokeWidth={0.8}/><text x={ML-6} y={y+3} textAnchor="end" fontSize={8} fill="#7180A6">{fmtNum(t)}</text></g>;
      })}
      <text x={9} y={MT+drawH/2} textAnchor="middle" fontSize={8} fill="#7180A6"
        transform={`rotate(-90,9,${MT+drawH/2})`}>{stockUnit}</text>

      {/* Stock size label */}
      <text x={ML+drawW-2} y={MT-7} textAnchor="end" fontSize={9} fontWeight={600} fill="#4F5DFF">
        {fmtNum(r2(stockW))} × {fmtNum(r2(stockH))} {stockUnit}
      </text>

      {/* Cut line legend */}
      <line x1={ML} y1={canvasH-6} x2={ML+16} y2={canvasH-6} stroke="#FF6B81" strokeWidth={1.2} strokeDasharray="4 2"/>
      <text x={ML+20} y={canvasH-3} fontSize={8} fill="#7180A6">cut line</text>
      {remnant && <>
        <rect x={ML+70} y={canvasH-11} width={10} height={10} fill="rgba(55,227,165,0.1)" stroke="#37E3A5" strokeWidth={1}/>
        <text x={ML+84} y={canvasH-3} fontSize={8} fill="#7180A6">remnant</text>
      </>}
    </svg>
  );
};

/* ─── Waste metrics bar ───────────────────────────────────────────────────── */

const WasteBar = ({ plan }) => {
  if (!plan) return null;
  const { usedArea, wasteArea, remnant, stockArea, utilization, ul, stockUnit } = plan;
  return (
    <div style={{ display:"flex", borderTop:"1px solid rgba(255,255,255,0.08)", marginTop:6 }}>
      {[
        { label:"Used Area",      val:`${fmtNum(r2(usedArea))} sq.${ul}`,     col:"#4F5DFF" },
        { label:"Remnant Piece",  val:remnant ? `${fmtNum(r2(remnant.w))} × ${fmtNum(r2(remnant.h))} ${stockUnit}` : "—", col:"#37E3A5" },
        { label:"Waste",          val:`${fmtNum(r2(wasteArea))} sq.${ul}`,    col:wasteArea>stockArea*0.3?"#FF6B81":"#FFB95E" },
        { label:"Utilization",    val:`${utilization}%`,                       col:utilization>=70?"#37E3A5":utilization>=40?"#FFB95E":"#FF6B81" },
      ].map(({label,val,col}) => (
        <div key={label} style={{ flex:1, textAlign:"center", padding:"7px 3px", borderRight:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:col, letterSpacing:"-0.02em" }}>{val}</div>
          <div style={{ fontSize:10, color:"#7180A6", marginTop:1, textTransform:"uppercase", letterSpacing:"0.3px" }}>{label}</div>
        </div>
      ))}
    </div>
  );
};

/* ─── Cutting instructions ────────────────────────────────────────────────── */

const CuttingInstructions = ({ plan }) => {
  const [open, setOpen] = useState(false);
  if (!plan) return null;
  const { steps, stockUnit } = plan;
  return (
    <div style={{ marginTop:12, border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, overflow:"hidden" }}>
      <button
        onClick={() => setOpen(o=>!o)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:"rgba(255,255,255,0.04)", border:"none", cursor:"pointer", fontSize:13, fontWeight:600, color:"#ffffff" }}
      >
        <span>✂️ Cutting Instructions ({steps.filter(s=>s.type!=="PIECE"&&s.type!=="REMNANT").length} cuts)</span>
        <span style={{ color:"#7180A6", fontSize:12 }}>{open?"▲":"▼"}</span>
      </button>

      {open && (
        <div style={{ padding:"10px 14px" }}>
          {steps.map((s, i) => {
            const icons  = { H:"⟵", V:"⟷", PIECE:"📦", REMNANT:"♻️" };
            const colors = { H:"#FF6B81", V:"#FFB95E", PIECE:"#4F5DFF", REMNANT:"#37E3A5" };
            return (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"6px 0", borderBottom:i<steps.length-1?"1px solid rgba(255,255,255,0.06)":"none" }}>
                <span style={{ width:22, height:22, borderRadius:"50%", background:colors[s.type]||"rgba(255,255,255,0.1)", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, flexShrink:0, marginTop:1 }}>
                  {s.type==="PIECE"||s.type==="REMNANT" ? icons[s.type] : s.step}
                </span>
                <div>
                  <span style={{ fontSize:12.5, color:"#ffffff" }}>{s.label}</span>
                  {s.type==="H"&&<span style={{ marginLeft:6, fontSize:10, color:"#7180A6" }}>— horizontal cut</span>}
                  {s.type==="V"&&<span style={{ marginLeft:6, fontSize:10, color:"#7180A6" }}>— vertical cut</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Best Stock Suggestions ─────────────────────────────────────────────── */

const BestStockSuggestions = ({ best, alternatives, orders, allStock, mobile }) => {
  const candidates = [best, ...alternatives].filter(Boolean).slice(0, 3);
  if (!candidates.length) return null;

  return (
    <div style={{ marginTop:14 }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#7180A6", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>
        Best Stock Options
      </div>
      <div style={{ display:"grid", gridTemplateColumns:mobile?"1fr":"repeat(3,1fr)", gap:8 }}>
        {candidates.map((match, i) => {
          const su  = (match.stock.glass?.unit||"MM").toUpperCase();
          const ul  = unitLabel(su);
          const plan = planCuts(orders, match.stock);
          const stockHD = fromMM(match.stockHmm, su);
          const stockWD = fromMM(match.stockWmm, su);
          return (
            <div key={i} style={{ background:i===0?"rgba(79,93,255,0.15)":"rgba(255,255,255,0.04)", border:i===0?"1.5px solid rgba(79,93,255,0.5)":"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:16 }}>{MEDALS[i]||"•"}</div>
              <div style={{ fontSize:14, fontWeight:800, color:"#4F5DFF", letterSpacing:"-0.04em", margin:"2px 0" }}>
                Stand #{match.stock.standNo}
              </div>
              <div style={{ fontSize:11.5, color:"#A9B3D1", fontWeight:500, marginBottom:6 }}>
                {fmtNum(r2(stockWD))} × {fmtNum(r2(stockHD))} {su}
                {match.stock.glass?.type&&<span style={{ marginLeft:4, fontSize:10, background:"rgba(79,93,255,0.15)", color:"#4F5DFF", borderRadius:4, padding:"1px 5px", fontWeight:600 }}>{match.stock.glass.type}</span>}
              </div>
              {plan && <>
                <div style={{ fontSize:11, color:"#7180A6", marginBottom:2 }}>
                  Remnant: {plan.remnant ? <strong style={{ color:"#37E3A5" }}>{fmtNum(r2(plan.remnant.w))} × {fmtNum(r2(plan.remnant.h))} {su}</strong> : <span style={{ color:"#7180A6" }}>none</span>}
                </div>
                <div style={{ fontSize:11, color:"#7180A6", marginBottom:2 }}>
                  Waste: <strong style={{ color:plan.wasteArea<1?"#37E3A5":"#FFB95E" }}>{fmtNum(r2(plan.wasteArea))} sq.{ul}</strong>
                </div>
                <div style={{ fontSize:11, color:"#7180A6" }}>
                  Utilization: <strong style={{ color:plan.utilization>=70?"#37E3A5":"#FFB95E" }}>{plan.utilization}%</strong>
                </div>
              </>}
              {i===0&&<div style={{ fontSize:10, color:"#4F5DFF", fontWeight:600, marginTop:6, background:"rgba(79,93,255,0.15)", borderRadius:5, padding:"2px 7px", display:"inline-block" }}>
                ✓ Best choice
              </div>}
              {i===0&&candidates[1]&&plan&&(() => {
                const altPlan = planCuts(orders, candidates[1].stock);
                if (!altPlan) return null;
                const su2 = (candidates[1].stock.glass?.unit||"MM").toUpperCase();
                const ul2 = unitLabel(su2);
                const saved = r2(altPlan.wasteArea - plan.wasteArea);
                return saved > 0.01 ? (
                  <div style={{ fontSize:10, color:"#7180A6", marginTop:4, background:"rgba(55,227,165,0.08)", borderRadius:5, padding:"2px 7px" }}>
                    Saves {fmtNum(saved)} sq.{ul} waste vs #{candidates[1].stock.standNo}
                  </div>
                ) : null;
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Remnant to Inventory ────────────────────────────────────────────────── */

const AddRemnantButton = ({ plan, stock }) => {
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const [err,    setErr]    = useState("");

  if (!plan?.remnant || done) return done
    ? <div style={{ fontSize:12, color:"#37E3A5", fontWeight:600, marginTop:8 }}>✅ Remnant added to inventory</div>
    : null;

  const { remnant, stockUnit } = plan;

  const add = async () => {
    setSaving(true); setErr("");
    try {
      await api.post("/api/stock/update", {
        glassType:  stock.glass?.type || "",
        thickness:  stock.glass?.thickness || 0,
        unit:       stockUnit,
        height:     String(r2(remnant.h)),
        width:      String(r2(remnant.w)),
        quantity:   1,
        standNo:    stock.standNo,
        action:     "ADD",
        hsnNo:      null,
      });
      setDone(true);
    } catch (e) {
      setErr("Failed to add remnant. Try again.");
    } finally { setSaving(false); }
  };

  return (
    <div style={{ marginTop:12, background:"rgba(55,227,165,0.08)", border:"1px solid rgba(55,227,165,0.25)", borderRadius:10, padding:"10px 14px" }}>
      <div style={{ fontSize:13, fontWeight:600, color:"#37E3A5", marginBottom:4 }}>
        ♻️ Remnant Piece: {fmtNum(r2(remnant.w))} × {fmtNum(r2(remnant.h))} {stockUnit}
      </div>
      <div style={{ fontSize:12, color:"#7180A6", marginBottom:8 }}>
        {fmtNum(r2(remnant.area))} sq.{unitLabel(stockUnit)} · Save this piece back to inventory on Stand #{stock.standNo}.
      </div>
      {err && <div style={{ fontSize:11, color:"#FF6B81", marginBottom:6 }}>{err}</div>}
      <button
        onClick={add}
        disabled={saving}
        style={{ padding:"7px 16px", background:"#37E3A5", color:"#0f172a", border:"none", borderRadius:7, fontSize:12, fontWeight:700, cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1 }}
      >
        {saving ? "Adding…" : "Add Remnant to Inventory"}
      </button>
    </div>
  );
};

/* ─── Sticky Action Bar ─────────────────────────────────────────────────── */

const SIDEBAR_W = 240;

const StickyActionBar = ({ selected, total, allSelected, onSelectAll, onOptimize, running, mobile, isDesktop, mode }) => {
  const [isStuck, setIsStuck] = useState(false);
  const sentinelRef = useRef(null);
  const enabled = selected > 0 && !running;
  const topOffset = mobile ? 56 : 0;
  const leftOffset = isDesktop ? SIDEBAR_W : 0;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: 0, rootMargin: `-${topOffset}px 0px 0px 0px` }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [topOffset]);

  const barBase = {
    display: "flex", alignItems: "center", gap: 10,
    background: "rgba(10,18,40,0.97)",
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 2px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
    padding: "10px 14px",
  };

  const barContent = (
    <>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: selected > 0 ? "#ffffff" : "#7180A6", letterSpacing: "-0.01em", transition: "color 0.2s" }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: selected > 0 ? "#4F5DFF" : "#7180A6", transition: "color 0.2s" }}>{selected}</span>
        <span style={{ color: "#7180A6" }}>/{total} </span>
        Selected
      </span>
      {mode !== "single" && (
        <button onClick={onSelectAll} style={{ padding: "6px 14px", background: "rgba(255,255,255,0.07)", color: "#A9B3D1", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      )}
      <button onClick={onOptimize} disabled={!enabled} style={{ padding: "7px 18px", background: enabled ? "linear-gradient(135deg,#4F5DFF 0%,#7C3AED 100%)" : "rgba(79,93,255,0.2)", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: enabled ? "pointer" : "not-allowed", opacity: enabled ? 1 : 0.45, transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0, boxShadow: enabled ? "0 3px 12px rgba(79,93,255,0.4)" : "none" }}>
        {running ? "Planning…" : mode === "single" ? "Single Optimize ▶" : `Multi Optimize (${selected}) ▶`}
      </button>
    </>
  );

  return (
    <>
      {/* Sentinel: zero-height marker at the bar's natural position */}
      <div ref={sentinelRef} style={{ height: 0, pointerEvents: "none" }} />

      {/* In-flow bar — hidden (but occupies space) when fixed clone is showing */}
      <div style={{ ...barBase, borderRadius: 10, marginBottom: 12, visibility: isStuck ? "hidden" : "visible" }}>
        {barContent}
      </div>

      {/* Fixed clone — only rendered when bar has scrolled past viewport */}
      {isStuck && (
        <div style={{
          ...barBase,
          position: "fixed",
          top: topOffset,
          left: leftOffset,
          right: 0,
          zIndex: 50,
          borderRadius: 0,
          borderLeft: "none",
          borderRight: "none",
          borderTop: "none",
          padding: mobile ? "10px 14px" : "10px 20px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
        }}>
          {barContent}
        </div>
      )}
    </>
  );
};

/* ─── Smart Cutting Plan body (shared by PlannerModal + MasterPlanModal) ────── */
// Single source of truth for the visual cutting plan: stock pills, 2D layout SVG,
// waste/util bar, orders legend, cutting instructions, remnant, and print.
// Reused per-sheet in the Master Cutting Plan so every sheet looks identical to
// the single Smart Cutting Plan.

const SmartCuttingPlanBody = ({ plan, stock, orders, mobile, shopName, userName, canvasW, canvasH }) => {
  const [printOpts, setPrintOpts] = useState({ diagram: true, summary: true, remnant: true });
  const su = (stock.glass?.unit || "MM").toUpperCase();
  const doPrint = () => printCuttingPlan({
    plan, stock,
    orders: orders.map(o => ({ ...o, label: o.customerName })),
    options: printOpts,
    shopName: shopName || "Glass Shop",
    userName: userName || "",
  });

  return (
    <>
      {/* Stock info pill row */}
      <div style={pm.stockInfo}>
        <span style={pm.standBadge}>Stand #{stock.standNo}</span>
        <span style={pm.stockSize}>{fmtSize(stock.height, stock.width, stock.glass?.unit)}</span>
        {stock.glass?.type && <span style={pm.chip}>{stock.glass.type}</span>}
        {stock.glass?.thickness && <span style={pm.chip}>{fmtThickness(stock.glass.thickness)}</span>}
        {stock.quantity != null && <span style={pm.chip}>{stock.quantity} pcs</span>}
      </div>

      {/* 2D cutting layout + waste/util bar */}
      <div style={{ padding:"4px 14px 0" }}>
        <CuttingLayoutSVG plan={plan} canvasW={canvasW || (mobile?310:420)} canvasH={canvasH || (mobile?220:290)}/>
        <WasteBar plan={plan}/>
      </div>

      {/* Orders legend */}
      <div style={{ padding:"10px 14px 4px" }}>
        <div style={pm.legendTitle}>Orders in this plan</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {orders.map((o,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:10, height:10, borderRadius:2, background:PALETTE[i%PALETTE.length], flexShrink:0 }}/>
              <span style={{ fontSize:11, color:"#A9B3D1" }}>{o.customerName||"Order"} · {fmtSize(o.height,o.width,o.unit)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cutting instructions */}
      <div style={{ padding:"0 14px" }}>
        <CuttingInstructions plan={plan}/>
      </div>

      {/* Remnant to inventory */}
      <div style={{ padding:"0 14px" }}>
        <AddRemnantButton plan={plan} stock={stock}/>
      </div>

      {/* Print section */}
      <div style={{ margin:"4px 14px 14px", borderTop:"1px solid rgba(255,255,255,0.08)", paddingTop:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#7180A6", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:10 }}>
          Print Options
        </div>
        <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:12 }}>
          {[
            { key:"diagram",  label:"Cutting Diagram" },
            { key:"summary",  label:"Optimization Summary" },
            { key:"remnant",  label:"Remnant Details" },
          ].map(({ key, label }) => (
            <label key={key} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12.5, cursor:"pointer", color:"#A9B3D1" }}>
              <input
                type="checkbox"
                checked={printOpts[key]}
                onChange={() => setPrintOpts(p => ({ ...p, [key]: !p[key] }))}
                style={{ width:15, height:15, accentColor:"#4F5DFF" }}
              />
              {label}
            </label>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button
            style={{ padding:"7px 16px", background:"#4F5DFF", color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer" }}
            onClick={doPrint}>
            {mobile ? "Print" : "Print Cutting Plan"}
          </button>
          <button
            style={{ padding:"7px 16px", background:"rgba(255,255,255,0.08)", color:"#A9B3D1", border:"1px solid rgba(255,255,255,0.12)", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer" }}
            onClick={doPrint}>
            {mobile ? "Download PDF" : "Export PDF"}
          </button>
        </div>
      </div>
    </>
  );
};

/* ─── Cutting Planner Modal ───────────────────────────────────────────────── */

const PlannerModal = ({ open, onClose, stock, orders, best, alternatives, precomputedPlan, mobile, shopName, userName }) => {
  // Use the precomputed plan from findCombinedPlans when available (single source of truth)
  // so summary + modal always show identical pieces. Fall back to planCuts for single-order modals.
  const plan = useMemo(() => {
    if (!open || !stock) return null;
    if (precomputedPlan?.placed) return precomputedPlan;
    return planCuts(orders, stock);
  }, [open, stock, orders, precomputedPlan]);
  if (!open || !stock) return null;

  return (
    <div style={pm.overlay} onClick={onClose}>
      <div style={pm.box(mobile)} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={pm.header}>
          <strong style={{ fontSize:15, color:"#ffffff" }}>✂️ Smart Cutting Plan</strong>
          <button style={pm.closeBtn} onClick={onClose}>✕</button>
        </div>

        <SmartCuttingPlanBody plan={plan} stock={stock} orders={orders} mobile={mobile} shopName={shopName} userName={userName}/>

        {/* Best stock suggestions */}
        {best && (
          <div style={{ padding:"0 14px 16px" }}>
            <BestStockSuggestions best={best} alternatives={alternatives||[]} orders={orders} allStock={[]} mobile={mobile}/>
          </div>
        )}
      </div>
    </div>
  );
};

const pm = {
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:20000, backdropFilter:"blur(4px)" },
  box: m => ({
    background:"rgba(17,27,53,0.97)", borderRadius:m?"20px 20px 0 0":14,
    width:m?"100%":"min(96vw,500px)",
    maxHeight:m?"92vh":"90vh", overflowY:"auto",
    boxShadow:"0 24px 64px rgba(0,0,0,0.55)",
    border:"1px solid rgba(255,255,255,0.08)",
    animation:m?"slideUp 0.22s cubic-bezier(0.32,0.72,0,1)":"fadeIn 0.15s ease-out",
    ...(m?{ position:"fixed", bottom:0, left:0, right:0 }:{}),
  }),
  header: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px 10px", borderBottom:"1px solid rgba(255,255,255,0.08)", position:"sticky", top:0, background:"rgba(17,27,53,0.97)", zIndex:1 },
  closeBtn: { background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"50%", width:28, height:28, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", color:"#A9B3D1" },
  stockInfo: { display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", padding:"10px 16px 8px" },
  standBadge: { fontSize:13, fontWeight:800, color:"#4F5DFF", background:"rgba(79,93,255,0.15)", borderRadius:6, padding:"3px 10px" },
  stockSize: { fontSize:13, fontWeight:600, color:"#ffffff" },
  chip: { fontSize:11, background:"rgba(255,255,255,0.08)", color:"#A9B3D1", borderRadius:4, padding:"2px 8px" },
  legendTitle: { fontSize:11, fontWeight:700, color:"#7180A6", textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:6 },
};

/* ─── Optimization stats + batch grouping helpers ───────────────────────────── */

const batchLetter = i => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : "");

// Material-only stats (no currency): how much stock the packing saved.
const computeOptStats = (results) => {
  const sheetPlans = results?.sheetPlans || [];
  const plans = sheetPlans.map(p => p.cuttingPlan || planCuts(p.orders, p.stock));
  const usedArea  = r2(plans.reduce((s,p)=> s + (p?.usedArea  || 0), 0));
  const stockArea = r2(plans.reduce((s,p)=> s + (p?.stockArea || 0), 0));
  const wasteArea = r2(plans.reduce((s,p)=> s + (p?.wasteArea || 0), 0));
  const overallUtil = stockArea > 0 ? r2((usedArea / stockArea) * 100) : 0;
  const sheetsUsed = sheetPlans.length;
  // Naive baseline: every distinct placed order-line would need its own sheet.
  const placedOrderKeys = new Set();
  sheetPlans.forEach(p => p.orders.forEach(o => placedOrderKeys.add(o.orderKey || o.key)));
  const naiveSheets = placedOrderKeys.size;
  const sheetsSaved = Math.max(0, naiveSheets - sheetsUsed);
  const remnants = plans.filter(p => p?.remnant).length;
  return { plans, usedArea, stockArea, wasteArea, overallUtil, sheetsUsed, naiveSheets, sheetsSaved, remnants };
};

// Each stock sheet = a "batch". Pieces grouped back to their original order-line.
const buildBatches = (results) => {
  const sheetPlans = results?.sheetPlans || [];
  return sheetPlans.map((plan, i) => {
    const cPlan = plan.cuttingPlan || planCuts(plan.orders, plan.stock);
    const byOrder = {};
    plan.orders.forEach(o => {
      const k = o.orderKey || o.key;
      if (!byOrder[k]) byOrder[k] = { ...o, count: 0 };
      byOrder[k].count++;
    });
    return {
      index: i,
      label: `Batch ${batchLetter(i)}`,
      plan, cPlan,
      stock: plan.stock,
      su: (plan.stock.glass?.unit || "MM").toUpperCase(),
      orders: Object.values(byOrder),
      pieceCount: plan.orders.length,
      eff: plan.efficiency,
    };
  });
};

// orderKey -> [{ label, sheet, count }] so each order shows which batch(es) it landed in.
const orderBatchMap = (results) => {
  const map = {};
  (results?.sheetPlans || []).forEach((plan, i) => {
    const lbl = `Batch ${batchLetter(i)}`;
    const counts = {};
    plan.orders.forEach(o => { const k = o.orderKey || o.key; counts[k] = (counts[k] || 0) + 1; });
    Object.entries(counts).forEach(([k, c]) => {
      if (!map[k]) map[k] = [];
      map[k].push({ label: lbl, sheet: i + 1, count: c });
    });
  });
  return map;
};

/* ─── Step 2: Optimization Summary popup ────────────────────────────────────── */

const OptimizationSummaryModal = ({ open, onClose, onViewPlan, results }) => {
  if (!open || !results) return null;
  const s = computeOptStats(results);
  const { summary, orderCount = 0 } = results;

  const cell = (label, val, col) => (
    <div key={label} style={{ background:"rgba(255,255,255,0.04)", borderRadius:9, padding:"12px 14px", textAlign:"center" }}>
      <div style={{ fontSize:22, fontWeight:800, color:col, letterSpacing:"-0.03em", lineHeight:1 }}>{val}</div>
      <div style={{ fontSize:10.5, color:"#7180A6", marginTop:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</div>
    </div>
  );

  return (
    <div style={pm.overlay} onClick={onClose}>
      <div style={{ background:"rgba(17,27,53,0.98)", borderRadius:16, width:"min(94vw,520px)", maxHeight:"90vh", overflowY:"auto", border:"1px solid rgba(255,255,255,0.1)", boxShadow:"0 24px 64px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 18px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <strong style={{ fontSize:16, color:"#fff" }}>📊 Optimization Summary</strong>
          <button style={pm.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding:"18px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
            {cell("Selected Orders", orderCount, "#4F5DFF")}
            {cell("Total Quantity",  summary.total, "#818CF8")}
            {cell("Sheets Used",     s.sheetsUsed, "#FFB95E")}
            {cell("Sheets Saved",    s.sheetsSaved, s.sheetsSaved>0?"#37E3A5":"#7180A6")}
            {cell("Material Utilization", `${s.overallUtil}%`, s.overallUtil>=70?"#37E3A5":s.overallUtil>=40?"#FFB95E":"#FF6B81")}
            {cell("Total Waste",     fmtNum(s.wasteArea), "#A9B3D1")}
          </div>

          {summary.noMatch>0 && (
            <div style={{ marginTop:12, padding:"10px 12px", borderRadius:9, background:"rgba(255,107,129,0.1)", border:"1px solid rgba(255,107,129,0.25)", color:"#FF6B81", fontSize:12.5 }}>
              ⚠️ {summary.noMatch} piece{summary.noMatch!==1?"s":""} had no matching stock and could not be placed.
            </div>
          )}

          <div style={{ marginTop:14, padding:"10px 12px", borderRadius:9, background:"rgba(79,93,255,0.08)", border:"1px solid rgba(79,93,255,0.2)" }}>
            <div style={{ fontSize:10.5, color:"#7180A6", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>Optimization Strategy</div>
            <div style={{ fontSize:12.5, color:"#A9B3D1" }}>Pieces grouped by glass type, then guillotine bin-packed onto the fewest stock sheets (largest sheet first) to maximise utilization and reclaim remnants.</div>
          </div>

          <button
            onClick={onViewPlan}
            style={{ marginTop:18, width:"100%", padding:"13px 0", background:"linear-gradient(135deg,#4F5DFF 0%,#7C3AED 100%)", color:"#fff", border:"none", borderRadius:11, fontSize:14.5, fontWeight:800, cursor:"pointer", boxShadow:"0 6px 20px rgba(79,93,255,0.5)", letterSpacing:"-0.01em" }}>
            View Plan →
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Step 3: Optimized Order Sheet (full-screen single planning sheet) ──────── */

const OptimizedOrderSheet = ({ open, onClose, results, shopName, userName, onConfirmed }) => {
  // Hooks must run before any early return.
  const [confirming, setConfirming]       = useState(false);
  const [confirmed, setConfirmed]         = useState(null);   // { sheetsConsumed, remnantsCreated, ordersUpdated, already? }
  const [confirmError, setConfirmError]   = useState("");
  const [showRemnantModal, setShowRemnant] = useState(false);
  const [remnantAssign, setRemnantAssign] = useState([]);     // [{ ...remnant, standNo }]
  const [sameStand, setSameStand]         = useState(true);
  const [sameStandValue, setSameStandValue] = useState("");
  const { standNumbers } = useStands();

  // Reset confirmation state whenever a new plan is shown.
  useEffect(() => {
    setConfirmed(null); setConfirmError(""); setShowRemnant(false);
  }, [results?.planRef]);

  if (!open || !results) return null;
  const s = computeOptStats(results);
  const batches = buildBatches(results);
  const obMap = orderBatchMap(results);
  const selectedOrders = results.selectedOrders || [];
  const { summary, orderCount = 0, unplacedPieces = [] } = results;

  // Remnants across all batches (each placed sheet that left a remnant).
  const remnants = batches
    .filter(b => b.cPlan?.remnant)
    .map((b, i) => ({
      idx: i,
      batchLabel: b.label,
      glassType: b.stock.glass?.type || "",
      thickness: b.stock.glass?.thickness || null,
      unit: b.su,
      width: r2(b.cPlan.remnant.w),
      height: r2(b.cPlan.remnant.h),
      sourceStandNo: b.stock.standNo,
      sheetW: b.stock.width,
      sheetH: b.stock.height,
    }));

  // value → feet divisor for the remnant's unit (for live Sq.Ft).
  const unitDivisor = (u) => u === "MM" ? 304.8 : u === "FEET" ? 1 : 12;
  const remnantMetrics = (r) => {
    const h = parseFloat(r.height) || 0;
    const w = parseFloat(r.width) || 0;
    const div = unitDivisor(r.unit);
    return { h, w, areaUnit: h * w, sqft: (h / div) * (w / div), valid: h > 0 && w > 0 };
  };
  const allRemnantsValid =
    remnantAssign.every(r => remnantMetrics(r).valid) &&
    (sameStand ? (parseInt(sameStandValue, 10) >= 1)
               : remnantAssign.every(r => parseInt(r.standNo, 10) >= 1));

  // Aggregate consumed sheets by stock id.
  const buildSheetsPayload = () => {
    const counts = {};
    (results.sheetPlans || []).forEach(p => {
      const id = p.stock?.id;
      if (id != null) counts[id] = (counts[id] || 0) + 1;
    });
    return Object.entries(counts).map(([stockId, count]) => ({ stockId: Number(stockId), count }));
  };

  const orderIds = [...new Set(selectedOrders.map(o => o.quotationId).filter(Boolean))];

  const doConfirm = async (remnantsPayload) => {
    setConfirming(true);
    setConfirmError("");
    try {
      const { data } = await api.post("/api/optimization/confirm", {
        planRef: results.planRef,
        sheets: buildSheetsPayload(),
        remnants: remnantsPayload,
        orders: orderIds,
        summary: { sheets: s.sheetsUsed, placed: summary.placed, total: summary.total },
      });
      setConfirmed(data);
      setShowRemnant(false);
      onConfirmed && onConfirmed();
    } catch (e) {
      if (e?.response?.status === 409 && e?.response?.data?.alreadyConfirmed) {
        setConfirmed({ already: true });
        setShowRemnant(false);
      } else {
        setConfirmError(e?.response?.data?.message || "Failed to confirm cutting plan.");
      }
    } finally {
      setConfirming(false);
    }
  };

  const onConfirmClick = () => {
    if (confirmed || confirming) return;
    if (remnants.length > 0) {
      // Open remnant placement modal, default each to its source stand.
      setRemnantAssign(remnants.map(r => ({ ...r, standNo: String(r.sourceStandNo || "") })));
      setSameStand(true);
      setSameStandValue(String(remnants[0]?.sourceStandNo || ""));
      setShowRemnant(true);
    } else {
      doConfirm([]);
    }
  };

  const saveRemnants = () => {
    if (!allRemnantsValid) { setConfirmError("Please enter valid remnant dimensions."); return; }
    const payload = remnantAssign.map(r => ({
      glassType: r.glassType, thickness: r.thickness, unit: r.unit,
      width: parseFloat(r.width), height: parseFloat(r.height),
      standNo: sameStand ? sameStandValue : r.standNo,
    }));
    doConfirm(payload);
  };

  const printSheet = () => window.print();

  const exportCSV = () => {
    const rows = [];
    rows.push(["Optimized Order Sheet"]);
    rows.push([shopName || "Glass Shop", userName || "", new Date().toLocaleString()]);
    rows.push([]);
    rows.push(["Total Orders", orderCount, "Total Qty", summary.total, "Sheets Used", s.sheetsUsed, "Sheets Saved", s.sheetsSaved, "Utilization %", s.overallUtil, "Total Waste", s.wasteArea]);
    rows.push([]);
    rows.push(["Order", "Quotation #", "Glass Type", "Thickness", "Size", "Qty", "Assigned Batch"]);
    selectedOrders.forEach(o => {
      const b = (obMap[o.key] || []).map(x => `${x.label} x${x.count}`).join(" | ") || "Unplaced";
      rows.push([o.customerName, o.quotationNo, o.glassType || "", o.thickness || "", `${o.height} x ${o.width} ${o.unit}`, o.quantity, b]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `optimized-order-sheet-${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const th = { textAlign:"left", padding:"9px 12px", fontSize:11, fontWeight:700, color:"#7180A6", textTransform:"uppercase", letterSpacing:"0.04em", borderBottom:"1px solid rgba(255,255,255,0.12)", whiteSpace:"nowrap" };
  const td = { padding:"9px 12px", fontSize:13, color:"#E6EAF5", borderBottom:"1px solid rgba(255,255,255,0.06)" };

  const resultCell = (label, val, col) => (
    <div key={label} style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"12px 14px", textAlign:"center" }}>
      <div style={{ fontSize:24, fontWeight:800, color:col, letterSpacing:"-0.03em", lineHeight:1 }}>{val}</div>
      <div style={{ fontSize:10.5, color:"#7180A6", marginTop:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</div>
    </div>
  );

  return (
    <div className="opt-order-sheet" style={{ position:"fixed", inset:0, background:"#0A1228", zIndex:20002, display:"flex", flexDirection:"column" }}>
      {/* Print rules: only the sheet prints, on white. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .opt-order-sheet, .opt-order-sheet * { visibility: visible !important; }
          .opt-order-sheet { position:absolute !important; inset:0 !important; height:auto !important; background:#fff !important; color:#000 !important; display:block !important; }
          .oos-toolbar { display:none !important; }
          .opt-order-sheet .oos-card { background:#fff !important; border:1px solid #bbb !important; box-shadow:none !important; }
          .opt-order-sheet table, .opt-order-sheet th, .opt-order-sheet td { color:#000 !important; background:#fff !important; border-color:#999 !important; }
          .opt-order-sheet .oos-muted { color:#333 !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="oos-toolbar" style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 18px", borderBottom:"1px solid rgba(255,255,255,0.1)", background:"rgba(10,18,40,0.99)", flexShrink:0, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:160 }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#fff", letterSpacing:"-0.02em" }}>📋 Optimized Order Sheet</div>
          <div style={{ fontSize:11, color:"#7180A6", marginTop:1 }}>{shopName||"Glass Shop"}{userName?` · ${userName}`:""} · {new Date().toLocaleDateString()}</div>
        </div>
        <button onClick={exportCSV}  style={{ padding:"8px 14px", background:"rgba(55,227,165,0.15)", color:"#37E3A5", border:"1px solid rgba(55,227,165,0.35)", borderRadius:8, fontSize:12.5, fontWeight:700, cursor:"pointer" }}>⬇ Excel (CSV)</button>
        <button onClick={printSheet} style={{ padding:"8px 14px", background:"rgba(79,93,255,0.15)", color:"#818CF8", border:"1px solid rgba(79,93,255,0.35)", borderRadius:8, fontSize:12.5, fontWeight:700, cursor:"pointer" }}>⬇ PDF</button>
        <button onClick={printSheet} style={{ padding:"8px 14px", background:"#4F5DFF", color:"#fff", border:"none", borderRadius:8, fontSize:12.5, fontWeight:700, cursor:"pointer" }}>🖨 Print Plan</button>
        <button onClick={onClose} style={{ width:34, height:34, borderRadius:"50%", background:"rgba(255,255,255,0.08)", border:"none", color:"#A9B3D1", cursor:"pointer", fontSize:15 }}>✕</button>
      </div>

      {/* Scrollable single sheet */}
      <div className="oos-body" style={{ flex:1, overflowY:"auto", padding:"20px 16px 48px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", flexDirection:"column", gap:18 }}>

          {/* Optimization Result */}
          <div className="oos-card" style={{ background:"rgba(13,21,44,0.95)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:"16px 18px" }}>
            <h2 style={{ fontSize:16, fontWeight:800, color:"#fff", margin:"0 0 12px", letterSpacing:"-0.02em" }}>Optimization Result</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10 }}>
              {resultCell("Total Orders", orderCount, "#4F5DFF")}
              {resultCell("Total Quantity", summary.total, "#818CF8")}
              {resultCell("Sheets Used", s.sheetsUsed, "#FFB95E")}
              {resultCell("Sheets Saved", s.sheetsSaved, s.sheetsSaved>0?"#37E3A5":"#7180A6")}
              {resultCell("Utilization", `${s.overallUtil}%`, s.overallUtil>=70?"#37E3A5":s.overallUtil>=40?"#FFB95E":"#FF6B81")}
              {resultCell("Total Waste", fmtNum(s.wasteArea), "#FF6B81")}
              {resultCell("Remnants", s.remnants, "#37E3A5")}
              {resultCell("Unplaced", summary.noMatch, summary.noMatch>0?"#FF6B81":"#7180A6")}
            </div>
          </div>

          {/* Master orders table — every order on one sheet */}
          <div className="oos-card" style={{ background:"rgba(13,21,44,0.95)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, overflow:"hidden" }}>
            <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.08)", fontSize:14, fontWeight:800, color:"#fff" }}>All Orders ({selectedOrders.length})</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>
                  <th style={th}>Order</th><th style={th}>Quotation #</th><th style={th}>Glass</th><th style={th}>Thickness</th><th style={th}>Size</th><th style={th}>Qty</th><th style={th}>Assigned Batch</th>
                </tr></thead>
                <tbody>
                  {selectedOrders.map((o,i)=>{
                    const b = obMap[o.key] || [];
                    return (
                      <tr key={i}>
                        <td style={{ ...td, fontWeight:600, color:"#fff" }}>{o.customerName}</td>
                        <td style={td} className="oos-muted">#{o.quotationNo}</td>
                        <td style={td}>{o.glassType||"—"}</td>
                        <td style={td}>{o.thickness?fmtThickness(o.thickness):"—"}</td>
                        <td style={td}>{fmtSize(o.height,o.width,o.unit)}</td>
                        <td style={{ ...td, fontWeight:700 }}>{o.quantity}</td>
                        <td style={td}>
                          {b.length
                            ? b.map((x,j)=><span key={j} style={{ display:"inline-block", marginRight:6, marginBottom:3, fontSize:11.5, fontWeight:700, padding:"2px 8px", borderRadius:6, background:"rgba(79,93,255,0.18)", color:"#818CF8" }}>{x.label} ×{x.count}</span>)
                            : <span style={{ fontSize:11.5, fontWeight:700, color:"#FF6B81" }}>Unplaced</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Batch groups — table + visual layout per stock sheet */}
          <h2 style={{ fontSize:16, fontWeight:800, color:"#fff", margin:"4px 0 0", letterSpacing:"-0.02em" }}>Batches ({batches.length})</h2>
          {batches.map(b => {
            const ul = unitLabel(b.su);
            return (
              <div key={b.index} className="oos-card" style={{ background:"rgba(13,21,44,0.95)", border:"1px solid rgba(255,255,255,0.1)", borderTop:`4px solid ${b.eff>=70?"#37E3A5":b.eff>=40?"#FFB95E":"#4F5DFF"}`, borderRadius:14, overflow:"hidden" }}>
                {/* Batch header */}
                <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.03)" }}>
                  <span style={{ fontSize:16, fontWeight:800, color:"#fff" }}>{b.label}</span>
                  <span style={{ fontSize:12.5, fontWeight:700, color:"#4F5DFF", background:"rgba(79,93,255,0.15)", borderRadius:7, padding:"3px 10px" }}>Sheet {b.index+1} · Stand #{b.stock.standNo}</span>
                  <span style={{ fontSize:12.5, color:"#A9B3D1" }}>{fmtSize(b.stock.height,b.stock.width,b.su)}</span>
                  {b.stock.glass?.type && <span style={{ fontSize:11.5, padding:"2px 8px", borderRadius:5, background:"rgba(255,255,255,0.07)", color:"#A9B3D1" }}>{b.stock.glass.type}</span>}
                  <span style={{ marginLeft:"auto", fontSize:11.5, fontWeight:700, padding:"3px 10px", borderRadius:99, background:b.eff>=70?"rgba(55,227,165,0.15)":"rgba(255,185,94,0.15)", color:b.eff>=70?"#37E3A5":"#FFB95E" }}>{b.eff}% util</span>
                </div>

                {/* Batch order table */}
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr>
                      <th style={th}>Order</th><th style={th}>Quotation #</th><th style={th}>Glass</th><th style={th}>Size</th><th style={th}>Pieces</th>
                    </tr></thead>
                    <tbody>
                      {b.orders.map((o,j)=>(
                        <tr key={j}>
                          <td style={{ ...td, fontWeight:600, color:"#fff" }}>
                            <span style={{ display:"inline-block", width:10, height:10, borderRadius:3, background:PALETTE[(o.idx??j)%PALETTE.length], marginRight:7 }}/>
                            {o.customerName}
                          </td>
                          <td style={td} className="oos-muted">#{o.quotationNo}</td>
                          <td style={td}>{o.glassType||"—"}</td>
                          <td style={td}>{fmtSize(o.height,o.width,o.unit)}</td>
                          <td style={{ ...td, fontWeight:700 }}>{o.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Batch metrics strip */}
                <div style={{ display:"flex", flexWrap:"wrap", gap:18, padding:"10px 16px", borderTop:"1px solid rgba(255,255,255,0.06)", fontSize:12.5 }} className="oos-muted">
                  <span>Combined Pieces: <strong style={{ color:"#fff" }}>{b.pieceCount}</strong></span>
                  <span>Utilization: <strong style={{ color:b.eff>=70?"#37E3A5":"#FFB95E" }}>{b.eff}%</strong></span>
                  <span>Waste: <strong style={{ color:"#FF6B81" }}>{fmtNum(r2(b.cPlan?.wasteArea||0))} sq.{ul}</strong></span>
                  <span>Remnant: <strong style={{ color:"#37E3A5" }}>{b.cPlan?.remnant?`${fmtNum(r2(b.cPlan.remnant.w))} × ${fmtNum(r2(b.cPlan.remnant.h))} ${b.su}`:"none"}</strong></span>
                </div>

                {/* Visual cutting layout */}
                <div style={{ padding:"14px 16px 18px", background:"rgba(7,13,28,0.5)" }}>
                  <CuttingLayoutSVG plan={b.cPlan} canvasW={760} canvasH={460} responsive/>
                </div>
              </div>
            );
          })}

          {/* Unplaced */}
          {unplacedPieces.length>0 && (
            <div className="oos-card" style={{ background:"rgba(255,107,129,0.06)", border:"1px solid rgba(255,107,129,0.25)", borderRadius:14, padding:"14px 18px" }}>
              <h3 style={{ fontSize:14, fontWeight:700, color:"#FF6B81", margin:"0 0 10px" }}>⚠️ No Matching Stock — {unplacedPieces.length} piece{unplacedPieces.length!==1?"s":""}</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {unplacedPieces.map((p,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", padding:"7px 10px", background:"rgba(255,107,129,0.06)", borderRadius:7 }}>
                    <span style={{ fontWeight:600, color:"#fff", fontSize:13 }}>{p.customerName}</span>
                    <span style={{ fontSize:11, color:"#7180A6" }}>#{p.quotationNo}</span>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:4, background:"rgba(255,107,129,0.15)", color:"#FF6B81" }}>{fmtSize(p.height,p.width,p.unit)}</span>
                    {p.glassType && <span style={{ fontSize:11, padding:"2px 8px", borderRadius:4, background:"rgba(79,93,255,0.15)", color:"#4F5DFF" }}>{p.glassType}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Confirm Cutting Plan ── */}
          {s.sheetsUsed > 0 && (
            <div className="oos-card no-print" style={{ background:"rgba(13,21,44,0.95)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:"18px 20px", textAlign:"center" }}>
              {confirmed ? (
                <div>
                  <div style={{ fontSize:34, marginBottom:6 }}>✅</div>
                  <div style={{ fontSize:17, fontWeight:800, color:"#37E3A5" }}>Plan Confirmed</div>
                  <div style={{ fontSize:13, color:"#A9B3D1", marginTop:4 }}>
                    {confirmed.already
                      ? "This plan was already confirmed — inventory was not changed again."
                      : `${confirmed.sheetsConsumed} sheet${confirmed.sheetsConsumed!==1?"s":""} deducted · ${confirmed.remnantsCreated} remnant${confirmed.remnantsCreated!==1?"s":""} saved · ${confirmed.ordersUpdated} order${confirmed.ordersUpdated!==1?"s":""} marked Cut.`}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize:13, color:"#A9B3D1", marginBottom:12 }}>
                    Confirming deducts <strong style={{ color:"#fff" }}>{s.sheetsUsed}</strong> sheet{s.sheetsUsed!==1?"s":""} from inventory
                    {remnants.length ? <>, saves <strong style={{ color:"#37E3A5" }}>{remnants.length}</strong> remnant{remnants.length!==1?"s":""}</> : null}
                    , and marks <strong style={{ color:"#fff" }}>{orderIds.length}</strong> order{orderIds.length!==1?"s":""} as Cut.
                  </div>
                  {confirmError && <div style={{ marginBottom:10, color:"#FF6B81", fontSize:13 }}>{confirmError}</div>}
                  <button onClick={onConfirmClick} disabled={confirming}
                    style={{ padding:"13px 28px", background:"linear-gradient(135deg,#37E3A5 0%,#10B981 100%)", color:"#04210f", border:"none", borderRadius:11, fontSize:15, fontWeight:800, cursor:confirming?"default":"pointer", opacity:confirming?0.7:1, boxShadow:"0 6px 20px rgba(55,227,165,0.4)" }}>
                    {confirming ? "Confirming…" : "✓ Confirm Cutting Plan"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Remnant placement modal ── */}
      {showRemnantModal && (
        <div onClick={()=>!confirming && setShowRemnant(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:20010, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 16px", overflowY:"auto" }}>
          <div onClick={e=>e.stopPropagation()}
            style={{ background:"rgba(17,27,53,0.99)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:14, width:"100%", maxWidth:640, boxShadow:"0 24px 64px rgba(0,0,0,0.6)" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>♻️ Remnant Detected</div>
                <div style={{ fontSize:12.5, color:"#7180A6", marginTop:2 }}>{remnantAssign.length} remnant{remnantAssign.length!==1?"s":""} — choose a stand to store each back into inventory</div>
              </div>
              <button onClick={()=>setShowRemnant(false)} style={{ width:28, height:28, borderRadius:8, background:"rgba(255,255,255,0.08)", border:"none", color:"#A9B3D1", cursor:"pointer", fontSize:14 }}>✕</button>
            </div>
            <div style={{ padding:"16px 20px", maxHeight:"68vh", overflowY:"auto" }}>
              <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#A9B3D1", cursor:"pointer", marginBottom:6 }}>
                <input type="checkbox" checked={sameStand} onChange={e=>setSameStand(e.target.checked)} style={{ width:16, height:16, accentColor:"#4F5DFF" }}/>
                Apply the same stand to all remnants
              </label>
              {sameStand && (
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                  <span style={{ fontSize:13, color:"#7180A6" }}>Store all remnants on</span>
                  <select value={sameStandValue} onChange={e=>setSameStandValue(e.target.value)}
                    style={{ minWidth:140, background:"rgba(255,255,255,0.06)", border:`1.5px solid ${parseInt(sameStandValue,10)>=1?"rgba(255,255,255,0.12)":"#FF6B81"}`, borderRadius:8, height:38, padding:"0 12px", color:"#fff", fontSize:14, outline:"none" }}>
                    <option value="">Select stand</option>
                    {standNumbers.map(n => <option key={n} value={n}>Stand #{n}</option>)}
                  </select>
                </div>
              )}

              {/* One detailed review card per remnant */}
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {remnantAssign.map((r, i) => {
                  const m = remnantMetrics(r);
                  const ul = unitLabel(r.unit);
                  const lockField = (label, val) => (
                    <div>
                      <div style={{ fontSize:10, color:"#7180A6", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }}>{label}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:"#A9B3D1" }}>{val}</div>
                    </div>
                  );
                  const dimInput = (field) => (
                    <input type="number" min="0" step="0.01" value={r[field]}
                      onChange={e=>setRemnantAssign(prev => prev.map((x,j)=> j===i ? { ...x, [field]: e.target.value } : x))}
                      style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.06)", border:`1.5px solid ${m.valid?"rgba(79,93,255,0.4)":"#FF6B81"}`, borderRadius:8, height:38, padding:"0 12px", color:"#fff", fontSize:14, outline:"none" }}/>
                  );
                  return (
                    <div key={i} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:12, overflow:"hidden" }}>
                      <div style={{ padding:"9px 14px", background:"rgba(55,227,165,0.1)", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:13, fontWeight:800, color:"#37E3A5" }}>♻️ Remnant #{i+1}</span>
                        <span style={{ fontSize:11.5, color:"#7180A6" }}>{r.batchLabel}</span>
                      </div>
                      <div style={{ padding:"12px 14px" }}>
                        {/* Locked details */}
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"10px 16px", marginBottom:12 }}>
                          {lockField("Glass Type", r.glassType || "—")}
                          {lockField("Thickness", r.thickness ? fmtThickness(r.thickness) : "—")}
                          {lockField("Original Sheet", fmtSize(r.sheetH, r.sheetW, r.unit))}
                          {lockField("Source Stand", `#${r.sourceStandNo}`)}
                        </div>
                        {/* Editable dimensions */}
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:10 }}>
                          <div>
                            <div style={{ fontSize:11, color:"#A9B3D1", fontWeight:600, marginBottom:5 }}>Height ({ul})</div>
                            {dimInput("height")}
                          </div>
                          <div>
                            <div style={{ fontSize:11, color:"#A9B3D1", fontWeight:600, marginBottom:5 }}>Width ({ul})</div>
                            {dimInput("width")}
                          </div>
                        </div>
                        {/* Live area */}
                        <div style={{ display:"flex", gap:18, flexWrap:"wrap", fontSize:12.5, color:"#7180A6", marginBottom: sameStand ? 0 : 10 }}>
                          <span>Area: <strong style={{ color:"#fff" }}>{fmtNum(r2(m.areaUnit))} sq.{ul}</strong></span>
                          <span>Sq.Ft: <strong style={{ color:"#37E3A5" }}>{fmtNum(r2(m.sqft))}</strong></span>
                        </div>
                        {/* Per-remnant stand (when not applying same stand) */}
                        {!sameStand && (
                          <div style={{ display:"flex", alignItems:"center", gap:10, borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:10 }}>
                            <span style={{ fontSize:12.5, color:"#A9B3D1", fontWeight:600 }}>Store In Stand</span>
                            <select value={r.standNo}
                              onChange={e=>setRemnantAssign(prev => prev.map((x,j)=> j===i ? { ...x, standNo:e.target.value } : x))}
                              style={{ minWidth:130, background:"rgba(255,255,255,0.06)", border:`1.5px solid ${parseInt(r.standNo,10)>=1?"rgba(255,255,255,0.12)":"#FF6B81"}`, borderRadius:8, height:34, padding:"0 10px", color:"#fff", fontSize:13, outline:"none" }}>
                              <option value="">Select stand</option>
                              {standNumbers.map(n => <option key={n} value={n}>Stand #{n}</option>)}
                            </select>
                          </div>
                        )}
                        {!m.valid && (
                          <div style={{ marginTop:8, fontSize:12, color:"#FF6B81" }}>⚠️ Please enter valid remnant dimensions.</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {confirmError && <div style={{ marginTop:12, color:"#FF6B81", fontSize:13 }}>{confirmError}</div>}
            </div>
            <div style={{ padding:"14px 20px", borderTop:"1px solid rgba(255,255,255,0.08)", display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={()=>setShowRemnant(false)} disabled={confirming}
                style={{ padding:"9px 18px", borderRadius:8, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.08)", color:"#A9B3D1", fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancel</button>
              <button onClick={saveRemnants} disabled={confirming || !allRemnantsValid}
                style={{ padding:"9px 20px", borderRadius:8, border:"none", background:"#37E3A5", color:"#04210f", fontSize:13, fontWeight:800, cursor:(confirming||!allRemnantsValid)?"not-allowed":"pointer", opacity:(confirming||!allRemnantsValid)?0.5:1 }}>
                {confirming ? "Saving…" : "Save Remnant & Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Main Page ───────────────────────────────────────────────────────────── */

export default function OptimizationPage() {
  const [mobile,    setMobile]   = useState(isMob());
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [quotations, setQ]       = useState([]);
  const [allStock,  setStock]    = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [error,     setError]    = useState("");
  const [selected,  setSel]      = useState(new Set());
  const [status,    setStatus]   = useState("ALL");
  const [mode,      setMode]     = useState("multi"); // "single" | "multi"
  const [results,   setResults]  = useState(null);
  const [running,   setRunning]  = useState(false);
  const [showRes,   setShowRes]  = useState(false);
  const [modal,              setModal]          = useState({ open:false });
  const [summaryOpen,    setSummaryOpen]    = useState(false); // multi-order: post-Optimize summary popup
  const [planOpen,       setPlanOpen]       = useState(false); // multi-order: full-screen Optimized Order Sheet
  const [shopName,       setShopName]       = useState("Glass Shop");
  const [userName,       setUserName]       = useState("");

  useEffect(() => {
    const r = () => { setMobile(isMob()); setIsDesktop(window.innerWidth >= 1024); };
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [qR, sR, pR] = await Promise.all([
          api.get("/api/quotations"),
          api.get("/api/stock/all"),
          api.get("/api/auth/profile").catch(() => ({ data: {} })),
        ]);
        setQ(Array.isArray(qR.data) ? qR.data : []);
        setStock((Array.isArray(sR.data) ? sR.data : []).filter(s => s.quantity > 0));
        if (pR.data?.shop?.shopName) setShopName(pR.data.shop.shopName);
        if (pR.data?.userName) setUserName(pR.data.userName);
      } catch (e) {
        setError(e?.response?.status === 403
          ? "Access Denied — you do not have permission to view optimization data. Ask an admin to grant View Optimization (and View Stock / View Quotations)."
          : "Unable to load data. Please try again.");
      }
      finally { setLoading(false); }
    })();
  }, []);

  const filteredQ = useMemo(() =>
    !status||status==="ALL" ? quotations : quotations.filter(q=>(q.status||"").toUpperCase()===status),
  [quotations,status]);

  const allItems = useMemo(() => {
    const rows = [];
    filteredQ.forEach(q => {
      (q.items||[]).forEach((item,idx) => {
        rows.push({
          key:`${q.id}-${idx}`,
          quotationId:q.id,
          quotationNo:q.quotationNumber||q.id,
          customerName:q.customerName||q.customer?.customerName||q.customer?.name||"Customer Deleted",
          glassType:item.glassType||"",
          height:String(item.height||""),
          width:String(item.width||""),
          unit:(item.heightUnit||item.widthUnit||"FEET").toUpperCase(),
          quantity:item.quantity||1,
          thickness:parseThickness(item.thickness),
        });
      });
    });
    return rows;
  }, [filteredQ]);

  const toggle = key => {
    if (mode === "single") {
      // Single mode: only one item selectable at a time
      setSel(p => p.has(key) ? new Set() : new Set([key]));
    } else {
      setSel(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });
    }
  };
  const toggleAll = () => {
    if (mode === "single") return; // no-op in single mode
    setSel(selected.size === allItems.length ? new Set() : new Set(allItems.map(i => i.key)));
  };

  const runOpt = () => {
    const chosen = allItems.filter(i => selected.has(i.key));
    if (!chosen.length) return;

    if (mode === "single") {
      const order = chosen[0];
      setRunning(true);
      setTimeout(() => {
        const qty = Math.max(1, parseInt(order.quantity) || 1);
        const expanded = Array.from({ length: qty }, (_, q) => ({ ...order, quantity: 1, key: `${order.key}-${q}` }));
        const matches = findMatches(order, allStock);
        const suggestions = matches.map(m => {
          const plan = planCuts(expanded, m.stock);
          if (!plan || plan.placed.length === 0) return null;
          return { match: m, plan };
        }).filter(Boolean).sort((a, b) => {
          if (b.plan.utilization !== a.plan.utilization) return b.plan.utilization - a.plan.utilization;
          return (a.plan.wasteArea || 0) - (b.plan.wasteArea || 0);
        });
        const best = suggestions[0] || null;
        setResults({ mode: "single", order, best: best?.match || null, plan: best?.plan || null, suggestions });
        setShowRes(true);
        setRunning(false);
      }, 300);
      return;
    }

    // Multi-order: expand all quantities and pack globally
    const expanded = [];
    chosen.forEach(item => {
      const qty = Math.max(1, parseInt(item.quantity) || 1);
      for (let q = 0; q < qty; q++) {
        expanded.push({ ...item, quantity: 1, key: `${item.key}-${q}`, orderKey: item.key });
      }
    });
    setRunning(true);
    setTimeout(() => {
      const multiResult = optimizeGlobal(expanded, allStock);
      // Per-order single-glass suggestions for the alternatives section
      const perOrderSuggestions = chosen.map(order => {
        const oqty = Math.max(1, parseInt(order.quantity) || 1);
        const oExpanded = Array.from({ length: oqty }, (_, q) => ({ ...order, quantity: 1, key: `${order.key}-${q}` }));
        const matches = findMatches(order, allStock);
        const suggestions = matches.slice(0, 5).map(m => {
          const plan = planCuts(oExpanded, m.stock);
          if (!plan || plan.placed.length === 0) return null;
          return { match: m, plan };
        }).filter(Boolean).sort((a, b) => b.plan.utilization - a.plan.utilization);
        return { order, suggestions };
      }).filter(p => p.suggestions.length > 0);
      const planRef = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setResults({ ...multiResult, mode: "multi", perOrderSuggestions, selectedOrders: chosen, orderCount: chosen.length, planRef });
      setShowRes(true);
      setRunning(false);
      setSummaryOpen(true);   // Step 2: show summary popup first (not inline cards)
      setPlanOpen(false);
    }, 300);
  };

  const openModal = (stock, orders, best, alts, precomputedPlan) => setModal({ open:true, stock, orders, best, alternatives:alts||[], shopName, userName, precomputedPlan });
  const reset = () => { setShowRes(false); setResults(null); setSel(new Set()); setSummaryOpen(false); setPlanOpen(false); };

  if (loading) return (
    <PageWrapper>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh" }}>
        <div style={{ width:32,height:32,border:"3px solid rgba(255,255,255,0.1)",borderTopColor:"#4F5DFF",borderRadius:"50%",animation:"spin 0.7s linear infinite" }}/>
        <p style={{ color:"#7180A6",marginTop:12 }}>Loading…</p>
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <div style={{ maxWidth:1100,margin:"0 auto",padding:mobile?"16px 12px":"20px 16px",width:"100%",boxSizing:"border-box" }}>

        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:mobile?22:26,fontWeight:800,color:"#ffffff",margin:"0 0 4px",letterSpacing:"-0.03em",fontFamily:"'Inter',sans-serif" }}>
              📐 Smart Cutting Planner
            </h1>
            <p style={{ fontSize:13,color:"#A9B3D1",margin:0 }}>
              Select orders · find the best stock · generate a cutter-ready plan.
            </p>
          </div>
          {showRes&&(
            <button onClick={reset} style={{ padding:"7px 16px", background:"rgba(255,255,255,0.08)", color:"#A9B3D1", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
              ← New Plan
            </button>
          )}
        </div>

        {error&&<div style={{ background:"rgba(255,107,129,0.12)",color:"#FF6B81",borderRadius:8,padding:"12px 16px",fontSize:13,fontWeight:500,marginBottom:16,border:"1px solid rgba(255,107,129,0.3)" }}>{error}</div>}

        {/* ── SELECTION ── */}
        {!showRes&&(
          <>
            {/* Status filter + Mode selector row */}
            <div style={{ display:"flex",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:10,padding:"10px 14px",background:"rgba(17,27,53,0.9)",borderRadius:10,border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }}>
              <span style={{ fontSize:11,fontWeight:700,color:"#7180A6",textTransform:"uppercase",letterSpacing:"0.5px" }}>STATUS:</span>
              {["ALL","DRAFT","PENDING","CONFIRMED"].map(st=>(
                <button key={st} onClick={()=>{setStatus(st);setSel(new Set());}} style={{ padding:"4px 12px",borderRadius:99,cursor:"pointer",border:status===st?"1.5px solid rgba(79,93,255,0.5)":"1.5px solid rgba(255,255,255,0.08)",background:status===st?"rgba(79,93,255,0.15)":"transparent",color:status===st?"#4F5DFF":"#7180A6",fontSize:12,fontWeight:600 }}>{st}</button>
              ))}
            </div>

            {/* Optimization mode selector */}
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"10px 14px",background:"rgba(17,27,53,0.9)",borderRadius:10,border:"1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize:11,fontWeight:700,color:"#7180A6",textTransform:"uppercase",letterSpacing:"0.5px",marginRight:4 }}>MODE:</span>
              {[
                { key:"single", label:"Single Order", desc:"One order at a time" },
                { key:"multi",  label:"Multi-Order",  desc:"Combine compatible orders" },
              ].map(m=>(
                <button key={m.key} onClick={()=>{setMode(m.key);setSel(new Set());}}
                  style={{ display:"flex",flexDirection:"column",alignItems:"flex-start",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,transition:"all 120ms",
                    border:mode===m.key?"1.5px solid rgba(79,93,255,0.5)":"1.5px solid rgba(255,255,255,0.08)",
                    background:mode===m.key?"rgba(79,93,255,0.15)":"transparent",
                    color:mode===m.key?"#4F5DFF":"#7180A6" }}>
                  <span>{m.label}</span>
                  <span style={{ fontSize:10,fontWeight:400,opacity:0.7,marginTop:1 }}>{m.desc}</span>
                </button>
              ))}
              {mode==="single"&&<span style={{ fontSize:11,color:"#7180A6",marginLeft:4 }}>— tap one order below</span>}
            </div>

            {allItems.length > 0 && (
              <StickyActionBar
                selected={selected.size}
                total={allItems.length}
                allSelected={selected.size === allItems.length}
                onSelectAll={toggleAll}
                onOptimize={runOpt}
                running={running}
                mobile={mobile}
                isDesktop={isDesktop}
                mode={mode}
              />
            )}

            {allItems.length===0
              ? (
                <div style={{ background:"rgba(17,27,53,0.9)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"40px 20px", textAlign:"center" }}>
                  <div style={{ fontSize:44,marginBottom:10 }}>📋</div>
                  <p style={{ color:"#A9B3D1",fontWeight:600 }}>No orders found</p>
                  <p style={{ color:"#7180A6",fontSize:13 }}>Try a different status filter.</p>
                </div>
              )
              : (
                <div style={{ display:"grid",gridTemplateColumns:mobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:10 }}>
                  {allItems.map(item=>{
                    const sel=selected.has(item.key);
                    return (
                      <div key={item.key} onClick={()=>toggle(item.key)} style={{ background:sel?"rgba(79,93,255,0.15)":"rgba(17,27,53,0.9)",border:sel?"1.5px solid rgba(79,93,255,0.5)":"1.5px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"12px 14px",cursor:"pointer",transition:"all 120ms ease" }}>
                        <div style={{ display:"flex",alignItems:"flex-start",gap:10 }}>
                          <input type="checkbox" readOnly checked={sel} onClick={e=>{e.stopPropagation();toggle(item.key);}} style={{ width:16,height:16,accentColor:"#4F5DFF",marginTop:2,flexShrink:0 }}/>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:13.5,fontWeight:700,color:"#ffffff",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:6 }}>
                              {item.customerName}
                              <span style={{ fontSize:11,color:"#7180A6",background:"rgba(255,255,255,0.06)",borderRadius:4,padding:"1px 6px" }}>#{item.quotationNo}</span>
                            </div>
                            <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
                              {item.glassType&&<span style={{ fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:5,background:"rgba(79,93,255,0.15)",color:"#4F5DFF" }}>{item.glassType}</span>}
                              <span style={{ fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:5,background:"rgba(79,93,255,0.15)",color:"#4F5DFF" }}>{fmtSize(item.height,item.width,item.unit)}</span>
                              <span style={{ fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:5,background:"rgba(255,255,255,0.06)",color:"#7180A6" }}>Qty {item.quantity}</span>
                            </div>
                          </div>
                          {sel&&<span style={{ width:22,height:22,borderRadius:"50%",background:"#4F5DFF",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0 }}>✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }

          </>
        )}

        {/* ── RESULTS ── */}

        {/* ── Single Optimization Result ── */}
        {showRes&&results&&results.mode==="single"&&(
          <>
            {/* Order chip */}
            <div style={{ background:"rgba(17,27,53,0.9)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
              <span style={{ fontSize:13,fontWeight:700,color:"#ffffff" }}>{results.order.customerName}</span>
              <span style={{ fontSize:11,color:"#7180A6",background:"rgba(255,255,255,0.06)",borderRadius:4,padding:"1px 6px" }}>#{results.order.quotationNo}</span>
              <span style={{ fontSize:12,color:"#A9B3D1" }}>
                {fmtSize(results.order.height,results.order.width,results.order.unit)}
                {results.order.glassType&&` · ${results.order.glassType}`}
                {` · Qty ${results.order.quantity}`}
              </span>
            </div>

            {!results.suggestions?.length?(
              <div style={{ background:"rgba(255,107,129,0.1)",border:"1px solid rgba(255,107,129,0.3)",borderRadius:10,padding:"16px 18px",fontSize:13,color:"#FF6B81",fontWeight:500 }}>
                ⚠️ {results.order.glassType
                  ?`No stock available for Glass Type: ${results.order.glassType}. This order cannot be optimized.`
                  :"No suitable stock found for this order."}
              </div>
            ):(
              <>
                {/* ── 🏆 Best Optimization Plan ── */}
                <div style={{ background:"rgba(17,27,53,0.95)",border:"2px solid rgba(255,185,94,0.35)",borderRadius:12,overflow:"hidden",marginBottom:16 }}>
                  {/* Header */}
                  <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,185,94,0.05)" }}>
                    <span style={{ fontSize:13,fontWeight:800,color:"#FFB95E",background:"rgba(255,185,94,0.15)",borderRadius:6,padding:"3px 10px",letterSpacing:"-0.01em" }}>🏆 Best Optimization Plan</span>
                    <span style={{ fontSize:13,fontWeight:700,color:"#4F5DFF",background:"rgba(79,93,255,0.15)",borderRadius:6,padding:"3px 10px" }}>Stand #{results.best.stock.standNo}</span>
                    <span style={{ fontSize:13,fontWeight:600,color:"#ffffff" }}>{fmtSize(results.best.stock.height,results.best.stock.width,results.best.stock.glass?.unit)}</span>
                    {results.best.stock.glass?.type&&<span style={{ fontSize:11,background:"rgba(255,255,255,0.08)",color:"#A9B3D1",borderRadius:4,padding:"2px 8px" }}>{results.best.stock.glass.type}</span>}
                    {results.best.stock.glass?.thickness&&<span style={{ fontSize:11,background:"rgba(255,255,255,0.08)",color:"#A9B3D1",borderRadius:4,padding:"2px 8px" }}>{fmtThickness(results.best.stock.glass.thickness)}</span>}
                    <span style={{ fontSize:11,background:"rgba(255,255,255,0.08)",color:"#A9B3D1",borderRadius:4,padding:"2px 8px" }}>{results.best.stock.quantity} pcs</span>
                    {!results.best.sameUnit&&<span style={{ fontSize:11,color:"#FFB95E",background:"rgba(255,185,94,0.1)",borderRadius:4,padding:"2px 8px" }}>⚠️ Unit mismatch</span>}
                    <span style={{ marginLeft:"auto",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,background:results.plan.utilization>=70?"rgba(55,227,165,0.15)":"rgba(255,185,94,0.15)",color:results.plan.utilization>=70?"#37E3A5":"#FFB95E" }}>{results.plan.utilization}% utilization</span>
                  </div>
                  {/* SVG + WasteBar */}
                  <div style={{ padding:"12px 16px 0" }}>
                    <CuttingLayoutSVG plan={results.plan} canvasW={mobile?310:520} canvasH={mobile?220:320}/>
                    <WasteBar plan={results.plan}/>
                  </div>
                  {/* Instructions */}
                  <div style={{ padding:"0 16px" }}>
                    <CuttingInstructions plan={results.plan}/>
                  </div>
                  {/* Add remnant */}
                  <div style={{ padding:"0 16px" }}>
                    <AddRemnantButton plan={results.plan} stock={results.best.stock}/>
                  </div>
                  {/* Print */}
                  <div style={{ margin:"8px 16px 16px",paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",gap:8,flexWrap:"wrap" }}>
                    <button style={{ padding:"7px 16px",background:"#4F5DFF",color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer" }}
                      onClick={()=>printCuttingPlan({ plan:results.plan, stock:results.best.stock, orders:[{...results.order,label:results.order.customerName}], options:{diagram:true,summary:true,remnant:true}, shopName, userName })}>
                      {mobile?"Print":"Print Cutting Plan"}
                    </button>
                    <button style={{ padding:"7px 16px",background:"rgba(255,255,255,0.08)",color:"#A9B3D1",border:"1px solid rgba(255,255,255,0.12)",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer" }}
                      onClick={()=>printCuttingPlan({ plan:results.plan, stock:results.best.stock, orders:[{...results.order,label:results.order.customerName}], options:{diagram:true,summary:true,remnant:true}, shopName, userName })}>
                      {mobile?"PDF":"Export PDF"}
                    </button>
                  </div>
                </div>

                {/* ── All Stock Suggestions ── */}
                {results.suggestions.length>0&&(
                  <div style={{ marginBottom:16 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                      <h3 style={{ fontSize:14,fontWeight:700,color:"#ffffff",margin:0 }}>All Stock Suggestions</h3>
                      <span style={{ fontSize:11,padding:"2px 8px",borderRadius:99,background:"rgba(255,255,255,0.07)",color:"#7180A6" }}>{results.suggestions.length} option{results.suggestions.length!==1?"s":""}</span>
                    </div>
                    <div style={{ display:"grid",gridTemplateColumns:mobile?"1fr":"repeat(auto-fill,minmax(240px,1fr))",gap:10 }}>
                      {results.suggestions.map((s,i)=>{
                        const su=(s.match.stock.glass?.unit||"MM").toUpperCase();
                        const ul=unitLabel(su);
                        const isBest=i===0;
                        return (
                          <div key={i} style={{ background:isBest?"rgba(255,185,94,0.05)":"rgba(17,27,53,0.9)",border:isBest?"1.5px solid rgba(255,185,94,0.35)":"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"14px 16px",display:"flex",flexDirection:"column",gap:0 }}>
                            {/* Card header */}
                            <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:8,flexWrap:"wrap" }}>
                              {isBest&&<span style={{ fontSize:10,fontWeight:800,color:"#FFB95E",background:"rgba(255,185,94,0.15)",borderRadius:4,padding:"2px 6px" }}>🏆 Best</span>}
                              <span style={{ fontSize:12,fontWeight:700,color:isBest?"#FFB95E":"#A9B3D1" }}>Suggestion #{i+1}</span>
                              <span style={{ marginLeft:"auto",fontSize:11,fontWeight:700,color:"#4F5DFF",background:"rgba(79,93,255,0.15)",borderRadius:4,padding:"2px 8px" }}>Stand #{s.match.stock.standNo}</span>
                            </div>
                            {/* Stock info */}
                            <div style={{ fontSize:12,color:"#ffffff",fontWeight:600,marginBottom:2 }}>{fmtSize(s.match.stock.height,s.match.stock.width,su)}</div>
                            <div style={{ fontSize:11,color:"#7180A6",marginBottom:8 }}>
                              {s.match.stock.glass?.type&&`${s.match.stock.glass.type}`}
                              {s.match.stock.glass?.type&&s.match.stock.glass?.thickness&&" · "}
                              {s.match.stock.glass?.thickness&&fmtThickness(s.match.stock.glass.thickness)}
                              {(s.match.stock.glass?.type||s.match.stock.glass?.thickness)&&` · `}
                              {s.match.stock.quantity} pcs
                            </div>
                            {/* Metrics 2×2 grid */}
                            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 10px",marginBottom:10 }}>
                              <div>
                                <div style={{ fontSize:10,color:"#7180A6",marginBottom:1 }}>Utilization</div>
                                <div style={{ fontSize:15,fontWeight:800,color:s.plan.utilization>=70?"#37E3A5":s.plan.utilization>=40?"#FFB95E":"#FF6B81",letterSpacing:"-0.03em" }}>{s.plan.utilization}%</div>
                              </div>
                              <div>
                                <div style={{ fontSize:10,color:"#7180A6",marginBottom:1 }}>Used Area</div>
                                <div style={{ fontSize:12,fontWeight:600,color:"#ffffff" }}>{fmtNum(r2(s.plan.usedArea))} sq.{ul}</div>
                              </div>
                              <div>
                                <div style={{ fontSize:10,color:"#7180A6",marginBottom:1 }}>Waste</div>
                                <div style={{ fontSize:12,fontWeight:600,color:"#FF6B81" }}>{fmtNum(r2(s.plan.wasteArea))} sq.{ul}</div>
                              </div>
                              <div>
                                <div style={{ fontSize:10,color:"#7180A6",marginBottom:1 }}>Remnant</div>
                                <div style={{ fontSize:11,fontWeight:600,color:"#A9B3D1" }}>{s.plan.remnant?`${fmtNum(r2(s.plan.remnant.w))}×${fmtNum(r2(s.plan.remnant.h))} ${su}`:"none"}</div>
                              </div>
                            </div>
                            {/* View Plan button */}
                            <button
                              style={{ width:"100%",padding:"7px 0",background:isBest?"rgba(255,185,94,0.15)":"rgba(79,93,255,0.15)",color:isBest?"#FFB95E":"#4F5DFF",border:`1px solid ${isBest?"rgba(255,185,94,0.4)":"rgba(79,93,255,0.3)"}`,borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer",marginTop:"auto" }}
                              onClick={()=>openModal(s.match.stock,[{...results.order,label:results.order.customerName}],s.match,[],s.plan)}>
                              ✂️ View Plan
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Multi-Order Optimization Result (compact — full plan opens via View Plan) ── */}
        {showRes&&results&&results.mode==="multi"&&(
          <>
            {results.sheetPlans.length>0 ? (
              <div style={{ background:"rgba(17,27,53,0.9)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:"24px 22px", textAlign:"center" }}>
                <div style={{ fontSize:36, marginBottom:6 }}>✅</div>
                <h3 style={{ fontSize:19, fontWeight:800, color:"#fff", margin:"0 0 4px", letterSpacing:"-0.02em" }}>Optimization Complete</h3>
                <p style={{ fontSize:13, color:"#A9B3D1", margin:"0 0 18px" }}>
                  {results.orderCount} order{results.orderCount!==1?"s":""} packed onto {results.summary.sheets} sheet{results.summary.sheets!==1?"s":""}
                  {results.summary.noMatch>0 && <> · <span style={{ color:"#FF6B81" }}>{results.summary.noMatch} unplaced</span></>}
                </p>
                <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
                  <button
                    onClick={()=>setSummaryOpen(true)}
                    style={{ padding:"11px 20px", background:"rgba(255,255,255,0.06)", color:"#A9B3D1", border:"1px solid rgba(255,255,255,0.14)", borderRadius:10, fontSize:13.5, fontWeight:700, cursor:"pointer" }}>
                    📊 View Summary
                  </button>
                  <button
                    onClick={()=>{ setSummaryOpen(false); setPlanOpen(true); }}
                    style={{ padding:"11px 24px", background:"linear-gradient(135deg,#4F5DFF 0%,#7C3AED 100%)", color:"#fff", border:"none", borderRadius:10, fontSize:13.5, fontWeight:800, cursor:"pointer", boxShadow:"0 4px 18px rgba(79,93,255,0.5)", letterSpacing:"-0.01em" }}>
                    📋 View Plan
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background:"rgba(17,27,53,0.9)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"40px 20px",textAlign:"center" }}>
                <div style={{ fontSize:36,marginBottom:10 }}>🔍</div>
                <p style={{ color:"#A9B3D1",fontWeight:600,margin:"0 0 6px" }}>No matching stock found</p>
                <p style={{ color:"#7180A6",fontSize:13,margin:0 }}>Add more stock or check glass type filters.</p>
              </div>
            )}
          </>
        )}
      </div>

      <PlannerModal
        open={modal.open}
        onClose={()=>setModal(p=>({...p,open:false}))}
        stock={modal.stock}
        orders={modal.orders||[]}
        best={modal.best}
        alternatives={modal.alternatives||[]}
        precomputedPlan={modal.precomputedPlan}
        mobile={mobile}
        shopName={modal.shopName || "Glass Shop"}
        userName={modal.userName || ""}
      />

      {/* Step 2: summary popup after Optimize */}
      <OptimizationSummaryModal
        open={summaryOpen}
        onClose={()=>setSummaryOpen(false)}
        onViewPlan={()=>{ setSummaryOpen(false); setPlanOpen(true); }}
        results={results}
      />

      {/* Step 3: full-screen Optimized Order Sheet */}
      <OptimizedOrderSheet
        open={planOpen}
        onClose={()=>setPlanOpen(false)}
        results={results}
        shopName={shopName}
        userName={userName}
        onConfirmed={async ()=>{
          // Refresh stock so a re-optimize reflects the deducted quantities.
          try {
            const sR = await api.get("/api/stock/all");
            setStock((Array.isArray(sR.data) ? sR.data : []).filter(s => s.quantity > 0));
          } catch { /* ignore */ }
        }}
      />
    </PageWrapper>
  );
}
