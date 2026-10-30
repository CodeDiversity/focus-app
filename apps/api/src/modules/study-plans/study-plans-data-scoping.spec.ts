import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * EP06A data-scoping spec (integration, real database): the ownership
 * invariant of the study-preferences surface (DoD 3, the parent README's
 * security invariants).
 *
 * The routes are principal-scoped by construction — there is no id in the
 * path and no id in the body — so the matrix this spec pins is:
 *
 * - A's `GET`/`PUT` read and write **A's own row only**; B's `GET`/`PUT`
 *   read and write **B's own row only**; neither student can see or change
 *   the other's study defaults (no existence oracle, no cross-write).
 * - The projection never exposes `userId` (nor any other key of the
 *   preferences bag) — the strongest assertion is the exact key set plus a
 *   check that neither student's id appears anywhere in the payload.
 * - The write is scoped to the principal's own row: B's write leaves A's
 *   stored `preferences` column byte-identical.
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

describeIntegration('study preferences data scoping (integration, real database)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string): string =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-prefs-scope`;

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  // Non-optional by type: if seeding fails, the suite fails in beforeAll
  // (afterAll's filter keeps cleanup from crashing on partial seeding).
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

    studentA = await registerAndLogin('student-a');
    studentB = await registerAndLogin('student-b');
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    // Deleting the users cascades (onDelete: Cascade) to their rows.
    await app.prisma.user.deleteMany({
      where: {
        id: { in: [studentA?.id, studentB?.id].filter((id): id is string => Boolean(id)) },
      },
    });
    await app.app.close();
  }, 60_000);

  // ============ The read is the principal's own (DoD 3) ============

  it("each student reads their own effective defaults — never another student's", async () => {
    // A saves a distinctive value; B must not see it.
    await putPreferences(studentA, { sessionLengthMinutes: 45 }).expect(HttpStatus.OK);

    const bRead = await getPreferences(studentB).expect(HttpStatus.OK);
    expect(bRead.body).toEqual(DEFAULTS);

    const aRead = await getPreferences(studentA).expect(HttpStatus.OK);
    expect(aRead.body).toEqual({
      sessionLengthMinutes: 45,
      minSessionMinutes: 15,
      maxSessionMinutes: 120,
      dailyCapMinutes: 240,
    });
  });

  it('the projection never exposes userId (and never another student’s id)', async () => {
    for (const student of [studentA, studentB]) {
      const response = await getPreferences(student).expect(HttpStatus.OK);

      expect(Object.keys(response.body).sort()).toEqual(PREFERENCE_KEYS);
      expect(response.body).not.toHaveProperty('userId');
      expect(response.body).not.toHaveProperty('preferences');

      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain(studentA.id);
      expect(serialized).not.toContain(studentB.id);
    }
  });

  // ============ The write is the principal's own row (DoD 3) ============

  it('B’s PUT leaves A’s stored preferences column byte-identical', async () => {
    const aBefore = await app.prisma.user.findUnique({
      where: { id: studentA.id },
      select: { preferences: true },
    });

    await putPreferences(studentB, { sessionLengthMinutes: 90, dailyCapMinutes: 300 }).expect(
      HttpStatus.OK
    );

    const aAfter = await app.prisma.user.findUnique({
      where: { id: studentA.id },
      select: { preferences: true },
    });
    expect(aAfter).toEqual(aBefore);

    // And B's own row carries B's values.
    const bStored = await app.prisma.user.findUnique({
      where: { id: studentB.id },
      select: { preferences: true },
    });
    expect(bStored?.preferences).toMatchObject({
      studyDefaults: {
        sessionLengthMinutes: 90,
        minSessionMinutes: 15,
        maxSessionMinutes: 120,
        dailyCapMinutes: 300,
      },
    });
  });

  it('A’s PUT leaves B’s stored preferences column byte-identical', async () => {
    const bBefore = await app.prisma.user.findUnique({
      where: { id: studentB.id },
      select: { preferences: true },
    });

    await putPreferences(studentA, { maxSessionMinutes: 180 }).expect(HttpStatus.OK);

    const bAfter = await app.prisma.user.findUnique({
      where: { id: studentB.id },
      select: { preferences: true },
    });
    expect(bAfter).toEqual(bBefore);
  });

  it('no token → 401 on both routes (global guard)', async () => {
    await agent.get('/study-preferences').expect(HttpStatus.UNAUTHORIZED);
    await agent
      .put('/study-preferences')
      .send({ sessionLengthMinutes: 45 })
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
