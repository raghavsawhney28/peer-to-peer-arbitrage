import React, { useState, useCallback } from 'react';
import { API_CONFIG, CURRENCIES, CRYPTO_CURRENCIES } from '../config';
import './TradeForm.css';

const TradeForm = ({ onTradeAdded, onCancel }) => {
  const [formData, setFormData] = useState({
    type: 'BUY',
    timestamp: new Date().toISOString().slice(0, 16),
    fiatCurrency: 'INR',
    fiatAmount: '',
    price: '',
    cryptoAmount: '',
    cryptoCurrency: 'USDT',
    notes: '',
    status: 'COMPLETED'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-calculate crypto amount when fiat amount and price change
    if (name === 'fiatAmount' || name === 'price') {
      if (formData.fiatAmount && formData.price) {
        const fiatAmount = name === 'fiatAmount' ? value : formData.fiatAmount;
        const price = name === 'price' ? value : formData.price;
        
        if (fiatAmount && price && !isNaN(fiatAmount) && !isNaN(price)) {
          const cryptoAmount = (parseFloat(fiatAmount) / parseFloat(price)).toFixed(6);
          setFormData(prev => ({
            ...prev,
            cryptoAmount: cryptoAmount
          }));
        }
      }
    }

    // Auto-calculate fiat amount when crypto amount and price change
    if (name === 'cryptoAmount' || name === 'price') {
      if (formData.cryptoAmount && formData.price) {
        const cryptoAmount = name === 'cryptoAmount' ? value : formData.cryptoAmount;
        const price = name === 'price' ? value : formData.price;
        
        if (cryptoAmount && price && !isNaN(cryptoAmount) && !isNaN(price)) {
          const fiatAmount = (parseFloat(cryptoAmount) * parseFloat(price)).toFixed(2);
          setFormData(prev => ({
            ...prev,
            fiatAmount: fiatAmount
          }));
        }
      }
    }
  }, [formData.fiatAmount, formData.price, formData.cryptoAmount]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRADES}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create trade');
      }

      // Reset form
      setFormData({
        type: 'BUY',
        timestamp: new Date().toISOString().slice(0, 16),
        fiatCurrency: 'INR',
        fiatAmount: '',
        price: '',
        cryptoAmount: '',
        cryptoCurrency: 'USDT',
        notes: '',
        status: 'COMPLETED'
      });

      // Notify parent component
      if (onTradeAdded) {
        onTradeAdded(result.data);
      }

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [formData, onTradeAdded]);

  const handleReset = useCallback(() => {
    setFormData({
      type: 'BUY',
      timestamp: new Date().toISOString().slice(0, 16),
      fiatCurrency: 'INR',
      fiatAmount: '',
      price: '',
      cryptoAmount: '',
      cryptoCurrency: 'USDT',
      notes: '',
      status: 'COMPLETED'
    });
    setError('');
  }, []);

  return (
    <div className="trade-form-container">
      <div className="trade-form-header">
        <h2>Add New Trade</h2>
        <button 
          type="button" 
          className="close-btn"
          onClick={onCancel}
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="trade-form">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="type">Trade Type *</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
              className="form-control"
            >
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="timestamp">Date & Time *</label>
            <input
              type="datetime-local"
              id="timestamp"
              name="timestamp"
              value={formData.timestamp}
              onChange={handleInputChange}
              required
              className="form-control"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="fiatCurrency">Fiat Currency</label>
            <select
              id="fiatCurrency"
              name="fiatCurrency"
              value={formData.fiatCurrency}
              onChange={handleInputChange}
              className="form-control"
            >
              {Object.entries(CURRENCIES).map(([code, currency]) => (
                <option key={code} value={code}>
                  {code} - {currency.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="fiatAmount">Fiat Amount *</label>
            <input
              type="number"
              id="fiatAmount"
              name="fiatAmount"
              value={formData.fiatAmount}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
              className="form-control"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="price">Price per {formData.cryptoCurrency} *</label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="cryptoCurrency">Crypto Currency</label>
            <select
              id="cryptoCurrency"
              name="cryptoCurrency"
              value={formData.cryptoCurrency}
              onChange={handleInputChange}
              className="form-control"
            >
              {Object.entries(CRYPTO_CURRENCIES).map(([code, crypto]) => (
                <option key={code} value={code}>
                  {code} - {crypto.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="cryptoAmount">Crypto Amount *</label>
            <input
              type="number"
              id="cryptoAmount"
              name="cryptoAmount"
              value={formData.cryptoAmount}
              onChange={handleInputChange}
              placeholder="0.000000"
              step="0.000001"
              min="0"
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="form-control"
            >
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Optional notes about this trade..."
            rows="3"
            className="form-control"
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-secondary"
            disabled={loading}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`btn btn-primary ${formData.type === 'BUY' ? 'btn-buy' : 'btn-sell'}`}
            disabled={loading}
          >
            {loading ? 'Adding...' : `Add ${formData.type}`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TradeForm;
