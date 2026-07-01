const router = require('express').Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Generic authenticated file upload (images, audio, video, pdf) for use across
// sermons, events, gallery, announcements, blog, profile photos, etc.
router.post('/', authenticateToken, requireRole('admin', 'super_admin', 'leader', 'pastor'), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.status(201).json({ success: true, url, filename: req.file.filename, mimetype: req.file.mimetype, size: req.file.size });
});

// Allow members to upload their own profile photo
router.post('/profile', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.status(201).json({ success: true, url });
});

module.exports = router;
