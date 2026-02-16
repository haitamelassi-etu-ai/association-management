const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  numero: {
    type: String,
    required: [true, 'Le numéro de chambre est requis'],
    unique: true,
    trim: true
  },
  etage: {
    type: Number,
    default: 0
  },
  type: {
    type: String,
    enum: ['individuelle', 'double', 'dortoir', 'suite', 'isolation'],
    default: 'individuelle'
  },
  capacite: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  occupants: [{
    beneficiaire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary'
    },
    dateEntree: {
      type: Date,
      default: Date.now
    },
    dateSortie: Date
  }],
  status: {
    type: String,
    enum: ['disponible', 'occupee', 'partielle', 'maintenance', 'hors_service'],
    default: 'disponible'
  },
  equipements: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    trim: true
  },
  dernierNettoyage: {
    type: Date
  },
  prochainNettoyage: {
    type: Date
  }
}, {
  timestamps: true
});

roomSchema.index({ status: 1 });
roomSchema.index({ numero: 1 });

// Virtual for current occupancy count
roomSchema.virtual('occupancyCount').get(function() {
  return this.occupants.filter(o => !o.dateSortie).length;
});

roomSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Room', roomSchema);
