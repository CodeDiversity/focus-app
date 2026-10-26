import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * SP-120I: end-to-end subtask journey over real HTTP + PostgreSQL — the
 * same contract the SP-120J checklist UI consumes (the shared contract in
 * `docs/stories/EP03/SP-120/README.md`). No mocked services or direct task
 * seeds: every subtask goes through the API, the deleted/orphaned rows are
 * asserted through Prisma only, and the checklist data is read back the way
 * the UI reads it (the single `GET /courses/:id` fetch, D112B-13/D120-5).
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;
const SUBTASK_KEYS = ['id', 'title', 'status', 'orderIndex', 'createdAt', 'updatedAt'].sort();
const ASSIGNMENT_KEYS = [
  'actualHours',
  'createdAt',
  'description',
  'dueDate',
  'estimatedHours',
  'id',
  'priority',
  'status',
  'subtasks', // SP-120I (D120-5)
  'title',
  'type', // SP-115G (D115-4)
  'updatedAt',
].sort();

describeIntegration('assignment subtasks end-to-end (SP-120I, real database)', () => {
  interface Student {
    id: string;
    accessToken: string;
  }

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  let studentA: Student;
  let studentB: Student;
  let courseA: string;
  let assignmentA: string;
  let courseB: string;
  let assignmentB: string;
  const runId = uuidv4();

  async function registerAndLogin(label: string): Promise<Student> {
    const email = `${label}.${runId}.subtasks@studypilot-test.invalid`;
    const password = `S3cure-${runId}-subtasks`;
    await agent
      .post('/auth/register')
      .send({ name: `Student ${label}`, email, password })
      .expect(HttpStatus.CREATED);
    const login = await agent.post('/auth/login').send({ email, password }).expect(HttpStatus.OK);
    return { id: login.body.user.id, accessToken: login.body.accessToken };
  }

  function listSubtasks(student: Student, assignmentId: string) {
    return agent
      .get(`/assignments/${assignmentId}/subtasks`)
      .set('Authorization', `Bearer ${student.accessToken}`);
  }
  function createSubtask(student: Student, assignmentId: string, body: Record<string, unknown>) {
    return agent
      .post(`/assignments/${assignmentId}/subtasks`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send(body);
  }
  function patchSubtask(
    student: Student,
    assignmentId: string,
    subtaskId: string,
    body: Record<string, unknown>
  ) {
    return agent
      .patch(`/assignments/${assignmentId}/subtasks/${subtaskId}`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send(body);
  }
  function deleteSubtask(student: Student, assignmentId: string, subtaskId: string) {
    return agent
      .delete(`/assignments/${assignmentId}/subtasks/${subtaskId}`)
      .set('Authorization', `Bearer ${student.accessToken}`);
  }
  function detail(student: Student, courseId: string) {
    return agent.get(`/courses/${courseId}`).set('Authorization', `Bearer ${student.accessToken}`);
  }

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());
    studentA = await registerAndLogin('a');
    studentB = await registerAndLogin('b');
    for (const [student, courseIdRef] of [
      [studentA, 'courseA'],
      [studentB, 'courseB'],
    ] as const) {
      const course = await agent
        .post('/courses')
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({ code: 'CS120', name: 'Subtask journey' })
        .expect(HttpStatus.CREATED);
      const assignment = await agent
        .post('/assignments')
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({ title: 'Problem set', courseId: course.body.id })
        .expect(HttpStatus.CREATED);
      if (courseIdRef === 'courseA') {
        courseA = course.body.id;
        assignmentA = assignment.body.id;
      } else {
        courseB = course.body.id;
        assignmentB = assignment.body.id;
      }
    }
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    try {
      await app.prisma.user.deleteMany({
        where: { id: { in: [studentA?.id, studentB?.id].filter(Boolean) as string[] } },
      });
    } finally {
      await app.app.close();
    }
  }, 60_000);

  it('runs the AC-E03-03 checklist round trip: append, explicit slot, order, toggle, reorder, delete', async () => {
    // Empty start (AC-E03-03: ordered subtasks under an assignment).
    expect((await listSubtasks(studentA, assignmentA).expect(HttpStatus.OK)).body).toEqual([]);

    // Append-on-create: omitted orderIndex → 0, then 1 (D120-7).
    const first = await createSubtask(studentA, assignmentA, {
      title: '  Read chapter 1  ',
    }).expect(HttpStatus.CREATED);
    expect(Object.keys(first.body).sort()).toEqual(SUBTASK_KEYS);
    expect(first.body).toMatchObject({
      title: 'Read chapter 1',
      status: 'PENDING',
      orderIndex: 0,
    });
    const second = await createSubtask(studentA, assignmentA, { title: 'Solve problems' }).expect(
      HttpStatus.CREATED
    );
    expect(second.body.orderIndex).toBe(1);

    // An explicit orderIndex is stored as given (gaps allowed, no shifting).
    const bumped = await createSubtask(studentA, assignmentA, {
      title: 'Review notes',
      orderIndex: 10,
    }).expect(HttpStatus.CREATED);
    let list = (await listSubtasks(studentA, assignmentA).expect(HttpStatus.OK)).body;
    expect(list.map((s: { orderIndex: number; createdAt: string }) => s.orderIndex)).toEqual([
      0, 1, 10,
    ]);
    expect(typeof list[1].createdAt).toBe('string');

    // Toggle completion (D120-4) — persists.
    const completed = await patchSubtask(studentA, assignmentA, second.body.id, {
      status: 'COMPLETED',
    }).expect(HttpStatus.OK);
    expect(completed.body).toMatchObject({ id: second.body.id, status: 'COMPLETED' });

    // Reorder by swapping orderIndex values (D120-7 MVP semantics).
    await patchSubtask(studentA, assignmentA, first.body.id, { orderIndex: 10 }).expect(200);
    await patchSubtask(studentA, assignmentA, bumped.body.id, { orderIndex: 0 }).expect(200);
    list = (await listSubtasks(studentA, assignmentA).expect(HttpStatus.OK)).body;
    expect(list.map((s: { id: string }) => s.id)).toEqual([
      bumped.body.id,
      second.body.id,
      first.body.id,
    ]);

    // The row state is real: completed status persisted, order indices moved.
    const row = await app.prisma.task.findFirst({
      where: { id: second.body.id, userId: studentA.id },
    });
    expect(row).toMatchObject({ status: 'COMPLETED', orderIndex: 1 });

    // Delete (204 no body) — assignment untouched, no shifting (D120-7).
    const response = await deleteSubtask(studentA, assignmentA, bumped.body.id).expect(
      HttpStatus.NO_CONTENT
    );
    expect(response.text).toBe('');
    expect(await app.prisma.task.findFirst({ where: { id: bumped.body.id } })).toBeNull();
    list = (await listSubtasks(studentA, assignmentA).expect(HttpStatus.OK)).body;
    // After the D120-7 swap the order values are (second)=1, (first)=10 —
    // the list is always orderIndex-ascending, never insertion time.
    expect(list.map((s: { orderIndex: number }) => s.orderIndex)).toEqual([1, 10]);

    // Clean up so student B's isolation checks below start empty for A.
    await deleteSubtask(studentA, assignmentA, first.body.id).expect(HttpStatus.NO_CONTENT);
    await deleteSubtask(studentA, assignmentA, second.body.id).expect(HttpStatus.NO_CONTENT);
    await deleteSubtask(studentA, assignmentA, first.body.id).expect(404);
  });

  it('rejects create/patch violations over HTTP with field errors and no write', async () => {
    const invalidCreate = [
      ['title', '   '],
      ['title', 'x'.repeat(201)],
      ['title', 42],
      ['orderIndex', -1],
      ['orderIndex', 2.5],
      ['orderIndex', '2'],
      ['status', 'COMPLETED'], // status is never client-writable on create (D120-3)
      ['status', 'ARCHIVED'],
      ['priority', 'HIGH'],
      ['description', 'notes'],
      ['userId', 'forged-principal'],
      ['assignmentId', 'forged-parent'],
    ] as const;
    for (const [field, value] of invalidCreate) {
      const before = await app.prisma.task.findMany({
        where: { userId: studentA.id },
        orderBy: { id: 'asc' },
      });
      const response = await createSubtask(studentA, assignmentA, {
        title: 'Invalid attempt',
        [field]: value,
      }).expect(HttpStatus.BAD_REQUEST);
      expect(response.body.errors).toHaveProperty(field);
      expect(
        await app.prisma.task.findMany({ where: { userId: studentA.id }, orderBy: { id: 'asc' } })
      ).toEqual(before);
    }

    const created = await createSubtask(studentA, assignmentA, {
      title: 'Patch target',
    }).expect(HttpStatus.CREATED);
    for (const [field, value] of [
      ['title', '  '],
      ['title', 'x'.repeat(201)],
      ['orderIndex', -1],
      ['orderIndex', 2.5],
      ['status', 'ARCHIVED'],
      ['status', 'IN_PROGRESS'],
      ['priority', 'HIGH'],
      ['description', 'notes'],
    ] as const) {
      const response = await patchSubtask(studentA, assignmentA, created.body.id, {
        [field]: value,
      }).expect(HttpStatus.BAD_REQUEST);
      expect(response.body.errors).toHaveProperty(field);
    }
    const empty = await patchSubtask(studentA, assignmentA, created.body.id, {}).expect(
      HttpStatus.BAD_REQUEST
    );
    expect(empty.body.message).toBe('At least one field must be provided');
    // The surviving row only carries the clear API calls made so far.
    expect(
      await app.prisma.task.findFirst({ where: { id: created.body.id, userId: studentA.id } })
    ).toMatchObject({ title: 'Patch target', status: 'PENDING', orderIndex: 0 });
    // Clean state for the next test.
    await deleteSubtask(studentA, assignmentA, created.body.id).expect(HttpStatus.NO_CONTENT);
  });

  it('enforces student ownership: another student never reaches the subtask routes', async () => {
    const seeded = await createSubtask(studentA, assignmentA, {
      title: 'Student A private step',
    }).expect(HttpStatus.CREATED);

    // Foreign assignment id → uniform 404 on every route.
    for (const assignmentId of [assignmentA, uuidv4(), 'malformed']) {
      const listed = await listSubtasks(studentB, assignmentId).expect(HttpStatus.NOT_FOUND);
      expect(listed.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });
      await createSubtask(studentB, assignmentId, { title: 'Blocked' }).expect(
        HttpStatus.NOT_FOUND
      );
      await patchSubtask(studentB, assignmentId, seeded.body.id, { title: 'Hijack' }).expect(
        HttpStatus.NOT_FOUND
      );
      await deleteSubtask(studentB, assignmentId, seeded.body.id).expect(HttpStatus.NOT_FOUND);
    }
    // The attacker's own assignment is untouched and empty.
    const ownListed = await listSubtasks(studentB, assignmentB).expect(HttpStatus.OK);
    expect(ownListed.body).toEqual([]);
    // A forged value in the body does not bypass ownership either.
    await createSubtask(studentB, assignmentB, {
      title: 'Forged parent',
      assignmentId: assignmentA,
    }).expect(HttpStatus.BAD_REQUEST);

    // Student A's data is still exactly theirs.
    const row = await app.prisma.task.findFirst({ where: { id: seeded.body.id } });
    expect(row).toMatchObject({
      userId: studentA.id,
      assignmentId: assignmentA,
      title: 'Student A private step',
      status: 'PENDING',
    });
    // Clean state for the projection test below.
    await deleteSubtask(studentA, assignmentA, seeded.body.id).expect(HttpStatus.NO_CONTENT);
  });

  it('projects the subtasks through GET /courses/:id (D120-5): 6-key shape, owner scope, empty arrays', async () => {
    const one = await createSubtask(studentA, assignmentA, {
      title: 'Projected step',
      orderIndex: 2,
    }).expect(HttpStatus.CREATED);
    // Appended: max(orderIndex) + 1 → 3 (one already holds 2).
    const two = await createSubtask(studentA, assignmentA, { title: 'Second step' }).expect(
      HttpStatus.CREATED
    );
    expect(two.body.orderIndex).toBe(3);

    // Tie-break (D120-5 ordering: orderIndex asc, then createdAt asc): two
    // rows with the same orderIndex list by their creation time.
    const tiedA = await createSubtask(studentA, assignmentA, {
      title: 'Tied first',
      orderIndex: 7,
    }).expect(HttpStatus.CREATED);
    const tiedB = await createSubtask(studentA, assignmentA, {
      title: 'Tied second',
      orderIndex: 7,
    }).expect(HttpStatus.CREATED);
    const hmmList = (await listSubtasks(studentA, assignmentA).expect(HttpStatus.OK)).body;
    expect(hmmList.map((s: { title: string }) => s.title)).toEqual([
      'Projected step',
      'Second step',
      'Tied first',
      'Tied second',
    ]);
    await deleteSubtask(studentA, assignmentA, tiedA.body.id).expect(HttpStatus.NO_CONTENT);
    await deleteSubtask(studentA, assignmentA, tiedB.body.id).expect(HttpStatus.NO_CONTENT);

    const course = (await detail(studentA, courseA).expect(HttpStatus.OK)).body;
    expect(course.assignments).toHaveLength(1);
    const projected = course.assignments[0];
    expect(Object.keys(projected).sort()).toEqual(ASSIGNMENT_KEYS);
    expect(projected.subtasks).toEqual([one.body, two.body]); // orderIndex asc

    // The other student's projection never contains student A's checklist.
    const other = (await detail(studentB, courseB).expect(HttpStatus.OK)).body;
    expect(other.assignments).toHaveLength(1);
    expect(other.assignments[0].subtasks).toEqual([]);
    expect(JSON.stringify(other.assignments)).not.toContain('Projected step');

    // Deleting empties the projected array again.
    await deleteSubtask(studentA, assignmentA, one.body.id).expect(HttpStatus.NO_CONTENT);
    await deleteSubtask(studentA, assignmentA, two.body.id).expect(HttpStatus.NO_CONTENT);
    const emptied = (await detail(studentA, courseA).expect(HttpStatus.OK)).body;
    expect(emptied.assignments[0].subtasks).toEqual([]);
  });

  it('rejects unauthenticated subtask reads and writes before any access', async () => {
    await agent.get(`/assignments/${assignmentA}/subtasks`).expect(HttpStatus.UNAUTHORIZED);
    await agent
      .post(`/assignments/${assignmentA}/subtasks`)
      .send({ title: 'Anonymous' })
      .expect(HttpStatus.UNAUTHORIZED);
    await agent
      .patch(`/assignments/${assignmentA}/subtasks/whatever`)
      .send({ title: 'Anonymous' })
      .expect(HttpStatus.UNAUTHORIZED);
    await agent
      .delete(`/assignments/${assignmentA}/subtasks/whatever`)
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
