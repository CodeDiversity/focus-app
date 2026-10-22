import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * SP-111C e2e spec: the course management feature as a **student journey**,
 * over real HTTP against a real PostgreSQL database (the `test-http` harness
 * carries the real courses + semesters modules — `main.ts` parity).
 *
 * This is the cross-layer wire proof the SP-111A/B children bracketed from
 * their own sides (SP-110C precedent): A's routes (list/get/patch, the
 * `CourseWithSemester` shape, D111-1…5) driven end to end, the same surface
 * B's `/courses` UI consumes.
 *
 * - AC1 full lifecycle (one student, in order): `POST /semesters` ×2 →
 *   `POST /courses` ×3 (one attached to Fall, one to Spring, one
 *   unaffiliated — the D110-2 orphan shape) → `GET /courses` (name-asc
 *   order, `CourseWithSemester` with the semester projected) →
 *   `GET /courses/:id` → `PATCH` edits (name + instructor, then a semester
 *   re-attach) persist on the wire **and** in the row → archive
 *   (`isActive: false`, D111-2) → absent from the default list, present with
 *   `?includeArchived=true`, the detail route still returns it (AC-E02-05) →
 *   restore (`isActive: true`) → active again. *(AC-E02-03/05, DoD 1/8)*
 * - Semester filter (AC-E02-02): `?semesterId=` returns only that semester's
 *   courses; a foreign (another student's) or missing `semesterId` → uniform
 *   404 `Resource not found` — no existence oracle.
 * - Orphaned by semester deletion (SP-110 boundary, D110-2): deleting a
 *   semester that has courses → the course rows **survive**, unaffiliated
 *   (`semesterId: null`), and still list with `semester: null` (AC-E02-05
 *   boundary: archiving never destroys data, and neither does the semester
 *   going away).
 * - AC2 cross-student matrix: student B's GET / PATCH on A's course id →
 *   uniform 404; A's row is byte-identical (no existence oracle, no partial
 *   write); B's list never contains A's course ids. *(DoD 3/8)*
 * - Unauthenticated: every route (POST / GET / GET :id / PATCH :id) → 401.
 *   *(DoD 3/8)*
 *
 * The `courses-data-scoping.spec.ts` sibling pins each route in isolation;
 * this spec proves the routes **together** as the feature the UI (SP-111B)
 * drives. The cases are ordered as the student journey and each asserts on
 * real rows via the harness `prisma` handle. The cases within the suite are
 * state-dependent by design (a journey, not a set of isolated requests).
 *
 * Self-skips when `DATABASE_URL` is unset (the SP-104/SP-105/SP-106/SP-107A/
 * SP-110C convention), so a bare local `pnpm test` still works; the
 * verification run supplies `DATABASE_URL` so the suite executes with zero
 * skips.
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/** The exact `POST /semesters` 201 contract keys (SP-107B shape, unchanged). */
const SEMESTER_KEYS = [
  'createdAt',
  'endDate',
  'id',
  'isActive',
  'name',
  'startDate',
  'updatedAt',
].sort();

/**
 * The exact `CourseWithSemester` contract keys (SP-111A, D111-4): the
 * SP-107B 8 keys plus `instructor`, `semesterId`, `semester`. Returned by
 * every courses route, including `POST /courses`.
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

describeIntegration('course management end-to-end (real database, SP-111C)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string): string =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-course-e2e`;

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  // Non-optional by type: if seeding fails, the suite fails in beforeAll
  // (afterAll's filter keeps cleanup from crashing on partial seeding).
  let studentA: Student; // the lifecycle journey (AC1, orphan)
  let studentB: Student; // the cross-student matrix (AC2)

  interface Student {
    id: string;
    email: string;
    accessToken: string;
  }

  // Rows created during the journey (for row-level assertions).
  let fallId: string;
  let springId: string;
  let bSemesterId: string;
  const courseIds: Record<'cs101' | 'cs201' | 'math101', string> = {
    cs101: '',
    cs201: '',
    math101: '',
  };

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

  function listCourses(session: Student, query: Record<string, string> = {}) {
    return agent.get('/courses').query(query).set('Authorization', `Bearer ${session.accessToken}`);
  }

  function patchCourse(session: Student, id: string, body: Record<string, unknown>) {
    return agent
      .patch(`/courses/${id}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send(body);
  }

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());

    studentA = await registerAndLogin('student-a');
    studentB = await registerAndLogin('student-b');

    // B's own semester — the "foreign semester" for A's filter 404 cases.
    const bSemester = await agent
      .post('/semesters')
      .set('Authorization', `Bearer ${studentB.accessToken}`)
      .send({ name: `B Fall ${runId}`, startDate: '2026-09-01', endDate: '2026-12-15' })
      .expect(HttpStatus.CREATED);
    bSemesterId = bSemester.body.id;
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

  describe('AC1 — full lifecycle: create → list/filter → edit → archive → restore (AC-E02-03/05, DoD 1/8)', () => {
    it('POST /semesters ×2: 201, exact 7-key shape, isActive false', async () => {
      const fall = await agent
        .post('/semesters')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ name: `Fall ${runId}`, startDate: '2026-09-01', endDate: '2026-12-15' })
        .expect(HttpStatus.CREATED);
      expect(Object.keys(fall.body).sort()).toEqual(SEMESTER_KEYS);
      fallId = fall.body.id;

      const spring = await agent
        .post('/semesters')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ name: `Spring ${runId}`, startDate: '2027-01-10', endDate: '2027-05-01' })
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

    it('POST /courses ×3: 201, exact 13-key CourseWithSemester shape, semester projected (D111-4)', async () => {
      // CS101 → Fall, with every optional field (incl. the new instructor,
      // D111-1); CS201 → Spring, minimal; MATH101 → unaffiliated (the
      // orphan shape, D110-2).
      const cs101 = await agent
        .post('/courses')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({
          code: 'CS101',
          name: 'Computer Science I',
          semesterId: fallId,
          instructor: 'Prof. Ada',
          credits: 3,
          color: '#ff5533',
          description: 'Foundations of computing',
        })
        .expect(HttpStatus.CREATED);
      expect(Object.keys(cs101.body).sort()).toEqual(COURSE_KEYS);
      expect(cs101.body).toMatchObject({
        code: 'CS101',
        name: 'Computer Science I',
        instructor: 'Prof. Ada',
        credits: 3,
        color: '#ff5533',
        description: 'Foundations of computing',
        isActive: true,
        semesterId: fallId,
        semester: { id: fallId, name: `Fall ${runId}` },
      });
      courseIds.cs101 = cs101.body.id;

      const cs201 = await agent
        .post('/courses')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ code: 'CS201', name: 'Computer Science II', semesterId: springId })
        .expect(HttpStatus.CREATED);
      expect(Object.keys(cs201.body).sort()).toEqual(COURSE_KEYS);
      expect(cs201.body).toMatchObject({
        instructor: null,
        credits: null,
        color: '#6366f1', // the schema default
        semesterId: springId,
        semester: { id: springId, name: `Spring ${runId}` },
      });
      courseIds.cs201 = cs201.body.id;

      const math101 = await agent
        .post('/courses')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ code: 'MATH101', name: 'Calculus' })
        .expect(HttpStatus.CREATED);
      expect(math101.body).toMatchObject({ semesterId: null, semester: null });
      courseIds.math101 = math101.body.id;

      // The rows agree (the wire is not the source of truth — the row is).
      const rows = await app.prisma.course.findMany({ where: { userId: studentA.id } });
      expect(rows).toHaveLength(3);
      const cs101Row = rows.find((row) => row.code === 'CS101')!;
      expect(cs101Row.semesterId).toBe(fallId);
      expect(cs101Row.instructor).toBe('Prof. Ada');
    });

    it('GET /courses: 3 rows in name-asc order, each with its semester projected', async () => {
      const response = await listCourses(studentA).expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);
      // name asc, then code asc: Calculus < Computer Science I <
      // Computer Science II.
      expect(response.body.map((row: { id: string }) => row.id)).toEqual([
        courseIds.math101,
        courseIds.cs101,
        courseIds.cs201,
      ]);
      for (const row of response.body) {
        expect(Object.keys(row).sort()).toEqual(COURSE_KEYS);
        expect(row.isActive).toBe(true);
      }
      // The semester projection is the point of the shape (D111-4).
      const cs101 = response.body.find((row: { id: string }) => row.id === courseIds.cs101);
      expect(cs101.semester).toEqual({ id: fallId, name: `Fall ${runId}` });
      const math101 = response.body.find((row: { id: string }) => row.id === courseIds.math101);
      expect(math101.semester).toBeNull();
    });

    it("GET /courses?semesterId= returns only that semester's courses (AC-E02-02)", async () => {
      const fallCourses = await listCourses(studentA, { semesterId: fallId }).expect(HttpStatus.OK);
      expect(fallCourses.body.map((row: { id: string }) => row.id)).toEqual([courseIds.cs101]);

      const springCourses = await listCourses(studentA, { semesterId: springId }).expect(
        HttpStatus.OK
      );
      expect(springCourses.body.map((row: { id: string }) => row.id)).toEqual([courseIds.cs201]);
    });

    it('GET /courses?semesterId= with a foreign or missing semester → uniform 404 (no existence oracle)', async () => {
      // B's semester (owned by another student) and a never-created id must
      // be indistinguishable — same status, same message.
      const foreign = await listCourses(studentA, { semesterId: bSemesterId }).expect(
        HttpStatus.NOT_FOUND
      );
      expect(foreign.body.message).toBe('Resource not found');

      const missing = await listCourses(studentA, { semesterId: uuidv4() }).expect(
        HttpStatus.NOT_FOUND
      );
      // Uniform 404: the same status/message/error as the foreign case (the
      // envelope's `path`/`timestamp` are request-specific, not part of the
      // uniformity contract).
      expect(missing.body.message).toBe(foreign.body.message);
      expect(missing.body.error).toBe(foreign.body.error);
      expect(missing.body.statusCode).toBe(foreign.body.statusCode);
    });

    it('GET /courses/:id: the own course in the 13-key shape', async () => {
      const response = await agent
        .get(`/courses/${courseIds.cs101}`)
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .expect(HttpStatus.OK);

      expect(Object.keys(response.body).sort()).toEqual(COURSE_KEYS);
      expect(response.body).toMatchObject({
        id: courseIds.cs101,
        code: 'CS101',
        name: 'Computer Science I',
        instructor: 'Prof. Ada',
        semester: { id: fallId, name: `Fall ${runId}` },
        isActive: true,
      });
    });

    it('PATCH name + instructor: the merged values persist on the wire and in the row', async () => {
      const response = await patchCourse(studentA, courseIds.cs101, {
        name: 'Advanced Computer Science I',
        instructor: 'Dr. Grace',
      }).expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        id: courseIds.cs101,
        name: 'Advanced Computer Science I',
        instructor: 'Dr. Grace',
        // Unpatched fields keep the stored value (partial merge).
        code: 'CS101',
        credits: 3,
        semesterId: fallId,
      });

      // The row agrees (the wire is not the source of truth — the row is).
      const row = await app.prisma.course.findUnique({ where: { id: courseIds.cs101 } });
      expect(row!.name).toBe('Advanced Computer Science I');
      expect(row!.instructor).toBe('Dr. Grace');
    });

    it('PATCH semester re-attach: the course moves Fall → Spring (AC-E02-02)', async () => {
      const response = await patchCourse(studentA, courseIds.cs101, {
        semesterId: springId,
      }).expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        semesterId: springId,
        semester: { id: springId, name: `Spring ${runId}` },
      });

      const row = await app.prisma.course.findUnique({ where: { id: courseIds.cs101 } });
      expect(row!.semesterId).toBe(springId);
    });

    it('archive (isActive: false): absent from the default list, present with includeArchived, detail still returns it (D111-2, AC-E02-05)', async () => {
      const archived = await patchCourse(studentA, courseIds.cs101, {
        isActive: false,
      }).expect(HttpStatus.OK);
      expect(archived.body.isActive).toBe(false);

      // The row survives — archiving is a flag flip, never a delete
      // (D111-2; no hard-delete route exists).
      const row = await app.prisma.course.findUnique({ where: { id: courseIds.cs101 } });
      expect(row).not.toBeNull();
      expect(row!.isActive).toBe(false);

      // Default list: active only — the archived course is absent.
      const active = await listCourses(studentA).expect(HttpStatus.OK);
      expect(active.body.map((r: { id: string }) => r.id).sort()).toEqual(
        [courseIds.cs201, courseIds.math101].sort()
      );

      // includeArchived: the archived course is back, flagged.
      const all = await listCourses(studentA, { includeArchived: 'true' }).expect(HttpStatus.OK);
      expect(all.body).toHaveLength(3);
      const listed = all.body.find((r: { id: string }) => r.id === courseIds.cs101);
      expect(listed.isActive).toBe(false);

      // The detail route is archive-agnostic (AC-E02-05: archived courses
      // remain accessible with their historical data).
      const detail = await agent
        .get(`/courses/${courseIds.cs101}`)
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .expect(HttpStatus.OK);
      expect(detail.body.isActive).toBe(false);
      expect(detail.body.semester).toEqual({ id: springId, name: `Spring ${runId}` });
    });

    it('restore (isActive: true): the course is active again and back in the default list', async () => {
      const restored = await patchCourse(studentA, courseIds.cs101, {
        isActive: true,
      }).expect(HttpStatus.OK);
      expect(restored.body.isActive).toBe(true);

      const row = await app.prisma.course.findUnique({ where: { id: courseIds.cs101 } });
      expect(row!.isActive).toBe(true);

      const active = await listCourses(studentA).expect(HttpStatus.OK);
      expect(active.body.map((r: { id: string }) => r.id).sort()).toEqual(
        [courseIds.cs101, courseIds.cs201, courseIds.math101].sort()
      );
    });
  });

  // ==================== Orphaned by semester deletion (SP-110 boundary) ====================

  describe('orphaned by semester deletion (D110-2, AC-E02-05 boundary)', () => {
    it('DELETE /semesters/:id (Spring, which has two courses): 204; the courses survive, unaffiliated, and still list with semester null', async () => {
      // Spring holds CS101 (re-attached) and CS201 — deleting it must not
      // touch the course rows (the SP-110 boundary: courses survive).
      await agent
        .delete(`/semesters/${springId}`)
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .expect(HttpStatus.NO_CONTENT);

      expect(await app.prisma.semester.findUnique({ where: { id: springId } })).toBeNull();

      const courses = await app.prisma.course.findMany({
        where: { id: { in: [courseIds.cs101, courseIds.cs201] } },
      });
      expect(courses).toHaveLength(2);
      for (const course of courses) {
        expect(course.userId).toBe(studentA.id);
        expect(course.semesterId).toBeNull(); // orphaned, not destroyed
      }

      // The list still returns them, with the null semester projection.
      const response = await listCourses(studentA).expect(HttpStatus.OK);
      expect(response.body).toHaveLength(3);
      for (const row of response.body) {
        expect(row.semesterId).toBeNull();
        expect(row.semester).toBeNull();
      }
    });
  });

  // ==================== AC2 — cross-student matrix ====================

  describe('AC2 — cross-student matrix (DoD 3/8)', () => {
    let cs201Before: {
      id: string;
      userId: string;
      code: string;
      name: string;
      description: string | null;
      color: string;
      credits: number | null;
      instructor: string | null;
      isActive: boolean;
      semesterId: string | null;
      createdAt: Date;
      updatedAt: Date;
    } | null;

    beforeAll(async () => {
      // CS201 is A's surviving course (orphaned after the Spring delete).
      cs201Before = await app.prisma.course.findUnique({ where: { id: courseIds.cs201 } });
    });

    it("B's GET / PATCH on A's course id → uniform 404; A's row byte-identical", async () => {
      await agent
        .get(`/courses/${courseIds.cs201}`)
        .set('Authorization', `Bearer ${studentB.accessToken}`)
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body.message).toBe('Resource not found');
        });

      await patchCourse(studentB, courseIds.cs201, { name: 'Hacked by B' }).expect(
        HttpStatus.NOT_FOUND
      );

      // None of B's attempts wrote anything: the row is byte-identical under
      // an unscoped read (no existence oracle, no partial write).
      const cs201After = await app.prisma.course.findUnique({ where: { id: courseIds.cs201 } });
      expect(cs201After).toEqual(cs201Before);
      expect(cs201After!.userId).toBe(studentA.id);
    });

    it("B's list never contains A's course ids (wire-level scoping)", async () => {
      const active = await listCourses(studentB).expect(HttpStatus.OK);
      // B registered no courses in this suite — the list is empty, and in
      // particular A's ids never appear.
      expect(active.body).toHaveLength(0);

      const all = await listCourses(studentB, { includeArchived: 'true' }).expect(HttpStatus.OK);
      const serialized = JSON.stringify(all.body);
      expect(serialized).not.toContain(courseIds.cs101);
      expect(serialized).not.toContain(courseIds.cs201);
      expect(serialized).not.toContain(courseIds.math101);
    });
  });

  // ==================== Unauthenticated access ====================

  describe('unauthenticated access (DoD 3/8)', () => {
    it('every route → 401 without a token', async () => {
      // No Authorization header on any of the four courses routes.
      await agent
        .post('/courses')
        .send({ code: 'NOAUTH', name: 'No auth' })
        .expect(HttpStatus.UNAUTHORIZED);

      await agent.get('/courses').expect(HttpStatus.UNAUTHORIZED);

      await agent.get(`/courses/${courseIds.cs101}`).expect(HttpStatus.UNAUTHORIZED);

      await agent
        .patch(`/courses/${courseIds.cs101}`)
        .send({ name: 'No auth' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
