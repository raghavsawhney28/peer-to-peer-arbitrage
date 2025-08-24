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
        query.completedAt = {};
        if (fromDate) query.completedAt.$gte = new Date(fromDate);
        if (toDate) query.completedAt.$lte = new Date(toDate);
      }

      const trades = await Trade.find(query)
        .sort({ completedAt: 1 })
        .lean();

      if (this.method === 'FIFO') {
        return this.calculateFIFOProfit(trades);
      } else {
        return this.calculateAverageProfit(trades);
      }
    } catch (error) {
      throw new Error(`Error calculating realized profit: ${error.message}`);
    }
  }

  calculateFIFOProfit(trades) {
    const buyQueue = [];
    const sellTrades = [];
    let totalBuyFiat = 0;
    let totalSellFiat = 0;
    let totalBuyAmount = 0;
    let totalSellAmount = 0;
    let realizedProfit = 0;
    let inventoryRemaining = 0;

    // Separate buys and sells, sort by completion time
    trades.forEach(trade => {
      if (trade.side === 'BUY') {
        buyQueue.push({
          amount: trade.amount,
          price: trade.price,
          totalFiat: trade.totalFiat,
          feeFiat: trade.feeFiat || 0,
          completedAt: trade.completedAt
        });
        totalBuyFiat += trade.totalFiat;
        totalBuyAmount += trade.amount;
      } else if (trade.side === 'SELL') {
        sellTrades.push({
          amount: trade.amount,
          price: trade.price,
          totalFiat: trade.totalFiat,
          feeFiat: trade.feeFiat || 0,
          completedAt: trade.completedAt
        });
        totalSellFiat += trade.totalFiat;
        totalSellAmount += trade.amount;
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
        
        // Subtract proportional fees
        const buyFeeProportion = (consumedAmount / buyTrade.amount) * buyTrade.feeFiat;
        const sellFeeProportion = (consumedAmount / sellTrade.amount) * sellTrade.feeFiat;
        const netProfit = profit - buyFeeProportion - sellFeeProportion;

        sellProfit += netProfit;
        remainingSellAmount -= consumedAmount;
        buyTrade.amount -= consumedAmount;

        // Remove buy trade if fully consumed
        if (buyTrade.amount === 0) {
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
      realizedProfitFiat: Math.round(realizedProfit * 100) / 100,
      totalBuyFiat: Math.round(totalBuyFiat * 100) / 100,
      totalSellFiat: Math.round(totalSellFiat * 100) / 100,
      totalBuyAmount: Math.round(totalBuyAmount * 100) / 100,
      totalSellAmount: Math.round(totalSellAmount * 100) / 100,
      avgBuyPrice: Math.round(avgBuyPrice * 100) / 100,
      avgSellPrice: Math.round(avgSellPrice * 100) / 100,
      inventoryRemaining: Math.round(inventoryRemaining * 100) / 100,
      method: 'FIFO'
    };
  }

  calculateAverageProfit(trades) {
    let totalBuyFiat = 0;
    let totalSellFiat = 0;
    let totalBuyAmount = 0;
    let totalSellAmount = 0;
    let realizedProfit = 0;
    let inventoryRemaining = 0;
    let weightedAverageCost = 0;

    trades.forEach(trade => {
      if (trade.side === 'BUY') {
        // Update weighted average cost
        const newTotalCost = totalBuyFiat + trade.totalFiat;
        const newTotalAmount = totalBuyAmount + trade.amount;
        weightedAverageCost = newTotalCost / newTotalAmount;

        totalBuyFiat += trade.totalFiat;
        totalBuyAmount += trade.amount;
      } else if (trade.side === 'SELL') {
        // Calculate profit using weighted average cost
        const sellAmount = trade.amount;
        const sellPrice = trade.price;
        const buyPrice = weightedAverageCost;
        
        const grossProfit = (sellPrice - buyPrice) * sellAmount;
        const totalFees = (trade.feeFiat || 0) + 
          (weightedAverageCost > 0 ? (sellAmount / totalBuyAmount) * (totalBuyFiat - totalBuyAmount * weightedAverageCost) : 0);
        
        const netProfit = grossProfit - totalFees;
        realizedProfit += netProfit;

        totalSellFiat += trade.totalFiat;
        totalSellAmount += sellAmount;
        totalBuyAmount -= sellAmount;
      }
    });

    inventoryRemaining = totalBuyAmount;
    const avgBuyPrice = totalBuyAmount > 0 ? totalBuyFiat / totalBuyAmount : 0;
    const avgSellPrice = totalSellAmount > 0 ? totalSellFiat / totalSellAmount : 0;

    return {
      realizedProfitFiat: Math.round(realizedProfit * 100) / 100,
      totalBuyFiat: Math.round(totalBuyFiat * 100) / 100,
      totalSellFiat: Math.round(totalSellFiat * 100) / 100,
      totalBuyAmount: Math.round(totalBuyAmount * 100) / 100,
      totalSellAmount: Math.round(totalSellAmount * 100) / 100,
      avgBuyPrice: Math.round(avgBuyPrice * 100) / 100,
      avgSellPrice: Math.round(avgSellPrice * 100) / 100,
      inventoryRemaining: Math.round(inventoryRemaining * 100) / 100,
      method: 'AVERAGE'
    };
  }

  async getProfitTimeSeries(fiatCurrency = 'INR', fromDate = null, toDate = null) {
    try {
      const query = {
        status: 'COMPLETED',
        fiatCurrency: fiatCurrency
      };

      if (fromDate || toDate) {
        query.completedAt = {};
        if (fromDate) query.completedAt.$gte = new Date(fromDate);
        if (toDate) query.completedAt.$lte = new Date(toDate);
      }

      const trades = await Trade.find(query)
        .sort({ completedAt: 1 })
        .lean();

      const dailyProfits = {};
      let cumulativeProfit = 0;

      trades.forEach(trade => {
        const date = trade.completedAt.toISOString().split('T')[0];
        
        if (!dailyProfits[date]) {
          dailyProfits[date] = {
            date,
            buyAmount: 0,
            sellAmount: 0,
            buyFiat: 0,
            sellFiat: 0,
            dailyProfit: 0,
            cumulativeProfit: 0
          };
        }

        if (trade.side === 'BUY') {
          dailyProfits[date].buyAmount += trade.amount;
          dailyProfits[date].buyFiat += trade.totalFiat;
        } else {
          dailyProfits[date].sellAmount += trade.amount;
          dailyProfits[date].sellFiat += trade.totalFiat;
        }
      });

      // Calculate daily and cumulative profits
      Object.keys(dailyProfits).sort().forEach(date => {
        const day = dailyProfits[date];
        
        // Calculate profit for this day using the selected method
        const dayTrades = trades.filter(t => 
          t.completedAt.toISOString().split('T')[0] === date
        );
        
        if (this.method === 'FIFO') {
          day.dailyProfit = this.calculateFIFOProfit(dayTrades).realizedProfitFiat;
        } else {
          day.dailyProfit = this.calculateAverageProfit(dayTrades).realizedProfitFiat;
        }
        
        cumulativeProfit += day.dailyProfit;
        day.cumulativeProfit = cumulativeProfit;
      });

      return Object.values(dailyProfits).sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
      throw new Error(`Error calculating profit time series: ${error.message}`);
    }
  }
}

module.exports = new ProfitCalculator();
