const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PrayerRequest = sequelize.define('PrayerRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: true },
  fullName: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  isAnonymous: { type: DataTypes.BOOLEAN, defaultValue: false },
  request: { type: DataTypes.TEXT, allowNull: false },
  isUrgent: { type: DataTypes.BOOLEAN, defaultValue: false },
  isPublicOnWall: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.ENUM('new', 'in_prayer', 'answered', 'archived'), defaultValue: 'new' },
  testimony: { type: DataTypes.TEXT },
}, { tableName: 'prayer_requests', timestamps: true });

module.exports = PrayerRequest;
