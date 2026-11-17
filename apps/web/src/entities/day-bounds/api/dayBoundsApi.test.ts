import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDayBounds, putDayBounds } from './dayBoundsApi';

vi.mock('@/shared/api/httpClient', () => ({
  default: { get: vi.fn(), put: vi.fn() },
}));
import api from '@/shared/api/httpClient';

const days = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  wakeTime: '07:00',
  sleepTime: '22:00',
}));

describe('dayBoundsApi (EP15F over EP15B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /schedule/day-bounds returns the payload as-is', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { configured: false, days } } as never);
    const out = await getDayBounds();
    expect(api.get).toHaveBeenCalledWith('/schedule/day-bounds');
    expect(out).toEqual({ configured: false, days });
  });

  it('PUT /schedule/day-bounds sends { days } with exactly the seven entries given', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { configured: true, days } } as never);
    const out = await putDayBounds(days);
    expect(api.put).toHaveBeenCalledWith('/schedule/day-bounds', { days });
    expect(out.configured).toBe(true);
  });
});
