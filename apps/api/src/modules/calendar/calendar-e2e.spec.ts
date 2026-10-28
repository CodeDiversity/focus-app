import { HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

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
    // create an availability slot for A
    await app.prisma.availabilitySlot.create({
      data: {
        userId: studentA.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:00',
        isAvailable: true,
      },
    });
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
    // B should not contain A's availability event id
    const aAvail = rA.body.events.find((e: { type: string }) => e.type === 'AVAILABILITY');
    if (aAvail) expect(serializedB).not.toContain(aAvail.id);
    await app.prisma.availabilitySlot.deleteMany({ where: { userId: studentA.id } });
  });
});
