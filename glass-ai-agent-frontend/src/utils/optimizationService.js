/**
 * Glass Cutting Optimization Service
 * Pure functions — no React or API calls.
 */

// ── Dimension helpers ─────────────────────────────────────────────────────────

/** Parse "5", "5.5", "5 1/4", or "5MM" → number (strips non-numeric suffix) */
export const parseDim = (value) => {
  if (value == null || value === "") return 0;
  const s = String(value).trim();
  // fraction: "5 1/4"
  const frac = s.match(/^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)$/);
  if (frac) return parseFloat(frac[1]) + parseFloat(frac[2]) / parseFloat(frac[3]);
  // plain number or "5MM" / "5.5 mm"
  const num = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? 0 : num;
};

/** Normalise any unit to MM */
export const toMM = (value, unit) => {
  const v = parseDim(value);
  switch ((unit || "MM").toUpperCase()) {
    case "INCH": return v * 25.4;
    case "FEET": return v * 304.8;
    default:     return v;
  }
};

/** Convert a MM value back to the target unit */
export const fromMM = (mm, unit) => {
  switch ((unit || "MM").toUpperCase()) {
    case "INCH": return mm / 25.4;
    case "FEET": return mm / 304.8;
    default:     return mm;
  }
};

/** Unit abbreviation label */
export const unitLabel = (unit) => {
  switch ((unit || "MM").toUpperCase()) {
    case "INCH": return "in";
    case "FEET": return "ft";
    default:     return "mm";
  }
};

/** Strip trailing zeros: 5.00 → "5", 10.50 → "10.5" */
export const fmtNum = (n) => {
  const f = parseFloat(n);
  return isNaN(f) ? "?" : String(f);
};

/** Safe thickness display */
export const fmtThickness = (raw) => {
  if (raw == null || raw === "") return null;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : `${fmtNum(n)} mm`;
};

// ── Single-order matching ────────────────────────────────────────────────────

/**
 * Score a single stock item against one order item.
 * All comparisons happen in MM to avoid unit mismatch.
 * Returns null when stock cannot cover the order.
 */
const scoreCandidate = (stock, orderItem) => {
  if (!stock.quantity || stock.quantity <= 0) return null;

  const stockUnit = stock.glass?.unit || "MM";
  const orderUnit = orderItem.unit || "MM";

  const stockHmm = toMM(stock.height, stockUnit);
  const stockWmm = toMM(stock.width,  stockUnit);
  const reqHmm   = toMM(orderItem.height, orderUnit);
  const reqWmm   = toMM(orderItem.width,  orderUnit);

  if (stockHmm < reqHmm || stockWmm < reqWmm) return null;

  const stockArea  = stockHmm * stockWmm;
  const reqArea    = reqHmm   * reqWmm;
  const wasteArea  = stockArea - reqArea;
  const efficiency = reqArea > 0 ? (reqArea / stockArea) * 100 : 100;
  const sameType   = (stock.glass?.type || "").toLowerCase() ===
                     (orderItem.glassType || "").toLowerCase();
  const sameUnit   = (stockUnit).toUpperCase() === (orderUnit).toUpperCase();
  const isExact    = wasteArea < 0.01; // float tolerance

  return {
    stock,
    stockUnit,
    orderUnit,
    stockHmm, stockWmm, stockArea,
    reqHmm, reqWmm, reqArea,
    wasteArea: Math.round(wasteArea * 100) / 100,
    efficiency: Math.round(efficiency * 100) / 100,
    sameType,
    sameUnit,
    isExact,
    // Same unit is highest priority, then same type, then lowest waste
    score: (sameUnit ? 0 : 2_000_000) + (sameType ? 0 : 1_000_000) + wasteArea,
  };
};

/**
 * Find all viable stock matches for a single order item, sorted best-first.
 */
export const findMatches = (orderItem, allStock) =>
  allStock
    .map(s => scoreCandidate(s, orderItem))
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);

// ── Combined cutting plans ───────────────────────────────────────────────────

const findCombinedPlans = (results, allStock) => {
  const plans = [];

  allStock.forEach(stock => {
    if (!stock.quantity || stock.quantity <= 0) return;
    const stockUnit  = stock.glass?.unit || "MM";
    const stockHmm   = toMM(stock.height, stockUnit);
    const stockWmm   = toMM(stock.width,  stockUnit);
    const stockArea  = stockHmm * stockWmm;

    const fitting = results.filter(r => {
      const orderUnit = r.order.unit || "MM";
      const reqHmm = toMM(r.order.height, orderUnit);
      const reqWmm = toMM(r.order.width,  orderUnit);
      const sameType = (stock.glass?.type || "").toLowerCase() ===
                       (r.order.glassType || "").toLowerCase();
      return reqHmm <= stockHmm && reqWmm <= stockWmm && sameType;
    });

    if (fitting.length < 2) return;

    const totalReq  = fitting.reduce((s, r) => {
      const u = r.order.unit || "MM";
      return s + toMM(r.order.height, u) * toMM(r.order.width, u);
    }, 0);
    const totalWaste = stockArea - totalReq;

    if (totalWaste >= 0) {
      plans.push({
        stock,
        orders: fitting.map(r => r.order),
        totalRequired: Math.round(totalReq * 100) / 100,
        stockArea:     Math.round(stockArea * 100) / 100,
        totalWaste:    Math.round(totalWaste * 100) / 100,
        efficiency:    Math.round((totalReq / stockArea) * 10000) / 100,
      });
    }
  });

  return plans.sort((a, b) => a.totalWaste - b.totalWaste);
};

// ── Smart Cutting Planner ────────────────────────────────────────────────────

/**
 * Shelf (guillotine) bin-packing.
 * Returns placed pieces, remnant, waste, and cut instructions.
 * Everything expressed in the stock's own unit so labels are never wrong.
 *
 * @param {object[]} orderItems  – array of order objects with { height, width, unit, customerName, quotationNo, glassType }
 * @param {object}   stock       – stock record with glass.unit, height, width
 */
export const planCuts = (orderItems, stock) => {
  const su    = (stock.glass?.unit || "MM").toUpperCase();  // display unit
  const stockH = fromMM(toMM(stock.height, su), su);
  const stockW = fromMM(toMM(stock.width,  su), su);
  if (!stockH || !stockW) return null;

  const ul = unitLabel(su);

  // Convert every order to stock unit
  const pieces = orderItems
    .map((o, i) => {
      const oh = fromMM(toMM(parseDim(o.height), o.unit || su), su);
      const ow = fromMM(toMM(parseDim(o.width),  o.unit || su), su);
      return { ...o, oh, ow, idx: i };
    })
    .filter(p => p.oh > 0 && p.ow > 0 && p.oh <= stockH && p.ow <= stockW);

  // Sort largest area first (guillotine best-fit priority)
  pieces.sort((a, b) => b.oh * b.ow - a.oh * a.ow);

  // ── Shelf packing ────────────────────────────────────────────────────────
  const shelves  = [];   // { y, shelfH, usedW, items: [{x, w, h, piece}] }
  const placed   = [];   // final placed piece list
  const unplaced = [];

  for (const piece of pieces) {
    let fitted = false;

    for (const shelf of shelves) {
      if (piece.oh <= shelf.shelfH && shelf.usedW + piece.ow <= stockW + 0.001) {
        const entry = { x: shelf.usedW, y: shelf.y, w: piece.ow, h: piece.oh, piece };
        shelf.items.push(entry);
        placed.push(entry);
        shelf.usedW += piece.ow;
        fitted = true;
        break;
      }
    }

    if (!fitted) {
      const shelfY = shelves.reduce((s, sh) => s + sh.shelfH, 0);
      if (shelfY + piece.oh > stockH + 0.001) { unplaced.push(piece); continue; }
      const shelf = { y: shelfY, shelfH: piece.oh, usedW: piece.ow, items: [] };
      const entry = { x: 0, y: shelfY, w: piece.ow, h: piece.oh, piece };
      shelf.items.push(entry);
      shelves.push(shelf);
      placed.push(entry);
    }
  }

  // ── Areas ────────────────────────────────────────────────────────────────
  const r2      = v => Math.round(v * 100) / 100;
  const usedH   = r2(shelves.reduce((s, sh) => s + sh.shelfH, 0));
  const usedArea = r2(placed.reduce((s, p) => s + p.w * p.h, 0));
  const stockArea = r2(stockW * stockH);

  // Remnant = largest contiguous rectangle remaining
  //   Option A: bottom strip (full-width × remaining height)
  const bottomH  = r2(stockH - usedH);
  const bottomW  = stockW;
  const bottomArea = r2(bottomH * bottomW);

  //   Option B: right-side gaps per shelf (collect largest)
  let bestSideArea = 0, bestSideRemnant = null;
  shelves.forEach(sh => {
    const gapW = r2(stockW - sh.usedW);
    if (gapW > 0.01) {
      const area = r2(gapW * sh.shelfH);
      if (area > bestSideArea) {
        bestSideArea = area;
        bestSideRemnant = { x: sh.usedW, y: sh.y, w: gapW, h: sh.shelfH };
      }
    }
  });

  const remnant = bottomArea >= bestSideArea
    ? (bottomH > 0.01 ? { x: 0, y: usedH, w: bottomW, h: bottomH, area: bottomArea, isBottom: true } : null)
    : { ...bestSideRemnant, area: bestSideArea, isBottom: false };

  const wasteArea = r2(stockArea - usedArea - (remnant?.area || 0));

  // ── Cutting instructions ─────────────────────────────────────────────────
  const steps = [];
  let stepNo  = 1;

  shelves.forEach((shelf, si) => {
    // Horizontal cut to separate this shelf from the rest (skip first cut if starts at 0 and is the only row)
    if (si < shelves.length - 1 || shelves.length > 1) {
      const cutY = r2(shelf.y + shelf.shelfH);
      if (cutY < stockH - 0.01) {
        steps.push({
          step: stepNo++,
          type: "H",
          value: r2(shelf.y + shelf.shelfH),
          label: `Cut horizontally at ${r2(shelf.y + shelf.shelfH)} ${su} — separates Row ${si + 1}`,
        });
      }
    }

    // Vertical cuts within this shelf
    shelf.items.forEach((item, ii) => {
      const cutX = r2(item.x + item.w);
      if (ii < shelf.items.length - 1) {
        steps.push({
          step: stepNo++,
          type: "V",
          value: cutX,
          label: `Cut vertically at ${cutX} ${su} in Row ${si + 1}`,
        });
      }
      steps.push({
        step: stepNo++,
        type: "PIECE",
        label: `Piece #${item.piece.idx + 1}: ${item.piece.customerName || "Order"} — ${r2(item.piece.ow)} × ${r2(item.piece.oh)} ${su}`,
        piece: item.piece,
        x: item.x, y: item.y, w: item.w, h: item.h,
      });
    });
  });

  if (remnant) {
    steps.push({
      step: stepNo++,
      type: "REMNANT",
      label: `Remaining piece: ${r2(remnant.w)} × ${r2(remnant.h)} ${su} — store back in inventory`,
    });
  }

  return {
    stockW, stockH, stockUnit: su, stockArea, ul,
    shelves, placed, unplaced, remnant,
    usedArea, wasteArea,
    utilization: stockArea > 0 ? r2((usedArea / stockArea) * 100) : 0,
    steps,
  };
};

// ── Main entry point ─────────────────────────────────────────────────────────

export const optimizeOrders = (selectedOrders, allStock) => {
  const results = selectedOrders.map(order => {
    const matches = findMatches(order, allStock);
    const best    = matches[0] || null;
    const matchType = !best
      ? "none"
      : best.isExact && best.sameType ? "exact"
      : best.sameType                 ? "good"
      : "partial";
    return { order, best, alternatives: matches.slice(1, 3), matchType };
  });

  const combinedPlans = findCombinedPlans(results, allStock);

  return {
    results,
    combinedPlans,
    summary: {
      total:         results.length,
      exact:         results.filter(r => r.matchType === "exact").length,
      good:          results.filter(r => r.matchType === "good").length,
      partial:       results.filter(r => r.matchType === "partial").length,
      none:          results.filter(r => r.matchType === "none").length,
      combinedPlans: combinedPlans.length,
    },
  };
};
