const express = require('express');
const router = express.Router();
const { sequelize, GlassType, User, Shop, AuditLog } = require('../models');
const { Op, QueryTypes } = require('sequelize');
const { requireStaff } = require('../middleware/auth');

// Staff and admin can read + manage glass types (the manager lives in Manage Stock).
router.use(requireStaff);

// Resolve the authenticated user's shop.
async function getShopId(req, res) {
  const username = req.user?.username;
  if (!username) {
    res.status(401).json({ success: false, message: 'Username not found in token' });
    return null;
  }
  const user = await User.findOne({
    where: { userName: username },
    include: [{ model: Shop, as: 'shop' }]
  });
  if (!user || !user.shopId) {
    res.status(404).json({ success: false, message: 'User not linked to a shop' });
    return null;
  }
  return user.shopId;
}

// Count how many existing records use a glass-type name within this shop.
// Glass is global (no shopId); Stock/QuotationItem/InvoiceItem reach the shop
// through their parents.
async function countUsage(shopId, name) {
  const repl = { shopId, name };
  const q = (sql) => sequelize.query(sql, { replacements: repl, type: QueryTypes.SELECT });

  const [stock] = await q(`
    SELECT COUNT(*)::int AS c FROM stock s
    JOIN glass g ON g.id = s.glass_id
    WHERE s.shop_id = :shopId AND g.type = :name`);
  const [qitems] = await q(`
    SELECT COUNT(*)::int AS c FROM quotation_items qi
    JOIN quotations q ON q.id = qi.quotation_id
    WHERE q.shop_id = :shopId AND qi.glass_type = :name`);
  const [iitems] = await q(`
    SELECT COUNT(*)::int AS c FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    WHERE i.shop_id = :shopId AND ii.glass_type = :name`);
  const [pm] = await q(`
    SELECT COUNT(*)::int AS c FROM glass_price_master
    WHERE shop_id = :shopId AND glass_type = :name`);

  return (stock.c || 0) + (qitems.c || 0) + (iitems.c || 0) + (pm.c || 0);
}

// Rewrite a glass-type string across every place it is denormalised, scoped to
// this shop (Glass is global so it is rewritten globally). Used by rename and
// by delete-with-replace.
async function cascadeRename(shopId, oldName, newName, t) {
  const repl = { shopId, oldName, newName };
  const run = (sql) => sequelize.query(sql, { replacements: repl, transaction: t });

  await run(`UPDATE glass SET type = :newName WHERE type = :oldName`);
  await run(`UPDATE glass_price_master SET glass_type = :newName WHERE shop_id = :shopId AND glass_type = :oldName`);
  await run(`UPDATE audit_log SET glass_type = :newName WHERE shop_id = :shopId AND glass_type = :oldName`);
  await run(`UPDATE quotation_items qi SET glass_type = :newName
             FROM quotations q
             WHERE qi.quotation_id = q.id AND q.shop_id = :shopId AND qi.glass_type = :oldName`);
  await run(`UPDATE invoice_items ii SET glass_type = :newName
             FROM invoices i
             WHERE ii.invoice_id = i.id AND i.shop_id = :shopId AND ii.glass_type = :oldName`);
}

// GET /api/glass-types — active glass types for this shop, alphabetical.
router.get('/', async (req, res) => {
  try {
    const shopId = await getShopId(req, res);
    if (shopId === null) return;
    const types = await GlassType.findAll({
      where: { shopId, isActive: true, deletedAt: null },
      order: [['name', 'ASC']]
    });
    res.json(types.map(t => ({ id: t.id, name: t.name, isActive: t.isActive })));
  } catch (error) {
    console.error('Error listing glass types:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to load glass types' });
  }
});

// POST /api/glass-types — add a glass type. { name }
router.post('/', async (req, res) => {
  try {
    const shopId = await getShopId(req, res);
    if (shopId === null) return;

    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, message: 'Glass type name cannot be empty' });
    }

    const existing = await GlassType.findOne({
      where: { shopId, name: { [Op.iLike]: name } }
    });
    if (existing) {
      // A soft-deleted type with this name → revive it (avoids unique collision).
      if (existing.deletedAt) {
        existing.deletedAt = null;
        existing.isActive = true;
        await existing.save();
        return res.status(201).json({ success: true, id: existing.id, name: existing.name });
      }
      return res.status(409).json({ success: false, message: 'Glass Type already exists' });
    }

    const created = await GlassType.create({ shopId, name, isActive: true });
    res.status(201).json({ success: true, id: created.id, name: created.name });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Glass Type already exists' });
    }
    console.error('Error creating glass type:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create glass type' });
  }
});

// PUT /api/glass-types/:id — rename a glass type and cascade to existing records.
router.put('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const shopId = await getShopId(req, res);
    if (shopId === null) { await t.rollback(); return; }

    const newName = (req.body.name || '').trim();
    if (!newName) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Glass type name cannot be empty' });
    }

    const type = await GlassType.findOne({ where: { id: req.params.id, shopId }, transaction: t });
    if (!type) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Glass type not found' });
    }

    if (newName.toLowerCase() !== type.name.toLowerCase()) {
      const dup = await GlassType.findOne({
        where: { shopId, name: { [Op.iLike]: newName }, id: { [Op.ne]: type.id } },
        transaction: t
      });
      if (dup) {
        await t.rollback();
        return res.status(409).json({ success: false, message: 'Glass Type already exists' });
      }
    }

    const oldName = type.name;
    type.name = newName;
    await type.save({ transaction: t });
    if (oldName !== newName) await cascadeRename(shopId, oldName, newName, t);

    await t.commit();
    res.json({ success: true, id: type.id, name: type.name });
  } catch (error) {
    await t.rollback();
    console.error('Error updating glass type:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update glass type' });
  }
});

// GET /api/glass-types/:id/delete-info — stock summary used by the delete modal.
router.get('/:id/delete-info', async (req, res) => {
  try {
    const shopId = await getShopId(req, res);
    if (shopId === null) return;
    const type = await GlassType.findOne({ where: { id: req.params.id, shopId } });
    if (!type) return res.status(404).json({ success: false, message: 'Glass type not found' });

    const repl = { shopId, name: type.name };
    const q = (sql) => sequelize.query(sql, { replacements: repl, type: QueryTypes.SELECT });

    const stands = await q(`
      SELECT s.stand_no AS "standNo", COUNT(*)::int AS items, COALESCE(SUM(s.quantity),0)::int AS qty
      FROM stock s JOIN glass g ON g.id = s.glass_id
      WHERE s.shop_id = :shopId AND g.type = :name AND s.quantity > 0
      GROUP BY s.stand_no ORDER BY s.stand_no`);
    const [orders] = await q(`
      SELECT COUNT(*)::int AS c FROM quotation_items qi
      JOIN quotations q ON q.id = qi.quotation_id
      WHERE q.shop_id = :shopId AND qi.glass_type = :name`);

    const totalSheets   = stands.reduce((a, s) => a + (s.items || 0), 0);
    const totalQuantity = stands.reduce((a, s) => a + (s.qty || 0), 0);

    res.json({
      name: type.name,
      totalSheets, totalQuantity,
      standCount: stands.length,
      stands,
      usedInOrders: orders.c || 0,
    });
  } catch (error) {
    console.error('Error loading glass-type delete info:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to load delete info' });
  }
});

// DELETE /api/glass-types/:id — SOFT delete (recoverable via Undo). Stock keeps
// its glass-type string; the type is just hidden from dropdowns.
router.delete('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const user = await User.findOne({ where: { userName: req.user.username } });
    if (!user || !user.shopId) { await t.rollback(); return res.status(404).json({ success: false, message: 'User not linked to a shop' }); }
    const shopId = user.shopId;

    const type = await GlassType.findOne({ where: { id: req.params.id, shopId }, transaction: t });
    if (!type) { await t.rollback(); return res.status(404).json({ success: false, message: 'Glass type not found' }); }

    const usage = await countUsage(shopId, type.name);
    type.deletedAt = new Date();
    type.isActive = false;
    await type.save({ transaction: t });

    await AuditLog.create({
      username: user.userName, role: user.role, action: 'DELETE_GLASS_TYPE',
      glassType: type.name, quantity: usage, shopId, timestamp: new Date(),
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, id: type.id, name: type.name, message: 'Glass type deleted' });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting glass type:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete glass type' });
  }
});

// POST /api/glass-types/:id/restore — undo a soft delete.
router.post('/:id/restore', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const user = await User.findOne({ where: { userName: req.user.username } });
    if (!user || !user.shopId) { await t.rollback(); return res.status(404).json({ success: false, message: 'User not linked to a shop' }); }
    const shopId = user.shopId;

    const type = await GlassType.findOne({ where: { id: req.params.id, shopId }, transaction: t });
    if (!type) { await t.rollback(); return res.status(404).json({ success: false, message: 'Glass type not found' }); }

    type.deletedAt = null;
    type.isActive = true;
    await type.save({ transaction: t });

    await AuditLog.create({
      username: user.userName, role: user.role, action: 'RESTORE_GLASS_TYPE',
      glassType: type.name, quantity: 0, shopId, timestamp: new Date(),
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, id: type.id, name: type.name, message: 'Glass type restored' });
  } catch (error) {
    await t.rollback();
    console.error('Error restoring glass type:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to restore glass type' });
  }
});

module.exports = router;
