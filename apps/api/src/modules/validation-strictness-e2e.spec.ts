import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../test/test-http';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/**
 * EP14B-AC1 (D-B1a, closes the R-EP13-03 coercion weakness): with
 * `enableImplicitConversion: false`, a wrong-typed boolean or number in a
 * request body is a field-level 400 — never silently coerced — while the
 * explicitly-converted numeric query params keep working.
 */
describeIntegration('Request-body validation strictness (integration, real database)', () => {
  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  let token: string;
  let userId: string;
  let assignmentId: string;
  const runId = uuidv4();

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());
    const email = `strict.${runId}@studypilot-test.invalid`;
    const password = `S3cure-${runId}-strict`;
    await agent
      .post('/auth/register')
      .send({ name: 'Strict Student', email, password })
      .expect(HttpStatus.CREATED);
    const login = await agent.post('/auth/login').send({ email, password }).expect(HttpStatus.OK);
    token = login.body.accessToken;
    userId = login.body.user.id;
    const assignment = await app.prisma.assignment.create({
      data: {
        userId,
        title: `Strictness target ${runId}`,
        estimatedHours: 1,
        dueDate: new Date('2099-01-01T12:00:00.000Z'),
        status: 'PENDING',
        priority: 'MEDIUM',
      },
      select: { id: true },
    });
    assignmentId = assignment.id;
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    await app.prisma.user.deleteMany({ where: { id: userId } });
    await app.app.close();
  }, 60_000);

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('a wrong-typed boolean body field is a field-level 400, nothing written', async () => {
    const plan = await app.prisma.studyPlan.upsert({
      where: { userId_date: { userId, date: new Date('2026-10-29T00:00:00.000Z') } },
      create: { userId, date: new Date('2026-10-29T00:00:00.000Z'), targetHours: 1 },
      update: {},
    });
    const row = await app.prisma.plannedSession.create({
      data: {
        studyPlanId: plan.id,
        assignmentId,
        startTime: new Date('2026-10-29T14:00:00.000Z'),
        endTime: new Date('2026-10-29T15:00:00.000Z'),
        durationMinutes: 60,
      },
    });

    for (const locked of ['yes', 1, 'true']) {
      const res = await agent
        .patch(`/study-plans/sessions/${row.id}/lock`)
        .set(auth())
        .send({ locked })
        .expect(HttpStatus.BAD_REQUEST);
      expect(res.body.errors).toHaveProperty('locked');
    }
    const stored = await app.prisma.plannedSession.findUnique({ where: { id: row.id } });
    expect(stored?.locked).toBe(false);
  });

  it('a wrong-typed number body field is a field-level 400', async () => {
    const res = await agent
      .post('/study-sessions')
      .set(auth())
      .send({ assignmentId, plannedMinutes: '25' })
      .expect(HttpStatus.BAD_REQUEST);
    expect(res.body.errors).toHaveProperty('plannedMinutes');
    // The real number still works (and is closed again to keep the account clean).
    const ok = await agent
      .post('/study-sessions')
      .set(auth())
      .send({ assignmentId, plannedMinutes: 25 })
      .expect(HttpStatus.CREATED);
    await agent
      .post(`/study-sessions/${ok.body.id}/finish`)
      .set(auth())
      .send({ confirmedMinutes: 1 })
      .expect(HttpStatus.OK);
  });

  it('numeric query params still parse via their explicit transforms', async () => {
    const res = await agent
      .get('/study-sessions?limit=10&offset=0')
      .set(auth())
      .expect(HttpStatus.OK);
    expect(res.body).toHaveProperty('items');
    await agent.get('/study-sessions?limit=abc').set(auth()).expect(HttpStatus.BAD_REQUEST);
  });
});
