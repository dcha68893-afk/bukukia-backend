const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// A small rotating pool of verses the admin curates; "today's verse" is picked
// deterministically by day-of-year so every visitor sees the same one on a given day.
const BibleVerse = sequelize.define('BibleVerse', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  reference: { type: DataTypes.STRING, allowNull: false }, // e.g. "John 3:16"
  text: { type: DataTypes.TEXT, allowNull: false },
  translation: { type: DataTypes.STRING, defaultValue: 'NIV' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'bible_verses', timestamps: true });

module.exports = BibleVerse;
