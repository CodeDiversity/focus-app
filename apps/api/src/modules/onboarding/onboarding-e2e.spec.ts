import { HttpStatus } from '@nestjs/common';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * SP-107F e2e spec: the onboarding wizard as a **student journey**, over real
 * HTTP against a real PostgreSQL database (the `test-http` harness carries
 * the real onboarding + semesters + courses modules — `main.ts` parity).
 *
 * This is the cross-layer wire proof the SP-107A–E children bracketed from
 * their own sides (SP-106D precedent):
 *
 * - AC1 complete flow: register → login → `GET /onboarding` (step 1, not
 *   completed) → step 1 (`PATCH /users/me` + `PATCH /onboarding { step: 2 }`)
 *   → step 2 (`POST /semesters` + `PATCH /onboarding { step: 3, semesterId }`)
 *   → step 3 (`POST /courses` + `PATCH /onboarding { completed: true }`) →
 *   `GET /onboarding` (completed). The semester and course rows exist, are
 *   owned by the student, and the course is attached to the onboarding
 *   semester. *(AC-107-01, AC-107-06, AC-107-07, AC-E01-06)*
 * - AC2 resume: a fresh `GET` (page reload) and a fresh login (sign-out/in)
 *   both report the saved step. *(AC-107-02, AC-107-03, TR-107-01)*
 * - AC3 skip: from step 2, `PATCH { completed: true }` completes onboarding
 *   with **no** semester or course rows. *(AC-107-04, TR-107-02)*
 * - AC4 terminal: any further `PATCH` → 409; every session (including a
 *   fresh login) `GET`s `completed: true` — the decision input the frontend
 *   entry points (login redirect, `/onboarding` route, SP-107C) consume to
 *   resolve to the app, never the wizard. *(AC-107-05, TR-107-03)*
 * - AC5 two-student isolation: A cannot read or modify B's onboarding state
 *   (no id in the routes; B's row byte-identical); A's `POST /courses` with
 *   B's semester id → uniform 404, no row, B's semester untouched; A and B
 *   may share a semester *name* (per-student `@@unique`), while A's own
 *   duplicate → 409. *(AC-E01-03, AC-E01-04, TR-107-01…04)*
 * - AC6 backfill (D107-2): a pre-migration-style row (completedAt set,
 *   step 1 — the migration's backfill shape) is terminal: the wizard is
 *   never offered; a registration created after the migration starts at
 *   step 1. *(D107-2)*
 *
 * The cases are ordered as the student journey and each asserts on real rows
 * via the harness `prisma` handle. The cases within the suite are
 * state-dependent by design (a journey, not a set of isolated requests).
 *
 * Self-skips when `DATABASE_URL` is unset (the SP-104/SP-105/SP-106/SP-107A
 * convention), so a bare local `pnpm test` still works; the verification
 * run supplies `DATABASE_URL` (via the `dotenv -e .env.local` wrapper) so
 * the suite executes with zero skips.
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/** The exact GET/PATCH /onboarding contract keys — nothing more. */
const ONBOARDING_KEYS = ['completed', 'completedAt', 'semesterId', 'step'].sort();

/** The fresh state every post-migration registration starts in (D107-2). */
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
  /** The `refresh_token` Set-Cookie pair from this login, for a real logout. */
  refreshCookie: string;
}

describeIntegration('onboarding wizard end-to-end (real database, SP-107F)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string): string =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-wizard`;

  // One shared semester name: A and B may each create it (per-student
  // `@@unique([userId, name])`), while a second copy of *A's own* name 409s.
  const sharedSemesterName = `Fall ${runId}`;
  const semesterDates = { startDate: '2026-09-01', endDate: '2027-01-15' };

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  // Non-optional by type: if seeding fails, the suite fails in beforeAll
  // (afterAll's filter keeps cleanup from crashing on partial seeding).
  let studentA: Session; // the complete-flow journey (AC1, AC4)
  let studentB: Session; // the resume + skip journey (AC2, AC3, AC5)
  let backfillSim: Session; // pre-migration-style row, seeded via prisma (AC6)
  let backfillSimId: string;
  let backfillSimEmail: string;
  let freshStudentId: string; // the post-migration registration (AC6)

  // Rows created during the journey (for row-level assertions).
  let semesterAId: string;
  let courseAId: string;
  let semesterBId: string;

  async function registerAndLogin(label: string): Promise<Session> {
    const email = uniqueEmail(label);

    // No Authorization header on purpose: these are the allowlisted public routes.
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

    // AC6: simulate the D107-2 backfill — a row that existed *before* the
    // onboarding migration: completedAt set (the one-shot `UPDATE … = now()`),
    // step at the schema default. Seeded directly via the harness `prisma`
    // handle because the backfill only ever ran for pre-migration rows; the
    // password is a real argon2id hash so the login below is a real one.
    const backfillRow = await app.prisma.user.create({
      data: {
        email: uniqueEmail('backfill-sim'),
        name: 'Student backfill-sim',
        passwordHash: await argon2.hash(password),
        onboardingCompletedAt: new Date('2026-10-18T14:14:20.000Z'),
        onboardingStep: 1,
      },
    });
    backfillSimId = backfillRow.id;
    backfillSimEmail = backfillRow.email;
    backfillSim = await loginAs(backfillSimEmail);
  }, 180_000);

  afterAll(async () => {
    if (!app) return;
    // Deleting the users cascades (onDelete: Cascade) to their semesters,
    // courses, refresh tokens, and verification tokens.
    await app.prisma.user.deleteMany({
      where: {
        id: {
          in: [studentA?.id, studentB?.id, backfillSimId, freshStudentId].filter(
            (id): id is string => Boolean(id)
          ),
        },
      },
    });
    await app.app.close();
  }, 60_000);

  // ==================== AC1 — complete flow (student A) ====================

  describe('AC1 — complete flow (AC-107-01, AC-107-06, AC-107-07, AC-E01-06)', () => {
    it('register → login → step 1 → semester → course → completed, with real owned rows', async () => {
      // Fresh post-migration registration: the wizard is for them (D107-2).
      const initial = await getOnboarding(studentA).expect(HttpStatus.OK);
      expect(initial.body).toEqual(FRESH_STATE);
      expect(Object.keys(initial.body).sort()).toEqual(ONBOARDING_KEYS);

      // Step 1: preferences through the existing SP-106 endpoint, then the
      // onboarding pointer advances.
      await agent
        .patch('/users/me')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ name: 'Student student-a (full flow)', timeZone: 'Europe/Berlin' })
        .expect(HttpStatus.OK);
      const toStep2 = await patchOnboarding(studentA, { step: 2 }).expect(HttpStatus.OK);
      expect(toStep2.body).toEqual({ ...FRESH_STATE, step: 2 });

      // Step 2: the first semester (calendar dates, yyyy-MM-dd on the wire).
      const semester = await agent
        .post('/semesters')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ name: sharedSemesterName, ...semesterDates })
        .expect(HttpStatus.CREATED);
      expect(semester.body).toMatchObject({
        name: sharedSemesterName,
        startDate: semesterDates.startDate,
        endDate: semesterDates.endDate,
        isActive: false,
      });
      semesterAId = semester.body.id;

      const toStep3 = await patchOnboarding(studentA, { step: 3, semesterId: semesterAId }).expect(
        HttpStatus.OK
      );
      expect(toStep3.body).toEqual({
        step: 3,
        completed: false,
        completedAt: null,
        semesterId: semesterAId,
      });

      // Step 3: the optional first course, attached to the onboarding semester.
      const course = await agent
        .post('/courses')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({
          code: `CS${runId}`,
          name: 'Introduction to Computer Science',
          semesterId: semesterAId,
        })
        .expect(HttpStatus.CREATED);
      expect(course.body).toMatchObject({
        code: `CS${runId}`,
        name: 'Introduction to Computer Science',
      });
      courseAId = course.body.id;

      // Completion: terminal.
      const completed = await patchOnboarding(studentA, { completed: true }).expect(HttpStatus.OK);
      expect(completed.body.completed).toBe(true);
      expect(typeof completed.body.completedAt).toBe('string');

      // Reload: the wizard is over — and the stored semester still resolves.
      const final = await getOnboarding(studentA).expect(HttpStatus.OK);
      expect(final.body).toEqual({
        step: 3,
        completed: true,
        completedAt: completed.body.completedAt,
        semesterId: semesterAId,
      });

      // The rows exist, are owned by the student, and the course is attached
      // to the onboarding semester (the response omits semesterId by contract
      // — the row is the source of truth).
      const semesterRow = await app.prisma.semester.findUnique({ where: { id: semesterAId } });
      expect(semesterRow).toMatchObject({
        id: semesterAId,
        userId: studentA.id,
        name: sharedSemesterName,
      });
      expect(semesterRow?.startDate.toISOString().slice(0, 10)).toBe(semesterDates.startDate);
      expect(semesterRow?.endDate.toISOString().slice(0, 10)).toBe(semesterDates.endDate);

      const courseRow = await app.prisma.course.findUnique({ where: { id: courseAId } });
      expect(courseRow).toMatchObject({
        id: courseAId,
        userId: studentA.id,
        semesterId: semesterAId,
      });
    });
  });

  // ==================== AC2 — resume (student B, mid-flow) ====================

  describe('AC2 — resume: reload + sign-out/in (AC-107-02, AC-107-03, TR-107-01)', () => {
    it('a fresh GET (reload) and a fresh login (sign-out/in) both report the saved step', async () => {
      // B starts fresh, then completes step 1 (advances to step 2).
      expect((await getOnboarding(studentB).expect(HttpStatus.OK)).body).toEqual(FRESH_STATE);
      await patchOnboarding(studentB, { step: 2 }).expect(HttpStatus.OK);

      // Reload: a fresh GET reports the saved step.
      const reloaded = await getOnboarding(studentB).expect(HttpStatus.OK);
      expect(reloaded.body.step).toBe(2);
      expect(reloaded.body.completed).toBe(false);

      // Sign-out/in: a real logout (the session is revoked), then a fresh
      // real login — the saved step survives both.
      await agent.post('/auth/logout').set('Cookie', studentB.refreshCookie).expect(HttpStatus.OK);
      const newSession = await loginAs(studentB.email);
      expect(newSession.id).toBe(studentB.id);
      expect(newSession.refreshCookie).not.toBe(studentB.refreshCookie);

      // The old session is genuinely gone (SP-105 family revocation): its
      // refresh credential 401s, the new one is live.
      await agent
        .post('/auth/refresh')
        .set('Cookie', studentB.refreshCookie)
        .expect(HttpStatus.UNAUTHORIZED);
      await agent
        .post('/auth/refresh')
        .set('Cookie', newSession.refreshCookie)
        .expect(HttpStatus.OK);

      // The new session reads back the saved step — and the row is the
      // source of truth (persistence is in the database, not a session).
      const afterRelogin = await getOnboarding(newSession).expect(HttpStatus.OK);
      expect(afterRelogin.body.step).toBe(2);
      expect(afterRelogin.body.completed).toBe(false);
      expect(afterRelogin.body.semesterId).toBeNull();

      const stored = await app.prisma.user.findUnique({
        where: { id: studentB.id },
        select: { onboardingStep: true, onboardingCompletedAt: true, onboardingSemesterId: true },
      });
      expect(stored).toEqual({
        onboardingStep: 2,
        onboardingCompletedAt: null,
        onboardingSemesterId: null,
      });

      // Leave B in the new session for the skip case below.
      studentB = newSession;
    });
  });

  // ==================== AC3 — skip (student B, from step 2) ====================

  describe('AC3 — skip from step 2 (AC-107-04, TR-107-02)', () => {
    it('completes onboarding with no semester or course rows', async () => {
      // B is at step 2 (AC2) — skip is offered from step 2 onward (D107-4).
      const skipped = await patchOnboarding(studentB, { completed: true }).expect(HttpStatus.OK);
      expect(skipped.body.completed).toBe(true);
      expect(typeof skipped.body.completedAt).toBe('string');

      // Reload: terminal — the wizard is over, and no optional data was
      // recorded (no stored semester).
      const after = await getOnboarding(studentB).expect(HttpStatus.OK);
      expect(after.body).toEqual({
        step: 2,
        completed: true,
        completedAt: skipped.body.completedAt,
        semesterId: null,
      });

      // No optional data: B has neither a semester nor a course row.
      expect(await app.prisma.semester.count({ where: { userId: studentB.id } })).toBe(0);
      expect(await app.prisma.course.count({ where: { userId: studentB.id } })).toBe(0);
    });
  });

  // ==================== AC4 — terminal (both completed students) ====================

  describe('AC4 — terminal: never re-appears (AC-107-05, TR-107-03)', () => {
    it('any further PATCH /onboarding → 409 for both completed students', async () => {
      // A (completed via the full flow) and B (completed via skip).
      const attempts: Array<[Session, Record<string, unknown>]> = [
        [studentA, { completed: true }],
        [studentA, { step: 1 }],
        [studentA, { semesterId: semesterAId }],
        [studentB, { step: 1 }],
      ];

      for (const [session, body] of attempts) {
        const response = await patchOnboarding(session, body).expect(HttpStatus.CONFLICT);
        expect(response.body).toMatchObject({ statusCode: HttpStatus.CONFLICT });
        expect(response.body.message).toContain('completed');
      }

      // Neither student's state moved: both still terminal, no re-open.
      expect((await getOnboarding(studentA).expect(HttpStatus.OK)).body.completed).toBe(true);
      expect((await getOnboarding(studentB).expect(HttpStatus.OK)).body.completed).toBe(true);
    });

    it('entry points resolve to the app: every session — including a fresh login — reads completed', async () => {
      // The frontend entry points (the login redirect and the `/onboarding`
      // route, SP-107C) both consume `GET /onboarding` and redirect to the
      // app when `completed` is true (their redirect behavior is pinned by
      // SP-107C's component tests in the web suite). This case proves the
      // API-side decision input over the wire: on *every* session — a new
      // login included — the state is terminal, so both entry points resolve
      // to the app, never the wizard.
      await agent.post('/auth/logout').set('Cookie', studentA.refreshCookie).expect(HttpStatus.OK);
      const newSession = await loginAs(studentA.email);
      expect(newSession.id).toBe(studentA.id);

      const fresh = await getOnboarding(newSession).expect(HttpStatus.OK);
      expect(fresh.body.completed).toBe(true);
      expect(fresh.body.completedAt).toBeTruthy();

      // B's direct `/onboarding` route input, same session: terminal too.
      expect((await getOnboarding(studentB).expect(HttpStatus.OK)).body.completed).toBe(true);
    });
  });

  // ==================== AC5 — cross-student isolation (two students, real SQL) ====================

  describe('AC5 — cross-student isolation (AC-E01-03, AC-E01-04, TR-107-01…04)', () => {
    it("A cannot read or modify B's onboarding state; B's row is byte-identical", async () => {
      const bBefore = await app.prisma.user.findUnique({ where: { id: studentB.id } });

      // A reads: only A's own state — the shape has no id at all, and no B
      // value appears anywhere in the body.
      const aState = await getOnboarding(studentA).expect(HttpStatus.OK);
      expect(aState.body).not.toHaveProperty('id');
      expect(Object.keys(aState.body).sort()).toEqual(ONBOARDING_KEYS);
      expect(JSON.stringify(aState.body)).not.toContain(studentB.id);
      expect(JSON.stringify(aState.body)).not.toContain(studentB.email);

      // A attempts to name B in the body: the global pipe (forbidNonWhitelisted)
      // rejects it — there is no id parameter or field to smuggle.
      const smuggled = await patchOnboarding(studentA, {
        userId: studentB.id,
        step: 1,
      }).expect(HttpStatus.BAD_REQUEST);
      expect(smuggled.body.errors).toHaveProperty('userId');

      // A's own (terminal) write 409s and writes nothing…
      await patchOnboarding(studentA, { step: 1 }).expect(HttpStatus.CONFLICT);

      // …and B's row is byte-identical (no existence oracle, no write).
      const bAfter = await app.prisma.user.findUnique({ where: { id: studentB.id } });
      expect(bAfter).toEqual(bBefore);

      // B reads their own state, unaffected.
      expect((await getOnboarding(studentB).expect(HttpStatus.OK)).body.completed).toBe(true);
    });

    it("A's POST /courses with B's semester id → uniform 404; no row; B's semester untouched", async () => {
      // B (who skipped the wizard) still owns the academic-structure
      // endpoints: B creates a semester — with A's name (see the next case).
      const bSemester = await agent
        .post('/semesters')
        .set('Authorization', `Bearer ${studentB.accessToken}`)
        .send({ name: sharedSemesterName, ...semesterDates })
        .expect(HttpStatus.CREATED);
      semesterBId = bSemester.body.id;
      expect(bSemester.body.id).not.toBe(semesterAId);

      const bSemesterBefore = await app.prisma.semester.findUnique({ where: { id: semesterBId } });
      const aCoursesBefore = await app.prisma.course.count({ where: { userId: studentA.id } });

      // A references B's semester: the ownership predicate (id + A's userId)
      // misses → the uniform 404, indistinguishable from a missing id.
      const response = await agent
        .post('/courses')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ code: `XX${runId}`, name: 'Foreign Semester Course', semesterId: semesterBId })
        .expect(HttpStatus.NOT_FOUND);
      expect(response.body.message).toBe('Resource not found');

      // No course row was written…
      expect(await app.prisma.course.count({ where: { userId: studentA.id } })).toBe(
        aCoursesBefore
      );
      expect(
        await app.prisma.course.count({
          where: { semesterId: semesterBId, userId: studentA.id },
        })
      ).toBe(0);

      // …and B's semester row is byte-identical (its existence was never
      // revealed — the same 404 a missing id produces).
      const bSemesterAfter = await app.prisma.semester.findUnique({ where: { id: semesterBId } });
      expect(bSemesterAfter).toEqual(bSemesterBefore);
    });

    it('A and B may share a semester name; A duplicating A own name → 409', async () => {
      // The previous case already created B's same-name semester (201).
      // A duplicating A's own name hits the per-student @@unique([userId, name]).
      const duplicate = await agent
        .post('/semesters')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ name: sharedSemesterName, ...semesterDates })
        .expect(HttpStatus.CONFLICT);
      expect(duplicate.body.message).toContain('semester');

      // Both same-name rows exist — one per student.
      const sameName = await app.prisma.semester.findMany({
        where: { name: sharedSemesterName },
        select: { id: true, userId: true },
      });
      expect(sameName).toHaveLength(2);
      expect(sameName.map((row) => row.userId).sort()).toEqual([studentA.id, studentB.id].sort());
    });
  });

  // ==================== AC6 — backfill (D107-2) ====================

  describe('AC6 — backfill (D107-2)', () => {
    it('a pre-migration-style row (completedAt set, step 1) is terminal: the wizard is never offered', async () => {
      // backfillSim was seeded with the backfill shape (completedAt set,
      // step at the schema default) and logged in for real.
      const state = await getOnboarding(backfillSim).expect(HttpStatus.OK);
      expect(state.body).toEqual({
        step: 1,
        completed: true,
        completedAt: '2026-10-18T14:14:20.000Z',
        semesterId: null,
      });

      // The wizard never re-opens: any write is terminal.
      await patchOnboarding(backfillSim, { step: 2 }).expect(HttpStatus.CONFLICT);
      await patchOnboarding(backfillSim, { completed: true }).expect(HttpStatus.CONFLICT);
    });

    it('a registration created after the migration starts at step 1 (not backfilled)', async () => {
      // A brand-new registration (post-migration) is exactly who the wizard
      // is for: step 1, not completed, no stored semester.
      const fresh = await registerAndLogin('student-new');
      freshStudentId = fresh.id;

      const state = await getOnboarding(fresh).expect(HttpStatus.OK);
      expect(state.body).toEqual(FRESH_STATE);

      // …and the row agrees (no backfill timestamp).
      const stored = await app.prisma.user.findUnique({
        where: { id: fresh.id },
        select: { onboardingStep: true, onboardingCompletedAt: true, onboardingSemesterId: true },
      });
      expect(stored).toEqual({
        onboardingStep: 1,
        onboardingCompletedAt: null,
        onboardingSemesterId: null,
      });
    });
  });
});
