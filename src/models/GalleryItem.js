const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GalleryItem = sequelize.define('GalleryItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING },
  album: { type: DataTypes.STRING },
  type: { type: DataTypes.ENUM('photo', 'video'), defaultValue: 'photo' },
  url: { type: DataTypes.STRING, allowNull: false },
  thumbnailUrl: { type: DataTypes.STRING },
  eventId: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'gallery_items', timestamps: true });

module.exports = GalleryItem;
