const express = require('express');
const router = express.Router();
const profitCalculator = require('../services/profitCalculator');

// Get profit time series data
router.get('/timeseries', async (req, res) => {
  try {
    const { 
      fiatCurrency = 'INR', 
      method = 'FIFO',
      from,
      to,
      interval = 'daily' // daily, weekly, monthly
    } = req.query;

    // Set profit calculation method
    profitCalculator.setMethod(method.toUpperCase());

    // Get time series data
    const timeSeriesData = await profitCalculator.getProfitTimeSeries(
      fiatCurrency,
      from,
      to
    );

    // Process data based on interval
    let processedData = timeSeriesData;
    
    if (interval === 'weekly') {
      processedData = this.aggregateToWeekly(timeSeriesData);
    } else if (interval === 'monthly') {
      processedData = this.aggregateToMonthly(timeSeriesData);
    }

    res.json({
      success: true,
      data: {
        timeSeries: processedData,
        interval,
        fiatCurrency,
        method: method.toUpperCase()
      }
    });
  } catch (error) {
    console.error('P&L time series error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get profit breakdown by day
router.get('/daily', async (req, res) => {
  try {
    const { 
      fiatCurrency = 'INR', 
      method = 'FIFO',
      from,
      to 
    } = req.query;

    // Set profit calculation method
    profitCalculator.setMethod(method.toUpperCase());

    // Get daily profit data
    const dailyData = await profitCalculator.getProfitTimeSeries(
      fiatCurrency,
      from,
      to
    );

    res.json({
      success: true,
      data: dailyData
    });
  } catch (error) {
    console.error('Daily P&L error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get profit breakdown by week
router.get('/weekly', async (req, res) => {
  try {
    const { 
      fiatCurrency = 'INR', 
      method = 'FIFO',
      from,
      to 
    } = req.query;

    // Set profit calculation method
    profitCalculator.setMethod(method.toUpperCase());

    // Get daily data and aggregate to weekly
    const dailyData = await profitCalculator.getProfitTimeSeries(
      fiatCurrency,
      from,
      to
    );

    const weeklyData = aggregateToWeekly(dailyData);

    res.json({
      success: true,
      data: weeklyData
    });
  } catch (error) {
    console.error('Weekly P&L error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get profit breakdown by month
router.get('/monthly', async (req, res) => {
  try {
    const { 
      fiatCurrency = 'INR', 
      method = 'FIFO',
      from,
      to 
    } = req.query;

    // Set profit calculation method
    profitCalculator.setMethod(method.toUpperCase());

    // Get daily data and aggregate to monthly
    const dailyData = await profitCalculator.getProfitTimeSeries(
      fiatCurrency,
      from,
      to
    );

    const monthlyData = aggregateToMonthly(dailyData);

    res.json({
      success: true,
      data: monthlyData
    });
  } catch (error) {
    console.error('Monthly P&L error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Helper function to aggregate daily data to weekly
function aggregateToWeekly(dailyData) {
  const weeklyData = {};
  
  dailyData.forEach(day => {
    const date = new Date(day.date);
    const weekStart = getWeekStart(date);
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        weekStart: weekKey,
        buyAmount: 0,
        sellAmount: 0,
        buyFiat: 0,
        sellFiat: 0,
        dailyProfit: 0,
        cumulativeProfit: 0
      };
    }
    
    weeklyData[weekKey].buyAmount += day.buyAmount;
    weeklyData[weekKey].sellAmount += day.sellAmount;
    weeklyData[weekKey].buyFiat += day.buyFiat;
    weeklyData[weekKey].sellFiat += day.sellFiat;
    weeklyData[weekKey].dailyProfit += day.dailyProfit;
    weeklyData[weekKey].cumulativeProfit = day.cumulativeProfit; // Use last day's cumulative
  });
  
  return Object.values(weeklyData).sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
}

// Helper function to aggregate daily data to monthly
function aggregateToMonthly(dailyData) {
  const monthlyData = {};
  
  dailyData.forEach(day => {
    const date = new Date(day.date);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        buyAmount: 0,
        sellAmount: 0,
        buyFiat: 0,
        sellFiat: 0,
        dailyProfit: 0,
        cumulativeProfit: 0
      };
    }
    
    monthlyData[monthKey].buyAmount += day.buyAmount;
    monthlyData[monthKey].sellAmount += day.sellAmount;
    monthlyData[monthKey].buyFiat += day.buyFiat;
    monthlyData[monthKey].sellFiat += day.sellFiat;
    monthlyData[monthKey].dailyProfit += day.dailyProfit;
    monthlyData[monthKey].cumulativeProfit = day.cumulativeProfit; // Use last day's cumulative
  });
  
  return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
}

// Helper function to get week start (Monday)
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

module.exports = router;
