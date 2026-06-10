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

// ── Mirror-glass remnant rule ────────────────────────────────────────────────
//
// When glass type is "Mirror", the shop requires that the remaining scrap piece
// after each cut retains at least 12 inches in every non-zero linear dimension.
// A scrap strip narrower than 12 inches cannot be re-used for another Mirror order.
//
// Rule summary:
//   - After cutting, check remnantH = stockH − reqH  and  remnantW = stockW − reqW.
//   - If a dimension is essentially zero (exact fit, < 0.01 mm), it is fine — no waste.
//   - If a dimension is > 0 but < 304.8 mm (12 in), the result is "undesirable".
//   - Prefer a combination where both non-zero remnant dimensions ≥ 304.8 mm.
//   - If NO combination satisfies this, fall back to the best overall result.
//   - This rule applies ONLY to Mirror glass; all other types are unchanged.

/** 12 inches expressed in millimetres — Mirror minimum remnant threshold. */
const MIRROR_MIN_REMNANT_MM = 12 * 25.4; // 304.8 mm

/**
 * Mirror-only: returns true when every non-zero remnant dimension is ≥ 12 in.
 * An exact-fit axis (remnant < 0.01 mm) is always acceptable.
 */
const mirrorRemnantOk = (remnantHmm, remnantWmm) => {
  const hOk = remnantHmm < 0.01 || remnantHmm >= MIRROR_MIN_REMNANT_MM;
  const wOk = remnantWmm < 0.01 || remnantWmm >= MIRROR_MIN_REMNANT_MM;
  return hOk && wOk;
};

/** Returns true when glassType string equals "Mirror" (case-insensitive). */
const isMirrorGlass = (glassType) =>
  (glassType || "").trim().toLowerCase() === "mirror";

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

  // Strict glass-type enforcement: when the order specifies a glass type, only
  // stock of that exact type is eligible. Cross-type matches (e.g. Mirror order
  // consuming Plain Glass stock) are never allowed, regardless of dimensions.
  // Orders with no glassType specified are unrestricted (legacy behaviour).
  if (orderItem.glassType && !sameType) return null;

  // Strict thickness enforcement: a 5mm order may only use 5mm stock.
  if (orderItem.thickness != null && orderItem.thickness !== "") {
    const sTh = stock.glass?.thickness != null ? parseFloat(stock.glass.thickness) : null;
    if (sTh == null || Math.abs(sTh - parseFloat(orderItem.thickness)) > 0.001) return null;
  }

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
    // Remaining linear dimensions after this single-piece cut (used by Mirror rule)
    remnantHmm: Math.max(0, stockHmm - reqHmm),
    remnantWmm: Math.max(0, stockWmm - reqWmm),
    // Same unit is highest priority, then lowest waste (sameType always true here)
    score: (sameUnit ? 0 : 2_000_000) + wasteArea,
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

    // Pre-filter: each order must at least fit dimensionally inside the stock
    const fitting = results.filter(r => {
      const orderUnit = r.order.unit || "MM";
      const reqHmm = toMM(r.order.height, orderUnit);
      const reqWmm = toMM(r.order.width,  orderUnit);
      const sameType = (stock.glass?.type || "").toLowerCase() ===
                       (r.order.glassType || "").toLowerCase();
      // Thickness must match too (5mm order -> 5mm stock only).
      let sameThickness = true;
      if (r.order.thickness != null && r.order.thickness !== "") {
        const sTh = stock.glass?.thickness != null ? parseFloat(stock.glass.thickness) : null;
        sameThickness = sTh != null && Math.abs(sTh - parseFloat(r.order.thickness)) < 0.001;
      }
      return reqHmm <= stockHmm && reqWmm <= stockWmm && sameType && sameThickness;
    });

    if (fitting.length < 2) return;

    // Run actual shelf packing — only pieces that planCuts places are real
    const cut = planCuts(fitting.map(r => r.order), stock);
    if (!cut || cut.placed.length < 2) return;

    // plan.orders = only the placed pieces (single source of truth for summary + modal)
    const placedOrders = cut.placed.map(p => p.piece);

    const isMirror = isMirrorGlass(stock.glass?.type);
    const su = (stock.glass?.unit || "MM").toUpperCase();
    // Mirror remnant check using the actual computed remnant height
    const remnantHmm = cut.remnant ? toMM(cut.remnant.h, su) : 0;
    const mirrorUndesirable = isMirror &&
      remnantHmm > 0.01 &&
      remnantHmm < MIRROR_MIN_REMNANT_MM;

    plans.push({
      stock,
      orders:      placedOrders,
      cuttingPlan: cut,           // precomputed — reused by summary card + modal
      totalRequired: Math.round(cut.usedArea  * 100) / 100,
      stockArea:     Math.round(cut.stockArea * 100) / 100,
      totalWaste:    Math.round(cut.wasteArea * 100) / 100,
      efficiency:    cut.stockArea > 0
        ? Math.round((cut.usedArea / cut.stockArea) * 10000) / 100
        : 0,
      mirrorUndesirable,
    });
  });

  // Sort: Mirror-preferred plans first (undesirable last), then by least waste
  return plans.sort((a, b) => {
    if (a.mirrorUndesirable !== b.mirrorUndesirable)
      return a.mirrorUndesirable ? 1 : -1;
    return a.totalWaste - b.totalWaste;
  });
};

// ── Smart Cutting Planner ────────────────────────────────────────────────────

/**
 * Guillotine bin-packing with rotation.
 * Tracks a list of free rectangles and places each piece in the smallest
 * free rect that fits (trying both orientations). After placement the used
 * rect is split into two new free rects (right strip + bottom strip).
 * This lets pieces from different orders share leftover space that the old
 * shelf algorithm would leave unused.
 *
 * @param {object[]} orderItems  – array of order objects with { height, width, unit, customerName, quotationNo, glassType }
 * @param {object}   stock       – stock record with glass.unit, height, width
 */
export const planCuts = (orderItems, stock) => {
  const su    = (stock.glass?.unit || "MM").toUpperCase();
  const stockH = fromMM(toMM(stock.height, su), su);
  const stockW = fromMM(toMM(stock.width,  su), su);
  if (!stockH || !stockW) return null;

  const ul = unitLabel(su);
  const r2 = v => Math.round(v * 100) / 100;

  // Convert every order to stock unit; keep both orientations viable
  const pieces = orderItems
    .map((o, i) => {
      const oh = fromMM(toMM(parseDim(o.height), o.unit || su), su);
      const ow = fromMM(toMM(parseDim(o.width),  o.unit || su), su);
      return { ...o, oh, ow, idx: i };
    })
    .filter(p => {
      if (p.oh <= 0 || p.ow <= 0) return false;
      // Accept if piece fits in at least one orientation
      return (p.oh <= stockH && p.ow <= stockW) ||
             (p.ow <= stockH && p.oh <= stockW);
    });

  pieces.sort((a, b) => b.oh * b.ow - a.oh * a.ow);

  // ── Guillotine packing ───────────────────────────────────────────────────
  let freeRects = [{ x: 0, y: 0, w: stockW, h: stockH }];
  const placed   = [];
  const unplaced = [];

  for (const piece of pieces) {
    const ph0 = piece.oh, pw0 = piece.ow;
    let bestIdx = -1, bestArea = Infinity, bestRotated = false;

    for (let i = 0; i < freeRects.length; i++) {
      const fr = freeRects[i];
      const area = fr.w * fr.h;
      if (area >= bestArea) continue; // can't improve
      // Normal orientation
      if (pw0 <= fr.w + 0.001 && ph0 <= fr.h + 0.001) {
        bestArea = area; bestIdx = i; bestRotated = false;
      }
      // Rotated (only when piece is non-square and rotation is different)
      if (ph0 !== pw0 && ph0 <= fr.w + 0.001 && pw0 <= fr.h + 0.001) {
        if (area < bestArea) { bestArea = area; bestIdx = i; bestRotated = true; }
      }
    }

    if (bestIdx === -1) { unplaced.push(piece); continue; }

    const fr = freeRects[bestIdx];
    const pw = bestRotated ? ph0 : pw0;
    const ph = bestRotated ? pw0 : ph0;

    placed.push({ x: fr.x, y: fr.y, w: r2(pw), h: r2(ph), piece });

    // Split used rect: right strip (full height of fr) + bottom strip (piece width)
    const rightW  = r2(fr.w - pw);
    const bottomH = r2(fr.h - ph);
    const newRects = [];
    if (rightW  > 0.01) newRects.push({ x: r2(fr.x + pw), y: fr.y,          w: rightW,      h: fr.h   });
    if (bottomH > 0.01) newRects.push({ x: fr.x,          y: r2(fr.y + ph), w: r2(pw),      h: bottomH });
    freeRects.splice(bestIdx, 1, ...newRects);
  }

  // ── Areas ────────────────────────────────────────────────────────────────
  const usedArea  = r2(placed.reduce((s, p) => s + p.w * p.h, 0));
  const stockArea = r2(stockW * stockH);

  // Remnant = largest remaining free rectangle
  const remnant = (() => {
    if (!freeRects.length) return null;
    const best = freeRects.reduce((b, fr) => {
      const a = r2(fr.w * fr.h);
      return (!b || a > b.area) ? { x: r2(fr.x), y: r2(fr.y), w: r2(fr.w), h: r2(fr.h), area: a } : b;
    }, null);
    if (!best || best.area < 0.01) return null;
    best.isBottom = best.y > 0.01 && best.x < 0.01;
    return best;
  })();

  const wasteArea = r2(stockArea - usedArea - (remnant?.area || 0));

  // ── Cutting instructions (top-left → bottom-right order for the cutter) ──
  const steps = [];
  let stepNo  = 1;
  const seenH = new Set();
  const sortedPlaced = [...placed].sort((a, b) => a.y - b.y || a.x - b.x);

  sortedPlaced.forEach(entry => {
    const cutX = r2(entry.x + entry.w);
    const cutY = r2(entry.y + entry.h);
    // Horizontal cut below piece (deduplicated across rows)
    if (cutY < stockH - 0.01 && !seenH.has(cutY)) {
      seenH.add(cutY);
      steps.push({ step: stepNo++, type: "H", value: cutY, label: `Cut horizontally at ${cutY} ${su}` });
    }
    // Vertical cut right of piece
    if (cutX < stockW - 0.01) {
      steps.push({ step: stepNo++, type: "V", value: cutX, label: `Cut vertically at ${cutX} ${su}` });
    }
    steps.push({
      step: stepNo++, type: "PIECE",
      label: `${entry.piece.customerName || "Order"} — ${r2(entry.w)} × ${r2(entry.h)} ${su}`,
      piece: entry.piece, x: entry.x, y: entry.y, w: entry.w, h: entry.h,
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
    placed, unplaced, remnant,
    usedArea, wasteArea,
    utilization: stockArea > 0 ? r2((usedArea / stockArea) * 100) : 0,
    steps,
  };
};

// ── Global cross-order bin packing ───────────────────────────────────────────
//
// Groups pieces by glass type + thickness, then packs them onto the SMALLEST
// sufficient stock first. Smallest-first means existing remnants (small pieces)
// are consumed before full sheets — maximising remnant reuse and minimising
// full-sheet consumption. A piece not placed anywhere is returned in
// unplacedPieces.

export const optimizeGlobal = (pieces, allStock) => {
  // Group pieces by glass type + thickness (5mm only matches 5mm stock).
  const byGroup = {};
  pieces.forEach(p => {
    const type = (p.glassType || '').toLowerCase();
    const th = (p.thickness != null && p.thickness !== '') ? parseFloat(p.thickness) : null;
    const key = `${type}|${th ?? ''}`;
    if (!byGroup[key]) byGroup[key] = { type, thickness: th, pieces: [] };
    byGroup[key].pieces.push(p);
  });

  const sheetPlans     = [];
  const unplacedPieces = [];

  Object.values(byGroup).forEach(({ type: glassType, thickness, pieces: typePieces }) => {
    // Eligible stock for this type+thickness, sorted SMALLEST area first so
    // remnants are tried before full sheets (Priority: remnants → full sheets).
    const eligibleStock = allStock
      .filter(s => {
        if (!s.quantity || s.quantity <= 0) return false;
        const sType = (s.glass?.type || '').toLowerCase();
        if (glassType !== '' && sType !== glassType) return false;
        if (thickness != null) {
          const sTh = s.glass?.thickness != null ? parseFloat(s.glass.thickness) : null;
          if (sTh == null || Math.abs(sTh - thickness) > 0.001) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aArea = toMM(a.height, a.glass?.unit || 'MM') * toMM(a.width, a.glass?.unit || 'MM');
        const bArea = toMM(b.height, b.glass?.unit || 'MM') * toMM(b.width, b.glass?.unit || 'MM');
        return aArea - bArea; // smallest first → use remnants before full sheets
      });

    let remaining   = [...typePieces];
    const usedCounts = {};

    for (const stock of eligibleStock) {
      if (remaining.length === 0) break;

      const stockId = stock.id != null
        ? `id-${stock.id}`
        : `stand-${stock.standNo}-${stock.glassId}`;

      // A stand with quantity N is N physical sheets. Consume them one at a
      // time — each sheet packs the next batch of remaining pieces — until the
      // quantity is exhausted, all orders are placed, or nothing more fits.
      const maxSheets = Math.max(1, parseInt(stock.quantity, 10) || 1);
      let used = usedCounts[stockId] || 0;

      while (remaining.length > 0 && used < maxSheets) {
        const cut = planCuts(remaining, stock);
        // Nothing fits on a fresh sheet of this stand (every remaining piece is
        // too big) — no point burning more of its quantity; move to next stock.
        if (!cut || cut.placed.length === 0) break;

        const placedPieces = cut.placed.map(p => p.piece);
        const placedKeys   = new Set(placedPieces.map(p => p.key));

        const isMirror     = isMirrorGlass(stock.glass?.type);
        const su           = (stock.glass?.unit || 'MM').toUpperCase();
        const remnantHmm   = cut.remnant ? toMM(cut.remnant.h, su) : 0;
        const mirrorUndesirable = isMirror &&
          remnantHmm > 0.01 && remnantHmm < MIRROR_MIN_REMNANT_MM;

        sheetPlans.push({
          stock,
          orders: placedPieces,
          cuttingPlan: cut,
          efficiency: cut.stockArea > 0
            ? Math.round((cut.usedArea / cut.stockArea) * 10000) / 100
            : 0,
          mirrorUndesirable,
        });

        used += 1;
        usedCounts[stockId] = used;
        remaining = remaining.filter(p => !placedKeys.has(p.key));
      }
    }

    unplacedPieces.push(...remaining);
  });

  return {
    sheetPlans,
    unplacedPieces,
    summary: {
      total:   pieces.length,
      placed:  pieces.length - unplacedPieces.length,
      sheets:  sheetPlans.length,
      noMatch: unplacedPieces.length,
    },
  };
};

// ── Legacy per-order entry point (kept for reference) ─────────────────────────

export const optimizeOrders = (selectedOrders, allStock) => {
  const results = selectedOrders.map(order => {
    const matches = findMatches(order, allStock);

    let best = matches[0] || null;

    // Mirror-specific remnant rule: among all viable stock matches (already sorted
    // by area-waste score), prefer the first one that leaves ≥ 12 in (304.8 mm)
    // in every non-zero remnant dimension.  If none qualifies, keep the original
    // best (fallback — requirement §5).  Non-Mirror glass is unaffected.
    if (isMirrorGlass(order.glassType) && matches.length > 0) {
      const preferred = matches.find(m =>
        mirrorRemnantOk(m.remnantHmm, m.remnantWmm)
      );
      if (preferred) best = preferred;
      // If preferred is null, best stays as matches[0] (fallback)
    }

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
