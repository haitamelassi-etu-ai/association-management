const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { generateMonthlyReport } = require('../services/aiService');
const AuditLog = require('../models/AuditLog');

// ─── POST /api/ai/monthly-report ───
// Generate an AI-powered professional monthly social report.
// Access: admin, responsable (JWT protected)
router.post('/monthly-report', protect, authorize('admin', 'responsable'), async (req, res) => {
  try {
    const {
      totalBeneficiaries,
      activeBeneficiaries,
      totalMeals,
      hygieneDistributions,
      stockAlerts,
      occupancyRate,
      donationsReceived,
      period,
    } = req.body;

    // ── Input validation ──
    if (
      totalBeneficiaries === undefined ||
      activeBeneficiaries === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'Les champs totalBeneficiaries et activeBeneficiaries sont requis.',
      });
    }

    // ── Generate report ──
    const report = await generateMonthlyReport({
      totalBeneficiaries:   Number(totalBeneficiaries)   || 0,
      activeBeneficiaries:  Number(activeBeneficiaries)  || 0,
      totalMeals:           Number(totalMeals)           || 0,
      hygieneDistributions: Number(hygieneDistributions) || 0,
      stockAlerts:          Array.isArray(stockAlerts) ? stockAlerts : [],
      occupancyRate:        Number(occupancyRate)         || 0,
      donationsReceived:    Number(donationsReceived)     || 0,
      period:               period || undefined,
    });

    // ── Audit log ──
    try {
      await AuditLog.create({
        user: req.user._id,
        action: 'export',
        resource: 'report',
        details: {
          type: 'AI_MONTHLY_REPORT',
          period: period || new Date().toISOString(),
          model: 'gpt-4o',
        },
      });
    } catch (logErr) {
      // Non-blocking: don't fail the request if logging fails
      console.error('Audit log write failed:', logErr.message);
    }

    res.json({
      success: true,
      data: {
        report,
        generatedAt: new Date().toISOString(),
        model: 'gpt-4o',
      },
    });
  } catch (error) {
    console.error('AI report generation error:', error.message);

    // Surface clear error for missing API key
    if (error.message.includes('OPENAI_API_KEY')) {
      return res.status(503).json({
        success: false,
        message: 'Le service IA n\'est pas configuré. Contactez l\'administrateur.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du rapport IA.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
