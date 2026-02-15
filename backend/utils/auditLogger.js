const AuditLog = require('../models/AuditLog');

/**
 * Log an audit event
 * @param {Object} options - Audit log options
 * @param {Object} options.user - User performing the action (from req.user)
 * @param {string} options.action - Action performed
 * @param {string} options.resource - Resource type
 * @param {string} options.resourceId - Resource ID
 * @param {Object} options.details - Additional details
 * @param {Object} options.previousValues - Previous values (for updates)
 * @param {Object} options.newValues - New values (for updates)
 * @param {Object} options.req - Express request object (for IP and user agent)
 */
const logAudit = async (options) => {
  try {
    const {
      user,
      action,
      resource,
      resourceId,
      details,
      previousValues,
      newValues,
      req
    } = options;

    await AuditLog.create({
      user: user?._id || user,
      action,
      resource,
      resourceId,
      details,
      previousValues,
      newValues,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent']
    });
  } catch (error) {
    console.error('❌ Audit log error:', error.message);
    // Don't throw - audit logging should not break main functionality
  }
};

/**
 * Express middleware to auto-log certain actions
 */
const auditMiddleware = (action, resource) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to capture response
    res.json = function(data) {
      // Log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAudit({
          user: req.user,
          action,
          resource,
          resourceId: req.params.id || data?.data?._id,
          details: {
            method: req.method,
            path: req.originalUrl,
            body: req.body
          },
          req
        });
      }
      return originalJson(data);
    };

    next();
  };
};

module.exports = { logAudit, auditMiddleware };
