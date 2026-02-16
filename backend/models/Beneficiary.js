const mongoose = require('mongoose');

const beneficiarySchema = new mongoose.Schema({
  // ─── Numéro d'ordre ───
  numeroOrdre: {
    type: Number,
    default: 0
  },
  // ─── Informations personnelles ───
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
  sexe: {
    type: String,
    enum: ['homme', 'femme'],
    default: 'homme'
  },
  dateNaissance: {
    type: Date
  },
  lieuNaissance: {
    type: String,
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
  adresseOrigine: {
    type: String,
    trim: true
  },
  nationalite: {
    type: String,
    trim: true,
    default: 'Marocaine'
  },
  etatSante: {
    type: String,
    trim: true
  },
  entiteOrientatrice: {
    type: String,
    trim: true
  },
  lieuIntervention: {
    type: String,
    trim: true
  },

  // ─── Situation sociale ───
  situationFamiliale: {
    type: String,
    enum: ['celibataire', 'marie', 'divorce', 'veuf', 'autre'],
    default: 'celibataire'
  },
  nombreEnfants: {
    type: Number,
    default: 0
  },
  situationType: {
    type: String,
    enum: ['mutasharrid', 'mutasharrid_mutasawwil', 'tasawwul', 'tasharrud', 'autre'],
    default: 'mutasharrid'
  },
  professionAvant: {
    type: String,
    trim: true
  },
  niveauEducation: {
    type: String,
    enum: ['aucun', 'primaire', 'secondaire', 'universitaire', 'formation_professionnelle'],
    default: 'aucun'
  },

  // ─── Besoins du bénéficiaire ───
  besoins: {
    alimentaire: { type: Boolean, default: false },
    hygiene: { type: Boolean, default: false },
    medical: { type: Boolean, default: false },
    vestimentaire: { type: Boolean, default: false },
    psychologique: { type: Boolean, default: false },
    juridique: { type: Boolean, default: false },
    formation: { type: Boolean, default: false }
  },
  notesBesoins: {
    type: String,
    trim: true
  },

  // ─── Hébergement ───
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
  maBaadAlIwaa: {
    type: String,
    enum: ['nazil_bilmarkaz', 'mughAdara', 'idmaj_usari', 'firAr', 'tard', 'wafat', ''],
    default: 'nazil_bilmarkaz'
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
  isHoused: {
    type: Boolean,
    default: true
  },
  roomNumber: {
    type: String,
    trim: true
  },
  bedNumber: {
    type: String,
    trim: true
  },

  // ─── Santé ───
  groupeSanguin: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
    default: ''
  },
  allergies: {
    type: String,
    trim: true
  },
  maladiesChroniques: {
    type: String,
    trim: true
  },
  traitementEnCours: {
    type: String,
    trim: true
  },

  // ─── Référent social ───
  caseWorker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // ─── Notes & Documents ───
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

  // ─── Suivi social ───
  suiviSocial: [{
    date: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['entretien', 'visite', 'orientation', 'evaluation', 'autre'],
      default: 'entretien'
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

// Index for search
beneficiarySchema.index({ nom: 'text', prenom: 'text', cin: 'text' });
beneficiarySchema.index({ statut: 1, dateEntree: -1 });

module.exports = mongoose.model('Beneficiary', beneficiarySchema);
