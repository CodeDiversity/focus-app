import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/**
 * EP13B gated API spec (real database) — the planned↔actual link end to end
 * (TR-E13-02), proving against Postgres what the unit spec pins against
 * mocks: the transactional start, the lifecycle transitions the plan sees,
 * the today-only rule, the one-open-session guard and ownership scoping.
 *
 * Also covers the migration's "existing rows unaffected" promise: a session
 * started the EP07 way stores a NULL link.
 */
describeIntegration('Start focus from a planned session (integration, real database)', () => {
  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  let student: { id: string; token: string };
  let other: { id: string; token: string };
  let assignmentId: string;
  const runId = uuidv4();

  /** The civil date the server will call "today" for a UTC profile. */
  const today = () => new Date().toISOString().slice(0, 10);
  const civilMidnight = (date: string) => new Date(`${date}T00:00:00.000Z`);

  async function register(label: string) {
    const email = `ep13b.${label}.${runId}@studypilot-test.invalid`;
    const password = `S3cure-${runId}-ep13b`;
    await agent
      .post('/auth/register')
      .send({ name: `Student ${label}`, email, password })
      .expect(HttpStatus.CREATED);
    const login = await agent.post('/auth/login').send({ email, password }).expect(HttpStatus.OK);
    return { id: login.body.user.id, token: login.body.accessToken };
  }

  /** Create a planned session on `date` for the given student. */
  async function seedPlanned(
    owner: { id: string },
    ownerAssignmentId: string,
    date: string,
    overrides: Record<string, unknown> = {}
  ) {
    const plan = await app.prisma.studyPlan.upsert({
      where: { userId_date: { userId: owner.id, date: civilMidnight(date) } },
      create: { userId: owner.id, date: civilMidnight(date), targetHours: 1 },
      update: {},
      select: { id: true },
    });
    return app.prisma.plannedSession.create({
      data: {
        studyPlanId: plan.id,
        assignmentId: ownerAssignmentId,
        startTime: new Date(`${date}T09:00:00.000Z`),
        endTime: new Date(`${date}T09:50:00.000Z`),
        durationMinutes: 50,
        status: 'SCHEDULED',
        ...overrides,
      },
      select: { id: true, status: true },
    });
  }

  const startFromPlanned = (token: string, id: string) =>
    agent.post(`/study-sessions/from-planned/${id}`).set('Authorization', `Bearer ${token}`);

  const plannedStatus = async (id: string) =>
    (await app.prisma.plannedSession.findUnique({ where: { id }, select: { status: true } }))
      ?.status;

  /** Finish whatever session is open, so each test starts from a clean slate. */
  async function closeOpenSession(token: string, confirmedMinutes = 1) {
    const current = await agent
      .get('/study-sessions/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.OK);
    if (current.body?.id) {
      await agent
        .post(`/study-sessions/${current.body.id}/finish`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirmedMinutes })
        .expect(HttpStatus.OK);
    }
  }

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());

    student = await register('owner');
    other = await register('other');

    const course = await agent
      .post('/courses')
      .set('Authorization', `Bearer ${student.token}`)
      .send({ code: `EP13B${runId.slice(0, 4)}`, name: 'Planned link' })
      .expect(HttpStatus.CREATED);

    const assignment = await app.prisma.assignment.create({
      data: {
        userId: student.id,
        courseId: course.body.id,
        title: `Problem set ${runId}`,
        estimatedHours: 2,
        dueDate: new Date(`${today()}T23:00:00.000Z`),
        status: 'PENDING',
        priority: 'MEDIUM',
      },
      select: { id: true },
    });
    assignmentId = assignment.id;
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    await app.prisma.user.deleteMany({ where: { id: { in: [student?.id, other?.id] } } });
    await app.app.close();
  }, 60_000);

  it('starts a linked session that inherits the plan’s assignment and duration, and marks the planned row IN_PROGRESS', async () => {
    const planned = await seedPlanned(student, assignmentId, today());

    const res = await startFromPlanned(student.token, planned.id).expect(HttpStatus.CREATED);

    expect(res.body).toMatchObject({
      plannedSessionId: planned.id,
      assignmentId,
      plannedMinutes: 50,
      status: 'ACTIVE',
      durationMinutes: 0,
      endTime: null,
    });
    expect(await plannedStatus(planned.id)).toBe('IN_PROGRESS');

    // A second start — linked or not — hits the one-open-session guard, and
    // the other planned row is left exactly as it was.
    const second = await seedPlanned(student, assignmentId, today());
    await startFromPlanned(student.token, second.id).expect(HttpStatus.CONFLICT);
    await agent
      .post('/study-sessions')
      .set('Authorization', `Bearer ${student.token}`)
      .send({ plannedMinutes: 10 })
      .expect(HttpStatus.CONFLICT);
    expect(await plannedStatus(second.id)).toBe('SCHEDULED');

    await closeOpenSession(student.token, 30);
    // Finishing with confirmed minutes completes the planned row it came from.
    expect(await plannedStatus(planned.id)).toBe('COMPLETED');
  });

  it('finishing with zero confirmed minutes hands the planned row back as SCHEDULED', async () => {
    const planned = await seedPlanned(student, assignmentId, today());

    const started = await startFromPlanned(student.token, planned.id).expect(HttpStatus.CREATED);
    expect(await plannedStatus(planned.id)).toBe('IN_PROGRESS');

    await agent
      .post(`/study-sessions/${started.body.id}/finish`)
      .set('Authorization', `Bearer ${student.token}`)
      .send({ confirmedMinutes: 0 })
      .expect(HttpStatus.OK);

    expect(await plannedStatus(planned.id)).toBe('SCHEDULED');
  });

  it('a session started the EP07 way keeps a NULL link and never touches the plan (migration: existing rows unaffected)', async () => {
    const planned = await seedPlanned(student, assignmentId, today());

    const started = await agent
      .post('/study-sessions')
      .set('Authorization', `Bearer ${student.token}`)
      .send({ assignmentId, plannedMinutes: 15 })
      .expect(HttpStatus.CREATED);
    expect(started.body.plannedSessionId).toBeNull();

    await agent
      .post(`/study-sessions/${started.body.id}/finish`)
      .set('Authorization', `Bearer ${student.token}`)
      .send({ confirmedMinutes: 15 })
      .expect(HttpStatus.OK);

    // The unrelated planned row is untouched by an unlinked session.
    expect(await plannedStatus(planned.id)).toBe('SCHEDULED');
  });

  it('only today’s plan is startable: an earlier or later day answers 409 and writes nothing', async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

    const past = await seedPlanned(student, assignmentId, yesterday);
    const future = await seedPlanned(student, assignmentId, tomorrow);

    await startFromPlanned(student.token, past.id).expect(HttpStatus.CONFLICT);
    await startFromPlanned(student.token, future.id).expect(HttpStatus.CONFLICT);

    expect(await plannedStatus(past.id)).toBe('SCHEDULED');
    expect(await plannedStatus(future.id)).toBe('SCHEDULED');
    const current = await agent
      .get('/study-sessions/current')
      .set('Authorization', `Bearer ${student.token}`)
      .expect(HttpStatus.OK);
    expect(current.text).toBe('');
  });

  it('another student’s planned session is the uniform 404, and nothing is written', async () => {
    const planned = await seedPlanned(student, assignmentId, today());

    const res = await startFromPlanned(other.token, planned.id).expect(HttpStatus.NOT_FOUND);
    expect(res.body.message).toBe('Resource not found');
    expect(await plannedStatus(planned.id)).toBe('SCHEDULED');

    // A planned id that does not exist at all answers identically — no
    // existence oracle.
    const missing = await startFromPlanned(other.token, uuidv4()).expect(HttpStatus.NOT_FOUND);
    expect(missing.body.message).toBe('Resource not found');
  });

  // ===========================================================================
  // EP13I — micro-start and hyperfocus absorption (TR-E13-10), end to end.
  // ===========================================================================

  it('a 10-minute micro-start is linked, targets 10, and its confirmed minutes shrink remaining work (EP13A math)', async () => {
    const planned = await seedPlanned(student, assignmentId, today());

    const started = await startFromPlanned(student.token, planned.id)
      .send({ plannedMinutes: 10 })
      .expect(HttpStatus.CREATED);
    expect(started.body).toMatchObject({
      plannedSessionId: planned.id,
      plannedMinutes: 10,
      status: 'ACTIVE',
    });
    expect(await plannedStatus(planned.id)).toBe('IN_PROGRESS');

    const before = await agent
      .get('/study-plans/remaining-work')
      .set('Authorization', `Bearer ${student.token}`)
      .expect(HttpStatus.OK);
    const beforeItem = before.body.items.find(
      (item: { assignmentId: string }) => item.assignmentId === assignmentId
    );

    await closeOpenSession(student.token, 10);
    expect(await plannedStatus(planned.id)).toBe('COMPLETED');

    // The ten minutes are real: confirmed grew and remaining shrank (EP13A).
    const after = await agent
      .get('/study-plans/remaining-work')
      .set('Authorization', `Bearer ${student.token}`)
      .expect(HttpStatus.OK);
    const afterItem = after.body.items.find(
      (item: { assignmentId: string }) => item.assignmentId === assignmentId
    );
    expect(afterItem.confirmedMinutes).toBe(beforeItem.confirmedMinutes + 10);
    if (beforeItem.remainingMinutes !== null) {
      expect(afterItem.remainingMinutes).toBe(Math.max(0, beforeItem.remainingMinutes - 10));
    }
  });

  it('absorb-next folds the next planned session into the running one and cannot double-absorb', async () => {
    const current = await seedPlanned(student, assignmentId, today());
    const next = await seedPlanned(student, assignmentId, today(), {
      startTime: new Date(`${today()}T15:00:00.000Z`),
      endTime: new Date(`${today()}T16:00:00.000Z`),
      durationMinutes: 60,
    });

    const started = await startFromPlanned(student.token, current.id).expect(HttpStatus.CREATED);

    const absorbed = await agent
      .post(`/study-sessions/${started.body.id}/absorb-next`)
      .set('Authorization', `Bearer ${student.token}`)
      .expect(HttpStatus.OK);
    expect(absorbed.body.plannedMinutes).toBe(50 + 60);
    expect(await plannedStatus(next.id)).toBe('COMPLETED');

    // Nothing left to absorb → an actionable 409, nothing changed.
    const again = await agent
      .post(`/study-sessions/${started.body.id}/absorb-next`)
      .set('Authorization', `Bearer ${student.token}`)
      .expect(HttpStatus.CONFLICT);
    expect(again.body.message).toContain('No upcoming session');

    await closeOpenSession(student.token, 1);
  });

  it('no token → 401 (global guard)', async () => {
    await agent.post(`/study-sessions/from-planned/${uuidv4()}`).expect(HttpStatus.UNAUTHORIZED);
  });
});
