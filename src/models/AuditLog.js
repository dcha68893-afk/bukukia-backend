const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Append-only record of who did what, to what, and when. Never updated or
// deleted through the app (see routes/audit-logs.routes.js — it's read-only
// by design; an audit trail you can edit isn't an audit trail).
const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  actorUserId: { type: DataTypes.UUID, allowNull: true }, // null = system/unauthenticated action (e.g. public donation)
  action: { type: DataTypes.STRING, allowNull: false }, // e.g. 'member.update', 'member.delete', 'workflow_request.advance'
  entityType: { type: DataTypes.STRING, allowNull: false }, // e.g. 'User', 'WorkflowRequest'
  entityId: { type: DataTypes.UUID, allowNull: true },
  // Snapshots, not diffs — cheaper to write, and a diff can always be
  // computed from before/after later if needed, but can't be reconstructed
  // if only a diff was stored and the diffing logic had a bug.
  before: { type: DataTypes.JSONB, allowNull: true },
  after: { type: DataTypes.JSONB, allowNull: true },
  ipAddress: { type: DataTypes.STRING },
  userAgent: { type: DataTypes.STRING },
}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false, // append-only: a log entry is never modified after creation
});

module.exports = AuditLog;
