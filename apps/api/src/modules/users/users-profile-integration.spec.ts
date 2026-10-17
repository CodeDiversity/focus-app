import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * SP-106D integration spec: the profile/preferences round-trip on the real
 * stack, over real HTTP against a real database.
 *
 * The parent's cross-layer obligation (SP-106D AC1–AC4) — the same wire
 * proof SP-106A/B/C bracketed from their own sides:
 *
 * - AC1 cross-session persistence: register → login → GET defaults → PATCH →
 *   logout → login again (new session) → GET returns the saved values.
 * - AC2 cross-student isolation: two students seeded through the real
 *   `POST /auth/register` + `POST /auth/login`; A can only ever reach A's row,
 *   and B's row is verified unchanged with the test's unscoped read.
 * - AC3 credential exclusion: every `GET`/`PATCH /users/me` body has exactly
 *   the eight contract keys — no `passwordHash` or token/verification field.
 * - AC4 field-level 400: an invalid `timeZone` PATCH returns the `errors`
 *   map in the real HTTP body (pipe + filter parity, D106-6).
 *
 * Self-skips when `DATABASE_URL` is unset (the SP-104/SP-105/SP-106A/B
 * convention), so a bare local `pnpm test` still works; the SP-106D
 * verification run supplies `DATABASE_URL` so the suite executes with zero
 * skips.
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/** The exact `GET`/`PATCH /users/me` contract keys (A/B) — nothing more. */
const PROFILE_KEYS = [
  'createdAt',
  'email',
  'emailVerifiedAt',
  'id',
  'name',
  'preferences',
  'timeZone',
  'updatedAt',
].sort();

/** Credential / token fields that must never cross the wire. */
const CREDENTIAL_KEYS = [
  'passwordHash',
  'refreshTokens',
  'emailVerificationTokens',
  'passwordResetTokens',
  'refreshToken',
];

interface Session {
  id: string;
  name: string;
  email: string;
  accessToken: string;
  /** The `refresh_token` Set-Cookie pair from this login, for a real logout. */
  refreshCookie: string;
}

describeIntegration('profile and preferences integration (real database, SP-106D)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string): string =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-profile`;

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  // Non-optional by type: if seeding fails, the suite fails in beforeAll
  // (afterAll's filter keeps cleanup from crashing on partial seeding).
  let studentA: Session;
  let studentB: Session;

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

  function expectNoCredentials(body: Record<string, unknown>): void {
    // The exact key set is the strongest assertion: a credential field
    // cannot be present without changing the shape.
    expect(Object.keys(body).sort()).toEqual(PROFILE_KEYS);
    for (const credentialKey of CREDENTIAL_KEYS) {
      expect(body).not.toHaveProperty(credentialKey);
    }
    // Belt and braces: no credential key rides along anywhere in the payload.
    const serialized = JSON.stringify(body);
    for (const credentialKey of CREDENTIAL_KEYS) {
      expect(serialized).not.toContain(credentialKey);
    }
  }

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());

    studentA = await registerAndLogin('student-a');
    studentB = await registerAndLogin('student-b');
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

  describe('AC1 — cross-session persistence (AC-106-02, AC-106-05, TR-106-02)', () => {
    it('PATCHed profile + preferences survive a logout and a new login', async () => {
      // 1. A freshly registered student reads the schema defaults.
      const initial = await agent
        .get('/users/me')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .expect(HttpStatus.OK);
      expect(initial.body).toMatchObject({ timeZone: 'UTC', preferences: null });

      // 2. Write both profile fields through the real PATCH endpoint.
      const preferences = {
        theme: 'dark',
        studyDefaults: { sessionLengthMinutes: 45 },
      };
      const patched = await agent
        .patch('/users/me')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ timeZone: 'America/New_York', preferences })
        .expect(HttpStatus.OK);
      expect(patched.body).toMatchObject({
        id: studentA.id,
        timeZone: 'America/New_York',
        preferences,
      });

      // 3. Log out for real (the login cookie is used and the session is revoked).
      await agent
        .post('/auth/logout')
        .set('Cookie', studentA.refreshCookie)
        .expect(HttpStatus.OK);

      // 4. A new session: a fresh real login with a new refresh credential.
      //    (Access tokens are not compared byte-wise: their `iat`/`exp` make
      //    two logins in the same second legitimately identical.)
      const newSession = await loginAs(studentA.email);
      expect(newSession.id).toBe(studentA.id);
      expect(newSession.refreshCookie).not.toBe(studentA.refreshCookie);

      // The logged-out session is genuinely gone: its refresh credential is
      // revoked, while the new session's credential is live.
      await agent
        .post('/auth/refresh')
        .set('Cookie', studentA.refreshCookie)
        .expect(HttpStatus.UNAUTHORIZED);
      await agent
        .post('/auth/refresh')
        .set('Cookie', newSession.refreshCookie)
        .expect(HttpStatus.OK);

      // 5. The new session reads back exactly what was saved (AC-106-05).
      const afterRelogin = await agent
        .get('/users/me')
        .set('Authorization', `Bearer ${newSession.accessToken}`)
        .expect(HttpStatus.OK);
      expect(afterRelogin.body).toMatchObject({
        id: studentA.id,
        email: studentA.email,
        timeZone: 'America/New_York',
        preferences,
      });

      // 6. The persistence is in the row, not in a per-session cache.
      const stored = await app.prisma.user.findUnique({
        where: { id: studentA.id },
        select: { timeZone: true, preferences: true },
      });
      expect(stored).toMatchObject({ timeZone: 'America/New_York', preferences });

      // Leave student A in the new session for the isolation cases below.
      studentA = newSession;
    });
  });

  describe('AC2 — cross-student isolation over HTTP (TR-106-03, AC-E01-04)', () => {
    it("A's PATCH cannot name B, and leaves B's row byte-identical", async () => {
      const bBefore = await app.prisma.user.findUnique({ where: { id: studentB.id } });

      // Attempting to smuggle another student's id into the body is rejected
      // by the global pipe (forbidNonWhitelisted) — A cannot name B at all.
      const smuggled = await agent
        .patch('/users/me')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ id: studentB.id, name: 'Student student-a (smuggled)' })
        .expect(HttpStatus.BAD_REQUEST);
      expect(smuggled.body.errors).toHaveProperty('id');

      // A legitimate self-PATCH still leaves B untouched.
      await agent
        .patch('/users/me')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ name: 'Student student-a (renamed)' })
        .expect(HttpStatus.OK);

      const bAfter = await app.prisma.user.findUnique({ where: { id: studentB.id } });
      expect(bAfter).toEqual(bBefore);
    });

    it('each student only ever reads their own profile over HTTP', async () => {
      for (const student of [studentA, studentB]) {
        const response = await agent
          .get('/users/me')
          .set('Authorization', `Bearer ${student.accessToken}`)
          .expect(HttpStatus.OK);

        expect(response.body.id).toBe(student.id);
        expect(response.body.email).toBe(student.email);

        const other = student.id === studentA.id ? studentB : studentA;
        expect(response.body.id).not.toBe(other.id);
        expect(response.body.email).not.toBe(other.email);
        expect(JSON.stringify(response.body)).not.toContain(other.email);
        expect(JSON.stringify(response.body)).not.toContain(other.id);
      }
    });

    it("B's own profile still holds B's values after A's writes", async () => {
      const response = await agent
        .get('/users/me')
        .set('Authorization', `Bearer ${studentB.accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        id: studentB.id,
        email: studentB.email,
        name: studentB.name,
        timeZone: 'UTC',
        preferences: null,
      });
    });
  });

  describe('AC3 — credential exclusion over the wire (AC-106-01)', () => {
    it('GET /users/me returns exactly the eight contract keys', async () => {
      const response = await agent
        .get('/users/me')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .expect(HttpStatus.OK);

      expectNoCredentials(response.body);
    });

    it('PATCH /users/me returns exactly the eight contract keys', async () => {
      const response = await agent
        .patch('/users/me')
        .set('Authorization', `Bearer ${studentB.accessToken}`)
        .send({ timeZone: 'Europe/Berlin' })
        .expect(HttpStatus.OK);

      expectNoCredentials(response.body);

      // Restore B's default so the isolation case above keeps its meaning.
      await agent
        .patch('/users/me')
        .set('Authorization', `Bearer ${studentB.accessToken}`)
        .send({ timeZone: 'UTC' })
        .expect(HttpStatus.OK);
    });
  });

  describe('AC4 — field-level 400 over the wire (AC-106-06, D106-6)', () => {
    it('an invalid timeZone PATCH returns the errors.timeZone map and writes nothing', async () => {
      const before = await app.prisma.user.findUnique({
        where: { id: studentA.id },
        select: { timeZone: true },
      });

      const response = await agent
        .patch('/users/me')
        .set('Authorization', `Bearer ${studentA.accessToken}`)
        .send({ timeZone: 'Mars/Olympus' })
        .expect(HttpStatus.BAD_REQUEST);

      // The additive field map (D106-6) is present in the real HTTP body...
      expect(response.body.errors).toHaveProperty('timeZone');
      expect(Array.isArray(response.body.errors.timeZone)).toBe(true);
      expect(response.body.errors.timeZone[0]).toContain('IANA');
      // ...and the pre-existing `message` array contract is preserved.
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(response.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });

      const after = await app.prisma.user.findUnique({
        where: { id: studentA.id },
        select: { timeZone: true },
      });
      expect(after).toEqual(before);
    });
  });
});
