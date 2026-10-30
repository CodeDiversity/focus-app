import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * EP06A + EP06B data-scoping spec (integration, real database): the
 * ownership invariant of the study-planning surface (DoD 3, the parent
 * README's security invariants).
 *
 * The preferences routes are principal-scoped by construction — there is no id
 * in the path and no id in the body — so the matrix this spec pins is:
 *
 * - A's `GET`/`PUT` read and write **A's own row only**; B's `GET`/`PUT`
 *   read and write **B's own row only**; neither student can see or change
 *   the other's study defaults (no existence oracle, no cross-write).
 * - The projection never exposes `userId` (nor any other key of the
 *   preferences bag) — the strongest assertion is the exact key set plus a
 *   check that neither student's id appears anywhere in the payload.
 * - The write is scoped to the principal's own row: B's write leaves A's
 *   stored `preferences` column byte-identical.
 *
 * The remaining-work read (EP06B) has the same invariant over **two** reads:
 * the student's assignments and the `StudySession` aggregation. A second
 * student's assignment and a second student's session must both be invisible —
 * otherwise another student's work would appear in the list and another
 * student's study time would inflate this student's unattributed total
 * (the parent README's "another student's study time cannot inflate this
 * student's remaining work" invariant).
 *
 * Self-skips when `DATABASE_URL` is unset (the SP-104/SP-105/SP-106/SP-128A
 * convention), so a bare local `pnpm test` still works.
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/** The exact contract keys (shared API contract, EP06 README). */
const PREFERENCE_KEYS = [
  'sessionLengthMinutes',
  'minSessionMinutes',
  'maxSessionMinutes',
  'dailyCapMinutes',
].sort();

/** The documented defaults (D06-4). */
const DEFAULTS = {
  sessionLengthMinutes: 60,
  minSessionMinutes: 15,
  maxSessionMinutes: 120,
  dailyCapMinutes: 240,
};

describeIntegration('study preferences data scoping (integration, real database)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string): string =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-prefs-scope`;

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  // Non-optional by type: if seeding fails, the suite fails in beforeAll
  // (afterAll's filter keeps cleanup from crashing on partial seeding).
  let studentA: Student;
  let studentB: Student;

  interface Student {
    id: string;
    email: string;
    accessToken: string;
  }

  async function registerAndLogin(label: string): Promise<Student> {
    const email = uniqueEmail(label);

    // No Authorization header on purpose: these are the allowlisted public routes.
    const registration = await agent
      .post('/auth/register')
      .send({ name: `Student ${label}`, email, password })
      .expect(HttpStatus.CREATED);
    expect(registration.body).toMatchObject({ email });

    const login = await agent.post('/auth/login').send({ email, password }).expect(HttpStatus.OK);
    expect(login.body.accessToken).toBeTruthy();

    return { id: login.body.user.id, email, accessToken: login.body.accessToken };
  }

  function getPreferences(session: Student) {
    return agent.get('/study-preferences').set('Authorization', `Bearer ${session.accessToken}`);
  }

  function putPreferences(session: Student, body: Record<string, unknown>) {
    return agent
      .put('/study-preferences')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send(body);
  }

  function getRemainingWork(session: Student) {
    return agent
      .get('/study-plans/remaining-work')
      .set('Authorization', `Bearer ${session.accessToken}`);
  }

  /** Seed one assignment for a student (direct write: the fixture). */
  async function seedAssignment(
    student: Student,
    data: { title: string; estimatedHours?: number | null; dueDate?: Date | null; status?: string }
  ) {
    return app.prisma.assignment.create({
      data: {
        userId: student.id,
        title: data.title,
        estimatedHours: data.estimatedHours ?? 2,
        dueDate: data.dueDate === undefined ? new Date('2099-01-01T12:00:00.000Z') : data.dueDate,
        status: (data.status ?? 'PENDING') as 'PENDING',
        priority: 'MEDIUM',
      },
    });
  }

  /** Seed one study session for a student (direct write: the fixture). */
  async function seedSession(student: Student, durationMinutes: number) {
    return app.prisma.studySession.create({
      data: {
        userId: student.id,
        startTime: new Date('2026-10-28T14:00:00.000Z'),
        endTime: new Date('2026-10-28T15:00:00.000Z'),
        durationMinutes,
      },
    });
  }

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());

    studentA = await registerAndLogin('student-a');
    studentB = await registerAndLogin('student-b');
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    // Deleting the users cascades (onDelete: Cascade) to their rows.
    await app.prisma.user.deleteMany({
      where: {
        id: { in: [studentA?.id, studentB?.id].filter((id): id is string => Boolean(id)) },
      },
    });
    await app.app.close();
  }, 60_000);

  // ============ The read is the principal's own (DoD 3) ============

  it("each student reads their own effective defaults — never another student's", async () => {
    // A saves a distinctive value; B must not see it.
    await putPreferences(studentA, { sessionLengthMinutes: 45 }).expect(HttpStatus.OK);

    const bRead = await getPreferences(studentB).expect(HttpStatus.OK);
    expect(bRead.body).toEqual(DEFAULTS);

    const aRead = await getPreferences(studentA).expect(HttpStatus.OK);
    expect(aRead.body).toEqual({
      sessionLengthMinutes: 45,
      minSessionMinutes: 15,
      maxSessionMinutes: 120,
      dailyCapMinutes: 240,
    });
  });

  it('the projection never exposes userId (and never another student’s id)', async () => {
    for (const student of [studentA, studentB]) {
      const response = await getPreferences(student).expect(HttpStatus.OK);

      expect(Object.keys(response.body).sort()).toEqual(PREFERENCE_KEYS);
      expect(response.body).not.toHaveProperty('userId');
      expect(response.body).not.toHaveProperty('preferences');

      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain(studentA.id);
      expect(serialized).not.toContain(studentB.id);
    }
  });

  // ============ The write is the principal's own row (DoD 3) ============

  it('B’s PUT leaves A’s stored preferences column byte-identical', async () => {
    const aBefore = await app.prisma.user.findUnique({
      where: { id: studentA.id },
      select: { preferences: true },
    });

    await putPreferences(studentB, { sessionLengthMinutes: 90, dailyCapMinutes: 300 }).expect(
      HttpStatus.OK
    );

    const aAfter = await app.prisma.user.findUnique({
      where: { id: studentA.id },
      select: { preferences: true },
    });
    expect(aAfter).toEqual(aBefore);

    // And B's own row carries B's values.
    const bStored = await app.prisma.user.findUnique({
      where: { id: studentB.id },
      select: { preferences: true },
    });
    expect(bStored?.preferences).toMatchObject({
      studyDefaults: {
        sessionLengthMinutes: 90,
        minSessionMinutes: 15,
        maxSessionMinutes: 120,
        dailyCapMinutes: 300,
      },
    });
  });

  it('A’s PUT leaves B’s stored preferences column byte-identical', async () => {
    const bBefore = await app.prisma.user.findUnique({
      where: { id: studentB.id },
      select: { preferences: true },
    });

    await putPreferences(studentA, { maxSessionMinutes: 180 }).expect(HttpStatus.OK);

    const bAfter = await app.prisma.user.findUnique({
      where: { id: studentB.id },
      select: { preferences: true },
    });
    expect(bAfter).toEqual(bBefore);
  });

  it('no token → 401 on both routes (global guard)', async () => {
    await agent.get('/study-preferences').expect(HttpStatus.UNAUTHORIZED);
    await agent
      .put('/study-preferences')
      .send({ sessionLengthMinutes: 45 })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ============ the remaining-work read (EP06B, DoD 3) ============

  describe('the remaining-work read is the principal’s own', () => {
    it('each student sees only their own assignments', async () => {
      const aAssignment = await seedAssignment(studentA, { title: 'A’s homework' });
      const bAssignment = await seedAssignment(studentB, { title: 'B’s homework' });

      const aRead = await getRemainingWork(studentA).expect(HttpStatus.OK);
      const bRead = await getRemainingWork(studentB).expect(HttpStatus.OK);

      expect(aRead.body.items.map((item: { assignmentId: string }) => item.assignmentId)).toEqual([
        aAssignment.id,
      ]);
      expect(bRead.body.items.map((item: { assignmentId: string }) => item.assignmentId)).toEqual([
        bAssignment.id,
      ]);
    });

    it('a second student’s session cannot inflate this student’s unattributed total', async () => {
      await seedSession(studentA, 45);
      await seedSession(studentB, 90);

      const aRead = await getRemainingWork(studentA).expect(HttpStatus.OK);
      const bRead = await getRemainingWork(studentB).expect(HttpStatus.OK);

      expect(aRead.body.unattributedConfirmedMinutes).toBe(45);
      expect(bRead.body.unattributedConfirmedMinutes).toBe(90);
    });

    it('the projection never exposes userId (and never another student’s id)', async () => {
      await seedAssignment(studentA, { title: 'A’s homework' });

      for (const student of [studentA, studentB]) {
        const response = await getRemainingWork(student).expect(HttpStatus.OK);

        expect(Object.keys(response.body).sort()).toEqual([
          'items',
          'unattributedConfirmedMinutes',
        ]);
        for (const item of response.body.items) {
          expect(item).not.toHaveProperty('userId');
          expect(Object.keys(item).sort()).toEqual([
            'assignmentId',
            'confirmedMinutes',
            'courseCode',
            'dueDate',
            'estimatedMinutes',
            'flagged',
            'remainingMinutes',
            'status',
            'title',
          ]);
        }

        const serialized = JSON.stringify(response.body);
        expect(serialized).not.toContain(studentA.id);
        expect(serialized).not.toContain(studentB.id);
      }
    });

    it('no token → 401 on the remaining-work read (global guard)', async () => {
      await agent.get('/study-plans/remaining-work').expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
