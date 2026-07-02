const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CellGroupMember = sequelize.define('CellGroupMember', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  cellGroupId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  joinedAt: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
}, { tableName: 'cell_group_members', timestamps: true });

module.exports = CellGroupMember;
