const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// One row per weekly meeting: attendance count, Bible study topic/notes,
// prayer request themes, and visitor count. This is what "Weekly Reports"
// and "Bible Study Notes" (spec item 5) actually are in practice — a cell
// leader fills this in after each meeting, and it's what growth charts
// (attendanceCount over time) are computed from.
const CellGroupReport = sequelize.define('CellGroupReport', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  cellGroupId: { type: DataTypes.UUID, allowNull: false },
  meetingDate: { type: DataTypes.DATEONLY, allowNull: false },
  attendanceCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  visitorsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  bibleStudyTopic: { type: DataTypes.STRING },
  bibleStudyNotes: { type: DataTypes.TEXT },
  prayerRequestsSummary: { type: DataTypes.TEXT }, // themes discussed, not individual members' private requests (those stay in the PrayerRequest model)
  submittedByUserId: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'cell_group_reports',
  timestamps: true,
  indexes: [{ unique: true, fields: ['cellGroupId', 'meetingDate'] }], // one report per group per date — resubmitting edits, doesn't duplicate
});

module.exports = CellGroupReport;
