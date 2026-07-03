require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const { User, Ministry, Announcement, Pastor, BibleVerse, CellGroup, WorkflowTemplate } = require('../models');

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('Database ready. Running seed...');

    // ---- Super Admin ----
    const adminEmail = 'admin@gwikongepefa.org';
    if (!await User.findOne({ where: { email: adminEmail } })) {
      await User.create({
        firstName: 'Church', lastName: 'Admin', email: adminEmail,
        passwordHash: await bcrypt.hash('ChangeMe123!', 12),
        role: 'super_admin', membershipStatus: 'active',
      });
      console.log(`Super admin created: ${adminEmail} / ChangeMe123!  ← CHANGE THIS IMMEDIATELY`);
    }

    // ---- Seed Pastor account ----
    const pastorEmail = 'pastor@gwikongepefa.org';
    if (!await User.findOne({ where: { email: pastorEmail } })) {
      await User.create({
        firstName: 'Senior', lastName: 'Pastor', email: pastorEmail,
        passwordHash: await bcrypt.hash('PastorPass123!', 12),
        role: 'pastor', membershipStatus: 'active',
      });
      console.log(`Pastor account created: ${pastorEmail} / PastorPass123!  ← CHANGE THIS IMMEDIATELY`);
    }

    // ---- Seed granular-role accounts (demonstrates the permission matrix
    // in config/permissions.js — safe to delete once real staff accounts
    // are created via the admin panel) ----
    const granularSeeds = [
      { email: 'finance@gwikongepefa.org', firstName: 'Finance', lastName: 'Manager', roleTitle: 'finance_manager', password: 'FinancePass123!' },
      { email: 'media@gwikongepefa.org', firstName: 'Media', lastName: 'Director', roleTitle: 'media_director', password: 'MediaPass123!' },
    ];
    for (const s of granularSeeds) {
      if (!await User.findOne({ where: { email: s.email } })) {
        await User.create({
          firstName: s.firstName, lastName: s.lastName, email: s.email,
          passwordHash: await bcrypt.hash(s.password, 12),
          roleTitle: s.roleTitle, membershipStatus: 'active',
        });
        console.log(`${s.roleTitle} account created: ${s.email} / ${s.password}  ← CHANGE THIS IMMEDIATELY`);
      }
    }

    // ---- Ministries ----
    if (await Ministry.count() === 0) {
      await Ministry.bulkCreate([
        { name: "Children's Ministry", slug: 'children', description: 'Nurturing the faith of our youngest members.', meetingSchedule: 'Sundays, 9:00 AM' },
        { name: 'Youth Ministry', slug: 'youth', description: 'Empowering the next generation in Christ.', meetingSchedule: 'Fridays, 5:00 PM' },
        { name: "Women's Ministry", slug: 'women', description: 'Fellowship and growth for women of faith.', meetingSchedule: 'Saturdays, 10:00 AM' },
        { name: "Men's Ministry", slug: 'men', description: 'Building godly men of integrity.', meetingSchedule: 'Saturdays, 7:00 AM' },
        { name: 'Worship Ministry', slug: 'worship', description: 'Leading the congregation in praise and worship.', meetingSchedule: 'Wednesdays, 6:00 PM' },
        { name: 'Missions', slug: 'missions', description: 'Spreading the Gospel locally and abroad.', meetingSchedule: 'Monthly — first Sunday' },
        { name: 'Prayer Ministry', slug: 'prayer', description: 'Interceding for the church and community.', meetingSchedule: 'Daily 6:00 AM · Wednesdays 6:00 PM' },
        { name: 'Media Ministry', slug: 'media', description: 'Telling our story through media and technology.', meetingSchedule: 'Sundays, 8:00 AM' },
        { name: 'Small Groups', slug: 'small-groups', description: 'Growing together in close-knit fellowship.', meetingSchedule: 'Varies by group' },
      ]);
      console.log('Ministries seeded.');
    }

    // ---- Workflow templates ----
    // Straight from the spec doc's example: Member requests → Secretary
    // receives → Pastor approves → Class scheduled → Attendance recorded →
    // Certificate generated → Member status updated. The last two steps
    // ("certificate generated" / "member status updated") are collapsed
    // into the template's completionEffect (set_baptism_date), since a
    // literal PDF certificate is a separate feature (see the 'pdf' skill /
    // library documents) — this wires up the approval CHAIN itself.
    if (!await WorkflowTemplate.findOne({ where: { key: 'baptism_request' } })) {
      await WorkflowTemplate.create({
        key: 'baptism_request',
        name: 'Baptism Request',
        description: 'A member requests baptism; the secretary logs it, a pastor approves, and a class is scheduled before it completes.',
        steps: [
          { name: 'Secretary receives request', permission: 'view_members', minRole: 'admin' },
          { name: 'Pastor approves', minRole: 'pastor' },
          { name: 'Class scheduled & attendance recorded', minRole: 'pastor' },
        ],
        completionEffect: 'set_baptism_date',
      });
      console.log('Baptism Request workflow template seeded.');
    }

    // ---- Leadership team ----
    if (await Pastor.count() === 0) {
      await Pastor.bulkCreate([
        { fullName: 'Rev. John Mwangi', title: 'Senior Pastor', bio: 'Rev. Mwangi has served Gwikonge PEFA Church for over 15 years. His passion is discipleship and community transformation.', displayOrder: 1 },
        { fullName: 'Pastor Jane Otieno', title: 'Associate Pastor', bio: 'Pastor Jane leads our Women\'s Ministry and counselling services.', displayOrder: 2 },
        { fullName: 'Elder David Ochieng', title: 'Elder', bio: 'Elder David has been a pillar of our church since its founding.', displayOrder: 3 },
      ]);
      console.log('Leadership team seeded.');
    }

    // ---- Bible verses ----
    if (await BibleVerse.count() === 0) {
      await BibleVerse.bulkCreate([
        { reference: 'Jeremiah 29:11', text: 'For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.', translation: 'NIV' },
        { reference: 'John 3:16', text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.', translation: 'NIV' },
        { reference: 'Philippians 4:13', text: 'I can do all this through him who gives me strength.', translation: 'NIV' },
        { reference: 'Romans 8:28', text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.', translation: 'NIV' },
        { reference: 'Proverbs 3:5-6', text: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.', translation: 'NIV' },
        { reference: 'Psalm 23:1', text: 'The LORD is my shepherd, I lack nothing.', translation: 'NIV' },
        { reference: 'Isaiah 40:31', text: 'But those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.', translation: 'NIV' },
      ]);
      console.log('Bible verses seeded.');
    }

    // ---- Cell groups ----
    if (await CellGroup.count() === 0) {
      await CellGroup.bulkCreate([
        { name: 'Gwikonge Central', area: 'Gwikonge Town', leaderName: 'Elder Peter', meetingDay: 'Thursday', meetingTime: '6:00 PM', venue: 'Elder Peter\'s Home' },
        { name: 'Northside Fellowship', area: 'North Gwikonge', leaderName: 'Sister Mary', meetingDay: 'Wednesday', meetingTime: '5:30 PM', venue: 'Community Hall Room 3' },
      ]);
      console.log('Cell groups seeded.');
    }

    // ---- Announcement ----
    if (await Announcement.count() === 0) {
      await Announcement.create({
        title: 'Welcome to Gwikonge PEFA Church Online!',
        content: 'We are delighted to launch our new church management system. You can now register as a member, submit prayer requests, give online, watch live services, and much more. God bless you!',
        type: 'news', isPinned: true,
      });
      console.log('Welcome announcement seeded.');
    }

    console.log('\n✅ Seed complete! Visit /api/health to confirm the API is running.');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
