const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Audit trail: one row per step transition on a WorkflowRequest. Kept
// separate from WorkflowRequest itself (rather than overwriting a single
// "last action" field) so the full history — who approved what, when, with
// what notes — survives even after the request has moved on or completed.
const WorkflowStepLog = sequelize.define('WorkflowStepLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  requestId: { type: DataTypes.UUID, allowNull: false },
  stepIndex: { type: DataTypes.INTEGER, allowNull: false },
  stepName: { type: DataTypes.STRING, allowNull: false },
  actedByUserId: { type: DataTypes.UUID, allowNull: false },
  decision: { type: DataTypes.ENUM('approved', 'rejected'), allowNull: false },
  notes: { type: DataTypes.TEXT },
}, { tableName: 'workflow_step_logs', timestamps: true });

module.exports = WorkflowStepLog;
