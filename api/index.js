// Vercel Serverless Function - Main API Entry Point
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import routes
const authRoutes = require('../backend/routes/auth');
const usersRoutes = require('../backend/routes/users');
const beneficiariesRoutes = require('../backend/routes/beneficiaries');
const attendanceRoutes = require('../backend/routes/attendance');
const announcementsRoutes = require('../backend/routes/announcements');
const notificationsRoutes = require('../backend/routes/notifications');
const mealsRoutes = require('../backend/routes/meals');
const foodStockRoutes = require('../backend/routes/foodStock');
const medicationsRoutes = require('../backend/routes/medications');
const pharmacyRoutes = require('../backend/routes/pharmacy');
const exitLogsRoutes = require('../backend/routes/exitLogs');
const documentsRoutes = require('../backend/routes/documents');
const chatRoutes = require('../backend/routes/chat');
const analyticsRoutes = require('../backend/routes/analytics');
const advancedReportsRoutes = require('../backend/routes/advancedReports');
const backupRoutes = require('../backend/routes/backup');

const app = express();

// MongoDB connection
let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  const connection = await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  cachedDb = connection;
  return connection;
}

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/beneficiaries', beneficiariesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/food-stock', foodStockRoutes);
app.use('/api/medications', medicationsRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/exit-logs', exitLogsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports/advanced', advancedReportsRoutes);
app.use('/api/backup', backupRoutes);

// Health check
app.get('/api', (req, res) => {
  res.json({ message: 'API is running', status: 'ok' });
});

// Connect to DB and export handler
module.exports = async (req, res) => {
  await connectToDatabase();
  return app(req, res);
};
