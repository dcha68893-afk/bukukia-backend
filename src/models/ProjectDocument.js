const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Invoices / contracts / images attached to a Project. Stores a pointer to
// an already-uploaded file (see routes/upload.routes.js, which returns a
// /uploads/... URL) rather than handling upload itself.
const ProjectDocument = sequelize.define('ProjectDocument', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  category: {
    type: DataTypes.ENUM('invoice', 'contract', 'image', 'report', 'other'),
    defaultValue: 'other',
  },
  fileUrl: { type: DataTypes.STRING, allowNull: false },
  uploadedByUserId: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'project_documents', timestamps: true });

module.exports = ProjectDocument;
