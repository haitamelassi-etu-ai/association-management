const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return !this.room;
    }
  },
  room: {
    type: String,
    required: function() {
      return !this.receiver;
    }
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'file', 'image', 'system'],
    default: 'text'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  attachments: [{
    filename: String,
    originalName: String,
    size: Number,
    mimeType: String,
    url: String
  }],
  metadata: {
    edited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    deleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date,
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ sender: 1, isRead: 1 });
messageSchema.index({ receiver: 1, isRead: 1 });

// Virtual for conversation participants (sorted)
messageSchema.virtual('conversationId').get(function() {
  if (this.room) return this.room;
  const ids = [this.sender.toString(), this.receiver.toString()].sort();
  return ids.join('_');
});

// Method to mark as read
messageSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

module.exports = mongoose.model('Message', messageSchema);
