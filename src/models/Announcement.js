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
  // Optional: scopes this announcement to one ministry's dashboard (see
  // routes/ministries.routes.js GET /:id/dashboard). Null = church-wide.
  ministryId: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'announcements', timestamps: true });

module.exports = Announcement;
