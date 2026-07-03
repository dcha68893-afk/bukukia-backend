const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// A reusable multi-step approval process, e.g. the spec's baptism example:
// Member requests → Secretary receives → Pastor approves → Class scheduled →
// Attendance recorded → Certificate generated → Member status updated.
//
// `steps` is an ordered JSON array, each entry:
//   { name: string, minRole?: tier, permission?: string }
// A step is "actionable" by anyone who is at least `minRole` tier AND/OR
// holds `permission` (see workflow-requests.routes.js for exact matching —
// mirrors how routes/*.js already combine requireRole + requirePermission).
// At least one of minRole/permission should be set per step, or nobody will
// ever be able to act on it.
const WorkflowTemplate = sequelize.define('WorkflowTemplate', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  key: { type: DataTypes.STRING, allowNull: false, unique: true }, // e.g. 'baptism_request'
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  steps: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  // What happens to the *subject* member automatically once every step is
  // approved. Kept as a small fixed vocabulary (rather than arbitrary code)
  // so completing a workflow can never execute anything beyond these
  // specific, reviewed effects.
  completionEffect: {
    type: DataTypes.ENUM('none', 'set_baptism_date', 'set_membership_active'),
    defaultValue: 'none',
  },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'workflow_templates', timestamps: true });

module.exports = WorkflowTemplate;
