// Runs ONCE, in its own process, before any test file starts. Resets the
// schema to a known clean state so every test run starts from zero — no
// leftover data from a previous run causing flaky unique-constraint
// collisions.
//
// SAFETY: force:true DROPS every table. This refuses to run unless
// DATABASE_URL clearly points at a test database, so a mistake in .env
// can't wipe a real church's data by running `npm test`.
require('dotenv').config();
const bcrypt = require('bcryptjs');

module.exports = async () => {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!/test/i.test(dbUrl)) {
    throw new Error(
      `Refusing to run tests: DATABASE_URL ("${dbUrl.replace(/:[^:@]+@/, ':***@')}") ` +
      `doesn't look like a test database (expected "test" somewhere in the name). ` +
      `Tests DROP and recreate every table — point DATABASE_URL at a dedicated test DB, ` +
      `e.g. postgres://user:pass@host:5432/church_test`
    );
  }

  const sequelize = require('../src/config/db');
  require('../src/models');
  await sequelize.sync({ force: true });

  // One fixed super_admin, used across test files to bootstrap other
  // accounts (assigning roleTitles, etc). Individual tests create their own
  // throwaway members with unique emails rather than relying on more seed data.
  const { User } = require('../src/models');
  await User.create({
    firstName: 'Test', lastName: 'SuperAdmin', email: 'test-superadmin@fixture.local',
    passwordHash: await bcrypt.hash('TestPass123!', 10),
    role: 'super_admin', membershipStatus: 'active',
  });

  await sequelize.close();
};
