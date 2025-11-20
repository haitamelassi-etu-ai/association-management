const FoodStock = require('../models/FoodStock');

// Obtenir tous les articles du stock
exports.getAllStock = async (req, res) => {
  try {
    const { statut, categorie, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Construire le filtre
    let filter = {};
    
    if (statut) {
      filter.statut = statut;
    }
    
    if (categorie) {
      filter.categorie = categorie;
    }
    
    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { fournisseur: { $regex: search, $options: 'i' } },
        { emplacement: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await FoodStock.countDocuments(filter);
    const items = await FoodStock.find(filter)
      .sort({ dateExpiration: 1 })
      .skip(skip)
      .limit(limit);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du stock:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Obtenir un article spécifique
exports.getStockItem = async (req, res) => {
  try {
    const item = await FoodStock.findById(req.params.id)
      .populate('historique.utilisateur', 'name email');
    
    if (!item) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    res.json(item);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'article:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Créer un nouvel article
exports.createStockItem = async (req, res) => {
  try {
    const itemData = {
      ...req.body,
      quantiteInitiale: req.body.quantite,
      historique: [{
        action: 'ajout',
        quantite: req.body.quantite,
        quantiteRestante: req.body.quantite,
        utilisateur: req.user.id,
        notes: 'Article ajouté au stock'
      }]
    };

    const item = new FoodStock(itemData);
    await item.save();

    res.status(201).json(item);
  } catch (error) {
    console.error('Erreur lors de la création de l\'article:', error);
    res.status(400).json({ message: 'Erreur de validation', error: error.message });
  }
};

// Mettre à jour un article
exports.updateStockItem = async (req, res) => {
  try {
    const item = await FoodStock.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    const ancienneQuantite = item.quantite;
    
    // Mettre à jour les champs
    Object.keys(req.body).forEach(key => {
      if (key !== 'historique') {
        item[key] = req.body[key];
      }
    });

    // Si la quantité a changé, enregistrer dans l'historique
    if (req.body.quantite && req.body.quantite !== ancienneQuantite) {
      const difference = req.body.quantite - ancienneQuantite;
      item.historique.push({
        action: difference > 0 ? 'reapprovisionnement' : 'modification',
        quantite: Math.abs(difference),
        quantiteRestante: req.body.quantite,
        utilisateur: req.user.id,
        notes: req.body.notes || 'Modification de la quantité'
      });
    }

    await item.save();
    res.json(item);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'article:', error);
    res.status(400).json({ message: 'Erreur de validation', error: error.message });
  }
};

// Consommer un article
exports.consommerStock = async (req, res) => {
  try {
    const { quantite, raison } = req.body;
    const item = await FoodStock.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    if (quantite > item.quantite) {
      return res.status(400).json({ 
        message: 'Quantité demandée supérieure à la quantité disponible',
        disponible: item.quantite
      });
    }

    item.enregistrerConsommation(quantite, req.user.id, raison);
    await item.save();

    res.json(item);
  } catch (error) {
    console.error('Erreur lors de la consommation:', error);
    res.status(400).json({ message: 'Erreur lors de la consommation', error: error.message });
  }
};

// Supprimer un article
exports.deleteStockItem = async (req, res) => {
  try {
    const item = await FoodStock.findByIdAndDelete(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    res.json({ message: 'Article supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Obtenir les alertes (articles proches de l'expiration ou quantité critique)
exports.getAlerts = async (req, res) => {
  try {
    const maintenant = new Date();
    const dansSeptJours = new Date(maintenant.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Articles expirant dans les 7 prochains jours
    const alertesExpiration = await FoodStock.find({
      dateExpiration: { 
        $gte: maintenant,
        $lte: dansSeptJours 
      },
      statut: { $ne: 'expire' }
    }).sort({ dateExpiration: 1 });

    // Articles en quantité critique
    const alertesCritiques = await FoodStock.find({
      statut: { $in: ['critique', 'faible'] }
    }).sort({ quantite: 1 });

    res.json({
      expiration: alertesExpiration,
      stock: alertesCritiques
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des alertes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Obtenir les statistiques globales
exports.getStatistics = async (req, res) => {
  try {
    const totalItems = await FoodStock.countDocuments();
    
    const statutStats = await FoodStock.aggregate([
      { $group: { _id: '$statut', count: { $sum: 1 } } }
    ]);

    const valeurTotale = await FoodStock.aggregate([
      { 
        $group: { 
          _id: null, 
          total: { $sum: { $multiply: ['$quantite', '$prix'] } }
        } 
      }
    ]);

    const parCategorie = await FoodStock.aggregate([
      { 
        $group: { 
          _id: '$categorie',
          count: { $sum: 1 },
          valeur: { $sum: { $multiply: ['$quantite', '$prix'] } }
        } 
      }
    ]);

    res.json({
      total: totalItems,
      statuts: statutStats,
      valeurTotale: valeurTotale[0]?.total || 0,
      categories: parCategorie
    });
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Obtenir le plan de consommation recommandé
exports.getPlanConsommation = async (req, res) => {
  try {
    const item = await FoodStock.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    const joursRestants = item.getJoursRestants();
    
    if (joursRestants <= 0) {
      return res.json({
        message: 'Article expiré',
        joursRestants: 0,
        consommationQuotidienne: 0
      });
    }

    const consommationQuotidienne = item.calculerConsommationJournaliere(joursRestants);
    
    res.json({
      nom: item.nom,
      quantiteActuelle: item.quantite,
      joursRestants,
      consommationQuotidienne,
      dateExpiration: item.dateExpiration,
      recommandation: `Consommer ${consommationQuotidienne} ${item.unite} par jour pour éviter le gaspillage`
    });
  } catch (error) {
    console.error('Erreur lors du calcul du plan:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
