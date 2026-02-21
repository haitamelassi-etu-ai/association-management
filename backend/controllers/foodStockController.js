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
    const body = { ...req.body };

    // Clean empty dateExpiration (empty string can't cast to Date)
    if (!body.dateExpiration || String(body.dateExpiration).trim() === '') {
      delete body.dateExpiration;
    }

    // Clean empty barcode to avoid unique constraint on empty strings
    if (!body.barcode || String(body.barcode).trim() === '') {
      delete body.barcode;
    }

    const itemData = {
      ...body,
      quantiteInitiale: body.quantite,
      historique: [{
        action: 'ajout',
        quantite: body.quantite,
        quantiteRestante: body.quantite,
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
    // Clean empty dateExpiration before update
    if (req.body.dateExpiration !== undefined && (!req.body.dateExpiration || String(req.body.dateExpiration).trim() === '')) {
      req.body.dateExpiration = null;
    }

    const item = await FoodStock.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    // Clean empty barcode to avoid unique constraint
    if (req.body.barcode !== undefined && (!req.body.barcode || String(req.body.barcode).trim() === '')) {
      delete req.body.barcode;
      item.barcode = undefined;
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

// ═══════════════════════════════════════════════════════
// STOCK VALUE DASHBOARD
// ═══════════════════════════════════════════════════════
exports.getValueDashboard = async (req, res) => {
  try {
    // Total current value
    const currentValue = await FoodStock.aggregate([
      { $group: { _id: null, total: { $sum: { $multiply: ['$quantite', '$prix'] } }, totalItems: { $sum: 1 } } }
    ]);

    // Value by status
    const valueByStatus = await FoodStock.aggregate([
      { $group: { _id: '$statut', valeur: { $sum: { $multiply: ['$quantite', '$prix'] } }, count: { $sum: 1 } } }
    ]);

    // Value by category
    const valueByCategory = await FoodStock.aggregate([
      { $group: { _id: '$categorie', valeur: { $sum: { $multiply: ['$quantite', '$prix'] } }, count: { $sum: 1 }, quantiteTotale: { $sum: '$quantite' } } },
      { $sort: { valeur: -1 } }
    ]);

    // Value consumed (from history)
    const consumed = await FoodStock.aggregate([
      { $unwind: '$historique' },
      { $match: { 'historique.action': 'consommation' } },
      { $lookup: { from: 'foodstocks', localField: '_id', foreignField: '_id', as: 'item' } },
      { $group: { _id: null, totalQuantite: { $sum: '$historique.quantite' }, count: { $sum: 1 } } }
    ]);

    // Value lost (sortie type perte + expire_jete)
    const lost = await FoodStock.aggregate([
      { $unwind: '$historique' },
      { $match: { 'historique.action': 'sortie', 'historique.typeSortie': { $in: ['perte', 'expire_jete'] } } },
      { $group: { _id: null, totalQuantite: { $sum: '$historique.quantite' }, count: { $sum: 1 } } }
    ]);

    // Value donated
    const donated = await FoodStock.aggregate([
      { $unwind: '$historique' },
      { $match: { 'historique.action': 'sortie', 'historique.typeSortie': 'don' } },
      { $group: { _id: null, totalQuantite: { $sum: '$historique.quantite' }, count: { $sum: 1 } } }
    ]);

    // Initial vs current stock comparison
    const stockComparison = await FoodStock.aggregate([
      { $group: { _id: null, totalInitial: { $sum: '$quantiteInitiale' }, totalCurrent: { $sum: '$quantite' } } }
    ]);

    // Monthly spending trend
    const monthlySpending = await FoodStock.aggregate([
      { $group: {
        _id: { year: { $year: '$dateAchat' }, month: { $month: '$dateAchat' } },
        valeur: { $sum: { $multiply: ['$quantiteInitiale', '$prix'] } },
        count: { $sum: 1 }
      }},
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      currentValue: currentValue[0]?.total || 0,
      totalItems: currentValue[0]?.totalItems || 0,
      valueByStatus,
      valueByCategory,
      consumed: { totalQuantite: consumed[0]?.totalQuantite || 0, count: consumed[0]?.count || 0 },
      lost: { totalQuantite: lost[0]?.totalQuantite || 0, count: lost[0]?.count || 0 },
      donated: { totalQuantite: donated[0]?.totalQuantite || 0, count: donated[0]?.count || 0 },
      stockComparison: {
        initial: stockComparison[0]?.totalInitial || 0,
        current: stockComparison[0]?.totalCurrent || 0,
        consumed: (stockComparison[0]?.totalInitial || 0) - (stockComparison[0]?.totalCurrent || 0)
      },
      monthlySpending: monthlySpending.reverse()
    });
  } catch (error) {
    console.error('Erreur dashboard valeur:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
// LOW STOCK / REORDER SUGGESTIONS
// ═══════════════════════════════════════════════════════
exports.getReorderSuggestions = async (req, res) => {
  try {
    // Items below or at critical threshold
    const lowStockItems = await FoodStock.find({
      $or: [
        { statut: 'critique' },
        { statut: 'faible' },
        { $expr: { $lte: ['$quantite', '$seuilCritique'] } }
      ]
    }).sort({ quantite: 1 });

    // Calculate recommended reorder quantities
    const suggestions = lowStockItems.map(item => {
      const deficit = item.quantiteInitiale - item.quantite;
      const recommendedQty = Math.max(item.quantiteInitiale, item.seuilCritique * 3);
      const urgency = item.quantite === 0 ? 'urgent' : item.quantite <= item.seuilCritique ? 'high' : 'medium';
      return {
        _id: item._id,
        nom: item.nom,
        categorie: item.categorie,
        quantiteActuelle: item.quantite,
        unite: item.unite,
        seuilCritique: item.seuilCritique,
        quantiteInitiale: item.quantiteInitiale,
        quantiteRecommandee: recommendedQty - item.quantite,
        coutEstime: (recommendedQty - item.quantite) * item.prix,
        prix: item.prix,
        fournisseur: item.fournisseur,
        urgency,
        joursRestants: item.dateExpiration ? Math.ceil((new Date(item.dateExpiration) - new Date()) / (1000 * 60 * 60 * 24)) : null
      };
    });

    // Group by urgency
    const urgent = suggestions.filter(s => s.urgency === 'urgent');
    const high = suggestions.filter(s => s.urgency === 'high');
    const medium = suggestions.filter(s => s.urgency === 'medium');

    // Total estimated cost
    const totalCost = suggestions.reduce((sum, s) => sum + s.coutEstime, 0);

    res.json({
      suggestions,
      summary: {
        total: suggestions.length,
        urgent: urgent.length,
        high: high.length,
        medium: medium.length,
        totalCost
      }
    });
  } catch (error) {
    console.error('Erreur suggestions réapprovisionnement:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════
exports.batchConsume = async (req, res) => {
  try {
    const { items } = req.body; // [{ id, quantite, raison }]
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Liste d\'articles requise' });
    }

    const results = [];
    for (const entry of items) {
      try {
        const item = await FoodStock.findById(entry.id);
        if (!item) { results.push({ id: entry.id, success: false, error: 'Non trouvé' }); continue; }
        if (entry.quantite > item.quantite) { results.push({ id: entry.id, nom: item.nom, success: false, error: 'Quantité insuffisante' }); continue; }
        item.enregistrerConsommation(entry.quantite, req.user.id, entry.raison || 'Consommation par lot');
        await item.save();
        results.push({ id: entry.id, nom: item.nom, success: true, quantiteRestante: item.quantite });
      } catch (err) {
        results.push({ id: entry.id, success: false, error: err.message });
      }
    }

    res.json({ results, totalProcessed: items.length, successful: results.filter(r => r.success).length });
  } catch (error) {
    res.status(500).json({ message: 'Erreur opération par lot', error: error.message });
  }
};

exports.batchSortie = async (req, res) => {
  try {
    const { items, typeSortie, destination, raison } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Liste d\'articles requise' });
    }

    const results = [];
    for (const entry of items) {
      try {
        const item = await FoodStock.findById(entry.id);
        if (!item) { results.push({ id: entry.id, success: false, error: 'Non trouvé' }); continue; }
        if (entry.quantite > item.quantite) { results.push({ id: entry.id, nom: item.nom, success: false, error: 'Quantité insuffisante' }); continue; }
        item.enregistrerSortie(entry.quantite, req.user.id, typeSortie || entry.typeSortie || 'autre', destination || entry.destination || '', raison || entry.raison || '');
        await item.save();
        results.push({ id: entry.id, nom: item.nom, success: true, quantiteRestante: item.quantite });
      } catch (err) {
        results.push({ id: entry.id, success: false, error: err.message });
      }
    }

    res.json({ results, totalProcessed: items.length, successful: results.filter(r => r.success).length });
  } catch (error) {
    res.status(500).json({ message: 'Erreur opération par lot', error: error.message });
  }
};

exports.batchDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Liste d\'IDs requise' });
    }
    const result = await FoodStock.deleteMany({ _id: { $in: ids } });
    res.json({ deletedCount: result.deletedCount, requested: ids.length });
  } catch (error) {
    res.status(500).json({ message: 'Erreur suppression par lot', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
// INVENTORY COUNT (جرد)
// ═══════════════════════════════════════════════════════
exports.performInventoryCount = async (req, res) => {
  try {
    const { counts } = req.body; // [{ id, quantitePhysique, notes }]
    if (!counts || !Array.isArray(counts) || counts.length === 0) {
      return res.status(400).json({ message: 'Liste de comptage requise' });
    }

    const results = [];
    for (const entry of counts) {
      try {
        const item = await FoodStock.findById(entry.id);
        if (!item) { results.push({ id: entry.id, success: false, error: 'Non trouvé' }); continue; }

        const difference = entry.quantitePhysique - item.quantite;
        const oldQty = item.quantite;
        item.quantite = entry.quantitePhysique;

        item.historique.push({
          action: 'modification',
          quantite: Math.abs(difference),
          quantiteRestante: entry.quantitePhysique,
          utilisateur: req.user.id,
          notes: `جرد/Inventaire: ${oldQty} → ${entry.quantitePhysique} (${difference > 0 ? '+' : ''}${difference})${entry.notes ? ' | ' + entry.notes : ''}`
        });

        await item.save();
        results.push({
          id: entry.id,
          nom: item.nom,
          success: true,
          ancienneQuantite: oldQty,
          nouvelleQuantite: entry.quantitePhysique,
          difference
        });
      } catch (err) {
        results.push({ id: entry.id, success: false, error: err.message });
      }
    }

    const totalDiffPositive = results.filter(r => r.success && r.difference > 0).reduce((s, r) => s + r.difference, 0);
    const totalDiffNegative = results.filter(r => r.success && r.difference < 0).reduce((s, r) => s + Math.abs(r.difference), 0);

    res.json({
      results,
      summary: {
        total: counts.length,
        successful: results.filter(r => r.success).length,
        withDifference: results.filter(r => r.success && r.difference !== 0).length,
        totalExcess: totalDiffPositive,
        totalDeficit: totalDiffNegative
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur inventaire', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
// IMPORT FROM EXCEL
// ═══════════════════════════════════════════════════════
exports.bulkImport = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Liste d\'articles requise' });
    }

    // Generate unique batch ID for this import (for rollback)
    const importBatchId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const results = [];
    for (const entry of items) {
      try {
        // Only nom is truly required
        if (!entry.nom || String(entry.nom).trim() === '') {
          results.push({ nom: entry.nom || 'Inconnu', success: false, error: 'Le nom est obligatoire' });
          continue;
        }

        const qty = Number(entry.quantite) || 0;
        const itemData = {
          nom: String(entry.nom).trim(),
          categorie: entry.categorie || 'autres',
          quantite: qty,
          quantiteInitiale: qty,
          unite: entry.unite || 'kg',
          prix: Number(entry.prix) || 0,
          dateAchat: entry.dateAchat ? new Date(entry.dateAchat) : new Date(),
          seuilCritique: Number(entry.seuilCritique) || 5,
          fournisseur: entry.fournisseur || '',
          emplacement: entry.emplacement || '',
          notes: entry.notes || '',
          importBatchId: importBatchId,
          historique: [{
            action: 'ajout',
            quantite: qty,
            quantiteRestante: qty,
            utilisateur: req.user.id,
            notes: `Import Excel (batch: ${importBatchId})`
          }]
        };

        // Only set dateExpiration if provided and valid
        if (entry.dateExpiration && String(entry.dateExpiration).trim() !== '') {
          const expDate = new Date(entry.dateExpiration);
          if (!isNaN(expDate.getTime())) {
            itemData.dateExpiration = expDate;
          }
        }

        // Only set barcode if non-empty to avoid unique constraint
        if (entry.barcode && String(entry.barcode).trim() !== '') {
          itemData.barcode = String(entry.barcode).trim();
        }

        const newItem = new FoodStock(itemData);
        await newItem.save();
        results.push({ nom: entry.nom, success: true, id: newItem._id });
      } catch (err) {
        results.push({ nom: entry.nom || 'Inconnu', success: false, error: err.message });
      }
    }

    res.json({
      importBatchId,
      results,
      summary: {
        total: items.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur import', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
// ROLLBACK LAST IMPORT
// ═══════════════════════════════════════════════════════
exports.rollbackImport = async (req, res) => {
  try {
    const { batchId } = req.params;
    if (!batchId) {
      return res.status(400).json({ message: 'Batch ID requis' });
    }

    // Find all items from this batch
    const batchItems = await FoodStock.find({ importBatchId: batchId });
    if (batchItems.length === 0) {
      return res.status(404).json({ message: 'Aucun article trouv\u00e9 pour ce lot d\'import' });
    }

    // Delete all items from this batch
    const result = await FoodStock.deleteMany({ importBatchId: batchId });

    res.json({
      message: `${result.deletedCount} articles supprimés (rollback du lot ${batchId})`,
      deletedCount: result.deletedCount,
      batchId
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur rollback', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
// GET IMPORT BATCHES (list recent imports)
// ═══════════════════════════════════════════════════════
exports.getImportBatches = async (req, res) => {
  try {
    const batches = await FoodStock.aggregate([
      { $match: { importBatchId: { $exists: true, $ne: null } } },
      { $group: {
        _id: '$importBatchId',
        count: { $sum: 1 },
        totalValue: { $sum: { $multiply: ['$quantite', '$prix'] } },
        firstItem: { $first: '$nom' },
        importDate: { $min: '$createdAt' }
      }},
      { $sort: { importDate: -1 } },
      { $limit: 10 }
    ]);

    res.json({ batches });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
// SUPPLIER LIST
// ═══════════════════════════════════════════════════════
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await FoodStock.aggregate([
      { $match: { fournisseur: { $exists: true, $ne: '' } } },
      { $group: {
        _id: '$fournisseur',
        totalArticles: { $sum: 1 },
        totalValeur: { $sum: { $multiply: ['$quantite', '$prix'] } },
        categories: { $addToSet: '$categorie' },
        articles: { $push: { nom: '$nom', quantite: '$quantite', unite: '$unite', prix: '$prix' } }
      }},
      { $sort: { totalValeur: -1 } }
    ]);

    res.json({ suppliers });
  } catch (error) {
    res.status(500).json({ message: 'Erreur fournisseurs', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
// MEAL LINKING / RECIPES
// ═══════════════════════════════════════════════════════
exports.getMealSuggestions = async (req, res) => {
  try {
    // Get available items grouped by category
    const available = await FoodStock.find({ statut: { $ne: 'expire' }, quantite: { $gt: 0 } })
      .select('nom categorie quantite unite dateExpiration prix')
      .sort({ dateExpiration: 1 });

    // Group by category
    const byCategory = {};
    available.forEach(item => {
      if (!byCategory[item.categorie]) byCategory[item.categorie] = [];
      byCategory[item.categorie].push(item);
    });

    // Items expiring soon (priority to use)
    const expiringSoon = available.filter(item => {
      const days = Math.ceil((new Date(item.dateExpiration) - new Date()) / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 7;
    });

    // Build simple meal suggestions based on available categories
    const mealSuggestions = [];

    const hasProteins = byCategory['viandes-poissons']?.length > 0;
    const hasVeggies = byCategory['fruits-legumes']?.length > 0;
    const hasDairy = byCategory['produits-laitiers']?.length > 0;
    const hasGrains = byCategory['cereales-pains']?.length > 0;
    const hasCanned = byCategory['conserves']?.length > 0;
    const hasDrinks = byCategory['boissons']?.length > 0;

    if (hasProteins && hasVeggies && hasGrains) {
      mealSuggestions.push({
        name: '🍽️ وجبة كاملة / Repas Complet',
        description: 'Protéines + Légumes + Céréales',
        ingredients: [
          ...(byCategory['viandes-poissons'] || []).slice(0, 2),
          ...(byCategory['fruits-legumes'] || []).slice(0, 3),
          ...(byCategory['cereales-pains'] || []).slice(0, 1)
        ],
        servings: Math.min(
          ...[(byCategory['viandes-poissons']?.[0]?.quantite || 0), (byCategory['fruits-legumes']?.[0]?.quantite || 0)].filter(q => q > 0)
        ),
        priority: expiringSoon.length > 0 ? 'high' : 'normal'
      });
    }

    if (hasVeggies) {
      mealSuggestions.push({
        name: '🥗 سلطة / Salade',
        description: 'Légumes frais disponibles',
        ingredients: (byCategory['fruits-legumes'] || []).slice(0, 5),
        servings: Math.floor((byCategory['fruits-legumes']?.[0]?.quantite || 0) / 0.3),
        priority: 'normal'
      });
    }

    if (hasDairy && hasGrains) {
      mealSuggestions.push({
        name: '🥞 فطور / Petit-déjeuner',
        description: 'Produits laitiers + Céréales',
        ingredients: [
          ...(byCategory['produits-laitiers'] || []).slice(0, 2),
          ...(byCategory['cereales-pains'] || []).slice(0, 2)
        ],
        servings: Math.floor((byCategory['produits-laitiers']?.[0]?.quantite || 0) / 0.25),
        priority: 'normal'
      });
    }

    if (hasCanned) {
      mealSuggestions.push({
        name: '🥫 وجبة سريعة / Repas Rapide',
        description: 'À base de conserves',
        ingredients: (byCategory['conserves'] || []).slice(0, 3),
        servings: byCategory['conserves']?.[0]?.quantite || 0,
        priority: 'low'
      });
    }

    res.json({
      mealSuggestions,
      expiringSoon,
      availableByCategory: Object.keys(byCategory).map(cat => ({
        categorie: cat,
        count: byCategory[cat].length,
        items: byCategory[cat].slice(0, 5)
      })),
      totalAvailable: available.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur suggestions repas', error: error.message });
  }
};
