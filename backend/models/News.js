const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Le titre est requis'],
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      required: [true, 'La description est requise'],
      trim: true,
      maxlength: 2000,
    },
    date: {
      type: Date,
      required: [true, 'La date est requise'],
    },
    // Can be a public URL/path OR a data URL (e.g. "data:image/jpeg;base64,...")
    image: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('News', newsSchema);
