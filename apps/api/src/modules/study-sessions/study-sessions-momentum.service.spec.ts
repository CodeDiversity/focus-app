import { HttpStatus, NotFoundException } from '@nestjs/common';
import { StudySessionStatus } from '../../generated/prisma/client';
import { RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';
import { StudySessionsService } from './study-sessions.service';

/**
 * EP13K unit spec (mocked PrismaService) — the momentum read's I/O shell
 * (TR-E13-11, D-K2 civil bucketing, D-K5 payload): ownership-scoped
 * COMPLETED-only query inside the horizon, profile-zone bucketing (incl. a
 * DST transition day), zone fallback, defensive goal reader, uniform 404.
 */
describe('StudySessionsService EP13K momentum (unit, mocked PrismaService)', () => {
  const userId = 'u1';
  let service: StudySessionsService;

  const userFindUnique = jest.fn();
  const studySessionFindMany = jest.fn();
  const prisma = {
    user: { findUnique: userFindUnique },
    studySession: { findMany: studySessionFindMany },
  };

  const row = (iso: string, durationMinutes: number) => ({
    startTime: new Date(iso),
    durationMinutes,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-11-18T12:00:00.000Z')); // a Wednesday
    service = new StudySessionsService(prisma as never);
    userFindUnique.mockResolvedValue({ timeZone: 'UTC', preferences: null });
    studySessionFindMany.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('queries only the authenticated user’s COMPLETED sessions inside the horizon (where pinned)', async () => {
    await service.momentum(userId);
    expect(userFindUnique).toHaveBeenCalledWith({
      where: { id: userId },
      select: { timeZone: true, preferences: true },
    });
    // Week of 2026-11-16, minus 52 weeks (2025-11-17), minus the one-day safety margin.
    expect(studySessionFindMany).toHaveBeenCalledWith({
      where: {
        userId,
        status: StudySessionStatus.COMPLETED,
        startTime: { gte: new Date('2025-11-16T00:00:00.000Z') },
      },
      select: { startTime: true, durationMinutes: true },
    });
  });

  it('returns the D-K5 payload with the profile zone attached and no percent field', async () => {
    studySessionFindMany.mockResolvedValue([
      row('2026-11-16T09:00:00.000Z', 30),
      row('2026-11-18T08:00:00.000Z', 45),
    ]);
    const out = await service.momentum(userId);
    expect(out).toEqual({
      date: '2026-11-18',
      timeZone: 'UTC',
      today: { confirmedMinutes: 45, goalMinutes: 60, goalMet: false },
      week: {
        startDate: '2026-11-16',
        days: [
          '2026-11-16',
          '2026-11-17',
          '2026-11-18',
          '2026-11-19',
          '2026-11-20',
          '2026-11-21',
          '2026-11-22',
        ],
        studyDays: ['2026-11-16', '2026-11-18'],
        studyDayCount: 2,
        goalDays: 3,
        goalMet: false,
      },
      run: { currentWeeks: 0, bestWeeks: 0, currentWeekCounted: false },
      hasHistory: true,
    });
    expect(JSON.stringify(out)).not.toMatch(/percent|%/i);
  });

  it('a 23:30 UTC session is tomorrow in Pacific/Auckland and yesterday’s 03:00 UTC is today in America/Los_Angeles (civil bucketing)', async () => {
    jest.setSystemTime(new Date('2026-11-17T00:00:00.000Z')); // 13:00 on 11-17 in Auckland
    userFindUnique.mockResolvedValue({ timeZone: 'Pacific/Auckland', preferences: null });
    studySessionFindMany.mockResolvedValue([row('2026-11-16T23:30:00.000Z', 20)]);
    const nz = await service.momentum(userId);
    expect(nz.date).toBe('2026-11-17');
    expect(nz.today.confirmedMinutes).toBe(20);

    jest.setSystemTime(new Date('2026-11-17T05:00:00.000Z')); // 21:00 on 11-16 in LA
    userFindUnique.mockResolvedValue({ timeZone: 'America/Los_Angeles', preferences: null });
    studySessionFindMany.mockResolvedValue([row('2026-11-17T03:00:00.000Z', 25)]);
    const la = await service.momentum(userId);
    expect(la.date).toBe('2026-11-16');
    expect(la.today.confirmedMinutes).toBe(25);
    expect(la.week.studyDays).toEqual(['2026-11-16']);
  });

  it('DST-end Sunday: a 00:30 local session on the transition day stays on that day (no wall-clock bounds)', async () => {
    // America/New_York leaves DST on Sunday 2026-11-01; 00:30 EDT = 04:30 UTC.
    jest.setSystemTime(new Date('2026-11-01T20:00:00.000Z'));
    userFindUnique.mockResolvedValue({ timeZone: 'America/New_York', preferences: null });
    studySessionFindMany.mockResolvedValue([row('2026-11-01T04:30:00.000Z', 30)]);
    const out = await service.momentum(userId);
    expect(out.date).toBe('2026-11-01');
    expect(out.today.confirmedMinutes).toBe(30);
    expect(out.week.startDate).toBe('2026-10-26');
    expect(out.week.studyDays).toEqual(['2026-11-01']);
  });

  it('an unreadable profile zone falls back to UTC via `resolveTimeZone`', async () => {
    userFindUnique.mockResolvedValue({ timeZone: 'Not/AZone', preferences: null });
    const out = await service.momentum(userId);
    expect(out.timeZone).toBe('UTC');
    expect(out.date).toBe('2026-11-18');
  });

  it('reads goals through `readStudyPreferences` — invalid stored goals fall back to 60 / 3', async () => {
    userFindUnique.mockResolvedValue({
      timeZone: 'UTC',
      preferences: { studyDefaults: { dailyGoalMinutes: 30, weeklyGoalDays: 2 } },
    });
    let out = await service.momentum(userId);
    expect(out.today.goalMinutes).toBe(30);
    expect(out.week.goalDays).toBe(2);

    userFindUnique.mockResolvedValue({
      timeZone: 'UTC',
      preferences: { studyDefaults: { dailyGoalMinutes: 9999, weeklyGoalDays: 'x' } },
    });
    out = await service.momentum(userId);
    expect(out.today.goalMinutes).toBe(60);
    expect(out.week.goalDays).toBe(3);
  });

  it('the momentum yardstick is unaffected by the planning read: an unset `weeklyGoalDays` is still 3 (F-EP17C-02)', async () => {
    // The planner treats an unchosen `weeklyGoalDays` as unconstrained (7,
    // `readPlanningStudyPreferences`), but EP13K's motivational goal must
    // keep its ADHD-friendly default of 3 — this read goes through
    // `readStudyPreferences` and must not move.
    for (const preferences of [
      null,
      {},
      { studyDefaults: {} },
      { studyDefaults: { dailyGoalMinutes: 45 } },
    ]) {
      userFindUnique.mockResolvedValue({ timeZone: 'UTC', preferences });
      const out = await service.momentum(userId);
      expect(out.week.goalDays).toBe(3);
    }
  });

  it('missing user → uniform 404 `Resource not found`', async () => {
    userFindUnique.mockResolvedValue(null);
    const error = await service.momentum(userId).then(
      () => {
        throw new Error('expected a 404');
      },
      (failure: unknown) => failure
    );
    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect((error as NotFoundException).message).toBe(RESOURCE_NOT_FOUND);
    expect(studySessionFindMany).not.toHaveBeenCalled();
  });
});
