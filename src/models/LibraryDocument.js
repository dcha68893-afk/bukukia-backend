const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LibraryDocument = sequelize.define('LibraryDocument', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  category: {
    type: DataTypes.ENUM('constitution', 'minutes', 'sermon_notes', 'bible_study', 'policy', 'forms', 'other'),
    defaultValue: 'other',
  },
  fileUrl: { type: DataTypes.STRING, allowNull: false },
  fileType: { type: DataTypes.STRING }, // pdf, docx, etc.
  isPublic: { type: DataTypes.BOOLEAN, defaultValue: false }, // false = members only
  downloadCount: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'library_documents', timestamps: true });

module.exports = LibraryDocument;
