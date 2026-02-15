const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'login_failed',
      'create', 'update', 'delete', 'view',
      'export', 'import', 'backup', 'restore',
      'password_change', 'password_reset',
      'role_change', 'status_change',
      'approval', 'rejection',
      'medication_administered', 'meal_served',
      'attendance_marked', 'exit_recorded'
    ]
  },
  resource: {
    type: String,
    required: true,
    enum: [
      'user', 'beneficiary', 'attendance', 'announcement',
      'medication', 'meal', 'pharmacy', 'foodStock',
      'document', 'report', 'notification', 'schedule',
      'approval', 'system', 'backup'
    ]
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  previousValues: {
    type: mongoose.Schema.Types.Mixed
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
