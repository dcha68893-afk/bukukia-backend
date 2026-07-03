const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// One running instance of a WorkflowTemplate — e.g. "Kevin's baptism request",
// currently sitting at step 2 ("Pastor approves"), submitted by Kevin himself.
const WorkflowRequest = sequelize.define('WorkflowRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  templateId: { type: DataTypes.UUID, allowNull: false },
  // Who the request is ABOUT (e.g. the member being baptized) — usually the
  // same person who submitted it, but a secretary could file it on someone's
  // behalf, so kept as a separate field from submittedByUserId.
  subjectUserId: { type: DataTypes.UUID, allowNull: false },
  submittedByUserId: { type: DataTypes.UUID, allowNull: false },
  currentStep: { type: DataTypes.INTEGER, defaultValue: 0 }, // index into template.steps
  status: {
    type: DataTypes.ENUM('in_progress', 'rejected', 'completed'),
    defaultValue: 'in_progress',
  },
  // Free-form intake data for this particular request (e.g. preferred class
  // date, notes from the member) — the template just defines the process,
  // not the form fields, so this stays a flexible JSON blob.
  data: { type: DataTypes.JSONB, defaultValue: {} },
}, { tableName: 'workflow_requests', timestamps: true });

module.exports = WorkflowRequest;
