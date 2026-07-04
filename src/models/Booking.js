const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * Unified booking model for:
 * baptism | wedding | counseling | funeral | child_dedication | new_visitor | discipleship
 */
const Booking = sequelize.define('Booking', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: true },
  type: {
    type: DataTypes.ENUM('baptism', 'wedding', 'counseling', 'funeral', 'child_dedication', 'new_visitor', 'discipleship'),
    allowNull: false,
  },
  // Requester info (used when no userId, e.g. first-time visitor)
  fullName: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  // Request details
  preferredDate: { type: DataTypes.DATE },
  notes: { type: DataTypes.TEXT },
  // For weddings / child dedication - secondary person
  partnerName: { type: DataTypes.STRING },
  partnerPhone: { type: DataTypes.STRING },
  // Assigned pastor/counsellor. pastorId is the structured link (used by
  // the leader profile's "upcoming appointments" count); assignedTo stays
  // as a free-text fallback for bookings made before a specific leader
  // profile existed, or when assigning to a role rather than a named person
  // (e.g. "Counselling Team" generally).
  assignedTo: { type: DataTypes.STRING },
  pastorId: { type: DataTypes.UUID, allowNull: true },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled'),
    defaultValue: 'pending',
  },
  confirmedDate: { type: DataTypes.DATE },
  adminNotes: { type: DataTypes.TEXT },
}, { tableName: 'bookings', timestamps: true });

module.exports = Booking;
