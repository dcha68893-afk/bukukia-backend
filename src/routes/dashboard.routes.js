const router = require('express').Router();
const { Op, fn, col, literal } = require('sequelize');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const {
  User, Sermon, Event, EventRegistration, Donation, PrayerRequest, ContactMessage, Volunteer,
  Newsletter, AttendanceRecord, LiveStream,
} = require('../models');
const { PERMISSIONS } = require('../config/permissions');

// Admin dashboard summary stats
router.get('/stats', authenticateToken, requireRole('admin', 'super_admin', 'pastor', 'leader'), requirePermission(PERMISSIONS.VIEW_DASHBOARD_STATS), async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const [
      totalMembers, totalSermons, upcomingEvents, pendingPrayers,
      unreadMessages, pendingVolunteers, newsletterSubs, donationStats,
    ] = await Promise.all([
      User.count(),
      Sermon.count({ where: { isPublished: true } }),
      Event.count({ where: { startDate: { [Op.gte]: new Date() }, isPublished: true } }),
      PrayerRequest.count({ where: { status: 'new' } }),
      ContactMessage.count({ where: { isRead: false } }),
      Volunteer.count({ where: { status: 'pending' } }),
      Newsletter.count({ where: { isActive: true } }),
      Donation.findAll({ where: { status: 'completed' } }),
    ]);

    const totalGiving = donationStats.reduce((sum, d) => sum + Number(d.amount), 0);
    const thisMonth = donationStats.filter((d) => {
      const now = new Date();
      const created = new Date(d.createdAt);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).reduce((sum, d) => sum + Number(d.amount), 0);

    res.json({
      success: true,
      data: {
        totalMembers, totalSermons, upcomingEvents, pendingPrayers,
        unreadMessages, pendingVolunteers, newsletterSubs,
        totalGiving, givingThisMonth: thisMonth,
      },
    });
  } catch (err) { next(err); }
});

// Trend data for the analytics dashboard (spec item 14): attendance trend,
// member growth, giving by category + trend, ministry participation (via
// approved volunteer sign-ups, since there's no dedicated ministry-roster
// table yet), event attendance, livestream viewers, volunteer engagement.
// All queries are scoped to the last 12 weeks/months to keep this fast and
// chart-sized rather than dumping full history.
router.get('/analytics', authenticateToken, requireRole('admin', 'super_admin', 'pastor', 'leader'), requirePermission(PERMISSIONS.VIEW_DASHBOARD_STATS), async (req, res, next) => {
  try {
    const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const [
      attendanceRows, memberGrowthRows, givingByCategory, givingTrendRows,
      volunteerByInterest, volunteerByStatus, recentEvents, recentStreams,
    ] = await Promise.all([
      // Weekly attendance totals, split member vs visitor via the join to User.
      AttendanceRecord.findAll({
        attributes: [
          [fn('date_trunc', 'week', col('AttendanceRecord.serviceDate')), 'week'],
          [fn('count', col('AttendanceRecord.id')), 'total'],
        ],
        include: [{ model: User, attributes: [] }],
        where: { serviceDate: { [Op.gte]: twelveWeeksAgo } },
        group: [literal('1')],
        order: [literal('1 ASC')],
        raw: true,
      }),
      // New members per month.
      User.findAll({
        attributes: [
          [fn('date_trunc', 'month', col('createdAt')), 'month'],
          [fn('count', col('id')), 'newMembers'],
        ],
        where: { createdAt: { [Op.gte]: twelveMonthsAgo } },
        group: [literal('1')],
        order: [literal('1 ASC')],
        raw: true,
      }),
      // Giving by category (all-time, completed only) — a pie/bar chart, not a trend.
      Donation.findAll({
        attributes: ['type', [fn('sum', col('amount')), 'total']],
        where: { status: 'completed' },
        group: ['type'],
        raw: true,
      }),
      // Giving trend, last 12 months.
      Donation.findAll({
        attributes: [
          [fn('date_trunc', 'month', col('createdAt')), 'month'],
          [fn('sum', col('amount')), 'total'],
        ],
        where: { status: 'completed', createdAt: { [Op.gte]: twelveMonthsAgo } },
        group: [literal('1')],
        order: [literal('1 ASC')],
        raw: true,
      }),
      // Ministry participation, approximated via approved volunteer sign-ups
      // grouped by their stated ministry interest (free text) — there's no
      // dedicated ministry-roster table, so this is a proxy, not a census.
      Volunteer.findAll({
        attributes: ['ministryInterest', [fn('count', col('id')), 'count']],
        where: { status: 'approved', ministryInterest: { [Op.ne]: null } },
        group: ['ministryInterest'],
        raw: true,
      }),
      Volunteer.findAll({
        attributes: ['status', [fn('count', col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
      // Last 10 events; registration counts are fetched separately below
      // since a plain include here can't cleanly return a per-event count.
      Event.findAll({
        attributes: ['id', 'title', 'startDate'],
        order: [['startDate', 'DESC']],
        limit: 10,
      }),
      // Last 10 livestreams with (manually entered, see LiveStream model) peak viewers.
      LiveStream.findAll({
        attributes: ['id', 'title', 'scheduledStart', 'peakViewers'],
        order: [['scheduledStart', 'DESC']],
        limit: 10,
      }),
    ]);

    // EventRegistration counts need a second pass since Sequelize's include+count
    // in one query doesn't cleanly return a per-event number without raw SQL;
    // simpler and clearer to just fetch counts alongside.
    const eventAttendance = await Promise.all(recentEvents.map(async (e) => ({
      eventId: e.id, title: e.title, date: e.startDate,
      registrations: await EventRegistration.count({ where: { eventId: e.id } }),
    })));

    res.json({
      success: true,
      data: {
        attendanceTrend: attendanceRows.map((r) => ({ week: r.week, total: Number(r.total) })),
        memberGrowth: memberGrowthRows.map((r) => ({ month: r.month, newMembers: Number(r.newMembers) })),
        givingByCategory: givingByCategory.map((r) => ({ type: r.type, total: Number(r.total) })),
        givingTrend: givingTrendRows.map((r) => ({ month: r.month, total: Number(r.total) })),
        ministryParticipation: volunteerByInterest.map((r) => ({ ministry: r.ministryInterest, count: Number(r.count) })),
        volunteerEngagement: volunteerByStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
        eventAttendance,
        livestreamViewers: recentStreams.map((s) => ({ streamId: s.id, title: s.title, date: s.scheduledStart, peakViewers: s.peakViewers })),
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
