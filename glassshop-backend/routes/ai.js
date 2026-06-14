const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const { Stock, Glass, User, Shop } = require('../models');
const { logActivity } = require('../utils/activity');

// Apply admin-only middleware
router.use(requireAdmin);

// ── Waste analysis helpers ──────────────────────────────────────────────────
const DEFAULT_RATE = 100; // ₹/sqft fallback when a sheet has no selling price
function toFeet(val, unit) {
  const n = parseFloat(String(val ?? '').replace(/[^0-9.]/g, '')) || 0;
  const u = (unit || 'MM').toUpperCase();
  if (u === 'INCH' || u === 'IN') return n / 12;
  if (u === 'FEET' || u === 'FT') return n;
  return n / 304.8; // MM default
}
const sqft = (h, w, unit) => toFeet(h, unit) * toFeet(w, unit);
const round1 = (x) => Math.round(x * 10) / 10;
const rupees = (x) => Math.round(x);

// GET /api/ai/waste-analysis — data-driven waste + loss + recommendations.
// Waste proxy = optimization remnants currently on hand; loss valued at each
// remnant's selling price (₹/sqft) or a fallback rate.
router.get('/waste-analysis', async (req, res) => {
  try {
    const user = await User.findOne({ where: { userName: req.user.username } });
    if (!user || !user.shopId) return res.status(404).json({ error: 'User not linked to a shop' });
    const shopId = user.shopId;

    const remnants = await Stock.findAll({
      where: { shopId, source: 'Optimization Remnant' },
      include: [{ model: Glass, as: 'glass' }],
    });
    const allStock = await Stock.findAll({ where: { shopId }, include: [{ model: Glass, as: 'glass' }] });

    let wasteArea = 0, estLoss = 0, generated = 0, available = 0, reused = 0;
    const byType = {};   // type -> { waste, loss }
    const byMonth = {};  // YYYY-MM -> waste area

    for (const r of remnants) {
      generated += 1;
      const qty = r.quantity || 0;
      if (qty > 0) available += 1; else reused += 1; // qty 0 => consumed/reused
      const unit = r.glass?.unit || 'MM';
      const pieceArea = sqft(r.height, r.width, unit);
      const area = pieceArea * Math.max(qty, 0);
      const rate = Number(r.sellingPrice) > 0 ? Number(r.sellingPrice) : DEFAULT_RATE;
      const loss = area * rate;
      wasteArea += area; estLoss += loss;
      const type = r.glass?.type || 'Unknown';
      (byType[type] = byType[type] || { waste: 0, loss: 0 });
      byType[type].waste += area; byType[type].loss += loss;
      const m = (r.createdAt ? new Date(r.createdAt) : new Date()).toISOString().slice(0, 7);
      byMonth[m] = (byMonth[m] || 0) + area;
    }

    // Total glass on hand (used-area proxy) for waste percentage.
    let usedArea = 0;
    for (const s of allStock) usedArea += sqft(s.height, s.width, s.glass?.unit) * (s.quantity || 0);
    const wastePct = usedArea > 0 ? (wasteArea / usedArea) * 100 : 0;

    const topTypes = Object.entries(byType)
      .map(([type, v]) => ({ type, waste: round1(v.waste), loss: rupees(v.loss) }))
      .sort((a, b) => b.waste - a.waste);

    // Last 6 months trend (oldest → newest).
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      months.push({ month: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }), waste: round1(byMonth[key] || 0) });
    }
    const first = months[0].waste, last = months[months.length - 1].waste;
    const trendPct = first > 0 ? round1(((first - last) / first) * 100) : 0;

    // Rule-based recommendations + savings estimates.
    const recommendations = [];
    if (topTypes[0] && topTypes[0].waste > 0) {
      recommendations.push({
        text: `Switch ${topTypes[0].type} to a larger stock sheet — its offcuts drive the most waste.`,
        savings: rupees(topTypes[0].loss * 0.18),
      });
    }
    const reusableLoss = remnants.filter(r => (r.quantity || 0) > 0)
      .reduce((a, r) => a + sqft(r.height, r.width, r.glass?.unit) * (r.quantity || 0) * (Number(r.sellingPrice) > 0 ? Number(r.sellingPrice) : DEFAULT_RATE), 0);
    if (reusableLoss > 0) {
      recommendations.push({ text: 'Reuse on-hand remnants for small/custom orders before cutting fresh sheets.', savings: rupees(reusableLoss * 0.5) });
    }
    recommendations.push({ text: 'Group similar orders before running optimization to reduce cutting waste.', savings: 900 });

    const potentialSavings = recommendations.reduce((a, r) => a + (r.savings || 0), 0);

    const heat = topTypes.map(t => ({
      type: t.type, waste: t.waste, loss: t.loss,
      level: t.waste >= (topTypes[0]?.waste || 1) * 0.66 ? 'HIGH' : t.waste >= (topTypes[0]?.waste || 1) * 0.33 ? 'MEDIUM' : 'LOW',
    }));

    await logActivity(req, { action: 'AI_WASTE_ANALYSIS_GENERATED', shopId, details: 'Generated waste analysis report' });

    res.json({
      summary: {
        wasteArea: round1(wasteArea), estLoss: rupees(estLoss),
        usedArea: round1(usedArea), wastePct: round1(wastePct),
      },
      remnants: { generated, available, reused },
      topTypes, heat, trend: months, trendPct,
      recommendations, potentialSavings: rupees(potentialSavings),
      mostWastefulType: topTypes[0]?.type || null,
      bestType: topTypes.length ? topTypes[topTypes.length - 1].type : null,
    });
  } catch (error) {
    console.error('Waste analysis error:', error);
    res.status(500).json({ error: 'Failed to generate waste analysis' });
  }
});

// Ping endpoint
router.get('/ping', (req, res) => {
  res.json({ message: 'Node.js backend is working 👍' });
});

// Stock advice (placeholder)
router.get('/stock/advice', async (req, res) => {
  const { question } = req.query;
  res.json({ 
    message: 'AI stock advisor - implement based on your requirements',
    question 
  });
});

// Ask AI (placeholder)
router.post('/ask', async (req, res) => {
  const { action, glassType, site } = req.body;
  
  // Placeholder responses based on action
  let response = '';
  
  switch (action) {
    case 'LOW_STOCK':
      response = 'Low stock check - implement based on your requirements';
      break;
    case 'AVAILABLE':
      response = `Available stock for ${glassType} - implement based on your requirements`;
      break;
    case 'INSTALLED':
      response = `Installed glass at ${site} - implement based on your requirements`;
      break;
    case 'PREDICT':
      response = 'Demand prediction - implement based on your requirements';
      break;
    default:
      response = '❌ Invalid option selected';
  }
  
  res.json({ message: response });
});

module.exports = router;
