import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import { useProposal } from './useProposal';
import { previewCatchUp, confirmCatchUpPlan } from '@/entities/study-plan/api/studyPlanApi';

vi.mock('@/entities/study-plan/api/studyPlanApi', () => ({
  previewCatchUp: vi.fn(),
  confirmCatchUpPlan: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const mockedPreview = vi.mocked(previewCatchUp);
const mockedConfirm = vi.mocked(confirmCatchUpPlan);

const fixture = {
  from: '2026-10-30',
  to: '2026-11-05',
  timeZone: 'UTC',
  generatedAt: 'x',
  preferences: {},
  days: [
    {
      date: '2026-10-30',
      targetMinutes: 60,
      sessions: [
        {
          assignmentId: 'a-1',
          assignmentTitle: 'Essay',
          startTime: '09:00',
          endTime: '10:00',
          durationMinutes: 60,
          anchor: 'FIXED',
          windowHint: null,
        },
      ],
    },
  ],
  warnings: [],
  deferred: [],
  calibration: [],
  missedSessions: [
    {
      id: 'ps-1',
      assignmentId: 'a-2',
      assignmentTitle: 'Lab',
      date: '2026-10-28',
      startTime: '13:00',
      endTime: '14:00',
      durationMinutes: 60,
      locked: true,
    },
  ],
  lockedPreserved: 1,
  completedPreserved: 0,
};

describe('useProposal (EP16C-AC2/AC3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPreview.mockResolvedValue(fixture as never);
  });

  it('load: success sets preview, edited = flattenPreview(preview), phase ready', async () => {
    const { result } = renderHook(() => useProposal({ onConfirmed: vi.fn() }));
    expect(result.current.phase).toBe('loading');
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    expect(result.current.preview?.from).toBe('2026-10-30');
    expect(result.current.edited).toEqual([
      expect.objectContaining({ assignmentId: 'a-1', date: '2026-10-30', startTime: '09:00' }),
    ]);
  });

  it('load: failure sets phase error and clears preview', async () => {
    mockedPreview.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useProposal({ onConfirmed: vi.fn() }));
    await waitFor(() => expect(result.current.phase).toBe('error'));
    expect(result.current.preview).toBeNull();
    expect(result.current.edited).toEqual([]);
  });

  it('confirm: posts projectSessions(edited) with the preview window and calls onConfirmed', async () => {
    mockedConfirm.mockResolvedValue({} as never);
    const onConfirmed = vi.fn();
    const { result } = renderHook(() => useProposal({ onConfirmed }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    await act(() => result.current.confirm());
    expect(mockedConfirm).toHaveBeenCalledWith('2026-10-30', '2026-11-05', [
      {
        assignmentId: 'a-1',
        date: '2026-10-30',
        startTime: '09:00',
        endTime: '10:00',
        anchor: 'FIXED',
      },
    ]);
    expect(toast.success).toHaveBeenCalledWith('Plan saved.');
    expect(onConfirmed).toHaveBeenCalledTimes(1);
    expect(result.current.isConfirming).toBe(false);
  });

  it('confirm: 409 conflicts keep edited and expose conflicts, with no toast (D-C11)', async () => {
    mockedConfirm.mockRejectedValue({
      response: {
        data: {
          statusCode: 409,
          conflicts: [
            { sessionIndex: 0, date: '2026-10-30', startTime: '09:00', reason: 'OVERLAPS_CLASS' },
          ],
        },
      },
    } as never);
    const { result } = renderHook(() => useProposal({ onConfirmed: vi.fn() }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    await act(() => result.current.confirm());
    expect(result.current.conflicts).toHaveLength(1);
    expect(result.current.edited).toHaveLength(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('confirm: WINDOW_ROLLED_OVER sets rolledOver and clears preview and edits', async () => {
    mockedConfirm.mockRejectedValue({
      response: { data: { error: 'WINDOW_ROLLED_OVER' } },
    } as never);
    const { result } = renderHook(() => useProposal({ onConfirmed: vi.fn() }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    await act(() => result.current.confirm());
    expect(result.current.rolledOver).toBe(true);
    expect(result.current.preview).toBeNull();
    expect(result.current.edited).toEqual([]);
  });

  it('confirm: other errors toast the server message, or the fallback', async () => {
    mockedConfirm.mockRejectedValueOnce({
      message: 'to must be exactly six days after from',
    } as never);
    const { result } = renderHook(() => useProposal({ onConfirmed: vi.fn() }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    await act(() => result.current.confirm());
    expect(toast.error).toHaveBeenCalledWith('to must be exactly six days after from');
  });

  it('confirm: resolving after unmount toasts but does not navigate (D-C9)', async () => {
    let resolve!: () => void;
    mockedConfirm.mockReturnValue(new Promise<void>((r) => (resolve = r)) as never);
    const onConfirmed = vi.fn();
    const { result, unmount } = renderHook(() => useProposal({ onConfirmed }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    const pending = result.current.confirm();
    unmount();
    resolve();
    await pending;
    expect(toast.success).toHaveBeenCalledWith('Plan saved.');
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it('onLockedChange: flips the session and adjusts lockedPreserved ±1, never below 0', async () => {
    const { result } = renderHook(() => useProposal({ onConfirmed: vi.fn() }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.onLockedChange('ps-1', false));
    expect(result.current.preview?.missedSessions[0].locked).toBe(false);
    expect(result.current.preview?.lockedPreserved).toBe(0);
    act(() => result.current.onLockedChange('ps-1', false));
    expect(result.current.preview?.lockedPreserved).toBe(0);
    act(() => result.current.onLockedChange('ps-1', true));
    expect(result.current.preview?.lockedPreserved).toBe(1);
  });
});
