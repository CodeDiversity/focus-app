import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

/**
 * EP15B e2e spec (TR-E15-02): the schedule surface as a student journey
 * over real HTTP against a real database (`test-http` harness, `main.ts`
 * parity) — day bounds (EP15B-AC1), blocks create/list (EP15B-AC2), the
 * in-place-or-split PATCH (EP15B-AC3), delete-from and occurrence cancel
 * (EP15B-AC4), plus the validation matrix over HTTP (DoD-2/4). The
 * `schedule-data-scoping.spec.ts` sibling owns the ownership matrix
 * (EP15B-AC5, V-15-4).
 *
 * Self-skips when `DATABASE_URL` is unset.
 */
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/** The exact `ScheduleBlock` contract keys (contracts.md § API). */
const BLOCK_KEYS = [
  'courseId',
  'createdAt',
  'endDate',
  'endTime',
  'energy',
  'id',
  'kind',
  'startDate',
  'startTime',
  'title',
  'updatedAt',
  'weekdays',
].sort();

const DEFAULT_DAYS = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  wakeTime: '08:00',
  sleepTime: '23:00',
}));

const sevenDays = (wakeTime = '07:00', sleepTime = '22:30') =>
  [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, wakeTime, sleepTime }));

describeIntegration('schedule end-to-end (real database, EP15B)', () => {
  const runId = uuidv4().slice(0, 8);
  const password = `S3cure-${runId}-schedule-e2e`;

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  let token: string;
  let userId: string;
  let courseId: string;

  const auth = () => ({ Authorization: `Bearer ${token}` });
  const get = (path: string) => agent.get(path).set(auth());
  const post = (path: string, body: object) => agent.post(path).set(auth()).send(body);
  const put = (path: string, body: object) => agent.put(path).set(auth()).send(body);
  const patch = (path: string, body: object) => agent.patch(path).set(auth()).send(body);
  const del = (path: string) => agent.delete(path).set(auth());

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());
    const email = `schedule.${runId}@studypilot-test.invalid`;
    await agent
      .post('/auth/register')
      .send({ name: 'Schedule Student', email, password })
      .expect(HttpStatus.CREATED);
    const login = await agent.post('/auth/login').send({ email, password }).expect(HttpStatus.OK);
    token = login.body.accessToken;
    userId = login.body.user.id;
    const course = await post('/courses', {
      code: `SCH${runId.slice(0, 4)}`,
      name: 'Schedule 101',
    }).expect(HttpStatus.CREATED);
    courseId = course.body.id;
  }, 120_000);

  afterAll(async () => {
    if (!app) return;
    await app.prisma.user.deleteMany({ where: { id: userId } });
    await app.app.close();
  }, 60_000);

  // ---------------------------------------------------------------------------
  // Day bounds (EP15B-AC1)
  // ---------------------------------------------------------------------------

  describe('day bounds', () => {
    it('GET returns seven defaults and configured: false for a new student', async () => {
      const res = await get('/schedule/day-bounds').expect(HttpStatus.OK);
      expect(res.body).toEqual({ configured: false, days: DEFAULT_DAYS });
    });

    it('PUT with six entries → 400 on days, nothing written', async () => {
      const res = await put('/schedule/day-bounds', { days: sevenDays().slice(0, 6) }).expect(
        HttpStatus.BAD_REQUEST
      );
      expect(res.body.errors.days).toBeDefined();
      expect(await app.prisma.dayBounds.count({ where: { userId } })).toBe(0);
    });

    it('PUT with eight entries → 400 on days', async () => {
      const res = await put('/schedule/day-bounds', {
        days: [...sevenDays(), { dayOfWeek: 0, wakeTime: '07:00', sleepTime: '22:00' }],
      }).expect(HttpStatus.BAD_REQUEST);
      expect(res.body.errors.days).toBeDefined();
    });

    it('PUT with a duplicated weekday → 400 "each weekday exactly once"', async () => {
      const days = sevenDays();
      days[6].dayOfWeek = 5;
      const res = await put('/schedule/day-bounds', { days }).expect(HttpStatus.BAD_REQUEST);
      expect(res.body.errors.days).toEqual(['days must hold each weekday exactly once']);
    });

    it('PUT with one invalid pair → 400 naming that entry, and no row changed (transaction)', async () => {
      const days = sevenDays();
      days[3] = { dayOfWeek: 3, wakeTime: '22:00', sleepTime: '22:00' };
      const res = await put('/schedule/day-bounds', { days }).expect(HttpStatus.BAD_REQUEST);
      expect(res.body.errors['days[3].sleepTime']).toEqual([
        'days[3].sleepTime must be strictly after days[3].wakeTime',
      ]);
      expect(await app.prisma.dayBounds.count({ where: { userId } })).toBe(0);
    });

    it('PUT rejects wakeTime 24:00, sleepTime 24:01, malformed times and unknown entry keys', async () => {
      const days = sevenDays();
      days[0] = { dayOfWeek: 0, wakeTime: '24:00', sleepTime: '24:00' };
      days[1] = { dayOfWeek: 1, wakeTime: '07:00', sleepTime: '24:01' };
      days[2] = { dayOfWeek: 2, wakeTime: '7:00', sleepTime: '22:00' };
      (days[4] as Record<string, unknown>).userId = 'x';
      const res = await put('/schedule/day-bounds', { days }).expect(HttpStatus.BAD_REQUEST);
      expect(res.body.errors['days[0].wakeTime']).toEqual([
        'days[0].wakeTime must be before 24:00',
      ]);
      expect(res.body.errors['days[1].sleepTime']).toHaveLength(1);
      expect(res.body.errors['days[2].wakeTime']).toHaveLength(1);
      expect(res.body.errors['days[4].userId']).toEqual(['property userId should not exist']);
    });

    it('PUT with an unknown top-level field → 400 (strict pipe)', async () => {
      const res = await put('/schedule/day-bounds', { days: sevenDays(), userId: 'x' }).expect(
        HttpStatus.BAD_REQUEST
      );
      expect(res.body.errors.userId).toBeDefined();
    });

    it('PUT happy path round-trips incl. 24:00 and reports configured: true', async () => {
      const days = sevenDays();
      days[5] = { dayOfWeek: 5, wakeTime: '09:00', sleepTime: '24:00' };
      const shuffled = [...days].reverse();
      const res = await put('/schedule/day-bounds', { days: shuffled }).expect(HttpStatus.OK);
      expect(res.body).toEqual({ configured: true, days });
      const again = await get('/schedule/day-bounds').expect(HttpStatus.OK);
      expect(again.body).toEqual({ configured: true, days });
      expect(await app.prisma.dayBounds.count({ where: { userId } })).toBe(7);
    });

    it('a second PUT replaces in place (still seven rows)', async () => {
      const days = sevenDays('06:00', '21:00');
      const res = await put('/schedule/day-bounds', { days }).expect(HttpStatus.OK);
      expect(res.body.days).toEqual(days);
      expect(await app.prisma.dayBounds.count({ where: { userId } })).toBe(7);
    });
  });

  // ---------------------------------------------------------------------------
  // Blocks (EP15B-AC2 … AC4)
  // ---------------------------------------------------------------------------

  describe('blocks', () => {
    let weeklyId: string; // STUDY Mon/Wed/Fri 09:00–10:30 from 2026-11-16, open-ended, course tied
    let oneOffId: string; // BUSY 2026-11-21 13:00–15:00

    it('POST creates a weekly STUDY block tied to the student’s course (title trimmed)', async () => {
      const res = await post('/schedule/blocks', {
        kind: 'STUDY',
        title: '  Deep work  ',
        courseId,
        energy: 'HIGH',
        startDate: '2026-11-16',
        weekdays: [5, 1, 3],
        startTime: '09:00',
        endTime: '10:30',
      }).expect(HttpStatus.CREATED);
      expect(Object.keys(res.body).sort()).toEqual(BLOCK_KEYS);
      expect(res.body).toMatchObject({
        kind: 'STUDY',
        title: 'Deep work',
        courseId,
        energy: 'HIGH',
        startDate: '2026-11-16',
        endDate: null,
        weekdays: [1, 3, 5],
        startTime: '09:00',
        endTime: '10:30',
      });
      expect(res.body.userId).toBeUndefined();
      weeklyId = res.body.id;
    });

    it('POST creates a one-off BUSY block; blank title → null; energy defaults NORMAL', async () => {
      const res = await post('/schedule/blocks', {
        kind: 'BUSY',
        title: '   ',
        startDate: '2026-11-21',
        startTime: '13:00',
        endTime: '15:00',
      }).expect(HttpStatus.CREATED);
      expect(res.body).toMatchObject({
        kind: 'BUSY',
        title: null,
        courseId: null,
        energy: 'NORMAL',
        weekdays: null,
        endDate: null,
      });
      oneOffId = res.body.id;
    });

    it('POST accepts endTime 24:00 on a weekly block', async () => {
      const res = await post('/schedule/blocks', {
        kind: 'BUSY',
        title: 'Night shift',
        startDate: '2026-11-17',
        endDate: '2026-12-31',
        weekdays: [2],
        startTime: '22:00',
        endTime: '24:00',
      }).expect(HttpStatus.CREATED);
      expect(res.body.endTime).toBe('24:00');
      await del(`/schedule/blocks/${res.body.id}`).expect(HttpStatus.NO_CONTENT);
    });

    it('GET lists the student’s blocks ordered startDate, startTime, id', async () => {
      const res = await get('/schedule/blocks').expect(HttpStatus.OK);
      expect(res.body.map((b: { id: string }) => b.id)).toEqual([weeklyId, oneOffId]);
      for (const block of res.body) expect(Object.keys(block).sort()).toEqual(BLOCK_KEYS);
    });

    describe('POST validation matrix (400, field-level, nothing written)', () => {
      const valid = {
        kind: 'BUSY',
        startDate: '2026-11-20',
        startTime: '09:00',
        endTime: '10:00',
      };
      const cases: [string, Record<string, unknown>, string][] = [
        ['kind missing', { ...valid, kind: undefined }, 'kind'],
        ['kind invalid', { ...valid, kind: 'CLASS' }, 'kind'],
        ['title not a string', { ...valid, title: 7 }, 'title'],
        ['title > 60 after trim', { ...valid, title: ` ${'x'.repeat(61)} ` }, 'title'],
        [
          'courseId on BUSY',
          { ...valid, courseId: '00000000-0000-4000-8000-000000000000' },
          'courseId',
        ],
        ['energy on BUSY', { ...valid, energy: 'HIGH' }, 'energy'],
        ['energy invalid', { ...valid, kind: 'STUDY', energy: 'MAX' }, 'energy'],
        ['startDate malformed', { ...valid, startDate: '2026/11/20' }, 'startDate'],
        ['startDate impossible', { ...valid, startDate: '2026-02-30' }, 'startDate'],
        ['endDate without weekdays', { ...valid, endDate: '2026-12-01' }, 'endDate'],
        ['endDate before startDate', { ...valid, weekdays: [1], endDate: '2026-11-19' }, 'endDate'],
        ['weekdays empty', { ...valid, weekdays: [] }, 'weekdays'],
        ['weekdays out of range', { ...valid, weekdays: [7] }, 'weekdays'],
        ['weekdays duplicate', { ...valid, weekdays: [1, 1] }, 'weekdays'],
        ['weekdays non-integer', { ...valid, weekdays: [1.5] }, 'weekdays'],
        ['weekdays as string', { ...valid, weekdays: 'mon' }, 'weekdays'],
        ['startTime malformed', { ...valid, startTime: '9:00' }, 'startTime'],
        ['startTime 24:00', { ...valid, startTime: '24:00', endTime: '24:00' }, 'startTime'],
        ['endTime == startTime', { ...valid, endTime: '09:00' }, 'endTime'],
        ['endTime < startTime', { ...valid, endTime: '08:00' }, 'endTime'],
        ['endTime 24:01', { ...valid, endTime: '24:01' }, 'endTime'],
        ['endTime minute 60', { ...valid, endTime: '10:60' }, 'endTime'],
        ['unknown field userId', { ...valid, userId: 'x' }, 'userId'],
      ];

      it.each(cases)('%s → 400 on %s', async (_label, body, field) => {
        const before = await app.prisma.scheduleBlock.count({ where: { userId } });
        const res = await post('/schedule/blocks', body).expect(HttpStatus.BAD_REQUEST);
        expect(res.body.errors[field]).toBeDefined();
        expect(await app.prisma.scheduleBlock.count({ where: { userId } })).toBe(before);
      });

      it('a foreign or unknown courseId → uniform 404 and no write', async () => {
        const before = await app.prisma.scheduleBlock.count({ where: { userId } });
        const res = await post('/schedule/blocks', {
          ...valid,
          kind: 'STUDY',
          courseId: uuidv4(),
        }).expect(HttpStatus.NOT_FOUND);
        expect(res.body.message).toBe('Resource not found');
        expect(await app.prisma.scheduleBlock.count({ where: { userId } })).toBe(before);
      });
    });

    describe('PATCH (EP15B-AC3)', () => {
      it('empty body → 400', async () => {
        await patch(`/schedule/blocks/${weeklyId}`, {}).expect(HttpStatus.BAD_REQUEST);
      });

      it('kind in body → 400 with the immutability message', async () => {
        const res = await patch(`/schedule/blocks/${weeklyId}`, { kind: 'BUSY' }).expect(
          HttpStatus.BAD_REQUEST
        );
        expect(res.body.errors.kind[0]).toMatch(/cannot be changed/);
      });

      it('in place: a body without effectiveFrom updates the row and validates merged values', async () => {
        const bad = await patch(`/schedule/blocks/${weeklyId}`, { endTime: '09:00' }).expect(
          HttpStatus.BAD_REQUEST
        );
        expect(bad.body.errors.endTime).toBeDefined();

        const res = await patch(`/schedule/blocks/${weeklyId}`, {
          title: 'Focus',
          energy: 'LOW',
        }).expect(HttpStatus.OK);
        expect(res.body).toMatchObject({
          id: weeklyId,
          title: 'Focus',
          energy: 'LOW',
          weekdays: [1, 3, 5],
        });
        expect(await app.prisma.scheduleBlock.count({ where: { userId } })).toBe(2);
      });

      it('in place: effectiveFrom ≤ startDate updates the same row', async () => {
        const res = await patch(`/schedule/blocks/${weeklyId}`, {
          effectiveFrom: '2026-11-16',
          startTime: '08:30',
        }).expect(HttpStatus.OK);
        expect(res.body.id).toBe(weeklyId);
        expect(res.body.startTime).toBe('08:30');
        expect(res.body.startDate).toBe('2026-11-16');
      });

      it('effectiveFrom on a one-off → 400; energy/courseId on a BUSY block → 400', async () => {
        const a = await patch(`/schedule/blocks/${oneOffId}`, {
          effectiveFrom: '2026-11-22',
        }).expect(HttpStatus.BAD_REQUEST);
        expect(a.body.errors.effectiveFrom).toEqual([
          'effectiveFrom applies to weekly blocks only',
        ]);
        const b = await patch(`/schedule/blocks/${oneOffId}`, { energy: 'HIGH' }).expect(
          HttpStatus.BAD_REQUEST
        );
        expect(b.body.errors.energy).toEqual(['energy applies to study blocks only']);
        const c = await patch(`/schedule/blocks/${oneOffId}`, { courseId }).expect(
          HttpStatus.BAD_REQUEST
        );
        expect(c.body.errors.courseId).toEqual(['courseId applies to study blocks only']);
      });

      it('one-off: title: null clears the title in place', async () => {
        await patch(`/schedule/blocks/${oneOffId}`, { title: 'Dentist' }).expect(HttpStatus.OK);
        const res = await patch(`/schedule/blocks/${oneOffId}`, { title: null }).expect(
          HttpStatus.OK
        );
        expect(res.body.title).toBeNull();
      });

      it('split: effectiveFrom > startDate ends the original, creates the successor, moves exceptions', async () => {
        // Cancel two occurrences first: one before and one after the split date.
        await del(`/schedule/blocks/${weeklyId}/occurrences/2026-11-18`).expect(
          HttpStatus.NO_CONTENT
        );
        await del(`/schedule/blocks/${weeklyId}/occurrences/2026-11-27`).expect(
          HttpStatus.NO_CONTENT
        );

        const res = await patch(`/schedule/blocks/${weeklyId}`, {
          effectiveFrom: '2026-11-23',
          weekdays: [2, 4],
          startTime: '18:00',
          endTime: '19:00',
        }).expect(HttpStatus.OK);
        const successorId: string = res.body.id;
        expect(successorId).not.toBe(weeklyId);
        expect(res.body).toMatchObject({
          kind: 'STUDY',
          title: 'Focus',
          courseId,
          energy: 'LOW',
          startDate: '2026-11-23',
          endDate: null,
          weekdays: [2, 4],
          startTime: '18:00',
          endTime: '19:00',
        });

        const original = await app.prisma.scheduleBlock.findUnique({
          where: { id: weeklyId },
          include: { exceptions: true },
        });
        expect(original?.endDate?.toISOString().slice(0, 10)).toBe('2026-11-22');
        expect(original?.startTime).toBe('08:30');
        expect(original?.exceptions.map((e) => e.date.toISOString().slice(0, 10))).toEqual([
          '2026-11-18',
        ]);
        const successor = await app.prisma.scheduleBlock.findUnique({
          where: { id: successorId },
          include: { exceptions: true },
        });
        expect(successor?.exceptions.map((e) => e.date.toISOString().slice(0, 10))).toEqual([
          '2026-11-27',
        ]);

        const list = await get('/schedule/blocks').expect(HttpStatus.OK);
        expect(list.body.map((b: { id: string }) => b.id)).toEqual([
          weeklyId,
          oneOffId,
          successorId,
        ]);
        weeklyId = successorId; // the series continues here
      });

      it('split: effectiveFrom after endDate → 400', async () => {
        const bounded = await post('/schedule/blocks', {
          kind: 'BUSY',
          startDate: '2026-11-16',
          endDate: '2026-11-30',
          weekdays: [1],
          startTime: '07:00',
          endTime: '08:00',
        }).expect(HttpStatus.CREATED);
        const res = await patch(`/schedule/blocks/${bounded.body.id}`, {
          effectiveFrom: '2026-12-01',
          startTime: '07:30',
        }).expect(HttpStatus.BAD_REQUEST);
        expect(res.body.errors.effectiveFrom).toBeDefined();
        await del(`/schedule/blocks/${bounded.body.id}`).expect(HttpStatus.NO_CONTENT);
      });

      it('weekly → one-off: weekdays: null without effectiveFrom → 400', async () => {
        const res = await patch(`/schedule/blocks/${weeklyId}`, {
          weekdays: null,
          endDate: null,
        }).expect(HttpStatus.BAD_REQUEST);
        expect(res.body.errors.effectiveFrom).toBeDefined();
      });

      it('weekly → one-off: with effectiveFrom but endDate kept → 400 on endDate', async () => {
        const bounded = await post('/schedule/blocks', {
          kind: 'BUSY',
          startDate: '2026-11-16',
          endDate: '2026-12-31',
          weekdays: [1],
          startTime: '07:00',
          endTime: '08:00',
        }).expect(HttpStatus.CREATED);
        const res = await patch(`/schedule/blocks/${bounded.body.id}`, {
          weekdays: null,
          effectiveFrom: '2026-11-23',
        }).expect(HttpStatus.BAD_REQUEST);
        expect(res.body.errors.endDate).toBeDefined();
        await del(`/schedule/blocks/${bounded.body.id}`).expect(HttpStatus.NO_CONTENT);
      });

      it('weekly → one-off: { weekdays: null, endDate: null, effectiveFrom } splits into a one-off successor', async () => {
        const res = await patch(`/schedule/blocks/${weeklyId}`, {
          weekdays: null,
          endDate: null,
          effectiveFrom: '2026-12-03',
        }).expect(HttpStatus.OK);
        expect(res.body.id).not.toBe(weeklyId);
        expect(res.body).toMatchObject({ startDate: '2026-12-03', endDate: null, weekdays: null });
        const original = await app.prisma.scheduleBlock.findUnique({ where: { id: weeklyId } });
        expect(original?.endDate?.toISOString().slice(0, 10)).toBe('2026-12-02');
        expect(original?.weekdays).toBe((1 << 2) | (1 << 4));
        // Clean up the one-off successor so the DELETE cases below start from a known set.
        await del(`/schedule/blocks/${res.body.id}`).expect(HttpStatus.NO_CONTENT);
      });

      it('a missing or malformed id → uniform 404', async () => {
        for (const id of [uuidv4(), 'not-a-uuid']) {
          const res = await patch(`/schedule/blocks/${id}`, { title: 'x' }).expect(
            HttpStatus.NOT_FOUND
          );
          expect(res.body.message).toBe('Resource not found');
        }
      });
    });

    describe('DELETE and occurrence cancel (EP15B-AC4)', () => {
      let seriesId: string; // BUSY Tue/Thu 12:00–13:00 2026-11-17 … 2026-12-31

      beforeAll(async () => {
        const res = await post('/schedule/blocks', {
          kind: 'BUSY',
          title: 'Lunch shift',
          startDate: '2026-11-17',
          endDate: '2026-12-31',
          weekdays: [2, 4],
          startTime: '12:00',
          endTime: '13:00',
        }).expect(HttpStatus.CREATED);
        seriesId = res.body.id;
      });

      it('occurrence cancel on a weekly block is idempotent and stored once', async () => {
        await del(`/schedule/blocks/${seriesId}/occurrences/2026-11-19`).expect(
          HttpStatus.NO_CONTENT
        );
        await del(`/schedule/blocks/${seriesId}/occurrences/2026-11-19`).expect(
          HttpStatus.NO_CONTENT
        );
        await del(`/schedule/blocks/${seriesId}/occurrences/2026-12-15`).expect(
          HttpStatus.NO_CONTENT
        );
        expect(
          await app.prisma.scheduleBlockException.count({ where: { blockId: seriesId } })
        ).toBe(2);
      });

      it('a date that is not an occurrence → 400 (wrong weekday, before start, after end, malformed)', async () => {
        for (const date of ['2026-11-18', '2026-11-12', '2027-01-05', '2026-13-01', 'tomorrow']) {
          const res = await del(`/schedule/blocks/${seriesId}/occurrences/${date}`).expect(
            HttpStatus.BAD_REQUEST
          );
          expect(res.body.errors.date).toBeDefined();
        }
      });

      it('?from= malformed → 400; from past endDate → 204 no-op', async () => {
        const bad = await del(`/schedule/blocks/${seriesId}?from=12/01/2026`).expect(
          HttpStatus.BAD_REQUEST
        );
        expect(bad.body.errors.from).toBeDefined();
        await del(`/schedule/blocks/${seriesId}?from=2027-01-01`).expect(HttpStatus.NO_CONTENT);
        const row = await app.prisma.scheduleBlock.findUnique({
          where: { id: seriesId },
          include: { exceptions: true },
        });
        expect(row?.endDate?.toISOString().slice(0, 10)).toBe('2026-12-31');
        expect(row?.exceptions).toHaveLength(2);
      });

      it('?from= mid-series trims endDate to from − 1 and drops exceptions ≥ from', async () => {
        await del(`/schedule/blocks/${seriesId}?from=2026-12-01`).expect(HttpStatus.NO_CONTENT);
        const row = await app.prisma.scheduleBlock.findUnique({
          where: { id: seriesId },
          include: { exceptions: true },
        });
        expect(row?.endDate?.toISOString().slice(0, 10)).toBe('2026-11-30');
        expect(row?.exceptions.map((e) => e.date.toISOString().slice(0, 10))).toEqual([
          '2026-11-19',
        ]);
      });

      it('?from= ≤ startDate deletes the whole series and cascades its exceptions', async () => {
        await del(`/schedule/blocks/${seriesId}?from=2026-11-17`).expect(HttpStatus.NO_CONTENT);
        expect(await app.prisma.scheduleBlock.findUnique({ where: { id: seriesId } })).toBeNull();
        expect(
          await app.prisma.scheduleBlockException.count({ where: { blockId: seriesId } })
        ).toBe(0);
        await del(`/schedule/blocks/${seriesId}`).expect(HttpStatus.NOT_FOUND);
      });

      it('occurrence cancel on a one-off deletes it when the date matches, 400 otherwise', async () => {
        const wrong = await del(`/schedule/blocks/${oneOffId}/occurrences/2026-11-22`).expect(
          HttpStatus.BAD_REQUEST
        );
        expect(wrong.body.errors.date).toEqual(['date is not an occurrence of this block']);
        await del(`/schedule/blocks/${oneOffId}/occurrences/2026-11-21`).expect(
          HttpStatus.NO_CONTENT
        );
        expect(await app.prisma.scheduleBlock.findUnique({ where: { id: oneOffId } })).toBeNull();
        await del(`/schedule/blocks/${oneOffId}/occurrences/2026-11-21`).expect(
          HttpStatus.NOT_FOUND
        );
      });

      it('DELETE without from on a weekly block removes it; a repeat is the uniform 404', async () => {
        await del(`/schedule/blocks/${weeklyId}`).expect(HttpStatus.NO_CONTENT);
        const res = await del(`/schedule/blocks/${weeklyId}`).expect(HttpStatus.NOT_FOUND);
        expect(res.body.message).toBe('Resource not found');
      });
    });
  });

  it('every route is 401 without a token', async () => {
    await agent.get('/schedule/day-bounds').expect(HttpStatus.UNAUTHORIZED);
    await agent
      .put('/schedule/day-bounds')
      .send({ days: sevenDays() })
      .expect(HttpStatus.UNAUTHORIZED);
    await agent.get('/schedule/blocks').expect(HttpStatus.UNAUTHORIZED);
    await agent.post('/schedule/blocks').send({}).expect(HttpStatus.UNAUTHORIZED);
    await agent
      .patch(`/schedule/blocks/${uuidv4()}`)
      .send({ title: 'x' })
      .expect(HttpStatus.UNAUTHORIZED);
    await agent.delete(`/schedule/blocks/${uuidv4()}`).expect(HttpStatus.UNAUTHORIZED);
    await agent
      .delete(`/schedule/blocks/${uuidv4()}/occurrences/2026-11-20`)
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
