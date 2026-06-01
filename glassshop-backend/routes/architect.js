const express = require('express');
const router = express.Router();
const { Architect, Customer, Quotation, Invoice, User, Shop } = require('../models');
const { Op } = require('sequelize');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

const validateMobile = (mobile) => {
  if (!mobile || mobile.trim() === '') return 'Mobile number is required';
  const cleaned = mobile.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+91')) {
    const digits = cleaned.substring(3);
    if (digits.length === 10 && /^\d+$/.test(digits)) return null;
    return 'Mobile number with +91 must have 10 digits after country code';
  }
  if (/^\d+$/.test(cleaned) && cleaned.length === 10) return null;
  return 'Mobile number must be exactly 10 digits';
};

const getShopId = async (username) => {
  const user = await User.findOne({
    where: { userName: username },
    include: [{ model: Shop, as: 'shop' }],
  });
  return user?.shopId || null;
};

// ── Create ────────────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const shopId = await getShopId(req.user.username);
    if (!shopId) return res.status(404).json({ error: 'User not linked to a shop' });

    const { name, mobile, email, dob, address, city, state, pincode, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Architect name is required' });

    const mobileErr = validateMobile(mobile);
    if (mobileErr) return res.status(400).json({ error: mobileErr });

    if (email?.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        return res.status(400).json({ error: 'Invalid email format' });
    }

    const architect = await Architect.create({
      shopId, name: name.trim(), mobile: mobile.trim(),
      email: email?.trim() || null, dob: dob || null,
      address: address?.trim() || null, city: city?.trim() || null,
      state: state?.trim() || null, pincode: pincode?.trim() || null,
      notes: notes?.trim() || null,
    });

    res.status(201).json(architect);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── Get all ───────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const shopId = await getShopId(req.user.username);
    if (!shopId) return res.status(404).json({ error: 'User not linked to a shop' });

    const architects = await Architect.findAll({
      where: { shopId },
      order: [['createdAt', 'DESC']],
    });
    res.json(architects);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Search ────────────────────────────────────────────────────────────────────

router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query?.trim()) return res.status(400).json({ error: 'Search query is required' });

    const shopId = await getShopId(req.user.username);
    if (!shopId) return res.status(404).json({ error: 'User not linked to a shop' });

    const architects = await Architect.findAll({
      where: {
        shopId,
        [Op.or]: [
          { name:   { [Op.iLike]: `%${query.trim()}%` } },
          { mobile: { [Op.iLike]: `%${query.trim()}%` } },
          { email:  { [Op.iLike]: `%${query.trim()}%` } },
        ],
      },
      order: [['createdAt', 'DESC']],
    });
    res.json(architects);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Get single architect with full detail for dashboard ───────────────────────

router.get('/:id', async (req, res) => {
  try {
    const shopId = await getShopId(req.user.username);
    if (!shopId) return res.status(404).json({ error: 'User not linked to a shop' });

    const architectId = parseInt(req.params.id, 10);
    if (!architectId) return res.status(400).json({ error: 'Invalid architect ID' });

    const architect = await Architect.findOne({
      where: { id: architectId, shopId },
      include: [{
        model: Customer, as: 'referredCustomers',
        where: { shopId }, required: false,
        attributes: ['id', 'name', 'mobile', 'email', 'city', 'createdAt'],
      }],
    });
    if (!architect) return res.status(404).json({ error: 'Architect not found' });

    const customerIds = (architect.referredCustomers || []).map(c => c.id);
    let totalOrders = 0, totalRevenue = 0, totalQuotations = 0, approvedQuotations = 0;

    // Quotation stats
    const quotations = await Quotation.findAll({
      where: { shopId, referenceArchitectId: architectId },
      attributes: ['id', 'status', 'grandTotal'],
    });
    totalQuotations    = quotations.length;
    approvedQuotations = quotations.filter(q => q.status === 'CONFIRMED').length;
    const rejectedQuotations = quotations.filter(q => q.status === 'REJECTED').length;
    const draftQuotations    = quotations.filter(q => q.status === 'DRAFT').length;

    // Order stats
    const orders = await Invoice.findAll({
      where: { shopId, referenceArchitectId: architectId },
      attributes: ['id', 'grandTotal'],
    });
    totalOrders  = orders.length;
    totalRevenue = orders.reduce((s, inv) => s + parseFloat(inv.grandTotal || 0), 0);

    res.json({
      ...architect.toJSON(),
      stats: {
        totalCustomers:      customerIds.length,
        totalQuotations,
        approvedQuotations,
        rejectedQuotations,
        draftQuotations,
        conversionRate: totalQuotations > 0 ? Math.round((approvedQuotations / totalQuotations) * 100) : 0,
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Quotations tab ────────────────────────────────────────────────────────────

router.get('/:id/quotations', async (req, res) => {
  try {
    const shopId = await getShopId(req.user.username);
    if (!shopId) return res.status(404).json({ error: 'User not linked to a shop' });

    const architectId = parseInt(req.params.id, 10);
    if (!architectId) return res.status(400).json({ error: 'Invalid architect ID' });

    const { status, search } = req.query;
    const where = { shopId, referenceArchitectId: architectId };
    if (status && status !== 'ALL') where.status = status.toUpperCase();
    if (search?.trim()) {
      where[Op.or] = [
        { quotationNumber: { [Op.iLike]: `%${search.trim()}%` } },
        { customerName:    { [Op.iLike]: `%${search.trim()}%` } },
      ];
    }

    const quotations = await Quotation.findAll({
      where,
      attributes: ['id', 'quotationNumber', 'customerName', 'quotationDate', 'grandTotal', 'status', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json(quotations);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Orders tab ────────────────────────────────────────────────────────────────

router.get('/:id/orders', async (req, res) => {
  try {
    const shopId = await getShopId(req.user.username);
    if (!shopId) return res.status(404).json({ error: 'User not linked to a shop' });

    const architectId = parseInt(req.params.id, 10);
    if (!architectId) return res.status(400).json({ error: 'Invalid architect ID' });

    const { search } = req.query;
    const where = { shopId, referenceArchitectId: architectId };
    if (search?.trim()) {
      where[Op.or] = [
        { invoiceNumber: { [Op.iLike]: `%${search.trim()}%` } },
        { customerName:  { [Op.iLike]: `%${search.trim()}%` } },
      ];
    }

    const orders = await Invoice.findAll({
      where,
      attributes: ['id', 'invoiceNumber', 'customerName', 'invoiceDate', 'grandTotal', 'paymentStatus', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Update ────────────────────────────────────────────────────────────────────

router.put('/:id', async (req, res) => {
  try {
    const shopId = await getShopId(req.user.username);
    if (!shopId) return res.status(404).json({ error: 'User not linked to a shop' });

    const architect = await Architect.findOne({ where: { id: req.params.id, shopId } });
    if (!architect) return res.status(404).json({ error: 'Architect not found' });

    if (req.body.mobile !== undefined) {
      const mobileErr = validateMobile(req.body.mobile);
      if (mobileErr) return res.status(400).json({ error: mobileErr });
    }
    if (req.body.email?.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email.trim()))
        return res.status(400).json({ error: 'Invalid email format' });
    }

    await architect.update(req.body);
    res.json(architect);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── Delete ────────────────────────────────────────────────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    const shopId = await getShopId(req.user.username);
    if (!shopId) return res.status(404).json({ error: 'User not linked to a shop' });

    const architect = await Architect.findOne({ where: { id: req.params.id, shopId } });
    if (!architect) return res.status(404).json({ error: 'Architect not found' });

    const aId = parseInt(req.params.id, 10);
    await Customer.update({ referenceArchitectId: null },  { where: { referenceArchitectId: aId, shopId } });
    await Quotation.update({ referenceArchitectId: null }, { where: { referenceArchitectId: aId, shopId } });
    await Invoice.update(  { referenceArchitectId: null }, { where: { referenceArchitectId: aId, shopId } });
    await architect.destroy();
    res.status(204).send();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
