const router = require('express').Router();
const buildCrudRouter = require('../utils/crudFactory');
const { Pastor, Booking } = require('../models');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

module.exports = buildCrudRouter({
  Model: Pastor,
  router,
  publishedFilter: { isActive: true },
  searchFields: ['fullName', 'title', 'bio'],
  editRoles: ['pastor', 'admin', 'super_admin'],
});

// GET /api/leadership/:id/profile — the full leader profile (spec item 3),
// including a live upcoming-appointments count if they accept bookings.
// Public (optionalAuth): a visitor should be able to see "Pastor John,
// serving since 2016, Book Appointment" without an account, same as the
// existing About page. The appointment COUNT is public; the underlying
// booking records themselves are not exposed here.
router.get('/:id/profile', optionalAuth, async (req, res, next) => {
  try {
    const pastor = await Pastor.findByPk(req.params.id);
    if (!pastor || !pastor.isActive) return res.status(404).json({ success: false, message: 'Leader not found' });

    let upcomingAppointments = 0;
    if (pastor.acceptsAppointments) {
      upcomingAppointments = await Booking.count({
        where: { pastorId: pastor.id, status: ['pending', 'confirmed'] },
      });
    }

    const yearsServing = pastor.servingSince
      ? new Date().getFullYear() - new Date(pastor.servingSince).getFullYear()
      : null;

    res.json({ success: true, data: { ...pastor.toJSON(), yearsServing, upcomingAppointments } });
  } catch (err) { next(err); }
});

// A leader's own upcoming appointments, in detail (not just the public
// count above) — restricted to the pastor's own linked account or staff.
router.get('/:id/appointments', authenticateToken, async (req, res, next) => {
  try {
    const pastor = await Pastor.findByPk(req.params.id);
    if (!pastor) return res.status(404).json({ success: false, message: 'Leader not found' });
    const isSelf = pastor.userId && pastor.userId === req.user.id;
    const isStaff = ['admin', 'super_admin', 'pastor'].includes(req.user.role);
    if (!isSelf && !isStaff) return res.status(403).json({ success: false, message: 'Not authorized to view these appointments' });

    const appointments = await Booking.findAll({
      where: { pastorId: pastor.id, status: ['pending', 'confirmed'] },
      order: [['preferredDate', 'ASC']],
    });
    res.json({ success: true, total: appointments.length, data: appointments });
  } catch (err) { next(err); }
});
