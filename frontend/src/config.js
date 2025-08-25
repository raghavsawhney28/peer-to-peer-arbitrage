// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  ENDPOINTS: {
    HEALTH: '/api/health',
    TRADES: '/api/trades',
    SUMMARY: '/api/summary',
    PNL: '/api/pnl'
  },
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3
};

export const DEFAULT_SETTINGS = {
  fiatCurrency: 'INR',
  profitCalculationMethod: 'FIFO',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  theme: 'dark'
};

export const CURRENCIES = {
  INR: { symbol: '₹', name: 'Indian Rupee' },
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' }
};

export const CRYPTO_CURRENCIES = {
  USDT: { symbol: 'USDT', name: 'Tether' },
  BTC: { symbol: 'BTC', name: 'Bitcoin' },
  ETH: { symbol: 'ETH', name: 'Ethereum' },
  BNB: { symbol: 'BNB', name: 'Binance Coin' }
};

export const PROFIT_METHODS = {
  FIFO: 'First In, First Out',
  AVERAGE: 'Average Cost'
};

// Debug configuration
export const DEBUG_CONFIG = {
  ENABLE_LOGGING: process.env.NODE_ENV === 'development',
  LOG_API_CALLS: true,
  LOG_API_RESPONSES: true,
  LOG_ERRORS: true
};

// Export default config
export default API_CONFIG;
