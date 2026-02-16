const Beneficiary = require('../models/Beneficiary');
const Distribution = require('../models/Distribution');
const FoodStock = require('../models/FoodStock');
const { notifyAdmins, notificationTemplates } = require('../utils/notificationHelper');
const XLSX = require('xlsx');

// @desc    Get all beneficiaries
// @route   GET /api/beneficiaries
// @access  Private
exports.getBeneficiaries = async (req, res) => {
  try {
    const { statut, search, situationType, sexe, page = 1, limit = 500 } = req.query;
    
    let query = {};
    
    if (statut) query.statut = statut;
    if (situationType) query.situationType = situationType;
    if (sexe) query.sexe = sexe;
    
    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { prenom: { $regex: search, $options: 'i' } },
        { cin: { $regex: search, $options: 'i' } },
        { telephone: { $regex: search, $options: 'i' } },
        { lieuNaissance: { $regex: search, $options: 'i' } },
        { entiteOrientatrice: { $regex: search, $options: 'i' } },
        { lieuIntervention: { $regex: search, $options: 'i' } }
      ];
    }
    
    const beneficiaries = await Beneficiary.find(query)
      .populate('createdBy', 'nom prenom')
      .populate('updatedBy', 'nom prenom')
      .populate('caseWorker', 'nom prenom')
      .sort({ dateEntree: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Beneficiary.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: beneficiaries
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single beneficiary with distributions
// @route   GET /api/beneficiaries/:id
// @access  Private
exports.getBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id)
      .populate('createdBy', 'nom prenom email')
      .populate('updatedBy', 'nom prenom email')
      .populate('caseWorker', 'nom prenom email')
      .populate('suiviSocial.responsable', 'nom prenom');
    
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Bénéficiaire non trouvé' });
    }

    // Get distributions for this beneficiary
    const distributions = await Distribution.find({ beneficiary: req.params.id })
      .populate('distributedBy', 'nom prenom')
      .populate('items.linkedStockItem', 'nom categorie')
      .sort({ date: -1 })
      .limit(50);
    
    res.status(200).json({
      success: true,
      data: beneficiary,
      distributions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create beneficiary
// @route   POST /api/beneficiaries
// @access  Private
exports.createBeneficiary = async (req, res) => {
  try {
    req.body.createdBy = req.user._id;
    
    const beneficiary = await Beneficiary.create(req.body);

    const beneficiaryName = `${beneficiary.prenom || ''} ${beneficiary.nom || ''}`.trim();
    await notifyAdmins({
      ...notificationTemplates.newBeneficiary(beneficiaryName),
      metadata: { beneficiaryId: beneficiary._id, action: 'create' },
      createdBy: req.user._id
    });
    
    res.status(201).json({ success: true, data: beneficiary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update beneficiary
// @route   PUT /api/beneficiaries/:id
// @access  Private
exports.updateBeneficiary = async (req, res) => {
  try {
    req.body.updatedBy = req.user._id;
    const before = await Beneficiary.findById(req.params.id).select('statut nom prenom');

    const beneficiary = await Beneficiary.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Bénéficiaire non trouvé' });
    }

    if (before?.statut !== 'sorti' && beneficiary.statut === 'sorti') {
      const beneficiaryName = `${beneficiary.prenom || ''} ${beneficiary.nom || ''}`.trim();
      await notifyAdmins({
        ...notificationTemplates.beneficiaryExit(beneficiaryName),
        metadata: { beneficiaryId: beneficiary._id, action: 'exit' },
        createdBy: req.user._id
      });
    }
    
    res.status(200).json({ success: true, data: beneficiary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete beneficiary
// @route   DELETE /api/beneficiaries/:id
// @access  Private/Admin
exports.deleteBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findByIdAndDelete(req.params.id);
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Bénéficiaire non trouvé' });
    }
    // Also delete related distributions
    await Distribution.deleteMany({ beneficiary: req.params.id });
    res.status(200).json({ success: true, message: 'Bénéficiaire supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add social follow-up note
// @route   POST /api/beneficiaries/:id/suivi
// @access  Private
exports.addSuiviSocial = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Bénéficiaire non trouvé' });
    }
    
    beneficiary.suiviSocial.push({
      type: req.body.type || 'entretien',
      description: req.body.description,
      responsable: req.user._id
    });
    
    await beneficiary.save();
    res.status(200).json({ success: true, data: beneficiary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get extended statistics
// @route   GET /api/beneficiaries/stats/dashboard
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const total = await Beneficiary.countDocuments();
    const heberge = await Beneficiary.countDocuments({ statut: 'heberge' });
    const sorti = await Beneficiary.countDocuments({ statut: 'sorti' });
    const enSuivi = await Beneficiary.countDocuments({ statut: 'en_suivi' });
    const transfere = await Beneficiary.countDocuments({ statut: 'transfere' });
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const nouveauxCeMois = await Beneficiary.countDocuments({ dateEntree: { $gte: startOfMonth } });

    // Gender stats
    const hommes = await Beneficiary.countDocuments({ sexe: 'homme' });
    const femmes = await Beneficiary.countDocuments({ sexe: 'femme' });

    // Needs stats
    const besoinsAlimentaire = await Beneficiary.countDocuments({ 'besoins.alimentaire': true, statut: 'heberge' });
    const besoinsHygiene = await Beneficiary.countDocuments({ 'besoins.hygiene': true, statut: 'heberge' });
    const besoinsMedical = await Beneficiary.countDocuments({ 'besoins.medical': true, statut: 'heberge' });
    const besoinsVestimentaire = await Beneficiary.countDocuments({ 'besoins.vestimentaire': true, statut: 'heberge' });
    const besoinsPsychologique = await Beneficiary.countDocuments({ 'besoins.psychologique': true, statut: 'heberge' });

    // Situation type stats
    const situationStats = await Beneficiary.aggregate([
      { $match: { statut: 'heberge' } },
      { $group: { _id: '$situationType', count: { $sum: 1 } } }
    ]);

    // Post-accommodation stats
    const maBaadStats = await Beneficiary.aggregate([
      { $match: { maBaadAlIwaa: { $ne: null, $ne: '' } } },
      { $group: { _id: '$maBaadAlIwaa', count: { $sum: 1 } } }
    ]);

    // Distribution stats this month
    const distributionsCeMois = await Distribution.countDocuments({ date: { $gte: startOfMonth } });
    
    res.status(200).json({
      success: true,
      data: {
        total, heberge, sorti, enSuivi, transfere, nouveauxCeMois,
        hommes, femmes,
        besoins: {
          alimentaire: besoinsAlimentaire,
          hygiene: besoinsHygiene,
          medical: besoinsMedical,
          vestimentaire: besoinsVestimentaire,
          psychologique: besoinsPsychologique
        },
        situationStats,
        maBaadStats,
        distributionsCeMois
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Import beneficiaries from Excel
// @route   POST /api/beneficiaries/import
// @access  Private
exports.importFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ success: false, message: 'Le fichier est vide' });
    }

    const results = { imported: 0, errors: [], skipped: 0 };
    const columnMap = {
      'nom': 'nom', 'Nom': 'nom', 'NOM': 'nom', 'الاسم العائلي': 'nom',
      'prenom': 'prenom', 'Prénom': 'prenom', 'Prenom': 'prenom', 'PRENOM': 'prenom', 'الاسم الشخصي': 'prenom',
      'الاسم الكامل': 'nomComplet',
      'sexe': 'sexe', 'Sexe': 'sexe', 'Genre': 'sexe', 'الجنس': 'sexe',
      'date_naissance': 'dateNaissance', 'Date de naissance': 'dateNaissance', 'DateNaissance': 'dateNaissance', 'تاريخ الازدياد': 'dateNaissance',
      'lieu_naissance': 'lieuNaissance', 'Lieu de naissance': 'lieuNaissance', 'مكان الازدياد': 'lieuNaissance',
      'cin': 'cin', 'CIN': 'cin', 'رقم البطاقة': 'cin', 'رقم البطاقة الوطنية': 'cin',
      'telephone': 'telephone', 'Téléphone': 'telephone', 'Tel': 'telephone', 'الهاتف': 'telephone',
      'adresse': 'adresseOrigine', 'Adresse': 'adresseOrigine', 'العنوان': 'adresseOrigine',
      'etat_sante': 'etatSante', 'Etat de santé': 'etatSante', 'الحالة الصحية': 'etatSante',
      'entite_orientatrice': 'entiteOrientatrice', 'Entité orientatrice': 'entiteOrientatrice', 'الجهة الموجهة': 'entiteOrientatrice',
      'lieu_intervention': 'lieuIntervention', 'Lieu intervention': 'lieuIntervention', 'مكان التدخل': 'lieuIntervention',
      'situation_sociale': 'situationType', 'Situation sociale': 'situationType', 'الحالة الاجتماعية': 'situationType',
      'ma_baad_iwaa': 'maBaadAlIwaa', 'Post-hébergement': 'maBaadAlIwaa', 'ما بعد الايواء': 'maBaadAlIwaa',
      'date_iwaa': 'dateEntree', 'Date hébergement': 'dateEntree', 'تاريخ الايواء': 'dateEntree',
      'date_mughAdara': 'dateSortie', 'Date départ': 'dateSortie', 'تاريخ المغادرة': 'dateSortie',
      'situation_familiale': 'situationFamiliale', 'Situation familiale': 'situationFamiliale', 'الحالة العائلية': 'situationFamiliale',
      'nombre_enfants': 'nombreEnfants', 'Nombre enfants': 'nombreEnfants', 'عدد الأطفال': 'nombreEnfants',
      'profession': 'professionAvant', 'Profession': 'professionAvant', 'المهنة': 'professionAvant',
      'notes': 'notes', 'Notes': 'notes', 'ملاحظات': 'notes',
      'motif': 'motifEntree', 'Motif': 'motifEntree', 'سبب الدخول': 'motifEntree',
      'chambre': 'roomNumber', 'Chambre': 'roomNumber', 'رقم الغرفة': 'roomNumber',
      'lit': 'bedNumber', 'Lit': 'bedNumber', 'رقم السرير': 'bedNumber',
      'ر.ت': 'numeroDossier'
    };

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        const mapped = {};

        // Map columns
        for (const [key, value] of Object.entries(row)) {
          const field = columnMap[key.trim()];
          if (field) {
            mapped[field] = value;
          }
        }

        if (!mapped.nom || !mapped.prenom) {
          // Try to split nomComplet
          if (mapped.nomComplet) {
            const parts = mapped.nomComplet.toString().trim().split(/\s+/);
            if (parts.length >= 2) {
              mapped.prenom = parts[0];
              mapped.nom = parts.slice(1).join(' ');
            } else {
              mapped.nom = mapped.nomComplet;
              mapped.prenom = '';
            }
          }
          if (!mapped.nom) {
            results.errors.push(`Ligne ${i + 2}: Nom manquant`);
            results.skipped++;
            continue;
          }
        }

        // Parse date (handles DD/MM/YYYY, YYYY.MM.DD, YYYY-MM-DD, just YYYY)
        if (mapped.dateNaissance) {
          const raw = mapped.dateNaissance.toString().trim();
          let d;
          // DD/MM/YYYY
          const dmy = raw.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
          if (dmy) {
            d = new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]));
          }
          // YYYY.MM.DD or YYYY-MM-DD or YYYY/MM/DD
          if (!d || isNaN(d.getTime())) {
            const ymd = raw.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
            if (ymd) {
              d = new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]));
            }
          }
          // Just year
          if (!d || isNaN(d.getTime())) {
            const yearOnly = raw.match(/^(\d{4})$/);
            if (yearOnly) {
              d = new Date(parseInt(yearOnly[1]), 0, 1);
            }
          }
          // Fallback
          if (!d || isNaN(d.getTime())) {
            d = new Date(raw);
          }
          mapped.dateNaissance = (d && !isNaN(d.getTime())) ? d : undefined;
        }

        // Parse dateEntree (same flexible parsing)
        if (mapped.dateEntree) {
          const raw = mapped.dateEntree.toString().trim();
          let d;
          const dmy = raw.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
          if (dmy) {
            d = new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]));
          }
          if (!d || isNaN(d.getTime())) {
            const ymd = raw.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
            if (ymd) {
              d = new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]));
            }
          }
          if (!d || isNaN(d.getTime())) {
            d = new Date(raw);
          }
          mapped.dateEntree = (d && !isNaN(d.getTime())) ? d : new Date();
        }

        // Parse dateSortie (same flexible parsing)
        if (mapped.dateSortie) {
          const raw = mapped.dateSortie.toString().trim();
          let d;
          const dmy = raw.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
          if (dmy) {
            d = new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]));
          }
          if (!d || isNaN(d.getTime())) {
            const ymd = raw.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
            if (ymd) {
              d = new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]));
            }
          }
          if (!d || isNaN(d.getTime())) {
            d = new Date(raw);
          }
          mapped.dateSortie = (d && !isNaN(d.getTime())) ? d : undefined;
        }

        // Normalize sexe
        if (mapped.sexe) {
          const s = mapped.sexe.toString().toLowerCase().trim();
          if (s === 'h' || s === 'homme' || s === 'm' || s === 'male' || s === 'ذكر') mapped.sexe = 'homme';
          else if (s === 'f' || s === 'femme' || s === 'female' || s === 'أنثى') mapped.sexe = 'femme';
          else mapped.sexe = 'homme';
        }

        // Normalize situationType (الحالة الاجتماعية)
        if (mapped.situationType) {
          const st = mapped.situationType.toString().trim();
          // Handle all spacing variations of متشرد + متسول
          if (/متشرد\s*\+\s*متسول/.test(st) || st === 'متشرد+متسول') {
            mapped.situationType = 'mutasharrid_mutasawwil';
          } else if (/^متشرد$/.test(st)) {
            mapped.situationType = 'mutasharrid';
          } else if (st === 'التسول' || st === 'تسول') {
            mapped.situationType = 'tasawwul';
          } else if (st === 'تشرد') {
            mapped.situationType = 'tasharrud';
          } else {
            mapped.situationType = 'autre';
          }
        }

        // Normalize maBaadAlIwaa (ما بعد الايواء)
        if (mapped.maBaadAlIwaa) {
          const mb = mapped.maBaadAlIwaa.toString().trim();
          if (mb === 'نزيل بالمركز' || mb === 'نزيل') mapped.maBaadAlIwaa = 'nazil_bilmarkaz';
          else if (mb === 'مغادرة') mapped.maBaadAlIwaa = 'mughAdara';
          else if (/ادماج|إدماج/.test(mb)) mapped.maBaadAlIwaa = 'idmaj_usari';
          else if (mb === 'فرار') mapped.maBaadAlIwaa = 'firAr';
          else if (mb === 'طرد') mapped.maBaadAlIwaa = 'tard';
          else if (mb === 'وفاة') mapped.maBaadAlIwaa = 'wafat';
          // Leave as-is if doesn't match (will be stored as string)
        }

        // Normalize situation familiale
        if (mapped.situationFamiliale) {
          const sf = mapped.situationFamiliale.toString().toLowerCase().trim();
          if (sf.includes('célibataire') || sf.includes('celibataire') || sf === 'أعزب') mapped.situationFamiliale = 'celibataire';
          else if (sf.includes('marié') || sf.includes('marie') || sf === 'متزوج') mapped.situationFamiliale = 'marie';
          else if (sf.includes('divorcé') || sf.includes('divorce') || sf === 'مطلق') mapped.situationFamiliale = 'divorce';
          else if (sf.includes('veuf') || sf === 'أرمل') mapped.situationFamiliale = 'veuf';
          else mapped.situationFamiliale = 'autre';
        }

        // Parse nombre enfants
        if (mapped.nombreEnfants) {
          mapped.nombreEnfants = parseInt(mapped.nombreEnfants) || 0;
        }

        mapped.createdBy = req.user._id;
        mapped.dateEntree = mapped.dateEntree || new Date();

        await Beneficiary.create(mapped);
        results.imported++;
      } catch (err) {
        results.errors.push(`Ligne ${i + 2}: ${err.message}`);
        results.skipped++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Import terminé: ${results.imported} importés, ${results.skipped} ignorés`,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add distribution to beneficiary
// @route   POST /api/beneficiaries/:id/distributions
// @access  Private
exports.addDistribution = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Bénéficiaire non trouvé' });
    }

    const { type, items, notes } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun article à distribuer' });
    }

    // Deduct from stock if linkedStockItem is provided
    for (const item of items) {
      if (item.linkedStockItem) {
        const stockItem = await FoodStock.findById(item.linkedStockItem);
        if (stockItem) {
          if (stockItem.quantite < item.quantite) {
            return res.status(400).json({
              success: false,
              message: `Stock insuffisant pour "${stockItem.nom}" (disponible: ${stockItem.quantite} ${stockItem.unite})`
            });
          }
          stockItem.quantite -= item.quantite;
          
          // Add to history
          if (!stockItem.historique) stockItem.historique = [];
          stockItem.historique.push({
            type: 'sortie',
            quantite: item.quantite,
            raison: `Distribution à ${beneficiary.prenom} ${beneficiary.nom}`,
            effectuePar: req.user._id,
            date: new Date()
          });
          
          await stockItem.save();
        }
      }
    }

    const distribution = await Distribution.create({
      beneficiary: req.params.id,
      type,
      items,
      notes,
      distributedBy: req.user._id
    });

    await distribution.populate('distributedBy', 'nom prenom');

    res.status(201).json({ success: true, data: distribution });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get distributions for a beneficiary
// @route   GET /api/beneficiaries/:id/distributions
// @access  Private
exports.getDistributions = async (req, res) => {
  try {
    const distributions = await Distribution.find({ beneficiary: req.params.id })
      .populate('distributedBy', 'nom prenom')
      .populate('items.linkedStockItem', 'nom categorie unite')
      .sort({ date: -1 });

    res.status(200).json({ success: true, data: distributions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all distributions (for reports)
// @route   GET /api/beneficiaries/distributions/all
// @access  Private
exports.getAllDistributions = async (req, res) => {
  try {
    const { type, startDate, endDate, page = 1, limit = 50 } = req.query;
    let query = {};
    
    if (type) query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const distributions = await Distribution.find(query)
      .populate('beneficiary', 'nom prenom cin')
      .populate('distributedBy', 'nom prenom')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Distribution.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      data: distributions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export beneficiaries template for import
// @route   GET /api/beneficiaries/export/template
// @access  Private
exports.getImportTemplate = async (req, res) => {
  try {
    const templateData = [
      {
        'ر.ت': 1,
        'الاسم الكامل': 'عزيز مقبول',
        'تاريخ الازدياد': '13/01/1969',
        'مكان الازدياد': 'البيضاء',
        'العنوان': 'السعادة 303 ر 20 ر 68 ح/م',
        'الحالة الصحية': 'جيدة',
        'الجهة الموجهة': 'السلطات المحلية',
        'مكان التدخل': 'الى المحمدي',
        'الحالة الاجتماعية': 'متشرد',
        'ما بعد الايواء': 'نزيل بالمركز',
        'تاريخ الايواء': '2020.03.31',
        'تاريخ المغادرة': '',
        'رقم البطاقة الوطنية': 'BJ102114'
      },
      {
        'ر.ت': 2,
        'الاسم الكامل': 'عبد القادر ارجادي',
        'تاريخ الازدياد': '27/07/1960',
        'مكان الازدياد': 'البيضاء',
        'العنوان': 'كريان الرحلة زنقة 29 رقم 15 عين السبع',
        'الحالة الصحية': 'جيدة',
        'الجهة الموجهة': 'السلطات المحلية',
        'مكان التدخل': 'الى المحمدي',
        'الحالة الاجتماعية': 'متشرد',
        'ما بعد الايواء': 'مغادرة',
        'تاريخ الايواء': '2020.03.31',
        'تاريخ المغادرة': '2022.06.01',
        'رقم البطاقة الوطنية': 'JB82900'
      },
      {
        'ر.ت': 3,
        'الاسم الكامل': 'سام الادريسي',
        'تاريخ الازدياد': '1976',
        'مكان الازدياد': 'سطات',
        'العنوان': 'شارع الطاهر العلوي رقم',
        'الحالة الصحية': 'جيدة',
        'الجهة الموجهة': 'السلطات المحلية',
        'مكان التدخل': 'الصخور السوداء',
        'الحالة الاجتماعية': 'متشرد + متسول',
        'ما بعد الايواء': 'ادماج اسري',
        'تاريخ الايواء': '2020.03.31',
        'تاريخ المغادرة': '2022.05.15',
        'رقم البطاقة الوطنية': ''
      },
      {
        'ر.ت': 4,
        'الاسم الكامل': 'رشيد الحنجري',
        'تاريخ الازدياد': '10/11/1975',
        'مكان الازدياد': 'الجديدة',
        'العنوان': 'درب الحرية الزنقة 17 الرقم 29 عين السبع',
        'الحالة الصحية': 'إعاقة جسدية',
        'الجهة الموجهة': 'السلطات المحلية',
        'مكان التدخل': 'عين السبع',
        'الحالة الاجتماعية': 'متشرد + متسول',
        'ما بعد الايواء': 'فرار',
        'تاريخ الايواء': '2020.03.31',
        'تاريخ المغادرة': '2020.06.027',
        'رقم البطاقة الوطنية': ''
      }
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 6 },   // ر.ت
      { wch: 22 },  // الاسم الكامل
      { wch: 16 },  // تاريخ الازدياد
      { wch: 14 },  // مكان الازدياد
      { wch: 40 },  // العنوان
      { wch: 16 },  // الحالة الصحية
      { wch: 20 },  // الجهة الموجهة
      { wch: 20 },  // مكان التدخل
      { wch: 20 },  // الحالة الاجتماعية
      { wch: 18 },  // ما بعد الايواء
      { wch: 14 },  // تاريخ الايواء
      { wch: 14 },  // تاريخ المغادرة
      { wch: 22 }   // رقم البطاقة الوطنية
    ];

    // Set RTL for the sheet
    worksheet['!sheetViews'] = [{ rightToLeft: true }];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'المستفيدين');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=modele_import_beneficiaires.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
