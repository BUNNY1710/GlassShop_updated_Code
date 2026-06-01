import { useState, useEffect, useMemo } from "react";
import PageWrapper from "../components/PageWrapper";
import { Card, Button } from "../components/ui";
import api from "../api/api";
import {
  optimizeOrders, planCuts,
  fmtNum, fmtThickness,
  parseDim, toMM, fromMM, unitLabel,
} from "../utils/optimizationService";
import { printCuttingPlan } from "../utils/printCuttingPlan";
import "../styles/design-system.css";

/* ─── constants ───────────────────────────────────────────────────────────── */

const PALETTE = ["#6366f1","#22c55e","#f59e0b","#ef4444","#8b5cf6","#14b8a6","#ec4899","#0ea5e9"];
const MEDALS  = ["🥇","🥈","🥉"];

const matchColors = {
  exact:   { badge:"Exact Match",   bg:"#dcfce7", color:"#16a34a", border:"#86efac" },
  good:    { badge:"Good Match",    bg:"#fef9c3", color:"#b45309", border:"#fde68a" },
  partial: { badge:"Partial Match", bg:"#ffedd5", color:"#c2410c", border:"#fdba74" },
  none:    { badge:"No Match",      bg:"#fee2e2", color:"#dc2626", border:"#fca5a5" },
};

/* ─── tiny helpers ────────────────────────────────────────────────────────── */

const isMob = () => window.innerWidth < 768;
const r2    = n => Math.round(n * 100) / 100;
const fmtSize = (h, w, unit) => `${fmtNum(parseDim(h))} × ${fmtNum(parseDim(w))} ${(unit||"MM").toUpperCase()}`;

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
  const cols = { green:["#f0fdf4","#16a34a"], yellow:["#fefce8","#ca8a04"], red:["#fff7ed","#ea580c"] };
  const [bg,cl] = cols[highlight]||["transparent","#0f172a"];
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 8px", borderRadius:6, marginBottom:3, background:bg }}>
      <span style={{ fontSize:12, color:"#64748b" }}>{label}</span>
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
          <path d="M0,8 L8,0 M-2,2 L2,-2 M6,10 L10,6" stroke="#94a3b8" strokeWidth={0.7} opacity={0.45}/>
        </pattern>
        <pattern id="hatch-r" patternUnits="userSpaceOnUse" width={8} height={8}>
          <path d="M0,0 L8,8 M-2,6 L2,10 M6,-2 L10,2" stroke="#22c55e" strokeWidth={0.7} opacity={0.4}/>
        </pattern>
      </defs>

      {/* Sheet background + waste hatch */}
      <rect x={ML} y={MT} width={drawW} height={drawH} fill="#f1f5f9" stroke="#475569" strokeWidth={1.5}/>
      <rect x={ML} y={MT} width={drawW} height={drawH} fill="url(#hatch-w)"/>

      {/* Remnant piece (green hatch) */}
      {remnant && (
        <g>
          <rect x={rx(remnant.x)} y={ry(remnant.y)} width={remnant.w*sx} height={remnant.h*sy}
            fill="#f0fdf4" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="5 3"/>
          <rect x={rx(remnant.x)} y={ry(remnant.y)} width={remnant.w*sx} height={remnant.h*sy} fill="url(#hatch-r)"/>
          <text x={rx(remnant.x)+remnant.w*sx/2} y={ry(remnant.y)+remnant.h*sy/2-6}
            textAnchor="middle" fontSize={9} fontWeight={700} fill="#16a34a">
            REMNANT
          </text>
          <text x={rx(remnant.x)+remnant.w*sx/2} y={ry(remnant.y)+remnant.h*sy/2+7}
            textAnchor="middle" fontSize={8.5} fill="#16a34a">
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
                <text x={px+pw/2} y={py+ph/2+15} textAnchor="middle" fontSize={7.5} fill="rgba(255,255,255,0.75)">
                  {fmtNum(r2(p.w*p.h))} sq.{ul}
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
          stroke="#ef4444" strokeWidth={1.2} strokeDasharray="6 3" opacity={0.8}/>
      ))}

      {/* Vertical cut lines */}
      {vCuts.map((v, i) => (
        <line key={i} x1={rx(v.x)} y1={ry(v.y)} x2={rx(v.x)} y2={ry(v.y+v.h)}
          stroke="#ef4444" strokeWidth={1.2} strokeDasharray="6 3" opacity={0.8}/>
      ))}

      {/* Top ruler */}
      {xTicks.map((t,i) => {
        const x = ML + (t/stockW)*drawW;
        return <g key={i}><line x1={x} y1={MT-4} x2={x} y2={MT} stroke="#64748b" strokeWidth={0.8}/><text x={x} y={MT-7} textAnchor="middle" fontSize={8} fill="#64748b">{fmtNum(t)}</text></g>;
      })}
      <text x={ML+drawW/2} y={11} textAnchor="middle" fontSize={8} fill="#94a3b8">{stockUnit}</text>

      {/* Left ruler */}
      {yTicks.map((t,i) => {
        const y = MT + (t/stockH)*drawH;
        return <g key={i}><line x1={ML-4} y1={y} x2={ML} y2={y} stroke="#64748b" strokeWidth={0.8}/><text x={ML-6} y={y+3} textAnchor="end" fontSize={8} fill="#64748b">{fmtNum(t)}</text></g>;
      })}
      <text x={9} y={MT+drawH/2} textAnchor="middle" fontSize={8} fill="#94a3b8"
        transform={`rotate(-90,9,${MT+drawH/2})`}>{stockUnit}</text>

      {/* Stock size label */}
      <text x={ML+drawW-2} y={MT-7} textAnchor="end" fontSize={9} fontWeight={600} fill="#4f46e5">
        {fmtNum(r2(stockW))} × {fmtNum(r2(stockH))} {stockUnit}
      </text>

      {/* Cut line legend */}
      <line x1={ML} y1={canvasH-6} x2={ML+16} y2={canvasH-6} stroke="#ef4444" strokeWidth={1.2} strokeDasharray="4 2"/>
      <text x={ML+20} y={canvasH-3} fontSize={8} fill="#94a3b8">cut line</text>
      {remnant && <>
        <rect x={ML+70} y={canvasH-11} width={10} height={10} fill="#f0fdf4" stroke="#22c55e" strokeWidth={1}/>
        <text x={ML+84} y={canvasH-3} fontSize={8} fill="#94a3b8">remnant</text>
      </>}
    </svg>
  );
};

/* ─── Waste metrics bar ───────────────────────────────────────────────────── */

const WasteBar = ({ plan }) => {
  if (!plan) return null;
  const { usedArea, wasteArea, remnant, stockArea, utilization, ul, stockUnit } = plan;
  const remnantArea = remnant?.area || 0;
  return (
    <div style={{ display:"flex", borderTop:"1px solid #f1f5f9", marginTop:6 }}>
      {[
        { label:"Used Area",      val:`${fmtNum(r2(usedArea))} sq.${ul}`,     col:"#4f46e5" },
        { label:"Remnant Piece",  val:remnant ? `${fmtNum(r2(remnant.w))} × ${fmtNum(r2(remnant.h))} ${stockUnit}` : "—", col:"#16a34a" },
        { label:"Waste",          val:`${fmtNum(r2(wasteArea))} sq.${ul}`,    col:wasteArea>stockArea*0.3?"#dc2626":"#d97706" },
        { label:"Utilization",    val:`${utilization}%`,                       col:utilization>=70?"#16a34a":utilization>=40?"#d97706":"#dc2626" },
      ].map(({label,val,col}) => (
        <div key={label} style={{ flex:1, textAlign:"center", padding:"7px 3px", borderRight:"1px solid #f1f5f9" }}>
          <div style={{ fontSize:13, fontWeight:700, color:col, letterSpacing:"-0.02em" }}>{val}</div>
          <div style={{ fontSize:10, color:"#94a3b8", marginTop:1, textTransform:"uppercase", letterSpacing:"0.3px" }}>{label}</div>
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
    <div style={{ marginTop:12, border:"1px solid #e8edf2", borderRadius:10, overflow:"hidden" }}>
      <button
        onClick={() => setOpen(o=>!o)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:"#f8fafc", border:"none", cursor:"pointer", fontSize:13, fontWeight:600, color:"#0f172a" }}
      >
        <span>✂️ Cutting Instructions ({steps.filter(s=>s.type!=="PIECE"&&s.type!=="REMNANT").length} cuts)</span>
        <span style={{ color:"#94a3b8", fontSize:12 }}>{open?"▲":"▼"}</span>
      </button>

      {open && (
        <div style={{ padding:"10px 14px" }}>
          {steps.map((s, i) => {
            const icons  = { H:"⟵", V:"⟷", PIECE:"📦", REMNANT:"♻️" };
            const colors = { H:"#ef4444", V:"#f59e0b", PIECE:"#6366f1", REMNANT:"#16a34a" };
            return (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"6px 0", borderBottom:i<steps.length-1?"1px solid #f8fafc":"none" }}>
                <span style={{ width:22, height:22, borderRadius:"50%", background:colors[s.type]||"#e2e8f0", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, flexShrink:0, marginTop:1 }}>
                  {s.type==="PIECE"||s.type==="REMNANT" ? icons[s.type] : s.step}
                </span>
                <div>
                  <span style={{ fontSize:12.5, color:"#1e293b" }}>{s.label}</span>
                  {s.type==="H"&&<span style={{ marginLeft:6, fontSize:10, color:"#94a3b8" }}>— horizontal cut</span>}
                  {s.type==="V"&&<span style={{ marginLeft:6, fontSize:10, color:"#94a3b8" }}>— vertical cut</span>}
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
      <div style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>
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
            <div key={i} style={{ background:i===0?"#f5f3ff":"#f8fafc", border:i===0?"1.5px solid #c4b5fd":"1px solid #e8edf2", borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:16 }}>{MEDALS[i]||"•"}</div>
              <div style={{ fontSize:14, fontWeight:800, color:"#4f46e5", letterSpacing:"-0.04em", margin:"2px 0" }}>
                Stand #{match.stock.standNo}
              </div>
              <div style={{ fontSize:11.5, color:"#374151", fontWeight:500, marginBottom:6 }}>
                {fmtNum(r2(stockWD))} × {fmtNum(r2(stockHD))} {su}
                {match.stock.glass?.type&&<span style={{ marginLeft:4, fontSize:10, background:"#eef2ff", color:"#4f46e5", borderRadius:4, padding:"1px 5px", fontWeight:600 }}>{match.stock.glass.type}</span>}
              </div>
              {plan && <>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:2 }}>
                  Remnant: {plan.remnant ? <strong style={{ color:"#16a34a" }}>{fmtNum(r2(plan.remnant.w))} × {fmtNum(r2(plan.remnant.h))} {su}</strong> : <span style={{ color:"#94a3b8" }}>none</span>}
                </div>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:2 }}>
                  Waste: <strong style={{ color:plan.wasteArea<1?"#16a34a":"#d97706" }}>{fmtNum(r2(plan.wasteArea))} sq.{ul}</strong>
                </div>
                <div style={{ fontSize:11, color:"#64748b" }}>
                  Utilization: <strong style={{ color:plan.utilization>=70?"#16a34a":"#d97706" }}>{plan.utilization}%</strong>
                </div>
              </>}
              {i===0&&<div style={{ fontSize:10, color:"#7c3aed", fontWeight:600, marginTop:6, background:"#ede9fe", borderRadius:5, padding:"2px 7px", display:"inline-block" }}>
                ✓ Best choice
              </div>}
              {i===0&&candidates[1]&&plan&&(() => {
                const altPlan = planCuts(orders, candidates[1].stock);
                if (!altPlan) return null;
                const su2 = (candidates[1].stock.glass?.unit||"MM").toUpperCase();
                const ul2 = unitLabel(su2);
                const saved = r2(altPlan.wasteArea - plan.wasteArea);
                return saved > 0.01 ? (
                  <div style={{ fontSize:10, color:"#64748b", marginTop:4, background:"#f0fdf4", borderRadius:5, padding:"2px 7px" }}>
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
    ? <div style={{ fontSize:12, color:"#16a34a", fontWeight:600, marginTop:8 }}>✅ Remnant added to inventory</div>
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
    <div style={{ marginTop:12, background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:10, padding:"10px 14px" }}>
      <div style={{ fontSize:13, fontWeight:600, color:"#16a34a", marginBottom:4 }}>
        ♻️ Remnant Piece: {fmtNum(r2(remnant.w))} × {fmtNum(r2(remnant.h))} {stockUnit}
      </div>
      <div style={{ fontSize:12, color:"#64748b", marginBottom:8 }}>
        {fmtNum(r2(remnant.area))} sq.{unitLabel(stockUnit)} · Save this piece back to inventory on Stand #{stock.standNo}.
      </div>
      {err && <div style={{ fontSize:11, color:"#dc2626", marginBottom:6 }}>{err}</div>}
      <Button variant="success" size="sm" loading={saving} onClick={add}>
        Add Remnant to Inventory
      </Button>
    </div>
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
          <strong style={{ fontSize:15 }}>✂️ Smart Cutting Plan</strong>
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
                <span style={{ fontSize:11 }}>{o.customerName||"Order"} · {fmtSize(o.height,o.width,o.unit)}</span>
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
        <div style={{ margin:"4px 14px 14px", borderTop:"1px solid #f1f5f9", paddingTop:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:10 }}>
            Print Options
          </div>
          <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:12 }}>
            {[
              { key:"diagram",  label:"Cutting Diagram" },
              { key:"summary",  label:"Optimization Summary" },
              { key:"remnant",  label:"Remnant Details" },
            ].map(({ key, label }) => (
              <label key={key} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12.5, cursor:"pointer", color:"#374151" }}>
                <input
                  type="checkbox"
                  checked={printOpts[key]}
                  onChange={() => setPrintOpts(p => ({ ...p, [key]: !p[key] }))}
                  style={{ width:15, height:15, accentColor:"#6366f1" }}
                />
                {label}
              </label>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <Button variant="primary" size="sm"
              onClick={() => printCuttingPlan({ plan, stock, orders, options: printOpts, shopName: shopName || "Glass Shop", userName: userName || "" })}>
              {mobile ? "Print" : "Print Cutting Plan"}
            </Button>
            <Button variant="secondary" size="sm"
              onClick={() => printCuttingPlan({ plan, stock, orders, options: printOpts, shopName: shopName || "Glass Shop", userName: userName || "" })}>
              {mobile ? "Download PDF" : "Export PDF"}
            </Button>
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
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:20000, backdropFilter:"blur(4px)" },
  box: m => ({
    background:"#fff", borderRadius:m?"20px 20px 0 0":14,
    width:m?"100%":"min(96vw,500px)",
    maxHeight:m?"92vh":"90vh", overflowY:"auto",
    boxShadow:"0 24px 64px rgba(15,23,42,0.18)",
    animation:m?"slideUp 0.22s cubic-bezier(0.32,0.72,0,1)":"fadeIn 0.15s ease-out",
    ...(m?{ position:"fixed", bottom:0, left:0, right:0 }:{}),
  }),
  header: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px 10px", borderBottom:"1px solid #f1f5f9", position:"sticky", top:0, background:"#fff", zIndex:1 },
  closeBtn: { background:"#f1f5f9", border:"none", borderRadius:"50%", width:28, height:28, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b" },
  stockInfo: { display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", padding:"10px 16px 8px" },
  standBadge: { fontSize:13, fontWeight:800, color:"#4f46e5", background:"#eef2ff", borderRadius:6, padding:"3px 10px" },
  stockSize: { fontSize:13, fontWeight:600, color:"#0f172a" },
  chip: { fontSize:11, background:"#f1f5f9", color:"#475569", borderRadius:4, padding:"2px 8px" },
  legendTitle: { fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:6 },
};

/* ─── Main Page ───────────────────────────────────────────────────────────── */

export default function OptimizationPage() {
  const [mobile,    setMobile]   = useState(isMob());
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
    const r = () => setMobile(isMob());
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
    const chosen = allItems.filter(i=>selected.has(i.key));
    if (!chosen.length) return;
    setRunning(true);
    setTimeout(() => { setResults(optimizeOrders(chosen,allStock)); setShowRes(true); setRunning(false); }, 300);
  };

  const openModal = (stock, orders, best, alts) => setModal({ open:true, stock, orders, best, alternatives:alts||[], shopName, userName });
  const reset = () => { setShowRes(false); setResults(null); setSel(new Set()); };

  if (loading) return (
    <PageWrapper>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh" }}>
        <div style={{ width:32,height:32,border:"3px solid #e2e8f0",borderTopColor:"#6366f1",borderRadius:"50%",animation:"spin 0.7s linear infinite" }}/>
        <p style={{ color:"#64748b",marginTop:12 }}>Loading…</p>
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <div style={{ maxWidth:1100,margin:"0 auto",padding:mobile?"16px 12px":"20px 16px",width:"100%",boxSizing:"border-box" }}>

        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:mobile?22:26,fontWeight:800,color:"#0f172a",margin:"0 0 4px",letterSpacing:"-0.03em",fontFamily:"'Inter',sans-serif" }}>
              📐 Smart Cutting Planner
            </h1>
            <p style={{ fontSize:13,color:"#64748b",margin:0 }}>
              Select orders · find the best stock · generate a cutter-ready plan.
            </p>
          </div>
          {showRes&&<Button variant="secondary" size="sm" onClick={reset}>← New Plan</Button>}
        </div>

        {error&&<div style={{ background:"#fee2e2",color:"#dc2626",borderRadius:8,padding:"12px 16px",fontSize:13,fontWeight:500,marginBottom:16 }}>{error}</div>}

        {/* ── SELECTION ── */}
        {!showRes&&(
          <>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14,padding:"10px 14px",background:"#fff",borderRadius:10,border:"1px solid #e8edf2",boxShadow:"0 1px 3px rgba(15,23,42,0.05)" }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                <span style={{ fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.5px" }}>STATUS:</span>
                {["ALL","DRAFT","PENDING","CONFIRMED"].map(st=>(
                  <button key={st} onClick={()=>{setStatus(st);setSel(new Set());}} style={{ padding:"4px 12px",borderRadius:99,cursor:"pointer",border:status===st?"1.5px solid #6366f1":"1.5px solid #e2e8f0",background:status===st?"#eef2ff":"#fff",color:status===st?"#4f46e5":"#64748b",fontSize:12,fontWeight:600 }}>{st}</button>
                ))}
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <span style={{ fontSize:12,color:"#64748b" }}>{selected.size}/{allItems.length} selected</span>
                <Button variant="ghost" size="sm" onClick={toggleAll}>{selected.size===allItems.length?"Deselect All":"Select All"}</Button>
              </div>
            </div>

            {allItems.length===0
              ? <Card><div style={{ textAlign:"center",padding:"40px 20px" }}><div style={{ fontSize:44,marginBottom:10 }}>📋</div><p style={{ color:"#64748b",fontWeight:600 }}>No orders found</p><p style={{ color:"#94a3b8",fontSize:13 }}>Try a different status filter.</p></div></Card>
              : (
                <div style={{ display:"grid",gridTemplateColumns:mobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:10 }}>
                  {allItems.map(item=>{
                    const sel=selected.has(item.key);
                    return (
                      <div key={item.key} onClick={()=>toggle(item.key)} style={{ background:sel?"#f5f3ff":"#fff",border:sel?"1.5px solid #6366f1":"1.5px solid #e8edf2",borderRadius:10,padding:"12px 14px",cursor:"pointer",transition:"all 120ms ease" }}>
                        <div style={{ display:"flex",alignItems:"flex-start",gap:10 }}>
                          <input type="checkbox" readOnly checked={sel} onClick={e=>{e.stopPropagation();toggle(item.key);}} style={{ width:16,height:16,accentColor:"#6366f1",marginTop:2,flexShrink:0 }}/>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:13.5,fontWeight:700,color:"#0f172a",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:6 }}>
                              {item.customerName}
                              <span style={{ fontSize:11,color:"#94a3b8",background:"#f1f5f9",borderRadius:4,padding:"1px 6px" }}>#{item.quotationNo}</span>
                            </div>
                            <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
                              {item.glassType&&<span style={{ fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:5,background:"#eef2ff",color:"#4f46e5" }}>{item.glassType}</span>}
                              <span style={{ fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:5,background:"#eef2ff",color:"#4f46e5" }}>{fmtSize(item.height,item.width,item.unit)}</span>
                              <span style={{ fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:5,background:"#f1f5f9",color:"#64748b" }}>Qty {item.quantity}</span>
                            </div>
                          </div>
                          {sel&&<span style={{ width:22,height:22,borderRadius:"50%",background:"#6366f1",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0 }}>✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }

            {allItems.length>0&&(
              <div style={{ marginTop:20,display:"flex",justifyContent:"center" }}>
                <Button variant="primary" size="lg" icon="📐" loading={running} disabled={selected.size===0} onClick={runOpt}>
                  {running?"Planning…":`Generate Cutting Plan (${selected.size} order${selected.size!==1?"s":""})`}
                </Button>
              </div>
            )}
          </>
        )}

        {/* ── RESULTS ── */}
        {showRes&&results&&(
          <>
            {/* Summary */}
            <Card style={{ marginBottom:16 }}>
              <h3 style={{ fontSize:15,fontWeight:700,color:"#0f172a",margin:"0 0 8px",letterSpacing:"-0.02em" }}>Plan Summary</h3>
              <div style={{ display:"grid",gridTemplateColumns:mobile?"repeat(3,1fr)":"repeat(6,1fr)",gap:10,marginTop:10 }}>
                {[
                  {label:"Orders",      val:results.summary.total,         col:"#6366f1"},
                  {label:"Exact Match", val:results.summary.exact,         col:"#16a34a"},
                  {label:"Good Match",  val:results.summary.good,          col:"#d97706"},
                  {label:"Partial",     val:results.summary.partial,       col:"#ea580c"},
                  {label:"No Match",    val:results.summary.none,          col:"#dc2626"},
                  {label:"Multi-Order", val:results.summary.combinedPlans, col:"#7c3aed"},
                ].map(({label,val,col})=>(
                  <div key={label} style={{ textAlign:"center",padding:"8px 4px",background:"#f8fafc",borderRadius:8 }}>
                    <div style={{ fontSize:24,fontWeight:800,color:col,letterSpacing:"-0.04em" }}>{val}</div>
                    <div style={{ fontSize:11,color:"#94a3b8",marginTop:2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Combined plans */}
            {results.combinedPlans.length>0&&(
              <Card style={{ marginBottom:16 }}>
                <h3 style={{ fontSize:15,fontWeight:700,color:"#0f172a",margin:"0 0 8px" }}>💡 Multi-Order Plans</h3>
                {results.combinedPlans.map((plan,i)=>{
                  const su=(plan.stock.glass?.unit||"MM").toUpperCase();
                  const ul=unitLabel(su);
                  const cPlan=planCuts(plan.orders,plan.stock);
                  return (
                    <div key={i} style={{ background:"#faf5ff",border:"1px solid #e9d5ff",borderRadius:10,padding:"12px 14px",marginBottom:10 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:8 }}>
                        <strong>Stand #{plan.stock.standNo}</strong>
                        <span style={{ fontSize:12,color:"#64748b" }}>{fmtSize(plan.stock.height,plan.stock.width,su)}</span>
                        <span style={{ marginLeft:"auto",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,background:cPlan?.utilization>=70?"#dcfce7":"#fef9c3",color:cPlan?.utilization>=70?"#16a34a":"#b45309" }}>
                          {cPlan?.utilization||0}% utilization
                        </span>
                      </div>
                      <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:8 }}>
                        {plan.orders.map((o,j)=>(
                          <span key={j} style={{ fontSize:11,padding:"3px 10px",borderRadius:99,background:"#ede9fe",color:"#6d28d9" }}>
                            {o.customerName} · {fmtSize(o.height,o.width,o.unit)}
                          </span>
                        ))}
                      </div>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,color:"#64748b" }}>
                        <span>
                          Remnant: <strong style={{ color:"#16a34a" }}>{cPlan?.remnant?`${fmtNum(r2(cPlan.remnant.w))} × ${fmtNum(r2(cPlan.remnant.h))} ${su}`:"none"}</strong>
                          {" · "}Waste: <strong>{fmtNum(r2(cPlan?.wasteArea||0))} sq.{ul}</strong>
                        </span>
                        <Button variant="outline" size="sm"
                          onClick={()=>openModal(plan.stock,plan.orders.map(o=>({...o,label:o.customerName})),null,[])}>
                          ✂️ View Plan
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </Card>
            )}

            {/* Per-order results */}
            <h3 style={{ fontSize:15,fontWeight:700,color:"#0f172a",margin:"0 0 12px" }}>Per-Order Cutting Plans</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              {results.results.map(({order,best,alternatives,matchType},i)=>{
                const c=matchColors[matchType]||matchColors.none;
                const su=best?(best.stock.glass?.unit||"MM").toUpperCase():"MM";
                const ul=unitLabel(su);
                const plan=best?planCuts([order],best.stock):null;
                return (
                  <Card key={i} style={{ borderLeft:`4px solid ${c.border}` }}>
                    <div style={{ display:"flex",alignItems:"flex-start",gap:10,flexWrap:"wrap",marginBottom:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14,fontWeight:700,color:"#0f172a",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3 }}>
                          {order.customerName}
                          <span style={{ fontSize:11,color:"#94a3b8",background:"#f1f5f9",borderRadius:4,padding:"1px 6px" }}>#{order.quotationNo}</span>
                        </div>
                        <div style={{ fontSize:12,color:"#64748b" }}>
                          Required: {fmtSize(order.height,order.width,order.unit)}
                          {order.glassType?` · ${order.glassType}`:""}
                          {` · Qty ${order.quantity}`}
                        </div>
                      </div>
                      <MatchBadge type={matchType}/>
                    </div>

                    {!best&&<div style={{ background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#dc2626",fontWeight:500 }}>⚠️ No suitable stock found.</div>}

                    {best&&plan&&(
                      <div style={{ display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:12 }}>
                        {/* Recommended */}
                        <div style={{ background:"#f8fafc",borderRadius:9,padding:"12px 14px",border:"1px solid #e8edf2" }}>
                          <div style={{ fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6 }}>Recommended Stock</div>
                          <div style={{ fontSize:20,fontWeight:800,color:"#4f46e5",letterSpacing:"-0.04em" }}>Stand #{best.stock.standNo}</div>
                          <div style={{ fontSize:13,fontWeight:500,color:"#0f172a",marginTop:4,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                            {fmtSize(best.stock.height,best.stock.width,best.stock.glass?.unit)}
                            {best.stock.glass?.type&&<span style={{ fontSize:11,padding:"2px 8px",borderRadius:4,background:"#eef2ff",color:"#4f46e5",fontWeight:500 }}>{best.stock.glass.type}</span>}
                          </div>
                          <div style={{ fontSize:12,color:"#16a34a",fontWeight:600,marginTop:6 }}>
                            Remnant: {plan.remnant ? `${fmtNum(r2(plan.remnant.w))} × ${fmtNum(r2(plan.remnant.h))} ${su}` : "none"}
                          </div>
                          {!best.sameUnit&&<div style={{ fontSize:11,color:"#ea580c",marginTop:4,background:"#fff7ed",borderRadius:5,padding:"3px 8px" }}>⚠️ Unit mismatch</div>}
                          <div style={{ marginTop:10 }}>
                            <Button variant="primary" size="sm"
                              onClick={()=>openModal(best.stock,[{...order,label:order.customerName}],best,alternatives)}>
                              ✂️ Open Cutting Plan
                            </Button>
                          </div>
                        </div>

                        {/* Metrics */}
                        <div style={{ background:"#f8fafc",borderRadius:9,padding:10,border:"1px solid #e8edf2" }}>
                          <MetricRow label="Used Area"       value={`${fmtNum(r2(plan.usedArea))} sq.${ul}`}/>
                          <MetricRow label="Remnant Piece"   value={plan.remnant?`${fmtNum(r2(plan.remnant.w))} × ${fmtNum(r2(plan.remnant.h))} ${su}`:"none"}   highlight={plan.remnant?"green":undefined}/>
                          <MetricRow label="Waste"           value={`${fmtNum(r2(plan.wasteArea))} sq.${ul}`}  highlight={plan.wasteArea<1?"green":plan.wasteArea<plan.usedArea?"yellow":"red"}/>
                          <MetricRow label="Utilization"     value={`${plan.utilization}%`}                   highlight={plan.utilization>=70?"green":plan.utilization>=40?"yellow":"red"}/>
                          {!best.sameType&&<MetricRow label="⚠️ Glass Type" value="Type mismatch" highlight="red"/>}
                        </div>
                      </div>
                    )}

                    {alternatives.length>0&&(
                      <details style={{ marginTop:10 }}>
                        <summary style={{ fontSize:12,color:"#6366f1",fontWeight:600,cursor:"pointer",userSelect:"none" }}>{alternatives.length} alternative{alternatives.length>1?"s":""}</summary>
                        <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginTop:8 }}>
                          {alternatives.map((alt,j)=>{
                            const asu=(alt.stock.glass?.unit||"MM").toUpperCase();
                            const aul=unitLabel(asu);
                            const ap=planCuts([order],alt.stock);
                            return (
                              <div key={j} style={{ background:"#f8fafc",borderRadius:8,padding:"8px 12px",fontSize:12,border:"1px solid #e8edf2",display:"flex",flexDirection:"column",gap:2 }}>
                                <strong>Stand #{alt.stock.standNo}</strong>
                                <span>{fmtSize(alt.stock.height,alt.stock.width,alt.stock.glass?.unit)}</span>
                                <span style={{ color:"#64748b" }}>
                                  Remnant: {ap?.remnant?`${fmtNum(r2(ap.remnant.w))}×${fmtNum(r2(ap.remnant.h))} ${asu}`:"none"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </Card>
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
