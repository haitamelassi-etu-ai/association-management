const mongoose = require('mongoose');

const savedViewSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resource: {
    type: String,
    required: true,
    enum: ['beneficiaries', 'attendance', 'medications', 'pharmacy', 'meals', 'reports', 'users']
  },
  filters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  sortBy: {
    field: String,
    order: {
      type: String,
      enum: ['asc', 'desc'],
      default: 'asc'
    }
  },
  columns: [{
    field: String,
    visible: { type: Boolean, default: true },
    width: Number
  }],
  isDefault: {
    type: Boolean,
    default: false
  },
  isShared: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

savedViewSchema.index({ user: 1, resource: 1 });

module.exports = mongoose.model('SavedView', savedViewSchema);
