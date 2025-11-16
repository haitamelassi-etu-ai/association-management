const express = require('express');
const router = express.Router();
const MealDistribution = require('../models/MealDistribution');
const Beneficiary = require('../models/Beneficiary');
const { protect, authorize } = require('../middleware/auth');

// Get all meal distributions with filters
router.get('/', protect, async (req, res) => {
  try {
    const { date, mealType, served, beneficiaryId } = req.query;
    
    let query = {};
    
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }
    
    if (mealType) query.mealType = mealType;
    if (served !== undefined) query.served = served === 'true';
    if (beneficiaryId) query.beneficiary = beneficiaryId;

    const meals = await MealDistribution.find(query)
      .populate('beneficiary', 'nom prenom cin')
      .populate('servedBy', 'name email')
      .sort({ date: -1, mealType: 1 });

    res.json({
      success: true,
      count: meals.length,
      data: meals
    });
  } catch (error) {
    console.error('Error fetching meals:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des repas'
    });
  }
});

// Get daily statistics
router.get('/stats/daily', protect, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    const stats = await MealDistribution.getDailyStats(targetDate);

    // Calculate totals
    const totals = stats.reduce((acc, stat) => ({
      total: acc.total + stat.total,
      served: acc.served + stat.served,
      pending: acc.pending + stat.pending,
      totalCost: acc.totalCost + stat.totalCost
    }), { total: 0, served: 0, pending: 0, totalCost: 0 });

    res.json({
      success: true,
      date: targetDate,
      byMealType: stats,
      totals
    });
  } catch (error) {
    console.error('Error getting daily stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
});

// Get weekly statistics
router.get('/stats/weekly', protect, async (req, res) => {
  try {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const stats = await MealDistribution.aggregate([
      {
        $match: {
          date: { $gte: weekAgo, $lte: today }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            mealType: '$mealType'
          },
          total: { $sum: '$quantity' },
          served: { $sum: { $cond: ['$served', '$quantity', 0] } },
          cost: { $sum: '$cost' }
        }
      },
      {
        $sort: { '_id.date': -1, '_id.mealType': 1 }
      }
    ]);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting weekly stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques hebdomadaires'
    });
  }
});

// Get beneficiary meal history
router.get('/beneficiary/:id/history', protect, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const history = await MealDistribution.getBeneficiaryHistory(
      req.params.id,
      parseInt(days)
    );

    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    console.error('Error getting beneficiary history:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique'
    });
  }
});

// Create new meal distribution
router.post('/', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const {
      beneficiaryId,
      mealType,
      date,
      quantity,
      menuItems,
      specialDiet,
      cost,
      notes
    } = req.body;

    // Check if beneficiary exists
    const beneficiary = await Beneficiary.findById(beneficiaryId);
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Bénéficiaire non trouvé'
      });
    }

    const meal = await MealDistribution.create({
      beneficiary: beneficiaryId,
      mealType,
      date: date || new Date(),
      quantity: quantity || 1,
      menuItems: menuItems || [],
      specialDiet: specialDiet || 'none',
      cost: cost || 0,
      notes
    });

    await meal.populate('beneficiary', 'nom prenom cin');

    res.status(201).json({
      success: true,
      message: 'Distribution de repas créée avec succès',
      data: meal
    });
  } catch (error) {
    console.error('Error creating meal distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la distribution'
    });
  }
});

// Mark meal as served
router.patch('/:id/serve', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const meal = await MealDistribution.findById(req.params.id);
    
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Distribution non trouvée'
      });
    }

    if (meal.served) {
      return res.status(400).json({
        success: false,
        message: 'Repas déjà servi'
      });
    }

    await meal.markServed(req.user.id);
    await meal.populate('beneficiary', 'nom prenom cin');
    await meal.populate('servedBy', 'name email');

    res.json({
      success: true,
      message: 'Repas marqué comme servi',
      data: meal
    });
  } catch (error) {
    console.error('Error marking meal as served:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour'
    });
  }
});

// Update meal distribution
router.put('/:id', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const meal = await MealDistribution.findById(req.params.id);
    
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Distribution non trouvée'
      });
    }

    const allowedUpdates = ['quantity', 'menuItems', 'specialDiet', 'cost', 'notes'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        meal[field] = req.body[field];
      }
    });

    await meal.save();
    await meal.populate('beneficiary', 'nom prenom cin');

    res.json({
      success: true,
      message: 'Distribution mise à jour avec succès',
      data: meal
    });
  } catch (error) {
    console.error('Error updating meal:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour'
    });
  }
});

// Delete meal distribution
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const meal = await MealDistribution.findById(req.params.id);
    
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Distribution non trouvée'
      });
    }

    await meal.deleteOne();

    res.json({
      success: true,
      message: 'Distribution supprimée avec succès'
    });
  } catch (error) {
    console.error('Error deleting meal:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
});

// Bulk create meals for all beneficiaries
router.post('/bulk', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { mealType, date, menuItems, cost } = req.body;

    // Get all active beneficiaries
    const beneficiaries = await Beneficiary.find({
      statutHebergement: 'heberge'
    });

    const meals = beneficiaries.map(beneficiary => ({
      beneficiary: beneficiary._id,
      mealType,
      date: date || new Date(),
      quantity: 1,
      menuItems: menuItems || [],
      cost: cost || 0
    }));

    const created = await MealDistribution.insertMany(meals);

    res.status(201).json({
      success: true,
      message: `${created.length} distributions créées pour tous les bénéficiaires`,
      count: created.length
    });
  } catch (error) {
    console.error('Error creating bulk meals:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création en masse'
    });
  }
});

// Create daily meal plan with predefined menus
router.post('/daily-plan', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { date } = req.body;
    const targetDate = date ? new Date(date) : new Date();

    // Predefined menus for each meal type
    const mealMenus = {
      breakfast: {
        menuItems: ['شاي', 'خبز', 'فرماج', 'زبدة', 'مربى'],
        cost: 15
      },
      lunch: {
        menuItems: ['فاصولياء', 'أرز', 'سلطة', 'خبز', 'فواكه'],
        cost: 35
      },
      snack: {
        menuItems: ['بسكويت', 'عصير', 'فواكه'],
        cost: 10
      },
      dinner: {
        menuItems: ['حساء', 'خبز', 'جبن', 'خضر'],
        cost: 25
      }
    };

    // Get all active beneficiaries
    const beneficiaries = await Beneficiary.find({
      statutHebergement: 'heberge'
    });

    if (beneficiaries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun bénéficiaire hébergé trouvé'
      });
    }

    // Check if meals already exist for this date
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
    const existingMeals = await MealDistribution.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existingMeals.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Des repas existent déjà pour cette date'
      });
    }

    // Create meals for all meal types
    const allMeals = [];
    for (const [mealType, menu] of Object.entries(mealMenus)) {
      const meals = beneficiaries.map(beneficiary => ({
        beneficiary: beneficiary._id,
        mealType,
        date: startOfDay,
        quantity: 1,
        menuItems: menu.menuItems,
        cost: menu.cost,
        specialDiet: beneficiary.regimeAlimentaire || 'none'
      }));
      allMeals.push(...meals);
    }

    const created = await MealDistribution.insertMany(allMeals);

    // Calculate statistics
    const stats = {
      totalMeals: created.length,
      beneficiariesCount: beneficiaries.length,
      mealsPerType: {
        breakfast: beneficiaries.length,
        lunch: beneficiaries.length,
        snack: beneficiaries.length,
        dinner: beneficiaries.length
      },
      totalCost: allMeals.reduce((sum, meal) => sum + meal.cost, 0)
    };

    res.status(201).json({
      success: true,
      message: `Plan journalier créé: ${created.length} repas pour ${beneficiaries.length} bénéficiaires`,
      stats
    });
  } catch (error) {
    console.error('Error creating daily plan:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du plan journalier'
    });
  }
});

module.exports = router;
