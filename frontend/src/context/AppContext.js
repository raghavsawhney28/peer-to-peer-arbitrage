import React, { createContext, useContext, useReducer, useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { API_CONFIG, DEBUG_CONFIG } from '../config';

// Configure axios base URL
axios.defaults.baseURL = API_CONFIG.BASE_URL;
axios.defaults.timeout = API_CONFIG.TIMEOUT;

// Add request interceptor for logging
if (DEBUG_CONFIG.LOG_API_CALLS) {
  axios.interceptors.request.use(
    (config) => {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        baseURL: config.baseURL,
        params: config.params,
        data: config.data
      });
      return config;
    },
    (error) => {
      console.error('❌ API Request Error:', error);
      return Promise.reject(error);
    }
  );
}

// Add response interceptor for logging
if (DEBUG_CONFIG.LOG_API_RESPONSES) {
  axios.interceptors.response.use(
    (response) => {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data
      });
      return response;
    },
    (error) => {
      if (DEBUG_CONFIG.LOG_ERRORS) {
        console.error('❌ API Response Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      }
      return Promise.reject(error);
    }
  );
}

const AppContext = createContext();

const initialState = {
  settings: {
    fiatCurrency: 'INR',
    profitCalculationMethod: 'FIFO',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    theme: 'dark'
  },
  summary: null,
  trades: [],
  loading: false,
  error: null
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };
    case 'SET_SUMMARY':
      return {
        ...state,
        summary: action.payload
      };
    case 'SET_TRADES':
      return {
        ...state,
        trades: action.payload
      };
    case 'ADD_TRADE':
      return {
        ...state,
        trades: [action.payload, ...state.trades]
      };
    case 'REMOVE_TRADE':
      return {
        ...state,
        trades: state.trades.filter(trade => trade._id !== action.payload)
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('p2pSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        dispatch({ type: 'SET_SETTINGS', payload: parsed });
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('p2pSettings', JSON.stringify(state.settings));
    }
  }, [state.settings, isInitialized]);

  // Update settings
  const updateSettings = useCallback((newSettings) => {
    dispatch({ type: 'SET_SETTINGS', payload: newSettings });
  }, []);

  // Fetch summary data
  const fetchSummary = useCallback(async (fiatCurrency = 'INR', method = 'FIFO') => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetch(`http://localhost:5000/api/summary?fiatCurrency=${fiatCurrency}&method=${method}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch summary');
      }

      dispatch({ type: 'SET_SUMMARY', payload: result.data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Fetch trades
  const fetchTrades = useCallback(async (filters = {}) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(`http://localhost:5000/api/trades?${queryParams}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch trades');
      }

      dispatch({ type: 'SET_TRADES', payload: result.data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Add trade
  const addTrade = useCallback((trade) => {
    dispatch({ type: 'ADD_TRADE', payload: trade });
  }, []);

  // Remove trade
  const removeTrade = useCallback((tradeId) => {
    dispatch({ type: 'REMOVE_TRADE', payload: tradeId });
  }, []);

  const value = useMemo(() => ({
    ...state,
    updateSettings,
    fetchSummary,
    fetchTrades,
    addTrade,
    removeTrade
  }), [state, updateSettings, fetchSummary, fetchTrades, addTrade, removeTrade]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
