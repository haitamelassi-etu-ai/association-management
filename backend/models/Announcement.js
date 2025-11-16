const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  titre: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true
  },
  contenu: {
    type: String,
    required: [true, 'Le contenu est requis']
  },
  type: {
    type: String,
    enum: ['info', 'urgent', 'tache', 'evenement'],
    default: 'info'
  },
  priorite: {
    type: String,
    enum: ['basse', 'normale', 'haute'],
    default: 'normale'
  },
  destinataires: [{
    type: String,
    enum: ['all', 'admin', 'staff', 'volunteer']
  }],
  dateExpiration: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Announcement', announcementSchema);
