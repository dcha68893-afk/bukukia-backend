const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const InventoryItem = sequelize.define('InventoryItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING }, // e.g. "Audio Equipment", "Chairs", "Vehicles"
  description: { type: DataTypes.TEXT },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  condition: { type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor', 'needs_repair'), defaultValue: 'good' },
  location: { type: DataTypes.STRING },
  purchaseDate: { type: DataTypes.DATEONLY },
  purchaseValue: { type: DataTypes.DECIMAL(12, 2) },
  serialNumber: { type: DataTypes.STRING },
  notes: { type: DataTypes.TEXT },
}, { tableName: 'inventory_items', timestamps: true });

module.exports = InventoryItem;
