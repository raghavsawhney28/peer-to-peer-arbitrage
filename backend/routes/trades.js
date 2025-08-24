const express = require('express');
const router = express.Router();
const Trade = require('../models/Trade');

// Get all trades with pagination and filters
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 50,
      side,
      status,
      fiatCurrency,
      asset,
      from,
      to,
      sortBy = 'completedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (side) query.side = side.toUpperCase();
    if (status) query.status = status.toUpperCase();
    if (fiatCurrency) query.fiatCurrency = fiatCurrency.toUpperCase();
    if (asset) query.asset = asset.toUpperCase();
    
    if (from || to) {
      query.completedAt = {};
      if (from) query.completedAt.$gte = new Date(from);
      if (to) query.completedAt.$lte = new Date(to);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [trades, total] = await Promise.all([
      Trade.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Trade.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: trades,
      pagination: {
        page: parseInt(page),
        pageSize: limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Trades query error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get trade by ID
router.get('/:id', async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);
    
    if (!trade) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trade not found' 
      });
    }

    res.json({
      success: true,
      data: trade
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Create new trade
router.post('/', async (req, res) => {
  try {
    const tradeData = req.body;
    
    // Validate required fields
    const requiredFields = ['orderId', 'side', 'price', 'amount', 'totalFiat'];
    for (const field of requiredFields) {
      if (!tradeData[field]) {
        return res.status(400).json({ 
          success: false, 
          message: `Missing required field: ${field}` 
        });
      }
    }

    // Check if trade with same orderId already exists
    const existingTrade = await Trade.findOne({ orderId: tradeData.orderId });
    if (existingTrade) {
      return res.status(400).json({ 
        success: false, 
        message: 'Trade with this order ID already exists' 
      });
    }

    // Set defaults
    if (!tradeData.asset) tradeData.asset = 'USDT';
    if (!tradeData.fiatCurrency) tradeData.fiatCurrency = 'INR';
    if (!tradeData.status) tradeData.status = 'COMPLETED';
    if (!tradeData.createdAt) tradeData.createdAt = new Date();
    if (!tradeData.completedAt) tradeData.completedAt = new Date();
    if (!tradeData.feeFiat) tradeData.feeFiat = 0;

    const trade = new Trade(tradeData);
    await trade.save();

    res.status(201).json({
      success: true,
      message: 'Trade created successfully',
      data: trade
    });
  } catch (error) {
    console.error('Create trade error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Update trade
router.put('/:id', async (req, res) => {
  try {
    const tradeData = req.body;
    const tradeId = req.params.id;

    const trade = await Trade.findById(tradeId);
    if (!trade) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trade not found' 
      });
    }

    // Update fields
    Object.keys(tradeData).forEach(key => {
      if (key !== '_id' && key !== '__v') {
        trade[key] = tradeData[key];
      }
    });

    await trade.save();

    res.json({
      success: true,
      message: 'Trade updated successfully',
      data: trade
    });
  } catch (error) {
    console.error('Update trade error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Delete trade
router.delete('/:id', async (req, res) => {
  try {
    const trade = await Trade.findByIdAndDelete(req.params.id);
    
    if (!trade) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trade not found' 
      });
    }

    res.json({
      success: true,
      message: 'Trade deleted successfully'
    });
  } catch (error) {
    console.error('Delete trade error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get trade statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { fiatCurrency = 'INR' } = req.query;

    const stats = await Trade.aggregate([
      { $match: { fiatCurrency: fiatCurrency.toUpperCase() } },
      {
        $group: {
          _id: null,
          totalTrades: { $sum: 1 },
          totalBuyTrades: { $sum: { $cond: [{ $eq: ['$side', 'BUY'] }, 1, 0] } },
          totalSellTrades: { $sum: { $cond: [{ $eq: ['$side', 'SELL'] }, 1, 0] } },
          totalBuyAmount: { $sum: { $cond: [{ $eq: ['$side', 'BUY'] }, '$amount', 0] } },
          totalSellAmount: { $sum: { $cond: [{ $eq: ['$side', 'SELL'] }, '$amount', 0] } },
          totalBuyFiat: { $sum: { $cond: [{ $eq: ['$side', 'BUY'] }, '$totalFiat', 0] } },
          totalSellFiat: { $sum: { $cond: [{ $eq: ['$side', 'SELL'] }, '$totalFiat', 0] } },
          avgBuyPrice: { $avg: { $cond: [{ $eq: ['$side', 'BUY'] }, '$price', null] } },
          avgSellPrice: { $avg: { $cond: [{ $eq: ['$eq', '$side', 'SELL'] }, '$price', null] } }
        }
      }
    ]);

    const result = stats[0] || {
      totalTrades: 0,
      totalBuyTrades: 0,
      totalSellTrades: 0,
      totalBuyAmount: 0,
      totalSellAmount: 0,
      totalBuyFiat: 0,
      totalSellFiat: 0,
      avgBuyPrice: 0,
      avgSellPrice: 0
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Trade stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
