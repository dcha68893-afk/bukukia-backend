const router = require('express').Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Newsletter } = require('../models');

router.post('/subscribe', async (req, res, next) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const [entry, created] = await Newsletter.findOrCreate({ where: { email }, defaults: { name } });
    if (!created && !entry.isActive) {
      entry.isActive = true;
      await entry.save();
    }
    res.status(201).json({ success: true, message: 'Subscribed successfully', data: entry });
  } catch (err) { next(err); }
});

router.post('/unsubscribe', async (req, res, next) => {
  try {
    const { email } = req.body;
    const entry = await Newsletter.findOne({ where: { email } });
    if (entry) {
      entry.isActive = false;
      await entry.save();
    }
    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (err) { next(err); }
});

router.get('/', authenticateToken, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const subs = await Newsletter.findAll({ where: { isActive: true }, order: [['createdAt', 'DESC']] });
    res.json({ success: true, total: subs.length, data: subs });
  } catch (err) { next(err); }
});

module.exports = router;
