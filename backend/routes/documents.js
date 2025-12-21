const express = require('express');
const router = express.Router();
const Beneficiary = require('../models/Beneficiary');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const uploadsDir = upload.uploadsDir || path.join(__dirname, '../uploads/beneficiaries');

// @desc    Upload document for beneficiary
// @route   POST /api/documents/beneficiary/:id
// @access  Private (Admin, Manager, Staff)
router.post('/beneficiary/:id', protect, authorize('admin', 'manager', 'staff'), upload.single('document'), async (req, res) => {
  try {
    const { id } = req.params;
    const { type, description } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    // Find beneficiary
    const beneficiary = await Beneficiary.findById(id);
    if (!beneficiary) {
      // Delete uploaded file if beneficiary not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Bénéficiaire non trouvé'
      });
    }

    // Add document to beneficiary
    const document = {
      nom: req.file.originalname,
      type: type || 'autre',
      description: description || '',
      url: `/uploads/beneficiaries/${req.file.filename}`,
      filename: req.file.filename,
      size: req.file.size,
      dateUpload: new Date(),
      uploadedBy: req.user.id
    };

    beneficiary.documents.push(document);
    await beneficiary.save();

    res.status(201).json({
      success: true,
      message: 'Document ajouté avec succès',
      data: document
    });
  } catch (error) {
    console.error('Document upload error:', error);
    
    // Delete file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du document',
      error: error.message
    });
  }
});

// @desc    Get documents for beneficiary
// @route   GET /api/documents/beneficiary/:id
// @access  Private (Admin, Manager, Staff)
router.get('/beneficiary/:id', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;

    const beneficiary = await Beneficiary.findById(id).populate('documents.uploadedBy', 'nom prenom');
    
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Bénéficiaire non trouvé'
      });
    }

    res.json({
      success: true,
      data: beneficiary.documents
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des documents',
      error: error.message
    });
  }
});

// @desc    Delete document
// @route   DELETE /api/documents/beneficiary/:id/document/:documentId
// @access  Private (Admin, Manager)
router.delete('/beneficiary/:id/document/:documentId', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id, documentId } = req.params;

    const beneficiary = await Beneficiary.findById(id);
    
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Bénéficiaire non trouvé'
      });
    }

    // Find document
    const docIndex = beneficiary.documents.findIndex(doc => doc._id.toString() === documentId);
    
    if (docIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    const document = beneficiary.documents[docIndex];

    // Delete file from filesystem
    const filePath = path.join(uploadsDir, document.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from array
    beneficiary.documents.splice(docIndex, 1);
    await beneficiary.save();

    res.json({
      success: true,
      message: 'Document supprimé avec succès'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du document',
      error: error.message
    });
  }
});

// @desc    Download document
// @route   GET /api/documents/download/:filename
// @access  Private
router.get('/download/:filename', protect, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé'
      });
    }

    res.download(filePath);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du téléchargement',
      error: error.message
    });
  }
});

module.exports = router;
