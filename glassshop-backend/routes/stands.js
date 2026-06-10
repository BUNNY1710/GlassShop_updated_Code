const express = require('express');
const router = express.Router();
const { Stand, Stock, User, Shop } = require('../models');
const { Op } = require('sequelize');
const { requireStaff, requireAdmin } = require('../middleware/auth');

// Staff and admin can read (for dropdowns); only admin mutates.
router.use(requireStaff);

async function getShopId(req, res) {
  const user = await User.findOne({ where: { userName: req.user.username }, include: [{ model: Shop, as: 'shop' }] });
  if (!user || !user.shopId) {
    res.status(404).json({ success: false, message: 'User not linked to a shop' });
    return null;
  }
  return user.shopId;
}

// Count stock rows currently stored on a stand number (for delete guard).
async function stockOnStand(shopId, standNumber) {
  return Stock.count({ where: { shopId, standNo: standNumber } });
}

// GET /api/stands  (?all=true to include inactive — admin page)
router.get('/', async (req, res) => {
  try {
    const shopId = await getShopId(req, res);
    if (shopId === null) return;
    const where = { shopId };
    if (req.query.all !== 'true') where.isActive = true;
    const stands = await Stand.findAll({ where, order: [['standNumber', 'ASC']] });
    res.json(stands.map(s => ({
      id: s.id, standNumber: s.standNumber, standName: s.standName,
      description: s.description, isActive: s.isActive
    })));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to load stands' });
  }
});

// POST /api/stands  { standNumber, standName, description }  (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const shopId = await getShopId(req, res);
    if (shopId === null) return;

    const standNumber = parseInt(req.body.standNumber, 10);
    if (!Number.isInteger(standNumber) || standNumber < 1) {
      return res.status(400).json({ success: false, message: 'Stand number must be greater than 0' });
    }
    const existing = await Stand.findOne({ where: { shopId, standNumber } });
    if (existing) {
      return res.status(409).json({ success: false, message: `Stand #${standNumber} already exists` });
    }
    const created = await Stand.create({
      shopId, standNumber,
      standName: (req.body.standName || '').trim() || null,
      description: (req.body.description || '').trim() || null,
      isActive: true
    });
    res.status(201).json({ success: true, id: created.id, standNumber: created.standNumber });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Stand already exists' });
    }
    res.status(500).json({ success: false, message: error.message || 'Failed to create stand' });
  }
});

// PUT /api/stands/:id  { standNumber?, standName?, description? }  (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const shopId = await getShopId(req, res);
    if (shopId === null) return;
    const stand = await Stand.findOne({ where: { id: req.params.id, shopId } });
    if (!stand) return res.status(404).json({ success: false, message: 'Stand not found' });

    if (req.body.standNumber != null) {
      const standNumber = parseInt(req.body.standNumber, 10);
      if (!Number.isInteger(standNumber) || standNumber < 1) {
        return res.status(400).json({ success: false, message: 'Stand number must be greater than 0' });
      }
      if (standNumber !== stand.standNumber) {
        const dup = await Stand.findOne({ where: { shopId, standNumber, id: { [Op.ne]: stand.id } } });
        if (dup) return res.status(409).json({ success: false, message: `Stand #${standNumber} already exists` });
        // Renumbering a stand that holds stock would orphan that stock.
        const used = await stockOnStand(shopId, stand.standNumber);
        if (used > 0) {
          return res.status(409).json({ success: false, message: 'Cannot renumber a stand that currently stores stock. Transfer the stock first.' });
        }
        stand.standNumber = standNumber;
      }
    }
    if (req.body.standName !== undefined)   stand.standName   = (req.body.standName || '').trim() || null;
    if (req.body.description !== undefined)  stand.description = (req.body.description || '').trim() || null;
    await stand.save();
    res.json({ success: true, id: stand.id, standNumber: stand.standNumber });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update stand' });
  }
});

// PATCH /api/stands/:id/active  { isActive }  (admin)
router.patch('/:id/active', requireAdmin, async (req, res) => {
  try {
    const shopId = await getShopId(req, res);
    if (shopId === null) return;
    const stand = await Stand.findOne({ where: { id: req.params.id, shopId } });
    if (!stand) return res.status(404).json({ success: false, message: 'Stand not found' });
    stand.isActive = !!req.body.isActive;
    await stand.save();
    res.json({ success: true, id: stand.id, isActive: stand.isActive });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update stand' });
  }
});

// DELETE /api/stands/:id  (admin) — blocked if the stand stores stock.
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const shopId = await getShopId(req, res);
    if (shopId === null) return;
    const stand = await Stand.findOne({ where: { id: req.params.id, shopId } });
    if (!stand) return res.status(404).json({ success: false, message: 'Stand not found' });

    const used = await stockOnStand(shopId, stand.standNumber);
    if (used > 0) {
      return res.status(409).json({
        success: false, hasStock: true,
        message: 'Cannot delete stand. Stock is currently stored in this stand.'
      });
    }
    await stand.destroy();
    res.json({ success: true, message: 'Stand deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete stand' });
  }
});

module.exports = router;
