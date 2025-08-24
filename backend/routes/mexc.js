const express = require('express');
const router = express.Router();
const mexcService = require('../services/mexcService');

// Test MEXC API connection
router.get('/test', async (req, res) => {
  try {
    const result = await mexcService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Sync trades from MEXC API
router.post('/sync', async (req, res) => {
  try {
    const { force = false } = req.body;
    
    if (force) {
      console.log('Force sync requested');
    }

    const result = await mexcService.syncTrades();
    
    res.json({
      success: true,
      message: 'MEXC sync completed successfully',
      ...result
    });
  } catch (error) {
    console.error('MEXC sync route error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get MEXC API status
router.get('/status', async (req, res) => {
  try {
    const hasCredentials = !!(process.env.MEXC_API_KEY && process.env.MEXC_API_SECRET);
    
    res.json({
      hasCredentials,
      message: hasCredentials ? 'MEXC API credentials configured' : 'MEXC API credentials not configured'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
