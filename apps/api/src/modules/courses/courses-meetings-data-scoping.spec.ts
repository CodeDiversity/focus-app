import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * SP-112A integration spec: the class-meeting surface on the real stack,
 * over real HTTP against a real database (the `test-http` harness, real
 * Prisma against Postgres).
 *
 * - Two-student matrix (DoD 3): B's GET/POST/PATCH/DELETE under A's course
 *   id → uniform 404 `Resource not found`; A's meetings unchanged
 *   before/after; B's detail projection never contains A's meetings
 *   (no existence oracle, no writes).
 * - Dual-ownership (AC 4/5): the meeting must belong to **both** the `:id`
 *   course and the requesting student — A PATCHing/DELETING a meeting of
 *   A's *other* course via the first course's id → uniform 404, no write.
 * - Validation on real HTTP (AC 3–5): the 400 field-level cases (the global
 *   pipe for format/whitelist, the service for the hour/minute bounds and
 *   the cross-field `endTime > startTime` rule), the 409 same-slot case
 *   ("A meeting already exists at this time."), and the uniform 404s.
 * - Detail projection (D112-3): `GET /courses/:id` carries `meetings` +
 *   read-only `assignments` (the 14-key detail shape; the list route stays
 *   light).
 * - No token → 401 on all four meeting routes (global guard).
 *
 * Self-skips when `DATABASE_URL` is unset (the SP-104/SP-105/SP-106
 * convention), so a bare local `pnpm test` still works; the verification
 * run supplies `DATABASE_URL` so the suite executes with zero skips.
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/** The exact `ClassMeeting` contract keys (shared API contract, SP-112 README). */
const MEETING_KEYS = ['createdAt', 'dayOfWeek', 'endTime', 'id', 'startTime', 'updatedAt'].sort();

/**
 * The exact `GET /courses/:id` detail keys (SP-112A, D112-3): the
 * `CourseWithSemester` keys plus `meetings` and `assignments`.
 */
const COURSE_DETAIL_KEYS = [
  'assignments',
  'code',
  'color',
  'createdAt',
  'credits',
  'description',
  'id',
  'instructor',
  'isActive',
  'meetings',
  'name',
  'semester',
  'semesterId',
  'updatedAt',
].sort();

describeIntegration('Class meetings data scoping (integration, real database)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string): string =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-meetings`;

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

  // Courses: A owns two (the dual-ownership cases need the "other course");
  // B owns one.
  let aCourse1Id: string;
  let aCourse2Id: string;
  let bCourseId: string;
  // Meetings seeded through the API (the rows under test).
  let aMeeting1Id: string; // A, course1, Mon 09:00–10:30
  let aMeeting2Id: string; // A, course1, Wed 14:00–15:30
  let aMeeting3Id: string; // A, course1, Mon 08:00–08:45 (created in the POST block)
  let bMeetingId: string; // B, bCourse, Tue 11:00–12:00

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

  function postCourse(session: Student, body: Record<string, unknown>) {
    return agent.post('/courses').set('Authorization', `Bearer ${session.accessToken}`).send(body);
  }

  function postMeeting(session: Student, courseId: string, body: Record<string, unknown>) {
    return agent
      .post(`/courses/${courseId}/meetings`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send(body);
  }

  function getMeetings(session: Student, courseId: string) {
    return agent
      .get(`/courses/${courseId}/meetings`)
      .set('Authorization', `Bearer ${session.accessToken}`);
  }

  function patchMeeting(
    session: Student,
    courseId: string,
    meetingId: string,
    body: Record<string, unknown>
  ) {
    return agent
      .patch(`/courses/${courseId}/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send(body);
  }

  function deleteMeeting(session: Student, courseId: string, meetingId: string) {
    return agent
      .delete(`/courses/${courseId}/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${session.accessToken}`);
  }

  function getCourse(session: Student, id: string) {
    return agent.get(`/courses/${id}`).set('Authorization', `Bearer ${session.accessToken}`);
  }

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());

    studentA = await registerAndLogin('student-a');
    studentB = await registerAndLogin('student-b');

    const aCourse1 = await postCourse(studentA, {
      code: `MEET${runId}`,
      name: 'Meetings Course',
    }).expect(HttpStatus.CREATED);
    aCourse1Id = aCourse1.body.id;

    const aCourse2 = await postCourse(studentA, {
      code: `MEETB${runId}`,
      name: 'Second Course',
    }).expect(HttpStatus.CREATED);
    aCourse2Id = aCourse2.body.id;

    const bCourse = await postCourse(studentB, {
      code: `BMEET${runId}`,
      name: 'B Course',
    }).expect(HttpStatus.CREATED);
    bCourseId = bCourse.body.id;

    const aMeeting1 = await postMeeting(studentA, aCourse1Id, {
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:30',
    }).expect(HttpStatus.CREATED);
    aMeeting1Id = aMeeting1.body.id;

    const aMeeting2 = await postMeeting(studentA, aCourse1Id, {
      dayOfWeek: 3,
      startTime: '14:00',
      endTime: '15:30',
    }).expect(HttpStatus.CREATED);
    aMeeting2Id = aMeeting2.body.id;

    const bMeeting = await postMeeting(studentB, bCourseId, {
      dayOfWeek: 2,
      startTime: '11:00',
      endTime: '12:00',
    }).expect(HttpStatus.CREATED);
    bMeetingId = bMeeting.body.id;
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    // Deleting the users cascades (onDelete: Cascade) to their courses and,
    // through both `userId` and `courseId`, to their meetings.
    await app.prisma.user.deleteMany({
      where: {
        id: { in: [studentA?.id, studentB?.id].filter((id): id is string => Boolean(id)) },
      },
    });
    await app.app.close();
  }, 60_000);

  // ==================== POST /courses/:id/meetings (AC 3) ====================

  describe('POST /courses/:id/meetings', () => {
    it('A creates a meeting on their own course → 201, exact 6-key shape, row owned by A on the route course', async () => {
      const response = await postMeeting(studentA, aCourse1Id, {
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '08:45',
      }).expect(HttpStatus.CREATED);

      expect(Object.keys(response.body).sort()).toEqual(MEETING_KEYS);
      aMeeting3Id = response.body.id as string;

      // Re-read via a direct query: the row is owned by A and attached to
      // the route's course (the navigation unit — D112-2).
      const row = await app.prisma.classMeeting.findUnique({ where: { id: aMeeting3Id } });
      expect(row!.userId).toBe(studentA.id);
      expect(row!.courseId).toBe(aCourse1Id);
      expect(row).toMatchObject({ dayOfWeek: 1, startTime: '08:00', endTime: '08:45' });
    });

    it("B POSTing under A's course id → uniform 404, no meeting row, A's meetings untouched", async () => {
      const bMeetingsBefore = await app.prisma.classMeeting.count({
        where: { userId: studentB.id },
      });
      const aMeetingsBefore = await app.prisma.classMeeting.findMany({
        where: { userId: studentA.id },
      });

      const response = await postMeeting(studentB, aCourse1Id, {
        dayOfWeek: 4,
        startTime: '10:00',
        endTime: '11:00',
      }).expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });

      expect(await app.prisma.classMeeting.count({ where: { userId: studentB.id } })).toBe(
        bMeetingsBefore
      );
      const aMeetingsAfter = await app.prisma.classMeeting.findMany({
        where: { userId: studentA.id },
      });
      expect(aMeetingsAfter).toEqual(aMeetingsBefore); // no write, no existence oracle
    });

    it('a missing course id → the identical uniform 404 (no existence oracle)', async () => {
      const response = await postMeeting(studentB, uuidv4(), {
        dayOfWeek: 4,
        startTime: '10:00',
        endTime: '11:00',
      }).expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });
      expect(await app.prisma.classMeeting.count({ where: { userId: studentB.id } })).toBe(1);
    });

    it('a dayOfWeek of 7 → 400 with dayOfWeek in errors; nothing written', async () => {
      const before = await app.prisma.classMeeting.count({ where: { userId: studentA.id } });

      const response = await postMeeting(studentA, aCourse1Id, {
        dayOfWeek: 7,
        startTime: '09:00',
        endTime: '10:30',
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('dayOfWeek');
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(await app.prisma.classMeeting.count({ where: { userId: studentA.id } })).toBe(before);
    });

    it('a 25:00 hour → 400 with startTime in errors (the service owns the bounds)', async () => {
      const response = await postMeeting(studentA, aCourse1Id, {
        dayOfWeek: 1,
        startTime: '25:00',
        endTime: '26:00',
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('startTime');
      expect(await app.prisma.classMeeting.count({ where: { userId: studentA.id } })).toBe(3);
    });

    it('an end equal to the start → 400 with endTime in errors', async () => {
      const response = await postMeeting(studentA, aCourse1Id, {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '09:00',
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('endTime');
    });

    it('a midnight wrap (23:00 → 01:00) → 400 with endTime in errors (no wrap in the MVP)', async () => {
      const response = await postMeeting(studentA, aCourse1Id, {
        dayOfWeek: 1,
        startTime: '23:00',
        endTime: '01:00',
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('endTime');
    });

    it('an unknown body field / a userId in the body → 400 (global pipe, never honored)', async () => {
      const unknown = await postMeeting(studentA, aCourse1Id, {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:30',
        isRecurring: true,
      }).expect(HttpStatus.BAD_REQUEST);
      expect(unknown.body.errors).toHaveProperty('isRecurring');

      const userId = await postMeeting(studentA, aCourse1Id, {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:30',
        userId: studentB.id,
      }).expect(HttpStatus.BAD_REQUEST);
      expect(userId.body.errors).toHaveProperty('userId');
    });

    it('the same dayOfWeek + startTime slot again for the course → 409 with the specific message', async () => {
      const before = await app.prisma.classMeeting.findUnique({ where: { id: aMeeting1Id } });

      const response = await postMeeting(studentA, aCourse1Id, {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '11:00',
      }).expect(HttpStatus.CONFLICT);

      expect(response.body.message).toBe('A meeting already exists at this time.');
      expect(await app.prisma.classMeeting.findUnique({ where: { id: aMeeting1Id } })).toEqual(
        before
      ); // unchanged
    });

    it("the same slot on A's *other* course → 201 (the unique constraint is per course)", async () => {
      const response = await postMeeting(studentA, aCourse2Id, {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:30',
      }).expect(HttpStatus.CREATED);

      const row = await app.prisma.classMeeting.findUnique({ where: { id: response.body.id } });
      expect(row!.courseId).toBe(aCourse2Id);
    });
  });

  // ==================== GET /courses/:id/meetings (AC 2) ====================

  describe('GET /courses/:id/meetings', () => {
    it("A lists their course's meetings → 200, ordered dayOfWeek asc / startTime asc, 6-key shape", async () => {
      const response = await getMeetings(studentA, aCourse1Id).expect(HttpStatus.OK);

      // course1 holds Mon 08:00 (m3), Mon 09:00 (m1), Wed 14:00 (m2):
      // dayOfWeek asc, then startTime asc.
      expect(response.body.map((m: { id: string }) => m.id)).toEqual([
        aMeeting3Id,
        aMeeting1Id,
        aMeeting2Id,
      ]);
      for (const meeting of response.body) {
        expect(Object.keys(meeting).sort()).toEqual(MEETING_KEYS);
        // `userId`/`courseId` are never exposed (D112-2).
        expect(meeting).not.toHaveProperty('userId');
        expect(meeting).not.toHaveProperty('courseId');
      }
    });

    it("B listing under A's course id → uniform 404 (no existence oracle)", async () => {
      const response = await getMeetings(studentB, aCourse1Id).expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });
    });

    it('a missing course id → the identical uniform 404', async () => {
      const response = await getMeetings(studentA, uuidv4()).expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });
    });

    it("B's list under their own course never contains A's meeting ids (wire-level scoping)", async () => {
      const response = await getMeetings(studentB, bCourseId).expect(HttpStatus.OK);

      expect(response.body.map((m: { id: string }) => m.id)).toEqual([bMeetingId]);
      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain(aCourse1Id);
      expect(serialized).not.toContain(aMeeting1Id);
      expect(serialized).not.toContain(aMeeting2Id);
    });
  });

  // ==================== PATCH /courses/:id/meetings/:meetingId (AC 4) ====================

  describe('PATCH /courses/:id/meetings/:meetingId', () => {
    it('A patches a single field → 200, the row agrees, untouched fields keep their values', async () => {
      const response = await patchMeeting(studentA, aCourse1Id, aMeeting1Id, {
        dayOfWeek: 2,
      }).expect(HttpStatus.OK);

      expect(Object.keys(response.body).sort()).toEqual(MEETING_KEYS);
      expect(response.body).toMatchObject({
        id: aMeeting1Id,
        dayOfWeek: 2,
        startTime: '09:00', // untouched
        endTime: '10:30', // untouched
      });
      const row = await app.prisma.classMeeting.findUnique({ where: { id: aMeeting1Id } });
      expect(row).toMatchObject({ dayOfWeek: 2, startTime: '09:00', endTime: '10:30' });
    });

    it('A patches several fields at once → 200, the row agrees', async () => {
      const response = await patchMeeting(studentA, aCourse1Id, aMeeting1Id, {
        startTime: '10:00',
        endTime: '11:30',
      }).expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        id: aMeeting1Id,
        startTime: '10:00',
        endTime: '11:30',
      });
      const row = await app.prisma.classMeeting.findUnique({ where: { id: aMeeting1Id } });
      expect(row).toMatchObject({ startTime: '10:00', endTime: '11:30' });
    });

    it("B patching A's meeting under A's course → uniform 404; A's row byte-identical", async () => {
      const before = await app.prisma.classMeeting.findUnique({ where: { id: aMeeting1Id } });

      const response = await patchMeeting(studentB, aCourse1Id, aMeeting1Id, {
        dayOfWeek: 5,
        startTime: '20:00',
        endTime: '21:00',
      }).expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });
      expect(await app.prisma.classMeeting.findUnique({ where: { id: aMeeting1Id } })).toEqual(
        before
      ); // no write, no existence oracle
    });

    it("A patching their meeting under A's *other* course id (dual-ownership) → uniform 404, no write", async () => {
      // The meeting belongs to course1; the route says course2 — the meeting
      // must belong to BOTH the route course and the student.
      const before = await app.prisma.classMeeting.findUnique({ where: { id: aMeeting1Id } });

      const response = await patchMeeting(studentA, aCourse2Id, aMeeting1Id, {
        dayOfWeek: 5,
      }).expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toBe('Resource not found');
      expect(await app.prisma.classMeeting.findUnique({ where: { id: aMeeting1Id } })).toEqual(
        before
      );
    });

    it('a missing meeting id → the identical uniform 404', async () => {
      const response = await patchMeeting(studentA, aCourse1Id, uuidv4(), {
        dayOfWeek: 2,
      }).expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toBe('Resource not found');
    });

    it('a merged-value violation (endTime patched to the stored startTime) → 400, no write', async () => {
      const before = await app.prisma.classMeeting.findUnique({ where: { id: aMeeting2Id } });

      const response = await patchMeeting(studentA, aCourse1Id, aMeeting2Id, {
        endTime: '14:00', // == the stored startTime
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('endTime');
      expect(await app.prisma.classMeeting.findUnique({ where: { id: aMeeting2Id } })).toEqual(
        before
      );
    });

    it('a slot colliding with another meeting of the course (P2002) → 409, no write', async () => {
      const before = await app.prisma.classMeeting.findUnique({ where: { id: aMeeting1Id } });

      // All three fields: the merged values must be valid (end > start) so
      // the collision — not a validation error — is what fires.
      const response = await patchMeeting(studentA, aCourse1Id, aMeeting1Id, {
        dayOfWeek: 3,
        startTime: '14:00', // m2's slot
        endTime: '15:30',
      }).expect(HttpStatus.CONFLICT);

      expect(response.body.message).toBe('A meeting already exists at this time.');
      expect(await app.prisma.classMeeting.findUnique({ where: { id: aMeeting1Id } })).toEqual(
        before
      );
    });

    it('an unknown body field / a userId in the body → 400 (global pipe)', async () => {
      const unknown = await patchMeeting(studentA, aCourse1Id, aMeeting1Id, {
        dayOfWeek: 2,
        isRecurring: true,
      }).expect(HttpStatus.BAD_REQUEST);
      expect(unknown.body.errors).toHaveProperty('isRecurring');

      const userId = await patchMeeting(studentA, aCourse1Id, aMeeting1Id, {
        dayOfWeek: 2,
        userId: studentB.id,
      }).expect(HttpStatus.BAD_REQUEST);
      expect(userId.body.errors).toHaveProperty('userId');
    });

    it('an empty body → 400 "At least one field must be provided"', async () => {
      const response = await patchMeeting(studentA, aCourse1Id, aMeeting1Id, {}).expect(
        HttpStatus.BAD_REQUEST
      );

      expect(response.body.message).toBe('At least one field must be provided');
    });

    it('B patches their own meeting on their own course → 200 (the route works for the owner)', async () => {
      const response = await patchMeeting(studentB, bCourseId, bMeetingId, {
        startTime: '11:30',
        endTime: '12:30',
      }).expect(HttpStatus.OK);

      expect(response.body).toMatchObject({ id: bMeetingId, startTime: '11:30', endTime: '12:30' });
    });
  });

  // ==================== DELETE /courses/:id/meetings/:meetingId (AC 5) ====================

  describe('DELETE /courses/:id/meetings/:meetingId', () => {
    it('A deletes their meeting → 204, the row is gone', async () => {
      await deleteMeeting(studentA, aCourse1Id, aMeeting3Id).expect(HttpStatus.NO_CONTENT);

      expect(await app.prisma.classMeeting.findUnique({ where: { id: aMeeting3Id } })).toBeNull();
    });

    it("B deleting A's meeting under A's course → uniform 404; the row survives", async () => {
      const response = await deleteMeeting(studentB, aCourse1Id, aMeeting1Id).expect(
        HttpStatus.NOT_FOUND
      );

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });
      expect(
        (await app.prisma.classMeeting.findUnique({ where: { id: aMeeting1Id } }))!
      ).toMatchObject({ userId: studentA.id }); // untouched
    });

    it("A deleting their meeting under A's *other* course id (dual-ownership) → uniform 404; the row survives", async () => {
      const response = await deleteMeeting(studentA, aCourse2Id, aMeeting1Id).expect(
        HttpStatus.NOT_FOUND
      );

      expect(response.body.message).toBe('Resource not found');
      expect(
        (await app.prisma.classMeeting.findUnique({ where: { id: aMeeting1Id } }))!
      ).toMatchObject({ userId: studentA.id }); // untouched
    });

    it('a missing meeting id → the identical uniform 404', async () => {
      const response = await deleteMeeting(studentA, aCourse1Id, uuidv4()).expect(
        HttpStatus.NOT_FOUND
      );

      expect(response.body.message).toBe('Resource not found');
    });

    it('A deletes their remaining meeting → 204 (cleanup sanity)', async () => {
      await deleteMeeting(studentA, aCourse1Id, aMeeting1Id).expect(HttpStatus.NO_CONTENT);

      expect(await app.prisma.classMeeting.findUnique({ where: { id: aMeeting1Id } })).toBeNull();
    });
  });

  // ==================== Detail projections (AC 6, D112-3) ====================

  describe('GET /courses/:id detail projections', () => {
    let aCourse3Id: string;
    let aMeeting4Id: string; // Fri 16:00–17:00
    let aMeeting5Id: string; // Mon 09:00–09:30

    beforeAll(async () => {
      // A dedicated course keeps the assertions independent of the mutations
      // the earlier blocks performed on course1.
      const aCourse3 = await postCourse(studentA, {
        code: `MEETC${runId}`,
        name: 'Detail Course',
      }).expect(HttpStatus.CREATED);
      aCourse3Id = aCourse3.body.id;

      const m4 = await postMeeting(studentA, aCourse3Id, {
        dayOfWeek: 5,
        startTime: '16:00',
        endTime: '17:00',
      }).expect(HttpStatus.CREATED);
      aMeeting4Id = m4.body.id;

      const m5 = await postMeeting(studentA, aCourse3Id, {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '09:30',
      }).expect(HttpStatus.CREATED);
      aMeeting5Id = m5.body.id;
    });

    it("A's detail → the 14-key shape with the meetings projected (contract ordering) and read-only assignments", async () => {
      const response = await getCourse(studentA, aCourse3Id).expect(HttpStatus.OK);

      expect(Object.keys(response.body).sort()).toEqual(COURSE_DETAIL_KEYS);
      // No assignment management yet (EP03) — the projection is an empty array.
      expect(response.body.assignments).toEqual([]);
      // dayOfWeek asc: Mon 09:00 (m5) before Fri 16:00 (m4).
      expect(response.body.meetings.map((m: { id: string }) => m.id)).toEqual([
        aMeeting5Id,
        aMeeting4Id,
      ]);
      for (const meeting of response.body.meetings) {
        expect(Object.keys(meeting).sort()).toEqual(MEETING_KEYS);
        expect(meeting).not.toHaveProperty('userId');
        expect(meeting).not.toHaveProperty('courseId');
      }
    });

    it("B's detail never contains A's meetings or courses (wire-level scoping)", async () => {
      const response = await getCourse(studentB, bCourseId).expect(HttpStatus.OK);

      expect(Object.keys(response.body).sort()).toEqual(COURSE_DETAIL_KEYS);
      expect(response.body.meetings.map((m: { id: string }) => m.id)).toEqual([bMeetingId]);
      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain(aCourse1Id);
      expect(serialized).not.toContain(aMeeting1Id);
      expect(serialized).not.toContain(aMeeting2Id);
      expect(serialized).not.toContain(aCourse3Id);
      expect(serialized).not.toContain(aMeeting4Id);
    });

    it("B reading A's course id → uniform 404 (the detail route's ownership gate)", async () => {
      const response = await getCourse(studentB, aCourse1Id).expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });
    });
  });

  // ==================== 401 unauthenticated (all four meeting routes) ====================

  describe('unauthenticated → 401 (global guard regression)', () => {
    it('GET /courses/:id/meetings without a token → 401', async () => {
      await agent.get(`/courses/${uuidv4()}/meetings`).expect(HttpStatus.UNAUTHORIZED);
    });

    it('POST /courses/:id/meetings without a token → 401', async () => {
      await agent
        .post(`/courses/${uuidv4()}/meetings`)
        .send({ dayOfWeek: 1, startTime: '09:00', endTime: '10:30' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('PATCH /courses/:id/meetings/:meetingId without a token → 401', async () => {
      await agent
        .patch(`/courses/${uuidv4()}/meetings/${uuidv4()}`)
        .send({ dayOfWeek: 2 })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('DELETE /courses/:id/meetings/:meetingId without a token → 401', async () => {
      await agent
        .delete(`/courses/${uuidv4()}/meetings/${uuidv4()}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
