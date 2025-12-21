// Vercel Serverless Function (CommonJS)
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Routes (backend is CommonJS)
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

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Mount routes (expecting /api/*)
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

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mongoReadyState: mongoose.connection.readyState,
    time: new Date().toISOString(),
  });
});

let connectingPromise;
async function ensureMongo() {
  if (mongoose.connection.readyState === 1) return;
  if (connectingPromise) return connectingPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  connectingPromise = mongoose
    .connect(uri)
    .finally(() => {
      connectingPromise = undefined;
    });

  return connectingPromise;
}

module.exports = async (req, res) => {
  try {
    await ensureMongo();
    return app(req, res);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
};
