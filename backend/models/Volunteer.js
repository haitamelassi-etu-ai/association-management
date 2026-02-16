const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
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
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  telephone: {
    type: String,
    trim: true
  },
  cin: {
    type: String,
    trim: true
  },
  adresse: {
    type: String,
    trim: true
  },
  competences: [{
    type: String,
    trim: true
  }],
  disponibilites: [{
    jour: {
      type: String,
      enum: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
    },
    debut: String,
    fin: String
  }],
  status: {
    type: String,
    enum: ['actif', 'inactif', 'en_attente'],
    default: 'en_attente'
  },
  dateDebut: {
    type: Date,
    default: Date.now
  },
  dateFin: {
    type: Date
  },
  totalHeures: {
    type: Number,
    default: 0
  },
  taches: [{
    titre: String,
    description: String,
    date: { type: Date, default: Date.now },
    heures: Number,
    status: {
      type: String,
      enum: ['assignee', 'en_cours', 'terminee', 'annulee'],
      default: 'assignee'
    }
  }],
  notes: {
    type: String,
    trim: true
  },
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

volunteerSchema.index({ status: 1 });
volunteerSchema.index({ nom: 1, prenom: 1 });

module.exports = mongoose.model('Volunteer', volunteerSchema);
