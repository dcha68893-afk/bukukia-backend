const router = require('express').Router();
const { authenticateToken, requireMinRole, optionalAuth } = require('../middleware/auth');
const { Booking } = require('../models');
const { sendNotification } = require('../utils/notify');

const BOOKING_TYPES = ['baptism','wedding','counseling','funeral','child_dedication','new_visitor','discipleship'];

// POST /api/bookings - anyone submits a booking request
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { type, fullName, email, phone, preferredDate, notes, partnerName, partnerPhone } = req.body;
    if (!type || !BOOKING_TYPES.includes(type))
      return res.status(400).json({ success: false, message: `Type must be one of: ${BOOKING_TYPES.join(', ')}` });
    if (!fullName)
      return res.status(400).json({ success: false, message: 'Full name is required' });

    const booking = await Booking.create({
      userId: req.user ? req.user.id : null,
      type, fullName, email, phone, preferredDate, notes, partnerName, partnerPhone,
    });

    // Notify the requester that it was received
    if (req.user) {
      await sendNotification({
        userId: req.user.id,
        title: `${capitalize(type)} Request Received`,
        message: `Your ${type} request has been received. A pastor will contact you to confirm the details.`,
        type: 'general',
        link: '/dashboard.html',
      });
    }

    res.status(201).json({ success: true, data: booking, message: 'Your request has been received. We will contact you soon.' });
  } catch (err) { next(err); }
});

// GET /api/bookings - staff: list all bookings (filter by type or status)
router.get('/', authenticateToken, requireMinRole('leader'), async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    const bookings = await Booking.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: bookings });
  } catch (err) { next(err); }
});

// PUT /api/bookings/:id - pastor confirms/assigns/completes a booking
router.put('/:id', authenticateToken, requireMinRole('leader'), async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const prevStatus = booking.status;
    const allowed = ['status', 'assignedTo', 'confirmedDate', 'adminNotes'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) booking[f] = req.body[f]; });
    await booking.save();

    // Notify the member if status changed
    if (req.body.status && req.body.status !== prevStatus && booking.userId) {
      const msgs = {
        confirmed: `Your ${booking.type} has been confirmed! ${req.body.confirmedDate ? 'Date: ' + new Date(req.body.confirmedDate).toDateString() : ''}`,
        completed: `Your ${booking.type} has been marked as completed. God bless you!`,
        cancelled: `Your ${booking.type} request has been cancelled. Please contact the church office for more information.`,
      };
      if (msgs[req.body.status]) {
        await sendNotification({
          userId: booking.userId,
          title: `${capitalize(booking.type)} Update`,
          message: msgs[req.body.status],
          type: 'general',
        });
      }
    }

    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
});

// DELETE /api/bookings/:id
router.delete('/:id', authenticateToken, requireMinRole('admin'), async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Not found' });
    await booking.destroy();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
});

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' '); }

module.exports = router;
