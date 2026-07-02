const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Event = sequelize.define('Event', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  category: {
    type: DataTypes.ENUM('conference', 'crusade', 'youth', 'prayer', 'bible_study', 'service', 'other'),
    defaultValue: 'other',
  },
  startDate: { type: DataTypes.DATE, allowNull: false },
  endDate: { type: DataTypes.DATE },
  location: { type: DataTypes.STRING },
  image: { type: DataTypes.STRING },
  registrationRequired: { type: DataTypes.BOOLEAN, defaultValue: false },
  capacity: { type: DataTypes.INTEGER },
  isPublished: { type: DataTypes.BOOLEAN, defaultValue: true },
  // Which ministry this event belongs to. Null = church-wide event (only pastors/admins
  // may create those). Leaders are locked to creating/editing events for their own ministry.
  ministryId: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'events', timestamps: true });

module.exports = Event;
