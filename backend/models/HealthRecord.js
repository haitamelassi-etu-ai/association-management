const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  beneficiaire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary',
    required: [true, 'Le bénéficiaire est requis']
  },
  type: {
    type: String,
    enum: ['consultation', 'urgence', 'suivi', 'vaccination', 'analyse', 'hospitalisation', 'autre'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  medecin: {
    type: String,
    trim: true
  },
  diagnostic: {
    type: String,
    trim: true
  },
  traitement: {
    type: String,
    trim: true
  },
  prescriptions: [{
    medicament: String,
    posologie: String,
    duree: String,
    notes: String
  }],
  signesVitaux: {
    tension: String,
    temperature: Number,
    poids: Number,
    taille: Number,
    pouls: Number
  },
  allergies: [{
    type: String,
    trim: true
  }],
  antecedents: {
    type: String,
    trim: true
  },
  prochainRdv: {
    type: Date
  },
  fichiers: [{
    nom: String,
    url: String,
    type: String
  }],
  notes: {
    type: String,
    trim: true
  },
  urgence: {
    type: Boolean,
    default: false
  },
  confidentiel: {
    type: Boolean,
    default: true
  },
  creePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

healthRecordSchema.index({ beneficiaire: 1, date: -1 });
healthRecordSchema.index({ type: 1 });
healthRecordSchema.index({ prochainRdv: 1 });

module.exports = mongoose.model('HealthRecord', healthRecordSchema);
