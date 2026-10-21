import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * SP-107B + SP-111A integration spec: the course-management surface on the
 * real stack, over real HTTP against a real database (the `test-http`
 * harness, real Prisma against Postgres).
 *
 * - 201 shape: the extended `CourseWithSemester` type exactly (D111-4: the
 *   SP-107B 8 keys plus `instructor`, `semesterId`, `semester` — backward
 *   compatible, the wizard ignores the extra keys).
 * - `semesterId` ownership (AC-E02-02, D107-6): B posting A's semester id →
 *   uniform 404 `Resource not found`, no course row written, A's semester
 *   untouched; B with their own semester id → 201; omitted → created with
 *   `semesterId: null`.
 * - Duplicates: same code for the same student → 409 with the specific
 *   message; the same code for another student → 201 (the unique constraint
 *   is per student).
 * - Validation: out-of-range credits / malformed color / whitespace-only
 *   instructor → 400 with the field in the `errors` map; unknown field →
 *   400 (global `forbidNonWhitelisted`).
 * - List (SP-111A): principal-scoped, `name` asc / `code` asc, active-only
 *   by default, `?includeArchived=true` adds archived rows, `?semesterId=`
 *   filters to the student's own semester (foreign/missing → uniform 404).
 * - Detail (SP-111A): `GET /courses/:id` returns the course regardless of
 *   archive state; B's GET/PATCH on A's course id → uniform 404, A's rows
 *   unchanged (no existence oracle, no writes).
 * - Patch (SP-111A): partial merge; merged-value violations → 400; foreign
 *   `semesterId` → uniform 404 with no write; code collision → 409;
 *   `isActive` flip archives/restores — the row survives (D111-2).
 * - No token → 401 on all routes (global guard regression, AC-E01-03).
 *
 * Self-skips when `DATABASE_URL` is unset (the SP-104/SP-105/SP-106
 * convention), so a bare local `pnpm test` still works; the verification
 * run supplies `DATABASE_URL` so the suite executes with zero skips.
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/**
 * The exact contract keys — the `CourseWithSemester` type (D111-4): the
 * SP-107B 8 keys plus `instructor`, `semesterId`, `semester`.
 */
const COURSE_KEYS = [
  'code',
  'color',
  'credits',
  'createdAt',
  'description',
  'id',
  'instructor',
  'isActive',
  'name',
  'semester',
  'semesterId',
  'updatedAt',
].sort();

describeIntegration('Course management data scoping (integration, real database)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string): string =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-course`;

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  // Non-optional by type: if seeding fails, the suite fails in beforeAll
  // (afterAll's filter keeps the cleanup from crashing on partial seeding).
  let studentA: Student;
  let studentB: Student;
  let aSemesterId: string;
  let bSemesterId: string;

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

  /** Each student creates their own semester through the new endpoint. */
  async function createSemesterFor(student: Student, name: string): Promise<string> {
    const response = await agent
      .post('/semesters')
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send({ name, startDate: '2026-09-01', endDate: '2026-12-15' })
      .expect(HttpStatus.CREATED);
    return response.body.id as string;
  }

  function postCourses(session: Student, body: Record<string, unknown>) {
    return agent.post('/courses').set('Authorization', `Bearer ${session.accessToken}`).send(body);
  }

  function getCourseList(session: Student, query?: string) {
    return agent
      .get(`/courses${query ?? ''}`)
      .set('Authorization', `Bearer ${session.accessToken}`);
  }

  function getCourse(session: Student, id: string) {
    return agent.get(`/courses/${id}`).set('Authorization', `Bearer ${session.accessToken}`);
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

    aSemesterId = await createSemesterFor(studentA, `A Fall ${runId}`);
    bSemesterId = await createSemesterFor(studentB, `B Fall ${runId}`);
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

  // ==================== semesterId ownership (AC-E01-04, D107-6) ====================

  describe('POST /courses semesterId ownership', () => {
    it("B posting A's semester id → uniform 404, no course row, A's semester untouched", async () => {
      const coursesBefore = await app.prisma.course.count({ where: { userId: studentB.id } });
      const aSemesterBefore = await app.prisma.semester.findUnique({
        where: { id: aSemesterId },
      });

      const response = await postCourses(studentB, {
        code: `CS${runId}`,
        name: 'Cross-Student Course',
        semesterId: aSemesterId,
      }).expect(HttpStatus.NOT_FOUND);

      // Uniform 404 — the same message a missing id would produce (no
      // existence oracle).
      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });

      // No course row was written for B.
      const coursesAfter = await app.prisma.course.count({ where: { userId: studentB.id } });
      expect(coursesAfter).toBe(coursesBefore);

      // A's semester is untouched.
      const aSemesterAfter = await app.prisma.semester.findUnique({
        where: { id: aSemesterId },
      });
      expect(aSemesterAfter).toEqual(aSemesterBefore);
    });

    it('a missing semester id → the identical uniform 404 (no existence oracle)', async () => {
      const response = await postCourses(studentB, {
        code: `CS${runId}`,
        name: 'Missing Semester Course',
        semesterId: uuidv4(),
      }).expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });
      expect(await app.prisma.course.count({ where: { userId: studentB.id } })).toBe(0);
    });

    it('B posting their own semester id → 201, course attached to it', async () => {
      const response = await postCourses(studentB, {
        code: `CS${runId}`,
        name: 'Intro to Computer Science',
        semesterId: bSemesterId,
      }).expect(HttpStatus.CREATED);

      expect(typeof response.body.id).toBe('string');
      expect(response.body).toMatchObject({
        code: `CS${runId}`,
        name: 'Intro to Computer Science',
      });

      // Re-read via a direct query (the GET route is covered below): the
      // course is owned by B and attached to B's semester.
      const row = await app.prisma.course.findUnique({ where: { id: response.body.id } });
      expect(row!.userId).toBe(studentB.id);
      expect(row!.semesterId).toBe(bSemesterId);
    });

    it('an omitted semesterId → 201 with the course stored without a semester', async () => {
      const response = await postCourses(studentB, {
        code: `MATH${runId}`,
        name: 'Calculus I',
      }).expect(HttpStatus.CREATED);

      const row = await app.prisma.course.findUnique({ where: { id: response.body.id } });
      expect(row!.userId).toBe(studentB.id);
      expect(row!.semesterId).toBeNull();
    });
  });

  // ==================== 201 shape + defaults ====================

  describe('POST /courses 201 shape', () => {
    it('returns exactly the CourseWithSemester keys with schema defaults (D111-4)', async () => {
      const response = await postCourses(studentA, {
        code: `PHYS${runId}`,
        name: 'Physics 101',
      }).expect(HttpStatus.CREATED);

      expect(Object.keys(response.body).sort()).toEqual(COURSE_KEYS);
      expect(response.body).toMatchObject({
        code: `PHYS${runId}`,
        name: 'Physics 101',
        description: null,
        color: '#6366f1', // schema default (indigo)
        credits: null,
        instructor: null, // schema default (D111-1)
        isActive: true, // schema default
        semesterId: null,
        semester: null, // unaffiliated → null projection
      });
    });

    it('applies provided optional fields (description, credits, color, instructor)', async () => {
      const response = await postCourses(studentA, {
        code: `CHEM${runId}`,
        name: 'Chemistry 101',
        description: 'Atoms and moles',
        credits: 3.5,
        color: '#ff0000',
        instructor: '  Dr. Smith  ',
      }).expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        description: 'Atoms and moles',
        credits: 3.5,
        color: '#ff0000',
        instructor: 'Dr. Smith', // trimmed
      });
    });

    it('a course attached to an owned semester → the semester projection', async () => {
      const response = await postCourses(studentA, {
        code: `HIST${runId}`,
        name: 'World History',
        semesterId: aSemesterId,
      }).expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        semesterId: aSemesterId,
        semester: { id: aSemesterId, name: `A Fall ${runId}` },
      });
    });
  });

  // ==================== 409 duplicates (per student) ====================

  describe('409 duplicate code', () => {
    it('the same code for the same student → 409 with the specific message', async () => {
      // `CS${runId}` was created for B in the ownership block above.
      const response = await postCourses(studentB, {
        code: `CS${runId}`,
        name: 'Duplicate Course',
      }).expect(HttpStatus.CONFLICT);

      expect(response.body).toMatchObject({ statusCode: HttpStatus.CONFLICT });
      expect(response.body.message).toBe('A course with this code already exists.');
    });

    it('the same code for another student → 201 (the unique constraint is per student)', async () => {
      const response = await postCourses(studentA, {
        code: `CS${runId}`,
        name: 'A Owns This Code Too',
      }).expect(HttpStatus.CREATED);

      const row = await app.prisma.course.findUnique({ where: { id: response.body.id } });
      expect(row!.userId).toBe(studentA.id);
    });
  });

  // ==================== 400 validation ====================

  describe('POST /courses 400 validation (field-level errors map)', () => {
    it('credits of 0 → 400 with credits in errors; nothing written', async () => {
      const before = await app.prisma.course.count({ where: { userId: studentB.id } });

      const response = await postCourses(studentB, {
        code: `BIO${runId}`,
        name: 'Biology',
        credits: 0,
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
      expect(response.body.errors).toHaveProperty('credits');
      expect(Array.isArray(response.body.message)).toBe(true);

      const after = await app.prisma.course.count({ where: { userId: studentB.id } });
      expect(after).toBe(before);
    });

    it('credits above 30 → 400 with credits in errors', async () => {
      const response = await postCourses(studentB, {
        code: `BIO${runId}`,
        name: 'Biology',
        credits: 31,
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('credits');
    });

    it('a malformed color → 400 with color in errors', async () => {
      const response = await postCourses(studentB, {
        code: `BIO${runId}`,
        name: 'Biology',
        color: 'red',
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('color');
    });

    it('an empty code → 400 with code in errors', async () => {
      const response = await postCourses(studentB, {
        code: '   ',
        name: 'Biology',
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('code');
    });

    it('a whitespace-only instructor → 400 with instructor in errors (D111-1)', async () => {
      const response = await postCourses(studentB, {
        code: `BIO${runId}`,
        name: 'Biology',
        instructor: '   ',
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('instructor');
    });

    it('an over-long instructor (101 chars) → 400 with instructor in errors', async () => {
      const response = await postCourses(studentB, {
        code: `BIO${runId}`,
        name: 'Biology',
        instructor: 'x'.repeat(101),
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('instructor');
    });

    it('an unknown body field → 400 (global forbidNonWhitelisted)', async () => {
      const response = await postCourses(studentB, {
        code: `BIO${runId}`,
        name: 'Biology',
        isActive: false,
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('isActive');
    });

    it('a userId in the body → 400 (never honored)', async () => {
      const response = await postCourses(studentB, {
        code: `BIO${runId}`,
        name: 'Biology',
        userId: studentA.id,
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('userId');
    });
  });

  // ==================== GET /courses (SP-111A) ====================

  describe('GET /courses (list)', () => {
    it("returns only the requesting student's courses, ordered name asc / code asc", async () => {
      // B owns `CS${runId}` / `Intro to Computer Science` and
      // `MATH${runId}` / `Calculus I` from the blocks above.
      const response = await getCourseList(studentB).expect(HttpStatus.OK);

      const ids = response.body.map((row: { id: string }) => row.id);
      const bCourses = await app.prisma.course.findMany({ where: { userId: studentB.id } });
      const aCourseIds = new Set(
        (await app.prisma.course.findMany({ where: { userId: studentA.id } })).map((row) => row.id)
      );
      // B's list contains exactly B's courses — never A's.
      expect(new Set(ids)).toEqual(new Set(bCourses.map((row) => row.id)));
      for (const id of ids) {
        expect(aCourseIds.has(id)).toBe(false);
      }

      // Ordered name asc, then code asc: 'Calculus I' < 'Intro to
      // Computer Science'.
      expect(response.body.map((row: { name: string }) => row.name)).toEqual([
        'Calculus I',
        'Intro to Computer Science',
      ]);
      // Every row is the CourseWithSemester shape.
      for (const row of response.body) {
        expect(Object.keys(row).sort()).toEqual(COURSE_KEYS);
      }
    });

    it('breaks name ties by code asc', async () => {
      // Two same-named courses: the list must order them by code.
      await postCourses(studentA, { code: `TIEB${runId}`, name: 'Tie Name' }).expect(
        HttpStatus.CREATED
      );
      await postCourses(studentA, { code: `TIEA${runId}`, name: 'Tie Name' }).expect(
        HttpStatus.CREATED
      );

      const response = await getCourseList(studentA).expect(HttpStatus.OK);
      const tieRows = response.body.filter((row: { name: string }) => row.name === 'Tie Name');
      expect(tieRows.map((row: { code: string }) => row.code)).toEqual([
        `TIEA${runId}`,
        `TIEB${runId}`,
      ]);
    });

    it("a ?semesterId= filter returns only that semester's courses", async () => {
      // A owns `HIST${runId}` attached to A's semester (201 shape block).
      const response = await getCourseList(studentA, `?semesterId=${aSemesterId}`).expect(
        HttpStatus.OK
      );

      const codes = response.body.map((row: { code: string }) => row.code);
      expect(codes).toContain(`HIST${runId}`);
      expect(codes).not.toContain(`PHYS${runId}`); // unaffiliated
      for (const row of response.body) {
        expect(row.semesterId).toBe(aSemesterId);
        expect(row.semester).toEqual({ id: aSemesterId, name: `A Fall ${runId}` });
      }
    });

    it("A filtering by B's semester → uniform 404 (no existence oracle)", async () => {
      const response = await getCourseList(studentA, `?semesterId=${bSemesterId}`).expect(
        HttpStatus.NOT_FOUND
      );

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });
    });

    it('a missing semesterId filter → the identical uniform 404', async () => {
      const response = await getCourseList(studentA, `?semesterId=${uuidv4()}`).expect(
        HttpStatus.NOT_FOUND
      );

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });
    });
  });

  // ==================== GET /courses/:id (SP-111A) ====================

  describe('GET /courses/:id (detail)', () => {
    it('returns the CourseWithSemester shape regardless of archive state', async () => {
      const created = await postCourses(studentA, {
        code: `GEO${runId}`,
        name: 'Geography',
        instructor: 'Prof. Adams',
      }).expect(HttpStatus.CREATED);

      // Archive it, then read it back — archived courses remain accessible
      // (AC-E02-05).
      await patchCourse(studentA, created.body.id, { isActive: false }).expect(HttpStatus.OK);

      const response = await getCourse(studentA, created.body.id).expect(HttpStatus.OK);

      expect(Object.keys(response.body).sort()).toEqual(COURSE_KEYS);
      expect(response.body).toMatchObject({
        id: created.body.id,
        code: `GEO${runId}`,
        instructor: 'Prof. Adams',
        isActive: false,
        semester: null,
      });
    });

    it("B reading A's course id → uniform 404 (no existence oracle)", async () => {
      const created = await postCourses(studentA, {
        code: `ORACLE${runId}`,
        name: 'A Only Course',
      }).expect(HttpStatus.CREATED);

      const response = await getCourse(studentB, created.body.id).expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });
    });

    it('a missing course id → the identical uniform 404', async () => {
      const response = await getCourse(studentA, uuidv4()).expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });
    });
  });

  // ==================== PATCH /courses/:id (SP-111A) ====================

  describe('PATCH /courses/:id (partial merge)', () => {
    /** A dedicated course for the patch tests. */
    async function freshACourse(): Promise<string> {
      const response = await postCourses(studentA, {
        code: `PATCH${runId}${uuidv4().slice(0, 4)}`,
        name: 'Patch Target',
      }).expect(HttpStatus.CREATED);
      return response.body.id as string;
    }

    it('merges a single field and returns the updated CourseWithSemester', async () => {
      const id = await freshACourse();

      const response = await patchCourse(studentA, id, {
        instructor: '  Dr. New  ',
      }).expect(HttpStatus.OK);

      expect(Object.keys(response.body).sort()).toEqual(COURSE_KEYS);
      expect(response.body).toMatchObject({
        id,
        instructor: 'Dr. New', // trimmed
        name: 'Patch Target', // untouched field keeps its value
        isActive: true,
      });
      const row = await app.prisma.course.findUnique({ where: { id } });
      expect(row!.instructor).toBe('Dr. New');
    });

    it('merges several fields at once', async () => {
      const id = await freshACourse();

      const response = await patchCourse(studentA, id, {
        name: 'Renamed Target',
        credits: 3,
        color: '#00ff00',
      }).expect(HttpStatus.OK);

      expect(response.body).toMatchObject({ name: 'Renamed Target', credits: 3, color: '#00ff00' });
      const row = await app.prisma.course.findUnique({ where: { id } });
      expect(row!.name).toBe('Renamed Target');
      expect(row!.credits).toBe(3);
      expect(row!.color).toBe('#00ff00');
    });

    it('an empty body → 400 "At least one field must be provided"', async () => {
      const id = await freshACourse();

      const response = await patchCourse(studentA, id, {}).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('At least one field must be provided');
    });

    it('a whitespace-only code → 400 with code in errors; nothing written', async () => {
      const id = await freshACourse();
      const before = await app.prisma.course.findUnique({ where: { id } });

      const response = await patchCourse(studentA, id, { code: '   ' }).expect(
        HttpStatus.BAD_REQUEST
      );

      expect(response.body.errors).toHaveProperty('code');
      const after = await app.prisma.course.findUnique({ where: { id } });
      expect(after).toEqual(before);
    });

    it('an over-long name (101 chars) → 400 with name in errors', async () => {
      const id = await freshACourse();

      const response = await patchCourse(studentA, id, { name: 'x'.repeat(101) }).expect(
        HttpStatus.BAD_REQUEST
      );

      expect(response.body.errors).toHaveProperty('name');
    });

    it('an over-long instructor (101 chars) → 400 with instructor in errors', async () => {
      const id = await freshACourse();

      const response = await patchCourse(studentA, id, { instructor: 'x'.repeat(101) }).expect(
        HttpStatus.BAD_REQUEST
      );

      expect(response.body.errors).toHaveProperty('instructor');
    });

    it('a malformed color → 400 with color in errors', async () => {
      const id = await freshACourse();

      const response = await patchCourse(studentA, id, { color: 'red' }).expect(
        HttpStatus.BAD_REQUEST
      );

      expect(response.body.errors).toHaveProperty('color');
    });

    it('credits of 0 → 400 with credits in errors', async () => {
      const id = await freshACourse();

      const response = await patchCourse(studentA, id, { credits: 0 }).expect(
        HttpStatus.BAD_REQUEST
      );

      expect(response.body.errors).toHaveProperty('credits');
    });

    it('an unknown body field → 400 (global forbidNonWhitelisted)', async () => {
      const id = await freshACourse();

      const response = await patchCourse(studentA, id, { name: 'X', userId: studentB.id }).expect(
        HttpStatus.BAD_REQUEST
      );

      expect(response.body.errors).toHaveProperty('userId');
    });

    it("B patching A's course id → uniform 404; A's row unchanged", async () => {
      const created = await postCourses(studentA, {
        code: `SCOPED${runId}`,
        name: 'Scoped Course',
      }).expect(HttpStatus.CREATED);
      const before = await app.prisma.course.findUnique({ where: { id: created.body.id } });

      const response = await patchCourse(studentB, created.body.id, {
        name: 'Hacked',
        isActive: false,
      }).expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });

      const after = await app.prisma.course.findUnique({ where: { id: created.body.id } });
      expect(after).toEqual(before); // no write, no existence oracle
    });

    it('a missing course id → the identical uniform 404, no write', async () => {
      const coursesBefore = await app.prisma.course.count({ where: { userId: studentA.id } });

      await patchCourse(studentA, uuidv4(), { name: 'Ghost' }).expect(HttpStatus.NOT_FOUND);

      expect(await app.prisma.course.count({ where: { userId: studentA.id } })).toBe(coursesBefore);
    });

    it("B patching A's course with B's own semesterId → uniform 404, no write", async () => {
      const created = await postCourses(studentA, {
        code: `SEMOWN${runId}`,
        name: 'Semester Ownership',
      }).expect(HttpStatus.CREATED);
      const before = await app.prisma.course.findUnique({ where: { id: created.body.id } });

      const response = await patchCourse(studentB, created.body.id, {
        semesterId: bSemesterId,
      }).expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toBe('Resource not found');
      const after = await app.prisma.course.findUnique({ where: { id: created.body.id } });
      expect(after).toEqual(before);
    });

    it("A patching with B's semesterId → uniform 404, no write (AC-E02-02)", async () => {
      const created = await postCourses(studentA, {
        code: `XSEM${runId}`,
        name: 'Cross Semester',
      }).expect(HttpStatus.CREATED);
      const before = await app.prisma.course.findUnique({ where: { id: created.body.id } });

      const response = await patchCourse(studentA, created.body.id, {
        semesterId: bSemesterId,
      }).expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toBe('Resource not found');

      const after = await app.prisma.course.findUnique({ where: { id: created.body.id } });
      expect(after).toEqual(before); // the course keeps its (null) semester
    });

    it('a missing semesterId → the identical uniform 404, no write', async () => {
      const created = await postCourses(studentA, {
        code: `MSEM${runId}`,
        name: 'Missing Semester Target',
      }).expect(HttpStatus.CREATED);

      const response = await patchCourse(studentA, created.body.id, {
        semesterId: uuidv4(),
      }).expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toBe('Resource not found');
      const after = await app.prisma.course.findUnique({ where: { id: created.body.id } });
      expect(after!.semesterId).toBeNull();
    });

    it('an owned semesterId → the course is attached, with the semester projection', async () => {
      const created = await postCourses(studentA, {
        code: `ATTACH${runId}`,
        name: 'Attach Target',
      }).expect(HttpStatus.CREATED);

      const response = await patchCourse(studentA, created.body.id, {
        semesterId: aSemesterId,
      }).expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        semesterId: aSemesterId,
        semester: { id: aSemesterId, name: `A Fall ${runId}` },
      });
    });

    it('a code colliding with a different course of the same student → 409', async () => {
      // A owns `CS${runId}` ("A Owns This Code Too", 409 block).
      const created = await postCourses(studentA, {
        code: `COLLIDE${runId}`,
        name: 'Collision Target',
      }).expect(HttpStatus.CREATED);

      const response = await patchCourse(studentA, created.body.id, {
        code: `CS${runId}`,
      }).expect(HttpStatus.CONFLICT);

      expect(response.body.message).toBe('A course with this code already exists.');
      const row = await app.prisma.course.findUnique({ where: { id: created.body.id } });
      expect(row!.code).toBe(`COLLIDE${runId}`); // unchanged
    });

    it('the same code across two students → allowed (per-student uniqueness)', async () => {
      const created = await postCourses(studentB, {
        code: `SHARED${runId}`,
        name: 'B Shared Code',
      }).expect(HttpStatus.CREATED);

      // B already owns a different course; A reuses the code — fine.
      await postCourses(studentA, {
        code: `SHARED${runId}`,
        name: 'A Shared Code',
      }).expect(HttpStatus.CREATED);

      const row = await app.prisma.course.findUnique({ where: { id: created.body.id } });
      expect(row!.code).toBe(`SHARED${runId}`);
    });
  });

  // ==================== Archive / restore (D111-2, AC-E02-05) ====================

  describe('archive and restore', () => {
    let courseId: string;

    beforeAll(async () => {
      const response = await postCourses(studentA, {
        code: `ARCH${runId}`,
        name: 'Archive Me',
      }).expect(HttpStatus.CREATED);
      courseId = response.body.id as string;
    });

    it('isActive: false archives — the row survives and the detail still returns it', async () => {
      const response = await patchCourse(studentA, courseId, { isActive: false }).expect(
        HttpStatus.OK
      );

      expect(response.body).toMatchObject({ id: courseId, isActive: false });

      const row = await app.prisma.course.findUnique({ where: { id: courseId } });
      expect(row).not.toBeNull(); // no hard delete
      expect(row!.isActive).toBe(false);

      const detail = await getCourse(studentA, courseId).expect(HttpStatus.OK);
      expect(detail.body).toMatchObject({ id: courseId, isActive: false });
    });

    it('the default list excludes the archived course', async () => {
      const response = await getCourseList(studentA).expect(HttpStatus.OK);

      expect(response.body.map((row: { id: string }) => row.id)).not.toContain(courseId);
    });

    it('?includeArchived=true includes the archived course', async () => {
      const response = await getCourseList(studentA, '?includeArchived=true').expect(HttpStatus.OK);

      const rows = response.body.filter((row: { id: string }) => row.id === courseId);
      expect(rows).toHaveLength(1);
      expect(rows[0].isActive).toBe(false);
    });

    it('?includeArchived=false behaves like the default (active only)', async () => {
      const response = await getCourseList(studentA, '?includeArchived=false').expect(
        HttpStatus.OK
      );

      expect(response.body.map((row: { id: string }) => row.id)).not.toContain(courseId);
    });

    it('isActive: true restores — the course is back in the default list', async () => {
      const response = await patchCourse(studentA, courseId, { isActive: true }).expect(
        HttpStatus.OK
      );

      expect(response.body).toMatchObject({ id: courseId, isActive: true });

      const list = await getCourseList(studentA).expect(HttpStatus.OK);
      expect(list.body.map((row: { id: string }) => row.id)).toContain(courseId);
    });
  });

  // ==================== 401 unauthenticated (all routes) ====================

  describe('unauthenticated → 401 (global guard regression)', () => {
    it('POST /courses without a token → 401', async () => {
      await agent
        .post('/courses')
        .send({ code: 'NOAUTH', name: 'No Auth Course' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('GET /courses without a token → 401', async () => {
      await agent.get('/courses').expect(HttpStatus.UNAUTHORIZED);
    });

    it('GET /courses/:id without a token → 401', async () => {
      await agent.get(`/courses/${uuidv4()}`).expect(HttpStatus.UNAUTHORIZED);
    });

    it('PATCH /courses/:id without a token → 401', async () => {
      await agent
        .patch(`/courses/${uuidv4()}`)
        .send({ name: 'No Auth' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
