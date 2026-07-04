const { app, request, createUser, loginAsSuperAdmin } = require('./helpers');

describe('Workflow engine (baptism request example)', () => {
  let templateId;
  let superAdminToken;

  beforeAll(async () => {
    superAdminToken = await loginAsSuperAdmin();
    const res = await request(app).post('/api/workflow-templates')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        key: 'baptism_request_test',
        name: 'Baptism Request (test)',
        steps: [
          { name: 'Secretary receives request', permission: 'view_members', minRole: 'admin' },
          { name: 'Pastor approves', minRole: 'pastor' },
        ],
        completionEffect: 'set_baptism_date',
      });
    expect(res.status).toBe(201);
    templateId = res.body.data.id;
  });

  test('member submits a request, cannot approve their own request, staff advance it to completion', async () => {
    const member = await createUser({ prefix: 'baptismreq' });
    const secretary = await createUser({ prefix: 'secretary', roleTitle: 'church_secretary' });
    const pastor = await createUser({ prefix: 'pastorwf', roleTitle: 'senior_pastor' });

    const submit = await request(app).post('/api/workflow-requests')
      .set('Authorization', `Bearer ${member.token}`).send({ templateId });
    expect(submit.status).toBe(201);
    expect(submit.body.data.currentStep).toBe(0);
    const requestId = submit.body.data.id;

    const selfApprove = await request(app).post(`/api/workflow-requests/${requestId}/advance`)
      .set('Authorization', `Bearer ${member.token}`).send({ decision: 'approved' });
    expect(selfApprove.status).toBe(403);

    const step1 = await request(app).post(`/api/workflow-requests/${requestId}/advance`)
      .set('Authorization', `Bearer ${secretary.token}`).send({ decision: 'approved' });
    expect(step1.status).toBe(200);
    expect(step1.body.data.currentStep).toBe(1);
    expect(step1.body.data.status).toBe('in_progress');

    const step2 = await request(app).post(`/api/workflow-requests/${requestId}/advance`)
      .set('Authorization', `Bearer ${pastor.token}`).send({ decision: 'approved' });
    expect(step2.status).toBe(200);
    expect(step2.body.data.status).toBe('completed');

    // completionEffect: set_baptism_date should have stamped the member's record
    const memberRecord = await request(app).get(`/api/members/${member.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(memberRecord.body.data.baptismDate).toBeTruthy();
  });

  test('rejection stops the workflow', async () => {
    const member = await createUser({ prefix: 'baptismreq2' });
    const secretary = await createUser({ prefix: 'secretary2', roleTitle: 'church_secretary' });

    const submit = await request(app).post('/api/workflow-requests')
      .set('Authorization', `Bearer ${member.token}`).send({ templateId });
    const requestId = submit.body.data.id;

    const reject = await request(app).post(`/api/workflow-requests/${requestId}/advance`)
      .set('Authorization', `Bearer ${secretary.token}`).send({ decision: 'rejected', notes: 'Not ready yet' });
    expect(reject.status).toBe(200);
    expect(reject.body.data.status).toBe('rejected');

    // Rejected requests can't be advanced further
    const furtherAttempt = await request(app).post(`/api/workflow-requests/${requestId}/advance`)
      .set('Authorization', `Bearer ${secretary.token}`).send({ decision: 'approved' });
    expect(furtherAttempt.status).toBe(400);
  });

  test('tier alone is not enough — a role missing the step permission is blocked even at the right tier', async () => {
    const member = await createUser({ prefix: 'baptismreq3' });
    // finance_manager is tier 'admin' (same as church_secretary) but lacks
    // view_members, which step 1 requires.
    const finance = await createUser({ prefix: 'financewf', roleTitle: 'finance_manager' });

    const submit = await request(app).post('/api/workflow-requests')
      .set('Authorization', `Bearer ${member.token}`).send({ templateId });
    const requestId = submit.body.data.id;

    const attempt = await request(app).post(`/api/workflow-requests/${requestId}/advance`)
      .set('Authorization', `Bearer ${finance.token}`).send({ decision: 'approved' });
    expect(attempt.status).toBe(403);
  });
});
