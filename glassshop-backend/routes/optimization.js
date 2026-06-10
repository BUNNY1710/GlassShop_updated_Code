const express = require('express');
const router = express.Router();
const {
  sequelize, Stock, Glass, Quotation, AuditLog, User, Shop,
  OptimizationConfirmation, InventoryMovement
} = require('../models');
const { requireAnyPermission } = require('../middleware/auth');

// Confirming a plan consumes inventory, so allow anyone who can run optimization
// or edit stock (admin bypasses).
router.use(requireAnyPermission('RUN_OPTIMIZATION', 'VIEW_OPTIMIZATION', 'VIEW_PLANS', 'MANAGE_REMNANTS', 'ADD_STOCK', 'EDIT_STOCK'));

async function getShop(req, res) {
  const user = await User.findOne({
    where: { userName: req.user.username },
    include: [{ model: Shop, as: 'shop' }]
  });
  if (!user || !user.shopId) {
    res.status(404).json({ success: false, message: 'User not linked to a shop' });
    return null;
  }
  return user;
}

// POST /api/optimization/confirm
// Body: { planRef, sheets:[{stockId,count}], remnants:[{glassType,thickness,unit,width,height,standNo}],
//         orders:[quotationId], summary:{} }
router.post('/confirm', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const user = await getShop(req, res);
    if (!user) { await t.rollback(); return; }
    const shopId = user.shopId;

    const { planRef, sheets = [], remnants = [], orders = [], summary = {} } = req.body;
    if (!planRef) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'planRef is required' });
    }

    // Idempotency — same plan cannot be confirmed twice.
    const existing = await OptimizationConfirmation.findOne({ where: { planRef }, transaction: t });
    if (existing) {
      await t.rollback();
      return res.status(409).json({ success: false, alreadyConfirmed: true, message: 'This cutting plan has already been confirmed.' });
    }

    let sheetsConsumed = 0;
    const movements = [];

    // ── Step 1: deduct consumed sheets ──
    for (const s of sheets) {
      const count = Math.max(0, parseInt(s.count, 10) || 0);
      if (!s.stockId || count === 0) continue;
      const stock = await Stock.findOne({ where: { id: s.stockId, shopId }, transaction: t });
      if (!stock) continue;
      const glass = await Glass.findByPk(stock.glassId, { transaction: t });
      const newQty = Math.max(0, (stock.quantity || 0) - count);
      stock.quantity = newQty;
      await stock.save({ transaction: t });
      sheetsConsumed += count;
      movements.push({
        shopId, stockId: stock.id, glassType: glass?.type || null, thickness: glass?.thickness || null,
        standNo: stock.standNo, quantity: count, movementType: 'OUT',
        reason: 'Optimization sheets consumed', username: user.userName
      });
    }

    // ── Step 2: create remnant stock entries ──
    let remnantsCreated = 0;
    for (const r of remnants) {
      const w = parseFloat(r.width), h = parseFloat(r.height);
      const standNo = parseInt(r.standNo, 10);
      if (!w || !h || !Number.isInteger(standNo) || standNo < 1) continue;
      const unit = (r.unit || 'MM').toUpperCase();
      const thickness = parseFloat(r.thickness) || null;

      let glass = await Glass.findOne({ where: { type: r.glassType, thickness, unit }, transaction: t });
      if (!glass) {
        glass = await Glass.create({ type: r.glassType, thickness, unit }, { transaction: t });
      }

      // Merge into an existing matching remnant on the same stand, else create.
      let stock = await Stock.findOne({
        where: { glassId: glass.id, standNo, shopId, height: String(h), width: String(w) },
        transaction: t
      });
      if (stock) {
        stock.quantity = (stock.quantity || 0) + 1;
        await stock.save({ transaction: t });
      } else {
        stock = await Stock.create({
          glassId: glass.id, standNo, shopId,
          height: String(h), width: String(w),
          quantity: 1, minQuantity: 0, status: 'APPROVED'
        }, { transaction: t });
      }
      remnantsCreated += 1;
      movements.push({
        shopId, stockId: stock.id, glassType: r.glassType, thickness,
        standNo, quantity: 1, movementType: 'IN',
        reason: 'Optimization Remnant', username: user.userName
      });
    }

    // ── Step 3: update order status ──
    const orderIds = [...new Set(orders.map(o => parseInt(o, 10)).filter(Boolean))];
    if (orderIds.length) {
      await Quotation.update(
        { status: 'CUT' },
        { where: { id: orderIds, shopId }, transaction: t }
      );
    }

    // ── Step 5: confirmation record ──
    const confirmation = await OptimizationConfirmation.create({
      shopId, planRef, username: user.userName,
      sheetsConsumed, remnantsCreated,
      ordersIncluded: JSON.stringify(orderIds),
      details: JSON.stringify({ summary, sheets, remnants: remnants.length })
    }, { transaction: t });

    // Inventory movements (audit trail) + a summary audit log row.
    for (const m of movements) {
      await InventoryMovement.create({ ...m, refId: confirmation.id }, { transaction: t });
    }
    await AuditLog.create({
      username: user.userName, role: user.role, action: 'OPTIMIZE_CONFIRM',
      quantity: sheetsConsumed, shopId, timestamp: new Date()
    }, { transaction: t });

    await t.commit();
    res.json({
      success: true,
      confirmationId: confirmation.id,
      sheetsConsumed, remnantsCreated,
      ordersUpdated: orderIds.length
    });
  } catch (error) {
    await t.rollback();
    console.error('Error confirming optimization plan:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to confirm cutting plan' });
  }
});

module.exports = router;
