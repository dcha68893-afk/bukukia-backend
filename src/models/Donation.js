const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Donation = sequelize.define('Donation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: true },
  donorName: { type: DataTypes.STRING },
  donorEmail: { type: DataTypes.STRING },
  donorPhone: { type: DataTypes.STRING },
  type: { type: DataTypes.ENUM('tithe', 'offering', 'special', 'building_fund', 'missions', 'other'), defaultValue: 'offering' },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING, defaultValue: 'KES' },
  method: { type: DataTypes.ENUM('mpesa', 'card', 'bank_transfer', 'cash'), defaultValue: 'mpesa' },
  transactionRef: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM('pending', 'completed', 'failed'), defaultValue: 'pending' },
  receiptNumber: { type: DataTypes.STRING, unique: true },
  isAnonymous: { type: DataTypes.BOOLEAN, defaultValue: false },
  notes: { type: DataTypes.STRING },
}, { tableName: 'donations', timestamps: true });

module.exports = Donation;
