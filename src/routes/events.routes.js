const router = require('express').Router();
const { Op } = require('sequelize');
const { authenticateToken, requireRole, optionalAuth, requireOwnMinistryOrMinRole } = require('../middleware/auth');
const { Event, EventRegistration } = require('../models');

// Public list (church calendar) - supports ?upcoming=true & ?category=
// Staff (leader/pastor/admin/super_admin) also see unpublished/draft events so they can manage them.
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { upcoming, category, search, page = 1, limit = 20 } = req.query;
    const isStaff = req.user && ['leader', 'pastor', 'admin', 'super_admin'].includes(req.user.role);
    const where = isStaff ? {} : { isPublished: true };
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

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const isStaff = req.user && ['leader', 'pastor', 'admin', 'super_admin'].includes(req.user.role);
    const where = isStaff ? { id: req.params.id } : { id: req.params.id, isPublished: true };
    const event = await Event.findOne({ where });
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
// Leaders may only create events for the ministry they lead; pastors/admins can
// create any event, including church-wide events (ministryId left blank).
router.post('/', authenticateToken, requireRole('admin', 'super_admin', 'leader', 'pastor'),
  requireOwnMinistryOrMinRole(() => null), // null = new record, so this just enforces "leader must have a ministry"
  async (req, res, next) => {
    try {
      const body = { ...req.body };
      if (req.user.role === 'leader') {
        body.ministryId = req.user.ministryId; // leaders can't assign events to another ministry
      }
      const event = await Event.create(body);
      res.status(201).json({ success: true, data: event });
    } catch (err) { next(err); }
  });

router.put('/:id', authenticateToken, requireRole('admin', 'super_admin', 'leader', 'pastor'), async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (req.user.role === 'leader') {
      if (!req.user.ministryId || event.ministryId !== req.user.ministryId) {
        return res.status(403).json({ success: false, message: 'You can only manage events belonging to your own ministry.' });
      }
      delete req.body.ministryId; // can't move an event to another ministry
    }
    await event.update(req.body);
    res.json({ success: true, data: event });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticateToken, requireRole('admin', 'super_admin', 'pastor', 'leader'), async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (req.user.role === 'leader' && (!req.user.ministryId || event.ministryId !== req.user.ministryId)) {
      return res.status(403).json({ success: false, message: 'You can only delete events belonging to your own ministry.' });
    }
    await event.destroy();
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) { next(err); }
});

// Admin: view registrations for an event
router.get('/:id/registrations', authenticateToken, requireRole('admin', 'super_admin', 'leader', 'pastor'), async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (req.user.role === 'leader' && (!req.user.ministryId || event.ministryId !== req.user.ministryId)) {
      return res.status(403).json({ success: false, message: 'You can only view registrations for your own ministry\'s events.' });
    }
    const registrations = await EventRegistration.findAll({ where: { eventId: req.params.id } });
    res.json({ success: true, data: registrations });
  } catch (err) { next(err); }
});

module.exports = router;
