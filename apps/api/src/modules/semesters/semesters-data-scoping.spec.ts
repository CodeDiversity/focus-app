import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';
import { formatCalendarDate } from '../../common/lib/calendar-date';

/**
 * SP-107B integration spec: `POST /semesters` on the real stack, over real
 * HTTP against a real database (the `test-http` harness, real Prisma
 * against Postgres).
 *
 * - 201 shape: the frontend `Semester` type exactly — dates serialized
 *   `yyyy-MM-dd` (D107-7), `isActive` the schema default `false`.
 * - Validation: invalid dates (`end < start`, `end == start`, malformed) →
 *   400 with the field in the `errors` map; unknown field → 400 (global
 *   `forbidNonWhitelisted`).
 * - Duplicates: same name for the same student → 409 with the specific
 *   message; the same name for another student → 201 (the unique constraint
 *   is per student).
 * - Persistence: the created semester is re-read via a direct
 *   `PrismaService` query (no GET route exists yet, D107-5) with its
 *   `startDate`/`endDate` stored as dates and the principal's `userId`.
 * - No token → 401 (global guard regression, AC-E01-03).
 *
 * Self-skips when `DATABASE_URL` is unset (the SP-104/SP-105/SP-106
 * convention), so a bare local `pnpm test` still works; the verification
 * run supplies `DATABASE_URL` so the suite executes with zero skips.
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/** The exact 201 contract keys — nothing more. */
const SEMESTER_KEYS = [
  'createdAt',
  'endDate',
  'id',
  'isActive',
  'name',
  'startDate',
  'updatedAt',
].sort();

describeIntegration('POST /semesters data scoping (integration, real database, SP-107B)', () => {
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

  // ==================== 401 unauthenticated ====================

  describe('unauthenticated → 401 (global guard regression)', () => {
    it('POST /semesters without a token → 401', async () => {
      await agent
        .post('/semesters')
        .send({ name: 'No Auth', startDate: '2026-09-01', endDate: '2026-12-15' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
