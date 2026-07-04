const router = require('express').Router();
const { authenticateToken, requireMinRole, requireRole, requirePermission } = require('../middleware/auth');
const { isAtLeast } = require('../config/roles');
const { CellGroup, CellGroupMember, User, CellGroupReport } = require('../models');
const { PERMISSIONS } = require('../config/permissions');

// GET /api/cell-groups - public list
router.get('/', async (req, res, next) => {
  try {
    const groups = await CellGroup.findAll({ where: { isActive: true }, order: [['area', 'ASC']] });
    res.json({ success: true, data: groups });
  } catch (err) { next(err); }
});

// GET /api/cell-groups/:id/members — scoped the same way as PUT above:
// a leader-tier account can only see the roster (names/emails/phones) of
// their OWN cell group, not every group in the church.
router.get('/:id/members', authenticateToken, requireMinRole('leader'), async (req, res, next) => {
  try {
    const group = await CellGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Not found' });
    const isOwnGroup = group.leaderId && group.leaderId === req.user.id;
    if (!isOwnGroup && !isAtLeast(req.user.role, 'pastor')) {
      return res.status(403).json({ success: false, message: 'You can only view your own cell group\'s roster.' });
    }
    const members = await CellGroupMember.findAll({
      where: { cellGroupId: req.params.id },
      include: [{ model: User, as: 'user', attributes: ['id','firstName','lastName','email','phone'] }],
    });
    res.json({ success: true, data: members });
  } catch (err) { next(err); }
});

// POST /api/cell-groups/:id/join - logged-in member joins a cell group
router.post('/:id/join', authenticateToken, async (req, res, next) => {
  try {
    const group = await CellGroup.findByPk(req.params.id);
    if (!group || !group.isActive) return res.status(404).json({ success: false, message: 'Cell group not found' });
    const [record, created] = await CellGroupMember.findOrCreate({
      where: { cellGroupId: group.id, userId: req.user.id },
    });
    res.status(created ? 201 : 200).json({ success: true, data: record, alreadyMember: !created });
  } catch (err) { next(err); }
});

// POST /api/cell-groups - admin/pastor creates a cell group
router.post('/', authenticateToken, requireMinRole('pastor'), async (req, res, next) => {
  try {
    const group = await CellGroup.create(req.body);
    res.status(201).json({ success: true, data: group });
  } catch (err) { next(err); }
});

// PUT /api/cell-groups/:id — was previously any leader-tier account editing
// ANY cell group (a real gap: a Media ministry leader could edit a cell
// group they have nothing to do with). Now scoped to that specific group's
// leader, or pastor+ tier for oversight.
router.put('/:id', authenticateToken, requireMinRole('leader'), async (req, res, next) => {
  try {
    const group = await CellGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Not found' });
    const isOwnGroup = group.leaderId && group.leaderId === req.user.id;
    if (!isOwnGroup && !isAtLeast(req.user.role, 'pastor')) {
      return res.status(403).json({ success: false, message: 'You can only manage your own cell group.' });
    }
    await group.update(req.body);
    res.json({ success: true, data: group });
  } catch (err) { next(err); }
});

// DELETE /api/cell-groups/:id
router.delete('/:id', authenticateToken, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const group = await CellGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Not found' });
    await group.destroy();
    res.json({ success: true, message: 'Cell group deleted' });
  } catch (err) { next(err); }
});

// POST /api/cell-groups/:id/reports — submit (or edit, if one already exists
// for that date — see the unique index on the model) this week's meeting
// report: attendance, Bible study notes, visitor count. Same own-group
// scoping as PUT/members above.
router.post('/:id/reports', authenticateToken, requireMinRole('leader'), async (req, res, next) => {
  try {
    const group = await CellGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Not found' });
    const isOwnGroup = group.leaderId && group.leaderId === req.user.id;
    if (!isOwnGroup && !isAtLeast(req.user.role, 'pastor')) {
      return res.status(403).json({ success: false, message: 'You can only submit reports for your own cell group.' });
    }
    const { meetingDate, attendanceCount, visitorsCount, bibleStudyTopic, bibleStudyNotes, prayerRequestsSummary } = req.body;
    if (!meetingDate) return res.status(400).json({ success: false, message: 'meetingDate is required' });

    // Upsert on (cellGroupId, meetingDate): resubmitting the same week edits
    // rather than creating a duplicate report.
    const [report] = await CellGroupReport.findOrCreate({
      where: { cellGroupId: group.id, meetingDate },
      defaults: { submittedByUserId: req.user.id },
    });
    Object.assign(report, { attendanceCount, visitorsCount, bibleStudyTopic, bibleStudyNotes, prayerRequestsSummary, submittedByUserId: req.user.id });
    await report.save();
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

router.get('/:id/reports', authenticateToken, requireMinRole('leader'), async (req, res, next) => {
  try {
    const group = await CellGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Not found' });
    const isOwnGroup = group.leaderId && group.leaderId === req.user.id;
    if (!isOwnGroup && !isAtLeast(req.user.role, 'pastor')) {
      return res.status(403).json({ success: false, message: 'You can only view your own cell group\'s reports.' });
    }
    const reports = await CellGroupReport.findAll({ where: { cellGroupId: group.id }, order: [['meetingDate', 'DESC']], limit: 52 });
    res.json({ success: true, total: reports.length, data: reports });
  } catch (err) { next(err); }
});

// GET /api/cell-groups/:id/growth — the "Growth Charts" spec item: weekly
// attendance trend (from reports) plus cumulative membership growth (from
// when each CellGroupMember joined), last 12 months.
router.get('/:id/growth', authenticateToken, requireMinRole('leader'), async (req, res, next) => {
  try {
    const group = await CellGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Not found' });
    const isOwnGroup = group.leaderId && group.leaderId === req.user.id;
    if (!isOwnGroup && !isAtLeast(req.user.role, 'pastor')) {
      return res.status(403).json({ success: false, message: 'You can only view your own cell group\'s growth chart.' });
    }

    const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const reports = await CellGroupReport.findAll({
      where: { cellGroupId: group.id, meetingDate: { [require('sequelize').Op.gte]: twelveMonthsAgo } },
      order: [['meetingDate', 'ASC']],
      attributes: ['meetingDate', 'attendanceCount', 'visitorsCount'],
    });
    const members = await CellGroupMember.findAll({
      where: { cellGroupId: group.id },
      attributes: ['joinedAt'],
      order: [['joinedAt', 'ASC']],
    });

    // Cumulative membership count over time, bucketed by month, so the
    // frontend can plot "how many members did we have as of each month"
    // rather than needing to do that math client-side.
    const membershipByMonth = {};
    let running = 0;
    members.forEach((m) => {
      const key = new Date(m.joinedAt).toISOString().slice(0, 7); // YYYY-MM
      running += 1;
      membershipByMonth[key] = running;
    });

    res.json({
      success: true,
      data: {
        attendanceTrend: reports.map((r) => ({ meetingDate: r.meetingDate, attendance: r.attendanceCount, visitors: r.visitorsCount })),
        membershipGrowth: Object.entries(membershipByMonth).map(([month, cumulativeMembers]) => ({ month, cumulativeMembers })),
        currentMemberCount: members.length,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
