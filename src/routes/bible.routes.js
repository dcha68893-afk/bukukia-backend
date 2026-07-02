const router = require('express').Router();
const buildCrudRouter = require('../utils/crudFactory');
const { BibleVerse } = require('../models');

// GET /api/bible/today  - deterministic daily verse (changes each day, same for all visitors)
router.get('/today', async (req, res, next) => {
  try {
    const verses = await BibleVerse.findAll({ where: { isActive: true } });
    if (!verses.length) {
      // Fallback hardcoded verse if admin hasn't added any yet
      return res.json({
        success: true,
        data: {
          reference: 'Jeremiah 29:11',
          text: 'For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.',
          translation: 'NIV',
        },
      });
    }
    // Pick verse deterministically by day of year so it's consistent across all users
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const verse = verses[dayOfYear % verses.length];
    res.json({ success: true, data: verse });
  } catch (err) { next(err); }
});

// GET /api/bible/verses  - list all verses (admin can manage)
// POST / PUT / DELETE - inherit from CRUD factory below, admin-only
buildCrudRouter({
  Model: BibleVerse,
  router,
  publishedFilter: { isActive: true },
  editRoles: ['pastor', 'admin', 'super_admin'],
});

module.exports = router;
