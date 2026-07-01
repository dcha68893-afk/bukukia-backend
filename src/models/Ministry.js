const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Ministry = sequelize.define('Ministry', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.TEXT },
  leaderName: { type: DataTypes.STRING },
  leaderContact: { type: DataTypes.STRING },
  meetingSchedule: { type: DataTypes.STRING },
  image: { type: DataTypes.STRING },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'ministries', timestamps: true });

module.exports = Ministry;
