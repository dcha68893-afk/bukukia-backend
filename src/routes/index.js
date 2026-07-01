const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/ministries', require('./ministries.routes'));
router.use('/sermons', require('./sermons.routes'));
router.use('/events', require('./events.routes'));
router.use('/announcements', require('./announcements.routes'));
router.use('/prayer-requests', require('./prayer.routes'));
router.use('/donations', require('./donations.routes'));
router.use('/testimonials', require('./testimonials.routes'));
router.use('/gallery', require('./gallery.routes'));
router.use('/contact', require('./contact.routes'));
router.use('/volunteers', require('./volunteers.routes'));
router.use('/newsletter', require('./newsletter.routes'));
router.use('/blog', require('./blog.routes'));
router.use('/livestreams', require('./livestream.routes'));
router.use('/members', require('./members.routes'));
router.use('/attendance', require('./attendance.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/upload', require('./upload.routes'));

module.exports = router;
