const express = require('express');
const router = express.Router();
const ProfitCalculator = require('../services/profitCalculator');

// Get profit time series data
router.get('/timeseries', async (req, res) => {
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

    // Create profit calculator instance
    const profitCalculator = new ProfitCalculator();
    profitCalculator.setMethod(method.toUpperCase());

    // Get profit time series
    const timeSeries = await profitCalculator.getProfitTimeSeries(
      fiatCurrency,
      from,
      to
    );

    res.json({
      success: true,
      data: timeSeries
    });
  } catch (error) {
    console.error('Time series calculation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get daily profit data
router.get('/daily', async (req, res) => {
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

    // Create profit calculator instance
    const profitCalculator = new ProfitCalculator();
    profitCalculator.setMethod(method.toUpperCase());

    // Get profit time series
    const timeSeries = await profitCalculator.getProfitTimeSeries(
      fiatCurrency,
      from,
      to
    );

    // Group by date and calculate daily totals
    const dailyData = {};
    timeSeries.forEach(entry => {
      if (!dailyData[entry.date]) {
        dailyData[entry.date] = {
          date: entry.date,
          cumulativeProfit: 0,
          dailyProfit: 0,
          inventory: 0,
          avgCost: 0
        };
      }
      
      dailyData[entry.date].cumulativeProfit = entry.cumulativeProfit;
      dailyData[entry.date].dailyProfit = entry.dailyProfit;
      dailyData[entry.date].inventory = entry.inventory;
      dailyData[entry.date].avgCost = entry.avgCost;
    });

    const dailyArray = Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      data: dailyArray
    });
  } catch (error) {
    console.error('Daily PNL calculation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get weekly profit data
router.get('/weekly', async (req, res) => {
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

    // Create profit calculator instance
    const profitCalculator = new ProfitCalculator();
    profitCalculator.setMethod(method.toUpperCase());

    // Get profit time series
    const timeSeries = await profitCalculator.getProfitTimeSeries(
      fiatCurrency,
      from,
      to
    );

    // Group by week
    const weeklyData = {};
    timeSeries.forEach(entry => {
      const date = new Date(entry.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          weekStart: weekKey,
          weekEnd: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          cumulativeProfit: 0,
          weeklyProfit: 0,
          inventory: 0,
          avgCost: 0
        };
      }
      
      weeklyData[weekKey].cumulativeProfit = entry.cumulativeProfit;
      weeklyData[weekKey].weeklyProfit = entry.dailyProfit;
      weeklyData[weekKey].inventory = entry.inventory;
      weeklyData[weekKey].avgCost = entry.avgCost;
    });

    const weeklyArray = Object.values(weeklyData).sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));

    res.json({
      success: true,
      data: weeklyArray
    });
  } catch (error) {
    console.error('Weekly PNL calculation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get monthly profit data
router.get('/monthly', async (req, res) => {
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

    // Create profit calculator instance
    const profitCalculator = new ProfitCalculator();
    profitCalculator.setMethod(method.toUpperCase());

    // Get profit time series
    const timeSeries = await profitCalculator.getProfitTimeSeries(
      fiatCurrency,
      from,
      to
    );

    // Group by month
    const monthlyData = {};
    timeSeries.forEach(entry => {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          monthName: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
          cumulativeProfit: 0,
          monthlyProfit: 0,
          inventory: 0,
          avgCost: 0
        };
      }
      
      monthlyData[monthKey].cumulativeProfit = entry.cumulativeProfit;
      monthlyData[monthKey].monthlyProfit = entry.dailyProfit;
      monthlyData[monthKey].inventory = entry.inventory;
      monthlyData[monthKey].avgCost = entry.avgCost;
    });

    const monthlyArray = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      data: monthlyArray
    });
  } catch (error) {
    console.error('Monthly PNL calculation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get summary data (alias for daily)
router.get('/summary', async (req, res) => {
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

    // Create profit calculator instance
    const profitCalculator = new ProfitCalculator();
    profitCalculator.setMethod(method.toUpperCase());

    // Get profit time series
    const timeSeries = await profitCalculator.getProfitTimeSeries(
      fiatCurrency,
      from,
      to
    );

    // Return the last entry as summary
    const summary = timeSeries.length > 0 ? timeSeries[timeSeries.length - 1] : {
      date: from,
      cumulativeProfit: 0,
      dailyProfit: 0,
      inventory: 0,
      avgCost: 0
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Summary PNL calculation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
