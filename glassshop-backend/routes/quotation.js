const express = require('express');
const router = express.Router();
const { Quotation, QuotationItem, Customer, Architect, User, Shop, Stock, Glass } = require('../models');
const { requirePermission, requireAnyPermission } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');
const pdfService = require('../services/pdfService');

// Baseline: quotation data is consumed by several modules (optimization,
// invoices, customers, dashboard). Allow access to anyone who can view any of
// those pages so a visible page never 403s. Mutating endpoints below add a
// strict per-action permission. Admin bypasses everything.
router.use(requireAnyPermission(
  'VIEW_QUOTATION', 'CREATE_QUOTATION', 'EDIT_QUOTATION', 'DELETE_QUOTATION',
  'VIEW_OPTIMIZATION', 'RUN_OPTIMIZATION', 'VIEW_PLANS',
  'VIEW_INVOICE', 'CREATE_INVOICE',
  'VIEW_CUSTOMER', 'VIEW_DASHBOARD'
));

// Create quotation
router.post('/', requirePermission('CREATE_QUOTATION'), async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const { customerId, items, ...quotationData } = req.body;

    // Generate quotation number
    const count = await Quotation.count({ where: { shopId: user.shopId } });
    const quotationNumber = `QTN-${Date.now()}-${count + 1}`;

    const customer = await Customer.findOne({
      where: { id: customerId, shopId: user.shopId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Calculate subtotal from items
    let subtotal = 0;
    if (items && items.length > 0) {
      subtotal = items.reduce((sum, item) => {
        const itemSubtotal = parseFloat(item.subtotal || 0);
        return sum + itemSubtotal;
      }, 0);
    }

    // Calculate GST and grand total
    const installationCharge = parseFloat(quotationData.installationCharge || 0);
    const transportCharge = parseFloat(quotationData.transportCharge || 0);
    const discount = parseFloat(quotationData.discount || 0);
    const discountType = quotationData.discountType || 'AMOUNT';
    const discountValue = parseFloat(quotationData.discountValue || 0);
    
    // Base amount after charges and discount
    const baseAmount = subtotal + installationCharge + transportCharge - discount;
    
    let gstPercentage = null;
    let gstAmount = 0;
    let cgst = null;
    let sgst = null;
    let igst = null;
    let grandTotal = baseAmount;

    // Calculate GST if billing type is GST
    if (quotationData.billingType === 'GST' && quotationData.gstPercentage) {
      gstPercentage = parseFloat(quotationData.gstPercentage);
      gstAmount = baseAmount * gstPercentage / 100;
      
      // For now, assume intra-state (CGST + SGST)
      // TODO: Compare shop state with customer state for inter-state (IGST)
      cgst = gstAmount / 2;
      sgst = gstAmount / 2;
      igst = 0;
      
      grandTotal = baseAmount + gstAmount;
    }

    // Create quotation with customer snapshot and calculated totals
    const quotation = await Quotation.create({
      ...quotationData,
      shopId: user.shopId,
      customerId: customer.id,
      quotationNumber,
      customerName: customer.name,
      customerMobile: customer.mobile,
      customerAddress: customer.address,
      customerGstin: customer.gstin,
      customerState: customer.state,
      createdBy: user.userName,
      status: 'DRAFT',
      subtotal: subtotal,
      installationCharge: installationCharge,
      transportCharge: transportCharge,
      discount: discount,
      discountType: discountType,
      discountValue: discountValue,
      gstPercentage: gstPercentage,
      gstAmount: gstAmount,
      cgst: cgst,
      sgst: sgst,
      igst: igst,
      grandTotal: grandTotal,
      referenceArchitectId: quotationData.referenceArchitectId
        ? parseInt(quotationData.referenceArchitectId)
        : null,
    });

    // Auto-link customer to architect when quotation specifies one
    if (quotation.referenceArchitectId && !customer.referenceArchitectId) {
      await customer.update({ referenceArchitectId: quotation.referenceArchitectId });
    }

    // Validate: thickness must belong to the selected glass type in stock
    if (items && items.length > 0) {
      for (const item of items) {
        if (item.glassType && item.thickness) {
          const numericThickness = parseFloat(String(item.thickness).replace(/[^0-9.]/g, ''));
          if (!isNaN(numericThickness) && numericThickness > 0) {
            const match = await Stock.findOne({
              where: { shopId: user.shopId, quantity: { [require('sequelize').Op.gt]: 0 } },
              include: [{
                model: Glass,
                as: 'glass',
                where: { type: item.glassType, thickness: numericThickness },
                required: true,
              }],
            });
            if (!match) {
              // Roll back the quotation that was just created
              await quotation.destroy();
              return res.status(422).json({
                error: `No stock available for Glass Type "${item.glassType}" with thickness "${item.thickness}". Please check your inventory before saving.`
              });
            }
          }
        }
      }
    }

    // Create quotation items
    if (items && items.length > 0) {
      await Promise.all(
        items.map((item, index) =>
          QuotationItem.create({
            ...item,
            quotationId: quotation.id,
            itemOrder: index
          })
        )
      );
    }

    // Reload with items and architect
    const fullQuotation = await Quotation.findByPk(quotation.id, {
      include: [
        { model: QuotationItem, as: 'items', separate: true, order: [['itemOrder', 'ASC']] },
        { model: Architect, as: 'referenceArchitect', required: false, attributes: ['id', 'name', 'mobile', 'email'] },
      ]
    });

    await logActivity(req, {
      action: 'CREATE_QUOTATION', shopId: user.shopId,
      details: `Created Quotation ${quotationNumber} for ${customer.name} · ₹${Number(grandTotal || 0).toLocaleString('en-IN')}`,
    });

    res.status(201).json(fullQuotation);
  } catch (error) {
    console.error('Error creating quotation:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(400).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get all quotations
router.get('/', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    try {
      const quotations = await Quotation.findAll({
        where: { shopId: user.shopId },
        include: [
          { model: QuotationItem, as: 'items', separate: true, order: [['itemOrder', 'ASC']] },
          { model: Architect, as: 'referenceArchitect', required: false, attributes: ['id', 'name', 'mobile', 'email'] },
        ],
        order: [['createdAt', 'DESC']]
      });

      // Map quotations to ensure discountType and discountValue have defaults if missing
      const mappedQuotations = quotations.map(q => {
        const quotation = q.toJSON();
        // Set defaults if columns don't exist in database
        if (quotation.discountType === undefined || quotation.discountType === null) {
          quotation.discountType = 'AMOUNT';
        }
        if (quotation.discountValue === undefined || quotation.discountValue === null) {
          quotation.discountValue = quotation.discount || 0;
        }
        return quotation;
      });

      // Debug: Log statuses being returned
      console.log('Quotations returned:', mappedQuotations.map(q => ({ 
        id: q.id, 
        number: q.quotationNumber, 
        status: q.status 
      })));

      res.json(mappedQuotations);
    } catch (dbError) {
      // Check if error is about missing columns
      if (dbError.message && dbError.message.includes('discount_type') || dbError.message.includes('discount_value')) {
        console.error('Database columns missing. Please run the migration script: migrations/add_discount_fields.sql');
        console.error('Error:', dbError.message);
        return res.status(500).json({ 
          error: 'Database schema needs to be updated. Please run the migration script: migrations/add_discount_fields.sql',
          details: dbError.message
        });
      }
      throw dbError; // Re-throw if it's a different error
    }
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ error: error.message, details: error.stack });
  }
});

// Get quotation by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const quotation = await Quotation.findOne({
      where: { id: req.params.id, shopId: user.shopId },
      include: [
        { model: QuotationItem, as: 'items', separate: true, order: [['itemOrder', 'ASC']] },
        { model: Shop, as: 'shop', required: false, attributes: ['id', 'shopName', 'ownerName', 'email', 'whatsappNumber'] },
        { model: Architect, as: 'referenceArchitect', required: false, attributes: ['id', 'name', 'mobile', 'email'] },
      ]
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    res.json(quotation);
  } catch (error) {
    console.error('Error fetching quotation by ID:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message, details: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
});

// Get quotations by status
router.get('/status/:status', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const status = req.params.status.toUpperCase();
    const quotations = await Quotation.findAll({
      where: {
        shopId: user.shopId,
        status: status
      },
      include: [{ 
        model: QuotationItem, 
        as: 'items',
        separate: true,
        order: [['itemOrder', 'ASC']]
      }],
      order: [['createdAt', 'DESC']]
    });

    console.log(`Quotations with status ${status}:`, quotations.length);
    res.json(quotations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Confirm quotation (Admin only)
router.put('/:id/confirm', requirePermission('EDIT_QUOTATION'), async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const quotation = await Quotation.findOne({
      where: {
        id: req.params.id,
        shopId: user.shopId
      }
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    // Support both 'action' (from frontend) and 'confirmed' (legacy) formats
    const { action, confirmed, rejectionReason } = req.body;
    
    // Determine if confirmed based on action or confirmed field
    const isConfirmed = action === 'CONFIRMED' || confirmed === true;

    if (isConfirmed) {
      quotation.status = 'CONFIRMED';
      quotation.confirmedAt = new Date();
      quotation.confirmedBy = user.userName;
      quotation.rejectionReason = null;
    } else {
      quotation.status = 'REJECTED';
      quotation.rejectionReason = rejectionReason;
      quotation.confirmedAt = null;
      quotation.confirmedBy = null;
    }

    await quotation.save();

    // Reload with items to return complete data
    const updatedQuotation = await Quotation.findByPk(quotation.id, {
      include: [{ model: QuotationItem, as: 'items' }]
    });

    await logActivity(req, {
      action: 'EDIT_QUOTATION', shopId: user.shopId,
      details: `${isConfirmed ? 'Confirmed' : 'Rejected'} Quotation ${quotation.quotationNumber || '#' + quotation.id}`,
    });

    res.json(updatedQuotation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete quotation (admin only)
router.delete('/:id', requirePermission('DELETE_QUOTATION'), async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const quotation = await Quotation.findOne({
      where: {
        id: req.params.id,
        shopId: user.shopId
      }
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const qno = quotation.quotationNumber || '#' + quotation.id;
    await quotation.destroy();
    await logActivity(req, { action: 'DELETE_QUOTATION', shopId: user.shopId, details: `Deleted Quotation ${qno}` });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download quotation PDF
router.get('/:id/download', async (req, res) => {
  try {
    const pdfBuffer = await pdfService.generateQuotationPdf(req.params.id, req.user.username);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=quotation-${req.params.id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    if (error.message === 'Quotation not found' || error.message.includes('Unauthorized')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error generating quotation PDF:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Failed to generate PDF' });
  }
});

// Print stickers (one per glass item). Endpoint path kept for API compatibility.
router.get('/:id/print-cutting-pad', async (req, res) => {
  try {
    const pdfBuffer = await pdfService.generateCuttingPadPrintPdf(req.params.id, req.user.username);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=stickers-${req.params.id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    if (error.message === 'Quotation not found' || error.message.includes('Unauthorized')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error generating cutting pad PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;
