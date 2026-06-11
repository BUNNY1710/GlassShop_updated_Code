const { User } = require('../models');
const { getUserPermissions } = require('./auth');

// Cost/profit data is derived from purchasePrice. Strip it from API responses
// for users who lack a financial permission, so staff never receive cost data
// (and therefore cannot compute profit/margin/inventory-valuation client-side).
const COST_FIELDS = new Set(['purchasePrice', 'purchase_price']);

function deepStrip(value) {
  if (Array.isArray(value)) return value.map(deepStrip);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) {
      if (COST_FIELDS.has(k)) continue;
      out[k] = deepStrip(value[k]);
    }
    return out;
  }
  return value;
}

// Applied AFTER authMiddleware on cost-exposing routers (stock, quotations,
// invoices). Admins and users with VIEW_PURCHASE_PRICE / VIEW_INVENTORY_COST
// pass through untouched.
module.exports = async function financialFilter(req, res, next) {
  try {
    if (!req.user) return next();
    const role = (req.user.role || '').replace('ROLE_', '').toUpperCase();
    if (role === 'ADMIN') return next();

    const user = await User.findOne({ where: { userName: req.user.username } });
    const perms = await getUserPermissions(user);
    if (perms.includes('VIEW_PURCHASE_PRICE') || perms.includes('VIEW_INVENTORY_COST')) return next();

    // No cost access → strip purchasePrice from every JSON response on this router.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try { return originalJson(deepStrip(JSON.parse(JSON.stringify(body)))); }
      catch { return originalJson(body); }
    };
    next();
  } catch {
    next(); // never block the request on a filter error
  }
};
