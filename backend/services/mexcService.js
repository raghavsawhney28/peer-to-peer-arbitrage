const axios = require('axios');
const crypto = require('crypto');
const Trade = require('../models/Trade');

class MEXCService {
  constructor() {
    this.baseURL = 'https://www.mexc.com';
    this.apiKey = process.env.MEXC_API_KEY;
    this.apiSecret = process.env.MEXC_API_SECRET;
  }

  // Generate signature for MEXC API requests
  generateSignature(params, timestamp) {
    const queryString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const signString = `${queryString}&timestamp=${timestamp}`;
    return crypto.createHmac('sha256', this.apiSecret).update(signString).digest('hex');
  }

  // Make signed request to MEXC API
  async makeSignedRequest(endpoint, params = {}) {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('MEXC API credentials not configured');
    }

    const timestamp = Date.now();
    const signature = this.generateSignature(params, timestamp);

    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseURL}${endpoint}`,
        params: {
          ...params,
          timestamp,
          signature
        },
        headers: {
          'X-MEXC-APIKEY': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`MEXC API Error: ${error.response.status} - ${error.response.data?.msg || 'Unknown error'}`);
      } else if (error.request) {
        throw new Error('MEXC API request timeout or network error');
      } else {
        throw new Error(`MEXC API Error: ${error.message}`);
      }
    }
  }

  // Fetch P2P trade history (this is a placeholder - MEXC may not have this endpoint)
  async fetchP2PHistory(page = 1, limit = 100) {
    try {
      // Note: MEXC may not have a direct P2P trade history endpoint
      // This is a placeholder implementation
      const params = {
        page,
        limit,
        type: 'P2P'
      };

      const response = await this.makeSignedRequest('/api/v1/p2p/orders', params);
      return response;
    } catch (error) {
      // If P2P endpoint doesn't exist, return empty result
      if (error.message.includes('404') || error.message.includes('not found')) {
        console.log('MEXC P2P endpoint not available, falling back to CSV import');
        return { data: [], total: 0 };
      }
      throw error;
    }
  }

  // Alternative: Fetch general order history and filter for P2P
  async fetchOrderHistory(page = 1, limit = 100) {
    try {
      const params = {
        page,
        limit,
        status: 'COMPLETED'
      };

      const response = await this.makeSignedRequest('/api/v1/orders', params);
      return response;
    } catch (error) {
      // If orders endpoint doesn't exist, return empty result
      if (error.message.includes('404') || error.message.includes('not found')) {
        console.log('MEXC orders endpoint not available, falling back to CSV import');
        return { data: [], total: 0 };
      }
      throw error;
    }
  }

  // Sync trades from MEXC API to local database
  async syncTrades() {
    try {
      console.log('Starting MEXC trade sync...');
      
      let allTrades = [];
      let page = 1;
      let hasMore = true;
      const limit = 100;

      // Try P2P endpoint first
      try {
        while (hasMore) {
          const response = await this.fetchP2PHistory(page, limit);
          
          if (response.data && response.data.length > 0) {
            allTrades = allTrades.concat(response.data);
            page++;
            hasMore = response.data.length === limit;
          } else {
            hasMore = false;
          }
        }
      } catch (error) {
        console.log('P2P endpoint failed, trying general orders endpoint...');
        
        // Fallback to general orders endpoint
        page = 1;
        hasMore = true;
        
        while (hasMore) {
          const response = await this.fetchOrderHistory(page, limit);
          
          if (response.data && response.data.length > 0) {
            // Filter for P2P-like orders (you may need to adjust this logic)
            const p2pTrades = response.data.filter(order => 
              order.type === 'P2P' || 
              order.symbol?.includes('USDT') ||
              order.side === 'BUY' || order.side === 'SELL'
            );
            
            allTrades = allTrades.concat(p2pTrades);
            page++;
            hasMore = response.data.length === limit;
          } else {
            hasMore = false;
          }
        }
      }

      if (allTrades.length === 0) {
        console.log('No trades found from MEXC API');
        return { synced: 0, total: 0 };
      }

      console.log(`Found ${allTrades.length} trades from MEXC API`);

      // Transform and save trades
      let syncedCount = 0;
      for (const trade of allTrades) {
        try {
          const transformedTrade = this.transformMEXCTrade(trade);
          if (transformedTrade) {
            await Trade.findOneAndUpdate(
              { orderId: transformedTrade.orderId },
              transformedTrade,
              { upsert: true, new: true }
            );
            syncedCount++;
          }
        } catch (error) {
          console.error(`Error processing trade ${trade.id}:`, error.message);
        }
      }

      console.log(`Successfully synced ${syncedCount} trades`);
      return { synced: syncedCount, total: allTrades.length };

    } catch (error) {
      console.error('MEXC sync error:', error.message);
      throw new Error(`Failed to sync MEXC trades: ${error.message}`);
    }
  }

  // Transform MEXC API trade data to our schema
  transformMEXCTrade(mexcTrade) {
    try {
      // This is a placeholder transformation - adjust based on actual MEXC API response
      const trade = {
        orderId: mexcTrade.id || mexcTrade.orderId || `mexc_${Date.now()}_${Math.random()}`,
        side: mexcTrade.side?.toUpperCase() || 'BUY',
        asset: mexcTrade.symbol?.replace(/USDT$/, '') || 'USDT',
        fiatCurrency: mexcTrade.quoteCurrency || 'INR',
        price: parseFloat(mexcTrade.price) || 0,
        amount: parseFloat(mexcTrade.amount) || 0,
        totalFiat: parseFloat(mexcTrade.quoteAmount) || 0,
        feeFiat: parseFloat(mexcTrade.fee) || 0,
        paymentMethod: mexcTrade.paymentMethod || '',
        counterparty: mexcTrade.counterparty || '',
        status: mexcTrade.status?.toUpperCase() || 'COMPLETED',
        createdAt: new Date(mexcTrade.createTime || mexcTrade.timestamp || Date.now()),
        completedAt: new Date(mexcTrade.updateTime || mexcTrade.completeTime || Date.now()),
        raw: mexcTrade
      };

      // Validate required fields
      if (!trade.orderId || !trade.side || trade.price <= 0 || trade.amount <= 0) {
        console.log(`Skipping invalid trade: ${JSON.stringify(trade)}`);
        return null;
      }

      return trade;
    } catch (error) {
      console.error('Error transforming MEXC trade:', error);
      return null;
    }
  }

  // Test API connection
  async testConnection() {
    try {
      const response = await this.makeSignedRequest('/api/v1/account');
      return { success: true, message: 'MEXC API connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new MEXCService();
