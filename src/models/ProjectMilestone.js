const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProjectMilestone = sequelize.define('ProjectMilestone', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
    defaultValue: 'pending',
  },
  dueDate: { type: DataTypes.DATEONLY },
  order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'project_milestones', timestamps: true });

module.exports = ProjectMilestone;
