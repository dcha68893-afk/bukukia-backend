const router = require('express').Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { contactRules, verifyCaptcha } = require('../middleware/validate');
const { ContactMessage } = require('../models');

router.post('/', verifyCaptcha, contactRules, async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
    }
    const entry = await ContactMessage.create({ name, email, phone, subject, message });
    res.status(201).json({ success: true, data: entry, message: 'Thank you, we will get back to you soon.' });
  } catch (err) { next(err); }
});

router.get('/', authenticateToken, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const items = await ContactMessage.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

router.put('/:id/read', authenticateToken, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const item = await ContactMessage.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    item.isRead = true;
    await item.save();
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticateToken, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const item = await ContactMessage.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    await item.destroy();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
