const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: {
    type: DataTypes.ENUM('event_reminder', 'announcement', 'prayer_update', 'donation_receipt', 'general'),
    defaultValue: 'general',
  },
  link: { type: DataTypes.STRING }, // optional frontend route to deep-link to, e.g. /events.html
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'notifications', timestamps: true });

module.exports = Notification;
