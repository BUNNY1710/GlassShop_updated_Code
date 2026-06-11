const express = require('express');
const router = express.Router();
const { AuditLog, User, Shop } = require('../models');
const { Op } = require('sequelize');
const { requireAdmin, requireStaff } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

// Throttle the audit endpoints (per IP) to prevent log-scraping abuse.
router.use(rateLimit({ windowMs: 60_000, max: 120 }));

// Get recent audit logs (Admin only).
// Backward compatible: with no query params it returns the same array (≤100).
// Opt-in pagination via ?page=&size=&sort=asc|desc returns { data, page, size, total }.
router.get('/recent', requireAdmin, async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Username not found in token' });
    }

    const user = await User.findOne({
      where: { userName: username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user) {
      console.error(`User not found in database: ${username}`);
      return res.status(404).json({ error: `User not found: ${username}. Please register or log in again.` });
    }

    const order = [['timestamp', (req.query.sort || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC']];

    if (!user.shopId) {
      return res.json(req.query.page !== undefined ? { data: [], page: 1, size: 0, total: 0, totalPages: 0 } : []);
    }

    // Default (no ?page): unchanged array response, capped at 100.
    if (req.query.page === undefined) {
      const logs = await AuditLog.findAll({ where: { shopId: user.shopId }, order, limit: 100 });
      return res.json(logs || []);
    }

    // Opt-in pagination.
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(200, Math.max(1, parseInt(req.query.size, 10) || 50));
    const { rows, count } = await AuditLog.findAndCountAll({
      where: { shopId: user.shopId }, order, limit: size, offset: (page - 1) * size,
    });
    res.json({ data: rows, page, size, total: count, totalPages: Math.ceil(count / size) });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    // SECURITY: do not leak the stack trace to the client.
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get transfer count (Admin and Staff)
router.get('/transfer-count', requireStaff, async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Username not found in token' });
    }

    const user = await User.findOne({
      where: { userName: username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user) {
      console.error(`User not found in database: ${username}`);
      return res.status(404).json({ error: `User not found: ${username}. Please register or log in again.` });
    }

    // Return 0 if user doesn't have a shop
    if (!user.shopId) {
      return res.json({ count: 0 });
    }

    const count = await AuditLog.count({
      where: {
        shopId: user.shopId,
        action: 'TRANSFER'
      }
    });

    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Error fetching transfer count:', error);
    // Return 0 on error to prevent frontend crashes
    res.json({ count: 0 });
  }
});

module.exports = router;
