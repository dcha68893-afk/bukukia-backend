const router = require('express').Router();
const { Op } = require('sequelize');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { Event, EventRegistration } = require('../models');

// Public list (church calendar) - supports ?upcoming=true & ?category=
router.get('/', async (req, res, next) => {
  try {
    const { upcoming, category, search, page = 1, limit = 20 } = req.query;
    const where = { isPublished: true };
    if (upcoming === 'true') where.startDate = { [Op.gte]: new Date() };
    if (category) where.category = category;
    if (search) where.title = { [Op.iLike]: `%${search}%` };

    const offset = (Number(page) - 1) * Number(limit);
    const { rows, count } = await Event.findAndCountAll({
      where, limit: Number(limit), offset, order: [['startDate', 'ASC']],
    });
    res.json({ success: true, total: count, page: Number(page), data: rows });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: event });
  } catch (err) { next(err); }
});

// Register for event (open to public, but attaches userId if logged in)
router.post('/:id/register', optionalAuth, async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (!event.registrationRequired) {
      return res.status(400).json({ success: false, message: 'This event does not require registration' });
    }

    const { fullName, email, phone, numberOfGuests = 0 } = req.body;
    if (!fullName || !email) {
      return res.status(400).json({ success: false, message: 'Full name and email are required' });
    }

    if (event.capacity) {
      const currentCount = await EventRegistration.count({ where: { eventId: event.id, status: 'confirmed' } });
      if (currentCount >= event.capacity) {
        return res.status(400).json({ success: false, message: 'This event is fully booked' });
      }
    }

    const registration = await EventRegistration.create({
      eventId: event.id,
      userId: req.user ? req.user.id : null,
      fullName, email, phone, numberOfGuests,
    });
    res.status(201).json({ success: true, data: registration });
  } catch (err) { next(err); }
});

// Admin: create/update/delete events
router.post('/', authenticateToken, requireRole('admin', 'super_admin', 'leader', 'pastor'), async (req, res, next) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json({ success: true, data: event });
  } catch (err) { next(err); }
});

router.put('/:id', authenticateToken, requireRole('admin', 'super_admin', 'leader', 'pastor'), async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    await event.update(req.body);
    res.json({ success: true, data: event });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticateToken, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    await event.destroy();
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) { next(err); }
});

// Admin: view registrations for an event
router.get('/:id/registrations', authenticateToken, requireRole('admin', 'super_admin', 'leader', 'pastor'), async (req, res, next) => {
  try {
    const registrations = await EventRegistration.findAll({ where: { eventId: req.params.id } });
    res.json({ success: true, data: registrations });
  } catch (err) { next(err); }
});

module.exports = router;
