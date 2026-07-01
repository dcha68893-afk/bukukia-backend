const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EventRegistration = sequelize.define('EventRegistration', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  eventId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: true },
  fullName: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  numberOfGuests: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'), defaultValue: 'confirmed' },
}, { tableName: 'event_registrations', timestamps: true });

module.exports = EventRegistration;
