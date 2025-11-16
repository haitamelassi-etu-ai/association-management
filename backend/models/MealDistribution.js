const mongoose = require('mongoose');

const mealDistributionSchema = new mongoose.Schema({
  beneficiary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary',
    required: true
  },
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  quantity: {
    type: Number,
    default: 1,
    min: 0
  },
  served: {
    type: Boolean,
    default: false
  },
  servedAt: {
    type: Date
  },
  servedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    maxlength: 500
  },
  menuItems: [{
    type: String
  }],
  specialDiet: {
    type: String,
    enum: ['none', 'vegetarian', 'vegan', 'halal', 'gluten-free', 'diabetic', 'other']
  },
  cost: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
mealDistributionSchema.index({ beneficiary: 1, date: -1 });
mealDistributionSchema.index({ mealType: 1, date: -1 });
mealDistributionSchema.index({ served: 1, date: -1 });

// Virtual for meal time slot
mealDistributionSchema.virtual('timeSlot').get(function() {
  const hours = this.date.getHours();
  if (hours >= 6 && hours < 10) return 'breakfast';
  if (hours >= 12 && hours < 15) return 'lunch';
  if (hours >= 18 && hours < 21) return 'dinner';
  return 'snack';
});

// Method to mark as served
mealDistributionSchema.methods.markServed = function(userId) {
  this.served = true;
  this.servedAt = new Date();
  this.servedBy = userId;
  return this.save();
};

// Static method to get daily distribution stats
mealDistributionSchema.statics.getDailyStats = async function(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const stats = await this.aggregate([
    {
      $match: {
        date: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: '$mealType',
        total: { $sum: '$quantity' },
        served: {
          $sum: { $cond: ['$served', '$quantity', 0] }
        },
        pending: {
          $sum: { $cond: ['$served', 0, '$quantity'] }
        },
        totalCost: { $sum: '$cost' }
      }
    }
  ]);

  return stats;
};

// Static method to get beneficiary meal history
mealDistributionSchema.statics.getBeneficiaryHistory = async function(beneficiaryId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.find({
    beneficiary: beneficiaryId,
    date: { $gte: startDate }
  })
  .populate('servedBy', 'name email')
  .sort({ date: -1 });
};

module.exports = mongoose.model('MealDistribution', mealDistributionSchema);
