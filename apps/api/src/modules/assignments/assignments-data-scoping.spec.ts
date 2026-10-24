import { v4 as uuid } from 'uuid';
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
  const detail = (index: number, courseId = students[index].courseId) =>
    agent.get(`/courses/${courseId}`).set('Authorization', `Bearer ${students[index].token}`);

  it('creates all optional fields with own course and persists only principal ownership', async () => {
    const body = {
      title: '  Essay  ',
      courseId: students[0].courseId,
      dueDate: '2020-01-01T12:00:00+02:00',
      estimatedHours: 2.5,
      priority: 'HIGH',
      description: 'Outline',
    };
    const created = await post(0, body).expect(201);
    expect(Object.keys(created.body).sort()).toEqual(KEYS);
    expect(created.body).toMatchObject({
      title: 'Essay',
      dueDate: '2020-01-01T10:00:00.000Z',
      estimatedHours: 2.5,
      priority: 'HIGH',
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
      ).toMatchObject({ courseId: null, dueDate: null });
    }
  );

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
    ['type', 'EXAM'],
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
});
