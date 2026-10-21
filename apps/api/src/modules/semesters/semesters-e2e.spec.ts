import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * SP-110C e2e spec: the semester management feature as a **student journey**,
 * over real HTTP against a real PostgreSQL database (the `test-http` harness
 * carries the real semesters + courses modules — `main.ts` parity).
 *
 * This is the cross-layer wire proof the SP-110A/B children bracketed from
 * their own sides (SP-106D/SP-107F precedent):
 *
 * - AC1 full lifecycle (one student, in order): `POST /semesters` ×2 (the
 *   SP-107B endpoint, 7-key shape, `isActive: false`) → `GET /semesters`
 *   (startDate desc, `SemesterWithCount`, `courseCount`) →
 *   `GET /semesters/:id` (8 keys) → `PATCH` rename + re-date (merged values)
 *   → `PATCH { isActive: true }` (single-active proof: the student's other
 *   semester deactivates, D110-1) → attach two courses →
 *   `DELETE /semesters/:id` (204; the semester row is gone, the course rows
 *   survive with `semesterId: null`, D110-2) → the list re-derives to the
 *   remaining semester. *(AC-E02-01, D110-1/2, DoD 8/10)*
 * - AC2 cross-student matrix: student B attempts GET / PATCH / DELETE on A's
 *   semester id → uniform 404 `Resource not found`; A's row is byte-identical
 *   (the existence oracle is closed); B's list never contains A's ids.
 *   *(AC-E01-04, DoD 3)*
 * - Single-active race (D110-1): two parallel `PATCH { isActive: true }` on
 *   different semesters → both 200, exactly one active afterwards
 *   (last-write-wins; the invariant, not a winner/loser error, is the
 *   contract).
 *
 * The `semesters-data-scoping.spec.ts` sibling pins each route in isolation;
 * this spec proves the routes **together** as the feature the UI (SP-110B)
 * drives. The cases are ordered as the student journey and each asserts on
 * real rows via the harness `prisma` handle. The cases within the suite are
 * state-dependent by design (a journey, not a set of isolated requests).
 *
 * Self-skips when `DATABASE_URL` is unset (the SP-104/SP-105/SP-106/SP-107A
 * convention), so a bare local `pnpm test` still works; the verification
 * run supplies `DATABASE_URL` so the suite executes with zero skips.
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/** The exact 201 contract keys — nothing more (SP-107B shape, unchanged). */
const SEMESTER_KEYS = [
  'createdAt',
  'endDate',
  'id',
  'isActive',
  'name',
  'startDate',
  'updatedAt',
].sort();

/** The `SemesterWithCount` contract keys (SP-110A, D110-3). */
const SEMESTER_WITH_COUNT_KEYS = [...SEMESTER_KEYS, 'courseCount'].sort();

/**
 * The exact `POST /courses` 201 contract keys — the `CourseWithSemester`
 * shape (SP-111A, D111-4): the SP-107B 8 keys plus `instructor`,
 * `semesterId`, `semester` (backward-compatible; the onboarding wizard
 * ignores the extra keys).
 */
const COURSE_KEYS = [
  'code',
  'color',
  'createdAt',
  'credits',
  'description',
  'id',
  'instructor',
  'isActive',
  'name',
  'semester',
  'semesterId',
  'updatedAt',
].sort();

describeIntegration('semester management end-to-end (real database, SP-110C)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string): string =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-semester-e2e`;

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  // Non-optional by type: if seeding fails, the suite fails in beforeAll
  // (afterAll's filter keeps cleanup from crashing on partial seeding).
  let studentA: Student; // the lifecycle + race journey (AC1, race)
  let studentB: Student; // the cross-student matrix (AC2)

  interface Student {
    id: string;
    email: string;
    accessToken: string;
  }

  // Rows created during the journey (for row-level assertions).
  let fallId: string;
  let springId: string;
  let concurrentOneId: string;
  let concurrentTwoId: string;
  const courseIds: string[] = [];

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

  function getSemesters(session: Student) {
    return agent.get('/semesters').set('Authorization', `Bearer ${session.accessToken}`);
  }

  function patchSemester(session: Student, id: string, body: Record<string, unknown>) {
    return agent
      .patch(`/semesters/${id}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send(body);
  }

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());

    studentA = await registerAndLogin('student-a');
    studentB = await registerAndLogin('student-b');
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    // Deleting the users cascades (onDelete: Cascade) to their semesters
    // and courses.
    await app.prisma.user.deleteMany({
      where: {
        id: { in: [studentA?.id, studentB?.id].filter((id): id is string => Boolean(id)) },
      },
    });
    await app.app.close();
  }, 60_000);

  // ==================== AC1 — full lifecycle (student A) ====================

  describe('AC1 — full lifecycle (AC-E02-01, D110-1/2, DoD 8/10)', () => {
    it('POST /semesters ×2 (SP-107B endpoint): 201, exact 7-key shape, isActive false', async () => {
      const fall = await agent
        .post('/semesters')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ name: `Fall ${runId}`, startDate: '2026-09-01', endDate: '2026-12-15' })
        .expect(HttpStatus.CREATED);
      expect(Object.keys(fall.body).sort()).toEqual(SEMESTER_KEYS);
      expect(fall.body).toMatchObject({
        name: `Fall ${runId}`,
        startDate: '2026-09-01',
        endDate: '2026-12-15',
        isActive: false,
      });
      fallId = fall.body.id;

      const spring = await agent
        .post('/semesters')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ name: `Spring ${runId}`, startDate: '2026-01-10', endDate: '2026-05-01' })
        .expect(HttpStatus.CREATED);
      expect(Object.keys(spring.body).sort()).toEqual(SEMESTER_KEYS);
      springId = spring.body.id;

      // Both rows exist, are owned by A, and are inactive (the schema
      // default — creation never activates, D110-1).
      const rows = await app.prisma.semester.findMany({ where: { userId: studentA.id } });
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.userId).toBe(studentA.id);
        expect(row.isActive).toBe(false);
      }
    });

    it('GET /semesters: both rows in startDate desc order, 8 keys each, courseCount 0', async () => {
      const response = await getSemesters(studentA).expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      // startDate desc: Fall (2026-09-01) before Spring (2026-01-10).
      expect(response.body.map((row: { id: string }) => row.id)).toEqual([fallId, springId]);
      for (const row of response.body) {
        expect(Object.keys(row).sort()).toEqual(SEMESTER_WITH_COUNT_KEYS);
        expect(row.courseCount).toBe(0);
        expect(row.isActive).toBe(false);
      }
      // The wire carries calendar dates, never instants (D107-7).
      expect(response.body[0].startDate).toBe('2026-09-01');
      expect(response.body[0].endDate).toBe('2026-12-15');
    });

    it('GET /semesters/:id: the own semester in the SemesterWithCount shape', async () => {
      const response = await agent
        .get(`/semesters/${fallId}`)
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .expect(HttpStatus.OK);

      expect(Object.keys(response.body).sort()).toEqual(SEMESTER_WITH_COUNT_KEYS);
      expect(response.body).toMatchObject({
        id: fallId,
        name: `Fall ${runId}`,
        startDate: '2026-09-01',
        endDate: '2026-12-15',
        isActive: false,
        courseCount: 0,
      });
    });

    it('PATCH rename + re-date: the merged values come back, 8 keys', async () => {
      const response = await patchSemester(studentA, fallId, {
        name: `Fall Renamed ${runId}`,
        startDate: '2026-08-20',
        endDate: '2026-12-20',
      }).expect(HttpStatus.OK);

      expect(Object.keys(response.body).sort()).toEqual(SEMESTER_WITH_COUNT_KEYS);
      expect(response.body).toMatchObject({
        id: fallId,
        name: `Fall Renamed ${runId}`,
        startDate: '2026-08-20',
        endDate: '2026-12-20',
        isActive: false,
        courseCount: 0,
      });

      // The row agrees (the wire is not the source of truth — the row is).
      const row = await app.prisma.semester.findUnique({ where: { id: fallId } });
      expect(row!.name).toBe(`Fall Renamed ${runId}`);
    });

    it('PATCH { isActive: true } on Spring: single-active — Fall deactivates (D110-1)', async () => {
      const response = await patchSemester(studentA, springId, { isActive: true }).expect(
        HttpStatus.OK
      );
      expect(response.body.isActive).toBe(true);

      // The invariant on the rows: exactly one active for A — the student's
      // other semester was deactivated in the same transaction.
      const active = await app.prisma.semester.findMany({
        where: { userId: studentA.id, isActive: true },
      });
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(springId);
    });

    it('DELETE /semesters/:id (Fall): 204; the row is gone; its two courses survive with semesterId null (D110-2)', async () => {
      // Attach two courses to Fall (the SP-107B endpoint, extended with the
      // `CourseWithSemester` shape by SP-111A; the row is the source of
      // truth for the attachment).
      for (const suffix of ['A', 'B']) {
        const course = await agent
          .post('/courses')
          .set('Authorization', `Bearer ${studentA.accessToken}`)
          .send({ code: `CS${runId}${suffix}`, name: `Course ${suffix}`, semesterId: fallId })
          .expect(HttpStatus.CREATED);
        expect(Object.keys(course.body).sort()).toEqual(COURSE_KEYS);
        courseIds.push(course.body.id);
      }

      const attached = await app.prisma.course.findMany({
        where: { userId: studentA.id, semesterId: fallId },
      });
      expect(attached).toHaveLength(2);

      // The list now reports the attached courses (D110-3, all archive states).
      const list = await getSemesters(studentA).expect(HttpStatus.OK);
      const fallRow = list.body.find((row: { id: string }) => row.id === fallId);
      expect(fallRow.courseCount).toBe(2);

      await agent
        .delete(`/semesters/${fallId}`)
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .expect(HttpStatus.NO_CONTENT);

      // The semester row is gone…
      expect(await app.prisma.semester.findUnique({ where: { id: fallId } })).toBeNull();

      // …and the course rows survive, orphaned (unaffiliated), not destroyed.
      const courses = await app.prisma.course.findMany({
        where: { id: { in: courseIds } },
      });
      expect(courses).toHaveLength(2);
      for (const course of courses) {
        expect(course.userId).toBe(studentA.id);
        expect(course.semesterId).toBeNull();
      }
    });

    it('GET /semesters after the delete: only Spring remains (the list re-derives)', async () => {
      const response = await getSemesters(studentA).expect(HttpStatus.OK);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(springId);
      expect(response.body[0].courseCount).toBe(0);
      expect(response.body[0].isActive).toBe(true);
    });
  });

  // ==================== AC2 — cross-student matrix ====================

  describe('AC2 — cross-student matrix (AC-E01-04, DoD 3)', () => {
    let springBefore: {
      id: string;
      userId: string;
      name: string;
      startDate: Date;
      endDate: Date;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    } | null;

    beforeAll(async () => {
      // Spring is A's surviving (active) semester after the AC1 journey.
      springBefore = await app.prisma.semester.findUnique({ where: { id: springId } });
    });

    it("B's GET / PATCH / DELETE on A's semester id → uniform 404; A's row byte-identical", async () => {
      await agent
        .get(`/semesters/${springId}`)
        .set('Authorization', `Bearer ${studentB.accessToken}`)
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body.message).toBe('Resource not found');
        });

      await patchSemester(studentB, springId, { name: 'Hacked by B' }).expect(HttpStatus.NOT_FOUND);

      await agent
        .delete(`/semesters/${springId}`)
        .set('Authorization', `Bearer ${studentB.accessToken}`)
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body.message).toBe('Resource not found');
        });

      // None of B's attempts wrote anything: the row is byte-identical under
      // an unscoped read (no existence oracle, no partial write).
      const springAfter = await app.prisma.semester.findUnique({ where: { id: springId } });
      expect(springAfter).toEqual(springBefore);
      expect(springAfter!.userId).toBe(studentA.id);
    });

    it("B's list never contains A's semester ids (wire-level scoping)", async () => {
      const response = await getSemesters(studentB).expect(HttpStatus.OK);
      // B registered no semesters in this suite — the list is empty, and in
      // particular A's ids never appear.
      expect(response.body).toHaveLength(0);
      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain(fallId);
      expect(serialized).not.toContain(springId);
    });
  });

  // ==================== Single-active race (D110-1) ====================

  describe('single-active race (D110-1)', () => {
    it('two parallel PATCH { isActive: true } → both 200; exactly one active afterwards (last-write-wins)', async () => {
      const one = await agent
        .post('/semesters')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ name: `Concurrent One ${runId}`, startDate: '2027-01-01', endDate: '2027-02-01' })
        .expect(HttpStatus.CREATED);
      concurrentOneId = one.body.id;
      const two = await agent
        .post('/semesters')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ name: `Concurrent Two ${runId}`, startDate: '2027-03-01', endDate: '2027-04-01' })
        .expect(HttpStatus.CREATED);
      concurrentTwoId = two.body.id;

      // A stale client and a fresh one both "set as active" at the same
      // moment (Spring is the currently active semester at this point).
      const [first, second] = await Promise.all([
        patchSemester(studentA, concurrentOneId, { isActive: true }).expect(HttpStatus.OK),
        patchSemester(studentA, concurrentTwoId, { isActive: true }).expect(HttpStatus.OK),
      ]);
      // Both requests succeed — the contract is the invariant, not a
      // winner/loser error.
      expect(first.body.isActive).toBe(true);
      expect(second.body.isActive).toBe(true);

      // After either interleaving, at most one of A's semesters is active —
      // and it is one of the two raced targets (the loser's choice is
      // overwritten by the later transaction; Spring is deactivated).
      const active = await app.prisma.semester.findMany({
        where: { userId: studentA.id, isActive: true },
      });
      expect(active).toHaveLength(1);
      expect([concurrentOneId, concurrentTwoId]).toContain(active[0].id);
      const spring = await app.prisma.semester.findUnique({ where: { id: springId } });
      expect(spring!.isActive).toBe(false);
    });
  });
});
