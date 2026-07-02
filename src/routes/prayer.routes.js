const router = require('express').Router();
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { prayerRules, verifyCaptcha } = require('../middleware/validate');
const { PrayerRequest, User } = require('../models');
const { sendNotification } = require('../utils/notify');

// POST /api/prayer-requests - submit (anyone, with optional login for ownership)
router.post('/', optionalAuth, verifyCaptcha, prayerRules, async (req, res, next) => {
  try {
    const { fullName, email, request, isAnonymous = false, isUrgent = false, isPublicOnWall = false } = req.body;
    if (!request) return res.status(400).json({ success: false, message: 'Prayer request content is required' });

    const entry = await PrayerRequest.create({
      userId: req.user ? req.user.id : null,
      fullName: isAnonymous ? null : (fullName || (req.user ? req.user.firstName + ' ' + req.user.lastName : null)),
      email: isAnonymous ? null : (email || (req.user ? req.user.email : null)),
      request, isAnonymous, isUrgent, isPublicOnWall,
    });

    // Notify requester that it was received (only if they are a logged-in member)
    if (req.user) {
      await sendNotification({
        userId: req.user.id,
        title: 'Prayer Request Received',
        message: 'Our prayer team has received your request and will be praying for you.',
        type: 'prayer_update',
        link: '/prayer.html',
        sendEmail: true,
      });
    }

    res.status(201).json({ success: true, data: entry });
  } catch (err) { next(err); }
});

// GET /api/prayer-requests/wall - public wall (public items only, names hidden if anonymous)
router.get('/wall', async (req, res, next) => {
  try {
    const items = await PrayerRequest.findAll({
      where: { isPublicOnWall: true },
      attributes: ['id', 'fullName', 'isAnonymous', 'request', 'testimony', 'status', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json({
      success: true,
      data: items.map((i) => {
        const o = i.toJSON();
        if (o.isAnonymous) o.fullName = 'Anonymous';
        return o;
      }),
    });
  } catch (err) { next(err); }
});

// GET /api/prayer-requests - staff: all requests
router.get('/', authenticateToken, requireRole('admin', 'super_admin', 'pastor', 'leader'), async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const items = await PrayerRequest.findAll({ where, order: [['isUrgent', 'DESC'], ['createdAt', 'DESC']] });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

// PUT /api/prayer-requests/:id - update status + testimony, notify requester
router.put('/:id', authenticateToken, requireRole('admin', 'super_admin', 'pastor', 'leader'), async (req, res, next) => {
  try {
    const item = await PrayerRequest.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });

    const prevStatus = item.status;
    const { status, testimony, isPublicOnWall } = req.body;
    if (status) item.status = status;
    if (testimony !== undefined) item.testimony = testimony;
    if (isPublicOnWall !== undefined) item.isPublicOnWall = isPublicOnWall;
    await item.save();

    // Notify the member if their request status changed
    if (status && status !== prevStatus && item.userId) {
      const statusMessages = {
        in_prayer: 'Our prayer team is now praying for your request. You are not alone.',
        answered:  'Praise God! Your prayer request has been marked as answered.',
        archived:  'Your prayer request has been archived.',
      };
      const msg = statusMessages[status];
      if (msg) {
        await sendNotification({
          userId: item.userId,
          title: 'Prayer Request Update',
          message: msg + (testimony ? '\n\nNote from prayer team: ' + testimony : ''),
          type: 'prayer_update',
          link: '/prayer.html',
        });
      }
    }

    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

// DELETE /api/prayer-requests/:id
router.delete('/:id', authenticateToken, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const item = await PrayerRequest.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    await item.destroy();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
