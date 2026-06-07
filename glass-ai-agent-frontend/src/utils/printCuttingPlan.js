/**
 * printCuttingPlan.js
 * Generates a print-ready A4 HTML page and opens it in a new window.
 * The caller just needs: printCuttingPlan({ plan, stock, orders, options, shopName, userName })
 */

import { fmtNum, parseDim, unitLabel } from "./optimizationService";

const r2 = n => Math.round(n * 100) / 100;
const today = () => {
  const d = new Date();
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const timeNow = () =>
  new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

/* ─── B&W SVG patterns (8 distinct fills for cutter-friendly diagrams) ─── */

const BW_PATTERNS = [
  `<pattern id="bp0" patternUnits="userSpaceOnUse" width="1" height="1"><rect width="1" height="1" fill="white"/></pattern>`,
  `<pattern id="bp1" patternUnits="userSpaceOnUse" width="8" height="8"><rect width="8" height="8" fill="white"/><line x1="0" y1="4" x2="8" y2="4" stroke="#555" stroke-width="1"/></pattern>`,
  `<pattern id="bp2" patternUnits="userSpaceOnUse" width="8" height="8"><rect width="8" height="8" fill="white"/><line x1="4" y1="0" x2="4" y2="8" stroke="#555" stroke-width="1"/></pattern>`,
  `<pattern id="bp3" patternUnits="userSpaceOnUse" width="8" height="8"><rect width="8" height="8" fill="white"/><line x1="0" y1="8" x2="8" y2="0" stroke="#555" stroke-width="1.2"/></pattern>`,
  `<pattern id="bp4" patternUnits="userSpaceOnUse" width="8" height="8"><rect width="8" height="8" fill="white"/><line x1="0" y1="8" x2="8" y2="0" stroke="#555" stroke-width="0.8"/><line x1="0" y1="0" x2="8" y2="8" stroke="#555" stroke-width="0.8"/></pattern>`,
  `<pattern id="bp5" patternUnits="userSpaceOnUse" width="8" height="8"><rect width="8" height="8" fill="white"/><circle cx="4" cy="4" r="1.8" fill="#555"/></pattern>`,
  `<pattern id="bp6" patternUnits="userSpaceOnUse" width="6" height="6"><rect width="6" height="6" fill="white"/><line x1="0" y1="3" x2="6" y2="3" stroke="#aaa" stroke-width="0.6"/><line x1="3" y1="0" x2="3" y2="6" stroke="#aaa" stroke-width="0.6"/></pattern>`,
  `<pattern id="bp7" patternUnits="userSpaceOnUse" width="4" height="4"><rect width="4" height="4" fill="white"/><line x1="0" y1="4" x2="4" y2="0" stroke="#888" stroke-width="0.8"/></pattern>`,
];

const REMNANT_PATTERN = `<pattern id="bp-rem" patternUnits="userSpaceOnUse" width="10" height="10">
  <rect width="10" height="10" fill="white"/>
  <line x1="0" y1="10" x2="10" y2="0" stroke="#bbb" stroke-width="0.8"/>
  <line x1="0" y1="0" x2="10" y2="10" stroke="#bbb" stroke-width="0.8"/>
</pattern>`;

/* ─── Black-and-white SVG cutting diagram ─────────────────────────────────── */

const niceInterval = (range) => {
  if (!range || range <= 0) return 1;
  const raw = range / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const n of [1, 2, 2.5, 5, 10]) if (raw <= n * mag) return n * mag;
  return 10 * mag;
};

function buildSVG(plan, W = 560, H = 340) {
  if (!plan) return "";
  const { stockW, stockH, stockUnit, placed, remnant } = plan;
  const ul = unitLabel(stockUnit);

  const ML = 44, MT = 28, MR = 12, MB = 30;
  const drawW = W - ML - MR;
  const drawH = H - MT - MB;
  const sx = drawW / stockW;
  const sy = drawH / stockH;

  const rx = v => ML + v * sx;
  const ry = v => MT + v * sy;

  // Ruler ticks
  const xInt = niceInterval(stockW), yInt = niceInterval(stockH);
  const xTicks = [], yTicks = [];
  for (let t = 0; t <= stockW + 0.001; t += xInt) xTicks.push(r2(t));
  for (let t = 0; t <= stockH + 0.001; t += yInt) yTicks.push(r2(t));

  // Cut lines derived from placed piece boundaries
  const hCuts = [...new Set(placed.map(p => r2(p.y + p.h)).filter(y => y < stockH - 0.01))];
  const vCuts = placed
    .filter(p => r2(p.x + p.w) < stockW - 0.01)
    .map(p => ({ x: r2(p.x + p.w), y: p.y, h: p.h }));

  const patDefs = [...BW_PATTERNS, REMNANT_PATTERN].join("\n");

  const pieces = placed.map((p, i) => {
    const px = rx(p.x), py = ry(p.y), pw = p.w * sx, ph = p.h * sy;
    const cx = px + pw / 2, cy = py + ph / 2;
    const small = pw < 50 || ph < 30;
    const name = (p.piece.customerName || "Order").substring(0, 12);
    const dim  = `${fmtNum(r2(p.w))}×${fmtNum(r2(p.h))}`;
    return `
      <rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="url(#bp${i % 8})" stroke="black" stroke-width="1.2"/>
      ${!small ? `
        <text x="${cx}" y="${cy - 7}" text-anchor="middle" font-size="9" font-weight="bold" font-family="Arial">${name}</text>
        <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="8" font-family="Arial">${dim} ${stockUnit}</text>
        <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="7.5" font-family="Arial">${fmtNum(r2(p.w * p.h))} sq.${ul}</text>
      ` : `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="7.5" font-weight="bold" font-family="Arial">${dim}</text>`}
      <circle cx="${px + 10}" cy="${py + 10}" r="8" fill="black"/>
      <text x="${px + 10}" y="${py + 14}" text-anchor="middle" font-size="8" font-weight="bold" fill="white" font-family="Arial">${i + 1}</text>
    `;
  }).join("");

  const remSVG = remnant ? `
    <rect x="${rx(remnant.x)}" y="${ry(remnant.y)}" width="${remnant.w * sx}" height="${remnant.h * sy}" fill="url(#bp-rem)" stroke="black" stroke-width="1.5" stroke-dasharray="6 3"/>
    <text x="${rx(remnant.x) + remnant.w * sx / 2}" y="${ry(remnant.y) + remnant.h * sy / 2 - 6}" text-anchor="middle" font-size="9" font-weight="bold" font-family="Arial">REMNANT</text>
    <text x="${rx(remnant.x) + remnant.w * sx / 2}" y="${ry(remnant.y) + remnant.h * sy / 2 + 7}" text-anchor="middle" font-size="8" font-family="Arial">${fmtNum(r2(remnant.w))} × ${fmtNum(r2(remnant.h))} ${stockUnit}</text>
  ` : "";

  const hCutLines = hCuts.map(y => `<line x1="${ML}" y1="${ry(y)}" x2="${ML + drawW}" y2="${ry(y)}" stroke="red" stroke-width="1" stroke-dasharray="5 3"/>`).join("");
  const vCutLines = vCuts.map(v => `<line x1="${rx(v.x)}" y1="${ry(v.y)}" x2="${rx(v.x)}" y2="${ry(v.y + v.h)}" stroke="red" stroke-width="1" stroke-dasharray="5 3"/>`).join("");

  const xRuler = xTicks.map(t => {
    const x = ML + (t / stockW) * drawW;
    return `<line x1="${x}" y1="${MT - 4}" x2="${x}" y2="${MT}" stroke="#555" stroke-width="0.8"/><text x="${x}" y="${MT - 7}" text-anchor="middle" font-size="7.5" fill="#555" font-family="Arial">${fmtNum(t)}</text>`;
  }).join("");
  const yRuler = yTicks.map(t => {
    const y = MT + (t / stockH) * drawH;
    return `<line x1="${ML - 4}" y1="${y}" x2="${ML}" y2="${y}" stroke="#555" stroke-width="0.8"/><text x="${ML - 6}" y="${y + 3}" text-anchor="end" font-size="7.5" fill="#555" font-family="Arial">${fmtNum(t)}</text>`;
  }).join("");

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="max-width:100%;height:auto;">
  <defs>${patDefs}</defs>
  <rect x="${ML}" y="${MT}" width="${drawW}" height="${drawH}" fill="#f5f5f5" stroke="black" stroke-width="1.5"/>
  ${remSVG}
  ${pieces}
  ${hCutLines}
  ${vCutLines}
  ${xRuler}
  ${yRuler}
  <text x="${ML + drawW - 2}" y="${MT - 8}" text-anchor="end" font-size="9" font-weight="bold" font-family="Arial">
    ${fmtNum(r2(stockW))} × ${fmtNum(r2(stockH))} ${stockUnit}
  </text>
  <text x="${ML + drawW / 2}" y="${H - 4}" text-anchor="middle" font-size="8" fill="#888" font-family="Arial">
    ${stockUnit} — dashed red = cut lines
  </text>
</svg>`;
}

/* ─── Legend rows ────────────────────────────────────────────────────────── */

function buildLegendRows(placed, stockUnit) {
  return placed.map((p, i) => `
    <tr>
      <td style="padding:4px 8px;border:1px solid #ccc;font-size:11px;">${i + 1}</td>
      <td style="padding:4px 8px;border:1px solid #ccc;font-size:11px;">${p.piece.customerName || "—"}</td>
      <td style="padding:4px 8px;border:1px solid #ccc;font-size:11px;">#${p.piece.quotationNo || "—"}</td>
      <td style="padding:4px 8px;border:1px solid #ccc;font-size:11px;font-weight:bold;">${fmtNum(r2(p.piece.ow))} × ${fmtNum(r2(p.piece.oh))} ${stockUnit}</td>
      <td style="padding:4px 8px;border:1px solid #ccc;font-size:11px;">${p.piece.quantity || 1}</td>
      <td style="padding:4px 8px;border:1px solid #ccc;font-size:11px;">${fmtNum(r2(p.w * p.h))} sq.${unitLabel(stockUnit)}</td>
    </tr>
  `).join("");
}

/* ─── Main export ────────────────────────────────────────────────────────── */

/**
 * @param {object} plan      – result of planCuts()
 * @param {object} stock     – stock record
 * @param {object[]} orders  – order items in the plan
 * @param {object}  options  – { diagram: bool, summary: bool, remnant: bool }
 * @param {string}  shopName – company / shop name
 * @param {string}  userName – logged-in user name
 */
export const printCuttingPlan = ({ plan, stock, orders, options = {}, shopName = "Glass Shop", userName = "" }) => {
  const { diagram = true, summary = true, remnant: showRemnant = true } = options;
  const su  = (stock.glass?.unit || "MM").toUpperCase();
  const ul  = unitLabel(su);
  const svg = diagram ? buildSVG(plan) : "";

  const stepRows = (plan?.steps || [])
    .filter(s => s.type !== "PIECE")
    .map((s, i) => {
      const icon = s.type === "H" ? "⟵" : s.type === "V" ? "⟷" : "♻";
      return `<div style="padding:5px 0;border-bottom:1px solid #eee;font-size:11.5px;display:flex;gap:10px;align-items:flex-start;">
        <span style="min-width:20px;font-weight:bold;">${s.type==="REMNANT"?icon:s.step}.</span>
        <span>${s.label}</span>
      </div>`;
    }).join("");

  const orderRows = buildLegendRows(plan?.placed || [], su);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Glass Cutting Plan — Stand #${stock.standNo}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 12mm; }
  * { box-sizing: border-box; font-family: Arial, sans-serif; }
  body { margin: 0; padding: 0; color: #000; background: #fff; font-size: 12px; line-height: 1.4; }
  h1 { font-size: 18px; margin: 0; letter-spacing: 0.03em; }
  h2 { font-size: 13px; margin: 0 0 6px; border-bottom: 1.5px solid #000; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #222; color: white; padding: 5px 8px; font-size: 11px; text-align: left; }
  td { padding: 4px 8px; border: 1px solid #ccc; font-size: 11px; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .section { margin-bottom: 14px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .info-table td { border: none; padding: 3px 6px; }
  .info-table td:first-child { font-weight: bold; width: 140px; }
  .badge { display:inline-block; background:#222; color:white; border-radius:3px; padding:1px 6px; font-size:10px; font-weight:bold; }
  .sig-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-top:14px; }
  .sig-field { border-bottom:1px solid #555; padding-bottom:2px; margin-top:18px; font-size:11px; }
  .sig-label { font-size:10px; color:#555; margin-top:3px; }
  .page-num { position:fixed; bottom:8mm; right:12mm; font-size:9px; color:#888; }
  .no-print { display:none !important; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    svg { page-break-inside: avoid; }
    .section { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<!-- Header -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #000;padding-bottom:8px;margin-bottom:12px;">
  <div>
    <h1>${shopName}</h1>
    <div style="font-size:13px;font-weight:bold;letter-spacing:0.05em;margin-top:2px;">GLASS CUTTING PLAN</div>
  </div>
  <div style="text-align:right;font-size:10.5px;color:#444;">
    <div><strong>Date:</strong> ${today()}</div>
    <div><strong>Time:</strong> ${timeNow()}</div>
    ${userName ? `<div><strong>Generated By:</strong> ${userName}</div>` : ""}
    <div style="margin-top:4px;"><span class="badge">Stand #${stock.standNo}</span></div>
  </div>
</div>

<!-- Stock + Orders side by side -->
<div class="section grid2">
  <div>
    <h2>Stock Information</h2>
    <table class="info-table">
      <tr><td>Stand No</td><td>#${stock.standNo}</td></tr>
      <tr><td>Glass Type</td><td>${stock.glass?.type || "—"}</td></tr>
      <tr><td>Thickness</td><td>${stock.glass?.thickness ? `${fmtNum(stock.glass.thickness)} mm` : "—"}</td></tr>
      <tr><td>Stock Size</td><td><strong>${fmtNum(r2(parseDim(stock.width)))} × ${fmtNum(r2(parseDim(stock.height)))} ${su}</strong></td></tr>
      <tr><td>Available Qty</td><td>${stock.quantity} pcs</td></tr>
    </table>
  </div>

  ${summary ? `
  <div>
    <h2>Optimization Summary</h2>
    <table class="info-table">
      <tr><td>Orders</td><td>${(plan?.placed||[]).length}</td></tr>
      <tr><td>Used Area</td><td>${fmtNum(r2(plan?.usedArea||0))} sq.${ul}</td></tr>
      <tr><td>Waste Area</td><td>${fmtNum(r2(plan?.wasteArea||0))} sq.${ul}</td></tr>
      <tr><td>Utilization</td><td><strong>${plan?.utilization||0}%</strong></td></tr>
      <tr><td>Remnant</td><td>${plan?.remnant ? `${fmtNum(r2(plan.remnant.w))} × ${fmtNum(r2(plan.remnant.h))} ${su}` : "none"}</td></tr>
    </table>
  </div>
  ` : "<div></div>"}
</div>

<!-- Orders table -->
<div class="section">
  <h2>Orders Included (${(plan?.placed||[]).length})</h2>
  <table>
    <thead>
      <tr>
        <th style="width:30px;">#</th>
        <th>Customer</th>
        <th>Order No</th>
        <th>Cut Size (${su})</th>
        <th style="width:40px;">Qty</th>
        <th>Area</th>
      </tr>
    </thead>
    <tbody>${orderRows}</tbody>
  </table>
</div>

<!-- Cutting sequence -->
<div class="section">
  <h2>Cutting Sequence</h2>
  <div style="columns:2;column-gap:16px;">
    ${stepRows || "<p style='color:#888;font-size:11px;'>No steps generated.</p>"}
  </div>
</div>

<!-- Visual diagram -->
${diagram ? `
<div class="section" style="page-break-inside:avoid;">
  <h2>Cutting Layout Diagram</h2>
  <div style="display:flex;gap:16px;align-items:flex-start;">
    <div>${svg}</div>
    <div style="font-size:10px;color:#555;min-width:110px;">
      <div style="font-weight:bold;margin-bottom:4px;">Legend</div>
      ${(plan?.placed||[]).map((p,i) => `
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
          <span style="width:14px;height:14px;border:1px solid black;display:inline-block;flex-shrink:0;background:${["#eee","repeating-linear-gradient(0deg,white 0,white 3px,#888 3px,#888 4px)","repeating-linear-gradient(90deg,white 0,white 3px,#888 3px,#888 4px)","repeating-linear-gradient(-45deg,white 0,white 3px,#888 3px,#888 4px)","repeating-linear-gradient(-45deg,white 0,white 2px,#888 2px,#888 3px,white 3px,white 5px,#888 5px,#888 6px)","radial-gradient(circle,#888 1.5px,white 1.5px)","#f0f0f0","repeating-linear-gradient(-45deg,white 0,white 2px,#bbb 2px,#bbb 3px)"][i%8]}"></span>
          <span>${i+1}. ${p.piece.customerName||"Order"} (${fmtNum(r2(p.piece.ow))}×${fmtNum(r2(p.piece.oh))})</span>
        </div>
      `).join("")}
      <div style="display:flex;align-items:center;gap:5px;margin-top:4px;">
        <span style="width:14px;height:14px;border:1px dashed black;display:inline-block;flex-shrink:0;background:repeating-linear-gradient(45deg,#ccc 0,#ccc 2px,white 2px,white 6px,#ccc 6px,#ccc 8px)"></span>
        <span>Remnant</span>
      </div>
    </div>
  </div>
</div>
` : ""}

<!-- Remnant details -->
${showRemnant && plan?.remnant ? `
<div class="section">
  <h2>Remnant / Remaining Piece</h2>
  <table class="info-table">
    <tr><td>Piece Size</td><td><strong>${fmtNum(r2(plan.remnant.w))} × ${fmtNum(r2(plan.remnant.h))} ${su}</strong></td></tr>
    <tr><td>Area</td><td>${fmtNum(r2(plan.remnant.area))} sq.${ul}</td></tr>
    <tr><td>Glass Type</td><td>${stock.glass?.type||"—"}</td></tr>
    <tr><td>Thickness</td><td>${stock.glass?.thickness ? `${fmtNum(stock.glass.thickness)} mm` : "—"}</td></tr>
    <tr><td>Source</td><td>Optimization Remnant — Stand #${stock.standNo}</td></tr>
    <tr><td>New Stand No</td><td><em>Pending Assignment</em></td></tr>
  </table>
  <p style="font-size:10.5px;color:#555;margin:6px 0 0;">→ Add this piece to inventory after cutting.</p>
</div>
` : ""}

<!-- Signature lines -->
<div class="section sig-row">
  <div>
    <div class="sig-field">&nbsp;</div>
    <div class="sig-label">Prepared By</div>
  </div>
  <div>
    <div class="sig-field">&nbsp;</div>
    <div class="sig-label">Cut By</div>
  </div>
  <div>
    <div class="sig-field">&nbsp;</div>
    <div class="sig-label">Date</div>
  </div>
</div>

<div class="page-num">Page 1 of 1</div>

<script>
  window.onload = function() {
    // slight delay so SVG renders fully
    setTimeout(function() { window.print(); }, 350);
  };
</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=850,height=1100");
  if (!win) { alert("Please allow popups for this site to print."); return; }
  win.document.write(html);
  win.document.close();
};
