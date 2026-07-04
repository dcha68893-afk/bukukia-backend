/**
 * Granular RBAC layer.
 *
 * The `role` column on User (member/leader/pastor/admin/super_admin) is the
 * coarse "tier" used everywhere in the codebase today (requireRole,
 * requireMinRole, crudFactory's editRoles, ministry-scoping, etc). That
 * system keeps working unchanged — nothing below removes or renames it.
 *
 * `roleTitle` is a new, optional, more specific job title (e.g.
 * 'finance_manager', 'camera_operator', 'youth_pastor'). Every roleTitle maps
 * to exactly one legacy tier (see ROLE_TIER), so a user with a roleTitle
 * automatically satisfies old tier-based checks the same way a plain
 * 'admin'/'leader'/etc user always did. On top of that, each roleTitle maps
 * to a set of fine-grained PERMISSIONS (see ROLE_PERMISSIONS), which is what
 * lets e.g. a Finance Manager and a Media Director both be tier 'admin'
 * while genuinely not being able to do each other's job — Finance can view
 * donations and export reports but can't touch the livestream; Media can
 * start the livestream and upload sermons but can't see donations.
 *
 * `User.role` is kept in sync automatically (see the beforeValidate hook in
 * models/User.js) so it never has to be set by hand alongside roleTitle.
 */

const PERMISSIONS = {
  // Users & roles
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  VIEW_MEMBERS: 'view_members',
  EDIT_MEMBERS: 'edit_members',
  DELETE_MEMBERS: 'delete_members',

  // Ministries & cell groups
  MANAGE_MINISTRIES: 'manage_ministries',
  MANAGE_CELL_GROUPS: 'manage_cell_groups',
  VIEW_CELL_GROUP_MEMBERS: 'view_cell_group_members',

  // Events
  CREATE_EVENT: 'create_event',
  EDIT_EVENT: 'edit_event',
  DELETE_EVENT: 'delete_event',
  VIEW_EVENT_REGISTRATIONS: 'view_event_registrations',

  // Attendance
  VIEW_ATTENDANCE: 'view_attendance',
  RECORD_ATTENDANCE: 'record_attendance',

  // Finance
  VIEW_DONATIONS: 'view_donations',
  CONFIRM_DONATIONS: 'confirm_donations',
  EXPORT_FINANCE_REPORTS: 'export_finance_reports',
  APPROVE_BUDGET: 'approve_budget',

  // Media / livestream
  MANAGE_CAMERA: 'manage_camera',
  START_LIVESTREAM: 'start_livestream',
  MANAGE_LIVESTREAM: 'manage_livestream',
  UPLOAD_SERMONS: 'upload_sermons',
  MANAGE_SERMONS: 'manage_sermons',
  MANAGE_GALLERY: 'manage_gallery',
  MANAGE_BLOG: 'manage_blog',

  // Worship
  MANAGE_CHOIR: 'manage_choir',

  // Care / ministry operations
  MANAGE_PRAYER_REQUESTS: 'manage_prayer_requests',
  MANAGE_VOLUNTEERS: 'manage_volunteers',
  MANAGE_VOLUNTEER_SCHEDULE: 'manage_volunteer_schedule',
  MANAGE_BOOKINGS: 'manage_bookings',
  MANAGE_QR_CHECKIN: 'manage_qr_checkin',

  // Content / comms
  MANAGE_LIBRARY: 'manage_library',
  MANAGE_NEWSLETTER: 'manage_newsletter',
  SEND_BROADCAST: 'send_broadcast',
  MANAGE_CONTACT_MESSAGES: 'manage_contact_messages',
  MANAGE_TESTIMONIALS: 'manage_testimonials',
  UPLOAD_FILES: 'upload_files',

  // Reporting
  VIEW_DASHBOARD_STATS: 'view_dashboard_stats',

  // Projects & ministry task management
  VIEW_PROJECTS: 'view_projects',
  MANAGE_PROJECTS: 'manage_projects',
  MANAGE_MINISTRY_TASKS: 'manage_ministry_tasks',

  // Workflow engine
  MANAGE_WORKFLOW_TEMPLATES: 'manage_workflow_templates',

  // Audit trail
  VIEW_AUDIT_LOGS: 'view_audit_logs',

  // Sensitive profile data
  VIEW_MEDICAL_NOTES: 'view_medical_notes',
};

// Every legacy tier a granular role maps onto, for backward compatibility
// with requireRole / requireMinRole / crudFactory editRoles, which all key
// off User.role (the tier), not User.roleTitle.
const ROLE_TIER = {
  super_admin: 'super_admin',

  senior_pastor: 'admin',
  associate_pastor: 'pastor',
  youth_pastor: 'pastor',
  childrens_pastor: 'pastor',
  worship_pastor: 'pastor',
  evangelism_pastor: 'pastor',

  church_secretary: 'admin',
  finance_manager: 'admin',
  accountant: 'admin',
  treasurer: 'admin',

  media_director: 'admin',
  camera_operator: 'leader',
  livestream_operator: 'leader',
  sound_technician: 'leader',

  worship_leader: 'leader',
  choir_leader: 'leader',
  instrumentalist: 'leader',

  ministry_leader: 'leader',
  cell_group_leader: 'leader',

  usher: 'leader',
  security_team: 'leader',
  protocol_team: 'leader',
  prayer_team: 'leader',
  sunday_school_teacher: 'leader',

  member: 'member',
  visitor: 'member',
};

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  senior_pastor: 'Senior Pastor',
  associate_pastor: 'Associate Pastor',
  youth_pastor: 'Youth Pastor',
  childrens_pastor: "Children's Pastor",
  worship_pastor: 'Worship Pastor',
  evangelism_pastor: 'Evangelism Pastor',
  church_secretary: 'Church Secretary',
  finance_manager: 'Finance Manager',
  accountant: 'Accountant',
  treasurer: 'Treasurer',
  media_director: 'Media Director',
  camera_operator: 'Camera Operator',
  livestream_operator: 'Livestream Operator',
  sound_technician: 'Sound Technician',
  worship_leader: 'Worship Leader',
  choir_leader: 'Choir Leader',
  instrumentalist: 'Instrumentalist',
  ministry_leader: 'Ministry Leader',
  cell_group_leader: 'Cell Group Leader',
  usher: 'Usher',
  security_team: 'Security Team',
  protocol_team: 'Protocol Team',
  prayer_team: 'Prayer Team',
  sunday_school_teacher: 'Sunday School Teacher',
  member: 'Member',
  visitor: 'Visitor',
};

const P = PERMISSIONS;

// What each granular role can actually do. Kept explicit (no inheritance
// magic) so it reads the same as the permission matrix in the spec doc and
// is easy for a non-engineer (e.g. a pastor reviewing access) to audit.
const ROLE_PERMISSIONS = {
  super_admin: Object.values(P), // everything, always

  senior_pastor: [
    P.MANAGE_USERS, P.VIEW_MEMBERS, P.EDIT_MEMBERS, P.DELETE_MEMBERS, P.MANAGE_MINISTRIES, P.MANAGE_CELL_GROUPS,
    P.VIEW_CELL_GROUP_MEMBERS, P.CREATE_EVENT, P.EDIT_EVENT, P.DELETE_EVENT, P.VIEW_EVENT_REGISTRATIONS,
    P.VIEW_ATTENDANCE, P.RECORD_ATTENDANCE, P.VIEW_DONATIONS, P.EXPORT_FINANCE_REPORTS, P.APPROVE_BUDGET,
    P.UPLOAD_SERMONS, P.MANAGE_SERMONS, P.MANAGE_LIVESTREAM, P.MANAGE_PRAYER_REQUESTS, P.MANAGE_VOLUNTEERS,
    P.MANAGE_VOLUNTEER_SCHEDULE, P.MANAGE_BOOKINGS, P.MANAGE_LIBRARY, P.MANAGE_NEWSLETTER, P.SEND_BROADCAST,
    P.MANAGE_CONTACT_MESSAGES, P.MANAGE_TESTIMONIALS, P.VIEW_DASHBOARD_STATS, P.MANAGE_QR_CHECKIN,
    P.VIEW_PROJECTS, P.MANAGE_PROJECTS, P.MANAGE_MINISTRY_TASKS, P.MANAGE_WORKFLOW_TEMPLATES, P.VIEW_AUDIT_LOGS,
    P.VIEW_MEDICAL_NOTES,
  ],

  associate_pastor: [
    P.VIEW_MEMBERS, P.CREATE_EVENT, P.EDIT_EVENT, P.VIEW_EVENT_REGISTRATIONS, P.VIEW_ATTENDANCE,
    P.RECORD_ATTENDANCE, P.UPLOAD_SERMONS, P.MANAGE_PRAYER_REQUESTS, P.MANAGE_VOLUNTEERS, P.MANAGE_BOOKINGS,
    P.VIEW_DASHBOARD_STATS,
  ],

  youth_pastor: [
    P.VIEW_MEMBERS, P.CREATE_EVENT, P.EDIT_EVENT, P.VIEW_EVENT_REGISTRATIONS, P.VIEW_ATTENDANCE,
    P.RECORD_ATTENDANCE, P.MANAGE_CELL_GROUPS, P.VIEW_CELL_GROUP_MEMBERS, P.MANAGE_BOOKINGS,
  ],

  childrens_pastor: [
    P.VIEW_MEMBERS, P.CREATE_EVENT, P.EDIT_EVENT, P.VIEW_EVENT_REGISTRATIONS, P.VIEW_ATTENDANCE,
    P.RECORD_ATTENDANCE, P.MANAGE_BOOKINGS,
  ],

  worship_pastor: [
    P.VIEW_MEMBERS, P.CREATE_EVENT, P.EDIT_EVENT, P.MANAGE_CHOIR, P.UPLOAD_SERMONS, P.MANAGE_BOOKINGS,
  ],

  evangelism_pastor: [
    P.VIEW_MEMBERS, P.CREATE_EVENT, P.EDIT_EVENT, P.VIEW_EVENT_REGISTRATIONS, P.MANAGE_PRAYER_REQUESTS,
    P.MANAGE_BOOKINGS,
  ],

  church_secretary: [
    P.VIEW_MEMBERS, P.EDIT_MEMBERS, P.CREATE_EVENT, P.EDIT_EVENT, P.VIEW_EVENT_REGISTRATIONS,
    P.VIEW_ATTENDANCE, P.MANAGE_CONTACT_MESSAGES, P.MANAGE_NEWSLETTER, P.SEND_BROADCAST, P.MANAGE_BOOKINGS,
    P.MANAGE_LIBRARY, P.VIEW_DASHBOARD_STATS, P.VIEW_PROJECTS,
  ],

  // Finance: can view donations, approve budgets/expenses, export reports.
  // Cannot: touch sermons, gallery, or the livestream.
  finance_manager: [P.VIEW_DONATIONS, P.CONFIRM_DONATIONS, P.EXPORT_FINANCE_REPORTS, P.APPROVE_BUDGET, P.VIEW_DASHBOARD_STATS, P.VIEW_PROJECTS],
  accountant: [P.VIEW_DONATIONS, P.EXPORT_FINANCE_REPORTS, P.VIEW_PROJECTS],
  treasurer: [P.VIEW_DONATIONS, P.CONFIRM_DONATIONS, P.EXPORT_FINANCE_REPORTS, P.APPROVE_BUDGET, P.VIEW_PROJECTS],

  // Media: can start the livestream, upload videos, switch cameras.
  // Cannot: view finance.
  media_director: [
    P.MANAGE_CAMERA, P.START_LIVESTREAM, P.MANAGE_LIVESTREAM, P.UPLOAD_SERMONS, P.MANAGE_SERMONS,
    P.MANAGE_GALLERY, P.MANAGE_BLOG, P.UPLOAD_FILES, P.MANAGE_MINISTRY_TASKS,
  ],
  camera_operator: [P.MANAGE_CAMERA, P.START_LIVESTREAM, P.UPLOAD_FILES],
  livestream_operator: [P.START_LIVESTREAM, P.MANAGE_LIVESTREAM, P.UPLOAD_FILES],
  sound_technician: [P.MANAGE_LIVESTREAM, P.UPLOAD_FILES],

  worship_leader: [P.MANAGE_CHOIR, P.CREATE_EVENT, P.UPLOAD_FILES],
  choir_leader: [P.MANAGE_CHOIR, P.VIEW_CELL_GROUP_MEMBERS],
  instrumentalist: [],

  // Ministry Leader: scoped (via ministryId) to their own ministry's content —
  // see requireOwnMinistryOrMinRole in middleware/auth.js for the scoping check.
  ministry_leader: [
    P.CREATE_EVENT, P.EDIT_EVENT, P.VIEW_EVENT_REGISTRATIONS, P.VIEW_ATTENDANCE, P.RECORD_ATTENDANCE,
    P.MANAGE_VOLUNTEER_SCHEDULE, P.VIEW_CELL_GROUP_MEMBERS, P.MANAGE_MINISTRY_TASKS, P.VIEW_PROJECTS,
  ],
  cell_group_leader: [P.VIEW_CELL_GROUP_MEMBERS, P.RECORD_ATTENDANCE, P.MANAGE_PRAYER_REQUESTS],

  usher: [P.RECORD_ATTENDANCE, P.MANAGE_QR_CHECKIN],
  security_team: [P.RECORD_ATTENDANCE],
  protocol_team: [P.VIEW_EVENT_REGISTRATIONS],
  prayer_team: [P.MANAGE_PRAYER_REQUESTS],
  sunday_school_teacher: [P.RECORD_ATTENDANCE, P.VIEW_ATTENDANCE],

  member: [],
  visitor: [],
};

function getTier(roleOrTitle) {
  return ROLE_TIER[roleOrTitle] || roleOrTitle;
}

function getPermissions(roleTitle) {
  if (!roleTitle) return [];
  return ROLE_PERMISSIONS[roleTitle] || [];
}

function hasPermission(roleTitle, permission) {
  return getPermissions(roleTitle).includes(permission);
}

function hasAnyPermission(roleTitle, permissions) {
  const granted = getPermissions(roleTitle);
  return permissions.some((p) => granted.includes(p));
}

function hasAllPermissions(roleTitle, permissions) {
  const granted = getPermissions(roleTitle);
  return permissions.every((p) => granted.includes(p));
}

module.exports = {
  PERMISSIONS,
  ROLE_TIER,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  ROLE_TITLES: Object.keys(ROLE_TIER),
  getTier,
  getPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
};
