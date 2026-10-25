import { v4 as uuid } from 'uuid';
import { ownedWhere } from '../../common/ownership/ownership';
import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;
const KEYS = [
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

describeIntegration('Assignment create data scoping (SP-113A, real HTTP/Postgres)', () => {
  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  const students: { id: string; token: string; courseId: string }[] = [];
  const runId = uuid();

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());
    for (const label of ['a', 'b']) {
      const email = `${label}.${runId}@studypilot-test.invalid`;
      const password = `S3cure-${runId}`;
      await agent
        .post('/auth/register')
        .send({ name: `Student ${label}`, email, password })
        .expect(201);
      const login = await agent.post('/auth/login').send({ email, password }).expect(200);
      const student = { id: login.body.user.id, token: login.body.accessToken, courseId: '' };
      students.push(student);
      const course = await agent
        .post('/courses')
        .set('Authorization', `Bearer ${student.token}`)
        .send({ code: label, name: `Course ${label}` })
        .expect(201);
      student.courseId = course.body.id;
    }
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    await app.prisma.user.deleteMany({ where: { id: { in: students.map((s) => s.id) } } });
    await app.app.close();
  });

  const post = (index: number, body: Record<string, unknown>) =>
    agent.post('/assignments').set('Authorization', `Bearer ${students[index].token}`).send(body);
  const patch = (index: number, id: string, body: Record<string, unknown>) =>
    agent
      .patch(`/assignments/${id}`)
      .set('Authorization', `Bearer ${students[index].token}`)
      .send(body);
  const del = (index: number, id: string) =>
    agent.delete(`/assignments/${id}`).set('Authorization', `Bearer ${students[index].token}`);
  const detail = (index: number, courseId = students[index].courseId) =>
    agent.get(`/courses/${courseId}`).set('Authorization', `Bearer ${students[index].token}`);

  it('creates all optional fields with own course and persists only principal ownership', async () => {
    const body = {
      title: '  Essay  ',
      courseId: students[0].courseId,
      dueDate: '2020-01-01T12:00:00+02:00',
      estimatedHours: 2.5,
      priority: 'HIGH',
      type: 'QUIZ', // SP-115G: a valid type on create stores and returns it.
      description: 'Outline',
    };
    const created = await post(0, body).expect(201);
    expect(Object.keys(created.body).sort()).toEqual(KEYS);
    expect(created.body).toMatchObject({
      title: 'Essay',
      dueDate: '2020-01-01T10:00:00.000Z',
      estimatedHours: 2.5,
      priority: 'HIGH',
      type: 'QUIZ',
      description: 'Outline',
      actualHours: null,
      status: 'PENDING',
    });
    expect(Number.isNaN(Date.parse(created.body.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(created.body.updatedAt))).toBe(false);
    const row = await app.prisma.assignment.findFirst({
      where: { id: created.body.id, userId: students[0].id },
    });
    expect(row).toMatchObject({ userId: students[0].id, courseId: students[0].courseId });
    const projection = await detail(0).expect(200);
    expect(projection.body.assignments).toContainEqual(created.body);
  });

  it.each([undefined, null])(
    'courseId=%p creates course-less with nullable/default fields',
    async (courseId) => {
      const created = await post(0, { title: 'No course', courseId, dueDate: null }).expect(201);
      expect(Object.keys(created.body).sort()).toEqual(KEYS);
      expect(created.body).toMatchObject({
        dueDate: null,
        estimatedHours: null,
        actualHours: null,
        description: null,
        status: 'PENDING',
        priority: 'MEDIUM',
      });
      expect(
        await app.prisma.assignment.findFirst({
          where: { id: created.body.id, userId: students[0].id },
        })
      ).toMatchObject({ courseId: null, dueDate: null, type: null });
    }
  );

  it('an omitted type stores null (D115-2) and an omitted/null patch keeps it', async () => {
    const created = await post(0, { title: 'Untitled kind' }).expect(201);
    expect(created.body).toMatchObject({ title: 'Untitled kind', type: null, status: 'PENDING' });
    // D115-3: omit keeps, null keeps — both are non-writes for `type`.
    for (const patchBody of [{ title: 'Renamed' }, { title: 'Renamed again', type: null }]) {
      const patched = await patch(0, created.body.id, patchBody).expect(200);
      expect(patched.body).toMatchObject({ type: null });
    }
    expect(
      await app.prisma.assignment.findFirst({
        where: { id: created.body.id, userId: students[0].id },
      })
    ).toMatchObject({ title: 'Renamed again', type: null });
  });

  it('a type-only patch is a non-empty body and replaces the stored type (SP-115G)', async () => {
    const created = await post(0, { title: 'Typed', type: 'HOMEWORK' }).expect(201);
    const patched = await patch(0, created.body.id, { type: 'PROJECT' }).expect(200);
    expect(patched.body).toMatchObject({ type: 'PROJECT', title: 'Typed' });
  });

  it('projects nullable deadlines safely, nulls last with title tie-break, no cross-student reads', async () => {
    const b = await post(0, { title: 'Z undated', courseId: students[0].courseId }).expect(201);
    const a = await post(0, { title: 'A undated', courseId: students[0].courseId }).expect(201);
    const projection = await detail(0).expect(200);
    expect(projection.body.assignments.slice(-2)).toEqual([a.body, b.body]);
    const other = await detail(1).expect(200);
    expect(other.body.assignments).toEqual([]);
    const forbidden = await detail(1, students[0].courseId).expect(404);
    expect(forbidden.body.message).toBe('Resource not found');
  });

  it('foreign/missing/malformed course IDs share 404, with no writes or mutations', async () => {
    const aBefore = await app.prisma.assignment.findMany({ where: { userId: students[0].id } });
    const courseBefore = await app.prisma.course.findFirst({
      where: { id: students[0].courseId, userId: students[0].id },
    });
    for (const [index, courseId] of [
      [1, students[0].courseId],
      [0, students[1].courseId],
      [1, uuid()],
      [1, 'not-an-id'],
      [1, ''],
    ] as const) {
      const response = await post(index, { title: 'Blocked', courseId }).expect(404);
      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Resource not found',
        error: 'Not Found',
      });
    }
    expect(await app.prisma.assignment.findMany({ where: { userId: students[0].id } })).toEqual(
      aBefore
    );
    expect(await app.prisma.assignment.count({ where: { userId: students[1].id } })).toBe(0);
    expect(
      await app.prisma.course.findFirst({
        where: { id: students[0].courseId, userId: students[0].id },
      })
    ).toEqual(courseBefore);
  });

  it.each<[string, unknown]>([
    ['title', undefined],
    ['title', null],
    ['title', 123],
    ['title', '  '],
    ['title', 'x'.repeat(201)],
    ['dueDate', 'yesterday'],
    ['dueDate', '2026-02-30T12:00:00Z'],
    ['dueDate', '2026-10-24'],
    ['dueDate', '2026-W01-1T12:00:00Z'],
    ['dueDate', '2026-01-01T23:59:60Z'],
    ['estimatedHours', 0],
    ['estimatedHours', -3],
    ['estimatedHours', 100000],
    ['estimatedHours', 'abc'],
    ['estimatedHours', '2'],
    ['priority', 'SUPER'],
    ['description', 'x'.repeat(2001)],
    ['description', 42],
    ['status', 'COMPLETED'],
    ['type', 'ESSAY'], // SP-115G: invalid enum → field-level 400 (no write).
    ['type', 1],
    ['userId', 'other'],
  ])('invalid/unknown %s=%p → field-level 400 without writes', async (field, value) => {
    const before = await app.prisma.assignment.count({ where: { userId: students[0].id } });
    const response = await post(0, { title: 'Essay', [field]: value }).expect(400);
    expect(response.body.errors).toHaveProperty(field);
    expect(Array.isArray(response.body.message)).toBe(true);
    expect(await app.prisma.assignment.count({ where: { userId: students[0].id } })).toBe(before);
  });

  it('unauthenticated → 401 before validation or writes', async () => {
    await agent.post('/assignments').send({ title: 'No auth' }).expect(401);
  });

  // ==================== update/delete (SP-114D) ====================

  it('PATCH updates provided fields, keeps the rest, and returns the 10-key projection', async () => {
    const created = await post(0, {
      title: 'Patchable',
      courseId: students[0].courseId,
      dueDate: '2026-11-15T23:59:00.000Z',
      estimatedHours: 1,
      priority: 'LOW',
      description: 'Original',
    }).expect(201);
    const response = await patch(0, created.body.id, {
      title: '  Patched title  ',
      dueDate: null, // explicit null keeps the stored value (D114-5)
      estimatedHours: null,
      priority: null,
    }).expect(200);
    expect(Object.keys(response.body).sort()).toEqual(KEYS);
    expect(response.body).toMatchObject({
      title: 'Patched title',
      dueDate: '2026-11-15T23:59:00.000Z',
      estimatedHours: 1,
      priority: 'LOW',
      description: 'Original',
    });
    const row = await app.prisma.assignment.findFirst({
      where: { id: created.body.id, userId: students[0].id },
    });
    expect(row).toMatchObject({
      title: 'Patched title',
      dueDate: new Date('2026-11-15T23:59:00.000Z'),
      estimatedHours: 1,
      priority: 'LOW',
      description: 'Original',
    });
    const projection = await detail(0).expect(200);
    expect(projection.body.assignments).toContainEqual(response.body);
  });

  it("PATCH '' clears the stored description; empty body and unknown fields 400 without writes", async () => {
    const created = await post(0, { title: 'Clearable', description: 'Some text' }).expect(201);
    const cleared = await patch(0, created.body.id, { description: '' }).expect(200);
    expect(cleared.body.description).toBe('');

    const empty = await patch(0, created.body.id, {}).expect(400);
    expect(empty.body.message).toBe('At least one field must be provided');

    for (const [field, value] of [
      ['status', 'COMPLETED'],
      ['actualHours', 5],
      ['courseId', students[0].courseId],
      ['userId', students[1].id],
    ] as const) {
      const response = await patch(0, created.body.id, { [field]: value }).expect(400);
      expect(response.body.errors).toHaveProperty(field);
    }

    const row = await app.prisma.assignment.findFirst({
      where: { id: created.body.id, userId: students[0].id },
    });
    expect(row).toMatchObject({ description: '', status: 'PENDING', actualHours: null });
  });

  it('student B cannot PATCH student A assignment: foreign/missing/malformed → uniform 404, row unchanged', async () => {
    const created = await post(0, { title: 'Locked', description: 'Original' }).expect(201);
    const before = await app.prisma.assignment.findFirst({
      where: ownedWhere(students[0].id, created.body.id),
    });
    for (const id of [created.body.id, uuid(), 'not-an-id']) {
      const response = await patch(1, id, {
        title: 'Hijack',
        description: 'x',
        type: 'HOMEWORK', // SP-115G: a type in the body does not bypass ownership.
      }).expect(404);
      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Resource not found',
        error: 'Not Found',
      });
    }
    expect(
      await app.prisma.assignment.findFirst({
        where: ownedWhere(students[0].id, created.body.id),
      })
    ).toEqual(before);
    expect(await app.prisma.assignment.count({ where: { userId: students[1].id } })).toBe(0);
  });

  it('student B cannot DELETE student A assignment: foreign/missing/malformed → uniform 404, row unchanged', async () => {
    const created = await post(0, { title: 'Protected' }).expect(201);
    const before = await app.prisma.assignment.findFirst({
      where: ownedWhere(students[0].id, created.body.id),
    });
    for (const id of [created.body.id, uuid(), 'not-an-id']) {
      const response = await del(1, id).expect(404);
      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Resource not found',
        error: 'Not Found',
      });
    }
    expect(
      await app.prisma.assignment.findFirst({
        where: ownedWhere(students[0].id, created.body.id),
      })
    ).toEqual(before);
  });

  it('own DELETE → 204 with no body, and the row is gone', async () => {
    const created = await post(0, { title: 'Doomed' }).expect(201);
    const response = await del(0, created.body.id).expect(204);
    expect(response.text).toBe('');
    expect(
      await app.prisma.assignment.findFirst({
        where: { id: created.body.id, userId: students[0].id },
      })
    ).toBeNull();
  });

  it('deleting an assignment orphans its tasks with assignmentId null (D114-4, real DB)', async () => {
    const created = await post(0, { title: 'Has subtasks' }).expect(201);
    // No tasks API exists yet (story 4) — seed the task directly.
    const task = await app.prisma.task.create({
      data: { userId: students[0].id, assignmentId: created.body.id, title: 'Subtask' },
    });
    await del(0, created.body.id).expect(204);
    expect(
      await app.prisma.assignment.findFirst({
        where: ownedWhere(students[0].id, created.body.id),
      })
    ).toBeNull();
    const surviving = await app.prisma.task.findFirst({
      where: ownedWhere(students[0].id, task.id),
    });
    expect(surviving).toMatchObject({
      assignmentId: null,
      userId: students[0].id,
      title: 'Subtask',
    });
  });

  it('unauthenticated PATCH/DELETE → 401 before writes', async () => {
    await agent.patch('/assignments/anything').send({ title: 'No auth' }).expect(401);
    await agent.delete('/assignments/anything').expect(401);
  });
});
