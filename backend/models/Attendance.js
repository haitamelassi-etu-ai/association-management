const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  notes: {
    type: String,
    trim: true
  },
  statut: {
    type: String,
    enum: ['present', 'absent', 'retard', 'conge'],
    default: 'present'
  }
}, {
  timestamps: true
});

attendanceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Attendance', attendanceSchema);
