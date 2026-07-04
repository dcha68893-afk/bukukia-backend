const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LiveStream = sequelize.define('LiveStream', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  streamUrl: { type: DataTypes.STRING, allowNull: false },
  scheduledStart: { type: DataTypes.DATE, allowNull: false },
  status: { type: DataTypes.ENUM('scheduled', 'live', 'ended'), defaultValue: 'scheduled' },
  recordingUrl: { type: DataTypes.STRING },
  // Manually entered for now (dashboard.routes.js analytics chart) until a
  // real streaming-platform integration (YouTube/Facebook API) can populate
  // it automatically — see spec item 10 (livestream studio).
  peakViewers: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'live_streams', timestamps: true });

module.exports = LiveStream;
