import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * SP-107B integration spec: `POST /courses` on the real stack, over real
 * HTTP against a real database (the `test-http` harness, real Prisma
 * against Postgres).
 *
 * - 201 shape: the frontend `Course` type exactly (no `semesterId` — the
 *   contract's fixed shape; the wizard keeps the semester id in the
 *   onboarding state, D107-8).
 * - `semesterId` ownership (AC-E01-04, D107-6): B posting A's semester id
 *   → uniform 404 `Resource not found`, no course row written, A's semester
 *   untouched; B with their own semester id → 201; omitted → created with
 *   `semesterId: null` (verified via a direct `PrismaService` re-read — no
 *   GET route exists yet).
 * - Duplicates: same code for the same student → 409 with the specific
 *   message; the same code for another student → 201 (the unique constraint
 *   is per student).
 * - Validation: out-of-range credits / malformed color → 400 with the field
 *   in the `errors` map; unknown field → 400 (global `forbidNonWhitelisted`).
 * - No token → 401 on both routes (global guard regression, AC-E01-03).
 *
 * Self-skips when `DATABASE_URL` is unset (the SP-104/SP-105/SP-106
 * convention), so a bare local `pnpm test` still works; the verification
 * run supplies `DATABASE_URL` so the suite executes with zero skips.
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/** The exact 201 contract keys — the frontend `Course` type, nothing more. */
const COURSE_KEYS = [
  'code',
  'color',
  'credits',
  'createdAt',
  'description',
  'id',
  'isActive',
  'name',
  'updatedAt',
].sort();

describeIntegration('POST /courses data scoping (integration, real database, SP-107B)', () => {
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

  describe('semesterId ownership', () => {
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

      // Re-read via a direct query (no GET route exists yet, D107-6): the
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

  describe('201 shape', () => {
    it('returns exactly the frontend Course type shape with schema defaults', async () => {
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
        isActive: true, // schema default
      });
    });

    it('applies provided optional fields (description, credits, color)', async () => {
      const response = await postCourses(studentA, {
        code: `CHEM${runId}`,
        name: 'Chemistry 101',
        description: 'Atoms and moles',
        credits: 3.5,
        color: '#ff0000',
      }).expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        description: 'Atoms and moles',
        credits: 3.5,
        color: '#ff0000',
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

  describe('400 validation (field-level errors map)', () => {
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

    it('an unknown body field → 400 (global forbidNonWhitelisted)', async () => {
      const response = await postCourses(studentB, {
        code: `BIO${runId}`,
        name: 'Biology',
        isActive: false,
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('isActive');
    });
  });

  // ==================== 401 unauthenticated (both routes) ====================

  describe('unauthenticated → 401 (global guard regression)', () => {
    it('POST /courses without a token → 401', async () => {
      await agent
        .post('/courses')
        .send({ code: 'NOAUTH', name: 'No Auth Course' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('POST /semesters without a token → 401', async () => {
      await agent
        .post('/semesters')
        .send({ name: 'No Auth', startDate: '2026-09-01', endDate: '2026-12-15' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
