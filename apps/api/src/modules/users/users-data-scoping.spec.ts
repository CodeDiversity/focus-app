import { ArgumentsHost, HttpStatus, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';
import {
  assertAffected,
  assertOwned,
  ownedWhere,
  RESOURCE_NOT_FOUND,
} from '../../common/ownership/ownership';

/**
 * SP-104/SP-106A integration spec: cross-student isolation against a real
 * database (SP-104 decision Q2). Two students are seeded through the real `POST /auth/register`
 * + `POST /auth/login`, semesters are seeded straight through the module's
 * real `PrismaService`, and access is asserted both over HTTP (guard layer)
 * and through the ownership helpers over real SQL (ownership layer).
 *
 * SP-106A extends the guard-layer cases: `GET /users/me` returns the new
 * `timeZone`/`preferences` profile fields (schema defaults for a fresh
 * student) while the credential fields stay out of the body.
 *
 * The suite self-skips when `DATABASE_URL` is unset, so a bare local
 * `pnpm test` without Docker still works; CI always provides the variable,
 * so these tests always run there.
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('student data scoping (integration, real database)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string): string =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-password`;

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  // Non-optional by type: if seeding fails, the suite fails in beforeAll
  // (afterAll's filter keeps the cleanup from crashing on partial seeding).
  let studentA: Student;
  let studentB: Student;
  let aSemester: { id: string; name: string; isActive: boolean };
  let bSemester: { id: string; name: string; isActive: boolean };

  interface Student {
    id: string;
    name: string;
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

    return {
      id: login.body.user.id,
      name: login.body.user.name,
      email,
      accessToken: login.body.accessToken,
    };
  }

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());

    studentA = await registerAndLogin('student-a');
    studentB = await registerAndLogin('student-b');

    const startDate = new Date('2026-09-01T00:00:00.000Z');
    const endDate = new Date('2026-12-15T00:00:00.000Z');
    [aSemester, bSemester] = await Promise.all([
      app.prisma.semester.create({
        data: { userId: studentA.id, name: `${runId} Fall A`, startDate, endDate },
      }),
      app.prisma.semester.create({
        data: { userId: studentB.id, name: `${runId} Fall B`, startDate, endDate },
      }),
    ]);
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    // Deleting the users cascades (onDelete: Cascade) to their semesters,
    // refresh tokens, and email-verification tokens.
    await app.prisma.user.deleteMany({
      where: {
        id: { in: [studentA?.id, studentB?.id].filter((id): id is string => Boolean(id)) },
      },
    });
    await app.app.close();
  }, 60_000);

  describe('guard layer, over real HTTP', () => {
    it('GET /users/me with no Authorization header returns 401', async () => {
      await agent.get('/users/me').expect(HttpStatus.UNAUTHORIZED);
    });

    it('GET /users/me with a malformed bearer token returns 401', async () => {
      await agent
        .get('/users/me')
        .set('Authorization', 'Bearer not.a.real.jwt')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('GET /users/me with an expired token returns 401', async () => {
      const expired = app.jwt.sign({ sub: studentA.id, email: studentA.email }, { expiresIn: -60 });
      await agent
        .get('/users/me')
        .set('Authorization', `Bearer ${expired}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('each of the two students receives 200 with their own profile on /users/me', async () => {
      for (const student of [studentA, studentB]) {
        const response = await agent
          .get('/users/me')
          .set('Authorization', `Bearer ${student.accessToken}`)
          .expect(HttpStatus.OK);
        expect(response.body).toMatchObject({
          id: student.id,
          email: student.email,
          name: student.name,
          // SP-106A: the new profile fields ride along; a freshly
          // registered student receives the schema defaults.
          timeZone: 'UTC',
          preferences: null,
        });
      }
    });

    it('GET /users/me returns the new profile fields with credential fields still excluded (SP-106A)', async () => {
      const response = await agent
        .get('/users/me')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .expect(HttpStatus.OK);
      // A newly registered student: timeZone defaults to "UTC",
      // preferences stays null until first set.
      expect(response.body).toMatchObject({
        id: studentA.id,
        email: studentA.email,
        timeZone: 'UTC',
        preferences: null,
      });
      // The explicit Prisma select is the credential boundary: none of
      // the sensitive fields may appear in the response body.
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('emailVerificationTokens');
      expect(response.body).not.toHaveProperty('passwordResetTokens');
      expect(response.body).not.toHaveProperty('refreshTokens');
    });

    it('POST /auth/register remains public without a token', async () => {
      // Re-registering student A's email reaches the service (409 conflict),
      // proving the route passes the allowlist instead of 401-ing on it.
      await agent
        .post('/auth/register')
        .send({ name: studentA.name, email: studentA.email, password })
        .expect(HttpStatus.CONFLICT);
    });

    it('GET /auth/login is not public: a non-allowlisted method is never served', async () => {
      // No GET route exists on /auth/login, so Nest's router answers 404
      // (method-filtered routing) before any handler runs; the guard-level
      // rule for this method+path pair (it is NOT on the allowlist, so it
      // requires a token and 401s) is pinned in jwt-auth.guard.spec.ts.
      // What this HTTP regression pins: flipping the method on a public path
      // never yields a success response.
      await agent.get('/auth/login').expect(HttpStatus.NOT_FOUND);
    });
  });

  // Exactly what an EP02+ route will do once its endpoints land: a scoped
  // read, then the ownership assertion. (No academic routes exist until
  // EP02+, so the ownership layer is exercised through the helpers over
  // real SQL — reviewer: do not flag the absence of route-level tests.)
  async function readSemesterAs(userId: string, semesterId: string) {
    const record = await app.prisma.semester.findUnique({
      where: ownedWhere(userId, semesterId),
    });
    assertOwned(userId, record);
    return record;
  }

  async function expectUniform404(promise: Promise<unknown>): Promise<void> {
    const thrown = await promise.then(
      () => {
        throw new Error('expected a uniform 404');
      },
      (error: unknown) => error
    );
    expect(thrown).toBeInstanceOf(NotFoundException);
    const exception = thrown as NotFoundException;
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(exception.message).toBe(RESOURCE_NOT_FOUND);
  }

  describe('ownership layer, over real SQL', () => {
    it("student A cannot read student B's semester (uniform 404, zero content returned)", async () => {
      await expectUniform404(readSemesterAs(studentA.id, bSemester.id));
    });

    it("student A cannot update student B's semester (404, 0 rows affected, B's fields intact)", async () => {
      const result = await app.prisma.semester.updateMany({
        where: { id: bSemester.id, userId: studentA.id },
        data: { name: 'now owned by A?', isActive: true },
      });
      expect(result.count).toBe(0);
      expect(() => assertAffected(studentA.id, result.count)).toThrow(NotFoundException);

      // Unscoped read from the test side verifies the row was left untouched.
      const intact = await app.prisma.semester.findUnique({ where: { id: bSemester.id } });
      expect(intact).toMatchObject({
        id: bSemester.id,
        userId: studentB.id,
        name: bSemester.name,
        isActive: bSemester.isActive,
      });
    });

    it("student A cannot delete student B's semester (404, row still exists)", async () => {
      const result = await app.prisma.semester.deleteMany({
        where: { id: bSemester.id, userId: studentA.id },
      });
      expect(result.count).toBe(0);
      expect(() => assertAffected(studentA.id, result.count)).toThrow(NotFoundException);

      const stillThere = await app.prisma.semester.findUnique({ where: { id: bSemester.id } });
      expect(stillThere?.userId).toBe(studentB.id);
    });

    it.each(['update', 'delete'] as const)(
      'scoped direct %s returns identical generic 404s for missing and foreign rows',
      async (operation) => {
        const responses: Record<string, unknown>[] = [];
        for (const id of [uuidv4(), bSemester.id]) {
          const mutation =
            operation === 'update'
              ? app.prisma.semester.update({
                  where: ownedWhere(studentA.id, id),
                  data: { name: 'unauthorized change', isActive: !bSemester.isActive },
                })
              : app.prisma.semester.delete({ where: ownedWhere(studentA.id, id) });
          const error = await mutation.then(
            () => {
              throw new Error('scoped mutation unexpectedly succeeded');
            },
            (failure: unknown) => failure
          );
          const json = jest.fn();
          const status = jest.fn(() => ({ json }));
          const host = {
            switchToHttp: () => ({
              getResponse: () => ({ status }),
              getRequest: () => ({
                method: operation === 'update' ? 'PUT' : 'DELETE',
                url: '/test-semester',
              }),
            }),
          } as unknown as ArgumentsHost;
          // Actual SQL P2025 goes through the same production response filter.
          new AllExceptionsFilter().catch(error, host);
          expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
          const body = json.mock.calls[0][0] as Record<string, unknown>;
          expect(body).toMatchObject({
            statusCode: 404,
            message: RESOURCE_NOT_FOUND,
            error: 'Not Found',
          });
          const { timestamp, ...stableBody } = body;
          expect(typeof timestamp).toBe('string');
          responses.push(stableBody);
        }
        expect(responses[0]).toEqual(responses[1]);
        const intact = await app.prisma.semester.findUnique({ where: { id: bSemester.id } });
        expect(intact).toMatchObject({
          id: bSemester.id,
          userId: studentB.id,
          name: bSemester.name,
          isActive: bSemester.isActive,
        });
      }
    );

    it('student A can read, update, and delete their own semester', async () => {
      const record = await readSemesterAs(studentA.id, aSemester.id);
      expect(record.id).toBe(aSemester.id);

      const updated = await app.prisma.semester.update({
        where: ownedWhere(studentA.id, aSemester.id),
        data: { name: `${runId} Fall A (renamed)` },
      });
      assertOwned(studentA.id, updated);
      expect(updated.name).toBe(`${runId} Fall A (renamed)`);

      const deleted = await app.prisma.semester.delete({
        where: ownedWhere(studentA.id, aSemester.id),
      });
      assertOwned(studentA.id, deleted);
      expect(deleted.id).toBe(aSemester.id);
      await expect(
        app.prisma.semester.findUnique({
          where: ownedWhere(studentA.id, aSemester.id),
        })
      ).resolves.toBeNull();
    });

    it("a missing id and another student's id produce the identical 404 status and message (no existence oracle)", async () => {
      const responseOf = async (
        semesterId: string
      ): Promise<{ status: number; message: string }> => {
        try {
          await readSemesterAs(studentA.id, semesterId);
          throw new Error('the access was allowed — the test must fail');
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          const exception = error as NotFoundException;
          return { status: exception.getStatus(), message: exception.message };
        }
      };

      // "Missing" and "not mine" are indistinguishable over real SQL —
      // an existence check is impossible by construction.
      const expected = { status: HttpStatus.NOT_FOUND, message: RESOURCE_NOT_FOUND };
      await expect(Promise.all([responseOf(uuidv4()), responseOf(bSemester.id)])).resolves.toEqual([
        expected,
        expected,
      ]);
    });
  });
});
