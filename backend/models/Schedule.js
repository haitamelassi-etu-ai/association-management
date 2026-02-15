const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['appointment', 'shift', 'meeting', 'event', 'task'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  allDay: {
    type: Boolean,
    default: false
  },
  recurring: {
    type: Boolean,
    default: false
  },
  recurrenceRule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: Number,
    endDate: Date,
    daysOfWeek: [Number]
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  beneficiary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: String,
  color: {
    type: String,
    default: '#3498db'
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },
  reminder: {
    enabled: { type: Boolean, default: true },
    beforeMinutes: { type: Number, default: 30 }
  },
  notes: String,
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: Date
  }]
}, { timestamps: true });

scheduleSchema.index({ startDate: 1, endDate: 1 });
scheduleSchema.index({ assignedTo: 1 });
scheduleSchema.index({ createdBy: 1 });
scheduleSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
