const mongoose = require('mongoose');

// Pharmacy Medication Stock Model
const pharmacyStockSchema = new mongoose.Schema({
  medicationName: {
    type: String,
    required: true,
    trim: true
  },
  genericName: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['antibiotics', 'painkillers', 'diabetes', 'hypertension', 'vitamins', 'gastrointestinal', 'respiratory', 'cardiac', 'psychiatric', 'other'],
    default: 'other'
  },
  dosageForm: {
    type: String,
    enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'suppository'],
    default: 'tablet'
  },
  strength: {
    type: String, // e.g., "500mg", "10mg/ml"
    required: true
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  minStockLevel: {
    type: Number,
    default: 20
  },
  expiryDate: {
    type: Date
  },
  batchNumber: {
    type: String
  },
  supplier: {
    type: String
  },
  costPerUnit: {
    type: Number,
    default: 0
  },
  storageInstructions: {
    type: String
  },
  active: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for search and low stock alerts
pharmacyStockSchema.index({ medicationName: 'text', genericName: 'text' });
pharmacyStockSchema.index({ stock: 1, minStockLevel: 1 });

// Virtual for low stock status
pharmacyStockSchema.virtual('isLowStock').get(function() {
  return this.stock <= this.minStockLevel;
});

// Virtual for expired status
pharmacyStockSchema.virtual('isExpired').get(function() {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});

// Static method to get low stock medications
pharmacyStockSchema.statics.getLowStock = async function() {
  return this.find({
    active: true,
    $expr: { $lte: ['$stock', '$minStockLevel'] }
  });
};

// Static method to get expired medications
pharmacyStockSchema.statics.getExpired = async function() {
  const today = new Date();
  return this.find({
    active: true,
    expiryDate: { $lte: today }
  });
};

// Static method to get expiring soon (within 30 days)
pharmacyStockSchema.statics.getExpiringSoon = async function() {
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  
  return this.find({
    active: true,
    expiryDate: { 
      $gt: today,
      $lte: thirtyDaysFromNow 
    }
  });
};

pharmacyStockSchema.set('toJSON', { virtuals: true });
pharmacyStockSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PharmacyStock', pharmacyStockSchema);
