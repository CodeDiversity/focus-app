import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * EP06A e2e spec: the **study-preferences feature as a student journey**,
 * over real HTTP against a real PostgreSQL database (the `test-http` harness
 * — `main.ts` parity: the global `FieldValidationPipe` with
 * `whitelist` + `forbidNonWhitelisted`, the global JWT guard and the
 * `AllExceptionsFilter`).
 *
 * - The journey (one student, ordered): `GET` returns the defaults for a
 *   student with no stored bag → `PUT` a partial body merges onto them →
 *   `GET` reads the saved values back → the stored `preferences` column
 *   still carries the student's unrelated keys.  *(AC 2/3, DoD 1/8)*
 * - Validation over HTTP: an out-of-range value, a non-integer and an
 *   unknown field → 400 with a field-level `errors` map and **nothing
 *   written**; a broken cross-field combination on the merged values → 400.
 *   *(AC 4/5, DoD 2/8)*
 * - Error shapes: 401 unauthenticated on both routes.  *(DoD 4/8)*
 *
 * The `study-plans-data-scoping.spec.ts` sibling pins the cross-student
 * isolation matrix; this spec pins the routes **together** as the feature
 * the preferences surface (EP06E) drives.
 *
 * Self-skips when `DATABASE_URL` is unset (the SP-104/SP-105/SP-106/SP-128A
 * convention), so a bare local `pnpm test` still works.
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/** The exact contract keys (shared API contract, EP06 README). */
const PREFERENCE_KEYS = [
  'sessionLengthMinutes',
  'minSessionMinutes',
  'maxSessionMinutes',
  'dailyCapMinutes',
].sort();

/** The documented defaults (D06-4). */
const DEFAULTS = {
  sessionLengthMinutes: 60,
  minSessionMinutes: 15,
  maxSessionMinutes: 120,
  dailyCapMinutes: 240,
};

describeIntegration('study preferences end-to-end (real database, EP06A)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string): string =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-prefs-e2e`;

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  let student: Student;

  interface Student {
    id: string;
    email: string;
    accessToken: string;
  }

  async function registerAndLogin(): Promise<Student> {
    const email = uniqueEmail('student');

    const registration = await agent
      .post('/auth/register')
      .send({ name: 'Student', email, password })
      .expect(HttpStatus.CREATED);
    expect(registration.body.email).toBe(email);

    const login = await agent.post('/auth/login').send({ email, password }).expect(HttpStatus.OK);
    expect(login.body.accessToken).toBeTruthy();

    return { id: login.body.user.id, email, accessToken: login.body.accessToken };
  }

  function getPreferences(session: Student) {
    return agent.get('/study-preferences').set('Authorization', `Bearer ${session.accessToken}`);
  }

  function putPreferences(session: Student, body: Record<string, unknown>) {
    return agent
      .put('/study-preferences')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send(body);
  }

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());
    student = await registerAndLogin();
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    if (student?.id) {
      await app.prisma.user.deleteMany({ where: { id: student.id } });
    }
    await app.app.close();
  }, 60_000);

  // ==================== the journey (AC 2/3, DoD 1/8) ====================

  describe('journey: read the defaults → save a subset → read them back', () => {
    it('GET returns exactly the four keys with the defaults for a student with no stored bag', async () => {
      const response = await getPreferences(student).expect(HttpStatus.OK);

      expect(Object.keys(response.body).sort()).toEqual(PREFERENCE_KEYS);
      expect(response.body).not.toHaveProperty('userId');
      expect(response.body).toEqual(DEFAULTS);
    });

    it('PUT with a partial body merges onto the effective values and returns the complete object', async () => {
      const response = await putPreferences(student, { sessionLengthMinutes: 45 }).expect(
        HttpStatus.OK
      );

      expect(response.body).toEqual({
        sessionLengthMinutes: 45,
        minSessionMinutes: 15,
        maxSessionMinutes: 120,
        dailyCapMinutes: 240,
      });
      expect(Object.keys(response.body).sort()).toEqual(PREFERENCE_KEYS);
    });

    it('GET reads the saved values back', async () => {
      const response = await getPreferences(student).expect(HttpStatus.OK);
      expect(response.body).toEqual({
        sessionLengthMinutes: 45,
        minSessionMinutes: 15,
        maxSessionMinutes: 120,
        dailyCapMinutes: 240,
      });
    });

    it('a second partial PUT merges onto the values already saved', async () => {
      const response = await putPreferences(student, { dailyCapMinutes: 300 }).expect(
        HttpStatus.OK
      );

      expect(response.body).toEqual({
        sessionLengthMinutes: 45,
        minSessionMinutes: 15,
        maxSessionMinutes: 120,
        dailyCapMinutes: 300,
      });
    });
  });

  // ==================== the bag's other keys survive (AC 3, D06-14) ====================

  describe('the bag’s other keys survive a PUT', () => {
    it('the stored preferences column still carries the student’s unrelated keys', async () => {
      // The free-form profile bag (SP106) is written through PATCH
      // /users/me — EP06 does not narrow it (D06-14).  That PATCH writes the
      // `preferences` column verbatim (it replaces the column, it does not
      // merge into it), so it is seeded **before** the study defaults are
      // saved.
      await agent
        .patch('/users/me')
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({ preferences: { theme: 'dark' } })
        .expect(HttpStatus.OK);

      await putPreferences(student, { sessionLengthMinutes: 45 }).expect(HttpStatus.OK);

      const stored = await app.prisma.user.findUnique({
        where: { id: student.id },
        select: { preferences: true },
      });
      expect(stored?.preferences).toMatchObject({
        theme: 'dark',
        studyDefaults: {
          sessionLengthMinutes: 45,
          minSessionMinutes: 15,
          maxSessionMinutes: 120,
          dailyCapMinutes: 240,
        },
      });
    });
  });

  // ==================== the defensive read (AC 6) ====================

  describe('the defensive read', () => {
    it('a malformed stored bag never fails the read (the effective values are returned)', async () => {
      // Written straight to the column: a bag no API would produce (the
      // generic PATCH /users/me bag is validated only as a plain object of
      // bounded size, D06-14).
      await app.prisma.user.update({
        where: { id: student.id },
        data: {
          preferences: {
            theme: 'dark',
            studyDefaults: {
              sessionLengthMinutes: 'sixty',
              minSessionMinutes: 300,
              maxSessionMinutes: 200,
              dailyCapMinutes: 10,
            },
          },
        },
      });

      const response = await getPreferences(student).expect(HttpStatus.OK);

      // Step 1: 'sixty' is not an integer → the default 60.  Step 2: the
      // inverted pair 300 > 200 → the minimum becomes 200.  Step 3: 60 < 200
      // → the session length becomes 200.  Step 4: the daily cap 10 < 200 →
      // 200.
      expect(response.body).toEqual({
        sessionLengthMinutes: 200,
        minSessionMinutes: 200,
        maxSessionMinutes: 200,
        dailyCapMinutes: 200,
      });
    });

    it('a stored bag that is not an object returns the defaults', async () => {
      await app.prisma.user.update({
        where: { id: student.id },
        data: { preferences: { studyDefaults: 'nonsense' } },
      });

      const response = await getPreferences(student).expect(HttpStatus.OK);
      expect(response.body).toEqual(DEFAULTS);
    });
  });

  // ==================== validation + error shapes (DoD 2/4/8) ====================

  describe('validation and error shapes', () => {
    it('an out-of-range value is a 400 with a field-level errors map and writes nothing', async () => {
      const before = await app.prisma.user.findUnique({
        where: { id: student.id },
        select: { preferences: true },
      });

      const response = await putPreferences(student, { sessionLengthMinutes: 1000 }).expect(
        HttpStatus.BAD_REQUEST
      );
      expect(response.body.errors).toHaveProperty('sessionLengthMinutes');
      expect(Array.isArray(response.body.errors.sessionLengthMinutes)).toBe(true);
      expect(Array.isArray(response.body.message)).toBe(true);

      const after = await app.prisma.user.findUnique({
        where: { id: student.id },
        select: { preferences: true },
      });
      expect(after?.preferences).toEqual(before?.preferences);
    });

    it('a non-integer value is a 400 with a field-level errors map', async () => {
      const response = await putPreferences(student, { dailyCapMinutes: 45.5 }).expect(
        HttpStatus.BAD_REQUEST
      );
      expect(response.body.errors).toHaveProperty('dailyCapMinutes');
    });

    it('an unknown body field is a 400 with a field-level errors map (the global pipe)', async () => {
      const response = await putPreferences(student, { theme: 'dark' }).expect(
        HttpStatus.BAD_REQUEST
      );
      expect(response.body.errors).toHaveProperty('theme');
    });

    it('a body that is not an object is a 400 (the global pipe)', async () => {
      await agent
        .put('/study-preferences')
        .set('Authorization', `Bearer ${student.accessToken}`)
        .set('Content-Type', 'application/json')
        .send('"not-an-object"')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('a broken cross-field combination on the merged values is a 400 and writes nothing', async () => {
      // A known starting state, so the case does not depend on the order of
      // the cases above.
      await putPreferences(student, {
        sessionLengthMinutes: 60,
        minSessionMinutes: 15,
        maxSessionMinutes: 120,
        dailyCapMinutes: 240,
      }).expect(HttpStatus.OK);
      const before = await app.prisma.user.findUnique({
        where: { id: student.id },
        select: { preferences: true },
      });

      // A minimum of 90 breaks `min ≤ sessionLength ≤ max` on the merged
      // values (the stored session length is 60).
      const response = await putPreferences(student, { minSessionMinutes: 90 }).expect(
        HttpStatus.BAD_REQUEST
      );
      expect(response.body.errors).toHaveProperty('sessionLengthMinutes');

      const after = await app.prisma.user.findUnique({
        where: { id: student.id },
        select: { preferences: true },
      });
      expect(after?.preferences).toEqual(before?.preferences);
    });

    it('No token → 401 on both routes (global guard)', async () => {
      await agent.get('/study-preferences').expect(HttpStatus.UNAUTHORIZED);
      await agent
        .put('/study-preferences')
        .send({ sessionLengthMinutes: 45 })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
