import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';
import { formatCalendarDate } from '../../common/lib/calendar-date';

/**
 * Semesters integration spec: the full management surface on the real
 * stack, over real HTTP against a real database (the `test-http` harness,
 * real Prisma against Postgres).
 *
 * SP-107B: `POST /semesters`
 * - 201 shape: the frontend `Semester` type exactly — dates serialized
 *   `yyyy-MM-dd` (D107-7), `isActive` the schema default `false`.
 * - Validation: invalid dates (`end < start`, `end == start`, malformed) →
 *   400 with the field in the `errors` map; unknown field → 400 (global
 *   `forbidNonWhitelisted`).
 * - Duplicates: same name for the same student → 409 with the specific
 *   message; the same name for another student → 201 (the unique constraint
 *   is per student).
 * - Persistence: the created semester is re-read via a direct
 *   `PrismaService` query with its `startDate`/`endDate` stored as dates
 *   and the principal's `userId`.
 *
 * SP-110A: the management routes
 * - `GET /semesters`: only the principal's rows, `startDate` desc / `name`
 *   asc, `SemesterWithCount` shape (8 keys incl. `courseCount`).
 * - `GET /semesters/:id`: own → 200; missing or another student's → uniform
 *   404 `Resource not found` (no existence oracle).
 * - Two-student matrix: B's PATCH/DELETE on A's id → uniform 404; A's rows
 *   unchanged (no writes).
 * - Single-active (D110-1): activating one of three → exactly one active;
 *   concurrent activations → exactly one active afterwards (last-write-wins,
 *   no error); another student's semesters never touched.
 * - Delete-orphan (D110-2): deleting a semester with courses → 204; the
 *   course rows survive with `semesterId: null`.
 * - No token → 401 on every route (global guard regression, AC-E01-03);
 *   unknown PATCH body field → 400 (`forbidNonWhitelisted`).
 *
 * Self-skips when `DATABASE_URL` is unset (the SP-104/SP-105/SP-106
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

describeIntegration('semesters data scoping (integration, real database, SP-107B/SP-110A)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string): string =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-semester`;

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  // Non-optional by type: if seeding fails, the suite fails in beforeAll
  // (afterAll's filter keeps the cleanup from crashing on partial seeding).
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

  function postSemesters(session: Student, body: Record<string, unknown>) {
    return agent
      .post('/semesters')
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

  // ==================== 201 create (student A) ====================

  describe('201 create', () => {
    it('returns the exact frontend Semester shape with yyyy-MM-dd dates and isActive false', async () => {
      const response = await postSemesters(studentA, {
        name: `Fall ${runId}`,
        startDate: '2026-09-01',
        endDate: '2026-12-15',
      }).expect(HttpStatus.CREATED);

      expect(Object.keys(response.body).sort()).toEqual(SEMESTER_KEYS);
      expect(response.body).toMatchObject({
        name: `Fall ${runId}`,
        startDate: '2026-09-01',
        endDate: '2026-12-15',
        isActive: false,
      });
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.createdAt).toBe('string');
      expect(typeof response.body.updatedAt).toBe('string');
    });

    it('persists the semester owned by the requesting student (direct PrismaService re-read — no GET route yet)', async () => {
      const response = await postSemesters(studentA, {
        name: `Spring ${runId}`,
        startDate: '2026-01-10',
        endDate: '2026-05-01',
      }).expect(HttpStatus.CREATED);

      // Re-read via a direct query: the row exists, is owned by A, and its
      // dates round-trip as calendar dates (D107-7).
      const row = await app.prisma.semester.findUnique({ where: { id: response.body.id } });
      expect(row).not.toBeNull();
      expect(row!.userId).toBe(studentA.id);
      expect(row!.name).toBe(`Spring ${runId}`);
      expect(formatCalendarDate(row!.startDate)).toBe('2026-01-10');
      expect(formatCalendarDate(row!.endDate)).toBe('2026-05-01');
      expect(row!.isActive).toBe(false);
    });
  });

  // ==================== 400 validation ====================

  describe('400 validation (field-level errors map)', () => {
    it('end < start → 400 with endDate in errors; nothing written', async () => {
      const before = await app.prisma.semester.count({ where: { userId: studentB.id } });

      const response = await postSemesters(studentB, {
        name: `Backwards ${runId}`,
        startDate: '2026-12-15',
        endDate: '2026-09-01',
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
      expect(response.body.errors).toHaveProperty('endDate');
      expect(Array.isArray(response.body.errors.endDate)).toBe(true);
      // The stock message array is preserved (D106-6).
      expect(Array.isArray(response.body.message)).toBe(true);

      const after = await app.prisma.semester.count({ where: { userId: studentB.id } });
      expect(after).toBe(before);
    });

    it('end == start → 400 with endDate in errors (strictly-after rule)', async () => {
      const response = await postSemesters(studentB, {
        name: `One Day ${runId}`,
        startDate: '2026-09-01',
        endDate: '2026-09-01',
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('endDate');
    });

    it('a malformed date string → 400 with the field in errors', async () => {
      const response = await agent
        .post('/semesters')
        .set('Authorization', `Bearer ${studentB.accessToken}`)
        .send({
          name: `Malformed ${runId}`,
          startDate: 'not-a-date',
          endDate: '2026-12-15',
        });
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body.errors).toHaveProperty('startDate');
    });

    it('an empty name → 400 with name in errors', async () => {
      const response = await postSemesters(studentB, {
        name: '   ',
        startDate: '2026-09-01',
        endDate: '2026-12-15',
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('name');
    });

    it('an unknown body field → 400 (global forbidNonWhitelisted)', async () => {
      const response = await postSemesters(studentB, {
        name: `Bogus ${runId}`,
        startDate: '2026-09-01',
        endDate: '2026-12-15',
        isActive: true,
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('isActive');
    });
  });

  // ==================== 409 duplicates (per student) ====================

  describe('409 duplicate name', () => {
    it('the same name for the same student → 409 with the specific message', async () => {
      // `Fall ${runId}` was created in the 201 block above.
      const response = await postSemesters(studentA, {
        name: `Fall ${runId}`,
        startDate: '2027-01-01',
        endDate: '2027-05-15',
      }).expect(HttpStatus.CONFLICT);

      expect(response.body).toMatchObject({ statusCode: HttpStatus.CONFLICT });
      expect(response.body.message).toBe('A semester with this name already exists.');
    });

    it('the same name for another student → 201 (the unique constraint is per student)', async () => {
      const response = await postSemesters(studentB, {
        name: `Fall ${runId}`,
        startDate: '2026-09-01',
        endDate: '2026-12-15',
      }).expect(HttpStatus.CREATED);

      expect(typeof response.body.id).toBe('string');
      // B's copy is owned by B — A's row is a different record.
      const row = await app.prisma.semester.findUnique({ where: { id: response.body.id } });
      expect(row!.userId).toBe(studentB.id);
    });
  });

  // ==================== Cross-student isolation ====================

  describe('cross-student isolation', () => {
    it("student B's requests never touch student A's semesters", async () => {
      const aBefore = await app.prisma.semester.findMany({
        where: { userId: studentA.id },
      });

      // B creates and collides on their own data; none of it may reach A.
      await postSemesters(studentB, {
        name: `Fall ${runId}`,
        startDate: '2026-09-01',
        endDate: '2026-12-15',
      }).expect(HttpStatus.CONFLICT);

      const aAfter = await app.prisma.semester.findMany({
        where: { userId: studentA.id },
      });
      expect(aAfter).toEqual(aBefore);
    });
  });

  // ==================== SP-110A: GET /semesters (list) ====================

  describe('GET /semesters (list)', () => {
    it("returns only the principal's rows, ordered startDate desc then name asc, in the SemesterWithCount shape", async () => {
      // A third semester sharing Fall's start date proves the name-asc
      // tie-break ('Alpha' < 'Fall' on the same startDate).
      await postSemesters(studentA, {
        name: `Alpha ${runId}`,
        startDate: '2026-09-01',
        endDate: '2026-09-15',
      }).expect(HttpStatus.CREATED);

      const response = await agent
        .get('/semesters')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);
      // startDate desc: the 09-01 pair first, then the 01-10 Spring.
      expect(response.body.map((row: { name: string }) => row.name)).toEqual([
        `Alpha ${runId}`,
        `Fall ${runId}`,
        `Spring ${runId}`,
      ]);
      // B's same-named `Fall` semester is a different row — never leaked.
      const bSemester = await app.prisma.semester.findFirst({
        where: { userId: studentB.id, name: `Fall ${runId}` },
        select: { id: true },
      });
      expect(response.body.map((row: { id: string }) => row.id)).not.toContain(bSemester!.id);

      for (const row of response.body) {
        expect(Object.keys(row).sort()).toEqual(SEMESTER_WITH_COUNT_KEYS);
        expect(row.courseCount).toBe(0);
        expect(row.isActive).toBe(false);
      }
    });
  });

  // ==================== SP-110A: GET /semesters/:id ====================

  describe('GET /semesters/:id', () => {
    let aFallId: string;

    beforeAll(async () => {
      aFallId = (await app.prisma.semester.findFirst({
        where: { userId: studentA.id, name: `Fall ${runId}` },
        select: { id: true },
      }))!.id;
    });

    it("returns the student's own semester in the SemesterWithCount shape", async () => {
      const response = await agent
        .get(`/semesters/${aFallId}`)
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .expect(HttpStatus.OK);

      expect(Object.keys(response.body).sort()).toEqual(SEMESTER_WITH_COUNT_KEYS);
      expect(response.body).toMatchObject({
        id: aFallId,
        name: `Fall ${runId}`,
        startDate: '2026-09-01',
        endDate: '2026-12-15',
        isActive: false,
        courseCount: 0,
      });
    });

    it("another student's id → uniform 404 (no existence oracle)", async () => {
      await agent
        .get(`/semesters/${aFallId}`)
        .set('Authorization', `Bearer ${studentB.accessToken}`)
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body.message).toBe('Resource not found');
        });
    });

    it('a missing id → the same uniform 404', async () => {
      await agent
        .get('/semesters/00000000-0000-4000-8000-000000000000')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body.message).toBe('Resource not found');
        });
    });
  });

  // ==================== SP-110A: two-student matrix (PATCH/DELETE) ====================

  describe('two-student matrix (PATCH / DELETE)', () => {
    let aFallId: string;
    let aFallBefore: { name: string; isActive: boolean; updatedAt: Date };

    beforeAll(async () => {
      const row = await app.prisma.semester.findFirst({
        where: { userId: studentA.id, name: `Fall ${runId}` },
      });
      aFallId = row!.id;
      aFallBefore = { name: row!.name, isActive: row!.isActive, updatedAt: row!.updatedAt };
    });

    it("student B's PATCH on A's semester → uniform 404; A's row unchanged (no writes)", async () => {
      await agent
        .patch(`/semesters/${aFallId}`)
        .set('Authorization', `Bearer ${studentB.accessToken}`)
        .send({ name: 'Hacked by B' })
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body.message).toBe('Resource not found');
        });

      const after = await app.prisma.semester.findUnique({ where: { id: aFallId } });
      expect(after!.name).toBe(aFallBefore.name);
      expect(after!.isActive).toBe(aFallBefore.isActive);
      expect(after!.updatedAt).toEqual(aFallBefore.updatedAt);
    });

    it("student B's DELETE on A's semester → uniform 404; the row still exists", async () => {
      await agent
        .delete(`/semesters/${aFallId}`)
        .set('Authorization', `Bearer ${studentB.accessToken}`)
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body.message).toBe('Resource not found');
        });

      const after = await app.prisma.semester.findUnique({ where: { id: aFallId } });
      expect(after).not.toBeNull();
    });

    it("student A's own PATCH works (the matrix is directional, not a blanket lock)", async () => {
      await agent
        .patch(`/semesters/${aFallId}`)
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ name: `Fall ${runId}` })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.name).toBe(`Fall ${runId}`);
        });
    });
  });

  // ==================== SP-110A: single-active activation (D110-1) ====================

  describe('single-active activation (D110-1)', () => {
    const ids = {
      fall: '',
      spring: '',
      alpha: '',
    };

    async function activeSemestersOf(userId: string) {
      return app.prisma.semester.findMany({ where: { userId, isActive: true } });
    }

    beforeAll(async () => {
      const rows = await app.prisma.semester.findMany({
        where: { userId: studentA.id },
        select: { id: true, name: true },
      });
      for (const row of rows) {
        if (row.name === `Fall ${runId}`) ids.fall = row.id;
        if (row.name === `Spring ${runId}`) ids.spring = row.id;
        if (row.name === `Alpha ${runId}`) ids.alpha = row.id;
      }
    });

    it('activating one of three semesters → exactly one active for the student', async () => {
      await agent
        .patch(`/semesters/${ids.alpha}`)
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ isActive: true })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.isActive).toBe(true);
        });

      const active = await activeSemestersOf(studentA.id);
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(ids.alpha);
      // B's same-named semester is untouched — the deactivation is scoped
      // to the principal, never another student.
      const bActive = await activeSemestersOf(studentB.id);
      expect(bActive).toHaveLength(0);
    });

    it('concurrent activations of two other semesters → exactly one active afterwards (last-write-wins, no error)', async () => {
      const [fall, spring] = await Promise.all([
        agent
          .patch(`/semesters/${ids.fall}`)
          .set('Authorization', `Bearer ${studentA.accessToken}`)
          .send({ isActive: true })
          .expect(HttpStatus.OK),
        agent
          .patch(`/semesters/${ids.spring}`)
          .set('Authorization', `Bearer ${studentA.accessToken}`)
          .send({ isActive: true })
          .expect(HttpStatus.OK),
      ]);
      // Both requests succeed; the invariant, not a winner/loser error,
      // is the contract.
      expect(fall.body.isActive).toBe(true);
      expect(spring.body.isActive).toBe(true);

      const active = await activeSemestersOf(studentA.id);
      expect(active).toHaveLength(1);
      expect([ids.fall, ids.spring]).toContain(active[0].id);
      // The earlier activation (Alpha) is deactivated either way.
      const alpha = await app.prisma.semester.findUnique({ where: { id: ids.alpha } });
      expect(alpha!.isActive).toBe(false);
    });
  });

  // ==================== SP-110A: delete orphans courses (D110-2) ====================

  describe('delete orphans courses (D110-2)', () => {
    let semesterId: string;
    const courseCodes = [`${runId}-C1`, `${runId}-C2`];

    beforeAll(async () => {
      const created = await postSemesters(studentA, {
        name: `ToDelete ${runId}`,
        startDate: '2027-01-01',
        endDate: '2027-05-01',
      }).expect(HttpStatus.CREATED);
      semesterId = created.body.id;

      for (const code of courseCodes) {
        await agent
          .post('/courses')
          .set('Authorization', `Bearer ${studentA.accessToken}`)
          .send({ code, name: `Course ${code}`, semesterId })
          .expect(HttpStatus.CREATED);
      }
    });

    it('deletes the semester (204) and the course rows survive with semesterId null', async () => {
      await agent
        .delete(`/semesters/${semesterId}`)
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .expect(HttpStatus.NO_CONTENT);

      const semester = await app.prisma.semester.findUnique({ where: { id: semesterId } });
      expect(semester).toBeNull();

      const courses = await app.prisma.course.findMany({
        where: { userId: studentA.id, code: { in: courseCodes } },
      });
      expect(courses).toHaveLength(2);
      for (const course of courses) {
        // Orphaned, not destroyed — the rows remain fully accessible.
        expect(course.semesterId).toBeNull();
      }
    });

    it('a second delete → uniform 404 (no writes, no second orphaning)', async () => {
      await agent
        .delete(`/semesters/${semesterId}`)
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body.message).toBe('Resource not found');
        });
    });
  });

  // ==================== SP-110A: PATCH validation (400) ====================

  describe('PATCH validation (field-level 400)', () => {
    let aSpringId: string;

    beforeAll(async () => {
      aSpringId = (await app.prisma.semester.findFirst({
        where: { userId: studentA.id, name: `Spring ${runId}` },
        select: { id: true },
      }))!.id;
    });

    it('an unknown body field → 400 (global forbidNonWhitelisted)', async () => {
      await agent
        .patch(`/semesters/${aSpringId}`)
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ bogus: true })
        .expect(HttpStatus.BAD_REQUEST)
        .expect((res) => {
          expect(res.body.errors).toHaveProperty('bogus');
        });
    });

    it('a userId in the body → 400 (never honored)', async () => {
      await agent
        .patch(`/semesters/${aSpringId}`)
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ userId: studentB.id })
        .expect(HttpStatus.BAD_REQUEST)
        .expect((res) => {
          expect(res.body.errors).toHaveProperty('userId');
        });
    });

    it('an empty body → 400 (at least one field)', async () => {
      await agent
        .patch(`/semesters/${aSpringId}`)
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('a name colliding with another of the student semesters → 409 with the specific message', async () => {
      await agent
        .patch(`/semesters/${aSpringId}`)
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ name: `Fall ${runId}` })
        .expect(HttpStatus.CONFLICT)
        .expect((res) => {
          expect(res.body.message).toBe('A semester with this name already exists.');
        });
    });

    it('a merged date violation (endDate == stored startDate) → 400 with the field in errors; nothing written', async () => {
      // Spring starts 2026-01-10; patching endDate back onto it violates
      // the strictly-after rule on the merged values.
      await agent
        .patch(`/semesters/${aSpringId}`)
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ endDate: '2026-01-10' })
        .expect(HttpStatus.BAD_REQUEST)
        .expect((res) => {
          expect(res.body.errors).toHaveProperty('endDate');
        });

      const row = await app.prisma.semester.findUnique({ where: { id: aSpringId } });
      expect(formatCalendarDate(row!.endDate)).toBe('2026-05-01');
    });
  });

  // ==================== 401 unauthenticated (all routes) ====================

  describe('unauthenticated → 401 (global guard regression)', () => {
    it('POST /semesters without a token → 401', async () => {
      await agent
        .post('/semesters')
        .send({ name: 'No Auth', startDate: '2026-09-01', endDate: '2026-12-15' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('GET /semesters without a token → 401', async () => {
      await agent.get('/semesters').expect(HttpStatus.UNAUTHORIZED);
    });

    it('GET /semesters/:id without a token → 401', async () => {
      await agent
        .get('/semesters/00000000-0000-4000-8000-000000000000')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('PATCH /semesters/:id without a token → 401', async () => {
      await agent
        .patch('/semesters/00000000-0000-4000-8000-000000000000')
        .send({ name: 'No Auth' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('DELETE /semesters/:id without a token → 401', async () => {
      await agent
        .delete('/semesters/00000000-0000-4000-8000-000000000000')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
