const mongoose = require('mongoose');

const distributionSchema = new mongoose.Schema({
  beneficiary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary',
    required: [true, 'Le bénéficiaire est requis'],
    index: true
  },
  type: {
    type: String,
    enum: ['alimentaire', 'hygiene', 'vestimentaire', 'medical', 'autre'],
    required: [true, 'Le type de distribution est requis'],
    index: true
  },
  items: [{
    nom: {
      type: String,
      required: true
    },
    quantite: {
      type: Number,
      required: true,
      min: 1
    },
    unite: {
      type: String,
      default: 'unités'
    },
    linkedStockItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodStock'
    }
  }],
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  notes: {
    type: String,
    trim: true
  },
  distributedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for querying distributions by beneficiary and date
distributionSchema.index({ beneficiary: 1, date: -1 });
distributionSchema.index({ type: 1, date: -1 });

// Static method: get distributions for a beneficiary
distributionSchema.statics.getByBeneficiary = async function(beneficiaryId, limit = 50) {
  return this.find({ beneficiary: beneficiaryId })
    .populate('distributedBy', 'nom prenom')
    .populate('items.linkedStockItem', 'nom categorie')
    .sort({ date: -1 })
    .limit(limit);
};

// Static method: get distribution stats
distributionSchema.statics.getStats = async function(startDate, endDate) {
  const match = {};
  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate) match.date.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalItems: { $sum: { $size: '$items' } }
      }
    }
  ]);

  const total = await this.countDocuments(match);

  return { total, byType: stats };
};

module.exports = mongoose.model('Distribution', distributionSchema);
