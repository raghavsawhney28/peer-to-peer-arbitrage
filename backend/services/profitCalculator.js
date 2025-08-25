const Trade = require('../models/Trade');

class ProfitCalculator {
  constructor() {
    this.method = 'FIFO'; // Default method
  }

  setMethod(method) {
    if (!['FIFO', 'AVERAGE'].includes(method)) {
      throw new Error('Invalid method. Must be FIFO or AVERAGE');
    }
    this.method = method;
  }

  async calculateRealizedProfit(fiatCurrency = 'INR', fromDate = null, toDate = null) {
    try {
      // Build query for completed trades
      const query = {
        status: 'COMPLETED',
        fiatCurrency: fiatCurrency
      };

      if (fromDate || toDate) {
        query.timestamp = {};
        if (fromDate) query.timestamp.$gte = new Date(fromDate);
        if (toDate) query.timestamp.$lte = new Date(toDate);
      }

      const trades = await Trade.find(query)
        .sort({ timestamp: 1 })
        .lean();

      if (this.method === 'FIFO') {
        return this.calculateFIFOProfit(trades, fiatCurrency);
      } else {
        return this.calculateAverageProfit(trades, fiatCurrency);
      }
    } catch (error) {
      throw new Error(`Error calculating realized profit: ${error.message}`);
    }
  }

  calculateFIFOProfit(trades, fiatCurrency) {
    const buyQueue = [];
    const sellTrades = [];
    let totalBuyFiat = 0;
    let totalSellFiat = 0;
    let totalBuyAmount = 0;
    let totalSellAmount = 0;
    let realizedProfit = 0;
    let inventoryRemaining = 0;

    // Separate buys and sells, sort by timestamp
    trades.forEach(trade => {
      if (trade.type === 'BUY') {
        buyQueue.push({
          amount: trade.cryptoAmount,
          price: trade.price,
          totalFiat: trade.fiatAmount,
          timestamp: trade.timestamp
        });
        totalBuyFiat += trade.fiatAmount;
        totalBuyAmount += trade.cryptoAmount;
      } else if (trade.type === 'SELL') {
        sellTrades.push({
          amount: trade.cryptoAmount,
          price: trade.price,
          totalFiat: trade.fiatAmount,
          timestamp: trade.timestamp
        });
        totalSellFiat += trade.fiatAmount;
        totalSellAmount += trade.cryptoAmount;
      }
    });

    // Process each sell trade using FIFO
    sellTrades.forEach(sellTrade => {
      let remainingSellAmount = sellTrade.amount;
      let sellProfit = 0;

      while (remainingSellAmount > 0 && buyQueue.length > 0) {
        const buyTrade = buyQueue[0];
        const consumedAmount = Math.min(remainingSellAmount, buyTrade.amount);

        // Calculate profit for this portion
        const buyPrice = buyTrade.price;
        const sellPrice = sellTrade.price;
        const profit = (sellPrice - buyPrice) * consumedAmount;
        
        sellProfit += profit;
        remainingSellAmount -= consumedAmount;
        buyTrade.amount -= consumedAmount;

        // Remove buy trade if fully consumed
        if (buyTrade.amount <= 0) {
          buyQueue.shift();
        }
      }
      
      realizedProfit += sellProfit;
    });

    // Calculate remaining inventory
    inventoryRemaining = buyQueue.reduce((total, buy) => total + buy.amount, 0);

    // Calculate average prices
    const avgBuyPrice = totalBuyAmount > 0 ? totalBuyFiat / totalBuyAmount : 0;
    const avgSellPrice = totalSellAmount > 0 ? totalSellFiat / totalSellAmount : 0;

    return {
      realizedProfitFiat: realizedProfit,
      totalBuyFiat,
      totalSellFiat,
      totalBuyAmount,
      totalSellAmount,
      avgBuyPrice,
      avgSellPrice,
      inventoryRemaining,
      method: this.method,
      fiatCurrency: fiatCurrency
    };
  }

  calculateAverageProfit(trades, fiatCurrency) {
    let totalBuyFiat = 0;
    let totalSellFiat = 0;
    let totalBuyAmount = 0;
    let totalSellAmount = 0;
    let realizedProfit = 0;
    let inventoryRemaining = 0;

    // Calculate totals
    trades.forEach(trade => {
      if (trade.type === 'BUY') {
        totalBuyFiat += trade.fiatAmount;
        totalBuyAmount += trade.cryptoAmount;
      } else if (trade.type === 'SELL') {
        totalSellFiat += trade.fiatAmount;
        totalSellAmount += trade.cryptoAmount;
      }
    });

    // Calculate average buy price
    const avgBuyPrice = totalBuyAmount > 0 ? totalBuyFiat / totalBuyAmount : 0;
    const avgSellPrice = totalSellAmount > 0 ? totalSellFiat / totalSellAmount : 0;

    // Calculate realized profit using average cost method
    if (avgBuyPrice > 0 && totalSellAmount > 0) {
      realizedProfit = (avgSellPrice - avgBuyPrice) * totalSellAmount;
    }

    // Calculate remaining inventory
    inventoryRemaining = totalBuyAmount - totalSellAmount;

    return {
      realizedProfitFiat: realizedProfit,
      totalBuyFiat,
      totalSellFiat,
      totalBuyAmount,
      totalSellAmount,
      avgBuyPrice,
      avgSellPrice,
      inventoryRemaining,
      method: this.method,
      fiatCurrency: fiatCurrency
    };
  }

  async getProfitTimeSeries(fiatCurrency = 'INR', fromDate, toDate) {
    try {
      const query = {
        status: 'COMPLETED',
        fiatCurrency: fiatCurrency
      };

      if (fromDate || toDate) {
        query.timestamp = {};
        if (fromDate) query.timestamp.$gte = new Date(fromDate);
        if (toDate) query.timestamp.$lte = new Date(toDate);
      }

      const trades = await Trade.find(query)
        .sort({ timestamp: 1 })
        .lean();

      const timeSeries = [];
      let cumulativeProfit = 0;
      let currentInventory = 0;
      let currentCost = 0;

      trades.forEach(trade => {
        if (trade.type === 'BUY') {
          currentInventory += trade.cryptoAmount;
          currentCost += trade.fiatAmount;
        } else if (trade.type === 'SELL') {
          if (currentInventory > 0) {
            const avgCost = currentCost / currentInventory;
            const profit = (trade.price - avgCost) * Math.min(trade.cryptoAmount, currentInventory);
            cumulativeProfit += profit;
            
            const consumedAmount = Math.min(trade.cryptoAmount, currentInventory);
            currentInventory -= consumedAmount;
            currentCost = (currentCost / currentInventory) * currentInventory;
          }
        }

        timeSeries.push({
          date: trade.timestamp.toISOString().split('T')[0],
          cumulativeProfit: cumulativeProfit,
          dailyProfit: trade.type === 'SELL' ? cumulativeProfit : 0,
          inventory: currentInventory,
          avgCost: currentInventory > 0 ? currentCost / currentInventory : 0
        });
      });

      return timeSeries;
    } catch (error) {
      throw new Error(`Error getting profit time series: ${error.message}`);
    }
  }
}

module.exports = ProfitCalculator;
