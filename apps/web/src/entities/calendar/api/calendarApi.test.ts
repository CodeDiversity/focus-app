import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listCalendarEvents } from './calendarApi';

vi.mock('@/shared/api/httpClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import api from '@/shared/api/httpClient';

const mockedGet = vi.mocked(api.get);

describe('calendarApi (SP-127B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends only from/to and maps the payload', async () => {
    const payload = {
      timeZone: 'America/New_York',
      today: '2026-10-28',
      from: '2026-10-26',
      to: '2026-11-01',
      events: [
        {
          id: 'class:m1:2026-10-27',
          type: 'CLASS',
          title: 'Calculus',
          subtitle: 'MATH101',
          date: '2026-10-27',
          startTime: '09:00',
          endTime: '10:00',
          courseId: 'c1',
          courseName: 'Calculus',
          courseColor: '#10b981',
          assignmentId: null,
          completed: false,
          focus: false,
          link: '/courses/c1',
        },
      ],
    };
    mockedGet.mockResolvedValue({ data: payload } as never);

    const result = await listCalendarEvents({ from: '2026-10-26', to: '2026-11-01' });

    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith('/calendar/events', {
      params: { from: '2026-10-26', to: '2026-11-01' },
    });
    expect(result).toEqual(payload);
    expect(result.events[0].type).toBe('CLASS');
  });
});
