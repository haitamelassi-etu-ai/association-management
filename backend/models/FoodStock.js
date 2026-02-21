const mongoose = require('mongoose');

const foodStockSchema = new mongoose.Schema({
  barcode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  nom: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    trim: true,
    index: true
  },
  categorie: {
    type: String,
    required: [true, 'La catégorie est obligatoire'],
    enum: ['fruits-legumes', 'viandes-poissons', 'produits-laitiers', 'cereales-pains', 'conserves', 'boissons', 'autres'],
    index: true
  },
  quantite: {
    type: Number,
    required: [true, 'La quantité est obligatoire'],
    min: [0, 'La quantité ne peut pas être négative']
  },
  unite: {
    type: String,
    required: [true, 'L\'unité est obligatoire'],
    enum: ['kg', 'g', 'L', 'ml', 'unités', 'boîtes', 'sachets']
  },
  quantiteInitiale: {
    type: Number,
    required: true
  },
  prix: {
    type: Number,
    required: [true, 'Le prix est obligatoire'],
    min: [0, 'Le prix ne peut pas être négatif']
  },
  dateAchat: {
    type: Date,
    required: [true, 'La date d\'achat est obligatoire'],
    default: Date.now
  },
  dateExpiration: {
    type: Date,
    required: [true, 'La date d\'expiration est obligatoire'],
    index: true
  },
  seuilCritique: {
    type: Number,
    required: [true, 'Le seuil critique est obligatoire'],
    min: [0, 'Le seuil critique ne peut pas être négatif']
  },
  fournisseur: {
    type: String,
    trim: true
  },
  statut: {
    type: String,
    enum: ['disponible', 'faible', 'critique', 'expire'],
    default: 'disponible',
    index: true
  },
  emplacement: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  historique: [{
    date: {
      type: Date,
      default: Date.now
    },
    action: {
      type: String,
      enum: ['ajout', 'consommation', 'modification', 'reapprovisionnement', 'sortie'],
      required: true
    },
    typeSortie: {
      type: String,
      enum: ['don', 'transfert', 'perte', 'expire_jete', 'retour_fournisseur', 'autre'],
      default: null
    },
    destination: {
      type: String,
      trim: true
    },
    quantite: Number,
    quantiteRestante: Number,
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }]
}, {
  timestamps: true
});

// Index composé pour les recherches fréquentes
foodStockSchema.index({ statut: 1, dateExpiration: 1 });
foodStockSchema.index({ categorie: 1, statut: 1 });

// Hook pre-save pour calculer automatiquement le statut
foodStockSchema.pre('save', function(next) {
  const maintenant = new Date();
  const joursRestants = Math.ceil((this.dateExpiration - maintenant) / (1000 * 60 * 60 * 24));
  
  // Vérifier si expiré
  if (joursRestants <= 0) {
    this.statut = 'expire';
  } 
  // Vérifier si quantité critique
  else if (this.quantite <= this.seuilCritique) {
    this.statut = 'critique';
  }
  // Vérifier si quantité faible (50% du seuil critique)
  else if (this.quantite <= (this.seuilCritique * 1.5)) {
    this.statut = 'faible';
  }
  // Sinon disponible
  else {
    this.statut = 'disponible';
  }
  
  next();
});

// Méthode pour calculer la consommation journalière recommandée
foodStockSchema.methods.calculerConsommationJournaliere = function(joursRestants) {
  if (joursRestants <= 0) return 0;
  return Math.ceil(this.quantite / joursRestants);
};

// Méthode pour obtenir les jours restants avant expiration
foodStockSchema.methods.getJoursRestants = function() {
  const maintenant = new Date();
  return Math.ceil((this.dateExpiration - maintenant) / (1000 * 60 * 60 * 24));
};

// Méthode pour enregistrer une consommation
foodStockSchema.methods.enregistrerConsommation = function(quantite, utilisateur, raison = '') {
  this.quantite -= quantite;
  
  this.historique.push({
    action: 'consommation',
    quantite: quantite,
    quantiteRestante: this.quantite,
    utilisateur: utilisateur,
    notes: raison
  });
};

// Méthode pour enregistrer une sortie
foodStockSchema.methods.enregistrerSortie = function(quantite, utilisateur, typeSortie, destination = '', raison = '') {
  this.quantite -= quantite;
  
  this.historique.push({
    action: 'sortie',
    quantite: quantite,
    quantiteRestante: this.quantite,
    utilisateur: utilisateur,
    typeSortie: typeSortie,
    destination: destination,
    notes: raison
  });
};

const FoodStock = mongoose.model('FoodStock', foodStockSchema);

module.exports = FoodStock;
