const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Announcement = sequelize.define('Announcement', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.ENUM('news', 'pastor_message', 'bulletin', 'special'), defaultValue: 'news' },
  image: { type: DataTypes.STRING },
  isPinned: { type: DataTypes.BOOLEAN, defaultValue: false },
  isPublished: { type: DataTypes.BOOLEAN, defaultValue: true },
  publishDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'announcements', timestamps: true });

module.exports = Announcement;
