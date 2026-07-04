const { app, request, createUser } = require('./helpers');

describe('Audit logging', () => {
  test('editing a member creates a before/after audit entry with no leaked secrets', async () => {
    const pastor = await createUser({ prefix: 'auditpastor', roleTitle: 'senior_pastor' });
    const target = await createUser({ prefix: 'audittarget' });

    const edit = await request(app).put(`/api/members/${target.id}`)
      .set('Authorization', `Bearer ${pastor.token}`).send({ membershipStatus: 'inactive' });
    expect(edit.status).toBe(200);

    const history = await request(app).get(`/api/audit-logs/entity/User/${target.id}`)
      .set('Authorization', `Bearer ${pastor.token}`);
    expect(history.status).toBe(200);
    expect(history.body.total).toBeGreaterThanOrEqual(1);
    const entry = history.body.data[0];
    expect(entry.action).toBe('member.update');
    expect(entry.after.membershipStatus).toBe('inactive');
    expect(entry.before).not.toHaveProperty('passwordHash');
    expect(entry.after).not.toHaveProperty('passwordHash');
  });

  test('deleting a member creates an audit entry', async () => {
    const pastor = await createUser({ prefix: 'auditpastor2', roleTitle: 'senior_pastor' });
    const target = await createUser({ prefix: 'audittarget2' });

    const del = await request(app).delete(`/api/members/${target.id}`).set('Authorization', `Bearer ${pastor.token}`);
    expect(del.status).toBe(200);

    const history = await request(app).get(`/api/audit-logs/entity/User/${target.id}`)
      .set('Authorization', `Bearer ${pastor.token}`);
    expect(history.body.data[0].action).toBe('member.delete');
  });

  test('a plain member cannot view the audit log', async () => {
    const member = await createUser({ prefix: 'auditmember' });
    const res = await request(app).get('/api/audit-logs').set('Authorization', `Bearer ${member.token}`);
    expect(res.status).toBe(403);
  });
});
