import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { API_CONFIG, CURRENCIES, CRYPTO_CURRENCIES } from '../config';
import TradeForm from '../components/TradeForm';
import './Trades.css';

const Trades = () => {
  const { settings } = useApp();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    fiatCurrency: settings.fiatCurrency || 'INR',
    cryptoCurrency: 'USDT',
    status: '',
    fromDate: '',
    toDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  // Fetch trades with filters and pagination
  const fetchTrades = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.type && { type: filters.type }),
        ...(filters.fiatCurrency && { fiatCurrency: filters.fiatCurrency }),
        ...(filters.cryptoCurrency && { cryptoCurrency: filters.cryptoCurrency }),
        ...(filters.status && { status: filters.status }),
        ...(filters.fromDate && { fromDate: filters.fromDate }),
        ...(filters.toDate && { toDate: filters.toDate })
      });

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRADES}?${queryParams}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch trades');
      }

      setTrades(result.data);
      setPagination(prev => ({
        ...prev,
        page: result.pagination.page,
        total: result.pagination.total,
        pages: result.pagination.pages
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  // Load trades on component mount and when filters change
  useEffect(() => {
    fetchTrades(1);
  }, [fetchTrades]);

  // Handle trade added
  const handleTradeAdded = useCallback((newTrade) => {
    setTrades(prev => [newTrade, ...prev]);
    setShowForm(false);
    // Refresh the list to get updated pagination
    fetchTrades(1);
  }, [fetchTrades]);

  // Handle trade deletion
  const handleDeleteTrade = useCallback(async (tradeId) => {
    if (!window.confirm('Are you sure you want to delete this trade?')) {
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRADES}/${tradeId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to delete trade');
      }

      // Remove trade from state
      setTrades(prev => prev.filter(trade => trade._id !== tradeId));
      
      // Refresh the list to get updated pagination
      fetchTrades(pagination.page);
    } catch (err) {
      setError(err.message);
    }
  }, [pagination.page, fetchTrades]);

  // Handle filter changes
  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchTrades(newPage);
  }, [fetchTrades]);

  // Format currency
  const formatCurrency = useCallback((amount, currency = 'INR') => {
    const symbol = CURRENCIES[currency]?.symbol || currency;
    return `${symbol}${parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }, []);

  // Format crypto amount
  const formatCrypto = useCallback((amount, currency = 'USDT') => {
    return `${parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6
    })} ${currency}`;
  }, []);

  // Format timestamp
  const formatTimestamp = useCallback((timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  // Calculate total values
  const totals = useMemo(() => {
    return trades.reduce((acc, trade) => {
      if (trade.type === 'BUY') {
        acc.totalBuyFiat += trade.fiatAmount;
        acc.totalBuyCrypto += trade.cryptoAmount;
      } else {
        acc.totalSellFiat += trade.fiatAmount;
        acc.totalSellCrypto += trade.cryptoAmount;
      }
      return acc;
    }, {
      totalBuyFiat: 0,
      totalSellFiat: 0,
      totalBuyCrypto: 0,
      totalSellCrypto: 0
    });
  }, [trades]);

  if (loading && trades.length === 0) {
    return (
      <div className="trades-page">
        <div className="loading">Loading trades...</div>
      </div>
    );
  }

  return (
    <div className="trades-page">
      <div className="trades-header">
        <div className="header-content">
          <h1>Trade History</h1>
          <p>Manage and track your P2P trades</p>
        </div>
        <button
          className="btn btn-primary add-trade-btn"
          onClick={() => setShowForm(true)}
        >
          + Add Trade
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Type</label>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="filter-control"
            >
              <option value="">All Types</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Fiat Currency</label>
            <select
              name="fiatCurrency"
              value={filters.fiatCurrency}
              onChange={handleFilterChange}
              className="filter-control"
            >
              {Object.entries(CURRENCIES).map(([code, currency]) => (
                <option key={code} value={code}>
                  {code} - {currency.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Crypto Currency</label>
            <select
              name="cryptoCurrency"
              value={filters.cryptoCurrency}
              onChange={handleFilterChange}
              className="filter-control"
            >
              {Object.entries(CRYPTO_CURRENCIES).map(([code, crypto]) => (
                <option key={code} value={code}>
                  {code} - {crypto.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="filter-control"
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              name="fromDate"
              value={filters.fromDate}
              onChange={handleFilterChange}
              className="filter-control"
            />
          </div>

          <div className="filter-group">
            <label>To Date</label>
            <input
              type="date"
              name="toDate"
              value={filters.toDate}
              onChange={handleFilterChange}
              className="filter-control"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Buy</h3>
          <div className="card-value">
            <div className="fiat-amount">{formatCurrency(totals.totalBuyFiat, filters.fiatCurrency)}</div>
            <div className="crypto-amount">{formatCrypto(totals.totalBuyCrypto, filters.cryptoCurrency)}</div>
          </div>
        </div>

        <div className="summary-card">
          <h3>Total Sell</h3>
          <div className="card-value">
            <div className="fiat-amount">{formatCurrency(totals.totalSellFiat, filters.fiatCurrency)}</div>
            <div className="crypto-amount">{formatCrypto(totals.totalSellCrypto, filters.cryptoCurrency)}</div>
          </div>
        </div>

        <div className="summary-card">
          <h3>Total Trades</h3>
          <div className="card-value">
            <div className="trade-count">{trades.length}</div>
            <div className="trade-label">trades</div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Trades Table */}
      <div className="trades-table-container">
        {trades.length === 0 ? (
          <div className="no-trades">
            <p>No trades found. Add your first trade to get started!</p>
          </div>
        ) : (
          <table className="trades-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Date & Time</th>
                <th>Fiat Amount</th>
                <th>Price</th>
                <th>Crypto Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade._id} className={`trade-row trade-${trade.type.toLowerCase()}`}>
                  <td>
                    <span className={`trade-type ${trade.type.toLowerCase()}`}>
                      {trade.type}
                    </span>
                  </td>
                  <td>{formatTimestamp(trade.timestamp)}</td>
                  <td>{formatCurrency(trade.fiatAmount, trade.fiatCurrency)}</td>
                  <td>{formatCurrency(trade.price, trade.fiatCurrency)}</td>
                  <td>{formatCrypto(trade.cryptoAmount, trade.cryptoCurrency)}</td>
                  <td>
                    <span className={`status-badge status-${trade.status.toLowerCase()}`}>
                      {trade.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteTrade(trade._id)}
                      title="Delete trade"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Previous
          </button>
          
          <span className="page-info">
            Page {pagination.page} of {pagination.pages}
          </span>
          
          <button
            className="btn btn-secondary"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
          >
            Next
          </button>
        </div>
      )}

      {/* Trade Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <TradeForm
              onTradeAdded={handleTradeAdded}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Trades;
