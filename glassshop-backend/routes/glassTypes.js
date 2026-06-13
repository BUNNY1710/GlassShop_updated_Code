const express = require('express');
const router = express.Router();
const { sequelize, GlassType, User, Shop, AuditLog } = require('../models');
const { Op, QueryTypes } = require('sequelize');
const { requireStaff, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

// Any staff/admin can READ glass types (dropdowns everywhere need this).
// Mutations are gated per-permission below — staff need EDIT_GLASS_TYPE /
// DELETE_GLASS_TYPE granted by an admin; admins bypass (hold all permissions).
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
    res.json(types.map(t => ({
      id: t.id, name: t.name, isActive: t.isActive,
      lowStockEnabled: t.lowStockEnabled, lowStockThreshold: t.lowStockThreshold,
    })));
  } catch (error) {
    console.error('Error listing glass types:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to load glass types' });
  }
});

// GET /api/glass-types/alerts — per-type stock status (current vs threshold).
// Readable by any staff/admin (view). Threshold falls back to the shop global.
router.get('/alerts', async (req, res) => {
  try {
    const username = req.user?.username;
    const user = await User.findOne({ where: { userName: username }, include: [{ model: Shop, as: 'shop' }] });
    if (!user || !user.shopId) return res.status(404).json({ success: false, message: 'User not linked to a shop' });
    const shopId = user.shopId;
    const globalThreshold = user.shop?.lowStockThreshold ?? 5;

    const types = await GlassType.findAll({ where: { shopId, isActive: true, deletedAt: null }, order: [['name', 'ASC']] });

    // Current stock per glass type (sum of quantities).
    const rows = await sequelize.query(`
      SELECT g.type AS name, COALESCE(SUM(s.quantity),0)::int AS qty
      FROM stock s JOIN glass g ON g.id = s.glass_id
      WHERE s.shop_id = :shopId
      GROUP BY g.type`, { replacements: { shopId }, type: QueryTypes.SELECT });
    const stockByName = {};
    rows.forEach(r => { stockByName[r.name] = r.qty; });

    const alerts = types.map(t => {
      const currentStock = stockByName[t.name] || 0;
      const threshold = (t.lowStockThreshold != null) ? t.lowStockThreshold : globalThreshold;
      let status = 'SAFE';
      if (currentStock === 0) status = 'OUT';
      else if (t.lowStockEnabled && currentStock < threshold) status = 'LOW';
      return {
        id: t.id, name: t.name, currentStock, threshold,
        enabled: t.lowStockEnabled, status,
        shortage: status === 'SAFE' ? 0 : Math.max(0, threshold - currentStock),
      };
    });

    res.json({ globalThreshold, alerts });
  } catch (error) {
    console.error('Error computing stock alerts:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to load alerts' });
  }
});

// PATCH /api/glass-types/:id/alert — set per-type low-stock config (admin/owner).
router.patch('/:id/alert', requirePermission('EDIT_GLASS_TYPE'), async (req, res) => {
  try {
    const shopId = await getShopId(req, res);
    if (shopId === null) return;
    const type = await GlassType.findOne({ where: { id: req.params.id, shopId } });
    if (!type) return res.status(404).json({ success: false, message: 'Glass type not found' });

    const oldThreshold = type.lowStockThreshold;
    const oldEnabled = type.lowStockEnabled;

    if (req.body.enabled !== undefined) type.lowStockEnabled = !!req.body.enabled;
    if (req.body.threshold !== undefined) {
      if (req.body.threshold === null || req.body.threshold === '') {
        type.lowStockThreshold = null;
      } else {
        const v = parseInt(req.body.threshold, 10);
        if (!Number.isInteger(v) || v < 0 || v > 99999) {
          return res.status(400).json({ success: false, message: 'Threshold must be between 0 and 99999' });
        }
        type.lowStockThreshold = v;
      }
    }
    await type.save();

    const changes = [];
    if (oldThreshold !== type.lowStockThreshold) changes.push(`threshold ${oldThreshold ?? 'default'} → ${type.lowStockThreshold ?? 'default'}`);
    if (oldEnabled !== type.lowStockEnabled) changes.push(`alert ${type.lowStockEnabled ? 'enabled' : 'disabled'}`);
    await logActivity(req, {
      action: 'UPDATE_STOCK_ALERT', shopId, glassType: type.name,
      details: `Low-stock alert for “${type.name}”${changes.length ? ': ' + changes.join('; ') : ' updated'}`,
    });

    res.json({ success: true, id: type.id, name: type.name, lowStockEnabled: type.lowStockEnabled, lowStockThreshold: type.lowStockThreshold });
  } catch (error) {
    console.error('Error updating alert config:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update alert' });
  }
});

// POST /api/glass-types — add a glass type. { name }
router.post('/', requirePermission('EDIT_GLASS_TYPE'), async (req, res) => {
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
    await logActivity(req, { action: 'ADD_GLASS_TYPE', shopId, glassType: created.name, details: `Added Glass Type “${created.name}”` });
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
router.put('/:id', requirePermission('EDIT_GLASS_TYPE'), async (req, res) => {
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
    await logActivity(req, { action: 'EDIT_GLASS_TYPE', shopId, glassType: type.name, details: oldName !== newName ? `Renamed Glass Type “${oldName}” → “${newName}”` : `Edited Glass Type “${type.name}”` });
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
router.delete('/:id', requirePermission('DELETE_GLASS_TYPE'), async (req, res) => {
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

    await t.commit();
    // Single audit/activity entry (logActivity writes the one audit_log row).
    await logActivity(req, { action: 'DELETE_GLASS_TYPE', shopId, glassType: type.name, quantity: usage, details: `Deleted Glass Type “${type.name}”` });
    res.json({ success: true, id: type.id, name: type.name, message: 'Glass type deleted' });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting glass type:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete glass type' });
  }
});

// POST /api/glass-types/:id/restore — undo a soft delete.
router.post('/:id/restore', requirePermission('DELETE_GLASS_TYPE'), async (req, res) => {
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

    await t.commit();
    // Single audit/activity entry.
    await logActivity(req, { action: 'RESTORE_GLASS_TYPE', shopId, glassType: type.name, details: `Restored Glass Type “${type.name}”` });
    res.json({ success: true, id: type.id, name: type.name, message: 'Glass type restored' });
  } catch (error) {
    await t.rollback();
    console.error('Error restoring glass type:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to restore glass type' });
  }
});

module.exports = router;
