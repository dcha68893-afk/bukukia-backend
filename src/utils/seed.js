require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const { User, Ministry, Sermon, Event, Announcement } = require('../models');

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    const adminEmail = 'admin@gwikongepefa.org';
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
      await User.create({
        firstName: 'Church', lastName: 'Admin', email: adminEmail,
        passwordHash, role: 'super_admin', membershipStatus: 'active',
      });
      console.log(`Created super admin: ${adminEmail} / ChangeMe123! (change this immediately)`);
    }

    const ministryCount = await Ministry.count();
    if (ministryCount === 0) {
      await Ministry.bulkCreate([
        { name: "Children's Ministry", slug: 'children', description: 'Nurturing the faith of our youngest members.', meetingSchedule: 'Sundays, 9:00 AM' },
        { name: 'Youth Ministry', slug: 'youth', description: 'Empowering the next generation in Christ.', meetingSchedule: 'Fridays, 5:00 PM' },
        { name: "Women's Ministry", slug: 'women', description: 'Fellowship and growth for women of faith.', meetingSchedule: 'Saturdays, 10:00 AM' },
        { name: "Men's Ministry", slug: 'men', description: 'Building godly men of integrity.', meetingSchedule: 'Saturdays, 7:00 AM' },
        { name: 'Worship Ministry', slug: 'worship', description: 'Leading the congregation in praise and worship.', meetingSchedule: 'Wednesdays, 6:00 PM' },
        { name: 'Missions', slug: 'missions', description: 'Spreading the Gospel locally and abroad.', meetingSchedule: 'Monthly' },
        { name: 'Prayer Ministry', slug: 'prayer', description: 'Interceding for the church and community.', meetingSchedule: 'Daily, 6:00 AM' },
        { name: 'Media Ministry', slug: 'media', description: 'Telling our story through media and technology.', meetingSchedule: 'Sundays, 8:00 AM' },
        { name: 'Small Groups', slug: 'small-groups', description: 'Growing together in close-knit fellowship.', meetingSchedule: 'Varies by group' },
      ]);
      console.log('Seeded ministries.');
    }

    const announcementCount = await Announcement.count();
    if (announcementCount === 0) {
      await Announcement.create({
        title: 'Welcome to our new website!',
        content: 'We are excited to launch our new church website. Explore sermons, events, ministries, and more.',
        type: 'news', isPinned: true,
      });
      console.log('Seeded a welcome announcement.');
    }

    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
