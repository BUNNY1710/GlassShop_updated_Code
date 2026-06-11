const { AuditLog } = require('../models');

// Central activity/audit logger. One row per successful action feeds BOTH the
// Audit Log and the per-staff Activities view. Best-effort: a logging failure
// must never break the underlying action.
//
//   logActivity(req, { action, details, shopId, glassType, height, width, unit,
//                      standNo, quantity, fromStand, toStand })
async function logActivity(req, fields = {}) {
  try {
    await AuditLog.create({
      username: req?.user?.username || null,
      role: req?.user?.role || 'ROLE_STAFF',
      quantity: 0,
      timestamp: new Date(),
      ...fields,
    });
  } catch (e) {
    console.error('⚠️  activity log failed:', e.message);
  }
}

module.exports = { logActivity };
