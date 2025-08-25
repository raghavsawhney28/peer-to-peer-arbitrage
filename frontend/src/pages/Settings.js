import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import axios from 'axios';
import './Settings.css';

const Settings = () => {
  const { settings, updateSettings } = useApp();
  const [localSettings, setLocalSettings] = useState(settings);
  const [availableMethods, setAvailableMethods] = useState([]);
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadAvailableOptions = useCallback(async () => {
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
  }, []);

  // Load available options on mount
  useEffect(() => {
    loadAvailableOptions();
  }, [loadAvailableOptions]);

  // Update local settings when global settings change (but only if they're different)
  useEffect(() => {
    if (JSON.stringify(settings) !== JSON.stringify(localSettings)) {
      setLocalSettings(settings);
    }
  }, [settings, localSettings]);

  const handleSettingChange = useCallback((field, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleSaveSettings = useCallback(async () => {
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
  }, [localSettings, updateSettings]);

  const handleResetSettings = useCallback(() => {
    setLocalSettings(settings);
    setError(null);
    setSuccess(null);
  }, [settings]);

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
