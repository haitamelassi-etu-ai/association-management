const mongoose = require('mongoose');

const beneficiarySchema = new mongoose.Schema({
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
  dateNaissance: {
    type: Date
  },
  cin: {
    type: String,
    trim: true
  },
  telephone: {
    type: String,
    trim: true
  },
  adresseOrigine: {
    type: String,
    trim: true
  },
  dateEntree: {
    type: Date,
    required: [true, 'La date d\'entrée est requise'],
    default: Date.now
  },
  dateSortie: {
    type: Date
  },
  statut: {
    type: String,
    enum: ['heberge', 'sorti', 'en_suivi', 'transfere'],
    default: 'heberge'
  },
  typeDepart: {
    type: String,
    enum: ['réinsertion', 'abandon', 'transfert', 'décès', 'autre'],
    default: null
  },
  motifEntree: {
    type: String,
    trim: true
  },
  situationFamiliale: {
    type: String,
    enum: ['celibataire', 'marie', 'divorce', 'veuf', 'autre'],
    default: 'celibataire'
  },
  nombreEnfants: {
    type: Number,
    default: 0
  },
  professionAvant: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  documents: [{
    nom: String,
    type: {
      type: String,
      enum: ['cin', 'certificat_medical', 'photo', 'attestation', 'autre'],
      default: 'autre'
    },
    description: String,
    url: String,
    filename: String,
    size: Number,
    dateUpload: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  suiviSocial: [{
    date: {
      type: Date,
      default: Date.now
    },
    description: String,
    responsable: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for age calculation
beneficiarySchema.virtual('age').get(function() {
  if (!this.dateNaissance) return null;
  const today = new Date();
  const birthDate = new Date(this.dateNaissance);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

module.exports = mongoose.model('Beneficiary', beneficiarySchema);
