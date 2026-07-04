const { app, request, createUser, loginAsSuperAdmin } = require('./helpers');

describe('Soft deletes (member removal is recoverable)', () => {
  test('a deleted member disappears from the directory and cannot log in, but can be restored', async () => {
    const pastor = await createUser({ prefix: 'softpastor', roleTitle: 'senior_pastor' });
    const target = await createUser({ prefix: 'softtarget' });

    const del = await request(app).delete(`/api/members/${target.id}`).set('Authorization', `Bearer ${pastor.token}`);
    expect(del.status).toBe(200);

    const loginAttempt = await request(app).post('/api/auth/login').send({ email: target.email, password: target.password });
    expect(loginAttempt.status).toBe(401);

    const reregister = await request(app).post('/api/auth/register')
      .send({ firstName: 'New', lastName: 'Person', email: target.email, password: 'TestPass123!' });
    expect(reregister.status).toBe(409);
    expect(reregister.body.message).toMatch(/previously associated with a removed account/);

    const superAdminToken = await loginAsSuperAdmin();
    const restore = await request(app).post(`/api/members/${target.id}/restore`).set('Authorization', `Bearer ${superAdminToken}`);
    expect(restore.status).toBe(200);

    const loginAfterRestore = await request(app).post('/api/auth/login').send({ email: target.email, password: target.password });
    expect(loginAfterRestore.status).toBe(200);
  });

  test('only super_admin can restore, not senior_pastor', async () => {
    const pastor = await createUser({ prefix: 'restorepastor', roleTitle: 'senior_pastor' });
    const target = await createUser({ prefix: 'restoretarget' });
    await request(app).delete(`/api/members/${target.id}`).set('Authorization', `Bearer ${pastor.token}`);

    const attempt = await request(app).post(`/api/members/${target.id}/restore`).set('Authorization', `Bearer ${pastor.token}`);
    expect(attempt.status).toBe(403);
  });

  test('GET /api/members/deleted is super_admin only', async () => {
    const pastor = await createUser({ prefix: 'listpastor', roleTitle: 'senior_pastor' });
    const res = await request(app).get('/api/members/deleted').set('Authorization', `Bearer ${pastor.token}`);
    expect(res.status).toBe(403);
  });
});
