const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Ensure DB is initialized
require('./database/db');

const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/accounts');
const cardRoutes = require('./routes/cards');
const parentalRoutes = require('./routes/parental');
const creditRoutes = require('./routes/credit');
const transactionRoutes = require('./routes/transactions');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'ABMS – Advanced Bank Management System',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/parental', parentalRoutes);
app.use('/api/credit', creditRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🏦 ABMS Backend Server running on http://localhost:${PORT}`);
});
