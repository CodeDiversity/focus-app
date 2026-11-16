import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * EP08 catch-up data-scoping spec (integration, real database): the ownership
 * invariant of the recovery/catch-up surface (F-01 companion to
 * `study-plans-catch-up-e2e.spec.ts`; the parent README's security
 * invariants; the `study-plans-data-scoping.spec.ts` precedent).
 *
 * All three EP08 routes are principal-scoped (no id in the path, no id in the
 * body except assignment ids), so the matrix pinned here is:
 *
 * - One student's missed sessions, unfinished work and plan rows NEVER appear
 *   in another student's recovery summary or catch-up preview (a foreign
 *   missed row must not inflate `missedCount`, and a foreign locked/completed
 *   row must not inflate `lockedPreserved`/`completedPreserved`).
 * - A confirm built on another student's assignment id is the uniform 404 —
 *   byte-identical to a nonexistent id, so the route is not an existence
 *   oracle — and it writes nothing anywhere.
 * - A student's confirm replaces and creates rows ONLY inside their own
 *   window: the other student's planned sessions (including a locked row) and
 *   plan rows are byte-identical across it; no other student's id appears in
 *   any payload of the surface.
 *
 * Self-skips when `DATABASE_URL` is unset (the SP-104/SP-105/SP-106/SP-128A
 * convention), so a bare local `pnpm test` still works.
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

function addDaysCivil(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function instant(date: string, time: string): Date {
  return new Date(`${date}T${time}:00.000Z`);
}

describeIntegration('catch-up data scoping (integration, real database, EP08)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string): string =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-catchup-scope`;

  interface Student {
    id: string;
    email: string;
    accessToken: string;
  }

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  let studentA: Student;
  let studentB: Student;

  let from: string;
  let to: string;

  // A's fixtures (the "full" student).
  let aAssignment: { id: string };
  let aMissedRowId: string;
  let aWindowLockedRowId: string;
  let aWindowScheduledRowId: string;

  // B's fixtures (must survive A's every move).
  let bAssignment: { id: string };
  let bWindowLockedRowId: string;
  let bWindowScheduledRowId: string;

  async function registerAndLogin(label: string): Promise<Student> {
    const email = uniqueEmail(label);
    await agent
      .post('/auth/register')
      .send({ name: `Student ${label}`, email, password })
      .expect(HttpStatus.CREATED);
    const login = await agent.post('/auth/login').send({ email, password }).expect(HttpStatus.OK);
    return { id: login.body.user.id, email, accessToken: login.body.accessToken };
  }

  function getRecoverySummary(session: Student) {
    return agent
      .get('/study-plans/recovery-summary')
      .set('Authorization', `Bearer ${session.accessToken}`);
  }

  function catchUpPreview(session: Student) {
    return agent
      .post('/study-plans/catch-up/preview')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({});
  }

  function catchUpConfirm(session: Student, body: Record<string, unknown>) {
    return agent
      .post('/study-plans/catch-up/confirm')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send(body);
  }

  async function seedPlanDay(studentId: string, date: string) {
    return app.prisma.studyPlan.upsert({
      where: { userId_date: { userId: studentId, date: new Date(`${date}T00:00:00.000Z`) } },
      create: { userId: studentId, date: new Date(`${date}T00:00:00.000Z`), targetHours: 0 },
      update: {},
    });
  }

  async function seedPlanned(
    session: Student,
    data: {
      date: string;
      startTime: string;
      endTime: string;
      assignmentId: string;
      status?: 'SCHEDULED' | 'COMPLETED';
      locked?: boolean;
    }
  ) {
    const plan = await seedPlanDay(session.id, data.date);
    return app.prisma.plannedSession.create({
      data: {
        studyPlanId: plan.id,
        assignmentId: data.assignmentId,
        startTime: instant(data.date, data.startTime),
        endTime: instant(data.date, data.endTime),
        durationMinutes:
          (instant(data.date, data.endTime).getTime() -
            instant(data.date, data.startTime).getTime()) /
          60000,
        status: data.status ?? 'SCHEDULED',
        locked: data.locked ?? false,
      },
    });
  }

  async function seedAssignment(session: Student, title: string) {
    return app.prisma.assignment.create({
      data: {
        userId: session.id,
        title,
        estimatedHours: 3,
        dueDate: instant(addDaysCivil(from, 14), '12:00'),
        status: 'PENDING',
        priority: 'MEDIUM',
      },
    });
  }

  /** Every planned row of a student, byte-comparable (no audit stamp). */
  async function plannedRowsOf(studentId: string) {
    const rows = await app.prisma.plannedSession.findMany({
      where: { studyPlan: { userId: studentId } },
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      studyPlanId: r.studyPlanId,
      assignmentId: r.assignmentId,
      startTime: r.startTime.toISOString(),
      endTime: r.endTime.toISOString(),
      durationMinutes: r.durationMinutes,
      status: r.status,
      locked: r.locked,
    }));
  }

  /** Every plan row of a student, byte-comparable. */
  async function planRowsOf(studentId: string) {
    const rows = await app.prisma.studyPlan.findMany({
      where: { userId: studentId },
      orderBy: { date: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      date: r.date.toISOString().slice(0, 10),
      targetHours: r.targetHours,
    }));
  }

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());

    studentA = await registerAndLogin('scope-a');
    studentB = await registerAndLogin('scope-b');

    const firstPreview = await catchUpPreview(studentA).expect(HttpStatus.OK);
    from = firstPreview.body.from;
    to = firstPreview.body.to;

    // A: one missed row, one unfinished assignment, and in-window rows
    // (locked + SCHEDULED) that A's own confirm would interact with.
    aAssignment = await seedAssignment(studentA, `A essay ${runId}`);
    aMissedRowId = (
      await seedPlanned(studentA, {
        date: addDaysCivil(from, -2),
        startTime: '10:00',
        endTime: '11:00',
        assignmentId: aAssignment.id,
      })
    ).id;
    aWindowLockedRowId = (
      await seedPlanned(studentA, {
        date: addDaysCivil(from, 1),
        startTime: '10:00',
        endTime: '11:00',
        assignmentId: aAssignment.id,
        locked: true,
      })
    ).id;
    aWindowScheduledRowId = (
      await seedPlanned(studentA, {
        date: addDaysCivil(from, 3),
        startTime: '10:00',
        endTime: '11:00',
        assignmentId: aAssignment.id,
      })
    ).id;

    // B: its own in-window rows, mirrored in time onto A's fixtures so a
    // leak or a cross-write cannot hide behind different timestamps.
    bAssignment = await seedAssignment(studentB, `B lab ${runId}`);
    bWindowLockedRowId = (
      await seedPlanned(studentB, {
        date: addDaysCivil(from, 1),
        startTime: '10:00',
        endTime: '11:00',
        assignmentId: bAssignment.id,
        locked: true,
      })
    ).id;
    bWindowScheduledRowId = (
      await seedPlanned(studentB, {
        date: addDaysCivil(from, 3),
        startTime: '10:00',
        endTime: '11:00',
        assignmentId: bAssignment.id,
      })
    ).id;
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    await app.prisma.user.deleteMany({
      where: {
        id: { in: [studentA?.id, studentB?.id].filter((id): id is string => Boolean(id)) },
      },
    });
    await app.app.close();
  }, 60_000);

  it('B’s recovery summary is empty while A’s rolled-forward row and work exist — nothing crosses', async () => {
    // EP13C (R-EP13-01b): the summary read reconciles first, so A's past
    // unstarted row reports as rolled forward, never as missed.
    const aSummary = await getRecoverySummary(studentA).expect(HttpStatus.OK);
    expect(aSummary.body.missedCount).toBe(0);
    expect(aSummary.body.rolledForwardCount).toBe(1);

    const bSummary = await getRecoverySummary(studentB).expect(HttpStatus.OK);
    expect(bSummary.body.missedCount).toBe(0);
    expect(bSummary.body.missedSessions).toEqual([]);
    expect(bSummary.body.rolledForwardCount).toBe(0);
    expect(bSummary.body.rolledForward).toEqual([]);
    // B's unfinished work lists only B's assignment.
    expect(
      bSummary.body.unfinishedWork.map((i: { assignmentId: string }) => i.assignmentId)
    ).toEqual([bAssignment.id]);

    // Neither payload carries the other student's id.
    expect(JSON.stringify(bSummary.body)).not.toContain(studentA.id);
    expect(JSON.stringify(bSummary.body)).not.toContain(aMissedRowId);
    expect(JSON.stringify(aSummary.body)).not.toContain(studentB.id);
  });

  it('B’s preview never sees A’s missed/locked rows — preservation counts stay B’s own', async () => {
    const bPreview = await catchUpPreview(studentB).expect(HttpStatus.OK);

    expect(bPreview.body.missedSessions.map((s: { id: string }) => s.id)).toEqual([]);
    // B owns exactly one locked row of their own — A's locked row in the SAME
    // window must not stack onto the count (a leak would make it 2).
    expect(bPreview.body.lockedPreserved).toBe(1);
    expect(bPreview.body.completedPreserved).toBe(0);
    expect(JSON.stringify(bPreview.body)).not.toContain(studentA.id);
    expect(JSON.stringify(bPreview.body)).not.toContain(aWindowLockedRowId);
  });

  it('B confirming on A’s assignment id is the uniform 404 — identical to a nonexistent id, writing nothing', async () => {
    const bPlannedBefore = await plannedRowsOf(studentB.id);
    const aPlannedBefore = await plannedRowsOf(studentA.id);
    const aPlansBefore = await planRowsOf(studentA.id);

    const foreign = await catchUpConfirm(studentB, {
      from,
      to,
      sessions: [
        { assignmentId: aAssignment.id, date: from, startTime: '10:00', endTime: '11:00' },
      ],
    }).expect(HttpStatus.NOT_FOUND);
    const missing = await catchUpConfirm(studentB, {
      from,
      to,
      sessions: [{ assignmentId: uuidv4(), date: from, startTime: '10:00', endTime: '11:00' }],
    }).expect(HttpStatus.NOT_FOUND);

    expect(foreign.body).toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Resource not found',
    });
    // Identical modulo the response timestamp — no existence oracle.
    expect({ ...foreign.body, timestamp: null }).toEqual({ ...missing.body, timestamp: null });

    // Nothing moved — for either student.
    expect(await plannedRowsOf(studentB.id)).toEqual(bPlannedBefore);
    expect(await plannedRowsOf(studentA.id)).toEqual(aPlannedBefore);
    expect(await planRowsOf(studentA.id)).toEqual(aPlansBefore);
  });

  it('A’s confirm touches ONLY A’s rows — B’s locked and scheduled rows are byte-identical across it', async () => {
    const bPlannedBefore = await plannedRowsOf(studentB.id);
    const bPlansBefore = await planRowsOf(studentB.id);

    await catchUpConfirm(studentA, {
      from,
      to,
      sessions: [
        {
          assignmentId: aAssignment.id,
          date: addDaysCivil(from, 2),
          startTime: '15:00',
          endTime: '16:00',
        },
      ],
    }).expect(HttpStatus.CREATED);

    // B's rows — identical, row for row, including the one locked row A's
    // window also owns on A's side.
    expect(await plannedRowsOf(studentB.id)).toEqual(bPlannedBefore);
    expect(await planRowsOf(studentB.id)).toEqual(bPlansBefore);
    const bLocked = await app.prisma.plannedSession.findUnique({
      where: { id: bWindowLockedRowId },
    });
    expect(bLocked).toMatchObject({ locked: true, status: 'SCHEDULED' });
    expect(
      await app.prisma.plannedSession.findUnique({ where: { id: bWindowScheduledRowId } })
    ).toBeTruthy();

    // A's own semantics still hold inside the same confirm: A's locked row
    // survived and A's replaced SCHEDULED row is gone.
    const aLocked = await app.prisma.plannedSession.findUnique({
      where: { id: aWindowLockedRowId },
    });
    expect(aLocked).toMatchObject({ locked: true });
    expect(
      await app.prisma.plannedSession.findUnique({ where: { id: aWindowScheduledRowId } })
    ).toBeNull();
  });

  it('the confirm echo and the plan read never carry another student’s id', async () => {
    const echo = await catchUpConfirm(studentB, {
      from,
      to,
      sessions: [
        {
          assignmentId: bAssignment.id,
          date: addDaysCivil(from, 4),
          startTime: '09:00',
          endTime: '10:00',
        },
      ],
    }).expect(HttpStatus.CREATED);
    expect(JSON.stringify(echo.body)).not.toContain(studentA.id);
    expect(JSON.stringify(echo.body)).not.toContain(aAssignment.id);

    const plan = await agent
      .get('/study-plans')
      .query({ from, to })
      .set('Authorization', `Bearer ${studentB.accessToken}`)
      .expect(HttpStatus.OK);
    expect(JSON.stringify(plan.body)).not.toContain(studentA.id);
    expect(JSON.stringify(plan.body)).not.toContain(aAssignment.id);
  });
});
