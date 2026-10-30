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

describeIntegration('Study sessions lifecycle end-to-end (integration, real database)', () => {
  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  let student: { id: string; token: string };
  const runId = uuidv4();

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());
    const email = `e2e.${runId}@studypilot-test.invalid`;
    const password = `S3cure-${runId}-e2e`;
    await agent
      .post('/auth/register')
      .send({ name: 'Student E2E', email, password })
      .expect(HttpStatus.CREATED);
    const login = await agent.post('/auth/login').send({ email, password }).expect(HttpStatus.OK);
    student = { id: login.body.user.id, token: login.body.accessToken };
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    await app.prisma.user.deleteMany({ where: { id: student?.id } });
    await app.app.close();
  }, 60_000);

  it('returns null from current when nothing is open', async () => {
    const res = await agent
      .get('/study-sessions/current')
      .set('Authorization', `Bearer ${student.token}`)
      .expect(HttpStatus.OK);
    expect(res.text).toBe('');
  });

  it('starts a session with the 12-key projection', async () => {
    const res = await agent
      .post('/study-sessions')
      .set('Authorization', `Bearer ${student.token}`)
      .send({ plannedMinutes: 30 })
      .expect(HttpStatus.CREATED);
    expect(Object.keys(res.body).sort()).toEqual(SESSION_KEYS);
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.endTime).toBeNull();
  });

  it('pauses and resumes with updated elapsedSeconds', async () => {
    const cur = await agent
      .get('/study-sessions/current')
      .set('Authorization', `Bearer ${student.token}`)
      .expect(HttpStatus.OK);
    const id = cur.body.id;
    const paused = await agent
      .post(`/study-sessions/${id}/pause`)
      .set('Authorization', `Bearer ${student.token}`)
      .expect(HttpStatus.OK);
    expect(paused.body.status).toBe('PAUSED');
    expect(typeof paused.body.elapsedSeconds).toBe('number');
    const resumed = await agent
      .post(`/study-sessions/${id}/resume`)
      .set('Authorization', `Bearer ${student.token}`)
      .expect(HttpStatus.OK);
    expect(resumed.body.status).toBe('ACTIVE');
  });

  it('invalid transition returns 409', async () => {
    const cur = await agent
      .get('/study-sessions/current')
      .set('Authorization', `Bearer ${student.token}`)
      .expect(HttpStatus.OK);
    const id = cur.body.id;
    // resume an already active session
    const res = await agent
      .post(`/study-sessions/${id}/resume`)
      .set('Authorization', `Bearer ${student.token}`)
      .expect(HttpStatus.CONFLICT);
    expect(res.body.message).toBe('This session is already active.');
  });

  it('a second start returns 409', async () => {
    const res = await agent
      .post('/study-sessions')
      .set('Authorization', `Bearer ${student.token}`)
      .send({})
      .expect(HttpStatus.CONFLICT);
    expect(res.body.message).toBe('A focus session is already in progress.');
  });

  it('401 unauthenticated', async () => {
    await agent.get('/study-sessions/current').expect(HttpStatus.UNAUTHORIZED);
  });
});
