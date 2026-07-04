const router = require('express').Router();
const buildCrudRouter = require('../utils/crudFactory');
const {
  Ministry, User, Event, EventRegistration, MinistryTask, Project, Announcement, GalleryItem,
} = require('../models');
const { authenticateToken } = require('../middleware/auth');

module.exports = buildCrudRouter({
  Model: Ministry,
  router,
  publishedFilter: { isActive: true },
  searchFields: ['name', 'description'],
  // Leaders can see/edit ministries (their own only, enforced below) alongside pastor/admin.
  editRoles: ['leader', 'pastor', 'admin', 'super_admin'],
  // Only pastors and above may create brand-new ministries.
  createRoles: ['pastor', 'admin', 'super_admin'],
  // A leader may only update the one ministry they lead (item.id === user.ministryId),
  // and cannot delete ministries at all (deleteRoles below keeps the default admin-only).
  scopedRoles: ['leader'],
  itemScopeField: 'id',
  userScopeField: 'ministryId',
});

// GET /api/ministries/:id/dashboard — spec item 2 (Ministry Management System):
// "Every ministry has its own dashboard" pulling together members, leaders,
// upcoming programs, tasks, budget, announcements, and gallery in one call,
// rather than the frontend making 6+ separate requests. Open to any signed-in
// user (a member should be able to see their ministry's dashboard, not just
// its leader) — nothing here is more sensitive than what's already public
// on the ministry's own page, except the live task list, which stays
// internal-looking but isn't secret data (no financials beyond the
// project's own budget figure, which ministry members can reasonably see).
router.get('/:id/dashboard', authenticateToken, async (req, res, next) => {
  try {
    const ministry = await Ministry.findByPk(req.params.id);
    if (!ministry) return res.status(404).json({ success: false, message: 'Ministry not found' });

    const now = new Date();
    const [members, upcomingEvents, tasks, projects, announcements, gallery] = await Promise.all([
      User.findAll({
        where: { ministryId: ministry.id },
        attributes: ['id', 'firstName', 'lastName', 'role', 'roleTitle', 'profileImage'],
      }),
      Event.findAll({
        where: { ministryId: ministry.id, startDate: { [require('sequelize').Op.gte]: now } },
        order: [['startDate', 'ASC']], limit: 10,
      }),
      MinistryTask.findAll({
        where: { ministryId: ministry.id },
        include: [{ model: User, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName'] }],
        order: [['serviceDate', 'DESC']], limit: 20,
      }),
      Project.findAll({ where: { ministryId: ministry.id }, order: [['createdAt', 'DESC']] }),
      Announcement.findAll({ where: { ministryId: ministry.id, isPublished: true }, order: [['publishDate', 'DESC']], limit: 5 }),
      GalleryItem.findAll({ where: { ministryId: ministry.id }, order: [['createdAt', 'DESC']], limit: 12 }),
    ]);

    const eventAttendance = await Promise.all(upcomingEvents.map(async (e) => ({
      eventId: e.id, title: e.title, startDate: e.startDate,
      registrations: await EventRegistration.count({ where: { eventId: e.id } }),
    })));

    const leaders = members.filter((m) => m.role === 'leader' || m.roleTitle === 'ministry_leader');

    res.json({
      success: true,
      data: {
        ministry,
        memberCount: members.length,
        leaders,
        members,
        upcomingEvents: eventAttendance,
        tasks: {
          total: tasks.length,
          pending: tasks.filter((t) => t.status === 'pending').length,
          inProgress: tasks.filter((t) => t.status === 'in_progress').length,
          completed: tasks.filter((t) => t.status === 'completed').length,
          items: tasks,
        },
        projects,
        announcements,
        gallery,
      },
    });
  } catch (err) { next(err); }
});
