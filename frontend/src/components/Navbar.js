import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const { mexcStatus } = useApp();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/trades', label: 'Trades', icon: '💱' },
    { path: '/import', label: 'Import', icon: '📥' },
    { path: '/settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/" className="navbar-logo">
            <span className="logo-icon">💰</span>
            <span className="logo-text">P2P Arbitrage</span>
          </Link>
        </div>

        <div className="navbar-menu">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`navbar-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="navbar-icon">{item.icon}</span>
              <span className="navbar-label">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="navbar-status">
          <div className={`status-indicator ${mexcStatus.hasCredentials ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {mexcStatus.hasCredentials ? 'MEXC Connected' : 'MEXC Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
