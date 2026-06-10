const express = require('express');
const router = express.Router();
const { Invoice, InvoiceItem, Payment, Quotation, QuotationItem, Customer, Architect, User, Shop } = require('../models');
const { requirePermission } = require('../middleware/auth');
const { generateInvoicePdf, generateBasicInvoicePdf, generateChallanPdf } = require('../services/pdfService');

// Baseline: any invoice access requires VIEW_INVOICE (admin bypasses).
// Mutating endpoints add a stricter permission below.
router.use(requirePermission('VIEW_INVOICE'));

// Create invoice from quotation
router.post('/from-quotation', requirePermission('CREATE_INVOICE'), async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const { quotationId, invoiceType, invoiceDate } = req.body;

    if (!quotationId) {
      return res.status(400).json({ error: 'Quotation ID is required' });
    }

    // Convert quotationId to number if it's a string
    const qId = typeof quotationId === 'string' ? parseInt(quotationId) : quotationId;

    const quotation = await Quotation.findOne({
      where: {
        id: qId,
        shopId: user.shopId,
        status: 'CONFIRMED'
      },
      include: [{ 
        model: QuotationItem, 
        as: 'items',
        separate: true,
        order: [['itemOrder', 'ASC']]
      }]
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found or not confirmed' });
    }

    // Generate invoice number
    const count = await Invoice.count({ where: { shopId: user.shopId } });
    const invoiceNumber = `INV-${Date.now()}-${count + 1}`;

    // Map invoiceType - frontend sends "FINAL", database expects "FINAL" or "TAX"
    // Check what the database actually expects
    const mappedInvoiceType = invoiceType || 'FINAL';
    
    // Use provided invoiceDate or current date
    // invoiceDate should be in YYYY-MM-DD format (DATEONLY)
    let invDate;
    if (invoiceDate) {
      invDate = new Date(invoiceDate);
      // Ensure it's a valid date
      if (isNaN(invDate.getTime())) {
        return res.status(400).json({ error: 'Invalid invoice date format' });
      }
    } else {
      invDate = new Date();
    }
    // Format as YYYY-MM-DD for DATEONLY field
    const formattedDate = invDate.toISOString().split('T')[0];

    // Create invoice
    const invoice = await Invoice.create({
      shopId: user.shopId,
      customerId: quotation.customerId,
      quotationId: quotation.id,
      invoiceNumber,
      invoiceType: mappedInvoiceType,
      billingType: quotation.billingType,
      invoiceDate: formattedDate,
      customerName: quotation.customerName,
      customerMobile: quotation.customerMobile,
      customerAddress: quotation.customerAddress,
      customerGstin: quotation.customerGstin,
      customerState: quotation.customerState,
      shippingAddress: quotation.shippingAddress || "",
      subtotal: parseFloat(quotation.subtotal || 0),
      installationCharge: parseFloat(quotation.installationCharge || 0),
      transportCharge: parseFloat(quotation.transportCharge || 0),
      discount: parseFloat(quotation.discount || 0),
      gstPercentage: quotation.gstPercentage ? parseFloat(quotation.gstPercentage) : null,
      cgst: quotation.cgst ? parseFloat(quotation.cgst) : null,
      sgst: quotation.sgst ? parseFloat(quotation.sgst) : null,
      igst: quotation.igst ? parseFloat(quotation.igst) : null,
      gstAmount: parseFloat(quotation.gstAmount || 0),
      grandTotal: parseFloat(quotation.grandTotal || 0),
      paymentStatus: 'DUE',
      paidAmount: 0,
      dueAmount: parseFloat(quotation.grandTotal || 0),
      createdBy: user.userName,
      referenceArchitectId: quotation.referenceArchitectId || null,
    });

    // Create invoice items from quotation items
    if (quotation.items && quotation.items.length > 0) {
      await Promise.all(
        quotation.items.map((item, index) =>
          InvoiceItem.create({
            glassType: item.glassType,
            thickness: item.thickness,
            height: item.height,
            width: item.width,
            quantity: item.quantity,
            ratePerSqft: item.ratePerSqft,
            area: item.area,
            subtotal: item.subtotal,
            hsnCode: item.hsnCode,
            description: item.description,
            itemOrder: index,
            invoiceId: invoice.id
          })
        )
      );
    }

    const fullInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        { model: InvoiceItem, as: 'items' },
        { model: Payment, as: 'payments' }
      ]
    });

    res.status(201).json(fullInvoice);
  } catch (error) {
    console.error('Error creating invoice from quotation:', error);
    // Return more detailed error message
    const errorMessage = error.message || 'Failed to create invoice';
    const errorDetails = error.errors ? error.errors.map(e => e.message).join(', ') : '';
    res.status(400).json({ 
      error: errorMessage,
      details: errorDetails,
      message: errorMessage // Also include as 'message' for frontend compatibility
    });
  }
});

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const invoices = await Invoice.findAll({
      where: { shopId: user.shopId },
      include: [
        { model: InvoiceItem, as: 'items' },
        { model: Payment, as: 'payments' },
        { model: Architect, as: 'referenceArchitect', required: false, attributes: ['id', 'name', 'mobile', 'email'] },
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const invoice = await Invoice.findOne({
      where: { id: req.params.id, shopId: user.shopId },
      include: [
        { model: InvoiceItem, as: 'items' },
        { model: Payment, as: 'payments' },
        { model: Architect, as: 'referenceArchitect', required: false, attributes: ['id', 'name', 'mobile', 'email'] },
      ]
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoices by payment status
router.get('/payment-status/:status', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const invoices = await Invoice.findAll({
      where: {
        shopId: user.shopId,
        paymentStatus: req.params.status.toUpperCase()
      },
      include: [
        { model: InvoiceItem, as: 'items' },
        { model: Payment, as: 'payments' }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add payment
router.post('/:id/payments', requirePermission('EDIT_INVOICE'), async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const invoice = await Invoice.findOne({
      where: {
        id: req.params.id,
        shopId: user.shopId
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const { amount, paymentMode, paymentDate, referenceNumber, bankName, chequeNumber, transactionId, notes } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Payment amount is required and must be greater than 0' });
    }

    if (!paymentMode) {
      return res.status(400).json({ error: 'Payment mode is required' });
    }

    // Validate amount doesn't exceed due amount
    const dueAmount = parseFloat(invoice.dueAmount || invoice.grandTotal);
    if (parseFloat(amount) > dueAmount) {
      return res.status(400).json({ error: `Payment amount cannot exceed due amount (₹${dueAmount})` });
    }

    // Parse payment date - frontend sends ISO string
    let parsedDate;
    if (paymentDate) {
      parsedDate = new Date(paymentDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid payment date format' });
      }
    } else {
      parsedDate = new Date();
    }

    const payment = await Payment.create({
      invoiceId: invoice.id,
      amount: parseFloat(parseFloat(amount).toFixed(2)), // Round to 2 decimal places
      paymentMode: paymentMode.toUpperCase(),
      paymentDate: parsedDate,
      referenceNumber: referenceNumber || null,
      bankName: bankName || null,
      chequeNumber: chequeNumber || null,
      transactionId: transactionId || null,
      notes: notes || null,
      createdBy: user.userName
    });

    // Update invoice payment status
    // Round payment amount to 2 decimal places to avoid precision issues
    const paymentAmount = Math.round(parseFloat(amount) * 100) / 100;
    const currentPaid = parseFloat(invoice.paidAmount || 0);
    const grandTotal = parseFloat(invoice.grandTotal || 0);
    
    // Calculate new paid amount (rounded to 2 decimals)
    const newPaidAmount = Math.round((currentPaid + paymentAmount) * 100) / 100;
    
    // Ensure paid amount doesn't exceed grand total
    const finalPaidAmount = Math.min(newPaidAmount, grandTotal);
    
    // Calculate due amount as grand_total - paid_amount to satisfy constraint
    // chk_invoice_payment: paid_amount + due_amount = grand_total
    const finalDueAmount = grandTotal - finalPaidAmount;
    
    // Ensure both are non-negative (constraint requirement)
    invoice.paidAmount = Math.max(0, finalPaidAmount);
    invoice.dueAmount = Math.max(0, finalDueAmount);

    if (parseFloat(invoice.dueAmount) <= 0) {
      invoice.paymentStatus = 'PAID';
    } else if (parseFloat(invoice.paidAmount) > 0) {
      invoice.paymentStatus = 'PARTIAL';
    }

    await invoice.save();

    res.status(201).json(payment);
  } catch (error) {
    console.error('Error adding payment:', error);
    // Return more detailed error message
    const errorMessage = error.message || 'Failed to add payment';
    const errorDetails = error.errors ? error.errors.map(e => e.message).join(', ') : '';
    res.status(400).json({ 
      error: errorMessage,
      details: errorDetails,
      message: errorMessage // Also include as 'message' for frontend compatibility
    });
  }
});

// PDF download endpoints
router.get('/:id/download-invoice', async (req, res) => {
  try {
    const pdfBuffer = await generateInvoicePdf(req.params.id, req.user.username);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to generate invoice PDF' });
  }
});

router.get('/:id/download-basic-invoice', async (req, res) => {
  try {
    const pdfBuffer = await generateBasicInvoicePdf(req.params.id, req.user.username);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="basic-invoice-${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating basic invoice PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to generate basic invoice PDF' });
  }
});

router.get('/:id/print-invoice', async (req, res) => {
  try {
    const pdfBuffer = await generateInvoicePdf(req.params.id, req.user.username);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating invoice PDF for print:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Failed to generate invoice PDF' });
  }
});

router.get('/:id/print-basic-invoice', async (req, res) => {
  try {
    const pdfBuffer = await generateBasicInvoicePdf(req.params.id, req.user.username);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="basic-invoice-${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating basic invoice PDF for print:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Failed to generate basic invoice PDF' });
  }
});

router.get('/:id/download-challan', async (req, res) => {
  try {
    const pdfBuffer = await generateChallanPdf(req.params.id, req.user.username);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="challan-${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating challan PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to generate challan PDF' });
  }
});

router.get('/:id/print-challan', async (req, res) => {
  try {
    const pdfBuffer = await generateChallanPdf(req.params.id, req.user.username);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="challan-${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating challan PDF for print:', error);
    res.status(500).json({ error: error.message || 'Failed to generate challan PDF' });
  }
});

module.exports = router;
