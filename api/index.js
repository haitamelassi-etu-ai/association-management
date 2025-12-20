// Vercel Serverless Function - Main API Entry Point
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Import routes
const authRoutes = require('../backend/routes/auth');
const usersRoutes = require('../backend/routes/users');
const beneficiariesRoutes = require('../backend/routes/beneficiaries');
const attendanceRoutes = require('../backend/routes/attendance');

const app = express();

// MongoDB connection
let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    cachedDb = mongoose.connection;
    console.log('✅ MongoDB connected');
    return cachedDb;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/beneficiaries', beneficiariesRoutes);
app.use('/api/attendance', attendanceRoutes);

// Health check
app.get('/api', (req, res) => {
  res.json({ message: 'API is running', status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Export for Vercel
module.exports = async (req, res) => {
  await connectToDatabase();
  return app(req, res);
};
