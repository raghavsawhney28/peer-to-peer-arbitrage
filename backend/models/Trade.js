const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  side: {
    type: String,
    required: true,
    enum: ['BUY', 'SELL'],
    index: true
  },
  asset: {
    type: String,
    default: 'USDT',
    required: true
  },
  fiatCurrency: {
    type: String,
    required: true,
    index: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  totalFiat: {
    type: Number,
    required: true,
    min: 0
  },
  feeFiat: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentMethod: {
    type: String,
    default: ''
  },
  counterparty: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    required: true,
    enum: ['COMPLETED', 'CANCELED', 'PENDING', 'FAILED'],
    default: 'COMPLETED',
    index: true
  },
  createdAt: {
    type: Date,
    required: true,
    index: true
  },
  completedAt: {
    type: Date,
    required: true,
    index: true
  },
  raw: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
tradeSchema.index({ side: 1, status: 1, completedAt: 1 });
tradeSchema.index({ fiatCurrency: 1, side: 1, completedAt: 1 });
tradeSchema.index({ asset: 1, side: 1, completedAt: 1 });

// Virtual for net amount (amount - fees)
tradeSchema.virtual('netAmount').get(function() {
  return this.amount;
});

// Virtual for net fiat value
tradeSchema.virtual('netFiat').get(function() {
  return this.totalFiat - this.feeFiat;
});

// Ensure virtuals are serialized
tradeSchema.set('toJSON', { virtuals: true });
tradeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Trade', tradeSchema);
