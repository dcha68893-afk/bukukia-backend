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
const Project = require('./Project');
const ProjectMilestone = require('./ProjectMilestone');
const ProjectDocument = require('./ProjectDocument');
const MinistryTask = require('./MinistryTask');
const WorkflowTemplate = require('./WorkflowTemplate');
const WorkflowRequest = require('./WorkflowRequest');
const WorkflowStepLog = require('./WorkflowStepLog');

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

// Projects (item 6: Project Management) — optionally tied to a ministry,
// with milestones and documents underneath.
Project.belongsTo(Ministry, { foreignKey: 'ministryId', as: 'ministry' });
Project.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });
Project.hasMany(ProjectMilestone, { foreignKey: 'projectId', as: 'milestones', onDelete: 'CASCADE' });
ProjectMilestone.belongsTo(Project, { foreignKey: 'projectId' });
Project.hasMany(ProjectDocument, { foreignKey: 'projectId', as: 'documents', onDelete: 'CASCADE' });
ProjectDocument.belongsTo(Project, { foreignKey: 'projectId' });
ProjectDocument.belongsTo(User, { foreignKey: 'uploadedByUserId', as: 'uploadedBy' });

// Ministry tasks (item 7: Ministry Task Management) — scoped to one ministry,
// optionally assigned to a member.
Ministry.hasMany(MinistryTask, { foreignKey: 'ministryId', as: 'tasks' });
MinistryTask.belongsTo(Ministry, { foreignKey: 'ministryId', as: 'ministry' });
MinistryTask.belongsTo(User, { foreignKey: 'assignedToUserId', as: 'assignedTo' });
User.hasMany(MinistryTask, { foreignKey: 'assignedToUserId', as: 'assignedTasks' });

// Workflow engine (item 13) — a WorkflowTemplate defines the ordered steps;
// each WorkflowRequest is one running instance of it, with a full audit
// trail of who approved/rejected each step in WorkflowStepLog.
WorkflowTemplate.hasMany(WorkflowRequest, { foreignKey: 'templateId', as: 'requests' });
WorkflowRequest.belongsTo(WorkflowTemplate, { foreignKey: 'templateId', as: 'template' });
WorkflowRequest.belongsTo(User, { foreignKey: 'subjectUserId', as: 'subject' });
WorkflowRequest.belongsTo(User, { foreignKey: 'submittedByUserId', as: 'submittedBy' });
WorkflowRequest.hasMany(WorkflowStepLog, { foreignKey: 'requestId', as: 'history', onDelete: 'CASCADE' });
WorkflowStepLog.belongsTo(WorkflowRequest, { foreignKey: 'requestId' });
WorkflowStepLog.belongsTo(User, { foreignKey: 'actedByUserId', as: 'actedBy' });

module.exports = {
  sequelize,
  User, Ministry, Sermon, Event, EventRegistration,
  Announcement, PrayerRequest, Donation, Testimonial,
  GalleryItem, ContactMessage, Volunteer, Newsletter,
  BlogPost, LiveStream, AttendanceRecord, Notification,
  Pastor, BibleVerse, Booking, CellGroup, CellGroupMember,
  VolunteerSchedule, ChoirMember, LibraryDocument, InventoryItem,
  Project, ProjectMilestone, ProjectDocument, MinistryTask,
  WorkflowTemplate, WorkflowRequest, WorkflowStepLog,
};
