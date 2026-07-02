const router = require('express').Router();
const { authenticateToken, requireMinRole } = require('../middleware/auth');
const { Notification, User } = require('../models');
const { broadcastNotification } = require('../utils/notify');

// GET /api/notifications - own unread notifications (any logged-in user)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    res.json({ success: true, data: notifications, unreadCount });
  } catch (err) { next(err); }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticateToken, async (req, res, next) => {
  try {
    const n = await Notification.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });
    n.isRead = true;
    await n.save();
    res.json({ success: true, data: n });
  } catch (err) { next(err); }
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticateToken, async (req, res, next) => {
  try {
    await Notification.update({ isRead: true }, { where: { userId: req.user.id, isRead: false } });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
});

// POST /api/notifications/broadcast - admin sends a notification to ALL members (or a role subset)
router.post('/broadcast', authenticateToken, requireMinRole('pastor'), async (req, res, next) => {
  try {
    const { title, message, type = 'announcement', link, targetRole } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: 'Title and message are required' });

    const where = { isActive: true };
    if (targetRole) where.role = targetRole;
    const users = await User.findAll({ where, attributes: ['id'] });
    const userIds = users.map((u) => u.id);

    if (userIds.length === 0) return res.json({ success: true, message: 'No matching users found' });

    await broadcastNotification(userIds, { title, message, type, link });
    res.json({ success: true, message: `Notification sent to ${userIds.length} member(s)` });
  } catch (err) { next(err); }
});

module.exports = router;
