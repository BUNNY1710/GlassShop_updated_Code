'use strict';

const express = require('express');
const router  = express.Router();
const { Shop, User } = require('../models');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

// Helper — resolves shopId from the authenticated user
async function getShop(username) {
  const user = await User.findOne({ where: { userName: username } });
  if (!user?.shopId) return null;
  return Shop.findByPk(user.shopId);
}

// GET /api/settings
// Returns all configurable shop-level settings.
router.get('/', async (req, res) => {
  try {
    const shop = await getShop(req.user.username);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    res.json({
      lowStockThreshold: shop.lowStockThreshold ?? 5,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
// Updates one or more settings for the authenticated user's shop.
router.put('/', async (req, res) => {
  try {
    const { lowStockThreshold } = req.body;

    if (lowStockThreshold !== undefined) {
      const val = parseInt(lowStockThreshold, 10);
      if (isNaN(val) || val < 1 || val > 9999) {
        return res.status(400).json({ error: 'lowStockThreshold must be a number between 1 and 9999' });
      }
    }

    const shop = await getShop(req.user.username);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const updates = {};
    if (lowStockThreshold !== undefined) updates.lowStockThreshold = parseInt(lowStockThreshold, 10);

    await shop.update(updates);

    res.json({
      lowStockThreshold: shop.lowStockThreshold,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
