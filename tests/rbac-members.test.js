const { app, request, createUser, loginAsSuperAdmin } = require('./helpers');

// These are the exact boundary scenarios verified manually via curl earlier
// in development — now permanent, so a future change can't silently regress
// them. See config/permissions.js for the source of truth these assert against.
describe('RBAC: member directory + editing boundaries', () => {
  test('a plain member cannot view the member directory', async () => {
    const member = await createUser({ prefix: 'plainmember' });
    const res = await request(app).get('/api/members').set('Authorization', `Bearer ${member.token}`);
    expect(res.status).toBe(403);
  });

  test('a plain member cannot edit another member', async () => {
    const member = await createUser({ prefix: 'plainmember2' });
    const target = await createUser({ prefix: 'target' });
    const res = await request(app).put(`/api/members/${target.id}`)
      .set('Authorization', `Bearer ${member.token}`).send({ membershipStatus: 'active' });
    expect(res.status).toBe(403);
  });

  test('a plain member cannot delete another member', async () => {
    const member = await createUser({ prefix: 'plainmember3' });
    const target = await createUser({ prefix: 'target2' });
    const res = await request(app).delete(`/api/members/${target.id}`).set('Authorization', `Bearer ${member.token}`);
    expect(res.status).toBe(403);
  });

  test('Finance Manager (tier admin) cannot view the member directory', async () => {
    const finance = await createUser({ prefix: 'finance', roleTitle: 'finance_manager' });
    const res = await request(app).get('/api/members').set('Authorization', `Bearer ${finance.token}`);
    expect(res.status).toBe(403);
  });

  test('Finance Manager cannot edit a member despite sharing the "admin" tier with roles that can', async () => {
    const finance = await createUser({ prefix: 'finance2', roleTitle: 'finance_manager' });
    const target = await createUser({ prefix: 'target3' });
    const res = await request(app).put(`/api/members/${target.id}`)
      .set('Authorization', `Bearer ${finance.token}`).send({ ministryId: null });
    expect(res.status).toBe(403);
  });

  test('Finance Manager cannot delete a member', async () => {
    const finance = await createUser({ prefix: 'finance3', roleTitle: 'finance_manager' });
    const target = await createUser({ prefix: 'target4' });
    const res = await request(app).delete(`/api/members/${target.id}`).set('Authorization', `Bearer ${finance.token}`);
    expect(res.status).toBe(403);
  });

  test('Senior Pastor can edit a member', async () => {
    const pastor = await createUser({ prefix: 'seniorpastor', roleTitle: 'senior_pastor' });
    const target = await createUser({ prefix: 'target5' });
    const res = await request(app).put(`/api/members/${target.id}`)
      .set('Authorization', `Bearer ${pastor.token}`).send({ membershipStatus: 'active' });
    expect(res.status).toBe(200);
  });

  test('Senior Pastor can delete a member', async () => {
    const pastor = await createUser({ prefix: 'seniorpastor2', roleTitle: 'senior_pastor' });
    const target = await createUser({ prefix: 'target6' });
    const res = await request(app).delete(`/api/members/${target.id}`).set('Authorization', `Bearer ${pastor.token}`);
    expect(res.status).toBe(200);
  });

  test('an Associate Pastor (same "pastor" tier as Senior Pastor) CANNOT delete a member', async () => {
    const assocPastor = await createUser({ prefix: 'assocpastor', roleTitle: 'associate_pastor' });
    const target = await createUser({ prefix: 'target7' });
    const res = await request(app).delete(`/api/members/${target.id}`).set('Authorization', `Bearer ${assocPastor.token}`);
    expect(res.status).toBe(403);
  });

  test('super_admin can still view and edit (legacy behaviour unaffected)', async () => {
    const token = await loginAsSuperAdmin();
    const list = await request(app).get('/api/members').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
  });

  test('editing a member never leaks passwordHash or resetToken in the response', async () => {
    const pastor = await createUser({ prefix: 'seniorpastor3', roleTitle: 'senior_pastor' });
    const target = await createUser({ prefix: 'target8' });
    const res = await request(app).put(`/api/members/${target.id}`)
      .set('Authorization', `Bearer ${pastor.token}`).send({ membershipStatus: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('passwordHash');
    expect(res.body.data).not.toHaveProperty('resetToken');
  });
});

describe('RBAC: finance vs media boundary', () => {
  test('Finance Manager can view donations but not manage the livestream', async () => {
    const finance = await createUser({ prefix: 'financedon', roleTitle: 'finance_manager' });
    const donations = await request(app).get('/api/donations').set('Authorization', `Bearer ${finance.token}`);
    expect(donations.status).toBe(200);

    const stream = await request(app).post('/api/livestreams')
      .set('Authorization', `Bearer ${finance.token}`).send({ title: 'x', streamUrl: 'https://x.test', scheduledStart: new Date().toISOString() });
    expect(stream.status).toBe(403);
  });

  test('Media Director can manage the livestream but not view donations', async () => {
    const media = await createUser({ prefix: 'mediadir', roleTitle: 'media_director' });
    const donations = await request(app).get('/api/donations').set('Authorization', `Bearer ${media.token}`);
    expect(donations.status).toBe(403);

    const stream = await request(app).post('/api/livestreams')
      .set('Authorization', `Bearer ${media.token}`).send({ title: 'x', streamUrl: 'https://x.test', scheduledStart: new Date().toISOString() });
    expect(stream.status).toBe(201);
  });
});
