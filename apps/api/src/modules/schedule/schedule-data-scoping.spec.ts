import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * EP15B data-scoping spec (EP15B-AC5, V-15-4, DoD-3): who can never touch
 * whose rows on the `/schedule/*` surface, over real HTTP against a real
 * database.
 *
 * - Two-student matrix — B's PATCH / DELETE / DELETE ?from= / occurrence
 *   cancel on A's block id → the uniform 404 `Resource not found`; A's
 *   blocks and exceptions byte-identical before and after; B's list never
 *   contains A's rows.
 * - B's STUDY block tied to A's course → uniform 404, nothing written; B
 *   cannot re-point an own block to A's course either.
 * - Day bounds are per student: A's PUT never shows in B's GET.
 * - Malformed / unknown ids → the same uniform 404 (plain `:id`).
 *
 * Self-skips when `DATABASE_URL` is unset.
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('Schedule data scoping (integration, real database, EP15B)', () => {
  const runId = uuidv4().slice(0, 8);
  const password = `S3cure-${runId}-schedule`;

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  let studentA: Student;
  let studentB: Student;
  let aCourseId: string;
  let aWeeklyId: string;
  let aOneOffId: string;
  let bBlockId: string;

  interface Student {
    id: string;
    accessToken: string;
  }

  const auth = (s: Student) => ({ Authorization: `Bearer ${s.accessToken}` });

  async function registerAndLogin(label: string): Promise<Student> {
    const email = `${label}.${runId}@studypilot-test.invalid`;
    await agent
      .post('/auth/register')
      .send({ name: `Student ${label}`, email, password })
      .expect(HttpStatus.CREATED);
    const login = await agent.post('/auth/login').send({ email, password }).expect(HttpStatus.OK);
    return { id: login.body.user.id, accessToken: login.body.accessToken };
  }

  /** A's rows as stored — the before/after fingerprint. */
  async function snapshotA() {
    const blocks = await app.prisma.scheduleBlock.findMany({
      where: { userId: studentA.id },
      orderBy: { id: 'asc' },
      include: { exceptions: { orderBy: { date: 'asc' } } },
    });
    const bounds = await app.prisma.dayBounds.findMany({
      where: { userId: studentA.id },
      orderBy: { dayOfWeek: 'asc' },
    });
    return JSON.stringify({ blocks, bounds });
  }

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());
    studentA = await registerAndLogin('scope-a');
    studentB = await registerAndLogin('scope-b');

    const course = await agent
      .post('/courses')
      .set(auth(studentA))
      .send({ code: `SCP${runId.slice(0, 4)}`, name: 'Scoping 101' })
      .expect(HttpStatus.CREATED);
    aCourseId = course.body.id;

    const weekly = await agent
      .post('/schedule/blocks')
      .set(auth(studentA))
      .send({
        kind: 'STUDY',
        courseId: aCourseId,
        startDate: '2026-11-16',
        weekdays: [1, 3],
        startTime: '09:00',
        endTime: '10:00',
      })
      .expect(HttpStatus.CREATED);
    aWeeklyId = weekly.body.id;
    await agent
      .delete(`/schedule/blocks/${aWeeklyId}/occurrences/2026-11-18`)
      .set(auth(studentA))
      .expect(HttpStatus.NO_CONTENT);

    const oneOff = await agent
      .post('/schedule/blocks')
      .set(auth(studentA))
      .send({ kind: 'BUSY', startDate: '2026-11-20', startTime: '13:00', endTime: '14:00' })
      .expect(HttpStatus.CREATED);
    aOneOffId = oneOff.body.id;

    await agent
      .put('/schedule/day-bounds')
      .set(auth(studentA))
      .send({
        days: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          dayOfWeek,
          wakeTime: '06:00',
          sleepTime: '22:00',
        })),
      })
      .expect(HttpStatus.OK);

    const b = await agent
      .post('/schedule/blocks')
      .set(auth(studentB))
      .send({
        kind: 'STUDY',
        startDate: '2026-11-16',
        weekdays: [2],
        startTime: '09:00',
        endTime: '10:00',
      })
      .expect(HttpStatus.CREATED);
    bBlockId = b.body.id;
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    await app.prisma.user.deleteMany({
      where: { id: { in: [studentA?.id, studentB?.id].filter(Boolean) as string[] } },
    });
    await app.app.close();
  }, 60_000);

  it('B’s list holds only B’s block; A’s list holds only A’s', async () => {
    const b = await agent.get('/schedule/blocks').set(auth(studentB)).expect(HttpStatus.OK);
    expect(b.body.map((x: { id: string }) => x.id)).toEqual([bBlockId]);
    const a = await agent.get('/schedule/blocks').set(auth(studentA)).expect(HttpStatus.OK);
    expect(a.body.map((x: { id: string }) => x.id).sort()).toEqual([aWeeklyId, aOneOffId].sort());
  });

  it('B’s PATCH on A’s blocks (in place and split) → uniform 404, A unchanged', async () => {
    const before = await snapshotA();
    for (const [id, body] of [
      [aWeeklyId, { title: 'Hijack' }],
      [aWeeklyId, { effectiveFrom: '2026-11-23', startTime: '07:00' }],
      [aWeeklyId, { weekdays: null, endDate: null, effectiveFrom: '2026-11-23' }],
      [aOneOffId, { title: 'Hijack' }],
    ] as [string, Record<string, unknown>][]) {
      const res = await agent
        .patch(`/schedule/blocks/${id}`)
        .set(auth(studentB))
        .send(body)
        .expect(HttpStatus.NOT_FOUND);
      expect(res.body.message).toBe('Resource not found');
    }
    expect(await snapshotA()).toBe(before);
  });

  it('B’s DELETE, DELETE ?from= and occurrence cancel on A’s blocks → uniform 404, A unchanged', async () => {
    const before = await snapshotA();
    const paths = [
      `/schedule/blocks/${aWeeklyId}`,
      `/schedule/blocks/${aWeeklyId}?from=2026-11-23`,
      `/schedule/blocks/${aWeeklyId}/occurrences/2026-11-23`,
      `/schedule/blocks/${aOneOffId}`,
      `/schedule/blocks/${aOneOffId}/occurrences/2026-11-20`,
    ];
    for (const path of paths) {
      const res = await agent.delete(path).set(auth(studentB)).expect(HttpStatus.NOT_FOUND);
      expect(res.body.message).toBe('Resource not found');
    }
    expect(await snapshotA()).toBe(before);
    expect(await app.prisma.scheduleBlockException.count({ where: { blockId: aWeeklyId } })).toBe(
      1
    );
  });

  // EP15K (D-K2): B restoring A's cancelled occurrence is the same uniform 404.
  it('B’s occurrence restore on A’s blocks → uniform 404, A’s exception survives', async () => {
    const before = await snapshotA();
    for (const path of [
      `/schedule/blocks/${aWeeklyId}/occurrences/2026-11-18`,
      `/schedule/blocks/${aOneOffId}/occurrences/2026-11-20`,
    ]) {
      const res = await agent.put(path).set(auth(studentB)).expect(HttpStatus.NOT_FOUND);
      expect(res.body.message).toBe('Resource not found');
    }
    expect(await snapshotA()).toBe(before);
    expect(await app.prisma.scheduleBlockException.count({ where: { blockId: aWeeklyId } })).toBe(
      1
    );
  });

  it('B cannot tie a block to A’s course on create or on patch → uniform 404, nothing written', async () => {
    const before = await app.prisma.scheduleBlock.count({ where: { userId: studentB.id } });
    const create = await agent
      .post('/schedule/blocks')
      .set(auth(studentB))
      .send({
        kind: 'STUDY',
        courseId: aCourseId,
        startDate: '2026-11-16',
        startTime: '09:00',
        endTime: '10:00',
      })
      .expect(HttpStatus.NOT_FOUND);
    expect(create.body.message).toBe('Resource not found');
    expect(await app.prisma.scheduleBlock.count({ where: { userId: studentB.id } })).toBe(before);

    const patch = await agent
      .patch(`/schedule/blocks/${bBlockId}`)
      .set(auth(studentB))
      .send({ courseId: aCourseId })
      .expect(HttpStatus.NOT_FOUND);
    expect(patch.body.message).toBe('Resource not found');
    const own = await app.prisma.scheduleBlock.findUnique({ where: { id: bBlockId } });
    expect(own?.courseId).toBeNull();
  });

  it('day bounds are per student: A’s PUT never shows in B’s GET', async () => {
    const b = await agent.get('/schedule/day-bounds').set(auth(studentB)).expect(HttpStatus.OK);
    expect(b.body.configured).toBe(false);
    expect(b.body.days.every((d: { wakeTime: string }) => d.wakeTime === '08:00')).toBe(true);
    const a = await agent.get('/schedule/day-bounds').set(auth(studentA)).expect(HttpStatus.OK);
    expect(a.body.configured).toBe(true);
    expect(a.body.days.every((d: { wakeTime: string }) => d.wakeTime === '06:00')).toBe(true);
  });

  it('malformed and unknown ids → the same uniform 404 on every id route', async () => {
    for (const id of ['not-a-uuid', uuidv4(), '../blocks']) {
      const encoded = encodeURIComponent(id);
      for (const call of [
        () => agent.patch(`/schedule/blocks/${encoded}`).set(auth(studentA)).send({ title: 'x' }),
        () => agent.delete(`/schedule/blocks/${encoded}`).set(auth(studentA)),
        () => agent.delete(`/schedule/blocks/${encoded}?from=2026-11-23`).set(auth(studentA)),
        () =>
          agent.delete(`/schedule/blocks/${encoded}/occurrences/2026-11-23`).set(auth(studentA)),
        () => agent.put(`/schedule/blocks/${encoded}/occurrences/2026-11-23`).set(auth(studentA)),
      ]) {
        const res = await call().expect(HttpStatus.NOT_FOUND);
        expect(res.body.message).toBe('Resource not found');
      }
    }
  });

  it('a userId body field is a field-level 400 on POST and PATCH (strict pipe), nothing written', async () => {
    const before = await snapshotA();
    const post = await agent
      .post('/schedule/blocks')
      .set(auth(studentA))
      .send({
        kind: 'BUSY',
        userId: studentB.id,
        startDate: '2026-11-20',
        startTime: '13:00',
        endTime: '14:00',
      })
      .expect(HttpStatus.BAD_REQUEST);
    expect(post.body.errors.userId).toBeDefined();
    const patch = await agent
      .patch(`/schedule/blocks/${aOneOffId}`)
      .set(auth(studentA))
      .send({ userId: studentB.id })
      .expect(HttpStatus.BAD_REQUEST);
    expect(patch.body.errors.userId).toBeDefined();
    expect(await snapshotA()).toBe(before);
  });
});
