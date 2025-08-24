const csv = require('csv-parser');
const fs = require('fs');
const Trade = require('../models/Trade');

class CSVImportService {
  constructor() {
    this.defaultColumnMapping = {
      orderId: 'orderId',
      side: 'side',
      asset: 'asset',
      fiatCurrency: 'fiatCurrency',
      price: 'price',
      amount: 'amount',
      totalFiat: 'totalFiat',
      feeFiat: 'feeFiat',
      paymentMethod: 'paymentMethod',
      counterparty: 'counterparty',
      status: 'status',
      createdAt: 'createdAt',
      completedAt: 'completedAt'
    };
  }

  // Parse CSV file and return preview data
  async parseCSV(filePath, columnMapping = null) {
    return new Promise((resolve, reject) => {
      const results = [];
      const mapping = columnMapping || this.defaultColumnMapping;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          // Transform data using column mapping
          const transformedRow = this.transformRow(data, mapping);
          if (transformedRow) {
            results.push(transformedRow);
          }
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  // Transform CSV row using column mapping
  transformRow(row, mapping) {
    try {
      const transformed = {};

      // Map each field
      Object.keys(mapping).forEach(field => {
        const csvColumn = mapping[field];
        let value = row[csvColumn];

        if (value !== undefined && value !== null && value !== '') {
          // Transform value based on field type
          switch (field) {
            case 'side':
              value = value.toString().toUpperCase();
              if (!['BUY', 'SELL'].includes(value)) {
                throw new Error(`Invalid side value: ${value}`);
              }
              break;

            case 'price':
            case 'amount':
            case 'totalFiat':
            case 'feeFiat':
              value = parseFloat(value);
              if (isNaN(value) || value < 0) {
                throw new Error(`Invalid numeric value for ${field}: ${value}`);
              }
              break;

            case 'status':
              value = value.toString().toUpperCase();
              if (!['COMPLETED', 'CANCELED', 'PENDING', 'FAILED'].includes(value)) {
                value = 'COMPLETED'; // Default to completed
              }
              break;

            case 'createdAt':
            case 'completedAt':
              value = this.parseDate(value);
              break;

            case 'asset':
              value = value.toString().toUpperCase();
              if (!value) value = 'USDT';
              break;

            case 'fiatCurrency':
              value = value.toString().toUpperCase();
              if (!value) value = 'INR';
              break;

            default:
              value = value.toString();
          }

          transformed[field] = value;
        }
      });

      // Validate required fields
      const requiredFields = ['orderId', 'side', 'price', 'amount', 'totalFiat'];
      for (const field of requiredFields) {
        if (!transformed[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Set defaults for optional fields
      if (!transformed.asset) transformed.asset = 'USDT';
      if (!transformed.fiatCurrency) transformed.fiatCurrency = 'INR';
      if (!transformed.status) transformed.status = 'COMPLETED';
      if (!transformed.createdAt) transformed.createdAt = new Date();
      if (!transformed.completedAt) transformed.completedAt = new Date();
      if (!transformed.feeFiat) transformed.feeFiat = 0;
      if (!transformed.paymentMethod) transformed.paymentMethod = '';
      if (!transformed.counterparty) transformed.counterparty = '';

      return transformed;
    } catch (error) {
      console.error('Error transforming row:', error.message, row);
      return null;
    }
  }

  // Parse date from various formats
  parseDate(dateString) {
    if (!dateString) return new Date();

    // Try different date formats
    const dateFormats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
    ];

    // Check if it's already a valid date
    if (dateString instanceof Date) return dateString;

    // Try parsing as ISO string
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) return isoDate;

    // Try parsing with different formats
    for (const format of dateFormats) {
      if (format.test(dateString)) {
        const parsed = new Date(dateString);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }

    // If all else fails, return current date
    console.warn(`Could not parse date: ${dateString}, using current date`);
    return new Date();
  }

  // Import trades from CSV file
  async importTrades(filePath, columnMapping = null, options = {}) {
    try {
      console.log('Starting CSV import...');
      
      const { preview = false, maxRows = 1000 } = options;
      
      // Parse CSV
      const trades = await this.parseCSV(filePath, columnMapping);
      
      if (trades.length === 0) {
        throw new Error('No valid trades found in CSV file');
      }

      console.log(`Parsed ${trades.length} trades from CSV`);

      if (preview) {
        return {
          success: true,
          message: `CSV parsed successfully. Found ${trades.length} trades.`,
          trades: trades.slice(0, Math.min(trades.length, maxRows)),
          total: trades.length
        };
      }

      // Import to database
      let importedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const trade of trades) {
        try {
          // Check if trade already exists
          const existingTrade = await Trade.findOne({ orderId: trade.orderId });
          
          if (existingTrade && !options.overwrite) {
            skippedCount++;
            continue;
          }

          // Save or update trade
          await Trade.findOneAndUpdate(
            { orderId: trade.orderId },
            trade,
            { upsert: true, new: true }
          );
          
          importedCount++;
        } catch (error) {
          console.error(`Error importing trade ${trade.orderId}:`, error.message);
          errorCount++;
        }
      }

      // Clean up temporary file
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.warn('Could not delete temporary file:', error.message);
      }

      const result = {
        success: true,
        message: `CSV import completed. Imported: ${importedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`,
        imported: importedCount,
        skipped: skippedCount,
        errors: errorCount,
        total: trades.length
      };

      console.log(result.message);
      return result;

    } catch (error) {
      console.error('CSV import error:', error.message);
      
      // Clean up temporary file on error
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn('Could not delete temporary file:', cleanupError.message);
      }

      throw new Error(`CSV import failed: ${error.message}`);
    }
  }

  // Get sample CSV structure
  getSampleCSV() {
    return `orderId,side,asset,fiatCurrency,price,amount,totalFiat,feeFiat,paymentMethod,counterparty,status,createdAt,completedAt
order_001,BUY,USDT,INR,82.50,100,8250,0,UPI,user123,COMPLETED,2024-01-01,2024-01-01
order_002,SELL,USDT,INR,83.20,50,4160,0,UPI,user456,COMPLETED,2024-01-02,2024-01-02
order_003,BUY,USDT,INR,81.80,200,16360,0,IMPS,user789,COMPLETED,2024-01-03,2024-01-03`;
  }

  // Validate column mapping
  validateColumnMapping(mapping) {
    const requiredFields = ['orderId', 'side', 'price', 'amount', 'totalFiat'];
    const missingFields = requiredFields.filter(field => !mapping[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required column mappings: ${missingFields.join(', ')}`);
    }

    return true;
  }
}

module.exports = new CSVImportService();
