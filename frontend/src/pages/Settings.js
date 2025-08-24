import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import axios from 'axios';
import './Settings.css';

const Settings = () => {
  const { settings, updateSettings, mexcStatus, checkMEXCStatus } = useApp();
  const [localSettings, setLocalSettings] = useState(settings);
  const [availableMethods, setAvailableMethods] = useState([]);
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadAvailableOptions();
  }, []);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const loadAvailableOptions = async () => {
    try {
      const [methodsResponse, currenciesResponse] = await Promise.all([
        axios.get('/api/summary/methods'),
        axios.get('/api/summary/currencies')
      ]);

      if (methodsResponse.data.success) {
        setAvailableMethods(methodsResponse.data.data);
      }

      if (currenciesResponse.data.success) {
        setAvailableCurrencies(currenciesResponse.data.data);
      }
    } catch (error) {
      console.error('Failed to load available options:', error);
    }
  };

  const handleSettingChange = (field, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      updateSettings(localSettings);
      setSuccess('Settings saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSettings = () => {
    setLocalSettings(settings);
    setError(null);
    setSuccess(null);
  };

  const testMEXCConnection = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.get('/api/mexc/test');
      if (response.data.success) {
        setSuccess('MEXC API connection successful!');
        await checkMEXCStatus(); // Refresh status
      } else {
        setError('MEXC API connection failed: ' + response.data.message);
      }
    } catch (error) {
      setError('MEXC API connection failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings);

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Configure your P2P arbitrage tracking preferences</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      <div className="settings-content">
        {/* P&L Calculation Method */}
        <div className="settings-section">
          <h3>Profit & Loss Calculation</h3>
          <p>Choose how to calculate realized profits from your trades.</p>
          
          <div className="setting-group">
            <label>P&L Method:</label>
            <select
              value={localSettings.pnlMethod}
              onChange={(e) => handleSettingChange('pnlMethod', e.target.value)}
            >
              {availableMethods.map(method => (
                <option key={method.key} value={method.key}>
                  {method.name}
                </option>
              ))}
            </select>
            <div className="setting-description">
              {availableMethods.find(m => m.key === localSettings.pnlMethod)?.description}
            </div>
          </div>
        </div>

        {/* Default Currency */}
        <div className="settings-section">
          <h3>Default Currency</h3>
          <p>Set your preferred fiat currency for calculations and display.</p>
          
          <div className="setting-group">
            <label>Default Fiat Currency:</label>
            <select
              value={localSettings.defaultFiatCurrency}
              onChange={(e) => handleSettingChange('defaultFiatCurrency', e.target.value)}
            >
              {availableCurrencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.name} ({currency.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* MEXC API Status */}
        <div className="settings-section">
          <h3>MEXC API Integration</h3>
          <p>Configure and test your MEXC API connection for automatic trade syncing.</p>
          
          <div className="mexc-status">
            <div className="status-info">
              <div className="status-item">
                <span className="status-label">API Credentials:</span>
                <span className={`status-value ${mexcStatus.hasCredentials ? 'connected' : 'disconnected'}`}>
                  {mexcStatus.hasCredentials ? 'Configured' : 'Not Configured'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Connection:</span>
                <span className={`status-value ${mexcStatus.connected ? 'connected' : 'disconnected'}`}>
                  {mexcStatus.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            
            <div className="mexc-actions">
              <button 
                className="btn btn-secondary"
                onClick={testMEXCConnection}
                disabled={loading || !mexcStatus.hasCredentials}
              >
                {loading ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>

          <div className="mexc-help">
            <h4>How to configure MEXC API:</h4>
            <ol>
              <li>Log in to your MEXC account</li>
              <li>Go to API Management</li>
              <li>Create a new API key with trading permissions</li>
              <li>Add the API key and secret to your backend .env file</li>
              <li>Restart the backend server</li>
            </ol>
          </div>
        </div>

        {/* Actions */}
        <div className="settings-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleResetSettings}
            disabled={!hasChanges}
          >
            Reset Changes
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleSaveSettings}
            disabled={!hasChanges || loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
