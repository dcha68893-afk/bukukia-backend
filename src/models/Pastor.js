const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Leadership team profiles shown on the About page (pastors, elders, directors, etc.)
const Pastor = sequelize.define('Pastor', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: true }, // optional link to a User account
  fullName: { type: DataTypes.STRING, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false }, // e.g. "Senior Pastor", "Elder", "Youth Director"
  bio: { type: DataTypes.TEXT },
  photo: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  displayOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'leadership_team', timestamps: true });

module.exports = Pastor;
