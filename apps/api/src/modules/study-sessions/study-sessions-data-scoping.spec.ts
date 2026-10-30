import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

const SESSION_KEYS = [
  'assignmentId',
  'createdAt',
  'durationMinutes',
  'elapsedSeconds',
  'endTime',
  'id',
  'notes',
  'plannedMinutes',
  'startTime',
  'status',
  'taskId',
  'updatedAt',
].sort();

describeIntegration('Study sessions data scoping (integration, real database)', () => {
  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  let studentA: { id: string; token: string };
  let studentB: { id: string; token: string };
  let aAssignmentId: string;
  const runId = uuidv4();

  async function registerAndLogin(label: string) {
    const email = `${label}.${runId}@studypilot-test.invalid`;
    const password = `S3cure-${runId}-sessions`;
    await agent
      .post('/auth/register')
      .send({ name: `Student ${label}`, email, password })
      .expect(HttpStatus.CREATED);
    const login = await agent.post('/auth/login').send({ email, password }).expect(HttpStatus.OK);
    return { id: login.body.user.id, token: login.body.accessToken };
  }

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());
    studentA = await registerAndLogin('a');
    studentB = await registerAndLogin('b');
    const a = await agent
      .post('/assignments')
      .set('Authorization', `Bearer ${studentA.token}`)
      .send({ title: 'A assignment' })
      .expect(HttpStatus.CREATED);
    aAssignmentId = a.body.id;
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    await app.prisma.user.deleteMany({
      where: { id: { in: [studentA?.id, studentB?.id].filter(Boolean) as string[] } },
    });
    await app.app.close();
  }, 60_000);

  it('start projection has exactly the 12 contract keys and never userId/resumedAt', async () => {
    const res = await agent
      .post('/study-sessions')
      .set('Authorization', `Bearer ${studentA.token}`)
      .send({ assignmentId: aAssignmentId, plannedMinutes: 25 })
      .expect(HttpStatus.CREATED);
    expect(Object.keys(res.body).sort()).toEqual(SESSION_KEYS);
    expect(res.body.userId).toBeUndefined();
    expect(res.body.resumedAt).toBeUndefined();
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.endTime).toBeNull();
    expect(res.body.elapsedSeconds).toBe(0);
  });

  it('a foreign assignment id returns the uniform 404', async () => {
    // B tries A's assignment
    const res = await agent
      .post('/study-sessions')
      .set('Authorization', `Bearer ${studentB.token}`)
      .send({ assignmentId: aAssignmentId })
      .expect(HttpStatus.NOT_FOUND);
    expect(res.body.message).toBe('Resource not found');
  });

  it('an unknown body field returns 400 with a field-level errors map', async () => {
    const res = await agent
      .post('/study-sessions')
      .set('Authorization', `Bearer ${studentA.token}`)
      .send({ foo: 1 })
      .expect(HttpStatus.BAD_REQUEST);
    expect(res.body.errors).toBeDefined();
  });

  it('a task belonging to another assignment returns 400 on taskId', async () => {
    const b1 = await agent
      .post('/assignments')
      .set('Authorization', `Bearer ${studentB.token}`)
      .send({ title: 'B1' })
      .expect(HttpStatus.CREATED);
    const b2 = await agent
      .post('/assignments')
      .set('Authorization', `Bearer ${studentB.token}`)
      .send({ title: 'B2' })
      .expect(HttpStatus.CREATED);
    const task = await agent
      .post(`/assignments/${b1.body.id}/subtasks`)
      .set('Authorization', `Bearer ${studentB.token}`)
      .send({ title: 't1' })
      .expect(HttpStatus.CREATED);
    const res = await agent
      .post('/study-sessions')
      .set('Authorization', `Bearer ${studentB.token}`)
      .send({ assignmentId: b2.body.id, taskId: task.body.id })
      .expect(HttpStatus.BAD_REQUEST);
    expect(res.body.errors.taskId).toBeDefined();
  });

  it('starting a second open session returns 409', async () => {
    // A already has an open session from first test
    const res = await agent
      .post('/study-sessions')
      .set('Authorization', `Bearer ${studentA.token}`)
      .send({})
      .expect(HttpStatus.CONFLICT);
    expect(res.body.message).toBe('A focus session is already in progress.');
  });

  it('GET /study-sessions/current is scoped: B sees null while A has an open session', async () => {
    const b = await agent
      .get('/study-sessions/current')
      .set('Authorization', `Bearer ${studentB.token}`)
      .expect(HttpStatus.OK);
    expect(b.text).toBe('');
    const a = await agent
      .get('/study-sessions/current')
      .set('Authorization', `Bearer ${studentA.token}`)
      .expect(HttpStatus.OK);
    expect(a.body).not.toBeNull();
    expect(Object.keys(a.body).sort()).toEqual(SESSION_KEYS);
  });

  it('B cannot pause A session: uniform 404', async () => {
    const a = await agent
      .get('/study-sessions/current')
      .set('Authorization', `Bearer ${studentA.token}`)
      .expect(HttpStatus.OK);
    const id = a.body.id;
    const res = await agent
      .post(`/study-sessions/${id}/pause`)
      .set('Authorization', `Bearer ${studentB.token}`)
      .expect(HttpStatus.NOT_FOUND);
    expect(res.body.message).toBe('Resource not found');
  });

  it('pause/resume updates status and elapsedSeconds', async () => {
    const a = await agent
      .get('/study-sessions/current')
      .set('Authorization', `Bearer ${studentA.token}`)
      .expect(HttpStatus.OK);
    const id = a.body.id;
    const paused = await agent
      .post(`/study-sessions/${id}/pause`)
      .set('Authorization', `Bearer ${studentA.token}`)
      .expect(HttpStatus.OK);
    expect(paused.body.status).toBe('PAUSED');
    expect(typeof paused.body.elapsedSeconds).toBe('number');
    const resumed = await agent
      .post(`/study-sessions/${id}/resume`)
      .set('Authorization', `Bearer ${studentA.token}`)
      .expect(HttpStatus.OK);
    expect(resumed.body.status).toBe('ACTIVE');
  });

  it('GET current performs no state change (read only)', async () => {
    const before = await agent
      .get('/study-sessions/current')
      .set('Authorization', `Bearer ${studentA.token}`)
      .expect(HttpStatus.OK);
    await agent
      .get('/study-sessions/current')
      .set('Authorization', `Bearer ${studentA.token}`)
      .expect(HttpStatus.OK);
    const after = await agent
      .get('/study-sessions/current')
      .set('Authorization', `Bearer ${studentA.token}`)
      .expect(HttpStatus.OK);
    expect(after.body.status).toBe(before.body.status);
  });

  it('unauthenticated requests return 401', async () => {
    await agent.get('/study-sessions/current').expect(HttpStatus.UNAUTHORIZED);
    await agent.post('/study-sessions').send({}).expect(HttpStatus.UNAUTHORIZED);
  });
});
