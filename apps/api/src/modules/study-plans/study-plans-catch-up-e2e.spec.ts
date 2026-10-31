import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * EP08 catch-up e2e spec: the recovery/catch-up surface **over real HTTP
 * against a real PostgreSQL database** (the `test-http` harness — `main.ts`
 * parity: the global `FieldValidationPipe` with `whitelist` +
 * `forbidNonWhitelisted`, the global JWT guard and the `AllExceptionsFilter`).
 *
 * Closes the HTTP half of review finding **F-01** (EP08 parent review pass 1):
 * before this spec no automated test existed for `GET
 * /study-plans/recovery-summary`, `POST /study-plans/catch-up/preview` or
 * `POST /study-plans/catch-up/confirm` at the API level.
 *
 * Pinned here (TR-E08-01/02/04, real stack):
 * - recovery-summary: the classification end-to-end (past `SCHEDULED` rows of
 *   unfinished assignments reported, locked-missed reported, completed
 *   assignments and `COMPLETED` rows excluded), the exact `MissedSession`
 *   projection with UTC-rendered wall times, the unfinished-work reuse, the
 *   neutral non-blaming message (PR-008/D08-8), the uniform 404 for a deleted
 *   principal, 401 unauthenticated.
 * - catch-up/preview: the contract key set, a seven-day window from the
 *   server's clock, `timeZone` resolution, side-effect-freedom proven against
 *   **row counts in the real database** (the server half of "decline leaves
 *   state unchanged" — decline is client-side by contract, and this route is
 *   what decline abandons), and the seeded missed sessions reported.
 * - catch-up/confirm: the happy path against the real engine (atomic replace:
 *   new rows `SCHEDULED`/`locked: false`, `targetHours` recomputed, plan rows
 *   created for every day of the window), locked/completed preservation
 *   field-for-field in the real database, an unedited resubmit never 409s
 *   (PR-002 busy-exclusion), the conflict 409 **reason matrix** against real
 *   `ClassMeeting`/blocked-availability/locked/completed rows, the malformed
 *   400 matrix with the flattened `sessions.<i>.<field>` keys arriving
 *   through the real pipe, `WINDOW_ROLLED_OVER`, the foreign-vs-missing
 *   assignment identical uniform 404, no `catch-up/decline` route exists.
 * - The `GET /study-plans` echo after confirm — the written plan is readable
 *   through the EP06 read with the contract's session keys (no `locked` key;
 *   review polish P-03 pinned as the unchanged `SavedPlan` shape).
 *
 * The `study-plans-catch-up-data-scoping.spec.ts` sibling pins the
 * cross-student matrix for the same three routes.
 *
 * Self-skips when `DATABASE_URL` is unset (the SP-104/SP-105/SP-106/SP-128A
 * convention), so a bare local `pnpm test` still works.
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/** Civil-date arithmetic on `YYYY-MM-DD` strings (UTC anchor). */
function addDaysCivil(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** `dayOfWeek` (0 = Sunday) of a civil date — the EP04/EP05 convention. */
function dayOfWeekOf(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

/** A UTC instant for a civil date + `HH:mm` (every fixture student is UTC). */
function instant(date: string, time: string): Date {
  return new Date(`${date}T${time}:00.000Z`);
}

describeIntegration('catch-up recovery e2e (real database, EP08)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string): string =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-catchup-e2e`;

  interface Student {
    id: string;
    email: string;
    accessToken: string;
  }

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;

  // Journey student (recovery + preview + confirm + resubmit), conflict
  // student (409 reason matrix), foreign-assignment owner, and a throwaway
  // student for the deleted-principal 404 — fresh students per scenario so
  // the exact-count assertions are never contaminated by another suite.
  let student: Student;
  let foreign: Student;
  let conflictStudent: Student;

  // The server-derived planning window (learned from the first preview call,
  // so the spec never assumes what "today" is on the server).
  let from: string;
  let to: string;

  // Journey fixtures (ids kept for row-level assertions).
  let assignmentA: { id: string };
  let assignmentDone: { id: string };
  let assignmentB: { id: string };
  let missedOpenRowId: string;
  let missedLockedRowId: string;
  let completedAssignmentRowId: string;
  let completedStatusRowId: string;
  let windowLockedRowId: string;
  let windowCompletedRowId: string;

  // Foreign student's assignment (cross-student confirm probe).
  let foreignAssignmentId: string;

  // Conflict-student fixtures.
  let conflictAssignment: { id: string };
  let conflictCLockedId: string;

  async function registerAndLogin(label: string): Promise<Student> {
    const email = uniqueEmail(label);
    await agent
      .post('/auth/register')
      .send({ name: `Student ${label}`, email, password })
      .expect(HttpStatus.CREATED);
    const login = await agent.post('/auth/login').send({ email, password }).expect(HttpStatus.OK);
    expect(login.body.accessToken).toBeTruthy();
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

  /**
   * Confirm creates plan rows: like `POST /study-plans` (EP06D), the route
   * answers **201 Created** (no `@HttpCode(200)` — deliberately the save
   * twin, in status as in transaction shape).
   */
  function catchUpConfirm(session: Student, body: Record<string, unknown>) {
    return agent
      .post('/study-plans/catch-up/confirm')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send(body);
  }

  /** Upsert the student's plan row for one civil date; returns its id. */
  async function seedPlanDay(studentId: string, date: string, targetHours = 0) {
    return app.prisma.studyPlan.upsert({
      where: { userId_date: { userId: studentId, date: new Date(`${date}T00:00:00.000Z`) } },
      create: { userId: studentId, date: new Date(`${date}T00:00:00.000Z`), targetHours },
      update: {},
    });
  }

  /** Seed one planned session (direct write: the fixture). */
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

  async function seedAssignment(
    session: Student,
    data: { title: string; status?: string; dueInDays?: number }
  ) {
    return app.prisma.assignment.create({
      data: {
        userId: session.id,
        title: data.title,
        estimatedHours: 3,
        dueDate: instant(addDaysCivil(from, data.dueInDays ?? 14), '12:00'),
        status: (data.status ?? 'PENDING') as 'PENDING',
        priority: 'MEDIUM',
      },
    });
  }

  /** Every row count the catch-up surface may read or write. */
  async function snapshot() {
    const [studyPlan, plannedSession, studySession, assignment, user] = await Promise.all([
      app.prisma.studyPlan.count(),
      app.prisma.plannedSession.count(),
      app.prisma.studySession.count(),
      app.prisma.assignment.count(),
      app.prisma.user.count(),
    ]);
    return { studyPlan, plannedSession, studySession, assignment, user };
  }

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());

    student = await registerAndLogin('catchup');
    foreign = await registerAndLogin('catchup-foreign');
    conflictStudent = await registerAndLogin('catchup-conflict');

    // The window comes from the server itself (preview writes nothing).
    const firstPreview = await catchUpPreview(student).expect(HttpStatus.OK);
    from = firstPreview.body.from;
    to = firstPreview.body.to;
    expect(firstPreview.body.days).toHaveLength(7);

    // ---- journey fixtures ----
    assignmentA = await seedAssignment(student, { title: `Problem set ${runId}` });
    assignmentDone = await seedAssignment(student, { title: 'Done quiz', status: 'COMPLETED' });
    assignmentB = await seedAssignment(student, { title: 'Lab report' });

    // Missed (in scope): past SCHEDULED rows of unfinished assignments.
    missedOpenRowId = (
      await seedPlanned(student, {
        date: addDaysCivil(from, -2),
        startTime: '10:00',
        endTime: '11:00',
        assignmentId: assignmentA.id,
      })
    ).id;
    missedLockedRowId = (
      await seedPlanned(student, {
        date: addDaysCivil(from, -3),
        startTime: '12:00',
        endTime: '13:00',
        assignmentId: assignmentA.id,
        locked: true,
      })
    ).id;
    // Out of scope: completed assignment, and a COMPLETED row.
    completedAssignmentRowId = (
      await seedPlanned(student, {
        date: addDaysCivil(from, -1),
        startTime: '10:00',
        endTime: '11:00',
        assignmentId: assignmentDone.id,
      })
    ).id;
    completedStatusRowId = (
      await seedPlanned(student, {
        date: addDaysCivil(from, -1),
        startTime: '14:00',
        endTime: '15:00',
        assignmentId: assignmentB.id,
        status: 'COMPLETED',
      })
    ).id;

    // Preservation fixtures INSIDE the window (survive confirm untouched).
    windowLockedRowId = (
      await seedPlanned(student, {
        date: addDaysCivil(from, 1),
        startTime: '10:00',
        endTime: '11:00',
        assignmentId: assignmentA.id,
        locked: true,
      })
    ).id;
    windowCompletedRowId = (
      await seedPlanned(student, {
        date: addDaysCivil(from, 2),
        startTime: '09:00',
        endTime: '10:00',
        assignmentId: assignmentB.id,
        status: 'COMPLETED',
      })
    ).id;

    // ---- foreign student ----
    foreignAssignmentId = (await seedAssignment(foreign, { title: 'Foreign work' })).id;

    // ---- conflict student ----
    conflictAssignment = await seedAssignment(conflictStudent, { title: 'Conflict essay' });
    conflictCLockedId = (
      await seedPlanned(conflictStudent, {
        date: addDaysCivil(from, 1),
        startTime: '10:00',
        endTime: '11:00',
        assignmentId: conflictAssignment.id,
        locked: true,
      })
    ).id;
    await seedPlanned(conflictStudent, {
      date: addDaysCivil(from, 2),
      startTime: '09:00',
      endTime: '10:00',
      assignmentId: conflictAssignment.id,
      status: 'COMPLETED',
    });
    const course = await app.prisma.course.create({
      data: { userId: conflictStudent.id, code: `C${runId}`, name: 'Conflict Seminar' },
    });
    await app.prisma.classMeeting.create({
      data: {
        userId: conflictStudent.id,
        courseId: course.id,
        dayOfWeek: dayOfWeekOf(addDaysCivil(from, 3)),
        startTime: '13:00',
        endTime: '14:00',
      },
    });
    await app.prisma.availabilitySlot.create({
      data: {
        userId: conflictStudent.id,
        dayOfWeek: dayOfWeekOf(addDaysCivil(from, 4)),
        startTime: '15:00',
        endTime: '16:00',
        isAvailable: false,
      },
    });
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    // Deleting the users cascades (onDelete: Cascade) to their rows.
    await app.prisma.user.deleteMany({
      where: {
        id: {
          in: [student?.id, foreign?.id, conflictStudent?.id].filter((id): id is string =>
            Boolean(id)
          ),
        },
      },
    });
    await app.app.close();
  }, 60_000);

  // ==================== GET /study-plans/recovery-summary ====================

  describe('recovery summary (TR-E08-01/TR-E08-02)', () => {
    it('classifies against the real database and projects the exact contract shape', async () => {
      const response = await getRecoverySummary(student).expect(HttpStatus.OK);

      expect(Object.keys(response.body).sort()).toEqual([
        'confirmedMinutes',
        'message',
        'missedCount',
        'missedSessions',
        'unfinishedWork',
      ]);

      // Exactly the two in-scope missed rows; the completed-assignment row and
      // the COMPLETED row are excluded; the locked-missed row IS reported.
      expect(response.body.missedCount).toBe(2);
      expect(response.body.missedSessions.map((s: { id: string }) => s.id).sort()).toEqual(
        [missedLockedRowId, missedOpenRowId].sort()
      );
      expect(response.body.missedSessions.map((s: { id: string }) => s.id)).not.toContain(
        completedAssignmentRowId
      );
      expect(response.body.missedSessions.map((s: { id: string }) => s.id)).not.toContain(
        completedStatusRowId
      );

      // The projection, ordered by (date, startTime): the older (locked) row
      // first, wall times rendered in the profile zone (UTC for a fresh
      // student with no timeZone).
      expect(response.body.missedSessions[0]).toEqual({
        id: missedLockedRowId,
        assignmentId: assignmentA.id,
        assignmentTitle: `Problem set ${runId}`,
        date: addDaysCivil(from, -3),
        startTime: '12:00',
        endTime: '13:00',
        durationMinutes: 60,
        locked: true,
      });
      expect(response.body.missedSessions[1]).toMatchObject({
        id: missedOpenRowId,
        date: addDaysCivil(from, -2),
        locked: false,
      });

      // Unfinished work: both PENDING assignments, never the COMPLETED one.
      const items = response.body.unfinishedWork.map((i: { assignmentId: string }) =>
        i.assignmentId.toString()
      );
      expect(items).toContain(assignmentA.id);
      expect(items).toContain(assignmentB.id);
      expect(items).not.toContain(assignmentDone.id);
      expect(response.body.confirmedMinutes).toBe(0);

      // Neutral message (PR-008): the same term list the shipped UI tests pin.
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);
      expect(response.body.message).not.toMatch(/you missed/i);
      expect(response.body.message).not.toMatch(/you(’'ve| have|'?ve)? failed/i);
      expect(response.body.message).not.toMatch(/you'(re| are) behind/i);
      expect(response.body.message).not.toMatch(/punitive/i);
      expect(response.body.message).not.toMatch(/shame/i);

      // No existence oracle: the principal id never rides in the payload.
      expect(JSON.stringify(response.body)).not.toContain(student.id);
      expect(JSON.stringify(response.body)).not.toContain('userId');
    });

    it('a deleted principal is rejected at the guard — never a distinct message from the route', async () => {
      const ghost = await registerAndLogin('catchup-ghost');
      await app.prisma.user.delete({ where: { id: ghost.id } });

      // The global JWT guard verifies the principal against the user table,
      // so a deleted student never reaches the route at all: the HTTP answer
      // is the guard's 401. The route-level uniform 404 for a principal with
      // no data/foreign rows is pinned in the unit spec and below.
      const response = await agent
        .get('/study-plans/recovery-summary')
        .set('Authorization', `Bearer ${ghost.accessToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
      expect(response.body.message).not.toBe('Resource not found');
    });

    it('all three catch-up routes 401 unauthenticated (global guard)', async () => {
      await agent.get('/study-plans/recovery-summary').expect(HttpStatus.UNAUTHORIZED);
      await agent.post('/study-plans/catch-up/preview').expect(HttpStatus.UNAUTHORIZED);
      await agent
        .post('/study-plans/catch-up/confirm')
        .send({ from, to, sessions: [] })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ==================== POST /study-plans/catch-up/preview ====================

  describe('catch-up preview (TR-E08-04, decline-safety)', () => {
    it('returns the contract key set over the server-derived seven-day window', async () => {
      const response = await catchUpPreview(student).expect(HttpStatus.OK);

      expect(Object.keys(response.body).sort()).toEqual([
        'completedPreserved',
        'days',
        'deferred',
        'from',
        'generatedAt',
        'lockedPreserved',
        'missedSessions',
        'preferences',
        'timeZone',
        'to',
        'warnings',
      ]);
      expect(response.body.from).toBe(from);
      expect(response.body.to).toBe(to);
      expect(response.body.days.map((d: { date: string }) => d.date)).toEqual(
        Array.from({ length: 7 }, (_, i) => addDaysCivil(from, i))
      );
      for (const day of response.body.days) {
        expect(Object.keys(day).sort()).toEqual(['date', 'sessions', 'targetMinutes']);
      }
      // A freshly registered student has no stored zone → documented UTC.
      expect(response.body.timeZone).toBe('UTC');
      expect(typeof response.body.lockedPreserved).toBe('number');
      expect(typeof response.body.completedPreserved).toBe('number');

      // The seeded missed rows are the ones reported — the same classification
      // as the summary read (one rule, one result).
      expect(response.body.missedSessions.map((s: { id: string }) => s.id).sort()).toEqual(
        [missedLockedRowId, missedOpenRowId].sort()
      );
    });

    it('is side-effect-free against the real database — preview then decline leaves state untouched', async () => {
      const before = await snapshot();

      const first = await catchUpPreview(student).expect(HttpStatus.OK);
      const second = await catchUpPreview(student).expect(HttpStatus.OK);

      // Repeated previews agree (minus the generatedAt instant).
      expect({ ...second.body, generatedAt: null }).toEqual({ ...first.body, generatedAt: null });

      expect(await snapshot()).toEqual(before);
    });
  });

  // ==================== POST /study-plans/catch-up/confirm ====================

  describe('catch-up confirm (TR-E08-04)', () => {
    const proposal = () => ({
      from,
      to,
      sessions: [
        {
          assignmentId: assignmentA.id,
          date: addDaysCivil(from, 1),
          startTime: '15:00',
          endTime: '16:00',
        },
        {
          assignmentId: assignmentB.id,
          date: addDaysCivil(from, 2),
          startTime: '20:00',
          endTime: '21:00',
        },
      ],
    });

    let lockedBefore: ReturnType<typeof pick>;
    let completedBefore: ReturnType<typeof pick>;
    let sessionsBefore: Record<string, unknown>;

    /** The immutable identity + value fields of a planned row (excludes the
     * mutable `updatedAt` audit stamp on purpose). */
    const pick = (row: unknown) => {
      if (!row) return undefined;
      const r = row as {
        id: string;
        studyPlanId: string;
        assignmentId: string;
        startTime: Date;
        endTime: Date;
        durationMinutes: number;
        status: string;
        locked: boolean;
      };
      return {
        id: r.id,
        studyPlanId: r.studyPlanId,
        assignmentId: r.assignmentId,
        startTime: r.startTime,
        endTime: r.endTime,
        durationMinutes: r.durationMinutes,
        status: r.status,
        locked: r.locked,
      };
    };

    beforeAll(async () => {
      // The preservation baselines + the untouched-table baselines, captured
      // immediately before the only successful confirm of this student.
      lockedBefore = pick(
        await app.prisma.plannedSession.findUnique({ where: { id: windowLockedRowId } })
      );
      completedBefore = pick(
        await app.prisma.plannedSession.findUnique({ where: { id: windowCompletedRowId } })
      );
      sessionsBefore = await snapshot();
    });

    it('persists the proposal atomically and preserves locked/completed rows field-for-field', async () => {
      const response = await catchUpConfirm(student, proposal()).expect(HttpStatus.CREATED);

      // The echo is the EP06 `SavedPlan` contract.
      expect(response.body).toMatchObject({ from, to, timeZone: 'UTC' });
      expect(response.body.days).toHaveLength(7);

      // Rows written: SCHEDULED, unlocked, on the submitted slots. The
      // status/locked filter is what separates the new rows from the two
      // fixtures the confirm had to PRESERVE in the same window (the locked
      // row and the COMPLETED row) — asserted unchanged further below.
      const written = await app.prisma.plannedSession.findMany({
        where: {
          studyPlan: {
            userId: student.id,
            date: { gte: instant(from, '00:00'), lte: instant(to, '00:00') },
          },
          status: 'SCHEDULED',
          locked: false,
        },
      });
      expect(written.map((r) => `${r.assignmentId}@${r.startTime.toISOString()}`).sort()).toEqual(
        [
          `${assignmentA.id}@${instant(addDaysCivil(from, 1), '15:00').toISOString()}`,
          `${assignmentB.id}@${instant(addDaysCivil(from, 2), '20:00').toISOString()}`,
        ].sort()
      );
      for (const row of written) {
        expect(row).toMatchObject({ status: 'SCHEDULED', locked: false, durationMinutes: 60 });
      }

      // targetHours recomputed from what was actually placed (60 → 1h), and
      // every day of the window has a plan row (0 for the empty days).
      const plans = await app.prisma.studyPlan.findMany({
        where: {
          userId: student.id,
          date: { gte: instant(from, '00:00'), lte: instant(to, '00:00') },
        },
        orderBy: { date: 'asc' },
      });
      expect(plans).toHaveLength(7);
      const hours = new Map(plans.map((p) => [p.date.toISOString().slice(0, 10), p.targetHours]));
      expect(hours.get(addDaysCivil(from, 1))).toBe(1);
      expect(hours.get(addDaysCivil(from, 2))).toBe(1);
      expect(hours.get(addDaysCivil(from, 4))).toBe(0);

      // Preservation: the locked and completed rows are byte-identical
      // (except the mutable audit stamp, which the picks above exclude).
      expect(
        pick(await app.prisma.plannedSession.findUnique({ where: { id: windowLockedRowId } }))
      ).toEqual(lockedBefore);
      expect(
        pick(await app.prisma.plannedSession.findUnique({ where: { id: windowCompletedRowId } }))
      ).toEqual(completedBefore);

      // Only plan rows and planned sessions moved: no Assignment, StudySession
      // or User write.
      const after = await snapshot();
      expect({
        studySession: after.studySession,
        assignment: after.assignment,
        user: after.user,
      }).toEqual({
        studySession: (sessionsBefore as typeof after).studySession,
        assignment: (sessionsBefore as typeof after).assignment,
        user: (sessionsBefore as typeof after).user,
      });
    });

    it('resubmitting the same window replaces its own rows — the unedited resubmit never 409s (PR-002)', async () => {
      await catchUpConfirm(student, proposal()).expect(HttpStatus.CREATED);

      // The rows placed by the first confirm are exactly the rows the second
      // call replaces (SCHEDULED, unlocked): busy-exclusion by the shared
      // rule, proven with the PREVIOUS write in the database.
      const replaced = await app.prisma.plannedSession.findMany({
        where: {
          studyPlan: {
            userId: student.id,
            date: { gte: instant(from, '00:00'), lte: instant(to, '00:00') },
          },
          status: 'SCHEDULED',
          locked: false,
        },
      });
      expect(replaced).toHaveLength(2);
    });

    it('the written plan is readable through GET /study-plans with the unchanged SavedPlan shape (P-03 pin)', async () => {
      const response = await agent
        .get('/study-plans')
        .query({ from, to })
        .set('Authorization', `Bearer ${student.accessToken}`)
        .expect(HttpStatus.OK);

      expect(Object.keys(response.body).sort()).toEqual(['days', 'from', 'timeZone', 'to']);
      const day1 = response.body.days.find(
        (d: { date: string }) => d.date === addDaysCivil(from, 1)
      );
      const saved = day1.sessions.find((s: { id: string }) => s.id === windowLockedRowId);
      // The preserved locked row is readable…
      expect(saved).toBeTruthy();
      expect(saved).toMatchObject({ status: 'SCHEDULED', durationMinutes: 60 });
      // …and the SavedPlan session shape is UNCHANGED by EP08 — no `locked`
      // key leaks into the EP06 contract (review polish P-03 disposition).
      expect(Object.keys(saved).sort()).toEqual([
        'assignmentId',
        'assignmentTitle',
        'durationMinutes',
        'endTime',
        'id',
        'startTime',
        'status',
      ]);
    });

    it('409s WINDOW_ROLLED_OVER when the window left the tolerance, and writes nothing', async () => {
      const before = await snapshot();
      const staleFrom = addDaysCivil(from, -7);
      const response = await catchUpConfirm(student, {
        from: staleFrom,
        to: addDaysCivil(staleFrom, 6),
        sessions: [],
      }).expect(HttpStatus.CONFLICT);
      expect(response.body).toMatchObject({ error: 'WINDOW_ROLLED_OVER' });
      expect(await snapshot()).toEqual(before);
    });

    it('rejects the malformed matrix through the real validation pipe, writing nothing', async () => {
      const before = await snapshot();

      // Unknown top-level field (forbidNonWhitelisted).
      await catchUpConfirm(student, {
        from,
        to,
        sessions: [],
        extra: true,
      }).expect(HttpStatus.BAD_REQUEST);

      const blank = await catchUpConfirm(student, {
        from,
        to,
        sessions: [{ assignmentId: '   ', date: from, startTime: '10:00', endTime: '11:00' }],
      }).expect(HttpStatus.BAD_REQUEST);
      expect(blank.body.errors).toHaveProperty(['sessions.0.assignmentId']);

      const reversed = await catchUpConfirm(student, {
        from,
        to,
        sessions: [
          { assignmentId: assignmentA.id, date: from, startTime: '11:00', endTime: '10:00' },
        ],
      }).expect(HttpStatus.BAD_REQUEST);
      expect(reversed.body.errors).toHaveProperty(['sessions.0.endTime']);

      // A window that is not exactly seven days.
      const short = await catchUpConfirm(student, {
        from,
        to: addDaysCivil(from, 5),
        sessions: [],
      }).expect(HttpStatus.BAD_REQUEST);
      expect(short.body.errors.to[0]).toContain('six days after from');

      expect(await snapshot()).toEqual(before);
    });

    it('foreign and missing assignment ids return the IDENTICAL uniform 404 — no existence oracle', async () => {
      const before = await snapshot();

      const foreignBody = await catchUpConfirm(student, {
        from,
        to,
        sessions: [
          { assignmentId: foreignAssignmentId, date: from, startTime: '10:00', endTime: '11:00' },
        ],
      }).expect(HttpStatus.NOT_FOUND);
      const missingBody = await catchUpConfirm(student, {
        from,
        to,
        sessions: [{ assignmentId: uuidv4(), date: from, startTime: '10:00', endTime: '11:00' }],
      }).expect(HttpStatus.NOT_FOUND);

      expect(foreignBody.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });
      // Identical modulo the response timestamp: a probing student cannot
      // tell "not yours" from "does not exist" from any response content.
      expect({ ...foreignBody.body, timestamp: null }).toEqual({
        ...missingBody.body,
        timestamp: null,
      });

      expect(await snapshot()).toEqual(before);
    });

    it('there is NO server decline route — decline is client-side by contract', async () => {
      const response = await agent
        .post('/study-plans/catch-up/decline')
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({});
      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      // The framework's no-route 404, not the domain's uniform 404.
      expect(response.body.message).not.toBe('Resource not found');
    });
  });

  // ==================== the 409 conflict reason matrix (fresh student) ====================

  describe('confirm conflict re-check over real rows (TR-E08-04)', () => {
    it('attributes every conflict reason per session: locked/completed, class, blocked, submitted-vs-submitted', async () => {
      const body = {
        from,
        to,
        sessions: [
          {
            assignmentId: conflictAssignment.id,
            date: addDaysCivil(from, 1),
            startTime: '10:30',
            endTime: '11:30',
          }, // locked planned row
          {
            assignmentId: conflictAssignment.id,
            date: addDaysCivil(from, 2),
            startTime: '09:30',
            endTime: '10:30',
          }, // COMPLETED planned row
          {
            assignmentId: conflictAssignment.id,
            date: addDaysCivil(from, 3),
            startTime: '13:30',
            endTime: '14:30',
          }, // real ClassMeeting
          {
            assignmentId: conflictAssignment.id,
            date: addDaysCivil(from, 4),
            startTime: '15:30',
            endTime: '16:30',
          }, // real blocked AvailabilitySlot
          {
            assignmentId: conflictAssignment.id,
            date: addDaysCivil(from, 5),
            startTime: '09:00',
            endTime: '10:00',
          }, // submitted pair
          {
            assignmentId: conflictAssignment.id,
            date: addDaysCivil(from, 5),
            startTime: '09:30',
            endTime: '10:30',
          },
        ],
      };
      const before = await snapshot();

      const response = await catchUpConfirm(conflictStudent, body).expect(HttpStatus.CONFLICT);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
      });
      const byIndex = new Map(
        (response.body.conflicts as Array<{ sessionIndex: number; reason: string }>).map((c) => [
          c.sessionIndex,
          c.reason,
        ])
      );
      // The contract's closed reason set, attributed by the shared precedence
      // (class > blocked > confirmed > submitted). Locked/completed planned
      // rows surface as OVERLAPS_CONFIRMED_SESSION — the current
      // contract-compliant mapping (review polish P-02: no fifth code exists;
      // a distinct code would be a contract change, routed to the planner).
      expect(byIndex.get(0)).toBe('OVERLAPS_CONFIRMED_SESSION');
      expect(byIndex.get(1)).toBe('OVERLAPS_CONFIRMED_SESSION');
      expect(byIndex.get(2)).toBe('OVERLAPS_CLASS');
      expect(byIndex.get(3)).toBe('OVERLAPS_BLOCKED_TIME');
      expect(byIndex.get(4)).toBe('OVERLAPS_PLANNED_SESSION');
      expect(byIndex.get(5)).toBe('OVERLAPS_PLANNED_SESSION');
      for (const conflict of response.body.conflicts) {
        expect(Object.keys(conflict).sort()).toEqual([
          'date',
          'reason',
          'sessionIndex',
          'startTime',
        ]);
      }

      // A rejected confirm writes nothing at all — including the locked
      // fixture the request collided with.
      expect(await snapshot()).toEqual(before);
      const locked = await app.prisma.plannedSession.findUnique({
        where: { id: conflictCLockedId },
      });
      expect(locked).toMatchObject({ locked: true, status: 'SCHEDULED' });
    });
  });
});
