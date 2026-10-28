import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * SP-128A e2e spec: the **availability feature as a student journey**, over
 * real HTTP against a real PostgreSQL database (the `test-http` harness —
 * `main.ts` parity), the same surface SP-128B's `/availability` editor
 * page consumes.
 *
 * - AC lifecycle (one student, ordered): create two slots (a window and a
 *   recurrent blocked time) → list returns both in `dayOfWeek`/`startTime`
 *   order → `PATCH` edits one (weekday + times merged) → `DELETE` removes
 *   it → the list reflects the journey.  *(AC-E04-04, AC-E04-05, DoD 1/8)*
 * - Validation over HTTP: `end == start`, `end < start`, a midnight wrap,
 *   `25:00`, `9:60`, weekday 7/−1/1.5, an empty `PATCH`, an unknown field
 *   → 400 field-level; a duplicate weekly slot → 409.  *(DoD 2/8)*
 * - Error shapes: the uniform 404 `Resource not found` on a missing id; 401
 *   unauthenticated.  *(DoD 4/8)*
 *
 * The `availability-data-scoping.spec.ts` sibling pins the cross-student
 * isolation matrix; this spec pins the routes **together** as the feature
 * the editor drives.  The cases are state-dependent by design (a journey).
 *
 * Self-skips when `DATABASE_URL` is unset (the SP-104/SP-105/SP-106/
 * SP-107A/SP-110C/SP-111C/SP-112C convention).
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/** The exact `AvailabilitySlot` contract keys (shared API contract, EP04 README). */
const SLOT_KEYS = [
  'createdAt',
  'dayOfWeek',
  'endTime',
  'id',
  'isAvailable',
  'startTime',
  'updatedAt',
].sort();

describeIntegration('availability slots end-to-end (real database, SP-128A)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string): string =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-slots-e2e`;

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  let student: Student;

  interface Student {
    id: string;
    email: string;
    accessToken: string;
  }

  // The journey rows.
  let windowId: string; // Monday 09:00–10:30, later patched to Friday 13:00–15:00
  let blockedId: string; // Wednesday 20:00–22:00 blocked time
  let deletedId: string; // Saturday 08:00–09:00, deleted mid-journey

  async function registerAndLogin(): Promise<Student> {
    const email = uniqueEmail('student');

    const registration = await agent
      .post('/auth/register')
      .send({ name: 'Student', email, password })
      .expect(HttpStatus.CREATED);

    const login = await agent.post('/auth/login').send({ email, password }).expect(HttpStatus.OK);
    expect(login.body.accessToken).toBeTruthy();
    expect(registration.body.email).toBe(email);

    return { id: login.body.user.id, email, accessToken: login.body.accessToken };
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

  // ==================== AC — full lifecycle (AC-E04-04/05, DoD 1/8) ====================

  describe('lifecycle: create → list → patch → delete', () => {
    it('POST creates an availability window with isAvailable defaulting to true (201, exact 7-key shape)', async () => {
      const response = await agent
        .post('/availability-slots')
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({ dayOfWeek: 1, startTime: '09:00', endTime: '10:30' })
        .expect(HttpStatus.CREATED);

      windowId = response.body.id;
      expect(windowId).toBeTruthy();
      expect(Object.keys(response.body).sort()).toEqual(SLOT_KEYS);
      expect(response.body.isAvailable).toBe(true);
      expect(response.body.dayOfWeek).toBe(1);
      expect(response.body.startTime).toBe('09:00');
      expect(response.body.endTime).toBe('10:30');
      expect(response.body).not.toHaveProperty('userId');
    });

    it('POST creates a recurring blocked time (isAvailable: false — AC-E04-05)', async () => {
      const response = await agent
        .post('/availability-slots')
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({ dayOfWeek: 3, startTime: '20:00', endTime: '22:00', isAvailable: false })
        .expect(HttpStatus.CREATED);

      blockedId = response.body.id;
      expect(response.body.isAvailable).toBe(false);
    });

    it('POST creates a third slot for the delete step', async () => {
      const response = await agent
        .post('/availability-slots')
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({ dayOfWeek: 6, startTime: '08:00', endTime: '09:00' })
        .expect(HttpStatus.CREATED);
      deletedId = response.body.id;
    });

    it('GET lists the student’s slots ordered dayOfWeek asc then startTime asc', async () => {
      const response = await agent
        .get('/availability-slots')
        .set('Authorization', `Bearer ${student.accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.map((slot: { id: string }) => slot.id)).toEqual([
        windowId, // Monday 09:00
        blockedId, // Wednesday 20:00
        deletedId, // Saturday 08:00
      ]);
    });

    it('PATCH partially merges { dayOfWeek, startTime, endTime } and validates the merged values (200)', async () => {
      const response = await agent
        .patch(`/availability-slots/${windowId}`)
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({ dayOfWeek: 5, startTime: '13:00', endTime: '15:00' })
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(windowId);
      expect(response.body.dayOfWeek).toBe(5);
      expect(response.body.startTime).toBe('13:00');
      expect(response.body.endTime).toBe('15:00');
      // The unpatched field keeps the stored value.
      expect(response.body.isAvailable).toBe(true);
    });

    it('PATCH can flip a blocked time into a window and back (isAvailable merge)', async () => {
      const toWindow = await agent
        .patch(`/availability-slots/${blockedId}`)
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({ isAvailable: true })
        .expect(HttpStatus.OK);
      expect(toWindow.body.isAvailable).toBe(true);

      const backToBlocked = await agent
        .patch(`/availability-slots/${blockedId}`)
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({ isAvailable: false })
        .expect(HttpStatus.OK);
      expect(backToBlocked.body.isAvailable).toBe(false);
    });

    it('DELETE removes the slot (204) and it is gone from the list', async () => {
      await agent
        .delete(`/availability-slots/${deletedId}`)
        .set('Authorization', `Bearer ${student.accessToken}`)
        .expect(HttpStatus.NO_CONTENT);

      const list = await agent
        .get('/availability-slots')
        .set('Authorization', `Bearer ${student.accessToken}`)
        .expect(HttpStatus.OK);
      // windowId is now Friday (dayOfWeek 5) after the PATCH — the
      // Wednesday block sorts first.
      expect(list.body.map((slot: { id: string }) => slot.id)).toEqual([blockedId, windowId]);

      // The row is really gone.
      expect(await app.prisma.availabilitySlot.findUnique({ where: { id: deletedId } })).toBeNull();
    });
  });

  // ==================== Validation + error shapes (DoD 2/4/8) ====================

  describe('validation and error shapes', () => {
    it('POST: the field matrix produces field-level 400s and writes nothing', async () => {
      const before = await app.prisma.availabilitySlot.count({ where: { userId: student.id } });

      const cases: { body: Record<string, unknown>; field: string }[] = [
        { body: { dayOfWeek: 7, startTime: '09:00', endTime: '10:00' }, field: 'dayOfWeek' },
        { body: { dayOfWeek: -1, startTime: '09:00', endTime: '10:00' }, field: 'dayOfWeek' },
        { body: { dayOfWeek: 1.5, startTime: '09:00', endTime: '10:00' }, field: 'dayOfWeek' },
        { body: { dayOfWeek: 2, startTime: '9:00', endTime: '10:00' }, field: 'startTime' },
        { body: { dayOfWeek: 2, startTime: '25:00', endTime: '26:00' }, field: 'startTime' },
        { body: { dayOfWeek: 2, startTime: '09:60', endTime: '10:00' }, field: 'startTime' },
        { body: { dayOfWeek: 2, startTime: '10:00', endTime: '10:00' }, field: 'endTime' },
        { body: { dayOfWeek: 2, startTime: '11:00', endTime: '10:00' }, field: 'endTime' },
        { body: { dayOfWeek: 2, startTime: '23:00', endTime: '01:00' }, field: 'endTime' },
        {
          body: { dayOfWeek: 2, startTime: '10:00', endTime: '11:00', userId: 'hack' },
          field: 'userId',
        },
      ];

      for (const testCase of cases) {
        const response = await agent
          .post('/availability-slots')
          .set('Authorization', `Bearer ${student.accessToken}`)
          .send(testCase.body)
          .expect(HttpStatus.BAD_REQUEST);
        expect(response.body.errors).toHaveProperty(testCase.field);
        expect(Array.isArray(response.body.message)).toBe(true);
      }

      expect(await app.prisma.availabilitySlot.count({ where: { userId: student.id } })).toBe(
        before
      );
    });

    it('PATCH: an empty body is a 400 with the actionable message', async () => {
      const response = await agent
        .patch(`/availability-slots/${windowId}`)
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
      expect(JSON.stringify(response.body)).toContain('At least one field');
    });

    it('POST: a duplicate (dayOfWeek, startTime) for the same student is a 409', async () => {
      const response = await agent
        .post('/availability-slots')
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({ dayOfWeek: 5, startTime: '13:00', endTime: '14:00' })
        .expect(HttpStatus.CONFLICT);
      expect(response.body.message).toContain('already exists');
    });

    it('PATCH on the deleted id is the uniform 404 Resource not found', async () => {
      const response = await agent
        .patch(`/availability-slots/${deletedId}`)
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({ isAvailable: true })
        .expect(HttpStatus.NOT_FOUND);
      expect(response.body.message).toBe('Resource not found');
    });

    it('PATCH with a malformed id is the same uniform 404 (never 400)', async () => {
      const response = await agent
        .patch('/availability-slots/not-a-uuid')
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({ isAvailable: true })
        .expect(HttpStatus.NOT_FOUND);
      expect(response.body.message).toBe('Resource not found');
    });

    it('No token → 401 (global guard)', async () => {
      await agent.get('/availability-slots').expect(HttpStatus.UNAUTHORIZED);
      await agent
        .post('/availability-slots')
        .send({ dayOfWeek: 0, startTime: '09:00', endTime: '10:00' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
