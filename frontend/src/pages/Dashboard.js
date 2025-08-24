import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import dayjs from 'dayjs';
import './Dashboard.css';

const Dashboard = () => {
  const { 
    summary, 
    loading, 
    error, 
    fetchSummary, 
    fetchTrades, 
    syncMEXC,
    settings 
  } = useApp();

  const [dateRange, setDateRange] = useState({
    from: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD')
  });

  const [timeSeriesData, setTimeSeriesData] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange, settings.pnlMethod, settings.defaultFiatCurrency]);

  const loadDashboardData = async () => {
    await Promise.all([
      fetchSummary({ from: dateRange.from, to: dateRange.to }),
      fetchTrades({ from: dateRange.from, to: dateRange.to }),
      loadTimeSeriesData()
    ]);
  };

  const loadTimeSeriesData = async () => {
    try {
      const response = await fetch(`/api/pnl/timeseries?from=${dateRange.from}&to=${dateRange.to}&fiatCurrency=${settings.defaultFiatCurrency}&method=${settings.pnlMethod}`);
      const data = await response.json();
      if (data.success) {
        setTimeSeriesData(data.data.timeSeries);
      }
    } catch (error) {
      console.error('Error loading time series data:', error);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleSyncMEXC = async () => {
    try {
      await syncMEXC();
      // Data will be refreshed automatically
    } catch (error) {
      console.error('MEXC sync failed:', error);
    }
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

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
        <div className="dashboard-actions">
          <div className="date-range-selector">
            <label>From:</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => handleDateRangeChange('from', e.target.value)}
            />
            <label>To:</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => handleDateRangeChange('to', e.target.value)}
            />
          </div>
          <button 
            className="btn btn-primary"
            onClick={handleSyncMEXC}
            disabled={loading}
          >
            {loading ? 'Syncing...' : 'Sync MEXC'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {summary && (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card profit">
              <div className="kpi-icon">💰</div>
              <div className="kpi-content">
                <h3>Realized Profit</h3>
                <div className="kpi-value">
                  {formatCurrency(summary.realizedProfitFiat, summary.fiatCurrency)}
                </div>
                <div className="kpi-method">{summary.method}</div>
              </div>
            </div>

            <div className="kpi-card buys">
              <div className="kpi-icon">📈</div>
              <div className="kpi-content">
                <h3>Total Buys</h3>
                <div className="kpi-value">
                  {formatCurrency(summary.totalBuyFiat, summary.fiatCurrency)}
                </div>
                <div className="kpi-subtitle">
                  {formatNumber(summary.totalBuyAmount)} USDT
                </div>
              </div>
            </div>

            <div className="kpi-card sells">
              <div className="kpi-icon">📉</div>
              <div className="kpi-content">
                <h3>Total Sells</h3>
                <div className="kpi-value">
                  {formatCurrency(summary.totalSellFiat, summary.fiatCurrency)}
                </div>
                <div className="kpi-subtitle">
                  {formatNumber(summary.totalSellAmount)} USDT
                </div>
              </div>
            </div>

            <div className="kpi-card inventory">
              <div className="kpi-icon">🏪</div>
              <div className="kpi-content">
                <h3>Remaining USDT</h3>
                <div className="kpi-value">
                  {formatNumber(summary.inventoryRemaining)}
                </div>
                <div className="kpi-subtitle">Inventory</div>
              </div>
            </div>
          </div>

          {/* Price Averages */}
          <div className="price-averages">
            <div className="price-card">
              <h4>Average Buy Price</h4>
              <div className="price-value">
                {formatCurrency(summary.avgBuyPrice, summary.fiatCurrency)}
              </div>
            </div>
            <div className="price-card">
              <h4>Average Sell Price</h4>
              <div className="price-value">
                {formatCurrency(summary.avgSellPrice, summary.fiatCurrency)}
              </div>
            </div>
          </div>

          {/* Profit Chart */}
          <div className="chart-section">
            <h3>Profit Over Time</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => dayjs(value).format('MMM DD')}
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value, summary.fiatCurrency)}
                  />
                  <Tooltip 
                    labelFormatter={(value) => dayjs(value).format('MMM DD, YYYY')}
                    formatter={(value, name) => [
                      formatCurrency(value, summary.fiatCurrency),
                      name === 'cumulativeProfit' ? 'Cumulative Profit' : 'Daily Profit'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeProfit"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                    name="Cumulative Profit"
                  />
                  <Line
                    type="monotone"
                    dataKey="dailyProfit"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Daily Profit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {!summary && !loading && (
        <div className="no-data">
          <p>No data available. Please import trades or sync with MEXC to get started.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
