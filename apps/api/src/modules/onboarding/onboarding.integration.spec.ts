import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * SP-107A integration spec: onboarding state endpoints on the real stack,
 * over real HTTP against a real database.
 *
 * - GET /onboarding → 200 { step, completed, completedAt, semesterId }
 * - PATCH /onboarding → 200 { same shape }
 * - Step 1→2→3 round-trips; completion records `completedAt`; a completed
 *   state 409s on further writes (terminal, AC-107-05).
 * - Field validation: step range / non-numeric step / `completed: false` /
 *   malformed semesterId / unknown field → 400.
 * - Two-student: A's PATCH never changes B's state and vice versa.
 * - A posts a foreign semesterId → 404 "Resource not found"; the row is
 *   untouched.
 * - No token → 401 on both routes.
 *
 * D107-2 note: the migration backfill marks only rows that existed *before*
 * the migration as completed.  Students registered *after* it (like the
 * ones this spec creates) start at `step: 1, completed: false` — they are
 * exactly who the wizard is for.
 *
 * Self-skips when `DATABASE_URL` is unset (the SP-104/SP-105/SP-106
 * convention), so a bare local `pnpm test` still works; the verification
 * run supplies `DATABASE_URL` so the suite executes with zero skips.
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/** The exact GET/PATCH /onboarding contract keys — nothing more. */
const ONBOARDING_KEYS = ['completed', 'completedAt', 'semesterId', 'step'].sort();

/** The fresh (newly registered) onboarding state every test student starts in. */
const FRESH_STATE = {
  step: 1,
  completed: false,
  completedAt: null,
  semesterId: null,
};

interface Session {
  id: string;
  name: string;
  email: string;
  accessToken: string;
  refreshCookie: string;
}

describeIntegration('onboarding state integration (real database, SP-107A)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string): string =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-onboard`;

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  let studentA: Session;
  let studentB: Session;

  async function registerAndLogin(label: string): Promise<Session> {
    const email = uniqueEmail(label);

    const registration = await agent
      .post('/auth/register')
      .send({ name: `Student ${label}`, email, password })
      .expect(HttpStatus.CREATED);
    expect(registration.body).toMatchObject({ email });

    return loginAs(email);
  }

  async function loginAs(email: string): Promise<Session> {
    const login = await agent.post('/auth/login').send({ email, password }).expect(HttpStatus.OK);
    expect(login.body.accessToken).toBeTruthy();

    const setCookie = login.headers['set-cookie'] as unknown as string[] | undefined;
    const refreshCookie = (setCookie ?? []).find((cookie) => cookie.startsWith('refresh_token='));
    expect(refreshCookie).toBeTruthy();

    return {
      id: login.body.user.id,
      name: login.body.user.name,
      email,
      accessToken: login.body.accessToken,
      refreshCookie: refreshCookie as string,
    };
  }

  /**
   * The helpers return the supertest chain (not an awaited response) so
   * callers can either `await` it for the raw response or chain
   * `.expect(status)` before awaiting.
   */
  function getOnboarding(session: Session) {
    return agent.get('/onboarding').set('Authorization', `Bearer ${session.accessToken}`);
  }

  function patchOnboarding(session: Session, body: Record<string, unknown>) {
    return agent
      .patch('/onboarding')
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
    // Deleting the users cascades (onDelete: Cascade) to their semesters.
    await app.prisma.user.deleteMany({
      where: {
        id: { in: [studentA?.id, studentB?.id].filter((id): id is string => Boolean(id)) },
      },
    });
    await app.app.close();
  }, 60_000);

  // ==================== AC: GET /onboarding ====================

  describe('GET /onboarding', () => {
    it('returns 200 { step: 1, completed: false, completedAt: null, semesterId: null } for a newly registered student', async () => {
      // New registrations are NOT backfilled (D107-2 applies to pre-migration
      // rows only) — the wizard is for them.
      const response = await getOnboarding(studentA);
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual(FRESH_STATE);
      expect(Object.keys(response.body).sort()).toEqual(ONBOARDING_KEYS);
    });

    it('each student sees their own state (self-scoped read, no id parameter)', async () => {
      const responseA = await getOnboarding(studentA).expect(HttpStatus.OK);
      const responseB = await getOnboarding(studentB).expect(HttpStatus.OK);

      expect(responseA.body).toEqual(FRESH_STATE);
      expect(responseB.body).toEqual(FRESH_STATE);
    });
  });

  // ==================== AC: PATCH round-trip + completion (student A) ====================

  describe('PATCH /onboarding round-trip (student A, fresh)', () => {
    it('step 1→2→3 round-trips, reloads reflect each save, completion records completedAt', async () => {
      // 1 → 2
      const r1 = await patchOnboarding(studentA, { step: 2 }).expect(HttpStatus.OK);
      expect(r1.body).toEqual({ ...FRESH_STATE, step: 2 });
      // Reload reflects the save.
      expect((await getOnboarding(studentA).expect(HttpStatus.OK)).body.step).toBe(2);

      // 2 → 3
      const r2 = await patchOnboarding(studentA, { step: 3 }).expect(HttpStatus.OK);
      expect(r2.body.step).toBe(3);
      expect((await getOnboarding(studentA).expect(HttpStatus.OK)).body.step).toBe(3);

      // Completion (the skip path, D107-4) — 200 with completed: true.
      const r3 = await patchOnboarding(studentA, { completed: true }).expect(HttpStatus.OK);
      expect(r3.body.completed).toBe(true);
      expect(typeof r3.body.completedAt).toBe('string');

      // Reload reflects completion (AC-107-05: never re-appears).
      const after = await getOnboarding(studentA).expect(HttpStatus.OK);
      expect(after.body.completed).toBe(true);
      expect(after.body.step).toBe(3);
      expect(after.body.completedAt).toBe(r3.body.completedAt);
    });
  });

  // ==================== AC: terminal 409 (student A, completed above) ====================

  describe('Terminal 409 (student A is completed)', () => {
    it('any write to a completed state → 409', async () => {
      const bodies: Record<string, unknown>[] = [
        { completed: true },
        { step: 1 },
        { semesterId: uuidv4() },
      ];

      for (const body of bodies) {
        const response = await patchOnboarding(studentA, body).expect(HttpStatus.CONFLICT);
        expect(response.body).toMatchObject({ statusCode: HttpStatus.CONFLICT });
        expect(response.body.message).toContain('completed');
      }
    });

    it('an empty body → 400 (the field check precedes the terminal check)', async () => {
      const response = await patchOnboarding(studentA, {}).expect(HttpStatus.BAD_REQUEST);
      expect(response.body).toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
      expect(response.body.message).toBe('At least one field must be provided');
    });
  });

  // ==================== AC: field validation 400 (student B, not completed) ====================

  describe('Field validation 400 (student B, not completed)', () => {
    it('step outside 1..3 → 400 with a field-level error', async () => {
      const response = await patchOnboarding(studentB, { step: 5 }).expect(HttpStatus.BAD_REQUEST);
      expect(response.body).toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
      expect(response.body.errors).toHaveProperty('step');
    });

    it('a non-numeric step → 400 with a field-level error', async () => {
      const response = await patchOnboarding(studentB, { step: 'abc' }).expect(
        HttpStatus.BAD_REQUEST
      );
      expect(response.body.errors).toHaveProperty('step');
    });

    it('completed: false → 400', async () => {
      const response = await patchOnboarding(studentB, { completed: false }).expect(
        HttpStatus.BAD_REQUEST
      );
      expect(response.body.message).toContain('false');
    });

    it('a malformed semesterId → 400 with a field-level error', async () => {
      const response = await patchOnboarding(studentB, { semesterId: 'not-a-uuid' }).expect(
        HttpStatus.BAD_REQUEST
      );
      expect(response.body.errors).toHaveProperty('semesterId');
    });

    it('an unknown field → 400 (global forbidNonWhitelisted)', async () => {
      const response = await patchOnboarding(studentB, { bogus: 1 }).expect(HttpStatus.BAD_REQUEST);
      expect(response.body).toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
      expect(response.body.errors).toHaveProperty('bogus');
    });
  });

  // ==================== AC: Two-student isolation (TR-107-01, AC-E01-04) ====================

  describe('Two-student isolation', () => {
    it("A's PATCH never changes B's state", async () => {
      const bBefore = await app.prisma.user.findUnique({
        where: { id: studentB.id },
        select: {
          onboardingStep: true,
          onboardingCompletedAt: true,
          onboardingSemesterId: true,
        },
      });

      // A is terminal (completed above) — the write 409s.
      await patchOnboarding(studentA, { step: 2 }).expect(HttpStatus.CONFLICT);

      const bAfter = await app.prisma.user.findUnique({
        where: { id: studentB.id },
        select: {
          onboardingStep: true,
          onboardingCompletedAt: true,
          onboardingSemesterId: true,
        },
      });

      expect(bAfter).toEqual(bBefore);
      expect((await getOnboarding(studentB).expect(HttpStatus.OK)).body).toEqual(FRESH_STATE);
    });

    it("B's PATCH never changes A's state", async () => {
      const aBefore = await app.prisma.user.findUnique({
        where: { id: studentA.id },
        select: {
          onboardingStep: true,
          onboardingCompletedAt: true,
          onboardingSemesterId: true,
        },
      });

      // B is not completed — the write succeeds for B only.
      const response = await patchOnboarding(studentB, { step: 2 }).expect(HttpStatus.OK);
      expect(response.body.step).toBe(2);

      const aAfter = await app.prisma.user.findUnique({
        where: { id: studentA.id },
        select: {
          onboardingStep: true,
          onboardingCompletedAt: true,
          onboardingSemesterId: true,
        },
      });

      expect(aAfter).toEqual(aBefore);
      // A still sees their own (completed) state.
      const aState = await getOnboarding(studentA).expect(HttpStatus.OK);
      expect(aState.body.completed).toBe(true);
      expect(aState.body.step).toBe(3);
    });
  });

  // ==================== AC: foreign semesterId → 404 (student B, not completed) ====================

  describe('semesterId ownership', () => {
    it("B posting A's semesterId → 404 'Resource not found'; nothing written", async () => {
      const aSemester = await app.prisma.semester.create({
        data: {
          userId: studentA.id,
          name: `Test Semester ${runId}`,
          startDate: new Date('2026-09-01'),
          endDate: new Date('2027-01-15'),
        },
      });

      const response = await patchOnboarding(studentB, {
        semesterId: aSemester.id,
      }).expect(HttpStatus.NOT_FOUND);
      expect(response.body.message).toBe('Resource not found');

      // A's semester row is untouched.
      const aSemesterAfter = await app.prisma.semester.findUnique({
        where: { id: aSemester.id },
      });
      expect(aSemesterAfter).toEqual(
        expect.objectContaining({
          id: aSemester.id,
          userId: studentA.id,
        })
      );

      // B's onboarding row is untouched (no existence oracle, no write).
      const bAfter = await app.prisma.user.findUnique({
        where: { id: studentB.id },
        select: {
          onboardingStep: true,
          onboardingCompletedAt: true,
          onboardingSemesterId: true,
        },
      });
      expect(bAfter).toEqual({
        onboardingStep: 2,
        onboardingCompletedAt: null,
        onboardingSemesterId: null,
      });

      // Clean up: delete A's test semester.
      await app.prisma.semester.deleteMany({ where: { id: aSemester.id } });
    });

    it('B posting their own semesterId → 200 and stored for resume', async () => {
      const bSemester = await app.prisma.semester.create({
        data: {
          userId: studentB.id,
          name: `Own Semester ${runId}`,
          startDate: new Date('2026-09-01'),
          endDate: new Date('2027-01-15'),
        },
      });

      const response = await patchOnboarding(studentB, {
        semesterId: bSemester.id,
      }).expect(HttpStatus.OK);
      expect(response.body.semesterId).toBe(bSemester.id);

      // Reload reflects the stored semester (step-3 resume, D107-8).
      const reloaded = await getOnboarding(studentB).expect(HttpStatus.OK);
      expect(reloaded.body.semesterId).toBe(bSemester.id);

      // Clean up: delete B's test semester.
      await app.prisma.semester.deleteMany({ where: { id: bSemester.id } });
    });
  });

  // ==================== AC: Unauthenticated → 401 ====================

  describe('Unauthenticated → 401', () => {
    it('GET /onboarding without token → 401', async () => {
      await agent.get('/onboarding').expect(HttpStatus.UNAUTHORIZED);
    });

    it('PATCH /onboarding without token → 401', async () => {
      await agent.patch('/onboarding').send({ step: 2 }).expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
