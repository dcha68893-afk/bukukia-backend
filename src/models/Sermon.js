const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Sermon = sequelize.define('Sermon', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  preacher: { type: DataTypes.STRING, allowNull: false },
  sermonDate: { type: DataTypes.DATEONLY, allowNull: false },
  series: { type: DataTypes.STRING },
  topic: { type: DataTypes.STRING },
  bibleReferences: { type: DataTypes.STRING },
  audioUrl: { type: DataTypes.STRING },
  videoUrl: { type: DataTypes.STRING },
  thumbnailUrl: { type: DataTypes.STRING },
  sermonNotes: { type: DataTypes.TEXT },
  language: { type: DataTypes.STRING, defaultValue: 'en' },
  downloadCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  viewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  isPublished: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'sermons', timestamps: true });

module.exports = Sermon;
