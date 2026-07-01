const router = require('express').Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  User, Sermon, Event, Donation, PrayerRequest, ContactMessage, Volunteer, Newsletter,
} = require('../models');

// Admin dashboard summary stats
router.get('/stats', authenticateToken, requireRole('admin', 'super_admin', 'pastor', 'leader'), async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const [
      totalMembers, totalSermons, upcomingEvents, pendingPrayers,
      unreadMessages, pendingVolunteers, newsletterSubs, donationStats,
    ] = await Promise.all([
      User.count(),
      Sermon.count({ where: { isPublished: true } }),
      Event.count({ where: { startDate: { [Op.gte]: new Date() }, isPublished: true } }),
      PrayerRequest.count({ where: { status: 'new' } }),
      ContactMessage.count({ where: { isRead: false } }),
      Volunteer.count({ where: { status: 'pending' } }),
      Newsletter.count({ where: { isActive: true } }),
      Donation.findAll({ where: { status: 'completed' } }),
    ]);

    const totalGiving = donationStats.reduce((sum, d) => sum + Number(d.amount), 0);
    const thisMonth = donationStats.filter((d) => {
      const now = new Date();
      const created = new Date(d.createdAt);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).reduce((sum, d) => sum + Number(d.amount), 0);

    res.json({
      success: true,
      data: {
        totalMembers, totalSermons, upcomingEvents, pendingPrayers,
        unreadMessages, pendingVolunteers, newsletterSubs,
        totalGiving, givingThisMonth: thisMonth,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
