const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  fiatCurrency: {
    type: String,
    default: 'INR',
    required: true
  },
  fiatAmount: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  cryptoAmount: {
    type: Number,
    required: true,
    min: 0
  },
  cryptoCurrency: {
    type: String,
    default: 'USDT',
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['COMPLETED', 'PENDING', 'CANCELLED'],
    default: 'COMPLETED'
  }
}, {
  timestamps: true
});

// Index for efficient queries
tradeSchema.index({ type: 1, timestamp: 1 });
tradeSchema.index({ fiatCurrency: 1, timestamp: 1 });
tradeSchema.index({ status: 1 });

// Virtual field for total value
tradeSchema.virtual('totalValue').get(function() {
  return this.fiatAmount;
});

// Virtual field for formatted timestamp
tradeSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
});

// Ensure virtual fields are serialized
tradeSchema.set('toJSON', { virtuals: true });
tradeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Trade', tradeSchema);
