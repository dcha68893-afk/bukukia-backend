const router = require('express').Router();
const { authenticateToken, requireMinRole, optionalAuth } = require('../middleware/auth');
const { LibraryDocument } = require('../models');

// GET /api/library - public docs + members-only docs if logged in
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const where = req.user ? {} : { isPublic: true };
    const docs = await LibraryDocument.findAll({ where, order: [['category', 'ASC'], ['title', 'ASC']] });
    res.json({ success: true, data: docs });
  } catch (err) { next(err); }
});

// POST /api/library/:id/download - track download count
router.post('/:id/download', optionalAuth, async (req, res, next) => {
  try {
    const doc = await LibraryDocument.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    if (!doc.isPublic && !req.user)
      return res.status(401).json({ success: false, message: 'Login required to access this document' });
    doc.downloadCount += 1;
    await doc.save();
    res.json({ success: true, fileUrl: doc.fileUrl, title: doc.title });
  } catch (err) { next(err); }
});

router.post('/', authenticateToken, requireMinRole('pastor'), async (req, res, next) => {
  try {
    const doc = await LibraryDocument.create(req.body);
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
});

router.put('/:id', authenticateToken, requireMinRole('pastor'), async (req, res, next) => {
  try {
    const doc = await LibraryDocument.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    await doc.update(req.body);
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticateToken, requireMinRole('admin'), async (req, res, next) => {
  try {
    const doc = await LibraryDocument.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    await doc.destroy();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
