const router = require('express').Router();
const { authenticateToken, requireMinRole } = require('../middleware/auth');
const { VolunteerSchedule, Volunteer } = require('../models');
const { sendNotification } = require('../utils/notify');

// GET /api/volunteer-schedules?ministry=&date=
router.get('/', authenticateToken, requireMinRole('leader'), async (req, res, next) => {
  try {
    const { ministry, date } = req.query;
    const where = {};
    if (ministry) where.ministry = ministry;
    if (date) where.serviceDate = date;
    const schedules = await VolunteerSchedule.findAll({ where, order: [['serviceDate', 'ASC']] });
    res.json({ success: true, data: schedules });
  } catch (err) { next(err); }
});

// POST /api/volunteer-schedules - schedule a volunteer
router.post('/', authenticateToken, requireMinRole('leader'), async (req, res, next) => {
  try {
    const { volunteerId, userId, ministry, serviceDate, role } = req.body;
    if (!volunteerId || !ministry || !serviceDate)
      return res.status(400).json({ success: false, message: 'volunteerId, ministry and serviceDate are required' });

    const schedule = await VolunteerSchedule.create({ volunteerId, userId, ministry, serviceDate, role });

    // Notify the volunteer if they're a member
    if (userId) {
      await sendNotification({
        userId,
        title: 'Volunteer Schedule',
        message: `You have been scheduled for ${ministry} on ${new Date(serviceDate).toDateString()}. Role: ${role || 'General Volunteer'}`,
        type: 'general',
      });
    }

    res.status(201).json({ success: true, data: schedule });
  } catch (err) { next(err); }
});

// PUT /api/volunteer-schedules/:id - update status (e.g. excused)
router.put('/:id', authenticateToken, requireMinRole('leader'), async (req, res, next) => {
  try {
    const s = await VolunteerSchedule.findByPk(req.params.id);
    if (!s) return res.status(404).json({ success: false, message: 'Not found' });
    await s.update(req.body);
    res.json({ success: true, data: s });
  } catch (err) { next(err); }
});

module.exports = router;
