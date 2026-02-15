const mongoose = require('mongoose');

const approvalRequestSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['leave', 'stock', 'expense', 'document', 'beneficiary_exit', 'medication', 'general']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  data: {
    // Flexible field for request-specific data
    type: mongoose.Schema.Types.Mixed
  },
  // For leave requests
  leaveType: {
    type: String,
    enum: ['annual', 'sick', 'personal', 'emergency', 'other']
  },
  startDate: Date,
  endDate: Date,
  // For stock/expense requests
  amount: Number,
  items: [{
    name: String,
    quantity: Number,
    unitPrice: Number,
    total: Number
  }],
  // Approval workflow
  approvalHistory: [{
    action: {
      type: String,
      enum: ['submitted', 'approved', 'rejected', 'returned', 'cancelled']
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comment: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: Date
  }],
  dueDate: Date,
  completedAt: Date
}, { timestamps: true });

approvalRequestSchema.index({ requestedBy: 1, status: 1 });
approvalRequestSchema.index({ assignedTo: 1, status: 1 });
approvalRequestSchema.index({ type: 1, status: 1 });
approvalRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
