const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { ROLE_TIER, ROLE_TITLES } = require('../config/permissions');

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
  // Coarse access tier. Kept as the source of truth for every existing
  // requireRole/requireMinRole/crudFactory check in the codebase. When
  // roleTitle is set, this is auto-derived from it (see beforeValidate
  // hook below) — you should not normally need to set both by hand.
  role: {
    type: DataTypes.ENUM('member', 'leader', 'pastor', 'admin', 'super_admin'),
    defaultValue: 'member',
  },
  // Specific job title within the church (e.g. 'finance_manager',
  // 'camera_operator', 'youth_pastor'). Drives the fine-grained permission
  // matrix in config/permissions.js. Optional — a plain 'member' has no
  // roleTitle. See config/permissions.js for the full role/permission list.
  roleTitle: {
    type: DataTypes.ENUM(...ROLE_TITLES),
    allowNull: true,
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
  hooks: {
    // Whenever roleTitle changes (assigning "Finance Manager", "Camera
    // Operator", etc.), keep the legacy `role` tier column in lock-step so
    // every existing requireRole/requireMinRole/crudFactory check keeps
    // working without modification. If roleTitle is cleared, role is left
    // as-is (caller is responsible for setting a plain tier in that case).
    //
    // IMPORTANT: Sequelize decides which columns go into the UPDATE
    // statement *before* beforeValidate runs (from options.fields, derived
    // from changed() at the start of save()). Mutating user.role in here
    // updates the in-memory value fine, but silently gets dropped from the
    // actual SQL write unless we also push 'role' into options.fields —
    // that array is passed by reference and is what the UPDATE is built
    // from, so appending to it here is what makes the persisted row match
    // the in-memory instance (and the JSON the API returns).
    beforeValidate(user, options) {
      if (user.changed('roleTitle') && user.roleTitle) {
        user.role = ROLE_TIER[user.roleTitle] || user.role;
        if (options.fields && !options.fields.includes('role')) {
          options.fields.push('role');
        }
      }
    },
  },
});

module.exports = User;
