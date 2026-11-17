import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';
import { ScheduleInputsService } from '../schedule/schedule-inputs.service';
import { dayOfWeekOf } from '../../common/lib/calendar-date';
import { dayBoundsFor, minutesToTime } from '../../domain/schedule/recurrence';
import { freeIntervals } from '../../domain/study-planning/intervals';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('calendar events (integration)', () => {
  const runId = uuidv4().slice(0, 8);
  const uniqueEmail = (label: string) =>
    `${label}.${runId}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
  const password = `S3cure-${runId}-cal`;

  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  let studentA: { id: string; email: string; accessToken: string };
  let studentB: { id: string; email: string; accessToken: string };

  async function registerAndLogin(label: string) {
    const email = uniqueEmail(label);
    await agent
      .post('/auth/register')
      .send({ name: `Student ${label}`, email, password })
      .expect(HttpStatus.CREATED);
    const login = await agent.post('/auth/login').send({ email, password }).expect(HttpStatus.OK);
    return { id: login.body.user.id, email, accessToken: login.body.accessToken };
  }

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());
    studentA = await registerAndLogin('a');
    studentB = await registerAndLogin('b');

    // Set A's timeZone to America/New_York
    await agent
      .patch('/users/me')
      .set('Authorization', `Bearer ${studentA.accessToken}`)
      .send({ timeZone: 'America/New_York' })
      .expect(HttpStatus.OK);
  }, 120000);

  afterAll(async () => {
    if (!app) return;
    await app.prisma.user.deleteMany({
      where: { id: { in: [studentA?.id, studentB?.id].filter(Boolean) as string[] } },
    });
    await app.app.close();
  }, 60000);

  it('returns 401 unauthenticated', async () => {
    await agent
      .get('/calendar/events')
      .query({ from: '2026-10-25', to: '2026-10-31' })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('400 malformed from', async () => {
    const r = await agent
      .get('/calendar/events')
      .set('Authorization', `Bearer ${studentA.accessToken}`)
      .query({ from: 'bad', to: '2026-10-31' })
      .expect(HttpStatus.BAD_REQUEST);
    expect(r.body.errors).toHaveProperty('from');
  });

  it('400 from > to', async () => {
    await agent
      .get('/calendar/events')
      .set('Authorization', `Bearer ${studentA.accessToken}`)
      .query({ from: '2026-10-31', to: '2026-10-25' })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('400 over-long span', async () => {
    await agent
      .get('/calendar/events')
      .set('Authorization', `Bearer ${studentA.accessToken}`)
      .query({ from: '2026-10-01', to: '2026-11-15' })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('400 unknown param', async () => {
    const r = await agent
      .get('/calendar/events')
      .set('Authorization', `Bearer ${studentA.accessToken}`)
      .query({ from: '2026-10-25', to: '2026-10-31', tz: 'UTC' })
      .expect(HttpStatus.BAD_REQUEST);
    expect(r.body.errors).toHaveProperty('tz');
  });

  it('200 shape with timeZone + today', async () => {
    const r = await agent
      .get('/calendar/events')
      .set('Authorization', `Bearer ${studentA.accessToken}`)
      .query({ from: '2026-10-25', to: '2026-10-31' })
      .expect(HttpStatus.OK);
    expect(r.body.timeZone).toBe('America/New_York');
    expect(r.body.from).toBe('2026-10-25');
    expect(r.body.to).toBe('2026-10-31');
    expect(Array.isArray(r.body.events)).toBe(true);
    expect(typeof r.body.today).toBe('string');
  });

  it('seeded study session appears', async () => {
    const start = new Date('2026-10-27T14:00:00Z');
    const end = new Date('2026-10-27T15:00:00Z');
    await app.prisma.studySession.create({
      data: { userId: studentA.id, startTime: start, endTime: end, isFocusMode: true },
    });
    const r = await agent
      .get('/calendar/events')
      .set('Authorization', `Bearer ${studentA.accessToken}`)
      .query({ from: '2026-10-25', to: '2026-10-31' })
      .expect(HttpStatus.OK);
    const sess = r.body.events.find((e: { type: string }) => e.type === 'STUDY_SESSION');
    expect(sess).toBeTruthy();
    expect(sess.focus).toBe(true);
    // cleanup
    await app.prisma.studySession.deleteMany({ where: { userId: studentA.id } });
  });

  it('data scoping: B sees none of A events', async () => {
    // EP15D: a weekly STUDY block for A (the former availability slot).
    const block = await agent
      .post('/schedule/blocks')
      .set('Authorization', `Bearer ${studentA.accessToken}`)
      .send({
        kind: 'STUDY',
        startDate: '2026-10-01',
        weekdays: [1],
        startTime: '09:00',
        endTime: '10:00',
      })
      .expect(HttpStatus.CREATED);
    const rA = await agent
      .get('/calendar/events')
      .set('Authorization', `Bearer ${studentA.accessToken}`)
      .query({ from: '2026-10-25', to: '2026-10-31' })
      .expect(HttpStatus.OK);
    const rB = await agent
      .get('/calendar/events')
      .set('Authorization', `Bearer ${studentB.accessToken}`)
      .query({ from: '2026-10-25', to: '2026-10-31' })
      .expect(HttpStatus.OK);
    const serializedB = JSON.stringify(rB.body);
    // B never sees A's study block (as an event or as taken free time).
    const aBlock = rA.body.events.find((e: { type: string }) => e.type === 'STUDY_BLOCK');
    expect(aBlock).toBeTruthy();
    expect(aBlock.id).toBe(`study-block:${block.body.id}:2026-10-26`);
    expect(serializedB).not.toContain(aBlock.id);
    expect(serializedB).not.toContain(block.body.id);
    await app.prisma.scheduleBlock.deleteMany({ where: { userId: studentA.id } });
  });

  // ---------------------------------------------------------------------------
  // EP15D — days[] and the V-15-1 free-time identity (EP15D-AC2, EP15D-AC3)
  // ---------------------------------------------------------------------------
  describe('EP15D: days[] and the planner/calendar free-time identity (V-15-1)', () => {
    const auth = () => ({ Authorization: `Bearer ${studentA.accessToken}` });
    // The week of the US DST fall-back (2026-11-01 is the transition Sunday).
    const FROM = '2026-10-26'; // Mon
    const TO = '2026-11-01'; // Sun (DST)

    beforeAll(async () => {
      await agent
        .put('/schedule/day-bounds')
        .set(auth())
        .send({
          days: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
            dayOfWeek,
            wakeTime: '07:00',
            sleepTime: dayOfWeek === 0 ? '24:00' : '22:00', // Sunday ends at midnight
          })),
        })
        .expect(HttpStatus.OK);
      // A weekly BUSY block Mon/Wed/Sun 12:00–13:00 with Wednesday 10-28 cancelled.
      const weekly = await agent
        .post('/schedule/blocks')
        .set(auth())
        .send({
          kind: 'BUSY',
          title: 'Lunch shift',
          startDate: '2026-10-01',
          weekdays: [0, 1, 3],
          startTime: '12:00',
          endTime: '13:00',
        })
        .expect(HttpStatus.CREATED);
      await agent
        .delete(`/schedule/blocks/${weekly.body.id}/occurrences/2026-10-28`)
        .set(auth())
        .expect(HttpStatus.NO_CONTENT);
      // A one-off event on the DST Sunday, and a STUDY block (takes no free time).
      await agent
        .post('/schedule/blocks')
        .set(auth())
        .send({ kind: 'BUSY', startDate: TO, startTime: '20:00', endTime: '21:30' })
        .expect(HttpStatus.CREATED);
      await agent
        .post('/schedule/blocks')
        .set(auth())
        .send({
          kind: 'STUDY',
          startDate: '2026-10-01',
          weekdays: [2],
          startTime: '18:00',
          endTime: '20:00',
          energy: 'HIGH',
        })
        .expect(HttpStatus.CREATED);
    }, 60_000);

    afterAll(async () => {
      await app.prisma.scheduleBlock.deleteMany({ where: { userId: studentA.id } });
      await app.prisma.dayBounds.deleteMany({ where: { userId: studentA.id } });
    });

    it('days[] carries the stored bounds and free time; old types are gone; block events carry their fields', async () => {
      const r = await agent
        .get('/calendar/events')
        .set(auth())
        .query({ from: FROM, to: TO })
        .expect(HttpStatus.OK);
      expect(r.body.days.map((d: { date: string }) => d.date)).toHaveLength(7);
      const mon = r.body.days.find((d: { date: string }) => d.date === FROM);
      expect(mon).toEqual({
        date: FROM,
        wakeTime: '07:00',
        sleepTime: '22:00',
        free: [
          { startTime: '07:00', endTime: '12:00' },
          { startTime: '13:00', endTime: '22:00' },
        ],
      });
      const wed = r.body.days.find((d: { date: string }) => d.date === '2026-10-28');
      expect(wed.free).toEqual([{ startTime: '07:00', endTime: '22:00' }]); // occurrence cancelled; study block takes nothing
      const sun = r.body.days.find((d: { date: string }) => d.date === TO);
      expect(sun).toEqual({
        date: TO,
        wakeTime: '07:00',
        sleepTime: '24:00',
        free: [
          { startTime: '07:00', endTime: '12:00' },
          { startTime: '13:00', endTime: '20:00' },
          { startTime: '21:30', endTime: '24:00' },
        ],
      });
      const types = new Set(r.body.events.map((e: { type: string }) => e.type));
      expect(types.has('AVAILABILITY')).toBe(false);
      expect(types.has('BLOCKED_TIME')).toBe(false);
      const events = r.body.events.filter((e: { type: string }) => e.type === 'EVENT');
      expect(
        events.map((e: { date: string; recurring: boolean }) => `${e.date}:${e.recurring}`)
      ).toEqual(['2026-10-26:true', '2026-11-01:true', '2026-11-01:false']); // date, then startTime
      expect(events[0]).toMatchObject({
        title: 'Lunch shift',
        startTime: '12:00',
        endTime: '13:00',
        energy: null,
      });
      const study = r.body.events.filter((e: { type: string }) => e.type === 'STUDY_BLOCK');
      expect(study).toHaveLength(1);
      expect(study[0]).toMatchObject({
        date: '2026-10-27',
        title: 'Study',
        energy: 'HIGH',
        recurring: true,
      });
    });

    it('V-15-1: the calendar’s free time equals freeIntervals over the planner’s seam inputs, minute for minute', async () => {
      const seam = app.app.get(ScheduleInputsService);
      const inputs = await seam.scheduleInputs(studentA.id, FROM, TO);
      const r = await agent
        .get('/calendar/events')
        .set(auth())
        .query({ from: FROM, to: TO })
        .expect(HttpStatus.OK);
      for (const date of inputs.days) {
        const dow = dayOfWeekOf(date);
        const free = freeIntervals({
          date,
          base: { kind: 'declared', windows: [dayBoundsFor(inputs.bounds.days, date)] },
          blocked: inputs.blocked,
          classes: inputs.classes
            .filter((w) => w.dayOfWeek === dow)
            .map((w) => ({ date, startMinute: w.startMinute, endMinute: w.endMinute })),
          busy: inputs.busy,
          placed: [], // no current FIXED planned sessions in this fixture
        }).map((f) => ({
          startTime: minutesToTime(f.startMinute),
          endTime: minutesToTime(f.endMinute),
        }));
        const day = r.body.days.find((d: { date: string }) => d.date === date);
        expect(day.free).toEqual(free);
      }
      // And the planner would see exactly these blocked/preferred intervals.
      expect(inputs.blocked.map((b) => `${b.date}:${b.startMinute}-${b.endMinute}`)).toEqual([
        '2026-10-26:720-780',
        '2026-11-01:720-780',
        '2026-11-01:1200-1290',
      ]);
      expect(inputs.preferred).toHaveLength(1);
      expect(inputs.preferred[0]).toMatchObject({ date: '2026-10-27', energy: 'HIGH' });
    });
  });
});
