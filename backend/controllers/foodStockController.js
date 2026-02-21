const FoodStock = require('../models/FoodStock');
const { notifyAdmins } = require('../utils/notificationHelper');

// Obtenir tous les articles du stock
exports.getAllStock = async (req, res) => {
  try {
    const { statut, categorie, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 500;
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

    await notifyAdmins({
      type: 'success',
      title: 'Stock Alimentaire - Ajout',
      message: `${item.nom || 'Article'} ajouté (${item.quantite} unités)`,
      icon: '📦',
      link: '/professional/food-stock',
      metadata: { foodStockId: item._id, action: 'create' },
      createdBy: req.user.id
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Erreur lors de la création de l\'article:', error);
    res.status(400).json({ message: 'Erreur de validation', error: error.message });
  }
};

// Rechercher un article par code-barres
exports.getByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;

    if (!barcode || barcode.trim() === '') {
      return res.status(400).json({ message: 'Le code-barres est requis' });
    }

    const item = await FoodStock.findOne({ barcode: barcode.trim() });

    if (!item) {
      return res.status(404).json({ message: 'Produit non trouvé', barcode });
    }

    res.json(item);
  } catch (error) {
    console.error('Erreur lors de la recherche par code-barres:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
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
    const nouvelleQuantite = req.body.quantite !== undefined ? Number(req.body.quantite) : undefined;
    
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

    if (nouvelleQuantite !== undefined && !Number.isNaN(nouvelleQuantite) && nouvelleQuantite !== ancienneQuantite) {
      const diff = nouvelleQuantite - ancienneQuantite;
      await notifyAdmins({
        type: diff > 0 ? 'success' : 'warning',
        title: 'Stock Alimentaire - Mise à jour',
        message: `${item.nom || 'Article'}: ${ancienneQuantite} → ${nouvelleQuantite} unités`,
        icon: diff > 0 ? '➕' : '➖',
        link: '/professional/food-stock',
        metadata: { foodStockId: item._id, action: diff > 0 ? 'increase' : 'decrease', diff },
        createdBy: req.user.id
      });
    }
    res.json(item);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'article:', error);
    res.status(400).json({ message: 'Erreur de validation', error: error.message });
  }
};

// Ajuster le stock (ajouter ou retirer)
exports.adjustStock = async (req, res) => {
  try {
    const { quantite, type, raison } = req.body;
    const item = await FoodStock.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    if (!quantite || quantite <= 0) {
      return res.status(400).json({ message: 'La quantité doit être supérieure à 0' });
    }

    if (type === 'add') {
      item.quantite += quantite;
    } else if (type === 'remove') {
      if (quantite > item.quantite) {
        return res.status(400).json({
          message: 'Quantité à retirer supérieure au stock disponible',
          disponible: item.quantite
        });
      }
      item.quantite -= quantite;
    } else {
      return res.status(400).json({ message: 'Type doit être "add" ou "remove"' });
    }

    // Recalculer le statut
    if (item.quantite <= 0) {
      item.statut = 'critique';
    } else if (item.quantite <= item.seuilCritique) {
      item.statut = 'faible';
    } else {
      item.statut = 'disponible';
    }

    await item.save();

    const action = type === 'add' ? 'Approvisionnement' : 'Retrait';
    await notifyAdmins({
      type: 'info',
      title: `Stock Alimentaire - ${action}`,
      message: `${item.nom}: ${type === 'add' ? '+' : '-'}${quantite} ${item.unite} (total: ${item.quantite})${raison ? ' - ' + raison : ''}`,
      icon: type === 'add' ? '📦' : '📤',
      link: '/professional/food-stock',
      metadata: { foodStockId: item._id, action: type, quantite, raison },
      createdBy: req.user.id
    });

    res.json(item);
  } catch (error) {
    console.error('Erreur ajustement stock:', error);
    res.status(400).json({ message: 'Erreur lors de l\'ajustement', error: error.message });
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

    await notifyAdmins({
      type: 'info',
      title: 'Stock Alimentaire - Consommation',
      message: `${item.nom || 'Article'}: -${quantite} (reste ${item.quantite})`,
      icon: '🍽️',
      link: '/professional/food-stock',
      metadata: { foodStockId: item._id, action: 'consume', quantite, raison },
      createdBy: req.user.id
    });

    res.json(item);
  } catch (error) {
    console.error('Erreur lors de la consommation:', error);
    res.status(400).json({ message: 'Erreur lors de la consommation', error: error.message });
  }
};

// Enregistrer une sortie de stock
exports.sortieStock = async (req, res) => {
  try {
    const { quantite, typeSortie, destination, raison } = req.body;
    const item = await FoodStock.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    if (!quantite || quantite <= 0) {
      return res.status(400).json({ message: 'La quantité doit être supérieure à 0' });
    }

    if (quantite > item.quantite) {
      return res.status(400).json({ 
        message: 'Quantité demandée supérieure à la quantité disponible',
        disponible: item.quantite
      });
    }

    if (!typeSortie) {
      return res.status(400).json({ message: 'Le type de sortie est obligatoire' });
    }

    item.enregistrerSortie(quantite, req.user.id, typeSortie, destination, raison);
    await item.save();

    const typeSortieLabels = {
      don: 'Don',
      transfert: 'Transfert',
      perte: 'Perte',
      expire_jete: 'Expiré/Jeté',
      retour_fournisseur: 'Retour fournisseur',
      autre: 'Autre'
    };

    await notifyAdmins({
      type: typeSortie === 'don' ? 'info' : 'warning',
      title: `Stock Alimentaire - Sortie (${typeSortieLabels[typeSortie] || typeSortie})`,
      message: `${item.nom || 'Article'}: -${quantite} ${item.unite} (reste ${item.quantite})${destination ? ' → ' + destination : ''}`,
      icon: '📤',
      link: '/professional/food-stock',
      metadata: { foodStockId: item._id, action: 'sortie', typeSortie, quantite, destination, raison },
      createdBy: req.user.id
    });

    res.json(item);
  } catch (error) {
    console.error('Erreur lors de la sortie:', error);
    res.status(400).json({ message: 'Erreur lors de la sortie', error: error.message });
  }
};

// Obtenir l'historique global de tous les mouvements de stock
exports.getGlobalHistory = async (req, res) => {
  try {
    const { action, typeSortie, search, dateFrom, dateTo, page: pageParam, limit: limitParam } = req.query;
    const page = parseInt(pageParam) || 1;
    const limit = parseInt(limitParam) || 50;

    // Build aggregation pipeline
    const pipeline = [
      { $unwind: '$historique' },
      { $lookup: { from: 'users', localField: 'historique.utilisateur', foreignField: '_id', as: 'historique.utilisateurInfo' } },
      { $unwind: { path: '$historique.utilisateurInfo', preserveNullAndEmptyArrays: true } }
    ];

    // Match filters
    const matchStage = {};
    if (action) {
      if (action === 'sortie_consommation') {
        matchStage['historique.action'] = { $in: ['sortie', 'consommation'] };
      } else {
        matchStage['historique.action'] = action;
      }
    }
    if (typeSortie) {
      matchStage['historique.typeSortie'] = typeSortie;
    }
    if (dateFrom || dateTo) {
      matchStage['historique.date'] = {};
      if (dateFrom) matchStage['historique.date'].$gte = new Date(dateFrom);
      if (dateTo) matchStage['historique.date'].$lte = new Date(dateTo + 'T23:59:59.999Z');
    }
    if (search) {
      matchStage['nom'] = { $regex: search, $options: 'i' };
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Count total
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await FoodStock.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Sort, paginate, project
    pipeline.push({ $sort: { 'historique.date': -1 } });
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });
    pipeline.push({
      $project: {
        _id: 1,
        nom: 1,
        categorie: 1,
        unite: 1,
        'historique.date': 1,
        'historique.action': 1,
        'historique.quantite': 1,
        'historique.quantiteRestante': 1,
        'historique.notes': 1,
        'historique.typeSortie': 1,
        'historique.destination': 1,
        'historique.utilisateurInfo.name': 1,
        'historique.utilisateurInfo.email': 1
      }
    });

    const results = await FoodStock.aggregate(pipeline);

    // Flatten results
    const history = results.map(r => ({
      itemId: r._id,
      itemNom: r.nom,
      itemCategorie: r.categorie,
      itemUnite: r.unite,
      date: r.historique.date,
      action: r.historique.action,
      quantite: r.historique.quantite,
      quantiteRestante: r.historique.quantiteRestante,
      notes: r.historique.notes,
      typeSortie: r.historique.typeSortie || null,
      destination: r.historique.destination || null,
      utilisateur: r.historique.utilisateurInfo ? {
        name: r.historique.utilisateurInfo.name,
        email: r.historique.utilisateurInfo.email
      } : null
    }));

    // Stats summary
    const statsPipeline = [
      { $unwind: '$historique' }
    ];
    if (action === 'sortie_consommation') {
      statsPipeline.push({ $match: { 'historique.action': { $in: ['sortie', 'consommation'] } } });
    }
    statsPipeline.push({
      $group: {
        _id: '$historique.action',
        count: { $sum: 1 },
        totalQuantite: { $sum: '$historique.quantite' }
      }
    });
    const stats = await FoodStock.aggregate(statsPipeline);

    // Sortie breakdown by type
    const sortieBreakdown = await FoodStock.aggregate([
      { $unwind: '$historique' },
      { $match: { 'historique.action': 'sortie' } },
      { $group: { _id: '$historique.typeSortie', count: { $sum: 1 }, totalQuantite: { $sum: '$historique.quantite' } } }
    ]);

    res.json({
      history,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      stats,
      sortieBreakdown
    });
  } catch (error) {
    console.error('Erreur historique global:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
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

// Obtenir l'historique d'un article
exports.getItemHistory = async (req, res) => {
  try {
    const item = await FoodStock.findById(req.params.id)
      .populate('historique.utilisateur', 'name email')
      .select('nom historique');
    if (!item) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }
    const sorted = (item.historique || []).sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ nom: item.nom, historique: sorted });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Données pour les graphiques
exports.getChartData = async (req, res) => {
  try {
    // 1. Stock par catégorie (pie chart)
    const parCategorie = await FoodStock.aggregate([
      { $group: { _id: '$categorie', count: { $sum: 1 }, valeur: { $sum: { $multiply: ['$quantite', '$prix'] } }, quantiteTotale: { $sum: '$quantite' } } }
    ]);

    // 2. Stock par statut (pie chart)
    const parStatut = await FoodStock.aggregate([
      { $group: { _id: '$statut', count: { $sum: 1 } } }
    ]);

    // 3. Top 10 articles par valeur (bar chart)
    const topArticles = await FoodStock.find()
      .sort({ quantite: -1 })
      .limit(10)
      .select('nom quantite unite prix categorie');

    // 4. Valeur par catégorie (bar chart)
    const valeurParCategorie = await FoodStock.aggregate([
      { $group: { _id: '$categorie', valeur: { $sum: { $multiply: ['$quantite', '$prix'] } } } },
      { $sort: { valeur: -1 } }
    ]);

    // 5. Achats par mois (line chart) - basé sur dateAchat
    const achatsParMois = await FoodStock.aggregate([
      { $group: {
        _id: { year: { $year: '$dateAchat' }, month: { $month: '$dateAchat' } },
        count: { $sum: 1 },
        valeur: { $sum: { $multiply: ['$quantite', '$prix'] } }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    res.json({
      parCategorie,
      parStatut,
      topArticles,
      valeurParCategorie,
      achatsParMois
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Données pour le calendrier d'expiration
exports.getExpirationCalendar = async (req, res) => {
  try {
    const items = await FoodStock.find({
      dateExpiration: { $exists: true }
    })
    .select('nom categorie quantite unite dateExpiration statut')
    .sort({ dateExpiration: 1 });

    // Grouper par date
    const grouped = {};
    items.forEach(item => {
      const dateKey = new Date(item.dateExpiration).toISOString().split('T')[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(item);
    });

    res.json({ items, grouped });
  } catch (error) {
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
