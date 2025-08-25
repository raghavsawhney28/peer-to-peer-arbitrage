import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const {
    summary,
    loading,
    error,
    fetchSummary,
    settings
  } = useApp();

  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('7d');
  const [timeSeriesData, setTimeSeriesData] = useState([]);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      await fetchSummary(settings.fiatCurrency || 'INR', settings.profitCalculationMethod || 'FIFO');
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, [fetchSummary, settings.fiatCurrency, settings.profitCalculationMethod]);

  // Load time series data
  const loadTimeSeriesData = useCallback(async () => {
    try {
      const from = new Date();
      const to = new Date();
      
      switch (dateRange) {
        case '7d':
          from.setDate(from.getDate() - 7);
          break;
        case '30d':
          from.setDate(from.getDate() - 30);
          break;
        case '90d':
          from.setDate(from.getDate() - 90);
          break;
        default:
          from.setDate(from.getDate() - 7);
      }

      const response = await fetch(`http://localhost:5000/api/pnl/timeseries?from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}&fiatCurrency=${settings.fiatCurrency || 'INR'}&method=${settings.profitCalculationMethod || 'FIFO'}`);
      const result = await response.json();

      if (response.ok) {
        setTimeSeriesData(result.data);
      }
    } catch (error) {
      console.error('Failed to load time series data:', error);
    }
  }, [dateRange, settings.fiatCurrency, settings.profitCalculationMethod]);

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Load time series data when date range changes
  useEffect(() => {
    loadTimeSeriesData();
  }, [loadTimeSeriesData]);

  // Handle date range change
  const handleDateRangeChange = useCallback((newRange) => {
    setDateRange(newRange);
  }, []);

  // Format currency
  const formatCurrency = useCallback((amount, currency = 'INR') => {
    const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
    const symbol = symbols[currency] || currency;
    return `${symbol}${parseFloat(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }, []);

  // Format number
  const formatNumber = useCallback((number, decimals = 2) => {
    return parseFloat(number || 0).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }, []);

  // Chart data
  const chartData = useMemo(() => {
    return timeSeriesData.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      cumulativeProfit: item.cumulativeProfit || 0
    }));
  }, [timeSeriesData]);

  // Navigate to trades page
  const handleAddTrade = useCallback(() => {
    navigate('/trades');
  }, [navigate]);

  if (loading && !summary) {
    return (
      <div className="dashboard">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Track your P2P arbitrage performance</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {!summary && !loading && (
        <div className="no-data">
          <p>No data available. Add your first trade to get started!</p>
          <button 
            className="btn btn-primary add-trade-btn"
            onClick={handleAddTrade}
          >
            + Add Trade
          </button>
        </div>
      )}

      {summary && (
        <>
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card profit">
              <h3>Realized Profit</h3>
              <div className="card-value">
                {formatCurrency(summary.realizedProfitFiat, summary.fiatCurrency)}
              </div>
              <div className="card-subtitle">
                {summary.method} Method
              </div>
            </div>

            <div className="summary-card buy">
              <h3>Total Buy</h3>
              <div className="card-value">
                {formatCurrency(summary.totalBuyFiat, summary.fiatCurrency)}
              </div>
              <div className="card-subtitle">
                {formatNumber(summary.totalBuyAmount, 6)} {summary.cryptoCurrency || 'USDT'}
              </div>
            </div>

            <div className="summary-card sell">
              <h3>Total Sell</h3>
              <div className="card-value">
                {formatCurrency(summary.totalSellFiat, summary.fiatCurrency)}
              </div>
              <div className="card-subtitle">
                {formatNumber(summary.totalSellAmount, 6)} {summary.cryptoCurrency || 'USDT'}
              </div>
            </div>

            <div className="summary-card inventory">
              <h3>Inventory</h3>
              <div className="card-value">
                {formatNumber(summary.inventoryRemaining, 6)} {summary.cryptoCurrency || 'USDT'}
              </div>
              <div className="card-subtitle">
                Remaining
              </div>
            </div>
          </div>

          {/* Price Averages */}
          <div className="price-averages">
            <div className="average-card">
              <h3>Average Buy Price</h3>
              <div className="average-value">
                {formatCurrency(summary.avgBuyPrice, summary.fiatCurrency)}
              </div>
            </div>
            <div className="average-card">
              <h3>Average Sell Price</h3>
              <div className="average-value">
                {formatCurrency(summary.avgSellPrice, summary.fiatCurrency)}
              </div>
            </div>
          </div>

          {/* Profit Chart */}
          <div className="chart-section">
            <div className="chart-header">
              <h3>Profit Over Time</h3>
              <div className="date-range-selector">
                <button
                  className={`range-btn ${dateRange === '7d' ? 'active' : ''}`}
                  onClick={() => handleDateRangeChange('7d')}
                >
                  7D
                </button>
                <button
                  className={`range-btn ${dateRange === '30d' ? 'active' : ''}`}
                  onClick={() => handleDateRangeChange('30d')}
                >
                  30D
                </button>
                <button
                  className={`range-btn ${dateRange === '90d' ? 'active' : ''}`}
                  onClick={() => handleDateRangeChange('90d')}
                >
                  90D
                </button>
              </div>
            </div>
            
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#888"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#888"
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value, summary.fiatCurrency)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value) => [formatCurrency(value, summary.fiatCurrency), 'Profit']}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeProfit"
                    stroke="#007bff"
                    fill="#007bff"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
