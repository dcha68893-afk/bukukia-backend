const router = require('express').Router();
const buildCrudRouter = require('../utils/crudFactory');
const { Sermon } = require('../models');

const base = buildCrudRouter({
  Model: Sermon,
  router,
  publishedFilter: { isPublished: true },
  searchFields: ['title', 'preacher', 'topic', 'series', 'bibleReferences'],
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
