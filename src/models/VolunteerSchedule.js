const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const VolunteerSchedule = sequelize.define('VolunteerSchedule', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  volunteerId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: true },
  ministry: { type: DataTypes.STRING, allowNull: false },
  serviceDate: { type: DataTypes.DATEONLY, allowNull: false },
  role: { type: DataTypes.STRING }, // e.g. "Sound Engineer", "Usher", "Kids Teacher"
  status: {
    type: DataTypes.ENUM('scheduled', 'confirmed', 'completed', 'excused'),
    defaultValue: 'scheduled',
  },
}, { tableName: 'volunteer_schedules', timestamps: true });

module.exports = VolunteerSchedule;
