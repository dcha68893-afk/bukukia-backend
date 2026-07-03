const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Church-wide initiatives (building projects, campaigns, etc). Deliberately
// modelled like a lightweight Jira/Trello project: a budget, a completion
// percentage, a responsible ministry/committee, and a status — with
// ProjectMilestone rows underneath for the step-by-step breakdown.
const Project = sequelize.define('Project', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  budget: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  amountSpent: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  completedPercent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0, max: 100 },
  },
  status: {
    type: DataTypes.ENUM('planning', 'in_progress', 'on_hold', 'completed', 'cancelled'),
    defaultValue: 'planning',
  },
  // Free-text label for who's accountable (e.g. "Building Committee"),
  // independent of the more structured ministryId link below — a project
  // like a building fund often isn't tied to a single ministry record.
  responsibleParty: { type: DataTypes.STRING },
  ministryId: { type: DataTypes.UUID, allowNull: true },
  startDate: { type: DataTypes.DATEONLY },
  targetEndDate: { type: DataTypes.DATEONLY },
  createdByUserId: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'projects', timestamps: true });

module.exports = Project;
