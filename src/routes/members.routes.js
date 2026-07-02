const router = require('express').Router();
const { Op } = require('sequelize');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { User, EventRegistration, Donation, AttendanceRecord } = require('../models');

// Admin: member directory
router.get('/', authenticateToken, requireRole('admin', 'super_admin', 'leader', 'pastor'), async (req, res, next) => {
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
    const { rows, count } = await User.findAndCountAll({
      where, limit: Number(limit), offset, order: [['createdAt', 'DESC']],
      attributes: { exclude: ['passwordHash', 'resetToken', 'resetTokenExpires'] },
    });
    res.json({ success: true, total: count, page: Number(page), data: rows });
  } catch (err) { next(err); }
});

router.get('/:id', authenticateToken, requireRole('admin', 'super_admin', 'leader', 'pastor'), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['passwordHash', 'resetToken', 'resetTokenExpires'] },
    });
    if (!user) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// Pastors can assign a member's ministry/cell group (i.e. designate who leads what);
// only admin/super_admin can change role, membership status, or active flag.
router.put('/:id', authenticateToken, requireRole('admin', 'super_admin', 'pastor'), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Member not found' });

    const adminOnlyFields = ['role', 'membershipStatus', 'isActive'];
    const requestedAdminFields = adminOnlyFields.filter((f) => req.body[f] !== undefined);
    if (requestedAdminFields.length && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only an admin can change role, membership status, or active flag.' });
    }

    // Never allow self-promotion/demotion through this endpoint, even for admins.
    if (user.id === req.user.id && req.body.role !== undefined) {
      return res.status(403).json({ success: false, message: 'You cannot change your own role.' });
    }

    // Only super_admin may grant/revoke admin or super_admin roles.
    const escalatingRoles = ['admin', 'super_admin'];
    if (req.body.role !== undefined) {
      const targetingPrivileged = escalatingRoles.includes(req.body.role) || escalatingRoles.includes(user.role);
      if (targetingPrivileged && req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Only a super admin can assign or modify admin-level roles.' });
      }
    }

    const allowed = ['role', 'membershipStatus', 'isActive', 'cellGroupId', 'ministryId'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) user[f] = req.body[f]; });
    await user.save();
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticateToken, requireRole('super_admin'), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Member not found' });
    await user.destroy();
    res.json({ success: true, message: 'Member removed' });
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
