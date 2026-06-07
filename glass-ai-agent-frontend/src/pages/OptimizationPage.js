import { useState, useEffect, useMemo, useRef } from "react";
import PageWrapper from "../components/PageWrapper";
import api from "../api/api";
import {
  optimizeOrders, planCuts,
  fmtNum, fmtThickness,
  parseDim, toMM, fromMM, unitLabel,
} from "../utils/optimizationService";
import { printCuttingPlan } from "../utils/printCuttingPlan";
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

const CuttingLayoutSVG = ({ plan, canvasW = 420, canvasH = 300 }) => {
  if (!plan) return null;
  const { stockW, stockH, stockUnit, placed, shelves, remnant, steps } = plan;
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

  // Cut lines: unique H and V positions
  const hCuts = [...new Set(shelves.slice(0,-1).map(sh => r2(sh.y + sh.shelfH)))];
  const vCuts = [];
  shelves.forEach(sh => {
    let cx = 0;
    sh.items.slice(0,-1).forEach(item => {
      cx += item.w;
      vCuts.push({ x: r2(cx), y: sh.y, h: sh.shelfH });
    });
  });

  // Step number for each placed piece
  const pieceStep = {};
  let pStep = 1;
  steps.forEach(s => { if (s.type === "PIECE") { pieceStep[s.piece.idx] = pStep++; } });

  return (
    <svg width={canvasW} height={canvasH} style={{ display:"block", overflow:"visible" }}>
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
                  {fmtNum(r2(p.piece.ow))} × {fmtNum(r2(p.piece.oh))} {stockUnit}
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

const StickyActionBar = ({ selected, total, allSelected, onSelectAll, onOptimize, running, mobile, isDesktop }) => {
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
      <button onClick={onSelectAll} style={{ padding: "6px 14px", background: "rgba(255,255,255,0.07)", color: "#A9B3D1", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
        {allSelected ? "Deselect All" : "Select All"}
      </button>
      <button onClick={onOptimize} disabled={!enabled} style={{ padding: "7px 18px", background: enabled ? "linear-gradient(135deg,#4F5DFF 0%,#7C3AED 100%)" : "rgba(79,93,255,0.2)", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: enabled ? "pointer" : "not-allowed", opacity: enabled ? 1 : 0.45, transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0, boxShadow: enabled ? "0 3px 12px rgba(79,93,255,0.4)" : "none" }}>
        {running ? "Planning…" : `Optimize${selected > 0 ? ` (${selected})` : ""} ▶`}
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

/* ─── Cutting Planner Modal ───────────────────────────────────────────────── */

const PlannerModal = ({ open, onClose, stock, orders, best, alternatives, mobile, shopName, userName }) => {
  const plan = useMemo(() => (open && stock) ? planCuts(orders, stock) : null, [open, stock, orders]);
  const [printOpts, setPrintOpts] = useState({ diagram: true, summary: true, remnant: true });
  if (!open || !stock) return null;
  const su = (stock.glass?.unit||"MM").toUpperCase();

  return (
    <div style={pm.overlay} onClick={onClose}>
      <div style={pm.box(mobile)} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={pm.header}>
          <strong style={{ fontSize:15, color:"#ffffff" }}>✂️ Smart Cutting Plan</strong>
          <button style={pm.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Stock info pill row */}
        <div style={pm.stockInfo}>
          <span style={pm.standBadge}>Stand #{stock.standNo}</span>
          <span style={pm.stockSize}>{fmtSize(stock.height, stock.width, stock.glass?.unit)}</span>
          {stock.glass?.type&&<span style={pm.chip}>{stock.glass.type}</span>}
          {stock.glass?.thickness&&<span style={pm.chip}>{fmtThickness(stock.glass.thickness)}</span>}
          <span style={pm.chip}>{stock.quantity} pcs</span>
        </div>

        {/* SVG layout */}
        <div style={{ padding:"4px 14px 0" }}>
          <CuttingLayoutSVG plan={plan} canvasW={mobile?310:420} canvasH={mobile?220:290}/>
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
              onClick={() => printCuttingPlan({ plan, stock, orders, options: printOpts, shopName: shopName || "Glass Shop", userName: userName || "" })}>
              {mobile ? "Print" : "Print Cutting Plan"}
            </button>
            <button
              style={{ padding:"7px 16px", background:"rgba(255,255,255,0.08)", color:"#A9B3D1", border:"1px solid rgba(255,255,255,0.12)", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer" }}
              onClick={() => printCuttingPlan({ plan, stock, orders, options: printOpts, shopName: shopName || "Glass Shop", userName: userName || "" })}>
              {mobile ? "Download PDF" : "Export PDF"}
            </button>
          </div>
        </div>

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
  const [results,   setResults]  = useState(null);
  const [running,   setRunning]  = useState(false);
  const [showRes,   setShowRes]  = useState(false);
  const [modal,     setModal]    = useState({ open:false });
  const [shopName,  setShopName] = useState("Glass Shop");
  const [userName,  setUserName] = useState("");

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
      } catch { setError("Failed to load data."); }
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

  const toggle    = key => setSel(p=>{const n=new Set(p);n.has(key)?n.delete(key):n.add(key);return n;});
  const toggleAll = ()  => setSel(selected.size===allItems.length?new Set():new Set(allItems.map(i=>i.key)));

  const runOpt = () => {
    const chosen = allItems.filter(i => selected.has(i.key));
    if (!chosen.length) return;

    // Expand each order line by its quantity so the cutter receives N individual
    // pieces instead of one piece with a quantity label.
    // e.g. { size: 10×10, qty: 2 } → two separate 10×10 entries.
    const expanded = [];
    chosen.forEach(item => {
      const qty = Math.max(1, parseInt(item.quantity) || 1);
      for (let q = 0; q < qty; q++) {
        expanded.push({ ...item, quantity: 1, key: `${item.key}-${q}` });
      }
    });

    setRunning(true);
    setTimeout(() => { setResults(optimizeOrders(expanded, allStock)); setShowRes(true); setRunning(false); }, 300);
  };

  const openModal = (stock, orders, best, alts) => setModal({ open:true, stock, orders, best, alternatives:alts||[], shopName, userName });
  const reset = () => { setShowRes(false); setResults(null); setSel(new Set()); };

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
            <div style={{ display:"flex",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:12,padding:"10px 14px",background:"rgba(17,27,53,0.9)",borderRadius:10,border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }}>
              <span style={{ fontSize:11,fontWeight:700,color:"#7180A6",textTransform:"uppercase",letterSpacing:"0.5px" }}>STATUS:</span>
              {["ALL","DRAFT","PENDING","CONFIRMED"].map(st=>(
                <button key={st} onClick={()=>{setStatus(st);setSel(new Set());}} style={{ padding:"4px 12px",borderRadius:99,cursor:"pointer",border:status===st?"1.5px solid rgba(79,93,255,0.5)":"1.5px solid rgba(255,255,255,0.08)",background:status===st?"rgba(79,93,255,0.15)":"transparent",color:status===st?"#4F5DFF":"#7180A6",fontSize:12,fontWeight:600 }}>{st}</button>
              ))}
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
        {showRes&&results&&(
          <>
            {/* Summary */}
            <div style={{ background:"rgba(17,27,53,0.9)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"16px 18px", marginBottom:16 }}>
              <h3 style={{ fontSize:15,fontWeight:700,color:"#ffffff",margin:"0 0 8px",letterSpacing:"-0.02em" }}>Plan Summary</h3>
              <div style={{ display:"grid",gridTemplateColumns:mobile?"repeat(3,1fr)":"repeat(6,1fr)",gap:10,marginTop:10 }}>
                {[
                  {label:"Orders",      val:results.summary.total,         col:"#4F5DFF"},
                  {label:"Exact Match", val:results.summary.exact,         col:"#37E3A5"},
                  {label:"Good Match",  val:results.summary.good,          col:"#FFB95E"},
                  {label:"Partial",     val:results.summary.partial,       col:"#FFB95E"},
                  {label:"No Match",    val:results.summary.none,          col:"#FF6B81"},
                  {label:"Multi-Order", val:results.summary.combinedPlans, col:"#8B5CF6"},
                ].map(({label,val,col})=>(
                  <div key={label} style={{ textAlign:"center",padding:"8px 4px",background:"rgba(255,255,255,0.04)",borderRadius:8 }}>
                    <div style={{ fontSize:24,fontWeight:800,color:col,letterSpacing:"-0.04em" }}>{val}</div>
                    <div style={{ fontSize:11,color:"#7180A6",marginTop:2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Combined plans */}
            {results.combinedPlans.length>0&&(
              <div style={{ background:"rgba(17,27,53,0.9)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"16px 18px", marginBottom:16 }}>
                <h3 style={{ fontSize:15,fontWeight:700,color:"#ffffff",margin:"0 0 8px" }}>💡 Multi-Order Plans</h3>
                {results.combinedPlans.map((plan,i)=>{
                  const su=(plan.stock.glass?.unit||"MM").toUpperCase();
                  const ul=unitLabel(su);
                  const cPlan=planCuts(plan.orders,plan.stock);
                  return (
                    <div key={i} style={{ background:"rgba(79,93,255,0.08)",border:"1px solid rgba(79,93,255,0.2)",borderRadius:10,padding:"12px 14px",marginBottom:10 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:8 }}>
                        <strong style={{ color:"#ffffff" }}>Stand #{plan.stock.standNo}</strong>
                        <span style={{ fontSize:12,color:"#A9B3D1" }}>{fmtSize(plan.stock.height,plan.stock.width,su)}</span>
                        <span style={{ marginLeft:"auto",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,background:cPlan?.utilization>=70?"rgba(55,227,165,0.15)":"rgba(255,185,94,0.15)",color:cPlan?.utilization>=70?"#37E3A5":"#FFB95E" }}>
                          {cPlan?.utilization||0}% utilization
                        </span>
                      </div>
                      <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:8 }}>
                        {plan.orders.map((o,j)=>(
                          <span key={j} style={{ fontSize:11,padding:"3px 10px",borderRadius:99,background:"rgba(79,93,255,0.15)",color:"#818CF8" }}>
                            {o.customerName} · {fmtSize(o.height,o.width,o.unit)}
                          </span>
                        ))}
                      </div>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,color:"#A9B3D1" }}>
                        <span>
                          Remnant: <strong style={{ color:"#37E3A5" }}>{cPlan?.remnant?`${fmtNum(r2(cPlan.remnant.w))} × ${fmtNum(r2(cPlan.remnant.h))} ${su}`:"none"}</strong>
                          {" · "}Waste: <strong style={{ color:"#ffffff" }}>{fmtNum(r2(cPlan?.wasteArea||0))} sq.{ul}</strong>
                        </span>
                        <button
                          style={{ padding:"6px 14px", background:"rgba(255,255,255,0.08)", color:"#A9B3D1", border:"1px solid rgba(255,255,255,0.12)", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer" }}
                          onClick={()=>openModal(plan.stock,plan.orders.map(o=>({...o,label:o.customerName})),null,[])}>
                          ✂️ View Plan
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Per-order results */}
            <h3 style={{ fontSize:15,fontWeight:700,color:"#ffffff",margin:"0 0 12px" }}>Per-Order Cutting Plans</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              {results.results.map(({order,best,alternatives,matchType},i)=>{
                const c=matchColors[matchType]||matchColors.none;
                const su=best?(best.stock.glass?.unit||"MM").toUpperCase():"MM";
                const ul=unitLabel(su);
                const plan=best?planCuts([order],best.stock):null;
                return (
                  <div key={i} style={{ background:"rgba(17,27,53,0.9)", border:`1px solid rgba(255,255,255,0.08)`, borderLeft:`4px solid ${c.border}`, borderRadius:12, padding:"16px 18px" }}>
                    <div style={{ display:"flex",alignItems:"flex-start",gap:10,flexWrap:"wrap",marginBottom:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14,fontWeight:700,color:"#ffffff",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3 }}>
                          {order.customerName}
                          <span style={{ fontSize:11,color:"#7180A6",background:"rgba(255,255,255,0.06)",borderRadius:4,padding:"1px 6px" }}>#{order.quotationNo}</span>
                        </div>
                        <div style={{ fontSize:12,color:"#A9B3D1" }}>
                          Required: {fmtSize(order.height,order.width,order.unit)}
                          {order.glassType?` · ${order.glassType}`:""}
                          {` · Qty ${order.quantity}`}
                        </div>
                      </div>
                      <MatchBadge type={matchType}/>
                    </div>

                    {!best&&(
                      <div style={{ background:"rgba(255,107,129,0.1)",border:"1px solid rgba(255,107,129,0.3)",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#FF6B81",fontWeight:500 }}>
                        ⚠️ {order.glassType
                          ? `No stock available for Glass Type: ${order.glassType}. This order cannot be optimized.`
                          : "No suitable stock found for this order."
                        }
                      </div>
                    )}

                    {best&&plan&&(
                      <div style={{ display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:12 }}>
                        {/* Recommended */}
                        <div style={{ background:"rgba(255,255,255,0.04)",borderRadius:9,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.08)" }}>
                          <div style={{ fontSize:11,fontWeight:700,color:"#7180A6",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6 }}>Recommended Stock</div>
                          <div style={{ fontSize:20,fontWeight:800,color:"#4F5DFF",letterSpacing:"-0.04em" }}>Stand #{best.stock.standNo}</div>
                          <div style={{ fontSize:13,fontWeight:500,color:"#ffffff",marginTop:4,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                            {fmtSize(best.stock.height,best.stock.width,best.stock.glass?.unit)}
                            {best.stock.glass?.type&&<span style={{ fontSize:11,padding:"2px 8px",borderRadius:4,background:"rgba(79,93,255,0.15)",color:"#4F5DFF",fontWeight:500 }}>{best.stock.glass.type}</span>}
                          </div>
                          <div style={{ fontSize:12,color:"#37E3A5",fontWeight:600,marginTop:6 }}>
                            Remnant: {plan.remnant ? `${fmtNum(r2(plan.remnant.w))} × ${fmtNum(r2(plan.remnant.h))} ${su}` : "none"}
                          </div>
                          {!best.sameUnit&&<div style={{ fontSize:11,color:"#FFB95E",marginTop:4,background:"rgba(255,185,94,0.1)",borderRadius:5,padding:"3px 8px" }}>⚠️ Unit mismatch</div>}
                          <div style={{ marginTop:10 }}>
                            <button
                              style={{ padding:"7px 14px", background:"#4F5DFF", color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer" }}
                              onClick={()=>openModal(best.stock,[{...order,label:order.customerName}],best,alternatives)}>
                              ✂️ Open Cutting Plan
                            </button>
                          </div>
                        </div>

                        {/* Metrics */}
                        <div style={{ background:"rgba(255,255,255,0.04)",borderRadius:9,padding:10,border:"1px solid rgba(255,255,255,0.08)" }}>
                          <MetricRow label="Used Area"       value={`${fmtNum(r2(plan.usedArea))} sq.${ul}`}/>
                          <MetricRow label="Remnant Piece"   value={plan.remnant?`${fmtNum(r2(plan.remnant.w))} × ${fmtNum(r2(plan.remnant.h))} ${su}`:"none"}   highlight={plan.remnant?"green":undefined}/>
                          <MetricRow label="Waste"           value={`${fmtNum(r2(plan.wasteArea))} sq.${ul}`}  highlight={plan.wasteArea<1?"green":plan.wasteArea<plan.usedArea?"yellow":"red"}/>
                          <MetricRow label="Utilization"     value={`${plan.utilization}%`}                   highlight={plan.utilization>=70?"green":plan.utilization>=40?"yellow":"red"}/>
                        </div>
                      </div>
                    )}

                    {alternatives.length>0&&(
                      <details style={{ marginTop:10 }}>
                        <summary style={{ fontSize:12,color:"#4F5DFF",fontWeight:600,cursor:"pointer",userSelect:"none" }}>{alternatives.length} alternative{alternatives.length>1?"s":""}</summary>
                        <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginTop:8 }}>
                          {alternatives.map((alt,j)=>{
                            const asu=(alt.stock.glass?.unit||"MM").toUpperCase();
                            const aul=unitLabel(asu);
                            const ap=planCuts([order],alt.stock);
                            return (
                              <div key={j} style={{ background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"8px 12px",fontSize:12,border:"1px solid rgba(255,255,255,0.08)",display:"flex",flexDirection:"column",gap:2 }}>
                                <strong style={{ color:"#ffffff" }}>Stand #{alt.stock.standNo}</strong>
                                <span style={{ color:"#A9B3D1" }}>{fmtSize(alt.stock.height,alt.stock.width,alt.stock.glass?.unit)}</span>
                                <span style={{ color:"#7180A6" }}>
                                  Remnant: {ap?.remnant?`${fmtNum(r2(ap.remnant.w))}×${fmtNum(r2(ap.remnant.h))} ${asu}`:"none"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
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
        mobile={mobile}
        shopName={modal.shopName || "Glass Shop"}
        userName={modal.userName || ""}
      />
    </PageWrapper>
  );
}
