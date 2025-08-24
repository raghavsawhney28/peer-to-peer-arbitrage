const express = require('express');
const router = express.Router();
const profitCalculator = require('../services/profitCalculator');

// Get profit summary
router.get('/', async (req, res) => {
  try {
    const { 
      fiatCurrency = 'INR', 
      method = 'FIFO',
      from,
      to 
    } = req.query;

    // Set profit calculation method
    profitCalculator.setMethod(method.toUpperCase());

    // Calculate realized profit
    const summary = await profitCalculator.calculateRealizedProfit(
      fiatCurrency,
      from,
      to
    );

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Summary calculation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get profit summary for specific date range
router.get('/range', async (req, res) => {
  try {
    const { 
      fiatCurrency = 'INR', 
      method = 'FIFO',
      from,
      to 
    } = req.query;

    if (!from || !to) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both from and to dates are required' 
      });
    }

    // Set profit calculation method
    profitCalculator.setMethod(method.toUpperCase());

    // Calculate realized profit for date range
    const summary = await profitCalculator.calculateRealizedProfit(
      fiatCurrency,
      from,
      to
    );

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Range summary calculation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get profit summary by month
router.get('/monthly', async (req, res) => {
  try {
    const { 
      fiatCurrency = 'INR', 
      method = 'FIFO',
      year 
    } = req.query;

    const currentYear = year || new Date().getFullYear();
    const from = `${currentYear}-01-01`;
    const to = `${currentYear}-12-31`;

    // Set profit calculation method
    profitCalculator.setMethod(method.toUpperCase());

    // Calculate realized profit for the year
    const yearlySummary = await profitCalculator.calculateRealizedProfit(
      fiatCurrency,
      from,
      to
    );

    // Get monthly breakdown
    const monthlyData = [];
    for (let month = 1; month <= 12; month++) {
      const monthFrom = `${currentYear}-${month.toString().padStart(2, '0')}-01`;
      const monthTo = new Date(currentYear, month, 0).toISOString().split('T')[0];
      
      try {
        const monthSummary = await profitCalculator.calculateRealizedProfit(
          fiatCurrency,
          monthFrom,
          monthTo
        );

        monthlyData.push({
          month,
          year: currentYear,
          monthName: new Date(currentYear, month - 1).toLocaleString('default', { month: 'long' }),
          ...monthSummary
        });
      } catch (error) {
        monthlyData.push({
          month,
          year: currentYear,
          monthName: new Date(currentYear, month - 1).toLocaleString('default', { month: 'long' }),
          realizedProfitFiat: 0,
          totalBuyFiat: 0,
          totalSellFiat: 0,
          totalBuyAmount: 0,
          totalSellAmount: 0,
          avgBuyPrice: 0,
          avgSellPrice: 0,
          inventoryRemaining: 0
        });
      }
    }

    res.json({
      success: true,
      data: {
        yearly: yearlySummary,
        monthly: monthlyData
      }
    });
  } catch (error) {
    console.error('Monthly summary calculation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get available calculation methods
router.get('/methods', (req, res) => {
  try {
    const methods = [
      {
        key: 'FIFO',
        name: 'First In, First Out',
        description: 'Calculates profit by matching sells to the oldest buys first'
      },
      {
        key: 'AVERAGE',
        name: 'Average Cost',
        description: 'Calculates profit using weighted average cost of holdings'
      }
    ];

    res.json({
      success: true,
      data: methods
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get available fiat currencies
router.get('/currencies', async (req, res) => {
  try {
    // This would typically come from a database query
    // For now, return common currencies
    const currencies = [
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' }
    ];

    res.json({
      success: true,
      data: currencies
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
