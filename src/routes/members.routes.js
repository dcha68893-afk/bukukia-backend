const router = require('express').Router();
const { Op } = require('sequelize');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const { User, EventRegistration, Donation, AttendanceRecord, VolunteerSchedule, CellGroup, Ministry } = require('../models');
const { ROLE_TIER, PERMISSIONS, hasPermission } = require('../config/permissions');
const { recordAudit } = require('../utils/audit');

// medicalNotes is excluded from every member-directory response by default —
// even for staff who can otherwise view the full directory — and only
// added back in for whoever holds VIEW_MEDICAL_NOTES (see config/permissions.js;
// currently just senior_pastor + super_admin). A member can always see their
// own medicalNotes via GET /api/auth/me, which doesn't go through this route.
function canSeeMedicalNotes(user) {
  return user.role === 'super_admin' || (user.roleTitle ? hasPermission(user.roleTitle, PERMISSIONS.VIEW_MEDICAL_NOTES) : true);
}

// GET /api/members/deleted — list soft-deleted members, for the rare "we
// need this back" case. super_admin-only: seeing who's been removed is
// itself sensitive information. MUST be registered before GET '/:id' below,
// or Express would match "/deleted" as :id="deleted" and 400 on the invalid
// UUID instead of ever reaching this handler.
router.get('/deleted', authenticateToken, requireRole('super_admin'), async (req, res, next) => {
  try {
    const deleted = await User.findAll({
      where: { deletedAt: { [Op.ne]: null } },
      paranoid: false,
      attributes: { exclude: ['passwordHash', 'resetToken', 'resetTokenExpires'] },
      order: [['deletedAt', 'DESC']],
    });
    res.json({ success: true, total: deleted.length, data: deleted });
  } catch (err) { next(err); }
});

// Admin: member directory
router.get('/', authenticateToken, requireRole('admin', 'super_admin', 'leader', 'pastor'), requirePermission(PERMISSIONS.VIEW_MEMBERS), async (req, res, next) => {
  try {
    const { search, status, role, page = 1, limit = 25 } = req.query;
    const where = {};
    if (status) where.membershipStatus = status;
    if (role) where.role = role;
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const offset = (Number(page) - 1) * Number(limit);
    const excludeFields = ['passwordHash', 'resetToken', 'resetTokenExpires'];
    if (!canSeeMedicalNotes(req.user)) excludeFields.push('medicalNotes');
    const { rows, count } = await User.findAndCountAll({
      where, limit: Number(limit), offset, order: [['createdAt', 'DESC']],
      attributes: { exclude: excludeFields },
    });
    res.json({ success: true, total: count, page: Number(page), data: rows });
  } catch (err) { next(err); }
});

router.get('/:id', authenticateToken, requireRole('admin', 'super_admin', 'leader', 'pastor'), requirePermission(PERMISSIONS.VIEW_MEMBERS), async (req, res, next) => {
  try {
    const excludeFields = ['passwordHash', 'resetToken', 'resetTokenExpires'];
    if (!canSeeMedicalNotes(req.user)) excludeFields.push('medicalNotes');
    const user = await User.findByPk(req.params.id, { attributes: { exclude: excludeFields } });
    if (!user) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// GET /api/members/:id/profile — spec item 4 (Member Profiles) depth: the
// full picture staff would want when looking someone up — attendance
// history, giving history, volunteer record, ministry/cell group names
// (not just IDs) — in one call instead of 5+ separate requests. Same
// VIEW_MEMBERS + medicalNotes gating as the plain GET /:id above.
router.get('/:id/profile', authenticateToken, requireRole('admin', 'super_admin', 'leader', 'pastor'), requirePermission(PERMISSIONS.VIEW_MEMBERS), async (req, res, next) => {
  try {
    const excludeFields = ['passwordHash', 'resetToken', 'resetTokenExpires'];
    if (!canSeeMedicalNotes(req.user)) excludeFields.push('medicalNotes');
    const user = await User.findByPk(req.params.id, { attributes: { exclude: excludeFields } });
    if (!user) return res.status(404).json({ success: false, message: 'Member not found' });

    const [ministry, cellGroup, attendance, donations, volunteerRecord, eventRegistrations] = await Promise.all([
      user.ministryId ? Ministry.findByPk(user.ministryId, { attributes: ['id', 'name'] }) : null,
      user.cellGroupId ? CellGroup.findByPk(user.cellGroupId, { attributes: ['id', 'name'] }) : null,
      AttendanceRecord.findAll({ where: { userId: user.id }, order: [['serviceDate', 'DESC']], limit: 20 }),
      Donation.findAll({ where: { userId: user.id, status: 'completed' }, order: [['createdAt', 'DESC']], limit: 20 }),
      VolunteerSchedule.findAll({ where: { userId: user.id }, order: [['serviceDate', 'DESC']], limit: 20 }),
      EventRegistration.findAll({ where: { userId: user.id }, order: [['createdAt', 'DESC']], limit: 10 }),
    ]);

    const givingTotal = donations.reduce((sum, d) => sum + Number(d.amount), 0);
    const volunteerHoursCompleted = volunteerRecord.filter((v) => v.status === 'completed').length;

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        ministry, cellGroup,
        attendance: { total: attendance.length, recent: attendance },
        giving: { totalAllTime: givingTotal, count: donations.length, recent: donations },
        volunteering: { shiftsCompleted: volunteerHoursCompleted, recent: volunteerRecord },
        eventRegistrations,
      },
    });
  } catch (err) { next(err); }
});

// Pastors can assign a member's ministry/cell group (i.e. designate who leads what);
// only admin/super_admin can change role, membership status, or active flag.
// EDIT_MEMBERS narrows this further for granular job titles: e.g. a Finance
// Manager or Media Director share the 'admin' tier but should NOT be able to
// edit anyone's role/ministry — only Senior Pastor and Church Secretary (see
// config/permissions.js) actually carry EDIT_MEMBERS. A legacy plain
// admin/pastor account (no roleTitle) still passes, same as before.
router.put('/:id', authenticateToken, requireRole('admin', 'super_admin', 'pastor'), requirePermission(PERMISSIONS.EDIT_MEMBERS), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Member not found' });
    const before = user.toJSON();

    const adminOnlyFields = ['role', 'roleTitle', 'membershipStatus', 'isActive'];
    const requestedAdminFields = adminOnlyFields.filter((f) => req.body[f] !== undefined);
    if (requestedAdminFields.length && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only an admin can change role, membership status, or active flag.' });
    }

    // Never allow self-promotion/demotion through this endpoint, even for admins.
    if (user.id === req.user.id && (req.body.role !== undefined || req.body.roleTitle !== undefined)) {
      return res.status(403).json({ success: false, message: 'You cannot change your own role.' });
    }

    // Only super_admin may grant/revoke admin or super_admin-tier roles — this
    // covers both the plain 'role' field and any roleTitle whose tier
    // (config/permissions.js ROLE_TIER) is 'admin' or 'super_admin', e.g.
    // assigning someone 'finance_manager' or 'senior_pastor' is just as
    // privilege-sensitive as setting role='admin' directly.
    const escalatingTiers = ['admin', 'super_admin'];
    const requestedRole = req.body.role;
    const requestedTier = req.body.roleTitle !== undefined ? ROLE_TIER[req.body.roleTitle] : undefined;
    const targetsEscalatingRole = requestedRole !== undefined && escalatingTiers.includes(requestedRole);
    const targetsEscalatingTitle = requestedTier !== undefined && escalatingTiers.includes(requestedTier);
    const currentlyPrivileged = escalatingTiers.includes(user.role);
    if ((targetsEscalatingRole || targetsEscalatingTitle || currentlyPrivileged) && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only a super admin can assign or modify admin-level roles.' });
    }

    // Setting roleTitle to an unknown value is rejected here (rather than
    // relying only on the DB ENUM constraint) so the error message is clear.
    if (req.body.roleTitle !== undefined && req.body.roleTitle !== null && !ROLE_TIER[req.body.roleTitle]) {
      return res.status(400).json({ success: false, message: `Unknown roleTitle: ${req.body.roleTitle}` });
    }

    const allowed = ['role', 'roleTitle', 'membershipStatus', 'isActive', 'cellGroupId', 'ministryId', 'discipleshipStage', 'coursesCompleted'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) user[f] = req.body[f]; });
    await user.save();
    // Strip sensitive fields before echoing the updated record back — same
    // exclusion GET already applies. Sequelize instances need toJSON()
    // first since `delete instance.field` doesn't touch the underlying
    // dataValues that get serialized.
    const safeUser = user.toJSON();
    delete safeUser.passwordHash;
    delete safeUser.resetToken;
    delete safeUser.resetTokenExpires;
    await recordAudit(req, { action: 'member.update', entityType: 'User', entityId: user.id, before, after: safeUser });
    res.json({ success: true, data: safeUser });
  } catch (err) { next(err); }
});

// Removing a member record is permanent, so this is deliberately tighter
// than editing: tier-gated to pastor+ (was super_admin-only before), but
// DELETE_MEMBERS is only actually granted to senior_pastor and super_admin
// (see config/permissions.js) — an associate/youth/children's/worship/
// evangelism pastor is tier 'pastor' too, but doesn't carry DELETE_MEMBERS,
// so they're stopped here even though they clear the tier check. A legacy
// plain 'pastor'/'admin' account (no roleTitle) still passes, same as
// every other permission check in this codebase.
router.delete('/:id', authenticateToken, requireRole('pastor', 'admin', 'super_admin'), requirePermission(PERMISSIONS.DELETE_MEMBERS), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Member not found' });
    const before = user.toJSON();
    delete before.passwordHash; delete before.resetToken; delete before.resetTokenExpires;
    await user.destroy(); // soft-delete (paranoid mode, see models/User.js) — sets deletedAt, doesn't actually remove the row
    await recordAudit(req, { action: 'member.delete', entityType: 'User', entityId: req.params.id, before, after: null });
    res.json({ success: true, message: 'Member removed (recoverable via restore for 90 days — contact a super admin if this was a mistake)' });
  } catch (err) { next(err); }
});

// POST /api/members/:id/restore — undo a soft-delete. super_admin-only,
// same reasoning as DELETE_MEMBERS being tightly held: undeleting someone
// is just as consequential a decision as deleting them.
router.post('/:id/restore', authenticateToken, requireRole('super_admin'), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, { paranoid: false });
    if (!user) return res.status(404).json({ success: false, message: 'Member not found' });
    if (!user.deletedAt) return res.status(400).json({ success: false, message: 'This member was not deleted' });
    await user.restore();
    await recordAudit(req, { action: 'member.restore', entityType: 'User', entityId: user.id, before: null, after: { restored: true } });
    res.json({ success: true, message: 'Member restored', data: { id: user.id, email: user.email } });
  } catch (err) { next(err); }
});

// Logged-in member's own dashboard data (event registrations, giving history, attendance)
router.get('/me/dashboard', authenticateToken, async (req, res, next) => {
  try {
    const [eventRegistrations, donations, attendance] = await Promise.all([
      EventRegistration.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] }),
      Donation.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] }),
      AttendanceRecord.findAll({ where: { userId: req.user.id }, order: [['serviceDate', 'DESC']], limit: 20 }),
    ]);
    res.json({ success: true, data: { eventRegistrations, donations, attendance } });
  } catch (err) { next(err); }
});

module.exports = router;
