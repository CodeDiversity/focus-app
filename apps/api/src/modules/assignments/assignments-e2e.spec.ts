import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { ownedWhere } from '../../common/ownership/ownership';
import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

// SP-113C: real HTTP + PostgreSQL journey through the same create/refetch
// contract consumed by the quick-create UI. No mocked services or direct seeds.
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;
const ASSIGNMENT_KEYS = [
  'id',
  'title',
  'description',
  'dueDate',
  'estimatedHours',
  'actualHours',
  'status',
  'priority',
  'type', // SP-115G (D115-4): the 11-key projection gains `type`.
  'createdAt',
  'updatedAt',
].sort();

describeIntegration('quick assignment creation end-to-end (SP-113C, real database)', () => {
  interface Student {
    id: string;
    accessToken: string;
  }

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  let studentA: Student;
  let studentB: Student;
  let courseA: string;
  let courseB: string;
  const runId = uuidv4();

  async function registerAndLogin(label: string): Promise<Student> {
    const email = `${label}.${runId}@studypilot-test.invalid`;
    const password = `S3cure-${runId}-assignments`;
    await agent
      .post('/auth/register')
      .send({ name: `Student ${label}`, email, password })
      .expect(HttpStatus.CREATED);
    const login = await agent.post('/auth/login').send({ email, password }).expect(HttpStatus.OK);
    expect(login.body.accessToken).toBeTruthy();
    return { id: login.body.user.id, accessToken: login.body.accessToken };
  }

  function create(session: Student, body: Record<string, unknown>) {
    return agent
      .post('/assignments')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send(body);
  }

  function patch(session: Student, id: string, body: Record<string, unknown>) {
    return agent
      .patch(`/assignments/${id}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send(body);
  }

  function del(session: Student, id: string) {
    return agent.delete(`/assignments/${id}`).set('Authorization', `Bearer ${session.accessToken}`);
  }

  function detail(session: Student, id: string) {
    return agent.get(`/courses/${id}`).set('Authorization', `Bearer ${session.accessToken}`);
  }

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());
    studentA = await registerAndLogin('a');
    studentB = await registerAndLogin('b');
    for (const student of [studentA, studentB]) {
      const response = await agent
        .post('/courses')
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({ code: 'CS113', name: 'Assignment journey' })
        .expect(HttpStatus.CREATED);
      if (student === studentA) courseA = response.body.id;
      else courseB = response.body.id;
    }
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    try {
      // Fixture cleanup only; all academic assertions below are principal-scoped.
      await app.prisma.user.deleteMany({
        where: {
          id: { in: [studentA?.id, studentB?.id].filter((id): id is string => Boolean(id)) },
        },
      });
    } finally {
      await app.app.close();
    }
  }, 60_000);

  it('creates all optional fields, persists principal ownership, and refetches the exact projection', async () => {
    expect((await detail(studentA, courseA).expect(HttpStatus.OK)).body.assignments).toEqual([]);
    const body = {
      title: 'Problem set',
      courseId: courseA,
      description: 'Recursion exercises',
      dueDate: '2026-11-15T23:59:00.000Z',
      estimatedHours: 2.5,
      priority: 'HIGH',
      type: 'QUIZ', // SP-115G: create with a type.
    };
    const response = await create(studentA, body).expect(HttpStatus.CREATED);
    expect(Object.keys(response.body).sort()).toEqual(ASSIGNMENT_KEYS);
    expect(response.body).toMatchObject({
      title: body.title,
      description: body.description,
      dueDate: body.dueDate,
      estimatedHours: 2.5,
      priority: 'HIGH',
      status: 'PENDING',
      type: 'QUIZ',
      actualHours: null,
    });
    const row = await app.prisma.assignment.findFirst({
      where: { id: response.body.id, userId: studentA.id },
    });
    expect(row).toMatchObject({
      userId: studentA.id,
      courseId: courseA,
      status: 'PENDING',
      type: 'QUIZ',
    });
    // SP-115G: patch replaces the stored type and the course detail
    // projection round-trips it.
    const patched = await patch(studentA, response.body.id, { type: 'EXAM' }).expect(200);
    expect(patched.body).toMatchObject({
      id: response.body.id,
      priority: 'HIGH',
      type: 'EXAM',
    });
    const refetched = await detail(studentA, courseA).expect(HttpStatus.OK);
    expect(refetched.body.assignments).toContainEqual(patched.body);
  });

  it('creates without courseId or dueDate, with database defaults, but does not attach to a course', async () => {
    const before = (await detail(studentA, courseA).expect(HttpStatus.OK)).body.assignments;
    const response = await create(studentA, { title: 'Independent reading' }).expect(
      HttpStatus.CREATED
    );
    expect(Object.keys(response.body).sort()).toEqual(ASSIGNMENT_KEYS);
    expect(response.body).toMatchObject({
      dueDate: null,
      priority: 'MEDIUM',
      status: 'PENDING',
      type: null, // SP-115G (D115-2): an omitted type stores null.
    });
    expect(
      await app.prisma.assignment.findFirst({
        where: { id: response.body.id, userId: studentA.id },
      })
    ).toMatchObject({ courseId: null, dueDate: null, type: null });
    expect((await detail(studentA, courseA).expect(HttpStatus.OK)).body.assignments).toEqual(
      before
    );
  });

  it('refetches dated rows ascending with explicit-null and omitted deadlines last', async () => {
    const undated = await create(studentA, {
      title: 'A undated',
      courseId: courseA,
      dueDate: null,
    }).expect(HttpStatus.CREATED);
    const omitted = await create(studentA, {
      title: 'Z undated',
      courseId: courseA,
    }).expect(HttpStatus.CREATED);
    const earlier = await create(studentA, {
      title: 'Past deadline accepted',
      courseId: courseA,
      dueDate: '2020-01-01T00:00:00.000Z',
    }).expect(HttpStatus.CREATED);
    const response = await detail(studentA, courseA).expect(HttpStatus.OK);
    expect(response.body.assignments.map((row: { dueDate: string | null }) => row.dueDate)).toEqual(
      [earlier.body.dueDate, '2026-11-15T23:59:00.000Z', null, null]
    );
    expect(response.body.assignments.slice(-2).map((row: { id: string }) => row.id)).toEqual([
      undated.body.id,
      omitted.body.id,
    ]);
    for (const row of response.body.assignments) {
      expect(Object.keys(row).sort()).toEqual(ASSIGNMENT_KEYS);
      expect(row.status).toBe('PENDING');
    }
  });

  it.each([
    ['title', '   '],
    ['title', 'x'.repeat(201)],
    ['dueDate', 'yesterday'],
    ['estimatedHours', 0],
    ['estimatedHours', -3],
    ['estimatedHours', 100000],
    ['priority', 'SUPER'],
    ['status', 'COMPLETED'],
    ['type', 'ESSAY'],
    ['userId', 'forged-principal'],
    ['description', 'x'.repeat(2001)],
  ])('rejects %s=%p over HTTP with field errors and no write', async (field, value) => {
    const before = await app.prisma.assignment.findMany({
      where: { userId: studentA.id },
      orderBy: { id: 'asc' },
    });
    const response = await create(studentA, {
      title: 'Invalid attempt',
      courseId: courseA,
      [field]: value,
    }).expect(HttpStatus.BAD_REQUEST);
    expect(response.body.errors).toHaveProperty(field);
    expect(
      await app.prisma.assignment.findMany({
        where: { userId: studentA.id },
        orderBy: { id: 'asc' },
      })
    ).toEqual(before);
  });

  it('denies foreign, missing and malformed courses uniformly without changing either student data', async () => {
    const snapshot = () =>
      app.prisma.assignment.findMany({
        where: { userId: { in: [studentA.id, studentB.id] } },
        orderBy: { id: 'asc' },
      });
    const before = await snapshot();
    for (const courseId of [courseA, uuidv4(), 'malformed']) {
      const response = await create(studentB, { title: 'Forbidden', courseId }).expect(
        HttpStatus.NOT_FOUND
      );
      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });
    }
    expect(await snapshot()).toEqual(before);
    const foreign = await detail(studentB, courseA).expect(HttpStatus.NOT_FOUND);
    expect(foreign.body.message).toBe('Resource not found');
    // A nonempty own projection proves filtering, not merely an empty account.
    const own = await create(studentB, { title: 'B only', courseId: courseB }).expect(
      HttpStatus.CREATED
    );
    const projected = (await detail(studentB, courseB).expect(HttpStatus.OK)).body.assignments;
    expect(projected).toEqual([own.body]);
    expect(JSON.stringify(projected)).not.toContain('Problem set');
    expect(
      await app.prisma.assignment.findMany({
        where: { userId: studentA.id },
        orderBy: { id: 'asc' },
      })
    ).toEqual(before.filter((row) => row.userId === studentA.id));
  });

  it('rejects unauthenticated create before writing', async () => {
    const before = await app.prisma.assignment.count({ where: { userId: studentA.id } });
    await agent
      .post('/assignments')
      .send({ title: 'Anonymous', courseId: courseA })
      .expect(HttpStatus.UNAUTHORIZED);
    expect(await app.prisma.assignment.count({ where: { userId: studentA.id } })).toBe(before);
  });

  // ==================== Assignment edit and delete (SP-114F) ====================

  it('PATCHes editable fields, persists merged values, and refetches updated projection (AC 1)', async () => {
    const created = await create(studentA, {
      title: 'Initial title',
      courseId: courseA,
      description: 'Initial desc',
      dueDate: '2026-11-01T10:00:00.000Z',
      estimatedHours: 2,
      priority: 'LOW',
    }).expect(HttpStatus.CREATED);

    const updatePayload = {
      title: 'Updated title',
      description: 'Updated desc',
      dueDate: '2026-12-01T15:30:00.000Z',
      estimatedHours: 4.5,
      priority: 'URGENT',
    };

    const response = await patch(studentA, created.body.id, updatePayload).expect(HttpStatus.OK);
    expect(Object.keys(response.body).sort()).toEqual(ASSIGNMENT_KEYS);
    expect(response.body).toMatchObject({
      id: created.body.id,
      title: 'Updated title',
      description: 'Updated desc',
      dueDate: '2026-12-01T15:30:00.000Z',
      estimatedHours: 4.5,
      priority: 'URGENT',
      status: 'PENDING',
      actualHours: null,
    });

    const row = await app.prisma.assignment.findFirst({
      where: { id: created.body.id, userId: studentA.id },
    });
    expect(row).toMatchObject({
      title: 'Updated title',
      description: 'Updated desc',
      dueDate: new Date('2026-12-01T15:30:00.000Z'),
      estimatedHours: 4.5,
      priority: 'URGENT',
      status: 'PENDING',
    });

    const refetched = await detail(studentA, courseA).expect(HttpStatus.OK);
    expect(refetched.body.assignments).toContainEqual(response.body);
  });

  it('DELETEs assignment (204), updates projection, and orphans child task with assignmentId null (AC 2, D114-4)', async () => {
    const created = await create(studentA, {
      title: 'To be deleted',
      courseId: courseA,
    }).expect(HttpStatus.CREATED);

    const task = await app.prisma.task.create({
      data: {
        userId: studentA.id,
        assignmentId: created.body.id,
        title: 'Surviving task',
      },
    });

    const response = await del(studentA, created.body.id).expect(HttpStatus.NO_CONTENT);
    expect(response.text).toBe('');

    expect(
      await app.prisma.assignment.findFirst({
        where: ownedWhere(studentA.id, created.body.id),
      })
    ).toBeNull();

    const refetched = await detail(studentA, courseA).expect(HttpStatus.OK);
    expect(refetched.body.assignments.map((a: { id: string }) => a.id)).not.toContain(
      created.body.id
    );

    const survivingTask = await app.prisma.task.findFirst({
      where: ownedWhere(studentA.id, task.id),
    });
    expect(survivingTask).toMatchObject({
      id: task.id,
      userId: studentA.id,
      assignmentId: null,
      title: 'Surviving task',
    });
  });

  it('enforces student ownership: foreign, missing and malformed PATCH/DELETE share 404 without writes (AC 3)', async () => {
    const created = await create(studentA, {
      title: 'Student A private assignment',
      courseId: courseA,
      description: 'Private',
    }).expect(HttpStatus.CREATED);

    const beforeA = await app.prisma.assignment.findFirst({
      where: { id: created.body.id, userId: studentA.id },
    });
    const beforeBCount = await app.prisma.assignment.count({ where: { userId: studentB.id } });

    for (const targetId of [created.body.id, uuidv4(), 'malformed-id']) {
      const patchRes = await patch(studentB, targetId, { title: 'B hijacked' }).expect(
        HttpStatus.NOT_FOUND
      );
      expect(patchRes.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });

      const delRes = await del(studentB, targetId).expect(HttpStatus.NOT_FOUND);
      expect(delRes.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });
    }

    expect(
      await app.prisma.assignment.findFirst({ where: { id: created.body.id, userId: studentA.id } })
    ).toEqual(beforeA);
    expect(await app.prisma.assignment.count({ where: { userId: studentB.id } })).toBe(
      beforeBCount
    );

    const refetchedA = await detail(studentA, courseA).expect(HttpStatus.OK);
    expect(refetchedA.body.assignments).toContainEqual(created.body);
  });

  it.each([
    ['title', '   '],
    ['title', 'x'.repeat(201)],
    ['dueDate', 'invalid-date'],
    ['dueDate', '2026-02-30T12:00:00Z'],
    ['estimatedHours', 0],
    ['estimatedHours', -2],
    ['estimatedHours', 1001],
    ['estimatedHours', 'five'],
    ['priority', 'INVALID_PRIORITY'],
    ['type', 'ESSAY'], // SP-115G: invalid enum on the patch path.
    ['type', 1],
    ['type', ''],
    ['description', 'x'.repeat(2001)],
    ['status', 'COMPLETED'],
    ['actualHours', 10],
    ['courseId', '00000000-0000-0000-0000-000000000000'],
    ['userId', '00000000-0000-0000-0000-000000000001'],
  ])(
    'rejects invalid edit %s=%p over HTTP with field errors and no write (AC 4)',
    async (field, value) => {
      const created = await create(studentA, {
        title: 'Target for validation',
        courseId: courseA,
      }).expect(HttpStatus.CREATED);

      const before = await app.prisma.assignment.findFirst({
        where: { id: created.body.id, userId: studentA.id },
      });

      const response = await patch(studentA, created.body.id, { [field]: value }).expect(
        HttpStatus.BAD_REQUEST
      );
      expect(response.body.errors).toHaveProperty(field);

      const after = await app.prisma.assignment.findFirst({
        where: { id: created.body.id, userId: studentA.id },
      });
      expect(after).toEqual(before);
    }
  );

  it('enforces PATCH null semantics: explicit null keeps stored values, empty string clears description, empty/all-null body returns 400 (AC 5, D114-5, D115-3)', async () => {
    const created = await create(studentA, {
      title: 'Null semantics target',
      courseId: courseA,
      description: 'Initial description',
      dueDate: '2026-11-20T10:00:00.000Z',
      estimatedHours: 3,
      priority: 'HIGH',
      type: 'PAPER',
    }).expect(HttpStatus.CREATED);

    // Empty body -> 400
    const emptyRes = await patch(studentA, created.body.id, {}).expect(HttpStatus.BAD_REQUEST);
    expect(emptyRes.body.message).toBe('At least one field must be provided');

    // All-null body -> 400 (a null type is not a write either)
    const allNullRes = await patch(studentA, created.body.id, {
      dueDate: null,
      estimatedHours: null,
      priority: null,
      type: null,
    }).expect(HttpStatus.BAD_REQUEST);
    expect(allNullRes.body.message).toBe('At least one field must be provided');

    // Explicit null keeps stored values — `type: null` keeps `PAPER` (D115-3)
    const partialWithNulls = await patch(studentA, created.body.id, {
      title: 'New title with nulls',
      dueDate: null,
      estimatedHours: null,
      priority: null,
      type: null,
    }).expect(HttpStatus.OK);

    expect(partialWithNulls.body).toMatchObject({
      title: 'New title with nulls',
      description: 'Initial description',
      dueDate: '2026-11-20T10:00:00.000Z',
      estimatedHours: 3,
      priority: 'HIGH',
      type: 'PAPER',
    });

    // Empty string clears description
    const clearedDesc = await patch(studentA, created.body.id, {
      description: '',
    }).expect(HttpStatus.OK);
    expect(clearedDesc.body.description).toBe('');

    const row = await app.prisma.assignment.findFirst({
      where: { id: created.body.id, userId: studentA.id },
    });
    expect(row).toMatchObject({
      title: 'New title with nulls',
      description: '',
      dueDate: new Date('2026-11-20T10:00:00.000Z'),
      estimatedHours: 3,
      priority: 'HIGH',
      type: 'PAPER',
    });
  });

  it('rejects unauthenticated PATCH and DELETE before writing', async () => {
    await agent
      .patch('/assignments/00000000-0000-0000-0000-000000000000')
      .send({ title: 'Unauthenticated edit' })
      .expect(HttpStatus.UNAUTHORIZED);

    await agent
      .delete('/assignments/00000000-0000-0000-0000-000000000000')
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
