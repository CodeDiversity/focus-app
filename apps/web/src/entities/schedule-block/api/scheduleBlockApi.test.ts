import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cancelOccurrence,
  createScheduleBlock,
  deleteScheduleBlock,
  listScheduleBlocks,
  updateScheduleBlock,
} from './scheduleBlockApi';

vi.mock('@/shared/api/httpClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
import api from '@/shared/api/httpClient';

const row = {
  id: 'b1',
  kind: 'BUSY' as const,
  title: null,
  courseId: null,
  energy: null,
  startDate: '2026-10-27',
  endDate: null,
  weekdays: null,
  startTime: '09:00',
  endTime: '10:00',
  createdAt: 'x',
  updatedAt: 'x',
};

describe('scheduleBlockApi (EP15G over EP15B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EP15G-AC1: createScheduleBlock POSTs /schedule/blocks with the body as given and returns the row', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: row } as never);
    const body = {
      kind: 'BUSY' as const,
      startDate: '2026-10-27',
      startTime: '09:00',
      endTime: '10:00',
    };
    const out = await createScheduleBlock(body);
    expect(api.post).toHaveBeenCalledWith('/schedule/blocks', body);
    expect(out).toEqual(row);
  });

  it('EP15G-AC2: updateScheduleBlock PATCHes /schedule/blocks/:id, passing effectiveFrom only when provided', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: row } as never);
    await updateScheduleBlock('b1', { startTime: '10:00' });
    expect(api.patch).toHaveBeenLastCalledWith('/schedule/blocks/b1', { startTime: '10:00' });
    await updateScheduleBlock('b1', { startTime: '10:00', effectiveFrom: '2026-11-03' });
    expect(api.patch).toHaveBeenLastCalledWith('/schedule/blocks/b1', {
      startTime: '10:00',
      effectiveFrom: '2026-11-03',
    });
  });

  it('EP15G-AC2: deleteScheduleBlock DELETEs /schedule/blocks/:id and appends ?from= only when provided', async () => {
    vi.mocked(api.delete).mockResolvedValue({} as never);
    await deleteScheduleBlock('b1');
    expect(api.delete).toHaveBeenLastCalledWith('/schedule/blocks/b1', undefined);
    await deleteScheduleBlock('b1', { from: '2026-11-03' });
    expect(api.delete).toHaveBeenLastCalledWith('/schedule/blocks/b1', {
      params: { from: '2026-11-03' },
    });
  });

  it('EP15G-AC2: cancelOccurrence DELETEs /schedule/blocks/:id/occurrences/:date', async () => {
    vi.mocked(api.delete).mockResolvedValue({} as never);
    await cancelOccurrence('b1', '2026-11-03');
    expect(api.delete).toHaveBeenCalledWith('/schedule/blocks/b1/occurrences/2026-11-03');
  });

  it('EP15G-AC1: listScheduleBlocks GETs /schedule/blocks and returns the API order', async () => {
    const rows = [row, { ...row, id: 'b2' }];
    vi.mocked(api.get).mockResolvedValue({ data: rows } as never);
    const out = await listScheduleBlocks();
    expect(api.get).toHaveBeenCalledWith('/schedule/blocks');
    expect(out.map((r) => r.id)).toEqual(['b1', 'b2']);
  });
});
