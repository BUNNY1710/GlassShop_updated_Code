const express = require('express');
const router = express.Router();
const { sequelize, Stand, Stock, User, Shop, AuditLog, Glass } = require('../models');
const { Op } = require('sequelize');
const { requireStaff, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

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
    await logActivity(req, { action: 'ADD_STAND', shopId, standNo: created.standNumber, details: `Added Stand #${created.standNumber}${created.standName ? ' (' + created.standName + ')' : ''}` });
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
    await logActivity(req, { action: 'EDIT_STAND', shopId, standNo: stand.standNumber, details: `Edited Stand #${stand.standNumber}` });
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
    await logActivity(req, { action: stand.isActive ? 'EDIT_STAND' : 'DISABLE_STAND', shopId, standNo: stand.standNumber, details: `${stand.isActive ? 'Enabled' : 'Disabled'} Stand #${stand.standNumber}` });
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
    const sn = stand.standNumber;
    await stand.destroy();
    await logActivity(req, { action: 'DELETE_STAND', shopId, fromStand: sn, details: `Deleted empty Stand #${sn}` });
    res.json({ success: true, message: 'Stand deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete stand' });
  }
});

// GET /api/stands/:id/delete-info  (admin) — stock on this stand + candidate
// destination stands (active, excluding this one) with their current load.
router.get('/:id/delete-info', requireAdmin, async (req, res) => {
  try {
    const shopId = await getShopId(req, res);
    if (shopId === null) return;
    const stand = await Stand.findOne({ where: { id: req.params.id, shopId } });
    if (!stand) return res.status(404).json({ success: false, message: 'Stand not found' });

    const srcRows = await Stock.findAll({ where: { shopId, standNo: stand.standNumber } });
    const source = {
      standNumber: stand.standNumber,
      itemCount: srcRows.length,
      totalQty: srcRows.reduce((a, s) => a + (s.quantity || 0), 0),
    };

    const others = await Stand.findAll({
      where: { shopId, isActive: true, standNumber: { [Op.ne]: stand.standNumber } },
      order: [['standNumber', 'ASC']],
    });
    const targets = [];
    for (const st of others) {
      const rows = await Stock.findAll({ where: { shopId, standNo: st.standNumber } });
      targets.push({
        standNumber: st.standNumber, standName: st.standName,
        itemCount: rows.length, totalQty: rows.reduce((a, s) => a + (s.quantity || 0), 0),
      });
    }
    res.json({ source, targets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to load delete info' });
  }
});

// POST /api/stands/:id/transfer-and-delete  { toStandNumber }  (admin)
// Moves all stock off the stand (merging on collision), audits, then deletes it.
router.post('/:id/transfer-and-delete', requireAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const user = await User.findOne({ where: { userName: req.user.username } });
    if (!user || !user.shopId) { await t.rollback(); return res.status(404).json({ success: false, message: 'User not linked to a shop' }); }
    const shopId = user.shopId;

    const stand = await Stand.findOne({ where: { id: req.params.id, shopId }, transaction: t });
    if (!stand) { await t.rollback(); return res.status(404).json({ success: false, message: 'Stand not found' }); }

    const toStandNumber = parseInt(req.body.toStandNumber, 10);
    if (!Number.isInteger(toStandNumber) || toStandNumber < 1) {
      await t.rollback(); return res.status(400).json({ success: false, message: 'Please select a valid destination stand.' });
    }
    if (toStandNumber === stand.standNumber) {
      await t.rollback(); return res.status(400).json({ success: false, message: 'Cannot transfer to the same stand.' });
    }
    const target = await Stand.findOne({ where: { shopId, standNumber: toStandNumber, isActive: true }, transaction: t });
    if (!target) {
      await t.rollback(); return res.status(400).json({ success: false, message: `Destination Stand #${toStandNumber} is not an active stand.` });
    }

    // Move every stock row off the source stand, merging into a matching row on
    // the target (same glass + dimensions) so the unique index isn't violated.
    // Glass is loaded so we can record what was transferred on the audit row.
    const sourceStock = await Stock.findAll({
      where: { shopId, standNo: stand.standNumber },
      include: [{ model: Glass, as: 'glass' }],
      transaction: t,
    });
    let moved = 0, qtyMoved = 0;
    const distinct = new Map(); // type|h|w|unit -> { type, height, width, unit, qty }
    for (const s of sourceStock) {
      qtyMoved += (s.quantity || 0);
      const g = s.glass;
      const key = `${g?.type || ''}|${s.height || ''}|${s.width || ''}|${(g?.unit || 'MM')}`;
      if (!distinct.has(key)) distinct.set(key, { type: g?.type || '', height: s.height, width: s.width, unit: (g?.unit || 'MM'), qty: 0 });
      distinct.get(key).qty += (s.quantity || 0);

      const match = await Stock.findOne({
        where: { shopId, standNo: toStandNumber, glassId: s.glassId, height: s.height, width: s.width, id: { [Op.ne]: s.id } },
        transaction: t,
      });
      if (match) {
        match.quantity = (match.quantity || 0) + (s.quantity || 0);
        await match.save({ transaction: t });
        await s.destroy({ transaction: t });
      } else {
        s.standNo = toStandNumber;
        await s.save({ transaction: t });
      }
      moved += 1;
    }

    // Record glass/size on the audit row: full detail for a single glass type,
    // a compact "N Glass Types" summary when the stand held several.
    const items = [...distinct.values()];
    let auditGlass = {};
    if (items.length === 1) {
      const d = items[0];
      auditGlass = { glassType: d.type, height: d.height, width: d.width, unit: d.unit };
    } else if (items.length > 1) {
      auditGlass = { glassType: `${items.length} Glass Types` };
    }

    // Audit + delete stand.
    await AuditLog.create({
      ...auditGlass,
      username: user.userName, role: user.role, action: 'DELETE_STAND',
      fromStand: stand.standNumber, toStand: toStandNumber,
      quantity: qtyMoved, shopId, timestamp: new Date(),
    }, { transaction: t });

    await stand.destroy({ transaction: t });
    await t.commit();
    res.json({ success: true, moved, qtyMoved, from: stand.standNumber, to: toStandNumber });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message || 'Failed to transfer and delete stand' });
  }
});

module.exports = router;
