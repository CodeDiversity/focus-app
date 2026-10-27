import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateAssignment } from '@/entities/assignment/api/assignmentApi';
import type { AssignmentInteractionItem } from './types';
import { useAssignmentActions } from './useAssignmentActions';

vi.mock('@/entities/assignment/api/assignmentApi', () => ({
  updateAssignment: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));

const item: AssignmentInteractionItem = {
  id: 'asgn-1',
  title: 'Problem Set 4',
  description: null,
  dueDate: '2026-10-12T12:00:00.000Z',
  estimatedHours: 3,
  status: 'PENDING',
  priority: 'MEDIUM',
  type: 'HOMEWORK',
  subtasks: [],
};

const options = () => ({
  items: [item],
  onChanged: vi.fn(),
  onSubtaskChanged: vi.fn(),
  onSubtaskRefresh: vi.fn(),
});

describe('useAssignmentActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PATCHes only the assignment id and status', async () => {
    vi.mocked(updateAssignment).mockResolvedValue({ ...item, status: 'COMPLETED' } as never);
    const opts = options();
    const { result } = renderHook(() => useAssignmentActions(opts));

    await act(async () => {
      await result.current.handleStatusChange(item, 'COMPLETED');
    });

    expect(updateAssignment).toHaveBeenCalledWith('asgn-1', { status: 'COMPLETED' });
  });

  it('keeps busy state isolated between two hook instances', () => {
    const first = renderHook(() => useAssignmentActions(options()));
    const second = renderHook(() => useAssignmentActions(options()));

    act(() => first.result.current.setAssignmentBusy('asgn-1', true));

    expect(first.result.current.busyIds.has('asgn-1')).toBe(true);
    expect(second.result.current.busyIds.has('asgn-1')).toBe(false);
  });

  it('resets expanded ids when the items array identity changes', () => {
    const initial = [item];
    const { result, rerender } = renderHook(
      ({ items }: { items: AssignmentInteractionItem[] }) =>
        useAssignmentActions({ ...options(), items }),
      { initialProps: { items: initial } }
    );

    act(() => result.current.toggleExpanded('asgn-1'));
    expect(result.current.expandedIds.has('asgn-1')).toBe(true);

    // A new array with the same row id is an ordinary refetch (D124-5).
    rerender({ items: [{ ...item }] });
    expect(result.current.expandedIds.has('asgn-1')).toBe(false);
  });

  it('keeps expanded ids when the items identity is unchanged', () => {
    const initial = [item];
    const { result, rerender } = renderHook(
      ({ items }: { items: AssignmentInteractionItem[] }) =>
        useAssignmentActions({ ...options(), items }),
      { initialProps: { items: initial } }
    );

    act(() => result.current.toggleExpanded('asgn-1'));
    rerender({ items: initial });

    expect(result.current.expandedIds.has('asgn-1')).toBe(true);
  });

  it('uses the latest onStatusChanged after the host re-renders (R-124-001)', async () => {
    let resolvePatch!: (value: unknown) => void;
    vi.mocked(updateAssignment).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePatch = resolve;
        }) as never
    );
    const firstCallback = vi.fn();
    const latestCallback = vi.fn();
    const stableItems = [item];
    const { result, rerender } = renderHook(
      ({ onStatusChanged }: { onStatusChanged: (status: string) => void }) =>
        useAssignmentActions({ ...options(), items: stableItems, onStatusChanged }),
      { initialProps: { onStatusChanged: firstCallback } }
    );

    act(() => {
      void result.current.handleStatusChange(item, 'COMPLETED');
    });
    rerender({ onStatusChanged: latestCallback });

    await act(async () => {
      resolvePatch({ ...item, status: 'COMPLETED' });
    });

    expect(latestCallback).toHaveBeenCalledWith('COMPLETED');
    expect(firstCallback).not.toHaveBeenCalled();
  });
});
