const router = require('express').Router();
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const { AttendanceRecord, User } = require('../models');
const { PERMISSIONS } = require('../config/permissions');

// Self check-in (e.g. via QR code scan that hits this endpoint while logged in)
router.post('/check-in', authenticateToken, async (req, res, next) => {
  try {
    const { serviceDate, checkedInVia = 'self' } = req.body;
    const date = serviceDate || new Date().toISOString().slice(0, 10);
    const [record] = await AttendanceRecord.findOrCreate({
      where: { userId: req.user.id, serviceDate: date },
      defaults: { checkedInVia },
    });
    res.status(201).json({ success: true, data: record });
  } catch (err) { next(err); }
});

// Admin: manual check-in for a member (e.g. via QR scanner at the door, or front-desk entry)
router.post('/', authenticateToken, requireRole('admin', 'super_admin', 'leader'), requirePermission(PERMISSIONS.RECORD_ATTENDANCE), async (req, res, next) => {
  try {
    const { userId, serviceDate, checkedInVia = 'manual' } = req.body;
    if (!userId || !serviceDate) return res.status(400).json({ success: false, message: 'userId and serviceDate are required' });
    const [record] = await AttendanceRecord.findOrCreate({
      where: { userId, serviceDate },
      defaults: { checkedInVia },
    });
    res.status(201).json({ success: true, data: record });
  } catch (err) { next(err); }
});

// Admin: attendance reports
router.get('/', authenticateToken, requireRole('admin', 'super_admin', 'leader', 'pastor'), requirePermission(PERMISSIONS.VIEW_ATTENDANCE), async (req, res, next) => {
  try {
    const { serviceDate } = req.query;
    const where = serviceDate ? { serviceDate } : {};
    const records = await AttendanceRecord.findAll({
      where,
      include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['serviceDate', 'DESC']],
    });
    res.json({ success: true, total: records.length, data: records });
  } catch (err) { next(err); }
});

module.exports = router;
