const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Leadership team profiles shown on the About page (pastors, elders, directors, etc.)
// Spec item 3 (Leader Profiles): beyond just a name — years serving, education,
// skills, responsibilities, current projects, social links, and whether members
// can book an appointment with them (see Booking.pastorId below).
const Pastor = sequelize.define('Pastor', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: true }, // optional link to a User account
  fullName: { type: DataTypes.STRING, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false }, // e.g. "Senior Pastor", "Elder", "Youth Director"
  bio: { type: DataTypes.TEXT },
  photo: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  servingSince: { type: DataTypes.DATEONLY }, // "Serving since 2016" — years-serving is computed from this, not stored redundantly
  education: { type: DataTypes.JSONB, defaultValue: [] }, // e.g. [{ degree: "Bachelor of Theology", institution: "...", year: 2012 }]
  skills: { type: DataTypes.JSONB, defaultValue: [] }, // e.g. ["Preaching", "Leadership Training", "Counselling"]
  responsibilities: { type: DataTypes.JSONB, defaultValue: [] }, // e.g. ["Sunday Services", "Marriage Counselling"]
  currentProjects: { type: DataTypes.JSONB, defaultValue: [] }, // e.g. [{ title: "Bible Conference", link: "/events.html#..." }] — a curated public list, distinct from the internal Projects module
  socialLinks: { type: DataTypes.JSONB, defaultValue: {} }, // e.g. { facebook: "...", twitter: "...", website: "..." }
  acceptsAppointments: { type: DataTypes.BOOLEAN, defaultValue: false }, // shows a "Book Appointment" button on their public profile
  displayOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'leadership_team', timestamps: true });

module.exports = Pastor;
