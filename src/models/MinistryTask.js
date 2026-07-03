const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Day-to-day operational tasks within a ministry (e.g. Media Team's
// "Camera Setup", "Sound Check", "Livestream Test" for a given Sunday).
// Distinct from Project/ProjectMilestone, which are for larger multi-week
// initiatives — this is the lightweight per-service checklist.
const MinistryTask = sequelize.define('MinistryTask', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ministryId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  notes: { type: DataTypes.TEXT },
  assignedToUserId: { type: DataTypes.UUID, allowNull: true },
  serviceDate: { type: DataTypes.DATEONLY }, // which Sunday/service this task belongs to
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
    defaultValue: 'pending',
  },
}, { tableName: 'ministry_tasks', timestamps: true });

module.exports = MinistryTask;
