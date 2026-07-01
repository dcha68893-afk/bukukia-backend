const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Testimonial = sequelize.define('Testimonial', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: true },
  fullName: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  videoUrl: { type: DataTypes.STRING },
  image: { type: DataTypes.STRING },
  isApproved: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'testimonials', timestamps: true });

module.exports = Testimonial;
