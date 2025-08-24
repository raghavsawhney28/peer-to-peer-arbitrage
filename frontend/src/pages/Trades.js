import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTable, useFilters, useSortBy, usePagination } from 'react-table';
import dayjs from 'dayjs';
import './Trades.css';

const Trades = () => {
  const { trades, loading, error, fetchTrades } = useApp();
  const [filters, setFilters] = useState({
    side: '',
    status: '',
    fiatCurrency: '',
    asset: ''
  });

  useEffect(() => {
    fetchTrades();
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    const activeFilters = {};
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        activeFilters[key] = filters[key];
      }
    });
    fetchTrades(activeFilters);
  };

  const clearFilters = () => {
    setFilters({
      side: '',
      status: '',
      fiatCurrency: '',
      asset: ''
    });
    fetchTrades();
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

  const formatDate = (date) => {
    return dayjs(date).format('MMM DD, YYYY HH:mm');
  };

  const columns = [
    {
      Header: 'Date',
      accessor: 'completedAt',
      Cell: ({ value }) => formatDate(value),
      sortType: 'datetime'
    },
    {
      Header: 'Side',
      accessor: 'side',
      Cell: ({ value }) => (
        <span className={`side-badge ${value.toLowerCase()}`}>
          {value}
        </span>
      )
    },
    {
      Header: 'Amount',
      accessor: 'amount',
      Cell: ({ value }) => formatNumber(value)
    },
    {
      Header: 'Price',
      accessor: 'price',
      Cell: ({ value, row }) => formatCurrency(value, row.original.fiatCurrency)
    },
    {
      Header: 'Total',
      accessor: 'totalFiat',
      Cell: ({ value, row }) => formatCurrency(value, row.original.fiatCurrency)
    },
    {
      Header: 'Asset',
      accessor: 'asset'
    },
    {
      Header: 'Fiat',
      accessor: 'fiatCurrency'
    },
    {
      Header: 'Counterparty',
      accessor: 'counterparty',
      Cell: ({ value }) => value || '-'
    },
    {
      Header: 'Status',
      accessor: 'status',
      Cell: ({ value }) => (
        <span className={`status-badge ${value.toLowerCase()}`}>
          {value}
        </span>
      )
    }
  ];

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state: { pageIndex, pageSize },
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    pageOptions,
    gotoPage,
    pageCount,
    setPageSize
  } = useTable(
    {
      columns,
      data: trades,
      initialState: { pageIndex: 0, pageSize: 20 }
    },
    useFilters,
    useSortBy,
    usePagination
  );

  if (loading && trades.length === 0) {
    return (
      <div className="trades">
        <div className="loading">Loading trades...</div>
      </div>
    );
  }

  return (
    <div className="trades">
      <div className="trades-header">
        <h1>Trades</h1>
        <div className="trades-actions">
          <button 
            className="btn btn-secondary"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
          <button 
            className="btn btn-primary"
            onClick={applyFilters}
          >
            Apply Filters
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Side:</label>
            <select
              value={filters.side}
              onChange={(e) => handleFilterChange('side', e.target.value)}
            >
              <option value="">All</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELED">Canceled</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Fiat Currency:</label>
            <select
              value={filters.fiatCurrency}
              onChange={(e) => handleFilterChange('fiatCurrency', e.target.value)}
            >
              <option value="">All</option>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Asset:</label>
            <select
              value={filters.asset}
              onChange={(e) => handleFilterChange('asset', e.target.value)}
            >
              <option value="">All</option>
              <option value="USDT">USDT</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="table-container">
        <table {...getTableProps()} className="trades-table">
          <thead>
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                    {column.render('Header')}
                    <span className="sort-indicator">
                      {column.isSorted ? (column.isSortedDesc ? ' ↓' : ' ↑') : ''}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rows.map(row => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()}>
                  {row.cells.map(cell => (
                    <td {...cell.getCellProps()}>
                      {cell.render('Cell')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="no-trades">
            <p>No trades found matching the current filters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {trades.length > 0 && (
        <div className="pagination">
          <div className="pagination-info">
            Page {pageIndex + 1} of {pageCount} ({trades.length} total trades)
          </div>
          
          <div className="pagination-controls">
            <button
              onClick={() => gotoPage(0)}
              disabled={!canPreviousPage}
              className="btn btn-secondary"
            >
              {'<<'}
            </button>
            <button
              onClick={() => previousPage()}
              disabled={!canPreviousPage}
              className="btn btn-secondary"
            >
              {'<'}
            </button>
            <button
              onClick={() => nextPage()}
              disabled={!canNextPage}
              className="btn btn-secondary"
            >
              {'>'}
            </button>
            <button
              onClick={() => gotoPage(pageCount - 1)}
              disabled={!canNextPage}
              className="btn btn-secondary"
            >
              {'>>'}
            </button>
          </div>

          <div className="page-size-selector">
            <label>Show:</label>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trades;
