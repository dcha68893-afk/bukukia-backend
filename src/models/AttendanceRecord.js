const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AttendanceRecord = sequelize.define('AttendanceRecord', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  serviceDate: { type: DataTypes.DATEONLY, allowNull: false },
  checkedInVia: { type: DataTypes.ENUM('qr', 'manual', 'self'), defaultValue: 'manual' },
}, { tableName: 'attendance_records', timestamps: true });

module.exports = AttendanceRecord;
