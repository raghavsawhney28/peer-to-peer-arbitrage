const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csvImportService = require('../services/csvImportService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'csv-import-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Get sample CSV structure
router.get('/sample', (req, res) => {
  try {
    const sampleCSV = csvImportService.getSampleCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sample-trades.csv');
    res.send(sampleCSV);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Preview CSV file (parse and return first few rows)
router.post('/preview', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No CSV file uploaded' 
      });
    }

    const { columnMapping, maxRows = 10 } = req.body;
    let mapping = null;

    if (columnMapping) {
      try {
        mapping = JSON.parse(columnMapping);
        csvImportService.validateColumnMapping(mapping);
      } catch (error) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid column mapping: ${error.message}` 
        });
      }
    }

    const result = await csvImportService.importTrades(
      req.file.path, 
      mapping, 
      { preview: true, maxRows: parseInt(maxRows) }
    );

    res.json(result);
  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Could not delete file:', cleanupError.message);
      }
    }

    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Import CSV file
router.post('/import', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No CSV file uploaded' 
      });
    }

    const { columnMapping, overwrite = false } = req.body;
    let mapping = null;

    if (columnMapping) {
      try {
        mapping = JSON.parse(columnMapping);
        csvImportService.validateColumnMapping(mapping);
      } catch (error) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid column mapping: ${error.message}` 
        });
      }
    }

    const result = await csvImportService.importTrades(
      req.file.path, 
      mapping, 
      { preview: false, overwrite: overwrite === 'true' }
    );

    res.json(result);
  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Could not delete file:', cleanupError.message);
      }
    }

    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get available fields for column mapping
router.get('/fields', (req, res) => {
  try {
    const fields = [
      { key: 'orderId', label: 'Order ID', required: true, description: 'Unique identifier for the trade' },
      { key: 'side', label: 'Side', required: true, description: 'BUY or SELL' },
      { key: 'asset', label: 'Asset', required: false, description: 'Trading asset (default: USDT)' },
      { key: 'fiatCurrency', label: 'Fiat Currency', required: false, description: 'Fiat currency (default: INR)' },
      { key: 'price', label: 'Price', required: true, description: 'Price per unit in fiat' },
      { key: 'amount', label: 'Amount', required: true, description: 'Amount of asset traded' },
      { key: 'totalFiat', label: 'Total Fiat', required: true, description: 'Total fiat value' },
      { key: 'feeFiat', label: 'Fee (Fiat)', required: false, description: 'Fee amount in fiat' },
      { key: 'paymentMethod', label: 'Payment Method', required: false, description: 'Payment method used' },
      { key: 'counterparty', label: 'Counterparty', required: false, description: 'Counterparty identifier' },
      { key: 'status', label: 'Status', required: false, description: 'Trade status (default: COMPLETED)' },
      { key: 'createdAt', label: 'Created At', required: false, description: 'Trade creation date' },
      { key: 'completedAt', label: 'Completed At', required: false, description: 'Trade completion date' }
    ];

    res.json({
      success: true,
      fields
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
