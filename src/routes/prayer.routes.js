const router = require('express').Router();
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { PrayerRequest } = require('../models');

// Submit a prayer request (public, supports anonymous)
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { fullName, email, request, isAnonymous = false, isUrgent = false, isPublicOnWall = false } = req.body;
    if (!request) return res.status(400).json({ success: false, message: 'Prayer request content is required' });

    const entry = await PrayerRequest.create({
      userId: req.user ? req.user.id : null,
      fullName: isAnonymous ? null : fullName,
      email: isAnonymous ? null : email,
      request, isAnonymous, isUrgent, isPublicOnWall,
    });
    res.status(201).json({ success: true, data: entry });
  } catch (err) { next(err); }
});

// Public prayer wall - only items explicitly marked public, names hidden if anonymous
router.get('/wall', async (req, res, next) => {
  try {
    const items = await PrayerRequest.findAll({
      where: { isPublicOnWall: true },
      attributes: ['id', 'fullName', 'isAnonymous', 'request', 'testimony', 'status', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    const sanitized = items.map((i) => {
      const o = i.toJSON();
      if (o.isAnonymous) o.fullName = 'Anonymous';
      return o;
    });
    res.json({ success: true, data: sanitized });
  } catch (err) { next(err); }
});

// Admin/prayer-team: list all requests
router.get('/', authenticateToken, requireRole('admin', 'super_admin', 'pastor', 'leader'), async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const items = await PrayerRequest.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

// Admin/prayer-team: update status / add testimony
router.put('/:id', authenticateToken, requireRole('admin', 'super_admin', 'pastor', 'leader'), async (req, res, next) => {
  try {
    const item = await PrayerRequest.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    const { status, testimony, isPublicOnWall } = req.body;
    if (status) item.status = status;
    if (testimony !== undefined) item.testimony = testimony;
    if (isPublicOnWall !== undefined) item.isPublicOnWall = isPublicOnWall;
    await item.save();
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticateToken, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const item = await PrayerRequest.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    await item.destroy();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
