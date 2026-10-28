import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('calendar events data scoping (SP-127A)', () => {
  let app: IntegrationApp;
  let agent: ReturnType<IntegrationApp['request']>;
  let studentA: { id: string; email: string; accessToken: string };
  let studentB: { id: string; email: string; accessToken: string };

  async function registerAndLogin(label: string) {
    const email = `${label}.${uuidv4().slice(0, 8)}@studypilot-test.invalid`;
    const password = `S3cure-${uuidv4().slice(0, 8)}-cal`;
    await agent
      .post('/auth/register')
      .send({ name: `Student ${label}`, email, password })
      .expect(201);
    const login = await agent.post('/auth/login').send({ email, password }).expect(200);
    return { id: login.body.user.id, email, accessToken: login.body.accessToken };
  }

  beforeAll(async () => {
    app = await createIntegrationApp();
    agent = app.request(app.app.getHttpAdapter().getInstance());
    studentA = await registerAndLogin('a');
    studentB = await registerAndLogin('b');
    await agent
      .patch('/users/me')
      .set('Authorization', `Bearer ${studentA.accessToken}`)
      .send({ timeZone: 'America/New_York' })
      .expect(200);

    // Seed A's data: a course + meeting, an assignment, a study session, an availability slot.
    const courseRes = await agent
      .post('/courses')
      .set('Authorization', `Bearer ${studentA.accessToken}`)
      .send({ code: 'CS', name: 'Course A' })
      .expect(201);
    const courseId = courseRes.body.id;
    await agent
      .post(`/courses/${courseId}/meetings`)
      .set('Authorization', `Bearer ${studentA.accessToken}`)
      .send({ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' })
      .expect(201);
    await agent
      .post('/assignments')
      .set('Authorization', `Bearer ${studentA.accessToken}`)
      .send({ title: 'A deadline', courseId, dueDate: '2026-10-28T10:00:00.000Z' })
      .expect(201);
    await app.prisma.studySession.create({
      data: {
        userId: studentA.id,
        startTime: new Date('2026-10-28T14:00:00Z'),
        endTime: new Date('2026-10-28T15:00:00Z'),
        isFocusMode: true,
      },
    });
    await app.prisma.availabilitySlot.create({
      data: {
        userId: studentA.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:00',
        isAvailable: true,
      },
    });
  }, 120000);

  afterAll(async () => {
    if (!app) return;
    await app.prisma.user.deleteMany({
      where: { id: { in: [studentA?.id, studentB?.id].filter(Boolean) } },
    });
    await app.app.close();
  }, 60000);

  it('B sees none of A events', async () => {
    const rA = await agent
      .get('/calendar/events')
      .set('Authorization', `Bearer ${studentA.accessToken}`)
      .query({ from: '2026-10-25', to: '2026-10-31' })
      .expect(200);
    const rB = await agent
      .get('/calendar/events')
      .set('Authorization', `Bearer ${studentB.accessToken}`)
      .query({ from: '2026-10-25', to: '2026-10-31' })
      .expect(200);

    const serializedB = JSON.stringify(rB.body);
    expect(rA.body.events.length).toBeGreaterThan(0);
    for (const ev of rA.body.events) {
      expect(serializedB).not.toContain(ev.id);
    }
    // B has no courses/assignments/sessions/slots -> empty events.
    expect(rB.body.events).toEqual([]);
  });

  it('unauthenticated -> 401', async () => {
    await agent.get('/calendar/events').query({ from: '2026-10-25', to: '2026-10-31' }).expect(401);
  });
});
