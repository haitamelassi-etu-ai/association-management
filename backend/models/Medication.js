const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  beneficiary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary',
    required: true
  },
  pharmacyMedication: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PharmacyStock',
    required: true
  },
  dosage: {
    type: String,
    required: true,
    trim: true // e.g., "1 tablet", "2 capsules"
  },
  frequency: {
    type: String,
    required: true,
    enum: ['once_daily', 'twice_daily', 'three_times_daily', 'every_6_hours', 'every_8_hours', 'every_12_hours', 'as_needed', 'weekly', 'monthly']
  },
  times: [{
    type: String, // e.g., "08:00", "14:00", "20:00"
    required: true
  }],
  withFood: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  prescribedBy: {
    type: String,
    trim: true // Doctor name
  },
  instructions: {
    type: String,
    trim: true
  },
  sideEffects: {
    type: String,
    trim: true
  },
  active: {
    type: Boolean,
    default: true
  },
  chronicTreatment: {
    type: Boolean,
    default: false
  },
  administrationLog: [{
    date: {
      type: Date,
      required: true
    },
    time: {
      type: String,
      required: true
    },
    administered: {
      type: Boolean,
      default: false
    },
    administeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    quantityGiven: {
      type: Number,
      default: 1
    },
    notes: String,
    missed: {
      type: Boolean,
      default: false
    },
    missedReason: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for quick queries
medicationSchema.index({ beneficiary: 1, active: 1 });
medicationSchema.index({ startDate: 1, endDate: 1 });

// Virtual for checking if medication is expired
medicationSchema.virtual('isExpired').get(function() {
  if (!this.endDate) return false;
  return new Date() > this.endDate;
});

// Method to log medication administration
medicationSchema.methods.logAdministration = async function(time, administeredBy, administered = true, notes = '', quantityGiven = 1) {
  this.administrationLog.push({
    date: new Date(),
    time,
    administered,
    administeredBy,
    quantityGiven,
    notes,
    missed: !administered
  });
  
  // Deduct from pharmacy stock if administered
  if (administered && quantityGiven > 0) {
    const PharmacyStock = require('./PharmacyStock');
    const pharmacyMed = await PharmacyStock.findById(this.pharmacyMedication);
    if (pharmacyMed && pharmacyMed.stock >= quantityGiven) {
      pharmacyMed.stock -= quantityGiven;
      await pharmacyMed.save();
    }
  }
  
  await this.save();
  return this;
};

// Static method to get today's schedule for a beneficiary
medicationSchema.statics.getTodaySchedule = async function(beneficiaryId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const medications = await this.find({
    beneficiary: beneficiaryId,
    active: true,
    startDate: { $lte: new Date() },
    $or: [
      { endDate: { $exists: false } },
      { endDate: { $gte: today } }
    ]
  }).populate('beneficiary', 'nom prenom')
    .populate('pharmacyMedication')
    .populate('createdBy', 'name');
  
  const schedule = [];
  
  medications.forEach(med => {
    med.times.forEach(time => {
      const [hours, minutes] = time.split(':');
      const scheduledTime = new Date(today);
      scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Check if already administered today
      const todayLog = med.administrationLog.find(log => {
        const logDate = new Date(log.date);
        return logDate.toDateString() === today.toDateString() && log.time === time;
      });
      
      schedule.push({
        medication: med,
        scheduledTime,
        time,
        administered: todayLog?.administered || false,
        missed: todayLog?.missed || false,
        administeredBy: todayLog?.administeredBy,
        notes: todayLog?.notes
      });
    });
  });
  
  return schedule.sort((a, b) => a.scheduledTime - b.scheduledTime);
};

// Static method to get medications needing refill (from pharmacy)
medicationSchema.statics.getNeedingRefill = async function() {
  const PharmacyStock = require('./PharmacyStock');
  return PharmacyStock.getLowStock();
};

// Static method to get statistics
medicationSchema.statics.getStatistics = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const totalActive = await this.countDocuments({ active: true });
  const chronicTreatments = await this.countDocuments({ active: true, chronicTreatment: true });
  const needingRefill = await this.countDocuments({
    active: true,
    $expr: { $lte: ['$stock', '$refillReminder'] }
  });
  
  const adherenceData = await this.aggregate([
    { $match: { active: true } },
    { $unwind: '$administrationLog' },
    {
      $match: {
        'administrationLog.date': { $gte: today }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        administered: {
          $sum: { $cond: ['$administrationLog.administered', 1, 0] }
        },
        missed: {
          $sum: { $cond: ['$administrationLog.missed', 1, 0] }
        }
      }
    }
  ]);
  
  const adherence = adherenceData.length > 0 ? adherenceData[0] : { total: 0, administered: 0, missed: 0 };
  const adherenceRate = adherence.total > 0 
    ? ((adherence.administered / adherence.total) * 100).toFixed(1)
    : 0;
  
  return {
    totalActive,
    chronicTreatments,
    needingRefill,
    todayAdherence: {
      total: adherence.total,
      administered: adherence.administered,
      missed: adherence.missed,
      rate: adherenceRate
    }
  };
};

medicationSchema.set('toJSON', { virtuals: true });
medicationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Medication', medicationSchema);
