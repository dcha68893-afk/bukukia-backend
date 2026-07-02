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
const Notification = require('./Notification');
const Pastor = require('./Pastor');
const BibleVerse = require('./BibleVerse');
const Booking = require('./Booking');
const CellGroup = require('./CellGroup');
const CellGroupMember = require('./CellGroupMember');
const VolunteerSchedule = require('./VolunteerSchedule');
const ChoirMember = require('./ChoirMember');
const LibraryDocument = require('./LibraryDocument');
const InventoryItem = require('./InventoryItem');

// ---- Associations ----

// Ministry-scoped leadership: a leader belongs to exactly one ministry and is
// restricted (in the routes layer) to managing that ministry's own events/content.
User.belongsTo(Ministry, { foreignKey: 'ministryId', as: 'ministry' });
Ministry.hasMany(User, { foreignKey: 'ministryId', as: 'leaders' });
User.belongsTo(CellGroup, { foreignKey: 'cellGroupId', as: 'cellGroup' });

// Events optionally belong to a ministry (null = church-wide event).
Event.belongsTo(Ministry, { foreignKey: 'ministryId', as: 'ministry' });
Ministry.hasMany(Event, { foreignKey: 'ministryId', as: 'events' });

Event.hasMany(EventRegistration, { foreignKey: 'eventId', as: 'registrations' });
EventRegistration.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
EventRegistration.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(EventRegistration, { foreignKey: 'userId' });
User.hasMany(PrayerRequest, { foreignKey: 'userId' });
User.hasMany(Donation, { foreignKey: 'userId' });
User.hasMany(AttendanceRecord, { foreignKey: 'userId' });
User.hasMany(Notification, { foreignKey: 'userId' });
AttendanceRecord.belongsTo(User, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

GalleryItem.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

CellGroup.hasMany(CellGroupMember, { foreignKey: 'cellGroupId', as: 'members' });
CellGroupMember.belongsTo(CellGroup, { foreignKey: 'cellGroupId' });
CellGroupMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(CellGroupMember, { foreignKey: 'userId' });

Volunteer.hasMany(VolunteerSchedule, { foreignKey: 'volunteerId', as: 'schedules' });
VolunteerSchedule.belongsTo(Volunteer, { foreignKey: 'volunteerId' });

module.exports = {
  sequelize,
  User, Ministry, Sermon, Event, EventRegistration,
  Announcement, PrayerRequest, Donation, Testimonial,
  GalleryItem, ContactMessage, Volunteer, Newsletter,
  BlogPost, LiveStream, AttendanceRecord, Notification,
  Pastor, BibleVerse, Booking, CellGroup, CellGroupMember,
  VolunteerSchedule, ChoirMember, LibraryDocument, InventoryItem,
};
