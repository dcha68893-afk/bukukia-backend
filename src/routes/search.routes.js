const router = require('express').Router();
const { Op } = require('sequelize');
const { Sermon, Event, BlogPost, Ministry, Announcement, Testimonial } = require('../models');

/**
 * GET /api/search?q=keyword&limit=5
 * Unified search across sermons, events, blog posts, ministries, announcements.
 * Only returns publicly visible items.
 */
router.get('/', async (req, res, next) => {
  try {
    const { q, limit = 5 } = req.query;
    if (!q || q.trim().length < 2)
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });

    const term = q.trim();
    const like = { [Op.iLike]: `%${term}%` };
    const lim = Math.min(Number(limit), 20);

    const [sermons, events, posts, ministries, announcements] = await Promise.all([
      Sermon.findAll({ where: { isPublished: true, [Op.or]: [{ title: like }, { preacher: like }, { topic: like }, { bibleReferences: like }] }, limit: lim, attributes: ['id','title','preacher','sermonDate','topic'] }),
      Event.findAll({ where: { isPublished: true, [Op.or]: [{ title: like }, { description: like }] }, limit: lim, attributes: ['id','title','category','startDate','location'] }),
      BlogPost.findAll({ where: { isPublished: true, [Op.or]: [{ title: like }, { content: like }] }, limit: lim, attributes: ['id','title','category','slug','publishDate'] }),
      Ministry.findAll({ where: { isActive: true, [Op.or]: [{ name: like }, { description: like }] }, limit: lim, attributes: ['id','name','slug','description'] }),
      Announcement.findAll({ where: { isPublished: true, [Op.or]: [{ title: like }, { content: like }] }, limit: lim, attributes: ['id','title','type','publishDate'] }),
    ]);

    const total = sermons.length + events.length + posts.length + ministries.length + announcements.length;

    res.json({
      success: true,
      query: term,
      total,
      results: { sermons, events, posts, ministries, announcements },
    });
  } catch (err) { next(err); }
});

module.exports = router;
