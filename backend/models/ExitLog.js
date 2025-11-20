const mongoose = require('mongoose');

// Exit/Entry Log Model for Beneficiaries (Non-Hébergés)
const exitLogSchema = new mongoose.Schema({
  beneficiary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  exitTime: {
    type: Date,
    required: true
  },
  expectedReturnTime: {
    type: Date
  },
  actualReturnTime: {
    type: Date
  },
  destination: {
    type: String,
    trim: true
  },
  purpose: {
    type: String,
    enum: ['work', 'medical', 'family', 'personal', 'shopping', 'administrative', 'other'],
    default: 'personal'
  },
  accompaniedBy: {
    name: String,
    relationship: String,
    phone: String
  },
  exitNotes: {
    type: String,
    trim: true
  },
  returnNotes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['out', 'returned', 'late', 'absent'],
    default: 'out'
  },
  authorizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  returnRecordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  emergencyContact: {
    name: String,
    phone: String
  },
  medicalAlert: {
    type: Boolean,
    default: false
  },
  medicalAlertDetails: String
}, {
  timestamps: true
});

// Indexes
exitLogSchema.index({ beneficiary: 1, date: -1 });
exitLogSchema.index({ status: 1, date: -1 });
exitLogSchema.index({ exitTime: 1, expectedReturnTime: 1 });

// Virtual for duration
exitLogSchema.virtual('duration').get(function() {
  if (!this.actualReturnTime) return null;
  return Math.round((this.actualReturnTime - this.exitTime) / (1000 * 60)); // in minutes
});

// Virtual for is late
exitLogSchema.virtual('isLate').get(function() {
  if (!this.expectedReturnTime || !this.actualReturnTime) return false;
  return this.actualReturnTime > this.expectedReturnTime;
});

// Virtual for time out (in minutes)
exitLogSchema.virtual('timeOut').get(function() {
  const now = this.actualReturnTime || new Date();
  return Math.round((now - this.exitTime) / (1000 * 60));
});

// Method to record return
exitLogSchema.methods.recordReturn = async function(returnNotes, recordedBy) {
  this.actualReturnTime = new Date();
  this.returnNotes = returnNotes;
  this.returnRecordedBy = recordedBy;
  
  // Update status
  if (this.expectedReturnTime && this.actualReturnTime > this.expectedReturnTime) {
    this.status = 'late';
  } else {
    this.status = 'returned';
  }
  
  await this.save();
  return this;
};

// Static method to get currently out beneficiaries
exitLogSchema.statics.getCurrentlyOut = async function() {
  return this.find({ status: 'out' })
    .populate('beneficiary', 'nom prenom cin photoUrl')
    .populate('authorizedBy', 'name email')
    .sort({ exitTime: -1 });
};

// Static method to get late returns
exitLogSchema.statics.getLateReturns = async function() {
  const now = new Date();
  return this.find({
    status: 'out',
    expectedReturnTime: { $lt: now }
  })
    .populate('beneficiary', 'nom prenom cin photoUrl')
    .populate('authorizedBy', 'name email')
    .sort({ expectedReturnTime: 1 });
};

// Static method to get statistics
exitLogSchema.statics.getStatistics = async function(startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        date: {
          $gte: startDate || new Date(new Date().setDate(1)),
          $lte: endDate || new Date()
        }
      }
    },
    {
      $group: {
        _id: null,
        totalExits: { $sum: 1 },
        returned: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
        currentlyOut: { $sum: { $cond: [{ $eq: ['$status', 'out'] }, 1, 0] } },
        avgDuration: { $avg: '$timeOut' }
      }
    }
  ]);

  return stats[0] || {
    totalExits: 0,
    returned: 0,
    late: 0,
    currentlyOut: 0,
    avgDuration: 0
  };
};

exitLogSchema.set('toJSON', { virtuals: true });
exitLogSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ExitLog', exitLogSchema);
