import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFocusSession } from './useFocusSession';
import type { StudySession } from '@/entities/study-session/model/types';
import {
  getCurrentStudySession,
  pauseStudySession,
} from '@/entities/study-session/api/studySessionApi';

vi.mock('@/entities/study-session/api/studySessionApi', () => ({
  getCurrentStudySession: vi.fn(),
  pauseStudySession: vi.fn(),
  resumeStudySession: vi.fn(),
  finishStudySession: vi.fn(),
  startStudySession: vi.fn(),
}));

const mockedCurrent = vi.mocked(getCurrentStudySession);
const mockedPause = vi.mocked(pauseStudySession);

const baseSession = {
  id: 's-1',
  assignmentId: 'a-1',
  taskId: null,
  status: 'ACTIVE' as const,
  startTime: '2026-10-30T10:00:00.000Z',
  endTime: null,
  elapsedSeconds: 120,
  durationMinutes: 0,
  plannedMinutes: 50,
  notes: null,
  createdAt: '2026-10-30T10:00:00.000Z',
  updatedAt: '2026-10-30T10:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedCurrent.mockResolvedValue(baseSession);
});

describe('useFocusSession recovery mapping', () => {
  it('maps ACTIVE to running with anchor', async () => {
    const { result } = renderHook(() => useFocusSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session?.status).toBe('ACTIVE');
    expect(result.current.displayedElapsed).toBe(120);
  });

  it('maps PAUSED', async () => {
    mockedCurrent.mockResolvedValue({ ...baseSession, status: 'PAUSED', elapsedSeconds: 90 });
    const { result } = renderHook(() => useFocusSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session?.status).toBe('PAUSED');
    expect(result.current.displayedElapsed).toBe(90);
  });

  it('maps null to no session', async () => {
    mockedCurrent.mockResolvedValue(null);
    const { result } = renderHook(() => useFocusSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session).toBeNull();
  });
});

describe('useFocusSession anchor/re-anchor', () => {
  it('re-anchors on pause response', async () => {
    mockedPause.mockResolvedValue({ ...baseSession, status: 'PAUSED', elapsedSeconds: 125 });
    const { result } = renderHook(() => useFocusSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.pause();
    });
    expect(result.current.session?.status).toBe('PAUSED');
    expect(result.current.displayedElapsed).toBe(125);
  });
});

describe('useFocusSession in-flight guard', () => {
  it('ignores a second submit while busy', async () => {
    let resolvePause!: (v: StudySession) => void;
    mockedPause.mockImplementation(() => new Promise((res) => (resolvePause = res)));
    const { result } = renderHook(() => useFocusSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      void result.current.pause();
    });
    expect(result.current.busyAction).toBe('pause');

    // second call ignored
    await act(async () => {
      await result.current.pause();
    });
    expect(mockedPause).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePause({ ...baseSession, status: 'PAUSED', elapsedSeconds: 125 });
    });
    await waitFor(() => expect(result.current.busyAction).toBeNull());
  });
});

describe('useFocusSession tick', () => {
  it('clears interval on pause (no ticking)', async () => {
    mockedPause.mockResolvedValue({ ...baseSession, status: 'PAUSED', elapsedSeconds: 125 });
    const { result } = renderHook(() => useFocusSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.pause();
    });
    const before = result.current.displayedElapsed;
    await new Promise((r) => setTimeout(r, 1100));
    expect(result.current.displayedElapsed).toBe(before);
  });

  it('ticks while active', async () => {
    const { result } = renderHook(() => useFocusSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const before = result.current.displayedElapsed;
    await new Promise((r) => setTimeout(r, 1100));
    expect(result.current.displayedElapsed).toBeGreaterThanOrEqual(before + 1);
  });
});
