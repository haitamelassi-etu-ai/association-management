const mongoose = require('mongoose');

const communicationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['newsletter', 'email', 'sms', 'interne', 'broadcast'],
    required: true
  },
  sujet: {
    type: String,
    required: [true, 'Le sujet est requis'],
    trim: true
  },
  contenu: {
    type: String,
    required: [true, 'Le contenu est requis']
  },
  destinataires: {
    type: String,
    enum: ['tous', 'staff', 'admin', 'benevoles', 'beneficiaires', 'personnalise'],
    default: 'tous'
  },
  destinatairesPersonnalises: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['brouillon', 'planifie', 'envoye', 'erreur'],
    default: 'brouillon'
  },
  dateEnvoi: {
    type: Date
  },
  datePlanifiee: {
    type: Date
  },
  priorite: {
    type: String,
    enum: ['basse', 'normale', 'haute', 'urgente'],
    default: 'normale'
  },
  lu: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dateLecture: {
      type: Date,
      default: Date.now
    }
  }],
  pieces: [{
    nom: String,
    url: String,
    taille: Number
  }],
  reponses: [{
    auteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    contenu: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  creePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

communicationSchema.index({ type: 1, status: 1 });
communicationSchema.index({ createdAt: -1 });
communicationSchema.index({ destinataires: 1 });

module.exports = mongoose.model('Communication', communicationSchema);
