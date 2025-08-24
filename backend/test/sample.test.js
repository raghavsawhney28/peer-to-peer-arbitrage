const mongoose = require('mongoose');
const Trade = require('../models/Trade');

describe('P2P Arbitrage Backend Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect('mongodb://localhost:27017/p2p_arbitrage_test');
  });

  afterAll(async () => {
    // Clean up and disconnect
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear test data before each test
    await Trade.deleteMany({});
  });

  describe('Trade Model', () => {
    test('should create a valid trade', async () => {
      const tradeData = {
        orderId: 'test_order_001',
        side: 'BUY',
        asset: 'USDT',
        fiatCurrency: 'INR',
        price: 82.50,
        amount: 100,
        totalFiat: 8250,
        feeFiat: 0,
        paymentMethod: 'UPI',
        counterparty: 'test_user',
        status: 'COMPLETED',
        createdAt: new Date(),
        completedAt: new Date()
      };

      const trade = new Trade(tradeData);
      const savedTrade = await trade.save();

      expect(savedTrade.orderId).toBe(tradeData.orderId);
      expect(savedTrade.side).toBe(tradeData.side);
      expect(savedTrade.price).toBe(tradeData.price);
      expect(savedTrade.amount).toBe(tradeData.amount);
      expect(savedTrade.totalFiat).toBe(tradeData.totalFiat);
    });

    test('should validate required fields', async () => {
      const invalidTrade = new Trade({
        side: 'BUY',
        // Missing required fields
      });

      let error;
      try {
        await invalidTrade.save();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.orderId).toBeDefined();
      expect(error.errors.price).toBeDefined();
      expect(error.errors.amount).toBeDefined();
      expect(error.errors.totalFiat).toBeDefined();
    });

    test('should enforce unique orderId', async () => {
      const tradeData = {
        orderId: 'duplicate_order',
        side: 'BUY',
        price: 82.50,
        amount: 100,
        totalFiat: 8250,
        createdAt: new Date(),
        completedAt: new Date()
      };

      // Save first trade
      await new Trade(tradeData).save();

      // Try to save second trade with same orderId
      let error;
      try {
        await new Trade(tradeData).save();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB duplicate key error
    });

    test('should validate side enum values', async () => {
      const invalidTrade = new Trade({
        orderId: 'test_order_002',
        side: 'INVALID_SIDE',
        price: 82.50,
        amount: 100,
        totalFiat: 8250,
        createdAt: new Date(),
        completedAt: new Date()
      });

      let error;
      try {
        await invalidTrade.save();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.side).toBeDefined();
    });

    test('should validate status enum values', async () => {
      const invalidTrade = new Trade({
        orderId: 'test_order_003',
        side: 'BUY',
        price: 82.50,
        amount: 100,
        totalFiat: 8250,
        status: 'INVALID_STATUS',
        createdAt: new Date(),
        completedAt: new Date()
      });

      let error;
      try {
        await invalidTrade.save();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.status).toBeDefined();
    });

    test('should set default values', async () => {
      const tradeData = {
        orderId: 'test_order_004',
        side: 'BUY',
        price: 82.50,
        amount: 100,
        totalFiat: 8250,
        createdAt: new Date(),
        completedAt: new Date()
      };

      const trade = new Trade(tradeData);
      const savedTrade = await trade.save();

      expect(savedTrade.asset).toBe('USDT');
      expect(savedTrade.fiatCurrency).toBe('INR');
      expect(savedTrade.status).toBe('COMPLETED');
      expect(savedTrade.feeFiat).toBe(0);
      expect(savedTrade.paymentMethod).toBe('');
      expect(savedTrade.counterparty).toBe('');
    });
  });

  describe('Database Operations', () => {
    test('should find trades by side', async () => {
      // Create test trades
      const buyTrade = new Trade({
        orderId: 'buy_order_001',
        side: 'BUY',
        price: 82.50,
        amount: 100,
        totalFiat: 8250,
        createdAt: new Date(),
        completedAt: new Date()
      });

      const sellTrade = new Trade({
        orderId: 'sell_order_001',
        side: 'SELL',
        price: 83.20,
        amount: 50,
        totalFiat: 4160,
        createdAt: new Date(),
        completedAt: new Date()
      });

      await buyTrade.save();
      await sellTrade.save();

      // Test queries
      const buyTrades = await Trade.find({ side: 'BUY' });
      const sellTrades = await Trade.find({ side: 'SELL' });

      expect(buyTrades).toHaveLength(1);
      expect(sellTrades).toHaveLength(1);
      expect(buyTrades[0].orderId).toBe('buy_order_001');
      expect(sellTrades[0].orderId).toBe('sell_order_001');
    });

    test('should calculate virtual fields correctly', async () => {
      const trade = new Trade({
        orderId: 'test_order_005',
        side: 'BUY',
        price: 82.50,
        amount: 100,
        totalFiat: 8250,
        feeFiat: 50,
        createdAt: new Date(),
        completedAt: new Date()
      });

      const savedTrade = await trade.save();

      expect(savedTrade.netAmount).toBe(100);
      expect(savedTrade.netFiat).toBe(8200); // 8250 - 50
    });
  });
});
