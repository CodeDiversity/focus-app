import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

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
      actualHours: null,
    });
    const row = await app.prisma.assignment.findFirst({
      where: { id: response.body.id, userId: studentA.id },
    });
    expect(row).toMatchObject({ userId: studentA.id, courseId: courseA, status: 'PENDING' });
    const refetched = await detail(studentA, courseA).expect(HttpStatus.OK);
    expect(refetched.body.assignments).toEqual([response.body]);
  });

  it('creates without courseId or dueDate, with database defaults, but does not attach to a course', async () => {
    const before = (await detail(studentA, courseA).expect(HttpStatus.OK)).body.assignments;
    const response = await create(studentA, { title: 'Independent reading' }).expect(
      HttpStatus.CREATED
    );
    expect(Object.keys(response.body).sort()).toEqual(ASSIGNMENT_KEYS);
    expect(response.body).toMatchObject({ dueDate: null, priority: 'MEDIUM', status: 'PENDING' });
    expect(
      await app.prisma.assignment.findFirst({
        where: { id: response.body.id, userId: studentA.id },
      })
    ).toMatchObject({ courseId: null, dueDate: null });
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
});
