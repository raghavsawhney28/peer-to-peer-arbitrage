const express = require('express');
const router = express.Router();
const Trade = require('../models/Trade');

// Get all trades with pagination and filters
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      type,
      fiatCurrency,
      cryptoCurrency,
      status,
      fromDate,
      toDate,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    if (type) query.type = type.toUpperCase();
    if (fiatCurrency) query.fiatCurrency = fiatCurrency;
    if (cryptoCurrency) query.cryptoCurrency = cryptoCurrency;
    if (status) query.status = status.toUpperCase();
    
    if (fromDate || toDate) {
      query.timestamp = {};
      if (fromDate) query.timestamp.$gte = new Date(fromDate);
      if (toDate) query.timestamp.$lte = new Date(toDate);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const trades = await Trade.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Trade.countDocuments(query);

    res.json({
      success: true,
      data: trades,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single trade by ID
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
    console.error('Error fetching trade:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create new trade
router.post('/', async (req, res) => {
  try {
    const {
      type,
      timestamp,
      fiatCurrency = 'INR',
      fiatAmount,
      price,
      cryptoAmount,
      cryptoCurrency = 'USDT',
      notes = '',
      status = 'COMPLETED'
    } = req.body;

    // Validate required fields
    if (!type || !fiatAmount || !price || !cryptoAmount) {
      return res.status(400).json({
        success: false,
        message: 'Type, fiat amount, price, and crypto amount are required'
      });
    }

    // Validate type
    if (!['BUY', 'SELL'].includes(type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either BUY or SELL'
      });
    }

    // Create trade
    const trade = new Trade({
      type: type.toUpperCase(),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      fiatCurrency: fiatCurrency.toUpperCase(),
      fiatAmount: parseFloat(fiatAmount),
      price: parseFloat(price),
      cryptoAmount: parseFloat(cryptoAmount),
      cryptoCurrency: cryptoCurrency.toUpperCase(),
      notes,
      status: status.toUpperCase()
    });

    await trade.save();

    res.status(201).json({
      success: true,
      data: trade,
      message: 'Trade created successfully'
    });
  } catch (error) {
    console.error('Error creating trade:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update trade
router.put('/:id', async (req, res) => {
  try {
    const {
      type,
      timestamp,
      fiatCurrency,
      fiatAmount,
      price,
      cryptoAmount,
      cryptoCurrency,
      notes,
      status
    } = req.body;

    // Find and update trade
    const trade = await Trade.findByIdAndUpdate(
      req.params.id,
      {
        ...(type && { type: type.toUpperCase() }),
        ...(timestamp && { timestamp: new Date(timestamp) }),
        ...(fiatCurrency && { fiatCurrency: fiatCurrency.toUpperCase() }),
        ...(fiatAmount && { fiatAmount: parseFloat(fiatAmount) }),
        ...(price && { price: parseFloat(price) }),
        ...(cryptoAmount && { cryptoAmount: parseFloat(cryptoAmount) }),
        ...(cryptoCurrency && { cryptoCurrency: cryptoCurrency.toUpperCase() }),
        ...(notes !== undefined && { notes }),
        ...(status && { status: status.toUpperCase() })
      },
      { new: true, runValidators: true }
    );

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
    }

    res.json({
      success: true,
      data: trade,
      message: 'Trade updated successfully'
    });
  } catch (error) {
    console.error('Error updating trade:', error);
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
    console.error('Error deleting trade:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Bulk import trades (for future use)
router.post('/bulk', async (req, res) => {
  try {
    const { trades } = req.body;
    
    if (!Array.isArray(trades) || trades.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Trades array is required and must not be empty'
      });
    }

    const createdTrades = await Trade.insertMany(trades);

    res.status(201).json({
      success: true,
      data: createdTrades,
      message: `${createdTrades.length} trades imported successfully`
    });
  } catch (error) {
    console.error('Error bulk importing trades:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
