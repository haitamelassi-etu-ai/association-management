const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  prenom: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true
  },
  cin: {
    type: String,
    trim: true
  },
  telephone: {
    type: String,
    trim: true
  },
  relation: {
    type: String,
    enum: ['famille', 'ami', 'professionnel', 'benevole', 'officiel', 'autre'],
    default: 'autre'
  },
  beneficiaire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary'
  },
  motif: {
    type: String,
    trim: true
  },
  signIn: {
    type: Date,
    required: true,
    default: Date.now
  },
  signOut: {
    type: Date
  },
  badge: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['present', 'sorti'],
    default: 'present'
  },
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

visitorSchema.index({ signIn: -1 });
visitorSchema.index({ status: 1 });
visitorSchema.index({ beneficiaire: 1 });

module.exports = mongoose.model('Visitor', visitorSchema);
