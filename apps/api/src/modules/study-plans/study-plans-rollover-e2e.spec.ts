import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/**
 * EP13C gated API spec (real database) — rolling reconciliation and the today
 * read end to end (TR-E13-03): unstarted past sessions roll `RESCHEDULED` on
 * an ordinary read, actually-done work is left alone, the rollover is
 * idempotent, history is untouched, and `GET /study-plans/today` answers the
 * "what now" question with a deterministic pick.
 */
describeIntegration('Rolling reconciliation + today read (integration, real database)', () => {
  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  let student: { id: string; token: string };
  let assignmentId: string;
  const runId = uuidv4();

  const today = () => new Date().toISOString().slice(0, 10);
  const addDaysCivil = (date: string, days: number) =>
    new Date(new Date(`${date}T00:00:00.000Z`).getTime() + days * 86_400_000)
      .toISOString()
      .slice(0, 10);
  const civilMidnight = (date: string) => new Date(`${date}T00:00:00.000Z`);

  async function seedPlanned(date: string, overrides: Record<string, unknown> = {}) {
    const plan = await app.prisma.studyPlan.upsert({
      where: { userId_date: { userId: student.id, date: civilMidnight(date) } },
      create: { userId: student.id, date: civilMidnight(date), targetHours: 1 },
      update: {},
      select: { id: true },
    });
    return app.prisma.plannedSession.create({
      data: {
        studyPlanId: plan.id,
        assignmentId,
        startTime: new Date(`${date}T09:00:00.000Z`),
        endTime: new Date(`${date}T10:00:00.000Z`),
        durationMinutes: 60,
        status: 'SCHEDULED',
        ...overrides,
      },
      select: { id: true },
    });
  }

  const statusOf = async (id: string) =>
    (await app.prisma.plannedSession.findUnique({ where: { id }, select: { status: true } }))
      ?.status;

  const getToday = () =>
    agent.get('/study-plans/today').set('Authorization', `Bearer ${student.token}`);

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());

    const email = `ep13c.${runId}@studypilot-test.invalid`;
    const password = `S3cure-${runId}-ep13c`;
    await agent
      .post('/auth/register')
      .send({ name: 'Student EP13C', email, password })
      .expect(HttpStatus.CREATED);
    const login = await agent.post('/auth/login').send({ email, password }).expect(HttpStatus.OK);
    student = { id: login.body.user.id, token: login.body.accessToken };

    const course = await agent
      .post('/courses')
      .set('Authorization', `Bearer ${student.token}`)
      .send({ code: `EP13C${runId.slice(0, 4)}`, name: 'Rollover' })
      .expect(HttpStatus.CREATED);
    const assignment = await app.prisma.assignment.create({
      data: {
        userId: student.id,
        courseId: course.body.id,
        title: `Essay ${runId}`,
        estimatedHours: 4,
        dueDate: new Date(`${addDaysCivil(today(), 10)}T12:00:00.000Z`),
        status: 'PENDING',
        priority: 'MEDIUM',
      },
      select: { id: true },
    });
    assignmentId = assignment.id;
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    await app.prisma.user.deleteMany({ where: { id: student?.id } });
    await app.app.close();
  }, 60_000);

  it('an ordinary read rolls unstarted past sessions forward — actually-done work is left alone (AC-E13-04)', async () => {
    const yesterday = addDaysCivil(today(), -1);
    const unstarted = await seedPlanned(yesterday);
    const lockedPast = await seedPlanned(yesterday, {
      locked: true,
      startTime: new Date(`${yesterday}T11:00:00.000Z`),
      endTime: new Date(`${yesterday}T12:00:00.000Z`),
    });
    // A past row whose work really happened: still SCHEDULED, but a linked
    // COMPLETED session carries ≥ 1 confirmed minute (hand-crafted history —
    // EP13B normally completes such rows; the guard must still protect it).
    const done = await seedPlanned(yesterday, {
      startTime: new Date(`${yesterday}T13:00:00.000Z`),
      endTime: new Date(`${yesterday}T14:00:00.000Z`),
    });
    await app.prisma.studySession.create({
      data: {
        userId: student.id,
        assignmentId,
        plannedSessionId: done.id,
        startTime: new Date(`${yesterday}T13:00:00.000Z`),
        endTime: new Date(`${yesterday}T13:40:00.000Z`),
        status: 'COMPLETED',
        durationMinutes: 40,
      },
    });

    const sessionsBefore = await app.prisma.studySession.count({
      where: { userId: student.id },
    });

    // The plain saved-plan read is enough — no recovery screen required.
    await agent
      .get('/study-plans')
      .set('Authorization', `Bearer ${student.token}`)
      .expect(HttpStatus.OK);

    expect(await statusOf(unstarted.id)).toBe('RESCHEDULED');
    expect(await statusOf(lockedPast.id)).toBe('RESCHEDULED'); // rolls, keeps locked
    expect(await statusOf(done.id)).toBe('SCHEDULED'); // actually done → untouched
    expect(
      (
        await app.prisma.plannedSession.findUnique({
          where: { id: lockedPast.id },
          select: { locked: true },
        })
      )?.locked
    ).toBe(true);

    // History immutability: no study session was created, changed or deleted.
    expect(await app.prisma.studySession.count({ where: { userId: student.id } })).toBe(
      sessionsBefore
    );

    // Idempotence: a second read changes nothing further.
    await agent
      .get('/study-plans')
      .set('Authorization', `Bearer ${student.token}`)
      .expect(HttpStatus.OK);
    expect(await statusOf(unstarted.id)).toBe('RESCHEDULED');

    // And the recovery summary no longer reports them as missed — they are
    // rolled-forward detail now (no re-accumulation).
    const summary = await agent
      .get('/study-plans/recovery-summary')
      .set('Authorization', `Bearer ${student.token}`)
      .expect(HttpStatus.OK);
    expect(summary.body.missedCount).toBe(0);
    const rolledIds = summary.body.rolledForward.map((s: { id: string }) => s.id);
    expect(rolledIds).toContain(unstarted.id);
    expect(rolledIds).toContain(lockedPast.id);
    expect(rolledIds).not.toContain(done.id);
  });

  it('GET /study-plans/today answers "what now": live statuses, the deterministic next pick, confirmed minutes (AC-E13-05 data source)', async () => {
    const first = await seedPlanned(today(), {
      startTime: new Date(`${today()}T08:00:00.000Z`),
      endTime: new Date(`${today()}T09:00:00.000Z`),
      status: 'COMPLETED',
    });
    const second = await seedPlanned(today(), {
      startTime: new Date(`${today()}T15:00:00.000Z`),
      endTime: new Date(`${today()}T16:00:00.000Z`),
    });

    const res = await getToday().expect(HttpStatus.OK);

    expect(Object.keys(res.body).sort()).toEqual([
      'confirmedMinutesToday',
      'date',
      'nextSession',
      'nextSessionReason',
      'sessions',
      'timeZone',
    ]);
    expect(res.body.date).toBe(today());
    const ids = res.body.sessions.map((s: { id: string }) => s.id);
    expect(ids).toContain(first.id);
    expect(ids).toContain(second.id);
    // The completed 08:00 row is not "next"; the open 15:00 row is.
    expect(res.body.nextSession?.id).toBe(second.id);
    expect(res.body.nextSessionReason).toBeNull();
    expect(JSON.stringify(res.body)).not.toContain(student.id);
  });

  it('starting the next session from the plan and finishing it closes the loop: today reflects it immediately', async () => {
    const next = (await getToday().expect(HttpStatus.OK)).body.nextSession;
    expect(next).toBeTruthy();

    const started = await agent
      .post(`/study-sessions/from-planned/${next.id}`)
      .set('Authorization', `Bearer ${student.token}`)
      .expect(HttpStatus.CREATED);

    const during = await getToday().expect(HttpStatus.OK);
    expect(during.body.sessions.find((s: { id: string }) => s.id === next.id)?.status).toBe(
      'IN_PROGRESS'
    );

    await agent
      .post(`/study-sessions/${started.body.id}/finish`)
      .set('Authorization', `Bearer ${student.token}`)
      .send({ confirmedMinutes: 25 })
      .expect(HttpStatus.OK);

    const after = await getToday().expect(HttpStatus.OK);
    expect(after.body.sessions.find((s: { id: string }) => s.id === next.id)?.status).toBe(
      'COMPLETED'
    );
    expect(after.body.confirmedMinutesToday).toBeGreaterThanOrEqual(25);
    // Nothing startable is left on today's plan.
    expect(after.body.nextSession).toBeNull();
    expect(after.body.nextSessionReason).toBe('NOTHING_LEFT_TODAY');
  });

  // =========================================================================
  // EP13G — day-anchored sessions, end to end (TR-E13-07, AC-3).
  // =========================================================================

  it('an unstarted FLEX_DAY session rolls forward through the same reconciliation (EP13G AC-3)', async () => {
    const yesterday = addDaysCivil(today(), -1);
    const flex = (await seedPlanned(yesterday, { anchor: 'FLEX_DAY', windowHint: 'EVENING' })).id;

    // No new rollover machinery: an ordinary read self-heals, and the
    // day-anchored row rolls exactly like a fixed one.
    await getToday().expect(HttpStatus.OK);

    expect(await statusOf(flex)).toBe('RESCHEDULED');
    const row = await app.prisma.plannedSession.findUnique({
      where: { id: flex },
      select: { anchor: true, windowHint: true },
    });
    // The rollover is a status change only — the anchor and the hint survive.
    expect(row?.anchor).toBe('FLEX_DAY');
    expect(row?.windowHint).toBe('EVENING');
  });

  it('starting a day-anchored session fixes it at the real time (EP13G AC-3)', async () => {
    const flex = (
      await seedPlanned(today(), {
        anchor: 'FLEX_DAY',
        windowHint: 'MORNING',
        startTime: new Date(`${today()}T06:00:00.000Z`),
        endTime: new Date(`${today()}T07:00:00.000Z`),
      })
    ).id;

    const before = new Date();
    await agent
      .post(`/study-sessions/from-planned/${flex}`)
      .set('Authorization', `Bearer ${student.token}`)
      .expect(HttpStatus.CREATED);

    const row = await app.prisma.plannedSession.findUnique({
      where: { id: flex },
      select: { anchor: true, status: true, startTime: true, endTime: true, durationMinutes: true },
    });
    expect(row?.status).toBe('IN_PROGRESS');
    expect(row?.anchor).toBe('FIXED');
    // The suggested 06:00 slot is replaced by when the work actually started.
    expect(row!.startTime.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(row!.endTime.getTime() - row!.startTime.getTime()).toBe(row!.durationMinutes * 60_000);

    // Leave the plan clean for the suites that follow.
    const open = await app.prisma.studySession.findFirst({
      where: { userId: student.id, status: { in: ['ACTIVE', 'PAUSED'] } },
      select: { id: true },
    });
    if (open) {
      await agent
        .post(`/study-sessions/${open.id}/finish`)
        .set('Authorization', `Bearer ${student.token}`)
        .send({ confirmedMinutes: 1 })
        .expect(HttpStatus.OK);
    }
  });

  it('no token → 401 (global guard)', async () => {
    await agent.get('/study-plans/today').expect(HttpStatus.UNAUTHORIZED);
  });
});
