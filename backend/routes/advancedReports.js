const express = require('express');
const router = express.Router();
const Beneficiary = require('../models/Beneficiary');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const MealDistribution = require('../models/MealDistribution');
const { protect, authorize } = require('../middleware/auth');

// Financial Summary Report
router.get('/financial', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    // Meal costs
    const mealCosts = await MealDistribution.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalMealCost: { $sum: '$cost' },
          totalMeals: { $sum: '$quantity' },
          averageCostPerMeal: { $avg: '$cost' }
        }
      }
    ]);

    // Beneficiaries count and accommodation costs
    const beneficiaries = await Beneficiary.countDocuments({
      createdAt: { $lte: end }
    });

    const activeBeneficiaries = await Beneficiary.countDocuments({
      statutHebergement: 'heberge',
      createdAt: { $lte: end }
    });

    // Estimated monthly accommodation cost per beneficiary
    const accommodationCostPerPerson = 1500; // DH per month
    const totalAccommodationCost = activeBeneficiaries * accommodationCostPerPerson;

    const report = {
      period: {
        startDate: start,
        endDate: end,
        days: Math.ceil((end - start) / (1000 * 60 * 60 * 24))
      },
      meals: mealCosts[0] || {
        totalMealCost: 0,
        totalMeals: 0,
        averageCostPerMeal: 0
      },
      accommodation: {
        activeBeneficiaries,
        costPerPerson: accommodationCostPerPerson,
        totalCost: totalAccommodationCost
      },
      summary: {
        totalBeneficiaries: beneficiaries,
        activeBeneficiaries,
        totalMealCost: mealCosts[0]?.totalMealCost || 0,
        totalAccommodationCost,
        grandTotal: (mealCosts[0]?.totalMealCost || 0) + totalAccommodationCost
      }
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating financial report:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du rapport financier'
    });
  }
});

// Services Statistics Report
router.get('/services', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    // Meal distribution statistics
    const mealStats = await MealDistribution.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$mealType',
          total: { $sum: '$quantity' },
          served: { $sum: { $cond: ['$served', '$quantity', 0] } },
          pending: { $sum: { $cond: ['$served', 0, '$quantity'] } },
          cost: { $sum: '$cost' }
        }
      }
    ]);

    // Attendance statistics
    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          checkIn: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalCheckIns: { $sum: 1 },
          averageHoursWorked: { 
            $avg: {
              $divide: [
                { $subtract: ['$checkOut', '$checkIn'] },
                3600000 // Convert to hours
              ]
            }
          }
        }
      }
    ]);

    // Beneficiary status distribution
    const beneficiaryStats = await Beneficiary.aggregate([
      {
        $group: {
          _id: '$statutHebergement',
          count: { $sum: 1 }
        }
      }
    ]);

    // New beneficiaries in period
    const newBeneficiaries = await Beneficiary.countDocuments({
      createdAt: { $gte: start, $lte: end }
    });

    const report = {
      period: {
        startDate: start,
        endDate: end
      },
      meals: {
        byType: mealStats,
        total: mealStats.reduce((sum, stat) => sum + stat.total, 0),
        totalServed: mealStats.reduce((sum, stat) => sum + stat.served, 0),
        totalPending: mealStats.reduce((sum, stat) => sum + stat.pending, 0)
      },
      attendance: attendanceStats[0] || {
        totalCheckIns: 0,
        averageHoursWorked: 0
      },
      beneficiaries: {
        byStatus: beneficiaryStats,
        newInPeriod: newBeneficiaries,
        total: beneficiaryStats.reduce((sum, stat) => sum + stat.count, 0)
      }
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating services report:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du rapport des services'
    });
  }
});

// Beneficiary Progress Tracking Report
router.get('/beneficiary-progress/:id', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id)
      .populate('responsable', 'name email');

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Bénéficiaire non trouvé'
      });
    }

    // Get meal history
    const mealHistory = await MealDistribution.find({
      beneficiary: req.params.id
    })
    .populate('servedBy', 'name')
    .sort({ date: -1 })
    .limit(30);

    // Calculate meal statistics
    const mealStats = await MealDistribution.aggregate([
      {
        $match: {
          beneficiary: beneficiary._id
        }
      },
      {
        $group: {
          _id: '$mealType',
          count: { $sum: 1 },
          served: { $sum: { $cond: ['$served', 1, 0] } }
        }
      }
    ]);

    // Get timeline of key events
    const timeline = [
      {
        type: 'registration',
        date: beneficiary.createdAt,
        description: 'Inscription du bénéficiaire'
      },
      {
        type: 'accommodation',
        date: beneficiary.dateEntree,
        description: `Début d'hébergement (${beneficiary.typeHebergement})`
      }
    ];

    if (beneficiary.dateSortie) {
      timeline.push({
        type: 'departure',
        date: beneficiary.dateSortie,
        description: 'Fin d\'hébergement'
      });
    }

    // Calculate duration
    const duration = beneficiary.dateSortie 
      ? Math.ceil((new Date(beneficiary.dateSortie) - new Date(beneficiary.dateEntree)) / (1000 * 60 * 60 * 24))
      : Math.ceil((new Date() - new Date(beneficiary.dateEntree)) / (1000 * 60 * 60 * 24));

    const report = {
      beneficiary: {
        id: beneficiary._id,
        name: `${beneficiary.prenom} ${beneficiary.nom}`,
        cin: beneficiary.cin,
        dateOfBirth: beneficiary.dateNaissance,
        age: beneficiary.age,
        status: beneficiary.statutHebergement,
        accommodationType: beneficiary.typeHebergement,
        responsable: beneficiary.responsable
      },
      timeline,
      duration: {
        days: duration,
        status: beneficiary.statutHebergement
      },
      meals: {
        history: mealHistory,
        statistics: mealStats,
        totalMeals: mealHistory.length
      },
      support: {
        socialSupport: beneficiary.aideSociale || false,
        medicalSupport: beneficiary.aidesMedicales || [],
        notes: beneficiary.observations
      }
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating beneficiary progress report:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du rapport de progression'
    });
  }
});

// Overall Dashboard Report
router.get('/dashboard', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Current statistics
    const [
      totalBeneficiaries,
      activeBeneficiaries,
      newThisMonth,
      todayMeals,
      todayAttendance
    ] = await Promise.all([
      Beneficiary.countDocuments(),
      Beneficiary.countDocuments({ statutHebergement: 'heberge' }),
      Beneficiary.countDocuments({ 
        createdAt: { 
          $gte: new Date(today.getFullYear(), today.getMonth(), 1) 
        } 
      }),
      MealDistribution.countDocuments({
        date: {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lte: new Date(today.setHours(23, 59, 59, 999))
        }
      }),
      Attendance.countDocuments({
        checkIn: {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lte: new Date(today.setHours(23, 59, 59, 999))
        }
      })
    ]);

    // Trend data (last 30 days)
    const beneficiaryTrend = await Beneficiary.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const mealTrend = await MealDistribution.aggregate([
      {
        $match: {
          date: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          count: { $sum: '$quantity' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const report = {
      current: {
        totalBeneficiaries,
        activeBeneficiaries,
        newThisMonth,
        todayMeals,
        todayAttendance
      },
      trends: {
        beneficiaries: beneficiaryTrend,
        meals: mealTrend
      },
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating dashboard report:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du rapport dashboard'
    });
  }
});

// Export report as detailed JSON
router.get('/export/:type', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;

    let data;
    let filename;

    switch (type) {
      case 'financial':
        const financialResponse = await fetch(`http://localhost:5000/api/reports/advanced/financial?startDate=${startDate}&endDate=${endDate}`);
        data = await financialResponse.json();
        filename = `financial_report_${Date.now()}.json`;
        break;
      
      case 'services':
        const servicesResponse = await fetch(`http://localhost:5000/api/reports/advanced/services?startDate=${startDate}&endDate=${endDate}`);
        data = await servicesResponse.json();
        filename = `services_report_${Date.now()}.json`;
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Type de rapport invalide'
        });
    }

    res.json({
      success: true,
      filename,
      data
    });
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'export du rapport'
    });
  }
});

module.exports = router;
