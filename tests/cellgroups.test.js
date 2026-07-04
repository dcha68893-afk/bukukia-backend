const { app, request, createUser, loginAsSuperAdmin } = require('./helpers');

describe('Cell groups: own-group scoping (spec item 5)', () => {
  let superAdminToken, leaderA, leaderB, groupAId, groupBId;

  beforeAll(async () => {
    superAdminToken = await loginAsSuperAdmin();
    leaderA = await createUser({ prefix: 'cgleaderA', roleTitle: 'cell_group_leader' });
    leaderB = await createUser({ prefix: 'cgleaderB', roleTitle: 'cell_group_leader' });

    const gA = await request(app).post('/api/cell-groups')
      .set('Authorization', `Bearer ${superAdminToken}`).send({ name: 'Group A', leaderId: leaderA.id });
    groupAId = gA.body.data.id;

    const gB = await request(app).post('/api/cell-groups')
      .set('Authorization', `Bearer ${superAdminToken}`).send({ name: 'Group B', leaderId: leaderB.id });
    groupBId = gB.body.data.id;
  });

  test('a leader cannot edit a DIFFERENT cell group than their own', async () => {
    const res = await request(app).put(`/api/cell-groups/${groupBId}`)
      .set('Authorization', `Bearer ${leaderA.token}`).send({ venue: 'Hijacked' });
    expect(res.status).toBe(403);
  });

  test('a leader CAN edit their own cell group', async () => {
    const res = await request(app).put(`/api/cell-groups/${groupAId}`)
      .set('Authorization', `Bearer ${leaderA.token}`).send({ venue: 'Community Hall' });
    expect(res.status).toBe(200);
  });

  test('a leader cannot view a different group\'s member roster', async () => {
    const res = await request(app).get(`/api/cell-groups/${groupBId}/members`)
      .set('Authorization', `Bearer ${leaderA.token}`);
    expect(res.status).toBe(403);
  });

  test('a leader can submit a weekly report for their own group only', async () => {
    const ownReport = await request(app).post(`/api/cell-groups/${groupAId}/reports`)
      .set('Authorization', `Bearer ${leaderA.token}`)
      .send({ meetingDate: '2026-06-28', attendanceCount: 12, bibleStudyTopic: 'Fruit of the Spirit' });
    expect(ownReport.status).toBe(200);

    const otherReport = await request(app).post(`/api/cell-groups/${groupBId}/reports`)
      .set('Authorization', `Bearer ${leaderA.token}`)
      .send({ meetingDate: '2026-06-28', attendanceCount: 99 });
    expect(otherReport.status).toBe(403);
  });

  test('growth chart reflects submitted reports', async () => {
    const res = await request(app).get(`/api/cell-groups/${groupAId}/growth`)
      .set('Authorization', `Bearer ${leaderA.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.attendanceTrend.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.attendanceTrend[0].attendance).toBe(12);
  });

  test('pastor-tier+ retains oversight of every group, not just their own', async () => {
    const res = await request(app).get(`/api/cell-groups/${groupBId}/reports`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
  });
});
