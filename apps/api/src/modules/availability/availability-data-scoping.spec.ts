import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * SP-128A integration spec: the availability-slot surface on the real
 * stack, over real HTTP against a real database (the `test-http` harness,
 * real Prisma against Postgres).
 *
 * The ownership invariant this spec owns (DoD 3, EP04 security invariants):
 *
 * - Two-student matrix — B's GET/POST/PATCH/DELETE on A's slot id → the
 *   uniform 404 `Resource not found`; A's slots byte-identical before and
 *   after; B's list never contains A's rows (no existence oracle, no
 *   writes).
 * - Malformed / unknown id on PATCH/DELETE → the same uniform 404 (plain
 *   `:id` convention).
 * - An unknown body field (`userId`) on POST → 400 with a field-level
 *   `errors` map (the global `FieldValidationPipe`), nothing written.
 * - A duplicate `(userId, dayOfWeek, startTime)` on POST → 409.
 * - No token → 401 on all four routes (global guard).
 *
 * The `availability-e2e.spec.ts` sibling pins the single-student journey;
 * this spec pins who can never touch whose rows.
 *
 * Self-skips when `DATABASE_URL` is unset (the SP-104/SP-105/SP-106
 * convention), so a bare local `pnpm test` still works.
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

describeIntegration('Availability slots data scoping (integration, real database)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string): string =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-slots`;

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

  // A owns two slots (one window, one blocked time); B owns one.
  let aSlot1Id: string; // Monday 09:00–10:30, available
  let aSlot2Id: string; // Wednesday 14:00–15:30, blocked
  let bSlotId: string;

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

  function listSlots(session: Student) {
    return agent.get('/availability-slots').set('Authorization', `Bearer ${session.accessToken}`);
  }

  function postSlot(session: Student, body: Record<string, unknown>) {
    return agent
      .post('/availability-slots')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send(body);
  }

  function patchSlot(session: Student, id: string, body: Record<string, unknown>) {
    return agent
      .patch(`/availability-slots/${id}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send(body);
  }

  function deleteSlot(session: Student, id: string) {
    return agent
      .delete(`/availability-slots/${id}`)
      .set('Authorization', `Bearer ${session.accessToken}`);
  }

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());

    studentA = await registerAndLogin('student-a');
    studentB = await registerAndLogin('student-b');

    // A seeds two slots — one regular availability window and one recurring
    // blocked time (AC-E04-05's `isAvailable: false` case).  B seeds one.
    const a1 = await postSlot(studentA, {
      dayOfWeek: 1, // Monday
      startTime: '09:00',
      endTime: '10:30',
    }).expect(HttpStatus.CREATED);
    aSlot1Id = a1.body.id;

    const a2 = await postSlot(studentA, {
      dayOfWeek: 3, // Wednesday
      startTime: '14:00',
      endTime: '15:30',
      isAvailable: false,
    }).expect(HttpStatus.CREATED);
    aSlot2Id = a2.body.id;

    const b1 = await postSlot(studentB, {
      dayOfWeek: 2, // Tuesday
      startTime: '08:00',
      endTime: '09:00',
    }).expect(HttpStatus.CREATED);
    bSlotId = b1.body.id;
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    // Deleting the users cascades (onDelete: Cascade) to their slots.
    await app.prisma.user.deleteMany({
      where: {
        id: { in: [studentA?.id, studentB?.id].filter((id): id is string => Boolean(id)) },
      },
    });
    await app.app.close();
  }, 60_000);

  // ============ List isolation (contract AC 8 — only the requester's rows) ============

  it("B's list never contains A's slots; each row is the exact 7-key shape", async () => {
    const list = await listSlots(studentB).expect(HttpStatus.OK);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body).toHaveLength(1); // B owns exactly one slot.
    expect(list.body[0].id).toBe(bSlotId);
    expect(Object.keys(list.body[0]).sort()).toEqual(SLOT_KEYS);
    expect(list.body[0]).not.toHaveProperty('userId');

    const aList = await listSlots(studentA).expect(HttpStatus.OK);
    // Ordered Monday (dayOfWeek 1) then Wednesday (dayOfWeek 3).
    expect(aList.body.map((slot: { id: string }) => slot.id)).toEqual([aSlot1Id, aSlot2Id]);
    // The blocked time carries `isAvailable: false`.
    expect(aList.body.find((slot: { id: string }) => slot.id === aSlot2Id).isAvailable).toBe(false);
  });

  // ============ Cross-student write matrix (uniform 404 + no write) ============

  it('B PATCHing A’s slot id gets the uniform 404 and A’s slot is byte-identical before/after', async () => {
    const before = await app.prisma.availabilitySlot.findUnique({ where: { id: aSlot1Id } });
    expect(before).toBeTruthy();

    const response = await patchSlot(studentB, aSlot1Id, { startTime: '23:00' }).expect(
      HttpStatus.NOT_FOUND
    );
    expect(response.body.message ?? response.text).toContain('Resource not found');

    const after = await app.prisma.availabilitySlot.findUnique({ where: { id: aSlot1Id } });
    expect(after).toEqual(before);
  });

  it('B DELETEing A’s slot id gets the uniform 404 and the row survives', async () => {
    const before = await app.prisma.availabilitySlot.findUnique({ where: { id: aSlot2Id } });

    const response = await deleteSlot(studentB, aSlot2Id).expect(HttpStatus.NOT_FOUND);
    expect(response.body.message ?? response.text).toContain('Resource not found');

    const after = await app.prisma.availabilitySlot.findUnique({ where: { id: aSlot2Id } });
    expect(after).toEqual(before);
  });

  it('B POSTing a slot identical to one of A’s gets 201 — the unique key is (userId, dayOfWeek, startTime), not dayOfWeek alone', async () => {
    // A owns Monday 09:00; B creating the same weekly window must succeed
    // (per-student uniqueness), while B's *own* duplicate would be a 409.
    await postSlot(studentB, {
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:30',
    }).expect(HttpStatus.CREATED);
  });

  it('A posting their own duplicate (dayOfWeek, startTime) gets the specific 409', async () => {
    const response = await postSlot(studentA, {
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '11:00',
    }).expect(HttpStatus.CONFLICT);
    expect(response.body.message).toContain('already exists');
  });

  // ============ Uniform 404 shapes (missing / malformed id) ============

  it('PATCH/DELETE with a missing or malformed id is always the same uniform 404', async () => {
    for (const id of ['not-a-uuid', uuidv4()]) {
      const patched = await patchSlot(studentA, id, { isAvailable: false }).expect(
        HttpStatus.NOT_FOUND
      );
      const deleted = await deleteSlot(studentA, id).expect(HttpStatus.NOT_FOUND);
      expect([patched.body.message, deleted.body.message]).toEqual([
        'Resource not found',
        'Resource not found',
      ]);
    }
  });

  // ============ Validation / whitelist / no-token cases over real HTTP ============

  it('POST with an unknown body field (userId) is a 400 field-level error and writes nothing', async () => {
    const before = await app.prisma.availabilitySlot.count({ where: { userId: studentA.id } });

    const response = await postSlot(studentA, {
      dayOfWeek: 4,
      startTime: '10:00',
      endTime: '11:00',
      userId: 'someone-else',
    }).expect(HttpStatus.BAD_REQUEST);
    expect(response.body.errors).toHaveProperty('userId');

    expect(await app.prisma.availabilitySlot.count({ where: { userId: studentA.id } })).toBe(
      before
    );
  });

  it('POST with invalid fields is a 400 and writes nothing (dayOfWeek 7, "9:00", end == start)', async () => {
    const before = await app.prisma.availabilitySlot.count({ where: { userId: studentA.id } });

    await postSlot(studentA, {
      dayOfWeek: 7,
      startTime: '10:00',
      endTime: '11:00',
    }).expect(HttpStatus.BAD_REQUEST);
    await postSlot(studentA, {
      dayOfWeek: 4,
      startTime: '9:00',
      endTime: '11:00',
    }).expect(HttpStatus.BAD_REQUEST);
    await postSlot(studentA, {
      dayOfWeek: 4,
      startTime: '10:00',
      endTime: '10:00',
    }).expect(HttpStatus.BAD_REQUEST);

    expect(await app.prisma.availabilitySlot.count({ where: { userId: studentA.id } })).toBe(
      before
    );
  });

  it('PATCH with an empty body is a 400; a merged-invalid PATCH is a 400 (nothing written)', async () => {
    await patchSlot(studentA, aSlot1Id, {}).expect(HttpStatus.BAD_REQUEST);
    // Stored 09:00–10:30; an endTime of 08:00 makes the merged window invalid.
    const response = await patchSlot(studentA, aSlot1Id, { endTime: '08:00' }).expect(
      HttpStatus.BAD_REQUEST
    );
    expect(response.body.errors).toHaveProperty('endTime');

    const row = await app.prisma.availabilitySlot.findUnique({ where: { id: aSlot1Id } });
    expect(row?.endTime).toBe('10:30');
  });

  it('No token → 401 on every route (global guard)', async () => {
    await agent.get('/availability-slots').expect(HttpStatus.UNAUTHORIZED);
    await agent
      .post('/availability-slots')
      .send({ dayOfWeek: 0, startTime: '09:00', endTime: '10:00' })
      .expect(HttpStatus.UNAUTHORIZED);
    await agent
      .patch(`/availability-slots/${aSlot1Id}`)
      .send({ isAvailable: false })
      .expect(HttpStatus.UNAUTHORIZED);
    await agent.delete(`/availability-slots/${aSlot1Id}`).expect(HttpStatus.UNAUTHORIZED);
  });
});
