const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChoirMember = sequelize.define('ChoirMember', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: true },
  fullName: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  voicePart: { type: DataTypes.ENUM('soprano', 'alto', 'tenor', 'bass', 'other'), defaultValue: 'other' },
  instruments: { type: DataTypes.STRING },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  joinedAt: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
}, { tableName: 'choir_members', timestamps: true });

module.exports = ChoirMember;
