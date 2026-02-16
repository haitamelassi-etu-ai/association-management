const mongoose = require('mongoose');

const financialSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['revenu', 'depense'],
    required: [true, 'Le type est requis']
  },
  categorie: {
    type: String,
    enum: [
      'don', 'subvention', 'cotisation', 'vente', 'autre_revenu',
      'salaires', 'loyer', 'nourriture', 'medicaments', 'equipement',
      'transport', 'maintenance', 'fournitures', 'autre_depense'
    ],
    required: [true, 'La catégorie est requise']
  },
  montant: {
    type: Number,
    required: [true, 'Le montant est requis'],
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  reference: {
    type: String,
    trim: true
  },
  donateur: {
    nom: String,
    telephone: String,
    email: String,
    anonyme: { type: Boolean, default: false }
  },
  modePaiement: {
    type: String,
    enum: ['especes', 'cheque', 'virement', 'carte', 'autre'],
    default: 'especes'
  },
  recu: {
    type: Boolean,
    default: false
  },
  fichierJoint: {
    type: String
  },
  budget: {
    type: String,
    trim: true
  },
  approuve: {
    type: Boolean,
    default: false
  },
  approuvePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  creePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

financialSchema.index({ type: 1, date: -1 });
financialSchema.index({ categorie: 1 });
financialSchema.index({ date: -1 });

module.exports = mongoose.model('Financial', financialSchema);
