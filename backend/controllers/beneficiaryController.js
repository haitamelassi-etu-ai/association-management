const Beneficiary = require('../models/Beneficiary');

// @desc    Get all beneficiaries
// @route   GET /api/beneficiaries
// @access  Private
exports.getBeneficiaries = async (req, res) => {
  try {
    const { statut, search, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    // Filter by status
    if (statut) {
      query.statut = statut;
    }
    
    // Search by name
    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { prenom: { $regex: search, $options: 'i' } }
      ];
    }
    
    const beneficiaries = await Beneficiary.find(query)
      .populate('createdBy', 'nom prenom')
      .populate('updatedBy', 'nom prenom')
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single beneficiary
// @route   GET /api/beneficiaries/:id
// @access  Private
exports.getBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id)
      .populate('createdBy', 'nom prenom email')
      .populate('updatedBy', 'nom prenom email')
      .populate('suiviSocial.responsable', 'nom prenom');
    
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Bénéficiaire non trouvé'
      });
    }
    
    res.status(200).json({
      success: true,
      data: beneficiary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create beneficiary
// @route   POST /api/beneficiaries
// @access  Private
exports.createBeneficiary = async (req, res) => {
  try {
    req.body.createdBy = req.user._id;
    
    const beneficiary = await Beneficiary.create(req.body);
    
    res.status(201).json({
      success: true,
      data: beneficiary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update beneficiary
// @route   PUT /api/beneficiaries/:id
// @access  Private
exports.updateBeneficiary = async (req, res) => {
  try {
    req.body.updatedBy = req.user._id;
    
    const beneficiary = await Beneficiary.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Bénéficiaire non trouvé'
      });
    }
    
    res.status(200).json({
      success: true,
      data: beneficiary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete beneficiary
// @route   DELETE /api/beneficiaries/:id
// @access  Private/Admin
exports.deleteBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findByIdAndDelete(req.params.id);
    
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Bénéficiaire non trouvé'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Bénéficiaire supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add social follow-up note
// @route   POST /api/beneficiaries/:id/suivi
// @access  Private
exports.addSuiviSocial = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id);
    
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Bénéficiaire non trouvé'
      });
    }
    
    beneficiary.suiviSocial.push({
      description: req.body.description,
      responsable: req.user._id
    });
    
    await beneficiary.save();
    
    res.status(200).json({
      success: true,
      data: beneficiary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get statistics
// @route   GET /api/beneficiaries/stats/dashboard
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const total = await Beneficiary.countDocuments();
    const heberge = await Beneficiary.countDocuments({ statut: 'heberge' });
    const sorti = await Beneficiary.countDocuments({ statut: 'sorti' });
    const enSuivi = await Beneficiary.countDocuments({ statut: 'en_suivi' });
    
    // Nouveaux entrées ce mois
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const nouveauxCeMois = await Beneficiary.countDocuments({
      dateEntree: { $gte: startOfMonth }
    });
    
    res.status(200).json({
      success: true,
      data: {
        total,
        heberge,
        sorti,
        enSuivi,
        nouveauxCeMois
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
