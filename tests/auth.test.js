const { app, request, uniqueEmail } = require('./helpers');

describe('Auth', () => {
  test('register + login succeeds for a new member', async () => {
    const email = uniqueEmail('authtest');
    const reg = await request(app).post('/api/auth/register').send({
      firstName: 'Auth', lastName: 'Test', email, password: 'TestPass123!',
    });
    expect(reg.status).toBe(201);
    expect(reg.body.user.role).toBe('member'); // new registrations default to plain member, never staff

    const login = await request(app).post('/api/auth/login').send({ email, password: 'TestPass123!' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
  });

  test('login fails with wrong password', async () => {
    const email = uniqueEmail('wrongpw');
    await request(app).post('/api/auth/register').send({ firstName: 'X', lastName: 'Y', email, password: 'TestPass123!' });
    const res = await request(app).post('/api/auth/login').send({ email, password: 'NotTheRightPassword!' });
    expect(res.status).toBe(401);
  });

  test('duplicate email registration is rejected', async () => {
    const email = uniqueEmail('dupe');
    const first = await request(app).post('/api/auth/register').send({ firstName: 'A', lastName: 'B', email, password: 'TestPass123!' });
    expect(first.status).toBe(201);
    const second = await request(app).post('/api/auth/register').send({ firstName: 'C', lastName: 'D', email, password: 'TestPass123!' });
    expect(second.status).toBeGreaterThanOrEqual(400);
  });

  test('protected route rejects requests with no token', async () => {
    const res = await request(app).get('/api/members');
    expect(res.status).toBe(401);
  });
});
