# P2P Arbitrage Tracker

A production-ready application for tracking MEXC P2P trades and calculating realized profits using FIFO and Average Cost methods.

## Features

- **Dashboard**: KPI cards showing profit, total buys/sells, and remaining inventory
- **Profit Charts**: Visual representation of profit over time
- **Trade Management**: View, filter, and manage all trades
- **CSV Import**: Import trade data from CSV files with column mapping
- **MEXC Integration**: Sync trades directly from MEXC API
- **Multiple P&L Methods**: Support for FIFO and Average Cost calculations
- **Responsive Design**: Works on desktop and mobile devices

## Architecture

- **Frontend**: React with modern hooks, context API, and responsive design
- **Backend**: Node.js + Express with MongoDB
- **Database**: MongoDB with Mongoose ODM
- **Charts**: Recharts for data visualization
- **Styling**: Modern CSS with responsive design

## Prerequisites

- Node.js 16+ and npm
- MongoDB (local or Atlas)
- MEXC API credentials (optional)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Peer-to-Peer-Arbitrage
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Environment Setup**
   
   Create a `.env` file in the `backend` directory:
   ```env
   # MEXC API Configuration
   MEXC_API_KEY=your_mexc_api_key_here
   MEXC_API_SECRET=your_mexc_api_secret_here
   
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/p2p_arbitrage
   # For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/p2p_arbitrage
   
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # CORS Configuration
   FRONTEND_URL=http://localhost:3000
   
   # Security
   JWT_SECRET=your_jwt_secret_here
   ```

4. **Start MongoDB** (if using local instance)
   ```bash
   # On Windows
   mongod
   
   # On macOS/Linux
   sudo systemctl start mongod
   ```

## Running the Application

### Development Mode

1. **Start both frontend and backend**
   ```bash
   npm run dev
   ```

2. **Or start them separately**
   ```bash
   # Terminal 1 - Backend
   npm run server
   
   # Terminal 2 - Frontend
   npm run client
   ```

### Production Mode

1. **Build the frontend**
   ```bash
   npm run build
   ```

2. **Start the backend**
   ```bash
   npm start
   ```

## Usage

### 1. Dashboard
- View key performance indicators
- Set date ranges for analysis
- Sync with MEXC API
- View profit charts over time

### 2. Import Trades
- Upload CSV files with trade data
- Map CSV columns to system fields
- Preview data before import
- Download sample CSV template

### 3. View Trades
- Browse all trades with pagination
- Filter by side, status, currency, etc.
- Sort by various fields
- View trade details

### 4. Settings
- Choose P&L calculation method (FIFO/Average)
- Set default fiat currency
- Configure MEXC API integration
- Test API connections

## CSV Import Format

The application expects CSV files with the following columns:

| Field | Required | Description |
|-------|----------|-------------|
| orderId | Yes | Unique trade identifier |
| side | Yes | BUY or SELL |
| price | Yes | Price per USDT in fiat |
| amount | Yes | Amount of USDT traded |
| totalFiat | Yes | Total fiat value |
| asset | No | Trading asset (default: USDT) |
| fiatCurrency | No | Fiat currency (default: INR) |
| feeFiat | No | Fee amount in fiat |
| paymentMethod | No | Payment method used |
| counterparty | No | Counterparty identifier |
| status | No | Trade status (default: COMPLETED) |
| createdAt | No | Trade creation date |
| completedAt | No | Trade completion date |

## MEXC API Integration

### Setup
1. Log in to your MEXC account
2. Go to API Management
3. Create a new API key with trading permissions
4. Add the API key and secret to your `.env` file
5. Restart the backend server

### Features
- Automatic trade syncing
- Real-time connection status
- Fallback to CSV import if API unavailable

## P&L Calculation Methods

### FIFO (First In, First Out)
- Matches sells to the oldest buys first
- More accurate for tax purposes
- Better for tracking specific lots

### Average Cost
- Uses weighted average cost of holdings
- Simpler calculations
- Good for portfolio management

## API Endpoints

### Health Check
- `GET /api/health` - Server status

### MEXC Integration
- `GET /api/mexc/status` - API connection status
- `GET /api/mexc/test` - Test API connection
- `POST /api/mexc/sync` - Sync trades from MEXC

### CSV Import
- `GET /api/import/sample` - Download sample CSV
- `GET /api/import/fields` - Get available fields
- `POST /api/import/preview` - Preview CSV data
- `POST /api/import/import` - Import CSV data

### Trades
- `GET /api/trades` - List trades with filters
- `POST /api/trades` - Create new trade
- `PUT /api/trades/:id` - Update trade
- `DELETE /api/trades/:id` - Delete trade

### Summary & P&L
- `GET /api/summary` - Profit summary
- `GET /api/summary/range` - Date range summary
- `GET /api/summary/monthly` - Monthly breakdown
- `GET /api/pnl/timeseries` - Profit time series

## Testing

Run the test suite:
```bash
cd backend
npm test
```

## Deployment

### Backend (Render)
1. Connect your GitHub repository
2. Set environment variables
3. Deploy with Node.js runtime

### Frontend (Render)
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Deploy with static site runtime

### Database (MongoDB Atlas)
1. Create a free cluster
2. Get connection string
3. Add to backend environment variables

## Security Features

- API key encryption
- Rate limiting
- CORS protection
- Input validation
- SQL injection prevention
- XSS protection

## Performance Optimizations

- Database indexing
- Response compression
- Efficient queries
- Lazy loading
- Responsive images

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check if MongoDB is running
   - Verify connection string in `.env`
   - Check network connectivity

2. **MEXC API Errors**
   - Verify API credentials
   - Check API permissions
   - Ensure account has trading access

3. **CSV Import Issues**
   - Verify CSV format
   - Check required columns
   - Ensure proper data types

4. **Frontend Not Loading**
   - Check if backend is running
   - Verify proxy configuration
   - Check browser console for errors

### Logs

Backend logs are available in the console. For production, consider using a logging service like Winston or Bunyan.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review existing GitHub issues
3. Create a new issue with detailed information

## Roadmap

- [ ] Real-time notifications
- [ ] Advanced analytics
- [ ] Tax reporting
- [ ] Multi-exchange support
- [ ] Mobile app
- [ ] API rate limiting
- [ ] User authentication
- [ ] Multi-user support
