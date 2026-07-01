const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Volunteer = sequelize.define('Volunteer', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: true },
  fullName: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  ministryInterest: { type: DataTypes.STRING },
  skills: { type: DataTypes.TEXT },
  availability: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM('pending', 'approved', 'declined'), defaultValue: 'pending' },
}, { tableName: 'volunteers', timestamps: true });

module.exports = Volunteer;
