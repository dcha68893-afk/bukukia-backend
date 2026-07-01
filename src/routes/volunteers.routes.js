const router = require('express').Router();
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { Volunteer } = require('../models');

router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { fullName, email, phone, ministryInterest, skills, availability } = req.body;
    if (!fullName || !email) return res.status(400).json({ success: false, message: 'Name and email are required' });
    const entry = await Volunteer.create({
      userId: req.user ? req.user.id : null,
      fullName, email, phone, ministryInterest, skills, availability,
    });
    res.status(201).json({ success: true, data: entry });
  } catch (err) { next(err); }
});

router.get('/', authenticateToken, requireRole('admin', 'super_admin', 'leader', 'pastor'), async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const items = await Volunteer.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

router.put('/:id', authenticateToken, requireRole('admin', 'super_admin', 'leader', 'pastor'), async (req, res, next) => {
  try {
    const item = await Volunteer.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.body.status) item.status = req.body.status;
    await item.save();
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

module.exports = router;
