# P2P Arbitrage Tracker

A production-ready application for tracking P2P trades and calculating realized profits using FIFO and Average Cost methods.

## Features

- **Dashboard**: KPI cards showing profit, total buys/sells, and remaining inventory
- **Profit Charts**: Visual representation of profit over time
- **Trade Management**: View, filter, and manage all trades manually
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

### Adding Trades

1. Navigate to the **Trades** page
2. Click **Add New Trade** button
3. Fill in the trade details:
   - **Type**: Buy or Sell
   - **Amount**: USDT amount
   - **Price**: Price in your local currency
   - **Date**: Trade completion date
   - **Notes**: Optional additional information
4. Click **Save Trade**

### Viewing Dashboard

1. The **Dashboard** shows key metrics:
   - Realized profit/loss
   - Total buys and sells
   - Remaining inventory
   - Average buy/sell prices
2. Use date range filters to view specific periods
3. Charts show profit trends over time

### Settings

1. **P&L Method**: Choose between FIFO or Average Cost
2. **Default Currency**: Set your preferred fiat currency
3. Settings are automatically saved to localStorage

## API Endpoints

### Core Endpoints
- `GET /api/health` - Server health check
- `GET /api/summary` - Get P&L summary
- `GET /api/trades` - Get all trades
- `POST /api/trades` - Create new trade
- `PUT /api/trades/:id` - Update trade
- `DELETE /api/trades/:id` - Delete trade
- `GET /api/pnl` - Get P&L calculations

### Query Parameters
- `from` - Start date (YYYY-MM-DD)
- `to` - End date (YYYY-MM-DD)
- `fiatCurrency` - Currency for calculations
- `method` - P&L calculation method (FIFO/Average)

## Database Schema

### Trade Model
```javascript
{
  type: 'buy' | 'sell',
  amount: Number,        // USDT amount
  price: Number,         // Price in fiat currency
  fiatCurrency: String,  // Currency code (e.g., 'INR')
  completedAt: Date,     // Trade completion date
  notes: String,         // Optional notes
  createdAt: Date,       // Record creation date
  updatedAt: Date        // Last update date
}
```

## P&L Calculation Methods

### FIFO (First In, First Out)
- Sells are matched with the oldest buys first
- More accurate for tax purposes
- Better for long-term holdings

### Average Cost
- Calculates average buy price across all purchases
- Simpler calculations
- Good for regular trading

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure MongoDB is running
   - Check MONGODB_URI in .env file
   - Verify network connectivity

2. **Port Already in Use**
   - Change PORT in .env file
   - Kill existing processes on the port

3. **CORS Issues**
   - Verify FRONTEND_URL in .env
   - Check browser console for errors

### Development Tips

1. **Skip Database in Development**
   ```env
   SKIP_DB=true
   ```

2. **Enable Debug Logging**
   ```env
   NODE_ENV=development
   ```

3. **View API Logs**
   - Check backend console for request/response logs
   - Frontend logs in browser console

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
