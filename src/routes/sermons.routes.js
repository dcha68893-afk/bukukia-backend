const router = require('express').Router();
const buildCrudRouter = require('../utils/crudFactory');
const { Sermon } = require('../models');
const { PERMISSIONS } = require('../config/permissions');

const base = buildCrudRouter({
  Model: Sermon,
  router,
  publishedFilter: { isPublished: true },
  searchFields: ['title', 'preacher', 'topic', 'series', 'bibleReferences'],
  editRoles: ['pastor', 'admin', 'super_admin'],
  // Tier 'admin'/'pastor' is shared by roles that shouldn't manage sermons
  // (finance_manager, accountant, treasurer, church_secretary are all tier
  // 'admin'). Any pastor-tier roleTitle already carries UPLOAD_SERMONS/
  // MANAGE_SERMONS in its permission set (see config/permissions.js), so
  // this only narrows the shared 'admin' tier, it doesn't restrict pastors.
  createPermission: PERMISSIONS.UPLOAD_SERMONS,
  editPermission: PERMISSIONS.MANAGE_SERMONS,
  deletePermission: PERMISSIONS.MANAGE_SERMONS,
});

// Track downloads/views
router.post('/:id/view', async (req, res, next) => {
  try {
    const sermon = await Sermon.findByPk(req.params.id);
    if (!sermon) return res.status(404).json({ success: false, message: 'Not found' });
    sermon.viewCount += 1;
    await sermon.save();
    res.json({ success: true, viewCount: sermon.viewCount });
  } catch (err) { next(err); }
});

router.post('/:id/download', async (req, res, next) => {
  try {
    const sermon = await Sermon.findByPk(req.params.id);
    if (!sermon) return res.status(404).json({ success: false, message: 'Not found' });
    sermon.downloadCount += 1;
    await sermon.save();
    res.json({ success: true, downloadCount: sermon.downloadCount, audioUrl: sermon.audioUrl, videoUrl: sermon.videoUrl });
  } catch (err) { next(err); }
});

module.exports = base;
