const request = require('supertest');
const buildApp = require('../src/app');

const app = buildApp();

let counter = 0;
function uniqueEmail(prefix) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@fixture.local`;
}

async function login(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

async function loginAsSuperAdmin() {
  return login('test-superadmin@fixture.local', 'TestPass123!');
}

// Registers a fresh member with a unique email, optionally promotes them to
// a specific granular roleTitle (via the super_admin fixture account), and
// returns both their token and id — the same "register, then assign a job
// title" flow the real admin panel uses.
async function createUser({ prefix = 'user', roleTitle = null, ministryId = null } = {}) {
  const email = uniqueEmail(prefix);
  const password = 'TestPass123!';
  const reg = await request(app).post('/api/auth/register').send({
    firstName: 'Test', lastName: prefix, email, password,
  });
  if (reg.status !== 201) throw new Error(`Register failed for ${email}: ${JSON.stringify(reg.body)}`);
  const id = reg.body.user.id;

  if (roleTitle || ministryId) {
    const adminToken = await loginAsSuperAdmin();
    const patch = {};
    if (roleTitle) patch.roleTitle = roleTitle;
    if (ministryId) patch.ministryId = ministryId;
    const res = await request(app).put(`/api/members/${id}`)
      .set('Authorization', `Bearer ${adminToken}`).send(patch);
    if (res.status !== 200) throw new Error(`Failed to set roleTitle for ${email}: ${JSON.stringify(res.body)}`);
  }

  const token = await login(email, password);
  return { id, email, password, token };
}

module.exports = { app, request, uniqueEmail, login, loginAsSuperAdmin, createUser };

// Each test file gets its own fresh require of src/app.js (and therefore its
// own Sequelize connection pool, since Jest resets the module registry per
// test file). Registering this here — rather than trying to remember the
// exact global Jest lifecycle config key — means every file that does
// `require('./helpers')` automatically gets its pool closed when that
// file's tests finish, without needing to duplicate this in every file.
afterAll(async () => {
  const sequelize = require('../src/config/db');
  await sequelize.close();
});
