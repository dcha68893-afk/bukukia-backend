const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CellGroup = sequelize.define('CellGroup', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  area: { type: DataTypes.STRING }, // neighbourhood / zone
  leaderId: { type: DataTypes.UUID },
  leaderName: { type: DataTypes.STRING },
  meetingDay: { type: DataTypes.STRING }, // e.g. "Thursday"
  meetingTime: { type: DataTypes.STRING }, // e.g. "6:00 PM"
  venue: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'cell_groups', timestamps: true });

module.exports = CellGroup;
