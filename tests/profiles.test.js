const { app, request, createUser, loginAsSuperAdmin } = require('./helpers');

describe('Member profile depth (spec item 4)', () => {
  test('staff can view the aggregated member profile (attendance/giving/volunteering)', async () => {
    const pastor = await createUser({ prefix: 'profilepastor', roleTitle: 'senior_pastor' });
    const member = await createUser({ prefix: 'profiletarget' });

    const res = await request(app).get(`/api/members/${member.id}/profile`).set('Authorization', `Bearer ${pastor.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('attendance');
    expect(res.body.data).toHaveProperty('giving');
    expect(res.body.data).toHaveProperty('volunteering');
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  test('a plain member cannot view another member\'s aggregated profile', async () => {
    const member = await createUser({ prefix: 'profilemember' });
    const target = await createUser({ prefix: 'profiletarget2' });
    const res = await request(app).get(`/api/members/${target.id}/profile`).set('Authorization', `Bearer ${member.token}`);
    expect(res.status).toBe(403);
  });
});

describe('Leader profile depth (spec item 3)', () => {
  let superAdminToken;
  let pastorRecordId;

  beforeAll(async () => {
    superAdminToken = await loginAsSuperAdmin();
    const create = await request(app).post('/api/leadership')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ fullName: 'Test Leader', title: 'Youth Director', servingSince: '2020-01-01' });
    expect(create.status).toBe(201);
    pastorRecordId = create.body.data.id;
  });

  test('yearsServing is computed from servingSince, not stored redundantly', async () => {
    const res = await request(app).get(`/api/leadership/${pastorRecordId}/profile`);
    expect(res.status).toBe(200);
    expect(typeof res.body.data.yearsServing).toBe('number');
    expect(res.body.data.yearsServing).toBeGreaterThanOrEqual(5); // 2020 -> now
  });

  test('a leader who does not accept appointments rejects a booking request', async () => {
    const res = await request(app).post('/api/bookings')
      .send({ type: 'counseling', fullName: 'Requester', pastorId: pastorRecordId });
    expect(res.status).toBe(400);
  });

  test('enabling acceptsAppointments allows booking, and the public profile count updates', async () => {
    await request(app).put(`/api/leadership/${pastorRecordId}`)
      .set('Authorization', `Bearer ${superAdminToken}`).send({ acceptsAppointments: true });

    const before = await request(app).get(`/api/leadership/${pastorRecordId}/profile`);
    expect(before.body.data.upcomingAppointments).toBe(0);

    const book = await request(app).post('/api/bookings')
      .send({ type: 'counseling', fullName: 'Requester2', pastorId: pastorRecordId });
    expect(book.status).toBe(201);
    expect(book.body.data.assignedTo).toBe('Test Leader'); // synced from the linked Pastor record

    const after = await request(app).get(`/api/leadership/${pastorRecordId}/profile`);
    expect(after.body.data.upcomingAppointments).toBe(1);
  });
});
