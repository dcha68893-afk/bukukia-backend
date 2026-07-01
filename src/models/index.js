const sequelize = require('../config/db');

const User = require('./User');
const Ministry = require('./Ministry');
const Sermon = require('./Sermon');
const Event = require('./Event');
const EventRegistration = require('./EventRegistration');
const Announcement = require('./Announcement');
const PrayerRequest = require('./PrayerRequest');
const Donation = require('./Donation');
const Testimonial = require('./Testimonial');
const GalleryItem = require('./GalleryItem');
const ContactMessage = require('./ContactMessage');
const Volunteer = require('./Volunteer');
const Newsletter = require('./Newsletter');
const BlogPost = require('./BlogPost');
const LiveStream = require('./LiveStream');
const AttendanceRecord = require('./AttendanceRecord');

// Associations
Event.hasMany(EventRegistration, { foreignKey: 'eventId', as: 'registrations' });
EventRegistration.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

User.hasMany(EventRegistration, { foreignKey: 'userId' });
User.hasMany(PrayerRequest, { foreignKey: 'userId' });
User.hasMany(Donation, { foreignKey: 'userId' });
User.hasMany(AttendanceRecord, { foreignKey: 'userId' });
AttendanceRecord.belongsTo(User, { foreignKey: 'userId' });

GalleryItem.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

const db = {
  sequelize,
  User,
  Ministry,
  Sermon,
  Event,
  EventRegistration,
  Announcement,
  PrayerRequest,
  Donation,
  Testimonial,
  GalleryItem,
  ContactMessage,
  Volunteer,
  Newsletter,
  BlogPost,
  LiveStream,
  AttendanceRecord,
};

module.exports = db;
