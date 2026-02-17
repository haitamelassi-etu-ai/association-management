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
const newsRoutes = require('../backend/routes/news');
const visitorRoutes = require('../backend/routes/visitors');
const volunteerRoutes = require('../backend/routes/volunteers');
const financialRoutes = require('../backend/routes/financial');
const roomRoutes = require('../backend/routes/rooms');
const healthRecordRoutes = require('../backend/routes/healthRecords');
const communicationRoutes = require('../backend/routes/communications');
const aiRoutes = require('../backend/routes/ai');

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
app.use('/api/news', newsRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/health-records', healthRecordRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mongoReadyState: mongoose.connection.readyState,
    time: new Date().toISOString(),
    env: {
      hasMongo: !!process.env.MONGODB_URI,
      hasJwt: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV || 'not-set',
    },
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Express error:', err);
  res.status(500).json({ success: false, message: err?.message || 'Server error' });
});

let connectingPromise;
async function ensureMongo() {
  if (mongoose.connection.readyState === 1) return;
  if (connectingPromise) return connectingPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set – add it in Vercel project settings → Environment Variables');
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
    console.error('API bootstrap error:', err);
    res.status(500).json({
      success: false,
      message: err?.message || 'Server error',
      hint: 'Check Vercel Environment Variables: MONGODB_URI, JWT_SECRET',
    });
  }
};
