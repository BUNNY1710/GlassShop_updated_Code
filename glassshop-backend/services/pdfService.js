'use strict';
/*
 * pdfService.js — Vyapar-style business document PDFs
 * Layout reference: uploaded Vyapar estimate sample
 * All five document types: Quotation · Estimate · Advance Bill · Tax Invoice · Delivery Challan
 */
const PDFDocument = require('pdfkit');
const { Quotation, QuotationItem, Invoice, InvoiceItem, Shop, User, Architect } = require('../models');

// ─────────────────────────────────────────────────────────────────────────────
// UNCHANGED BUSINESS-LOGIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const parsePolishData = (desc) => {
  if (!desc) return null;
  const m = desc.match(/POLISH_DATA:(.+)/s);
  if (m) { try { return JSON.parse(m[1]); } catch { return null; } }
  return null;
};

const convertToFeet = (v, unit) => {
  const n = parseFloat(v) || 0;
  if (unit === 'FEET') return n;
  if (unit === 'INCH') return n / 12;
  if (unit === 'MM')   return n / 304.8;
  return n;
};

const getRunningFt = (item) => {
  if (item.runningFt != null && parseFloat(item.runningFt) > 0) return parseFloat(item.runningFt);
  const pd = parsePolishData(item.description);
  if (pd?.runningFt != null) return parseFloat(pd.runningFt) || 0;
  if (pd?.polishSelection && pd.selectedHeightTableValue && pd.selectedWidthTableValue) {
    const hft = convertToFeet(parseFloat(pd.selectedHeightTableValue) || 0, item.heightUnit || 'FEET');
    const wft = convertToFeet(parseFloat(pd.selectedWidthTableValue) || 0, item.widthUnit || 'FEET');
    const qty = parseInt(item.quantity) || 1;
    const gr  = { P: [], H: [], B: [] };
    const rt  = { P: pd.polishRates?.P || 15, H: pd.polishRates?.H || 75, B: pd.polishRates?.B || 75 };
    const dim = [hft, wft, hft, wft];
    (pd.polishSelection || []).forEach((s, i) => { if (s.checked && s.type && gr[s.type]) gr[s.type].push(dim[i]); });
    let tot = 0;
    Object.keys(gr).forEach(t => { if (gr[t].length) tot += gr[t].reduce((a, b) => a + b, 0) * rt[t]; });
    return tot * qty;
  }
  return 0;
};

const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const c = (n) => {
    if (!n) return '';
    if (n < 20)  return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + c(n % 100) : '');
  };
  if (!num || num === 0) return 'Zero Rupees Only';
  const [rStr, pStr = '00'] = num.toFixed(2).split('.');
  let r = parseInt(rStr), p = parseInt(pStr), res = '';
  if (r >= 10000000) { res += c(Math.floor(r / 10000000)) + ' Crore '; r %= 10000000; }
  if (r >= 100000)   { res += c(Math.floor(r / 100000))   + ' Lakh ';  r %= 100000;  }
  if (r >= 1000)     { res += c(Math.floor(r / 1000))     + ' Thousand '; r %= 1000; }
  if (r > 0) res += c(r);
  res = (res.trim() || 'Zero') + ' Rupees';
  if (p > 0) res += ' and ' + c(p) + ' Paise';
  return res + ' Only';
};

const fmtDate = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return [String(x.getDate()).padStart(2, '0'), String(x.getMonth() + 1).padStart(2, '0'), x.getFullYear()].join('-');
};

/** Strip trailing decimal zeros: "1000.00" → "1000", "10.50" → "10.5", "9 1/2" → "9 1/2" */
const fmtDim = (v) => {
  if (v == null || v === '') return '';
  const n = parseFloat(v);
  return isNaN(n) ? String(v) : String(n);
};

const rupee = (n) => `Rs.${(parseFloat(n) || 0).toFixed(2)}`;

// Build the item name line (bold): e.g. "12MM Plain Glass"
const itemName = (item) => {
  const gt = (item.glassType || '').trim();
  const tk = item.thickness ? fmtDim(String(item.thickness).replace(/\s*mm\s*/i, '').trim()) + 'MM' : '';
  const parts = [tk, gt].filter(Boolean);
  if (item.design) parts.push(item.design);
  return parts.join(' ') || 'Glass Item';
};

// Build the item description line (in parentheses): size + polish
const itemDesc = (item) => {
  const hU = item.heightUnit === 'INCH' ? '"' : item.heightUnit === 'MM' ? 'mm' : "'";
  const wU = item.widthUnit  === 'INCH' ? '"' : item.widthUnit  === 'MM' ? 'mm' : "'";
  const pd = parsePolishData(item.description);
  const parts = [];
  if (item.height && item.width) {
    let hD = fmtDim(item.height), wD = fmtDim(item.width);
    if (pd && !pd.sizeInMM) {
      if (pd.heightOriginal) hD = pd.heightOriginal;
      if (pd.widthOriginal)  wD = pd.widthOriginal;
    }
    parts.push(`${hD}${hU} x ${wD}${wU}`);
  }
  if (pd?.polishSelection) {
    const sel = pd.polishSelection.filter(s => s.checked && s.type)
      .map(s => `${['H1','W1','H2','W2'][pd.polishSelection.indexOf(s)]}:${s.type}`);
    if (sel.length) parts.push(`Polish [${sel.join(' ')}]`);
  }
  const rawD = item.description ? item.description.replace(/POLISH_DATA:.*$/s, '').trim() : '';
  if (rawD) parts.push(rawD);
  return parts.length ? `(${parts.join(' | ')})` : '';
};

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS — A4 Portrait
// ─────────────────────────────────────────────────────────────────────────────
const PW = 595, PH = 842;
const ML = 28, MR = 28, MT = 20, MB = 25;   // margins
const CW = PW - ML - MR;                     // 539  content width
const LX = ML;                               // left content edge
const RX = PW - MR;                          // right content edge

// Brand orange (exact Vyapar shade)
const ORANGE  = '#F58220';
const ORANGE2 = '#E06A00';   // darker for borders
const WHITE   = '#FFFFFF';
const BLACK   = '#000000';
const DARK    = '#1a1a1a';
const GRAY    = '#555555';
const LGRAY   = '#888888';
const BORDER  = '#999999';   // table cell borders
const ZEBRA   = '#F9F9F9';
const LIGHT_O = '#FEF0E3';   // very light orange background

// ─────────────────────────────────────────────────────────────────────────────
// DRAWING PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/** Thin black outer page border (like Vyapar) */
function drawPageBorder(doc) {
  doc.rect(8, 8, PW - 16, PH - 16)
     .strokeColor(BORDER).lineWidth(0.6).stroke();
}

/**
 * Page header: logo-placeholder (top-left) + company info (top-right).
 * Returns Y just below the header horizontal rule.
 */
function drawHeader(doc, shop) {
  const LOGO_W = 80, LOGO_H = 70, LOGO_Y = MT;

  // Logo box (placeholder with company initial)
  doc.rect(LX, LOGO_Y, LOGO_W, LOGO_H)
     .strokeColor(BORDER).lineWidth(0.6).stroke();
  doc.rect(LX + 1, LOGO_Y + 1, LOGO_W - 2, LOGO_H - 2)
     .fill(LIGHT_O);
  const init = (shop?.shopName || 'G').charAt(0).toUpperCase();
  doc.fontSize(28).font('Helvetica-Bold').fillColor(ORANGE)
     .text(init, LX, LOGO_Y + 18, { width: LOGO_W, align: 'center', lineBreak: false });

  // Company info — right block, right-aligned
  const ciX = LX + LOGO_W + 10;
  const ciW = RX - ciX;
  let iy = LOGO_Y;

  // Company name — large, bold, right-aligned
  doc.fontSize(17).font('Helvetica-Bold').fillColor(DARK)
     .text(shop?.shopName || 'Company Name', ciX, iy,
           { width: ciW, align: 'right', lineBreak: false });
  iy += 22;

  doc.fontSize(8.5).font('Helvetica').fillColor(GRAY);
  if (shop?.address) {
    doc.text(shop.address, ciX, iy, { width: ciW, align: 'right' });
    iy += doc.heightOfString(shop.address, { width: ciW, fontSize: 8.5 }) + 2;
  }
  const phoneEmail = [shop?.phone ? `Phone no.: ${shop.phone}` : null, shop?.email || null].filter(Boolean);
  phoneEmail.forEach(ln => {
    doc.text(ln, ciX, iy, { width: ciW, align: 'right', lineBreak: false });
    iy += 12;
  });
  const gst = shop?.gstNumber || shop?.gst_number;
  if (gst) {
    doc.font('Helvetica-Bold').fillColor(GRAY)
       .text(`GSTIN: ${gst}`, ciX, iy, { width: ciW, align: 'right', lineBreak: false });
    iy += 12;
  }
  // Extra fields (Site / Mobile No. like Vyapar)
  doc.font('Helvetica').fillColor(GRAY)
     .text('Site:', ciX, iy, { width: ciW, align: 'right', lineBreak: false }); iy += 12;
  doc.text('Mobile No.:', ciX, iy, { width: ciW, align: 'right', lineBreak: false }); iy += 12;

  const headerBottom = Math.max(LOGO_Y + LOGO_H, iy) + 6;

  // Horizontal rule below header
  doc.moveTo(LX, headerBottom).lineTo(RX, headerBottom)
     .strokeColor(BORDER).lineWidth(0.7).stroke();

  return headerBottom;
}

/**
 * Centered document title (e.g. "Estimate") with thin rules.
 * Returns Y just below.
 */
function drawDocTitle(doc, y, title) {
  const TH = 18;
  doc.fontSize(13).font('Helvetica-Bold').fillColor(DARK)
     .text(title, LX, y + 2, { width: CW, align: 'center', lineBreak: false });
  const bot = y + TH;
  doc.moveTo(LX, bot).lineTo(RX, bot).strokeColor(BORDER).lineWidth(0.6).stroke();
  return bot + 4;
}

/**
 * Two-column customer / document-details section.
 * Each column: orange header strip + data rows below.
 * Returns Y just below.
 */
function drawInfoSection(doc, y, left, right) {
  const HALF = Math.floor(CW / 2);
  const lx   = LX;
  const rx   = LX + HALF;
  const PAD  = 6;
  const TH   = 15;   // orange strip height
  const colW = HALF - PAD * 2;

  // First line (name) is bold/larger; remaining lines (mobile, address, site)
  // are regular and WRAP. Address can be multi-line / very long (≤ 500 chars).
  const fontFor = (i) => { doc.fontSize(i === 0 ? 11 : 8.5).font(i === 0 ? 'Helvetica-Bold' : 'Helvetica'); };
  const gapFor  = (i) => (i === 0 ? 3 : 2);          // intra-paragraph line gap
  const padFor  = (i) => (i === 0 ? 3 : 2);          // extra space after each entry

  const lLines = (left.lines || []).filter(Boolean).map(String);
  const rLines = (right ? (right.lines || []) : []).filter(Boolean).map(String);

  // Measure a column's wrapped content height (font must be set before measuring).
  const measure = (lines) => lines.reduce((h, ln, i) => {
    fontFor(i);
    return h + doc.heightOfString(ln, { width: colW, lineGap: gapFor(i) }) + padFor(i);
  }, 0);

  const lH = TH + PAD + measure(lLines) + PAD;
  const rH = TH + PAD + measure(rLines) + PAD;
  const bh = Math.max(lH, rH, 52);

  // Outer border (height auto-expanded to fit the wrapped address)
  doc.rect(lx, y, CW, bh).strokeColor(BORDER).lineWidth(0.7).stroke();

  // Renders one column of wrapped lines, advancing Y by each line's real height.
  const renderColumn = (lines, x) => {
    let ly = y + TH + PAD;
    lines.forEach((ln, i) => {
      fontFor(i);
      doc.fillColor(i === 0 ? DARK : GRAY);
      const lineGap = gapFor(i);
      doc.text(ln, x + PAD, ly, { width: colW, lineGap });
      ly += doc.heightOfString(ln, { width: colW, lineGap }) + padFor(i);
    });
  };

  // Left orange header
  doc.rect(lx, y, HALF, TH).fill(ORANGE);
  doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE)
     .text((left.title || '').toUpperCase(), lx + PAD, y + 4, { width: colW, lineBreak: false });
  renderColumn(lLines, lx);

  // Vertical divider
  doc.moveTo(rx, y).lineTo(rx, y + bh).strokeColor(BORDER).lineWidth(0.6).stroke();

  // Right orange header + lines
  if (right) {
    doc.rect(rx, y, HALF, TH).fill(ORANGE);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE)
       .text((right.title || '').toUpperCase(), rx + PAD, y + 4, { width: colW, lineBreak: false });
    renderColumn(rLines, rx);
  }

  return y + bh;
}

// ─────────────────────────────────────────────────────────────────────────────
// ITEM TABLE
// ─────────────────────────────────────────────────────────────────────────────

/*
 * Column definitions — sum = CW (539)
 * # | Item Name | HSN/SAC | Quantity | Unit | Price/Unit | Amount
 */
const COLS = [
  { label: '#',           w: 24,  align: 'center' },
  { label: 'Item Name',   w: 213, align: 'left'   },
  { label: 'HSN/ SAC',   w: 55,  align: 'center' },
  { label: 'Quantity',    w: 52,  align: 'center' },
  { label: 'Unit',        w: 42,  align: 'center' },
  { label: 'Price/ Unit', w: 78,  align: 'right'  },
  { label: 'Amount',      w: 75,  align: 'right'  },
];

// Precompute column x-positions
let _cx = 0;
COLS.forEach(c => { c.x = _cx; _cx += c.w; });

/**
 * Draw the orange table header row. Returns Y after.
 */
function drawTableHeader(doc, y) {
  const TH = 19;
  doc.rect(LX, y, CW, TH).fill(ORANGE);
  // white column separators + labels
  doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE);
  COLS.forEach((c, i) => {
    if (i > 0) {
      doc.moveTo(LX + c.x, y).lineTo(LX + c.x, y + TH)
         .strokeColor(WHITE).lineWidth(0.4).stroke();
    }
    doc.text(c.label, LX + c.x + 3, y + 5,
             { width: c.w - 6, align: c.align, lineBreak: false });
  });
  // outer border on header
  doc.rect(LX, y, CW, TH).strokeColor(BORDER).lineWidth(0.6).stroke();
  return y + TH;
}

/**
 * Draw one item row (name line + description line).
 * Returns Y after.
 */
function drawItemRow(doc, y, idx, item, alt) {
  const nameTxt = itemName(item);
  const descTxt = itemDesc(item);
  const nameW   = COLS[1].w - 8;
  const descH   = descTxt
    ? doc.heightOfString(descTxt, { width: nameW, fontSize: 8 })
    : 0;
  const rowH = Math.max(22, 12 + descH + 10);

  // Alternate row background
  if (alt) doc.rect(LX, y, CW, rowH).fill(ZEBRA);

  // Cell values
  const rft     = getRunningFt(item);
  const lineAmt = parseFloat(item.subtotal || 0) + rft;
  const vals = [
    String(idx + 1),
    nameTxt,
    item.hsnCode || '',
    String(item.quantity || ''),
    'SqFt',
    rupee(parseFloat(item.ratePerSqft || item.sellingPrice || 0)),
    rupee(lineAmt),
  ];

  // Draw cell separators + text
  doc.fontSize(8.5).font('Helvetica').fillColor(DARK);
  COLS.forEach((c, i) => {
    // vertical separator
    if (i > 0) {
      doc.moveTo(LX + c.x, y).lineTo(LX + c.x, y + rowH)
         .strokeColor(BORDER).lineWidth(0.4).stroke();
    }
    if (i === 1) {
      // Bold item name
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(DARK)
         .text(vals[i], LX + c.x + 4, y + 5, { width: c.w - 8, lineBreak: false });
      // Normal description
      if (descTxt) {
        doc.fontSize(8).font('Helvetica').fillColor(GRAY)
           .text(descTxt, LX + c.x + 4, y + 16, { width: c.w - 8 });
      }
    } else {
      doc.fontSize(8.5).font('Helvetica').fillColor(DARK)
         .text(vals[i], LX + c.x + 3, y + 5,
               { width: c.w - 6, align: c.align, lineBreak: false });
    }
  });

  // Outer row border (left, right, bottom)
  doc.moveTo(LX, y).lineTo(LX, y + rowH).strokeColor(BORDER).lineWidth(0.6).stroke();
  doc.moveTo(RX, y).lineTo(RX, y + rowH).strokeColor(BORDER).lineWidth(0.6).stroke();
  doc.moveTo(LX, y + rowH).lineTo(RX, y + rowH).strokeColor(BORDER).lineWidth(0.5).stroke();

  return { nextY: y + rowH, amount: lineAmt };
}

/**
 * Draw the bold "Total" row (matches Vyapar sample exactly).
 * Returns Y after.
 */
function drawTotalRow(doc, y, totalQty, totalAmt) {
  const TH = 20;
  doc.rect(LX, y, CW, TH).fill(WHITE);
  doc.rect(LX, y, CW, TH).strokeColor(BORDER).lineWidth(0.6).stroke();

  // "Total" label in the Item Name column
  doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK)
     .text('Total', LX + COLS[1].x + 4, y + 5, { lineBreak: false });

  // Qty in Quantity column
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor(DARK)
     .text(String(Math.round(totalQty)), LX + COLS[3].x + 3, y + 5,
           { width: COLS[3].w - 6, align: 'center', lineBreak: false });

  // Amount (right-most)
  doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK)
     .text(rupee(totalAmt), LX + COLS[6].x + 3, y + 5,
           { width: COLS[6].w - 6, align: 'right', lineBreak: false });

  // Column separators (thin)
  COLS.forEach((c, i) => {
    if (i > 0) {
      doc.moveTo(LX + c.x, y).lineTo(LX + c.x, y + TH)
         .strokeColor(BORDER).lineWidth(0.4).stroke();
    }
  });
  return y + TH;
}

// ─────────────────────────────────────────────────────────────────────────────
// AMOUNT IN WORDS  +  TOTALS  (two-column section — exact Vyapar layout)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draws the split row:
 *  Left  column: "Estimate order Amount In Words" header + amount text
 *  Right column: "Amounts" header + subtotal rows + total row
 *
 * Returns Y after.
 */
function drawAmountSection(doc, y, grandTotal, summaryRows, docLabel) {
  const LEFT_W  = Math.round(CW * 0.555);  // ~299px
  const RIGHT_W = CW - LEFT_W;             // ~240px
  const lx = LX;
  const rx = LX + LEFT_W;
  const OH = 16;   // orange header strip height
  const ROW_H = 17;
  const totalRows = summaryRows.length;
  const contentH  = totalRows * ROW_H + 6;
  const amtH      = Math.max(OH + contentH + 4, OH + 40);

  // ── Left: Amount In Words ──────────────────────────────
  // Orange header
  doc.rect(lx, y, LEFT_W, OH).fill(ORANGE);
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(WHITE)
     .text(`${docLabel} Amount In Words`, lx + 5, y + 4,
           { width: LEFT_W - 10, lineBreak: false });

  // Amount text
  doc.rect(lx, y + OH, LEFT_W, amtH - OH).fill(WHITE);
  doc.rect(lx, y, LEFT_W, amtH).strokeColor(BORDER).lineWidth(0.6).stroke();
  doc.fontSize(8.5).font('Helvetica').fillColor(DARK)
     .text(numberToWords(grandTotal), lx + 5, y + OH + 6,
           { width: LEFT_W - 10 });

  // ── Right: Amounts box ─────────────────────────────────
  // Orange header
  doc.rect(rx, y, RIGHT_W, OH).fill(ORANGE);
  doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE)
     .text('Amounts', rx + 5, y + 4,
           { width: RIGHT_W - 10, align: 'right', lineBreak: false });

  doc.rect(rx, y + OH, RIGHT_W, amtH - OH).fill(WHITE);
  doc.rect(rx, y, RIGHT_W, amtH).strokeColor(BORDER).lineWidth(0.6).stroke();

  let ry = y + OH + 5;
  summaryRows.forEach((row) => {
    const isTotal = row.bold || row.grand;
    if (row.grand) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK);
    } else {
      doc.fontSize(8.5).font(isTotal ? 'Helvetica-Bold' : 'Helvetica').fillColor(DARK);
    }
    doc.text(row.label, rx + 5, ry, { lineBreak: false });
    doc.text(row.value, rx + 5, ry, { width: RIGHT_W - 10, align: 'right', lineBreak: false });
    // thin separator between rows
    if (!row.grand) {
      doc.moveTo(rx + 2, ry + ROW_H - 1).lineTo(rx + RIGHT_W - 2, ry + ROW_H - 1)
         .strokeColor('#DDDDDD').lineWidth(0.3).stroke();
    }
    ry += ROW_H;
  });

  return y + amtH;
}

// ─────────────────────────────────────────────────────────────────────────────
// TERMS & CONDITIONS  +  SIGNATURE  (two-column bottom section)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TERMS = [
  '18% GST Extra.',
  '85% Advance after approval of quotation.',
  'Work will get started after receiving of advance.',
  'Immediate or within 8 days balance payment should be released as per discussion if not 24% per annum interest will be charged on balance amount.',
  'For any extra work extra charges will applied.',
  'Side should be free from all obstacles.',
  'Electricity, ladder, stool, scaffolding, water etc will be provided by client side.',
  'Chargeable size will consider in 12" or 6" or subject to optimisation of material. For sheet work chargeable size will consider as total used and wastage sheet.',
  'In case of old work i.e. using old material extra charges will be considered as add-on for new material & labour.',
  'No retention amount will be debited from bill.',
  'No debit charges will entertain in any condition.',
  'No return or exchange policy on material and advance.',
  'Accommodation, transportation charges will be extra for labour.',
];

/**
 * Draw the two-column bottom section.
 * Left: "Terms and conditions" (orange header) + asterisk bullet list + slogans
 * Right: "For: [shopName]" + blank area + "Authorized Signatory"
 *
 * Fills remaining page height.
 */
function drawTermsAndSignature(doc, y, shopName, terms, remainingH) {
  const LEFT_W  = Math.round(CW * 0.55);
  const RIGHT_W = CW - LEFT_W;
  const lx = LX;
  const rx = LX + LEFT_W;
  const OH = 16;
  const boxH = Math.max(remainingH, 120);
  const list = (terms && terms.length) ? terms : DEFAULT_TERMS;

  // Left: Terms
  doc.rect(lx, y, LEFT_W, OH).fill(ORANGE);
  doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE)
     .text('Terms and conditions', lx + 5, y + 4, { width: LEFT_W - 10, lineBreak: false });

  doc.rect(lx, y + OH, LEFT_W, boxH - OH).fill(WHITE);
  doc.rect(lx, y, LEFT_W, boxH).strokeColor(BORDER).lineWidth(0.6).stroke();

  let ty = y + OH + 5;
  doc.fontSize(8).font('Helvetica').fillColor(DARK);
  list.forEach(t => {
    if (ty > y + boxH - 10) return;
    const line = `*${t}`;
    doc.text(line, lx + 5, ty, { width: LEFT_W - 10 });
    ty += doc.heightOfString(line, { width: LEFT_W - 10, fontSize: 8 }) + 2;
  });

  // Slogans
  const slogans = ['||Committed to best services ||', '||Committed to best Customer satisfaction.||', '||Committed to Improvement.||'];
  doc.fontSize(7.5).font('Helvetica').fillColor(GRAY);
  slogans.forEach(s => {
    if (ty > y + boxH - 10) return;
    doc.text(s, lx + 5, ty, { width: LEFT_W - 10, lineBreak: false });
    ty += 10;
  });
  if (ty < y + boxH - 12) {
    doc.fontSize(7.5).font('Helvetica').fillColor(GRAY)
       .text('Thank you for doing business with us. Visit again!', lx + 5, ty, { width: LEFT_W - 10, lineBreak: false });
  }

  // Right: Signature
  doc.rect(rx, y, RIGHT_W, boxH).fill(WHITE);
  doc.rect(rx, y, RIGHT_W, boxH).strokeColor(BORDER).lineWidth(0.6).stroke();

  // "For: [Shop Name]"
  doc.fontSize(8.5).font('Helvetica').fillColor(DARK)
     .text(`For: ${shopName || 'Company'}`, rx + 8, y + OH, { width: RIGHT_W - 16, lineBreak: false });

  // "Authorized Signatory" near bottom
  doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK)
     .text('Authorized Signatory', rx + 8, y + boxH - 22,
           { width: RIGHT_W - 16, align: 'center', lineBreak: false });

  return y + boxH;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE FOOTER
// ─────────────────────────────────────────────────────────────────────────────
function drawFooter(doc, shopName, pageNum) {
  const fy = PH - MB + 4;
  doc.moveTo(LX, fy - 2).lineTo(RX, fy - 2)
     .strokeColor(BORDER).lineWidth(0.4).stroke();
  doc.fontSize(7).font('Helvetica').fillColor(LGRAY);
  doc.text(shopName || '', LX, fy, { width: CW / 2, lineBreak: false });
  doc.text(`Page ${pageNum}`, LX, fy,
           { width: CW, align: 'right', lineBreak: false });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY + FINALIZE
// ─────────────────────────────────────────────────────────────────────────────
async function verifyAccess(entityShopId, userId) {
  const user = await User.findOne({ where: { userName: userId }, include: [{ model: Shop, as: 'shop' }] });
  if (!user?.shopId) throw new Error('User not found or not linked to a shop');
  if (entityShopId !== user.shopId) throw new Error('Unauthorized');
}

function finalize(doc, chunks) {
  doc.end();
  return new Promise((resolve, reject) => {
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED ITEM RENDERING (used by quotation, invoice, estimate)
// Returns { nextY, totalAmt, totalQty, totalRft, page }
// ─────────────────────────────────────────────────────────────────────────────
function renderItems(doc, items, shop, docTitle, docNum, docDate, page, yStart) {
  let y = drawTableHeader(doc, yStart);
  let totalAmt = 0, totalQty = 0, totalRft = 0;

  (items || []).forEach((item, idx) => {
    // New page if near bottom
    if (y > PH - MB - 100) {
      page++;
      doc.addPage();
      drawPageBorder(doc);
      drawFooter(doc, shop?.shopName, page);
      let y2 = drawHeader(doc, shop);
      y2 = drawDocTitle(doc, y2 + 2, docTitle);
      y = drawTableHeader(doc, y2 + 4);
    }
    const rft = getRunningFt(item);
    const { nextY, amount } = drawItemRow(doc, y, idx, item, idx % 2 === 1);
    totalAmt += amount;
    totalQty += parseFloat(item.quantity || 0);
    totalRft += rft;
    y = nextY;
  });

  y = drawTotalRow(doc, y, totalQty, totalAmt);
  return { nextY: y, totalAmt, totalQty, totalRft, page };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. QUOTATION PDF
// ─────────────────────────────────────────────────────────────────────────────
const generateQuotationPdf = async (quotationId, userId) => {
  const q = await Quotation.findByPk(quotationId, {
    include: [
      { model: QuotationItem, as: 'items', separate: true, order: [['itemOrder', 'ASC']] },
      { model: Shop, as: 'shop' },
      { model: Architect, as: 'referenceArchitect', required: false },
    ],
  });
  if (!q) throw new Error('Quotation not found');
  await verifyAccess(q.shopId, userId);

  const doc    = new PDFDocument({ size: [PW, PH], margin: 0, autoFirstPage: true });
  const chunks = [];
  doc.on('data', c => chunks.push(c));

  const shop = q.shop;
  const arch = q.referenceArchitect;

  let page = 1;
  drawPageBorder(doc);
  drawFooter(doc, shop?.shopName, page);

  let y = drawHeader(doc, shop);
  y = drawDocTitle(doc, y + 2, 'QUOTATION') + 2;

  // Customer Info | Quotation Details
  const docLines = [
    `Quotation No.: ${q.quotationNumber || ''}`,
    `Date: ${fmtDate(q.quotationDate)}`,
    q.validUntil ? `Valid Until: ${fmtDate(q.validUntil)}` : null,
  ].filter(Boolean);
  if (arch) docLines.push(`Architect: ${arch.name}`);

  y = drawInfoSection(doc, y,
    { title: 'Quotation For',
      lines: [q.customerName || '', q.customerMobile ? `Mobile: ${q.customerMobile}` : null, q.customerAddress || null] },
    { title: 'Quotation Details', lines: docLines }
  ) + 4;

  // Items table
  const { nextY, totalAmt, totalQty, totalRft, page: pg } =
    renderItems(doc, q.items, shop, 'QUOTATION', q.quotationNumber, fmtDate(q.quotationDate), page, y);
  y = nextY + 4;
  page = pg;

  // Financial summary rows
  const sub   = parseFloat(q.subtotal || 0) || totalAmt - totalRft;
  const inst  = parseFloat(q.installationCharge || 0);
  const trns  = parseFloat(q.transportCharge || 0);
  const disc  = parseFloat(q.discount || 0);
  const gstV  = parseFloat(q.gstAmount || 0);
  const grand = parseFloat(q.grandTotal || 0) || (sub + totalRft + inst + trns - disc + gstV);

  const sumRows = [{ label: 'Sub Total', value: rupee(sub) }];
  if (totalRft > 0) sumRows.push({ label: 'Running Ft', value: rupee(totalRft) });
  if (inst > 0) sumRows.push({ label: 'Installation', value: rupee(inst) });
  if (trns > 0) sumRows.push({ label: 'Transport',    value: rupee(trns) });
  if (disc > 0) sumRows.push({ label: 'Discount',     value: `(${rupee(disc)})` });
  if (q.billingType === 'GST' && gstV > 0)
    sumRows.push({ label: `GST @ ${q.gstPercentage || 0}%`, value: rupee(gstV) });
  sumRows.push({ label: 'Total', value: rupee(grand), grand: true });

  y = drawAmountSection(doc, y, grand, sumRows, 'Quotation order') + 4;

  // Terms + Signature
  const remaining = PH - MB - y - 4;
  drawTermsAndSignature(doc, y, shop?.shopName, null, remaining);

  return finalize(doc, chunks);
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. CUTTING PAD (Landscape work pad — keep existing plain layout)
// ─────────────────────────────────────────────────────────────────────────────
const generateCuttingPadPrintPdf = async (quotationId, userId) => {
  const q = await Quotation.findByPk(quotationId, {
    include: [
      { model: QuotationItem, as: 'items', separate: true, order: [['itemOrder', 'ASC']] },
      { model: Shop, as: 'shop' },
      { model: Architect, as: 'referenceArchitect', required: false },
    ],
  });
  if (!q) throw new Error('Quotation not found');
  await verifyAccess(q.shopId, userId);

  const LPW = 842, LPH = 595, LM = 30;
  const LCW = LPW - LM * 2;
  const doc    = new PDFDocument({ size: [LPW, LPH], margin: 0 });
  const chunks = [];
  doc.on('data', c => chunks.push(c));

  const shop = q.shop;
  const arch = q.referenceArchitect;

  doc.rect(8, 8, LPW - 16, LPH - 16).strokeColor(BORDER).lineWidth(0.6).stroke();

  // Header
  let y = 20;
  doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK)
     .text((shop?.shopName || 'GlassShop').toUpperCase(), LM, y,
           { width: LCW * 0.55, lineBreak: false });
  y += 18;
  doc.fontSize(8).font('Helvetica').fillColor(GRAY);
  if (shop?.address) { doc.text(shop.address, LM, y, { width: LCW * 0.55, lineBreak: false }); y += 11; }
  if (shop?.phone)   { doc.text(`Tel: ${shop.phone}`, LM, y, { lineBreak: false }); y += 11; }

  // Badge (right)
  const bX = LM + Math.round(LCW * 0.56);
  const bW = LPW - LM - bX;
  doc.rect(bX, 18, bW, 28).fill(ORANGE);
  doc.fontSize(13).font('Helvetica-Bold').fillColor(WHITE)
     .text('CUTTING PAD', bX, 25, { width: bW, align: 'center', lineBreak: false });

  // Meta right
  let ry = 50;
  [
    `No: ${q.quotationNumber || ''}`,
    `Date: ${fmtDate(q.quotationDate)}`,
    `Customer: ${q.customerName || ''}`,
    arch ? `Architect: ${arch.name}` : null,
  ].filter(Boolean).forEach(m => {
    doc.fontSize(8).font('Helvetica').fillColor(GRAY)
       .text(m, bX, ry, { width: bW, lineBreak: false });
    ry += 11;
  });

  const headerBot = Math.max(y, ry) + 6;
  doc.moveTo(LM, headerBot).lineTo(LPW - LM, headerBot).strokeColor(BORDER).lineWidth(0.6).stroke();
  y = headerBot + 8;

  // Columns: # | Glass Type | Thickness | H | W | Qty | Polish/Notes | ✓
  const cpCols = [
    { label: '#',             w: 22  },
    { label: 'Glass Type',    w: 175 },
    { label: 'Thickness',     w: 60  },
    { label: 'Height',        w: 85  },
    { label: 'Width',         w: 85  },
    { label: 'Qty',           w: 35  },
    { label: 'Polish / Notes',w: 218 },
    { label: '✓',             w: 38  },
  ];
  let cx2 = 0;
  cpCols.forEach(c => { c.x = cx2; cx2 += c.w; });
  const tW2 = cx2;

  // Header row
  const TH2 = 19;
  doc.rect(LM, y, tW2, TH2).fill(ORANGE);
  doc.rect(LM, y, tW2, TH2).strokeColor(BORDER).lineWidth(0.6).stroke();
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(WHITE);
  cpCols.forEach((c, i) => {
    if (i > 0) doc.moveTo(LM + c.x, y).lineTo(LM + c.x, y + TH2).strokeColor(WHITE).lineWidth(0.4).stroke();
    doc.text(c.label.toUpperCase(), LM + c.x + 2, y + 5, { width: c.w - 4, align: 'center', lineBreak: false });
  });
  y += TH2;

  (q.items || []).forEach((item, idx) => {
    if (y > LPH - 90) return;
    const pd = parsePolishData(item.description);
    let hD = fmtDim(item.height), wD = fmtDim(item.width);
    if (pd && !pd.sizeInMM) { if (pd.heightOriginal) hD = pd.heightOriginal; if (pd.widthOriginal) wD = pd.widthOriginal; }
    const unit = item.heightUnit || 'FEET';
    const hU   = unit === 'INCH' ? '"' : unit === 'MM' ? 'mm' : "'";

    let pol = '';
    if (pd?.itemPolish) pol += `Type: ${pd.itemPolish}`;
    if (pd?.polishSelection) {
      const sel = pd.polishSelection.filter(s => s.checked && s.type);
      if (sel.length) pol += (pol ? ' | ' : '') + 'Sides: ' + sel.map(s => `${s.side.split('(')[0].trim()}=${s.type}`).join(' ');
    }
    if (pd?.selectedHeightTableValue) pol += ` | H-Tbl:${pd.selectedHeightTableValue} W-Tbl:${pd.selectedWidthTableValue}`;

    const polH = pol ? doc.heightOfString(pol, { width: cpCols[6].w - 6, fontSize: 8 }) : 0;
    const rH   = Math.max(19, polH + 10);
    const isAlt = idx % 2 === 1;
    if (isAlt) doc.rect(LM, y, tW2, rH).fill(ZEBRA);

    const tk = item.thickness ? String(item.thickness).replace(/mm/i,'').trim()+'MM' : '–';
    const gl = [item.glassType, tk].filter(Boolean).join(' ');
    const vals2 = [idx+1, gl, tk, `${hD}${hU}`, `${wD}${hU}`, item.quantity, pol || '–', ''];
    doc.fontSize(8.5).font('Helvetica').fillColor(DARK);
    cpCols.forEach((c, i) => {
      if (i > 0) doc.moveTo(LM + c.x, y).lineTo(LM + c.x, y + rH).strokeColor(BORDER).lineWidth(0.3).stroke();
      doc.text(String(vals2[i] || ''), LM + c.x + 3, y + 5, { width: c.w - 6, align: 'center', lineBreak: i === 6 });
    });
    doc.moveTo(LM, y).lineTo(LM, y + rH).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.moveTo(LM + tW2, y).lineTo(LM + tW2, y + rH).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.moveTo(LM, y + rH).lineTo(LM + tW2, y + rH).strokeColor(BORDER).lineWidth(0.4).stroke();
    y += rH;
  });

  y += 14;
  const sigL = ['Prepared By', 'Cut By', 'Checked By', 'Date / Shift'];
  const sW   = Math.floor((LCW - 6 * (sigL.length - 1)) / sigL.length);
  sigL.forEach((lbl, i) => {
    const sx = LM + i * (sW + 6);
    doc.rect(sx, y, sW, 46).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.fontSize(7).font('Helvetica-Bold').fillColor(DARK).text(lbl.toUpperCase(), sx + 5, y + 5, { width: sW - 10 });
    doc.moveTo(sx + 6, y + 32).lineTo(sx + sW - 6, y + 32).strokeColor(BORDER).lineWidth(0.4).stroke();
    doc.fontSize(7).font('Helvetica').fillColor(LGRAY).text('Signature', sx + 5, y + 36, { width: sW - 10 });
  });

  return finalize(doc, chunks);
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. TAX INVOICE / FINAL BILL
// ─────────────────────────────────────────────────────────────────────────────
const generateInvoicePdf = async (invoiceId, userId) => {
  const inv = await Invoice.findByPk(invoiceId, {
    include: [
      { model: InvoiceItem, as: 'items', separate: true, order: [['itemOrder', 'ASC']] },
      { model: Shop, as: 'shop' },
    ],
  });
  if (!inv) throw new Error('Invoice not found');
  await verifyAccess(inv.shopId, userId);

  const doc    = new PDFDocument({ size: [PW, PH], margin: 0 });
  const chunks = [];
  doc.on('data', c => chunks.push(c));

  const shop     = inv.shop;
  const docTitle = inv.billingType === 'GST' ? 'TAX INVOICE' : 'INVOICE';
  let   page     = 1;

  drawPageBorder(doc);
  drawFooter(doc, shop?.shopName, page);

  let y = drawHeader(doc, shop);
  y = drawDocTitle(doc, y + 2, docTitle) + 2;

  y = drawInfoSection(doc, y,
    { title: 'Bill To',
      lines: [inv.customerName || '', inv.customerMobile ? `Mobile: ${inv.customerMobile}` : null,
              inv.customerAddress || null, inv.customerGst ? `GSTIN: ${inv.customerGst}` : null] },
    { title: 'Invoice Details',
      lines: [`Invoice No.: ${inv.invoiceNumber || ''}`, `Date: ${fmtDate(inv.invoiceDate)}`,
              inv.invoiceType ? `Type: ${inv.invoiceType}` : null,
              inv.paymentStatus ? `Status: ${inv.paymentStatus}` : null].filter(Boolean) }
  ) + 4;

  // GST table (if applicable)
  if (inv.billingType === 'GST' && parseFloat(inv.gstAmount || 0) > 0) {
    const half = (inv.gstPercentage || 0) / 2;
    const gstAmt = parseFloat(inv.gstAmount || 0);
    const taxRows = inv.cgst && inv.sgst
      ? [['CGST', `${half}%`, rupee(parseFloat(inv.cgst || 0))], ['SGST', `${half}%`, rupee(parseFloat(inv.sgst || 0))]]
      : [['IGST', `${inv.gstPercentage || 0}%`, rupee(gstAmt)]];

    const gstCols = [
      { label: 'Tax Type',   w: 100, x: 0,   align: 'left'   },
      { label: 'Rate',       w: 60,  x: 100,  align: 'center' },
      { label: 'Tax Amount', w: 100, x: 160,  align: 'right'  },
    ];
    const gW = 260;
    const TH = 17;
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(GRAY).text('TAX BREAKDOWN', LX, y + 2);
    y += 14;
    doc.rect(LX, y, gW, TH).fill(ORANGE);
    gstCols.forEach((c, i) => {
      if (i > 0) doc.moveTo(LX + c.x, y).lineTo(LX + c.x, y + TH).strokeColor(WHITE).lineWidth(0.4).stroke();
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(WHITE)
         .text(c.label, LX + c.x + 3, y + 5, { width: c.w - 6, align: c.align, lineBreak: false });
    });
    doc.rect(LX, y, gW, TH).strokeColor(BORDER).lineWidth(0.5).stroke();
    y += TH;
    taxRows.forEach((row, ri) => {
      doc.rect(LX, y, gW, 16).fill(ri % 2 === 1 ? ZEBRA : WHITE);
      doc.rect(LX, y, gW, 16).strokeColor(BORDER).lineWidth(0.4).stroke();
      gstCols.forEach((c, i) => {
        if (i > 0) doc.moveTo(LX + c.x, y).lineTo(LX + c.x, y + 16).strokeColor(BORDER).lineWidth(0.3).stroke();
        doc.fontSize(8).font('Helvetica').fillColor(DARK)
           .text(row[i], LX + c.x + 3, y + 4, { width: c.w - 6, align: c.align, lineBreak: false });
      });
      y += 16;
    });
    y += 6;
  }

  const { nextY, totalAmt, totalQty, totalRft, page: pg } =
    renderItems(doc, inv.items, shop, docTitle, inv.invoiceNumber, fmtDate(inv.invoiceDate), page, y);
  y = nextY + 4;
  page = pg;

  const sub   = parseFloat(inv.subtotal || 0) || totalAmt - totalRft;
  const inst  = parseFloat(inv.installationCharge || 0);
  const trns  = parseFloat(inv.transportCharge || 0);
  const disc  = parseFloat(inv.discount || 0);
  const gstV  = parseFloat(inv.gstAmount || 0);
  const grand = parseFloat(inv.grandTotal || 0) || (sub + totalRft + inst + trns - disc + gstV);
  const paid  = parseFloat(inv.paidAmount || 0);
  const due   = parseFloat(inv.dueAmount  || 0);

  const sumRows = [{ label: 'Sub Total', value: rupee(sub) }];
  if (totalRft > 0) sumRows.push({ label: 'Running Ft', value: rupee(totalRft) });
  if (inst > 0) sumRows.push({ label: 'Installation', value: rupee(inst) });
  if (trns > 0) sumRows.push({ label: 'Transport',    value: rupee(trns) });
  if (disc > 0) sumRows.push({ label: 'Discount',     value: `(${rupee(disc)})` });
  if (gstV > 0) sumRows.push({ label: `GST @ ${inv.gstPercentage || 0}%`, value: rupee(gstV) });
  sumRows.push({ label: 'Total', value: rupee(grand), grand: true });
  if (paid > 0) sumRows.push({ label: 'Amount Paid',  value: rupee(paid), bold: true });
  if (due  > 0) sumRows.push({ label: 'Balance Due',  value: rupee(due),  bold: true });

  y = drawAmountSection(doc, y, grand, sumRows, 'Invoice') + 4;
  const remaining = PH - MB - y - 4;
  drawTermsAndSignature(doc, y, shop?.shopName, null, remaining);

  return finalize(doc, chunks);
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. ESTIMATE (basic invoice)
// ─────────────────────────────────────────────────────────────────────────────
const generateBasicInvoicePdf = async (invoiceId, userId) => {
  const inv = await Invoice.findByPk(invoiceId, {
    include: [
      { model: InvoiceItem, as: 'items', separate: true, order: [['itemOrder', 'ASC']] },
      { model: Shop, as: 'shop' },
    ],
  });
  if (!inv) throw new Error('Invoice not found');
  await verifyAccess(inv.shopId, userId);

  const doc    = new PDFDocument({ size: [PW, PH], margin: 0 });
  const chunks = [];
  doc.on('data', c => chunks.push(c));

  const shop = inv.shop;
  let   page = 1;

  drawPageBorder(doc);
  drawFooter(doc, shop?.shopName, page);

  let y = drawHeader(doc, shop);
  y = drawDocTitle(doc, y + 2, 'ESTIMATE') + 2;

  y = drawInfoSection(doc, y,
    { title: 'Estimate For',
      lines: [inv.customerName || '', inv.customerMobile ? `Mobile: ${inv.customerMobile}` : null, inv.customerAddress || null] },
    { title: 'Estimate Details',
      lines: [`Estimate No.: ${inv.invoiceNumber || ''}`, `Date: ${fmtDate(inv.invoiceDate)}`] }
  ) + 4;

  const { nextY, totalAmt, totalQty, totalRft, page: pg } =
    renderItems(doc, inv.items, shop, 'ESTIMATE', inv.invoiceNumber, fmtDate(inv.invoiceDate), page, y);
  y = nextY + 4;
  page = pg;

  const sub   = parseFloat(inv.subtotal || 0) || totalAmt - totalRft;
  const inst  = parseFloat(inv.installationCharge || 0);
  const trns  = parseFloat(inv.transportCharge || 0);
  const disc  = parseFloat(inv.discount || 0);
  const gstV  = parseFloat(inv.gstAmount || 0);
  const grand = parseFloat(inv.grandTotal || 0) || (sub + totalRft + inst + trns - disc + gstV);

  const sumRows = [{ label: 'Sub Total', value: rupee(sub) }];
  if (totalRft > 0) sumRows.push({ label: 'Running Ft', value: rupee(totalRft) });
  if (inst > 0) sumRows.push({ label: 'Installation', value: rupee(inst) });
  if (trns > 0) sumRows.push({ label: 'Transport',    value: rupee(trns) });
  if (disc > 0) sumRows.push({ label: 'Discount',     value: `(${rupee(disc)})` });
  if (inv.billingType === 'GST' && gstV > 0)
    sumRows.push({ label: `GST @ ${inv.gstPercentage || 0}%`, value: rupee(gstV) });
  sumRows.push({ label: 'Total', value: rupee(grand), grand: true });

  y = drawAmountSection(doc, y, grand, sumRows, 'Estimate order') + 4;
  const remaining = PH - MB - y - 4;
  drawTermsAndSignature(doc, y, shop?.shopName, null, remaining);

  return finalize(doc, chunks);
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. DELIVERY CHALLAN
// ─────────────────────────────────────────────────────────────────────────────
const generateChallanPdf = async (invoiceId, userId) => {
  const inv = await Invoice.findByPk(invoiceId, {
    include: [
      { model: InvoiceItem, as: 'items', separate: true, order: [['itemOrder', 'ASC']] },
      { model: Shop, as: 'shop' },
    ],
  });
  if (!inv) throw new Error('Invoice not found');
  await verifyAccess(inv.shopId, userId);

  const doc    = new PDFDocument({ size: [PW, PH], margin: 0 });
  const chunks = [];
  doc.on('data', c => chunks.push(c));

  const shop = inv.shop;
  let   page = 1;

  drawPageBorder(doc);
  drawFooter(doc, shop?.shopName, page);

  let y = drawHeader(doc, shop);
  y = drawDocTitle(doc, y + 2, 'DELIVERY CHALLAN') + 2;

  y = drawInfoSection(doc, y,
    { title: 'Deliver To',
      lines: [inv.customerName || '', inv.customerMobile ? `Mobile: ${inv.customerMobile}` : null,
              inv.customerAddress || null, inv.shippingAddress ? `Site: ${inv.shippingAddress}` : null] },
    { title: 'Dispatch Details',
      lines: [`Challan No.: ${inv.invoiceNumber || ''}`, `Date: ${fmtDate(inv.invoiceDate)}`,
              'Vehicle No.: ____________________', 'Driver Name: ___________________',
              'Dispatch Date: _________________'] }
  ) + 4;

  // Challan item columns (no prices)
  const cCols = [
    { label: '#',                w: 24,  align: 'center' },
    { label: 'Item Description', w: 200, align: 'left'   },
    { label: 'Thickness',        w: 58,  align: 'center' },
    { label: 'Size (H × W)',     w: 115, align: 'center' },
    { label: 'Qty',              w: 42,  align: 'center' },
    { label: 'Remarks',          w: 100, align: 'left'   },
  ];
  let ccx = 0;
  cCols.forEach(c => { c.x = ccx; ccx += c.w; });

  // Table header
  const TH = 19;
  doc.rect(LX, y, CW, TH).fill(ORANGE);
  doc.rect(LX, y, CW, TH).strokeColor(BORDER).lineWidth(0.6).stroke();
  doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE);
  cCols.forEach((c, i) => {
    if (i > 0) doc.moveTo(LX + c.x, y).lineTo(LX + c.x, y + TH).strokeColor(WHITE).lineWidth(0.4).stroke();
    doc.text(c.label.toUpperCase(), LX + c.x + 3, y + 5, { width: c.w - 6, align: c.align, lineBreak: false });
  });
  y += TH;

  let totalPieces = 0;
  (inv.items || []).forEach((item, idx) => {
    if (y > PH - MB - 100) return;
    const pd = parsePolishData(item.description);
    let hD = fmtDim(item.height), wD = fmtDim(item.width);
    if (pd && !pd.sizeInMM) { if (pd.heightOriginal) hD = pd.heightOriginal; if (pd.widthOriginal) wD = pd.widthOriginal; }
    const unit = item.heightUnit || 'FEET';
    const hU   = unit === 'INCH' ? '"' : unit === 'MM' ? 'mm' : "'";
    const size = `${hD}${hU} x ${wD}${hU}`;
    const thk  = item.thickness ? String(item.thickness).replace(/mm/i,'').trim()+'MM' : '–';
    let remarks = '';
    if (pd?.itemPolish) remarks = `Polish: ${pd.itemPolish}`;
    if (pd?.polishSelection) {
      const sel = pd.polishSelection.filter(s => s.checked && s.type);
      if (sel.length) remarks += (remarks ? ' | ' : '') + sel.map(s => `${s.side.split('(')[0].trim()}=${s.type}`).join(' ');
    }
    const gl    = itemName(item);
    const rmkH  = remarks ? doc.heightOfString(remarks, { width: cCols[5].w - 6, fontSize: 8 }) : 0;
    const rH    = Math.max(20, rmkH + 12);
    const isAlt = idx % 2 === 1;

    if (isAlt) doc.rect(LX, y, CW, rH).fill(ZEBRA);
    const vals = [idx + 1, gl, thk, size, String(item.quantity || ''), remarks || '–'];
    doc.fontSize(8.5).font('Helvetica').fillColor(DARK);
    cCols.forEach((c, i) => {
      if (i > 0) doc.moveTo(LX + c.x, y).lineTo(LX + c.x, y + rH).strokeColor(BORDER).lineWidth(0.3).stroke();
      doc.text(vals[i], LX + c.x + 3, y + 5, { width: c.w - 6, align: c.align, lineBreak: false });
    });
    doc.moveTo(LX, y).lineTo(LX, y + rH).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.moveTo(RX, y).lineTo(RX, y + rH).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.moveTo(LX, y + rH).lineTo(RX, y + rH).strokeColor(BORDER).lineWidth(0.4).stroke();
    totalPieces += parseFloat(item.quantity || 0);
    y += rH;
  });

  // Total row
  const totVals = ['', `Total Items: ${(inv.items || []).length}`, '', '', String(Math.round(totalPieces)), ''];
  doc.rect(LX, y, CW, 20).fill(ORANGE);
  doc.rect(LX, y, CW, 20).strokeColor(BORDER).lineWidth(0.6).stroke();
  cCols.forEach((c, i) => {
    if (i > 0) doc.moveTo(LX + c.x, y).lineTo(LX + c.x, y + 20).strokeColor(WHITE).lineWidth(0.3).stroke();
    if (totVals[i]) {
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(WHITE)
         .text(totVals[i], LX + c.x + 3, y + 5, { width: c.w - 6, align: c.align, lineBreak: false });
    }
  });
  y += 20 + 8;

  // Delivery note box
  if (y < PH - MB - 80) {
    doc.rect(LX, y, CW, 24).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(DARK).text('DELIVERY NOTE', LX + 6, y + 4);
    doc.fontSize(8).font('Helvetica').fillColor(GRAY)
       .text('Goods must be inspected upon receipt. Report any damage or shortage within 24 hours.', LX + 6, y + 13, { width: CW - 12 });
    y += 28;
  }

  y += 6;
  // Three signature boxes: Dispatched By | Received By | Date & Stamp
  const sigLabels = ['Dispatched By', 'Received By (Customer)', 'Date & Stamp'];
  const sW = Math.floor((CW - 8 * (sigLabels.length - 1)) / sigLabels.length);
  const sH = Math.min(60, PH - MB - y - 8);
  if (sH > 20) {
    sigLabels.forEach((lbl, i) => {
      const sx = LX + i * (sW + 8);
      doc.rect(sx, y, sW, sH).strokeColor(BORDER).lineWidth(0.5).stroke();
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(DARK)
         .text(lbl.toUpperCase(), sx + 5, y + 5, { width: sW - 10, lineBreak: false });
      doc.moveTo(sx + 6, y + sH - 14).lineTo(sx + sW - 6, y + sH - 14)
         .strokeColor(BORDER).lineWidth(0.4).stroke();
      doc.fontSize(7).font('Helvetica').fillColor(LGRAY)
         .text('Signature', sx + 5, y + sH - 10, { width: sW - 10 });
    });
  }

  return finalize(doc, chunks);
};

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  generateQuotationPdf,
  generateCuttingPadPrintPdf,
  generateInvoicePdf,
  generateBasicInvoicePdf,
  generateChallanPdf,
};
