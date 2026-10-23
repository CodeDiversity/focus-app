import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * SP-112C e2e spec: the **meetings + course-detail feature as a student
 * journey**, over real HTTP against a real PostgreSQL database (the
 * `test-http` harness carries the real courses + semesters modules —
 * `main.ts` parity; the same harness the SP-111C `courses-e2e.spec.ts`
 * sibling uses for the course-management journey).
 *
 * This is the cross-layer wire proof the SP-112A/B children bracketed from
 * their own sides (SP-110C/SP-111C precedent): A's `ClassMeeting` model +
 * four nested meeting routes + the `GET /courses/:id` detail projections
 * (D112-1…4) driven end to end, the same surface B's `/courses/:id` detail
 * page consumes.
 *
 * - AC1 lifecycle (one student, in order): create a course → add two
 *   meetings (Mon 09:00–10:30, Wed 14:00–15:30) → list returns both in
 *   `dayOfWeek`/`startTime` order → `PATCH` edits a meeting (new weekday +
 *   times) → `DELETE` removes it. *(AC-E02-04, DoD 1/8)*
 * - Validation over HTTP: `end == start`, `end < start`, a midnight wrap,
 *   `25:00`, `12:60`, weekday −1/7 → 400 field-level; a duplicate weekly
 *   slot → 409. *(DoD 2/8)*
 * - Cross-student matrix: B's GET/POST/PATCH/DELETE under A's course id →
 *   uniform 404; A's meetings byte-identical before/after; B's detail
 *   projection never contains A's meetings/assignments; 401 on every route
 *   without a token. *(DoD 3/8)*
 * - Dual-ownership: A PATCHes/DELETEs a meeting of A's *other* course via
 *   the first course's id → uniform 404, no write. *(DoD 3/8)*
 * - Detail projections: `GET /courses/:id` returns `meetings` +
 *   `assignments` (empty arrays when none; an assignment attached to the
 *   course appears — seeded directly in the fixture, no assignments API
 *   exists yet, EP03 owns management); an **archived** course's detail
 *   still returns its meetings + assignments (AC-E02-05). *(AC-E02-06,
 *   DoD 1)*
 *
 * The `courses-data-scoping.spec.ts` sibling pins each route in isolation;
 * this spec proves the routes **together** as the feature the UI (SP-112B)
 * drives. The cases are ordered as the student journey and each asserts on
 * real rows via the harness `prisma` handle. The cases within the suite are
 * state-dependent by design (a journey, not a set of isolated requests).
 *
 * Self-skips when `DATABASE_URL` is unset (the SP-104/SP-105/SP-106/
 * SP-107A/SP-110C/SP-111C convention), so a bare local `pnpm test` still
 * works; the verification run supplies `DATABASE_URL` so the suite executes
 * with zero skips.
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/** The exact `ClassMeeting` contract keys (shared API contract, SP-112 README). */
const MEETING_KEYS = ['createdAt', 'dayOfWeek', 'endTime', 'id', 'startTime', 'updatedAt'].sort();

/**
 * The exact `GET /courses/:id` detail keys (SP-112A, D112-3): the
 * `CourseWithSemester` keys plus the `meetings` + read-only `assignments`
 * projections.  The list route stays light.
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

/**
 * The exact read-only `Assignment` projection keys (SP-112A, D112-3): the
 * frontend `Assignment` type minus the nested `course` — `userId`/`courseId`
 * never exposed.
 */
const ASSIGNMENT_KEYS = [
  'actualHours',
  'createdAt',
  'description',
  'dueDate',
  'estimatedHours',
  'id',
  'priority',
  'status',
  'title',
  'updatedAt',
].sort();

describeIntegration('class meetings + course detail end-to-end (real database, SP-112C)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string): string =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-meetings-e2e`;

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  // Non-optional by type: if seeding fails, the suite fails in beforeAll
  // (afterAll's filter keeps cleanup from crashing on partial seeding).
  let studentA: Student; // the lifecycle + projections journey (AC1)
  let studentB: Student; // the cross-student matrix (AC1)

  interface Student {
    id: string;
    email: string;
    accessToken: string;
  }

  // Rows created during the journey (for row-level assertions).
  let fallId: string;
  let cs101Id: string; // the journey course (meetings live here)
  let cs201Id: string; // A's *other* course (the dual-ownership cases)
  let meetingOneId: string; // Mon 09:00–10:30, later patched to Tue 11:00–12:00
  let meetingTwoId: string; // Wed 14:00–15:30, later deleted
  let assignmentId: string; // seeded directly (the read-only projection proof)

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

  function getCourse(session: Student, id: string) {
    return agent.get(`/courses/${id}`).set('Authorization', `Bearer ${session.accessToken}`);
  }

  function listCourses(session: Student, query: Record<string, string> = {}) {
    return agent.get('/courses').query(query).set('Authorization', `Bearer ${session.accessToken}`);
  }

  function patchCourse(session: Student, id: string, body: Record<string, unknown>) {
    return agent
      .patch(`/courses/${id}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send(body);
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

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());

    studentA = await registerAndLogin('student-a');
    studentB = await registerAndLogin('student-b');

    // A's academic structure: one semester + two courses.  CS101 is the
    // journey course; CS201 (unaffiliated) is the "other course" the
    // dual-ownership cases need.  B creates nothing.
    const fall = await agent
      .post('/semesters')
      .set('Authorization', `Bearer ${studentA.accessToken}`)
      .send({ name: `Fall ${runId}`, startDate: '2026-09-01', endDate: '2026-12-15' })
      .expect(HttpStatus.CREATED);
    fallId = fall.body.id;

    const cs101 = await postCourse(studentA, {
      code: `CS${runId}A`,
      name: 'Computer Science I',
      semesterId: fallId,
      instructor: 'Prof. Ada',
    }).expect(HttpStatus.CREATED);
    cs101Id = cs101.body.id;

    const cs201 = await postCourse(studentA, {
      code: `CS${runId}B`,
      name: 'Computer Science II',
    }).expect(HttpStatus.CREATED);
    cs201Id = cs201.body.id;
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    // Deleting the users cascades (onDelete: Cascade) to their semesters,
    // courses, meetings and assignments.
    await app.prisma.user.deleteMany({
      where: {
        id: { in: [studentA?.id, studentB?.id].filter((id): id is string => Boolean(id)) },
      },
    });
    await app.app.close();
  }, 60_000);

  // ==================== AC1 — full lifecycle (student A, CS101) ====================

  describe('AC1 — full lifecycle: add two meetings → list → edit → delete (AC-E02-04, DoD 1/8)', () => {
    it('POST /courses/:id/meetings ×2 (Mon 09:00–10:30, Wed 14:00–15:30): 201, exact 6-key shape, rows owned by A on the route course', async () => {
      const one = await postMeeting(studentA, cs101Id, {
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        endTime: '10:30',
      }).expect(HttpStatus.CREATED);
      expect(Object.keys(one.body).sort()).toEqual(MEETING_KEYS);
      expect(one.body).toMatchObject({ dayOfWeek: 1, startTime: '09:00', endTime: '10:30' });
      expect(one.body).not.toHaveProperty('userId');
      expect(one.body).not.toHaveProperty('courseId');
      meetingOneId = one.body.id as string;

      const two = await postMeeting(studentA, cs101Id, {
        dayOfWeek: 3, // Wednesday
        startTime: '14:00',
        endTime: '15:30',
      }).expect(HttpStatus.CREATED);
      expect(Object.keys(two.body).sort()).toEqual(MEETING_KEYS);
      meetingTwoId = two.body.id as string;

      // The rows agree (the wire is not the source of truth — the row is):
      // owned by A, attached to the route's course (the navigation unit, D112-2).
      const rows = await app.prisma.classMeeting.findMany({ where: { userId: studentA.id } });
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.userId).toBe(studentA.id);
        expect(row.courseId).toBe(cs101Id);
      }
    });

    it('GET /courses/:id/meetings: both rows in dayOfWeek asc / startTime asc order, 6 keys each', async () => {
      const response = await getMeetings(studentA, cs101Id).expect(HttpStatus.OK);

      expect(response.body.map((m: { id: string }) => m.id)).toEqual([meetingOneId, meetingTwoId]);
      for (const meeting of response.body) {
        expect(Object.keys(meeting).sort()).toEqual(MEETING_KEYS);
      }
    });

    it('PATCH edits a meeting (new weekday + times): 200, the merged values come back and the row agrees', async () => {
      const response = await patchMeeting(studentA, cs101Id, meetingOneId, {
        dayOfWeek: 2, // Tuesday
        startTime: '11:00',
        endTime: '12:00',
      }).expect(HttpStatus.OK);

      expect(Object.keys(response.body).sort()).toEqual(MEETING_KEYS);
      expect(response.body).toMatchObject({
        id: meetingOneId,
        dayOfWeek: 2,
        startTime: '11:00',
        endTime: '12:00',
      });

      const row = await app.prisma.classMeeting.findUnique({ where: { id: meetingOneId } });
      expect(row).toMatchObject({ dayOfWeek: 2, startTime: '11:00', endTime: '12:00' });
    });

    it('DELETE removes the meeting: 204, the row is gone, the list re-derives', async () => {
      await deleteMeeting(studentA, cs101Id, meetingTwoId).expect(HttpStatus.NO_CONTENT);

      expect(await app.prisma.classMeeting.findUnique({ where: { id: meetingTwoId } })).toBeNull();

      const response = await getMeetings(studentA, cs101Id).expect(HttpStatus.OK);
      expect(response.body.map((m: { id: string }) => m.id)).toEqual([meetingOneId]);
      expect(response.body[0]).toMatchObject({
        dayOfWeek: 2,
        startTime: '11:00',
        endTime: '12:00',
      });
    });
  });

  // ==================== Validation over HTTP (DoD 2/8) ====================

  describe('validation over HTTP (DoD 2/8)', () => {
    it('end == start → 400 with endTime in the field-level errors; nothing written', async () => {
      const before = await app.prisma.classMeeting.count({ where: { userId: studentA.id } });

      const response = await postMeeting(studentA, cs101Id, {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '09:00',
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('endTime');
      expect(await app.prisma.classMeeting.count({ where: { userId: studentA.id } })).toBe(before);
    });

    it('end < start → 400 with endTime in the field-level errors', async () => {
      const response = await postMeeting(studentA, cs101Id, {
        dayOfWeek: 1,
        startTime: '10:30',
        endTime: '09:00',
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('endTime');
    });

    it('a midnight wrap (23:00 → 01:00) → 400 with endTime in the field-level errors (no wrap in the MVP)', async () => {
      const response = await postMeeting(studentA, cs101Id, {
        dayOfWeek: 1,
        startTime: '23:00',
        endTime: '01:00',
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('endTime');
    });

    it('a 25:00 hour → 400 with startTime in the field-level errors (the service owns the bounds)', async () => {
      const response = await postMeeting(studentA, cs101Id, {
        dayOfWeek: 1,
        startTime: '25:00',
        endTime: '26:00',
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('startTime');
    });

    it('a 12:60 minute → 400 with startTime in the field-level errors', async () => {
      const response = await postMeeting(studentA, cs101Id, {
        dayOfWeek: 1,
        startTime: '12:60',
        endTime: '13:00',
      }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errors).toHaveProperty('startTime');
    });

    it('a weekday of -1 and 7 → 400 with dayOfWeek in the field-level errors', async () => {
      const minusOne = await postMeeting(studentA, cs101Id, {
        dayOfWeek: -1,
        startTime: '09:00',
        endTime: '10:30',
      }).expect(HttpStatus.BAD_REQUEST);
      expect(minusOne.body.errors).toHaveProperty('dayOfWeek');

      const seven = await postMeeting(studentA, cs101Id, {
        dayOfWeek: 7,
        startTime: '09:00',
        endTime: '10:30',
      }).expect(HttpStatus.BAD_REQUEST);
      expect(seven.body.errors).toHaveProperty('dayOfWeek');
    });

    it('a duplicate weekly slot (same dayOfWeek + startTime) → 409 with the resource-specific message; nothing written', async () => {
      const before = await app.prisma.classMeeting.findUnique({ where: { id: meetingOneId } });

      // The journey meeting now occupies Tue 11:00 — the same slot again.
      const response = await postMeeting(studentA, cs101Id, {
        dayOfWeek: 2,
        startTime: '11:00',
        endTime: '12:30',
      }).expect(HttpStatus.CONFLICT);

      expect(response.body.message).toBe('A meeting already exists at this time.');
      expect(await app.prisma.classMeeting.findUnique({ where: { id: meetingOneId } })).toEqual(
        before
      ); // unchanged
    });
  });

  // ==================== Cross-student matrix (DoD 3/8) ====================

  describe('cross-student matrix (DoD 3/8)', () => {
    let meetingsBefore: unknown;
    let courseBefore: unknown;

    beforeAll(async () => {
      // Unscoped reads — the rows are the source of truth for the
      // byte-identical assertion (no existence oracle, no partial write).
      meetingsBefore = await app.prisma.classMeeting.findMany({
        where: { userId: studentA.id },
      });
      courseBefore = await app.prisma.course.findUnique({ where: { id: cs101Id } });
    });

    it("B's GET / POST / PATCH / DELETE under A's course id → uniform 404; A's meetings byte-identical", async () => {
      await getCourse(studentB, cs101Id)
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body.message).toBe('Resource not found');
        });

      await postMeeting(studentB, cs101Id, {
        dayOfWeek: 4,
        startTime: '10:00',
        endTime: '11:00',
      })
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body.message).toBe('Resource not found');
        });

      await patchMeeting(studentB, cs101Id, meetingOneId, {
        dayOfWeek: 5,
        startTime: '20:00',
        endTime: '21:00',
      })
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body.message).toBe('Resource not found');
        });

      await deleteMeeting(studentB, cs101Id, meetingOneId)
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body.message).toBe('Resource not found');
        });

      // None of B's attempts wrote anything — no existence oracle, no
      // partial write.
      expect(await app.prisma.classMeeting.findMany({ where: { userId: studentA.id } })).toEqual(
        meetingsBefore
      );
      expect(await app.prisma.course.findUnique({ where: { id: cs101Id } })).toEqual(courseBefore);
      // B still owns no meetings.
      expect(await app.prisma.classMeeting.count({ where: { userId: studentB.id } })).toBe(0);
    });

    it("B's detail projection never contains A's meetings/assignments (wire-level scoping)", async () => {
      // B registered no courses — the list is empty, and in particular A's
      // ids never appear (with or without archived rows).
      const all = await listCourses(studentB, { includeArchived: 'true' }).expect(HttpStatus.OK);
      expect(all.body).toHaveLength(0);
      const serialized = JSON.stringify(all.body);
      expect(serialized).not.toContain(cs101Id);
      expect(serialized).not.toContain(cs201Id);
      expect(serialized).not.toContain(meetingOneId);

      // The only detail route B could take is A's course id — a uniform 404,
      // so A's meetings/assignments can never reach B over the wire.
      await getCourse(studentB, cs101Id).expect(HttpStatus.NOT_FOUND);
    });
  });

  // ==================== Dual-ownership (DoD 3/8) ====================

  describe('dual-ownership: the meeting must belong to BOTH the route course and the student (DoD 3/8)', () => {
    let meetingBefore: unknown;

    beforeAll(async () => {
      meetingBefore = await app.prisma.classMeeting.findUnique({ where: { id: meetingOneId } });
    });

    it("A PATCHing their meeting under A's *other* course id → uniform 404, no write", async () => {
      const response = await patchMeeting(studentA, cs201Id, meetingOneId, {
        dayOfWeek: 5,
      }).expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toBe('Resource not found');
      expect(await app.prisma.classMeeting.findUnique({ where: { id: meetingOneId } })).toEqual(
        meetingBefore
      ); // untouched
    });

    it("A DELETEing their meeting under A's *other* course id → uniform 404; the row survives", async () => {
      const response = await deleteMeeting(studentA, cs201Id, meetingOneId).expect(
        HttpStatus.NOT_FOUND
      );

      expect(response.body.message).toBe('Resource not found');
      expect(await app.prisma.classMeeting.findUnique({ where: { id: meetingOneId } })).toEqual(
        meetingBefore
      ); // untouched
    });
  });

  // ==================== Detail projections (AC-E02-06, DoD 1) ====================

  describe('GET /courses/:id detail projections (AC-E02-06, DoD 1)', () => {
    it("A's detail → the 14-key shape: the meetings projected (contract ordering) and assignments an empty array until EP03", async () => {
      const response = await getCourse(studentA, cs101Id).expect(HttpStatus.OK);

      expect(Object.keys(response.body).sort()).toEqual(COURSE_DETAIL_KEYS);
      expect(response.body).toMatchObject({
        id: cs101Id,
        code: `CS${runId}A`,
        name: 'Computer Science I',
        instructor: 'Prof. Ada',
        isActive: true,
        semester: { id: fallId, name: `Fall ${runId}` },
      });
      // The journey's surviving meeting, in the canonical 6-key shape.
      expect(response.body.meetings.map((m: { id: string }) => m.id)).toEqual([meetingOneId]);
      for (const meeting of response.body.meetings) {
        expect(Object.keys(meeting).sort()).toEqual(MEETING_KEYS);
        expect(meeting).not.toHaveProperty('userId');
        expect(meeting).not.toHaveProperty('courseId');
      }
      // No assignment management yet (EP03) — the projection is an empty array.
      expect(response.body.assignments).toEqual([]);
    });

    it('an assignment attached to the course (seeded directly — no assignments API exists) appears in the read-only projection', async () => {
      // Direct DB seed: the read-only projection proof (EP03 owns
      // management; the ticket allows seeding the fixture).
      const dueDate = new Date('2026-11-15T23:59:00.000Z');
      const seeded = await app.prisma.assignment.create({
        data: {
          userId: studentA.id,
          courseId: cs101Id,
          title: `Problem Set 1 ${runId}`,
          description: 'Recursion exercises',
          dueDate,
          estimatedHours: 2,
        },
      });
      assignmentId = seeded.id;

      const response = await getCourse(studentA, cs101Id).expect(HttpStatus.OK);

      expect(response.body.assignments).toHaveLength(1);
      const projected = response.body.assignments[0];
      expect(Object.keys(projected).sort()).toEqual(ASSIGNMENT_KEYS);
      expect(projected).toMatchObject({
        id: assignmentId,
        title: `Problem Set 1 ${runId}`,
        description: 'Recursion exercises',
        dueDate: dueDate.toISOString(), // ISO-serialized (EP03 owns date semantics)
        estimatedHours: 2,
        actualHours: null,
        status: 'PENDING', // the schema default
        priority: 'MEDIUM', // the schema default
      });
      expect(projected).not.toHaveProperty('userId');
      expect(projected).not.toHaveProperty('courseId');
    });

    it("an archived course's detail still returns its meetings + assignments (AC-E02-05)", async () => {
      await patchCourse(studentA, cs101Id, { isActive: false }).expect(HttpStatus.OK);

      const response = await getCourse(studentA, cs101Id).expect(HttpStatus.OK);
      expect(response.body.isActive).toBe(false);
      expect(response.body.meetings.map((m: { id: string }) => m.id)).toEqual([meetingOneId]);
      expect(response.body.assignments.map((a: { id: string }) => a.id)).toEqual([assignmentId]);

      // The row survives — archiving is a flag flip, never a delete (D111-2).
      const row = await app.prisma.course.findUnique({ where: { id: cs101Id } });
      expect(row).not.toBeNull();
      expect(row!.isActive).toBe(false);
    });
  });

  // ==================== Unauthenticated access (DoD 3/8) ====================

  describe('unauthenticated → 401 (global guard regression)', () => {
    it('every route without a token → 401', async () => {
      // The five feature routes: the four nested meeting routes + the detail
      // route.  No Authorization header on any of them.
      await agent.get(`/courses/${cs101Id}`).expect(HttpStatus.UNAUTHORIZED);

      await agent.get(`/courses/${cs101Id}/meetings`).expect(HttpStatus.UNAUTHORIZED);

      await agent
        .post(`/courses/${cs101Id}/meetings`)
        .send({ dayOfWeek: 1, startTime: '09:00', endTime: '10:30' })
        .expect(HttpStatus.UNAUTHORIZED);

      await agent
        .patch(`/courses/${cs101Id}/meetings/${meetingOneId}`)
        .send({ dayOfWeek: 2 })
        .expect(HttpStatus.UNAUTHORIZED);

      await agent
        .delete(`/courses/${cs101Id}/meetings/${meetingOneId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
