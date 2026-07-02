const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  firstName: { type: DataTypes.STRING, allowNull: false },
  lastName: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  dateOfBirth: { type: DataTypes.DATEONLY },
  gender: { type: DataTypes.ENUM('male', 'female', 'other') },
  maritalStatus: { type: DataTypes.ENUM('single', 'married', 'divorced', 'widowed') },
  address: { type: DataTypes.TEXT },
  city: { type: DataTypes.STRING },
  country: { type: DataTypes.STRING, defaultValue: 'Kenya' },
  occupation: { type: DataTypes.STRING },
  familyInfo: { type: DataTypes.JSONB, defaultValue: [] }, // e.g. [{ name, relationship, age }]
  membershipDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  baptismDate: { type: DataTypes.DATEONLY },
  membershipStatus: {
    type: DataTypes.ENUM('visitor', 'member', 'active', 'inactive', 'transferred'),
    defaultValue: 'visitor',
  },
  profileImage: { type: DataTypes.STRING },
  role: {
    type: DataTypes.ENUM('member', 'leader', 'pastor', 'admin', 'super_admin'),
    defaultValue: 'member',
  },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  lastLogin: { type: DataTypes.DATE },
  resetToken: { type: DataTypes.STRING },
  resetTokenExpires: { type: DataTypes.DATE },
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User;
