import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

// SP-122C: real HTTP + PostgreSQL proof of the SP-122 assignment list contract
// (filters, sort, search, ownership, validation, projection). No mocked
// services or direct seeds.
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
  'type',
  'createdAt',
  'updatedAt',
].sort();

const LIST_ITEM_KEYS = Array.from(new Set([...ASSIGNMENT_KEYS, 'course', 'subtasks'])).sort();

const SUBTASK_KEYS = ['id', 'title', 'status', 'orderIndex', 'createdAt', 'updatedAt'].sort();

const PROJECTED_ASSIGNMENT_KEYS = Array.from(new Set([...ASSIGNMENT_KEYS, 'subtasks'])).sort();

describeIntegration(
  'assignment list filters, sort, search and ownership (SP-122C, real database)',
  () => {
    interface Student {
      id: string;
      accessToken: string;
    }

    let app: IntegrationApp;
    let agent: ReturnType<IntegrationApp['request']>;
    let studentA: Student;
    let studentB: Student;
    let courseA1: string;
    let courseA2: string;
    let courseB: string;

    // Assignment ids for student A (created in beforeAll).
    let alphaId: string;
    let betaId: string;
    let gammaId: string;
    let deltaId: string;
    let bravoId: string;

    const runId = uuidv4();

    async function registerAndLogin(label: string): Promise<Student> {
      const email = `${label}.${runId}@studypilot-test.invalid`;
      const password = `S3cure-${runId}-list`;
      await agent
        .post('/auth/register')
        .send({ name: `Student ${label}`, email, password })
        .expect(HttpStatus.CREATED);
      const login = await agent.post('/auth/login').send({ email, password }).expect(HttpStatus.OK);
      expect(login.body.accessToken).toBeTruthy();
      return { id: login.body.user.id, accessToken: login.body.accessToken };
    }

    function auth(session: Student) {
      return { Authorization: `Bearer ${session.accessToken}` };
    }

    function createCourse(session: Student, code: string, name: string) {
      return agent
        .post('/courses')
        .set(auth(session))
        .send({ code, name })
        .expect(HttpStatus.CREATED);
    }

    function createAssignment(session: Student, body: Record<string, unknown>) {
      return agent.post('/assignments').set(auth(session)).send(body);
    }

    function list(session: Student, params: Record<string, unknown> = {}) {
      return agent.get('/assignments').set(auth(session)).query(params);
    }

    beforeAll(async () => {
      app = await createIntegrationApp();
      agent = app.request(app.app.getHttpAdapter().getInstance());
      studentA = await registerAndLogin('a');
      studentB = await registerAndLogin('b');

      const c1 = await createCourse(studentA, 'CSA1', 'Course A1');
      courseA1 = c1.body.id;
      const c2 = await createCourse(studentA, 'CSA2', 'Course A2');
      courseA2 = c2.body.id;
      const cb = await createCourse(studentB, 'CSB', 'Course B');
      courseB = cb.body.id;

      // Student A assignments (created in this order for createdAt ordering).
      const alpha = await createAssignment(studentA, {
        title: 'Alpha',
        courseId: courseA1,
        description: 'alpha desc',
        dueDate: '2026-12-01T10:00:00.000Z',
        priority: 'HIGH',
        type: 'HOMEWORK',
      }).expect(HttpStatus.CREATED);
      alphaId = alpha.body.id;

      const beta = await createAssignment(studentA, {
        title: 'Beta',
        courseId: courseA1,
        description: 'needle in haystack',
        dueDate: '2026-11-01T10:00:00.000Z',
        priority: 'LOW',
        type: 'PAPER',
      }).expect(HttpStatus.CREATED);
      betaId = beta.body.id;
      await agent
        .patch(`/assignments/${betaId}`)
        .set(auth(studentA))
        .send({ status: 'COMPLETED' })
        .expect(HttpStatus.OK);

      const gamma = await createAssignment(studentA, {
        title: 'Gamma',
        courseId: courseA2,
        description: 'gamma desc',
        priority: 'URGENT',
        type: 'PROJECT',
      }).expect(HttpStatus.CREATED);
      gammaId = gamma.body.id;
      await agent
        .patch(`/assignments/${gammaId}`)
        .set(auth(studentA))
        .send({ status: 'IN_PROGRESS' })
        .expect(HttpStatus.OK);

      const delta = await createAssignment(studentA, {
        title: 'Delta',
        description: 'delta desc',
        dueDate: '2026-10-15T10:00:00.000Z',
        priority: 'MEDIUM',
      }).expect(HttpStatus.CREATED);
      deltaId = delta.body.id;

      // Subtask on Alpha for projection proof.
      await agent
        .post(`/assignments/${alphaId}/subtasks`)
        .set(auth(studentA))
        .send({ title: 'Alpha subtask' })
        .expect(HttpStatus.CREATED);

      // Student B assignment.
      const bravo = await createAssignment(studentB, {
        title: 'Bravo',
        courseId: courseB,
        dueDate: '2026-11-15T10:00:00.000Z',
        priority: 'MEDIUM',
        type: 'QUIZ',
      }).expect(HttpStatus.CREATED);
      bravoId = bravo.body.id;
    }, 180_000);

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

    // ---------------- Projection ----------------

    it('returns every item with the contract key set; course + subtasks shapes match', async () => {
      const response = await list(studentA).expect(HttpStatus.OK);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(4);
      for (const item of response.body) {
        expect(Object.keys(item).sort()).toEqual(LIST_ITEM_KEYS);
        if (item.course !== null) {
          expect(Object.keys(item.course).sort()).toEqual(['code', 'color', 'id', 'name']);
        }
        expect(Array.isArray(item.subtasks)).toBe(true);
        for (const sub of item.subtasks) {
          expect(Object.keys(sub).sort()).toEqual(SUBTASK_KEYS);
        }
      }
      const alpha = response.body.find((r: { id: string }) => r.id === alphaId);
      expect(alpha.course).toMatchObject({ id: courseA1, name: 'Course A1', code: 'CSA1' });
      expect(alpha.subtasks).toHaveLength(1);
      expect(alpha.subtasks[0]).toMatchObject({ title: 'Alpha subtask', status: 'PENDING' });

      const delta = response.body.find((r: { id: string }) => r.id === deltaId);
      expect(delta.course).toBeNull();
    });

    // ---------------- Default ordering ----------------

    it('default order is dueDate asc (nulls last), then title asc, then id asc', async () => {
      const response = await list(studentA).expect(HttpStatus.OK);
      expect(response.body.map((r: { id: string }) => r.id)).toEqual([
        deltaId,
        betaId,
        alphaId,
        gammaId,
      ]);
    });

    // ---------------- Filter matrix ----------------

    it('filters by courseId', async () => {
      const response = await list(studentA, { courseId: courseA1 }).expect(HttpStatus.OK);
      expect(response.body.map((r: { id: string }) => r.id).sort()).toEqual(
        [alphaId, betaId].sort()
      );
    });

    it('filters by status', async () => {
      const response = await list(studentA, { status: 'PENDING' }).expect(HttpStatus.OK);
      expect(response.body.map((r: { id: string }) => r.id).sort()).toEqual(
        [alphaId, deltaId].sort()
      );
    });

    it('filters by priority', async () => {
      const response = await list(studentA, { priority: 'HIGH' }).expect(HttpStatus.OK);
      expect(response.body.map((r: { id: string }) => r.id)).toEqual([alphaId]);
    });

    it('filters by type', async () => {
      const response = await list(studentA, { type: 'PAPER' }).expect(HttpStatus.OK);
      expect(response.body.map((r: { id: string }) => r.id)).toEqual([betaId]);
    });

    it('filters by dueFrom/dueTo inclusive bounds and excludes null dueDate', async () => {
      const response = await list(studentA, {
        dueFrom: '2026-11-01T00:00:00.000Z',
        dueTo: '2026-12-31T23:59:59.000Z',
      }).expect(HttpStatus.OK);
      // Beta (11-01), Alpha (12-01); Delta (10-15) excluded; Gamma (null) excluded.
      expect(response.body.map((r: { id: string }) => r.id).sort()).toEqual(
        [alphaId, betaId].sort()
      );
    });

    it('searches q case-insensitively on title and description', async () => {
      const byTitle = await list(studentA, { q: 'ALPHA' }).expect(HttpStatus.OK);
      expect(byTitle.body.map((r: { id: string }) => r.id)).toEqual([alphaId]);

      const byDesc = await list(studentA, { q: 'needle' }).expect(HttpStatus.OK);
      expect(byDesc.body.map((r: { id: string }) => r.id)).toEqual([betaId]);

      const byDescUpper = await list(studentA, { q: 'NEEDLE' }).expect(HttpStatus.OK);
      expect(byDescUpper.body.map((r: { id: string }) => r.id)).toEqual([betaId]);
    });

    it('treats whitespace-only q as absent', async () => {
      const all = await list(studentA).expect(HttpStatus.OK);
      const ws = await list(studentA, { q: '   ' }).expect(HttpStatus.OK);
      expect(ws.body.map((r: { id: string }) => r.id)).toEqual(
        all.body.map((r: { id: string }) => r.id)
      );
    });

    it('combines filters with AND semantics', async () => {
      const response = await list(studentA, {
        courseId: courseA1,
        status: 'PENDING',
        priority: 'HIGH',
        type: 'HOMEWORK',
        dueFrom: '2026-11-30T00:00:00.000Z',
        dueTo: '2026-12-31T23:59:59.000Z',
        q: 'alpha',
      }).expect(HttpStatus.OK);
      expect(response.body.map((r: { id: string }) => r.id)).toEqual([alphaId]);
    });

    it('returns [] with 200 for an empty match', async () => {
      const response = await list(studentA, { q: 'no-such-assignment-zzz' }).expect(HttpStatus.OK);
      expect(response.body).toEqual([]);
    });

    // ---------------- Sort matrix ----------------

    it('sorts by dueDate asc (nulls last)', async () => {
      const response = await list(studentA, { sort: 'dueDate', order: 'asc' }).expect(
        HttpStatus.OK
      );
      expect(response.body.map((r: { id: string }) => r.id)).toEqual([
        deltaId,
        betaId,
        alphaId,
        gammaId,
      ]);
    });

    it('sorts by dueDate desc', async () => {
      const response = await list(studentA, { sort: 'dueDate', order: 'desc' }).expect(
        HttpStatus.OK
      );
      // Postgres default for desc is nulls first.
      expect(response.body.map((r: { id: string }) => r.id)).toEqual([
        gammaId,
        alphaId,
        betaId,
        deltaId,
      ]);
    });

    it('sorts by title asc/desc', async () => {
      const asc = await list(studentA, { sort: 'title', order: 'asc' }).expect(HttpStatus.OK);
      expect(asc.body.map((r: { id: string }) => r.id)).toEqual([
        alphaId,
        betaId,
        deltaId,
        gammaId,
      ]);
      const desc = await list(studentA, { sort: 'title', order: 'desc' }).expect(HttpStatus.OK);
      expect(desc.body.map((r: { id: string }) => r.id)).toEqual([
        gammaId,
        deltaId,
        betaId,
        alphaId,
      ]);
    });

    it('sorts by priority asc/desc (enum string)', async () => {
      const asc = await list(studentA, { sort: 'priority', order: 'asc' }).expect(HttpStatus.OK);
      // Enum ordinal order (LOW, MEDIUM, HIGH, URGENT) — see F122C-1.
      expect(asc.body.map((r: { id: string }) => r.id)).toEqual([
        betaId,
        deltaId,
        alphaId,
        gammaId,
      ]);
      const desc = await list(studentA, { sort: 'priority', order: 'desc' }).expect(HttpStatus.OK);
      expect(desc.body.map((r: { id: string }) => r.id)).toEqual([
        gammaId,
        alphaId,
        deltaId,
        betaId,
      ]);
    });

    it('sorts by status asc/desc (enum string, title tie-break)', async () => {
      const asc = await list(studentA, { sort: 'status', order: 'asc' }).expect(HttpStatus.OK);
      // Enum ordinal order (PENDING, IN_PROGRESS, COMPLETED, SUBMITTED, GRADED) — see F122C-1.
      expect(asc.body.map((r: { id: string }) => r.id)).toEqual([
        alphaId,
        deltaId,
        gammaId,
        betaId,
      ]);
      const desc = await list(studentA, { sort: 'status', order: 'desc' }).expect(HttpStatus.OK);
      expect(desc.body.map((r: { id: string }) => r.id)).toEqual([
        betaId,
        gammaId,
        alphaId,
        deltaId,
      ]);
    });

    it('sorts by createdAt asc/desc (monotonic)', async () => {
      const asc = await list(studentA, { sort: 'createdAt', order: 'asc' }).expect(HttpStatus.OK);
      const ascTimes = asc.body.map((r: { createdAt: string }) => new Date(r.createdAt).getTime());
      expect(ascTimes).toEqual([...ascTimes].sort((a, b) => a - b));

      const desc = await list(studentA, { sort: 'createdAt', order: 'desc' }).expect(HttpStatus.OK);
      const descTimes = desc.body.map((r: { createdAt: string }) =>
        new Date(r.createdAt).getTime()
      );
      expect(descTimes).toEqual([...descTimes].sort((a, b) => b - a));
    });

    it('sorts by updatedAt asc/desc (monotonic)', async () => {
      const asc = await list(studentA, { sort: 'updatedAt', order: 'asc' }).expect(HttpStatus.OK);
      const ascTimes = asc.body.map((r: { updatedAt: string }) => new Date(r.updatedAt).getTime());
      expect(ascTimes).toEqual([...ascTimes].sort((a, b) => a - b));

      const desc = await list(studentA, { sort: 'updatedAt', order: 'desc' }).expect(HttpStatus.OK);
      const descTimes = desc.body.map((r: { updatedAt: string }) =>
        new Date(r.updatedAt).getTime()
      );
      expect(descTimes).toEqual([...descTimes].sort((a, b) => b - a));
    });

    // ---------------- Ownership ----------------

    it('student B list never contains A rows', async () => {
      const response = await list(studentB).expect(HttpStatus.OK);
      expect(response.body.map((r: { id: string }) => r.id)).toEqual([bravoId]);
      const titles = response.body.map((r: { title: string }) => r.title);
      expect(titles).not.toContain('Alpha');
      expect(JSON.stringify(response.body)).not.toContain(alphaId);
    });

    it('student B filtering by A courseId returns uniform 404 and leaves B data unchanged', async () => {
      const beforeCount = await app.prisma.assignment.count({ where: { userId: studentB.id } });
      const response = await list(studentB, { courseId: courseA1 }).expect(HttpStatus.NOT_FOUND);
      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });
      expect(await app.prisma.assignment.count({ where: { userId: studentB.id } })).toBe(
        beforeCount
      );

      // A's data also unchanged.
      const aCount = await app.prisma.assignment.count({ where: { userId: studentA.id } });
      expect(aCount).toBe(4);
    });

    // ---------------- Validation ----------------

    it('rejects invalid enum/date/sort/order/q length and unknown params with 400', async () => {
      const cases: Array<Record<string, unknown>> = [
        { status: 'NOPE' },
        { priority: 'SUPER' },
        { type: 'ESSAY' },
        { dueFrom: 'not-a-date' },
        { dueTo: '2026-02-30T12:00:00Z' },
        { sort: 'userId' },
        { order: 'sideways' },
        { q: 'x'.repeat(201) },
        { foo: 'bar' },
        { userId: 'forged' },
      ];
      for (const params of cases) {
        const response = await list(studentA, params).expect(HttpStatus.BAD_REQUEST);
        expect(response.body.errors).toBeTruthy();
      }
    });

    it('rejects unauthenticated list with 401', async () => {
      await agent.get('/assignments').expect(HttpStatus.UNAUTHORIZED);
    });

    // ---------------- No regression smoke ----------------

    it('POST/PATCH/DELETE/subtasks and course projection still behave', async () => {
      const created = await createAssignment(studentA, {
        title: 'Regression target',
        courseId: courseA1,
      }).expect(HttpStatus.CREATED);
      expect(Object.keys(created.body).sort()).toEqual(ASSIGNMENT_KEYS);

      const patched = await agent
        .patch(`/assignments/${created.body.id}`)
        .set(auth(studentA))
        .send({ status: 'IN_PROGRESS' })
        .expect(HttpStatus.OK);
      expect(patched.body).toMatchObject({ id: created.body.id, status: 'IN_PROGRESS' });

      const sub = await agent
        .post(`/assignments/${created.body.id}/subtasks`)
        .set(auth(studentA))
        .send({ title: 'reg sub' })
        .expect(HttpStatus.CREATED);
      expect(Object.keys(sub.body).sort()).toEqual(SUBTASK_KEYS);

      const subs = await agent
        .get(`/assignments/${created.body.id}/subtasks`)
        .set(auth(studentA))
        .expect(HttpStatus.OK);
      expect(subs.body).toHaveLength(1);

      await agent
        .delete(`/assignments/${created.body.id}`)
        .set(auth(studentA))
        .expect(HttpStatus.NO_CONTENT);

      // Course detail projection shape unchanged.
      const detail = await agent
        .get(`/courses/${courseA1}`)
        .set(auth(studentA))
        .expect(HttpStatus.OK);
      expect(Array.isArray(detail.body.assignments)).toBe(true);
      for (const row of detail.body.assignments) {
        expect(Object.keys(row).sort()).toEqual(PROJECTED_ASSIGNMENT_KEYS);
      }
    });
  }
);
