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
  // Which ministry/department this user leads. Only meaningful for role === 'leader':
  // a leader is scoped to exactly one ministry and can only manage that ministry's
  // events/content. Pastors, admins and super_admins are not scope-restricted.
  // Referenced by routes/members.routes.js (allowed field) — was previously missing
  // from the model, which silently discarded every attempt to assign it.
  ministryId: { type: DataTypes.UUID, allowNull: true },
  // Which cell group this member belongs to. Also referenced by members.routes.js.
  cellGroupId: { type: DataTypes.UUID, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  lastLogin: { type: DataTypes.DATE },
  resetToken: { type: DataTypes.STRING },
  resetTokenExpires: { type: DataTypes.DATE },
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User;
