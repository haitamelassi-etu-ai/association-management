const mongoose = require('mongoose');

const documentVersionSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  version: {
    type: Number,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: String,
  fileUrl: String,
  filePath: String,
  fileSize: Number,
  mimeType: String,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changes: String,
  checksum: String
}, { timestamps: true });

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true
  },
  description: String,
  category: {
    type: String,
    enum: ['identity', 'medical', 'legal', 'administrative', 'financial', 'report', 'other'],
    default: 'other'
  },
  currentVersion: {
    type: Number,
    default: 1
  },
  filename: {
    type: String,
    required: true
  },
  originalName: String,
  fileUrl: String,
  filePath: String,
  fileSize: Number,
  mimeType: String,
  beneficiary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary'
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [String],
  isArchived: {
    type: Boolean,
    default: false
  },
  accessControl: {
    public: { type: Boolean, default: false },
    allowedRoles: [{
      type: String,
      enum: ['admin', 'responsable', 'staff', 'volunteer']
    }],
    allowedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  expiryDate: Date,
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

documentSchema.index({ beneficiary: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ category: 1 });
documentSchema.index({ tags: 1 });

const Document = mongoose.model('Document', documentSchema);
const DocumentVersion = mongoose.model('DocumentVersion', documentVersionSchema);

module.exports = { Document, DocumentVersion };
