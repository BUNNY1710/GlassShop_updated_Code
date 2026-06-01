const express = require('express');
const router = express.Router();
const { GlassPriceMaster, Stock, Glass, User, Shop } = require('../models');
const { Op } = require('sequelize');
const { requireAdmin } = require('../middleware/auth');

// All routes require admin access
router.use(requireAdmin);

// Get all glass price master entries
router.get('/', async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Username not found in token' });
    }

    const user = await User.findOne({
      where: { userName: username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not linked to a shop' });
    }

    const { pending } = req.query;
    const where = { shopId: user.shopId };
    
    if (pending === 'true') {
      where.isPending = true;
    }

    const priceMaster = await GlassPriceMaster.findAll({
      where,
      order: [['glassType', 'ASC'], ['thickness', 'ASC']]
    });

    res.json(priceMaster);
  } catch (error) {
    console.error('Error fetching glass price master:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single entry by ID
router.get('/:id', async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Username not found in token' });
    }

    const user = await User.findOne({
      where: { userName: username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not linked to a shop' });
    }

    const entry = await GlassPriceMaster.findOne({
      where: {
        id: req.params.id,
        shopId: user.shopId
      }
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(entry);
  } catch (error) {
    console.error('Error fetching glass price master entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new glass price master entry
router.post('/', async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Username not found in token' });
    }

    const user = await User.findOne({
      where: { userName: username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not linked to a shop' });
    }

    const { glassType, thickness, purchasePrice, sellingPrice } = req.body;

    if (!glassType || !thickness) {
      return res.status(400).json({ error: 'Glass type and thickness are required' });
    }

    // Check if entry already exists
    const existing = await GlassPriceMaster.findOne({
      where: {
        shopId: user.shopId,
        glassType,
        thickness
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Entry already exists for this glass type and thickness' });
    }

    // Determine if pending (no prices provided)
    const isPending = !purchasePrice && !sellingPrice;

    const entry = await GlassPriceMaster.create({
      shopId: user.shopId,
      glassType,
      thickness: parseFloat(thickness),
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
      sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null,
      isPending
    });

    // If prices are provided and entry is approved, update related stock entries
    if (!isPending) {
      await updateRelatedStockEntries(user.shopId, glassType, parseFloat(thickness), parseFloat(purchasePrice) || null, parseFloat(sellingPrice) || null);
    }

    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating glass price master entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update glass price master entry
router.put('/:id', async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Username not found in token' });
    }

    const user = await User.findOne({
      where: { userName: username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not linked to a shop' });
    }

    const entry = await GlassPriceMaster.findOne({
      where: {
        id: req.params.id,
        shopId: user.shopId
      }
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const { glassType, thickness, purchasePrice, sellingPrice } = req.body;
    const wasPending = entry.isPending;
    const isPending = !purchasePrice && !sellingPrice;

    // Update entry
    entry.glassType = glassType || entry.glassType;
    entry.thickness = thickness ? parseFloat(thickness) : entry.thickness;
    entry.purchasePrice = purchasePrice ? parseFloat(purchasePrice) : null;
    entry.sellingPrice = sellingPrice ? parseFloat(sellingPrice) : null;
    entry.isPending = isPending;
    await entry.save();

    // If entry was pending and now has prices, update related stock entries
    if (wasPending && !isPending) {
      await updateRelatedStockEntries(
        user.shopId,
        entry.glassType,
        entry.thickness,
        entry.purchasePrice,
        entry.sellingPrice
      );
    }

    res.json(entry);
  } catch (error) {
    console.error('Error updating glass price master entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete glass price master entry
router.delete('/:id', async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Username not found in token' });
    }

    const user = await User.findOne({
      where: { userName: username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not linked to a shop' });
    }

    const entry = await GlassPriceMaster.findOne({
      where: {
        id: req.params.id,
        shopId: user.shopId
      }
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // If deleting a pending entry, also delete related pending stock entries
    if (entry.isPending) {
      try {
        // Find all glass entries matching the type and thickness
        const glasses = await Glass.findAll({
          where: {
            type: entry.glassType,
            thickness: parseFloat(entry.thickness)
          }
        });

        if (glasses.length > 0) {
          const glassIds = glasses.map(g => g.id);

          // Delete all pending stock entries with matching glass and shopId
          const deletedCount = await Stock.destroy({
            where: {
              shopId: user.shopId,
              glassId: { [Op.in]: glassIds },
              status: 'PENDING'
            }
          });

          console.log(`Deleted ${deletedCount} pending stock entries for ${entry.glassType} - ${entry.thickness}MM`);
        }
      } catch (stockError) {
        console.error('Error deleting related stock entries:', stockError);
        // Continue with price master deletion even if stock deletion fails
      }
    }

    await entry.destroy();
    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting glass price master entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to update related stock entries
async function updateRelatedStockEntries(shopId, glassType, thickness, purchasePrice, sellingPrice) {
  try {
    // Find all glass entries matching the type and thickness (Glass table doesn't have shopId)
    const glasses = await Glass.findAll({
      where: {
        type: glassType,
        thickness: parseFloat(thickness)
      }
    });

    if (glasses.length === 0) return;

    const glassIds = glasses.map(g => g.id);

    // Update all stock entries with matching glass and shopId
    await Stock.update(
      {
        purchasePrice,
        sellingPrice,
        status: 'APPROVED'
      },
      {
        where: {
          shopId,
          glassId: { [Op.in]: glassIds },
          status: 'PENDING'
        }
      }
    );
  } catch (error) {
    console.error('Error updating related stock entries:', error);
    throw error;
  }
}

// Get price by glass type and thickness (for stock entry)
router.get('/lookup/:glassType/:thickness', async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Username not found in token' });
    }

    const user = await User.findOne({
      where: { userName: username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not linked to a shop' });
    }

    const { glassType, thickness } = req.params;
    const thicknessValue = parseFloat(thickness);

    const entry = await GlassPriceMaster.findOne({
      where: {
        shopId: user.shopId,
        glassType,
        thickness: thicknessValue
      }
    });

    if (!entry) {
      return res.json(null);
    }

    res.json(entry);
  } catch (error) {
    console.error('Error looking up glass price:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

