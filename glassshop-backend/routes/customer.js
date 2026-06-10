const express = require('express');
const router = express.Router();
const { Customer, Architect, User, Shop } = require('../models');
const { Op } = require('sequelize');
const { requirePermission } = require('../middleware/auth');

// Baseline: viewing customers requires VIEW_CUSTOMER (admin bypasses). Mutating
// endpoints add a stricter permission below.
router.use(requirePermission('VIEW_CUSTOMER'));

// Validate and normalize mobile number
const validateMobileNumber = (mobile) => {
  if (!mobile || mobile.trim() === "") {
    return null; // Mobile is optional, so empty is valid
  }
  
  // Remove spaces, dashes, and parentheses
  let cleaned = mobile.replace(/[\s\-\(\)]/g, "");
  
  // Remove leading zero if present (Indian mobile numbers sometimes have leading 0)
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  
  // Check if it starts with +91 (India country code)
  if (cleaned.startsWith("+91")) {
    const digits = cleaned.substring(3);
    if (digits.length === 10 && /^\d+$/.test(digits)) {
      return null; // Valid
    }
    return "Mobile number with +91 must have 10 digits after country code";
  }
  
  // Check if it's just digits (10 digits for Indian numbers)
  if (/^\d+$/.test(cleaned)) {
    if (cleaned.length === 10) {
      return null; // Valid
    }
    return `Mobile number must be exactly 10 digits (you entered ${cleaned.length} digits)`;
  }
  
  return "Mobile number must contain only digits (or +91 followed by 10 digits)";
};

// Create customer
router.post('/', requirePermission('ADD_CUSTOMER'), async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    // Validate and normalize mobile number
    const mobileError = validateMobileNumber(req.body.mobile);
    if (mobileError) {
      return res.status(400).json({ error: mobileError });
    }

    // Normalize mobile number (remove leading zero if present)
    let normalizedMobile = req.body.mobile?.trim();
    if (normalizedMobile) {
      let cleaned = normalizedMobile.replace(/[\s\-\(\)]/g, "");
      if (cleaned.length === 11 && cleaned.startsWith("0")) {
        cleaned = cleaned.substring(1);
      }
      if (cleaned.startsWith("+91")) {
        normalizedMobile = cleaned;
      } else {
        normalizedMobile = cleaned;
      }
    }

    const customer = await Customer.create({
      ...req.body,
      mobile: normalizedMobile || req.body.mobile,
      shopId: user.shopId,
      referenceArchitectId: req.body.referenceArchitectId
        ? parseInt(req.body.referenceArchitectId, 10)
        : null,
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all customers
router.get('/', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const customers = await Customer.findAll({
      where: { shopId: user.shopId },
      include: [{ model: Architect, as: 'referenceArchitect', required: false, attributes: ['id', 'name', 'mobile', 'email'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search customers - MUST be before /:id route
router.get('/search', async (req, res) => {
  try {
    console.log('🔍 [SEARCH] Search route hit, query:', req.query);
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const searchTerm = query.trim();
    console.log('🔍 [SEARCH] Searching for:', searchTerm);
    
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      console.error('❌ [SEARCH] User not found or no shopId');
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    console.log('🔍 [SEARCH] User found, shopId:', user.shopId);

    // Use Op.iLike for case-insensitive search (PostgreSQL supports this)
    const customers = await Customer.findAll({
      where: {
        shopId: user.shopId,
        [Op.or]: [
          { name: { [Op.iLike]: `%${searchTerm}%` } },
          { mobile: { [Op.iLike]: `%${searchTerm}%` } },
          { email: { [Op.iLike]: `%${searchTerm}%` } }
        ]
      },
      include: [{ model: Architect, as: 'referenceArchitect', required: false, attributes: ['id', 'name', 'mobile', 'email'] }],
      order: [['createdAt', 'DESC']]
    });

    console.log('✅ [SEARCH] Found', customers.length, 'customers');
    res.json(customers);
  } catch (error) {
    console.error('❌ [SEARCH] Search customers error:', error);
    console.error('❌ [SEARCH] Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const customer = await Customer.findOne({
      where: { id: req.params.id, shopId: user.shopId },
      include: [{ model: Architect, as: 'referenceArchitect', required: false, attributes: ['id', 'name', 'mobile', 'email'] }],
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer (Admin only)
router.put('/:id', requirePermission('EDIT_CUSTOMER'), async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const customer = await Customer.findOne({
      where: {
        id: req.params.id,
        shopId: user.shopId
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Validate mobile number if provided
    if (req.body.mobile !== undefined) {
      const mobileError = validateMobileNumber(req.body.mobile);
      if (mobileError) {
        return res.status(400).json({ error: mobileError });
      }
    }

    const updatePayload = {
      ...req.body,
      referenceArchitectId: req.body.referenceArchitectId
        ? parseInt(req.body.referenceArchitectId, 10)
        : null,
    };
    await customer.update(updatePayload);
    res.json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete customer
// Delete customer (Admin only)
router.delete('/:id', requirePermission('DELETE_CUSTOMER'), async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const customer = await Customer.findOne({
      where: {
        id: req.params.id,
        shopId: user.shopId
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await customer.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
