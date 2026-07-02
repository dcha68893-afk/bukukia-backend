const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { authenticateToken, requireMinRole } = require('../middleware/auth');
const { AttendanceRecord } = require('../models');

/**
 * GET /api/qr/generate - generate a QR code JWT for today's service (admin/leader generates this
 * and displays at the church entrance; members scan it, which hits /api/qr/checkin).
 * The token encodes the service date and expires after 8 hours.
 */
router.get('/generate', authenticateToken, requireMinRole('leader'), (req, res) => {
  const serviceDate = new Date().toISOString().slice(0, 10);
  const token = jwt.sign(
    { serviceDate, purpose: 'attendance_checkin' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  // Frontend renders this token as a QR code using a JS QR library (e.g. qrcode.js)
  const checkInUrl = `${process.env.CLIENT_URL || ''}/qr-checkin.html?token=${token}`;
  res.json({ success: true, token, checkInUrl, serviceDate });
});

/**
 * POST /api/qr/checkin - member lands here after scanning the QR code while logged in.
 * Validates the QR token then records attendance.
 */
router.post('/checkin', authenticateToken, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'QR token is required' });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid or expired QR code. Ask the usher for a fresh one.' });
    }

    if (payload.purpose !== 'attendance_checkin')
      return res.status(400).json({ success: false, message: 'Invalid QR code type' });

    const [record, created] = await AttendanceRecord.findOrCreate({
      where: { userId: req.user.id, serviceDate: payload.serviceDate },
      defaults: { checkedInVia: 'qr' },
    });

    res.json({
      success: true,
      data: record,
      message: created
        ? `Welcome, ${req.user.firstName}! Attendance recorded for ${payload.serviceDate}.`
        : `You already checked in for ${payload.serviceDate}.`,
    });
  } catch (err) { next(err); }
});

module.exports = router;
