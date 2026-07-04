const { AuditLog } = require('../models');

// Redact fields that should never sit in an audit trail, even as a "before"
// snapshot — the whole point of an audit log is safe, reviewable history,
// not a second place secrets can leak from.
const SENSITIVE_FIELDS = ['passwordHash', 'resetToken', 'resetTokenExpires'];

function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = { ...obj };
  SENSITIVE_FIELDS.forEach((f) => delete clean[f]);
  return clean;
}

// Fire-and-forget by design: a logging failure must never break the actual
// request it's describing. Call this AFTER the real action has already
// succeeded, not instead of proper error handling for the action itself.
//
//   await recordAudit(req, {
//     action: 'member.update', entityType: 'User', entityId: user.id,
//     before: previousValues, after: user.toJSON(),
//   });
async function recordAudit(req, { action, entityType, entityId, before, after }) {
  try {
    await AuditLog.create({
      actorUserId: req.user?.id || null,
      action, entityType, entityId,
      before: redact(before), after: redact(after),
      ipAddress: req.ip,
      userAgent: req.get?.('user-agent'),
    });
  } catch (err) {
    console.error('⚠️  Audit log write failed (action continued regardless):', err.message);
  }
}

module.exports = { recordAudit };
