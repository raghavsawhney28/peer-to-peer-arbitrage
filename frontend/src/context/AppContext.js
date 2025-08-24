import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';

const AppContext = createContext();

const initialState = {
  settings: {
    pnlMethod: 'FIFO',
    defaultFiatCurrency: 'INR',
    dateRange: {
      from: null,
      to: null
    }
  },
  summary: null,
  trades: [],
  loading: false,
  error: null,
  mexcStatus: {
    hasCredentials: false,
    connected: false
  }
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
    case 'SET_MEXC_STATUS':
      return {
        ...state,
        mexcStatus: { ...state.mexcStatus, ...action.payload }
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

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
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('p2pSettings', JSON.stringify(state.settings));
  }, [state.settings]);

  // Check MEXC API status on mount
  useEffect(() => {
    checkMEXCStatus();
  }, []);

  const checkMEXCStatus = async () => {
    try {
      const response = await axios.get('/api/mexc/status');
      dispatch({ 
        type: 'SET_MEXC_STATUS', 
        payload: { 
          hasCredentials: response.data.hasCredentials,
          connected: response.data.hasCredentials 
        } 
      });
    } catch (error) {
      dispatch({ 
        type: 'SET_MEXC_STATUS', 
        payload: { 
          hasCredentials: false,
          connected: false 
        } 
      });
    }
  };

  const updateSettings = (newSettings) => {
    dispatch({ type: 'SET_SETTINGS', payload: newSettings });
  };

  const fetchSummary = async (params = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const queryParams = new URLSearchParams({
        fiatCurrency: state.settings.defaultFiatCurrency,
        method: state.settings.pnlMethod,
        ...params
      });

      const response = await axios.get(`/api/summary?${queryParams}`);
      dispatch({ type: 'SET_SUMMARY', payload: response.data.data });
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error.response?.data?.message || error.message 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchTrades = async (params = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const queryParams = new URLSearchParams({
        pageSize: 100,
        sortBy: 'completedAt',
        sortOrder: 'desc',
        ...params
      });

      const response = await axios.get(`/api/trades?${queryParams}`);
      dispatch({ type: 'SET_TRADES', payload: response.data.data });
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error.response?.data?.message || error.message 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const syncMEXC = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await axios.post('/api/mexc/sync');
      
      // Refresh data after sync
      await fetchSummary();
      await fetchTrades();
      
      return response.data;
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error.response?.data?.message || error.message 
      });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const value = {
    ...state,
    updateSettings,
    fetchSummary,
    fetchTrades,
    syncMEXC,
    checkMEXCStatus
  };

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
