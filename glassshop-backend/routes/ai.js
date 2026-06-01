const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');

// Apply admin-only middleware
router.use(requireAdmin);

// Ping endpoint
router.get('/ping', (req, res) => {
  res.json({ message: 'Node.js backend is working 👍' });
});

// Stock advice (placeholder)
router.get('/stock/advice', async (req, res) => {
  const { question } = req.query;
  res.json({ 
    message: 'AI stock advisor - implement based on your requirements',
    question 
  });
});

// Ask AI (placeholder)
router.post('/ask', async (req, res) => {
  const { action, glassType, site } = req.body;
  
  // Placeholder responses based on action
  let response = '';
  
  switch (action) {
    case 'LOW_STOCK':
      response = 'Low stock check - implement based on your requirements';
      break;
    case 'AVAILABLE':
      response = `Available stock for ${glassType} - implement based on your requirements`;
      break;
    case 'INSTALLED':
      response = `Installed glass at ${site} - implement based on your requirements`;
      break;
    case 'PREDICT':
      response = 'Demand prediction - implement based on your requirements';
      break;
    default:
      response = '❌ Invalid option selected';
  }
  
  res.json({ message: response });
});

module.exports = router;
