const express = require('express');
const router = express.Router();
const { Stock, Glass, StockHistory, User, Shop, AuditLog, GlassPriceMaster, Stand } = require('../models');
const { Op } = require('sequelize');
const { requireStaff, requirePermission, requireAnyPermission, getUserPermissions } = require('../middleware/auth');

// Stock data is consumed by several modules (optimization, transfers,
// dashboard). Allow read access to anyone who can view a consuming page so a
// visible page never 403s. Mutating endpoints below add a strict per-action
// permission. Admin bypasses everything.
router.use(requireStaff);
router.use(requireAnyPermission(
  'VIEW_STOCK', 'ADD_STOCK', 'EDIT_STOCK', 'DELETE_STOCK',
  'VIEW_TRANSFER', 'CREATE_TRANSFER', 'APPROVE_TRANSFER',
  'VIEW_OPTIMIZATION', 'RUN_OPTIMIZATION', 'VIEW_PLANS',
  'VIEW_DASHBOARD'
));

// True if the stand number exists and is active for the shop. Lenient: if the
// shop has no stands defined yet, any number is allowed (avoids lockout).
async function isValidStand(shopId, standNumber) {
  const total = await Stand.count({ where: { shopId } });
  if (total === 0) return true;
  const row = await Stand.findOne({ where: { shopId, standNumber, isActive: true } });
  return !!row;
}

// Get all stock
router.get('/all', async (req, res) => {
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

    if (!user.shopId) {
      console.error(`User ${username} is not linked to a shop`);
      return res.status(404).json({ error: 'User not linked to a shop. Please contact administrator.' });
    }

    const stocks = await Stock.findAll({
      where: { shopId: user.shopId },
      include: [{ model: Glass, as: 'glass' }],
      attributes: { include: ['purchasePrice', 'sellingPrice'] }, // Ensure price fields are included
      order: [['standNo', 'ASC']] // numeric (stand_no is INTEGER) — warehouse-friendly default
    });

    res.json(stocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stock/thicknesses?glassType=Mirror
// Returns distinct numeric thickness values available for a glass type in this shop.
// Used by the quotation form to populate the thickness dropdown based on selected glass type.
router.get('/thicknesses', async (req, res) => {
  try {
    const { glassType } = req.query;
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });
    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const glassWhere = {};
    if (glassType) glassWhere.type = glassType;

    const stocks = await Stock.findAll({
      where: { shopId: user.shopId, quantity: { [Op.gt]: 0 } },
      include: [{ model: Glass, as: 'glass', where: Object.keys(glassWhere).length ? glassWhere : undefined, required: true }],
      attributes: [],
    });

    const thicknesses = [
      ...new Set(stocks.map(s => s.glass?.thickness).filter(t => t != null))
    ].sort((a, b) => a - b);

    res.json({ thicknesses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent stock activity
router.get('/recent', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const stocks = await Stock.findAll({
      where: { shopId: user.shopId },
      include: [{ model: Glass, as: 'glass' }],
      order: [['updatedAt', 'DESC']],
      limit: 3
    });

    const activities = stocks.map(stock => ({
      id: stock.id,
      glassType: stock.glass?.type || 'N/A',
      standNo: stock.standNo,
      quantity: stock.quantity,
      height: stock.height,
      width: stock.width,
      updatedAt: stock.updatedAt
    }));

    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update stock (add/remove)
router.post('/update', requirePermission('ADD_STOCK'), async (req, res) => {
  try {
    const { glassType, thickness, unit, standNo, quantity, action, height, width } = req.body;

    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json('❌ User not found or not linked to a shop');
    }

    // SECURITY: this single endpoint performs both ADD and REMOVE. The route
    // guard checks ADD_STOCK; a stock-reducing REMOVE additionally requires
    // EDIT_STOCK (admin bypasses — admins hold all permissions).
    if (action === 'REMOVE') {
      const role = (req.user.role || '').replace('ROLE_', '').toUpperCase();
      if (role !== 'ADMIN') {
        const perms = await getUserPermissions(user);
        if (!perms.includes('EDIT_STOCK')) {
          return res.status(403).json('❌ You do not have permission to remove stock');
        }
      }
    }

    // Validate inputs
    const standNoValue = Number(standNo);
    if (!Number.isInteger(standNoValue) || standNoValue < 1) {
      return res.status(400).json('❌ Stand number must be greater than 0');
    }
    if (!(await isValidStand(user.shopId, standNoValue))) {
      return res.status(400).json(`❌ Enter valid stand number. Stand #${standNoValue} does not exist`);
    }

    const quantityValue = Number(quantity);
    if (!Number.isInteger(quantityValue) || quantityValue < 1) {
      return res.status(400).json('❌ Enter valid quantity (must be greater than or equal to 1)');
    }

    if (!glassType) {
      return res.status(400).json('❌ Glass type is required');
    }

    if (!unit || !['MM', 'INCH', 'FEET'].includes(unit)) {
      return res.status(400).json('❌ Please select the unit');
    }

    const thicknessValue = parseFloat(thickness);
    if (isNaN(thicknessValue) || thicknessValue <= 0) {
      return res.status(400).json('❌ Valid thickness is required');
    }

    // Check Glass Price Master for prices
    let priceMaster = await GlassPriceMaster.findOne({
      where: {
        shopId: user.shopId,
        glassType,
        thickness: thicknessValue
      }
    });

    let purchasePrice = null;
    let sellingPrice = null;
    let stockStatus = 'PENDING';

    if (priceMaster) {
      if (!priceMaster.isPending && (priceMaster.purchasePrice || priceMaster.sellingPrice)) {
        // Prices exist in master and entry is approved, use them
        purchasePrice = priceMaster.purchasePrice;
        sellingPrice = priceMaster.sellingPrice;
        stockStatus = 'APPROVED';
      } else {
        // Entry exists but is pending (no prices), keep status as PENDING
        stockStatus = 'PENDING';
      }
    } else {
      // No entry in master, create one as pending
      priceMaster = await GlassPriceMaster.create({
        shopId: user.shopId,
        glassType,
        thickness: thicknessValue,
        purchasePrice: null,
        sellingPrice: null,
        isPending: true
      });
      stockStatus = 'PENDING';
    }

    // Find or create glass
    let glass = await Glass.findOne({
      where: {
        type: glassType,
        thickness: thicknessValue,
        unit: unit
      }
    });

    if (!glass) {
      glass = await Glass.create({
        type: glassType,
        thickness: thicknessValue,
        unit: unit
      });
    }

    // Find or create stock
    let stock = await Stock.findOne({
      where: {
        glassId: glass.id,
        standNo: standNo,
        shopId: user.shopId,
        height: height || null,
        width: width || null
      }
    });

    if (!stock) {
      // Create new stock with prices and status from Price Master
      stock = await Stock.create({
        glassId: glass.id,
        standNo: standNo,
        shopId: user.shopId,
        quantity: 0,
        minQuantity: 5,
        height: height,
        width: width,
        purchasePrice: purchasePrice,
        sellingPrice: sellingPrice,
        status: stockStatus
      });
    } else {
      // Update existing stock: always update prices and status from Price Master
      stock.purchasePrice = purchasePrice;
      stock.sellingPrice = sellingPrice;
      stock.status = stockStatus;
    }

    // Update quantity based on action
    if (action === 'ADD') {
      stock.quantity += quantity;
    } else if (action === 'REMOVE') {
      stock.quantity = Math.max(0, stock.quantity - quantity);
    }

    await stock.save();

    // Create stock history
    await StockHistory.create({
      glassId: glass.id,
      standNo: standNo,
      quantity: quantity,
      action: action,
      shopId: user.shopId
    });

    // Create audit log
    await AuditLog.create({
      username: user.userName,
      role: user.role,
      action: action,
      glassType: glassType,
      quantity: quantity,
      standNo: standNo,
      height: height,
      width: width,
      unit: unit,
      shopId: user.shopId,
      timestamp: new Date()
    });

    // Return string message as expected by frontend
    res.json(`✅ Stock ${action === 'ADD' ? 'added' : 'removed'} successfully`);
  } catch (error) {
    console.error('Error updating stock:', error);
    // Return error as string to match frontend expectation
    const errorMessage = error.response?.data?.error || error.message || 'Failed to update stock';
    res.status(500).json(`❌ ${errorMessage}`);
  }
});

// Edit stock (glass type, thickness, height, width, quantity)
router.post('/edit/:id', requirePermission('EDIT_STOCK'), async (req, res) => {
  try {
    const { glassType, thickness, height, width, quantity, unit } = req.body;
    const stockId = req.params.id;

    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json('❌ User not found or not linked to a shop');
    }

    const stock = await Stock.findOne({
      where: { id: stockId, shopId: user.shopId }
    });

    if (!stock) {
      return res.status(404).json('❌ Stock not found');
    }

    if (!glassType) {
      return res.status(400).json('❌ Glass type is required');
    }

    if (!unit || !['MM', 'INCH', 'FEET'].includes(unit)) {
      return res.status(400).json('❌ Please select the unit');
    }

    const thicknessValue = parseFloat(thickness);
    if (isNaN(thicknessValue) || thicknessValue <= 0) {
      return res.status(400).json('❌ Valid thickness is required');
    }

    if (quantity === undefined || quantity === null || parseInt(quantity) < 0) {
      return res.status(400).json('❌ Valid quantity is required');
    }

    // Find or create glass with the updated type/thickness/unit
    let glass = await Glass.findOne({
      where: { type: glassType, thickness: thicknessValue, unit: unit }
    });

    if (!glass) {
      glass = await Glass.create({ type: glassType, thickness: thicknessValue, unit: unit });
    }

    stock.glassId = glass.id;
    stock.height = height;
    stock.width = width;
    stock.quantity = parseInt(quantity);
    await stock.save();

    await AuditLog.create({
      username: user.userName,
      role: user.role,
      action: 'EDIT',
      glassType: glassType,
      quantity: parseInt(quantity),
      standNo: stock.standNo,
      height: height,
      width: width,
      unit: unit,
      shopId: user.shopId,
      timestamp: new Date()
    });

    res.json('✅ Stock updated successfully');
  } catch (error) {
    console.error('Error editing stock:', error);
    res.status(500).json(`❌ ${error.message || 'Failed to edit stock'}`);
  }
});

// Transfer stock
router.post('/transfer', requirePermission('CREATE_TRANSFER'), async (req, res) => {
  try {
    const { glassType, thickness, unit, fromStand, toStand, quantity, height, width } = req.body;

    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json('❌ User not found or not linked to a shop');
    }

    const fromStandValue = Number(fromStand);
    const toStandValue = Number(toStand);
    if (!Number.isInteger(fromStandValue) || fromStandValue < 1 ||
        !Number.isInteger(toStandValue) || toStandValue < 1) {
      return res.status(400).json('❌ Stand number must be greater than 0');
    }
    if (!(await isValidStand(user.shopId, toStandValue))) {
      return res.status(400).json(`❌ Enter valid stand number. Stand #${toStandValue} does not exist`);
    }

    const transferQty = Number(quantity);
    if (!Number.isInteger(transferQty) || transferQty < 1) {
      return res.status(400).json('❌ Enter valid quantity (must be greater than or equal to 1)');
    }

    const thicknessValue = parseFloat(thickness);
    if (isNaN(thicknessValue) || thicknessValue <= 0) {
      return res.status(400).json('❌ Valid thickness is required');
    }

    // Find or create glass
    let glass = await Glass.findOne({
      where: {
        type: glassType,
        thickness: thicknessValue,
        unit: unit || 'MM'
      }
    });

    if (!glass) {
      glass = await Glass.create({
        type: glassType,
        thickness: thicknessValue,
        unit: unit || 'MM'
      });
    }

    // Find source stock
    const sourceStock = await Stock.findOne({
      where: {
        glassId: glass.id,
        standNo: fromStand,
        shopId: user.shopId,
        height: height || null,
        width: width || null
      }
    });

    if (!sourceStock || sourceStock.quantity < quantity) {
      return res.status(400).json('❌ Insufficient stock in source stand');
    }

    // Check Glass Price Master for prices (for destination stock)
    let priceMaster = await GlassPriceMaster.findOne({
      where: {
        shopId: user.shopId,
        glassType,
        thickness: thicknessValue
      }
    });

    let purchasePrice = null;
    let sellingPrice = null;
    let stockStatus = 'PENDING';

    if (priceMaster) {
      if (!priceMaster.isPending && (priceMaster.purchasePrice || priceMaster.sellingPrice)) {
        // Prices exist in master and entry is approved, use them
        purchasePrice = priceMaster.purchasePrice;
        sellingPrice = priceMaster.sellingPrice;
        stockStatus = 'APPROVED';
      } else {
        // Entry exists but is pending (no prices), keep status as PENDING
        stockStatus = 'PENDING';
      }
    } else {
      // No entry in master, create one as pending
      priceMaster = await GlassPriceMaster.create({
        shopId: user.shopId,
        glassType,
        thickness: thicknessValue,
        purchasePrice: null,
        sellingPrice: null,
        isPending: true
      });
      stockStatus = 'PENDING';
    }

    // Find or create destination stock
    let destStock = await Stock.findOne({
      where: {
        glassId: glass.id,
        standNo: toStand,
        shopId: user.shopId,
        height: height || null,
        width: width || null
      }
    });

    if (!destStock) {
      destStock = await Stock.create({
        glassId: glass.id,
        standNo: toStand,
        shopId: user.shopId,
        quantity: 0,
        minQuantity: sourceStock.minQuantity,
        height: height,
        width: width,
        purchasePrice: purchasePrice,
        sellingPrice: sellingPrice,
        status: stockStatus
      });
    } else {
      // Update prices and status from Price Master for destination stock
      destStock.purchasePrice = purchasePrice;
      destStock.sellingPrice = sellingPrice;
      destStock.status = stockStatus;
    }

    // Transfer quantity
    sourceStock.quantity -= quantity;
    destStock.quantity += quantity;

    await sourceStock.save();
    await destStock.save();

    // Create audit log
    await AuditLog.create({
      username: user.userName,
      role: user.role,
      action: 'TRANSFER',
      glassType: glassType,
      quantity: quantity,
      fromStand: fromStand,
      toStand: toStand,
      height: height,
      width: width,
      unit: unit || 'MM',
      shopId: user.shopId,
      timestamp: new Date()
    });

    // Return string message as expected by frontend
    res.json('✅ Stock transferred successfully');
  } catch (error) {
    console.error('Error transferring stock:', error);
    // Return error as string to match frontend expectation
    const errorMessage = error.response?.data?.error || error.message || 'Transfer failed';
    res.status(500).json(`❌ ${errorMessage}`);
  }
});

// Update stock price
router.post('/update-price', requirePermission('EDIT_STOCK'), async (req, res) => {
  try {
    const { stockId, purchasePrice, sellingPrice } = req.body;

    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json('❌ User not found or not linked to a shop');
    }

    const stock = await Stock.findOne({
      where: {
        id: stockId,
        shopId: user.shopId
      }
    });

    if (!stock) {
      return res.status(404).json('❌ Stock not found');
    }

    if (purchasePrice !== null && purchasePrice !== undefined) {
      stock.purchasePrice = purchasePrice;
    }
    if (sellingPrice !== null && sellingPrice !== undefined) {
      stock.sellingPrice = sellingPrice;
    }

    await stock.save();

    res.json('✅ Price updated successfully');
  } catch (error) {
    console.error('Error updating stock price:', error);
    res.status(500).json(`❌ ${error.message || 'Failed to update price'}`);
  }
});

// Undo last action (simplified - just returns message)
router.post('/undo', async (req, res) => {
  res.json('✅ Undo functionality - implement based on your requirements');
});

// Low stock alerts
router.get('/alert/low', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const lowStocks = await Stock.findAll({
      where: {
        shopId: user.shopId,
        quantity: { [Op.lte]: { [Op.col]: 'Stock.min_quantity' } }
      },
      include: [{ model: Glass, as: 'glass' }]
    });

    res.json(lowStocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI explanations (simplified)
router.get('/ai/explain', async (req, res) => {
  res.json({ message: 'AI explanation service - implement based on your requirements' });
});

// Reorder suggestions (simplified)
router.get('/reorder/suggest', async (req, res) => {
  res.json({ message: 'Reorder suggestions - implement based on your requirements' });
});

module.exports = router;
