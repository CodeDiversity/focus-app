import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SemesterList, formatCalendarDate } from './SemesterList';
import type { SemesterWithCount } from '@/entities/semester/api/semesterApi';

const timestamps = { createdAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-18T12:00:00.000Z' };

/** The 8-key contract shape (SP-110A). */
const fall: SemesterWithCount = {
  id: 'sem-1',
  name: 'Fall 2026',
  startDate: '2026-09-01',
  endDate: '2026-12-15',
  isActive: true,
  courseCount: 4,
  ...timestamps,
};
const spring: SemesterWithCount = {
  id: 'sem-2',
  name: 'Spring 2026',
  startDate: '2026-01-05',
  endDate: '2026-05-10',
  isActive: false,
  courseCount: 1,
  ...timestamps,
};

describe('SemesterList', () => {
  it('renders rows in the given (API) order with readable dates, badge and course count', () => {
    render(
      <SemesterList
        semesters={[fall, spring]}
        activatingId={null}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onActivate={vi.fn()}
      />
    );

    // API order (startDate desc, then name asc) is rendered as-is — no client re-sort.
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Fall 2026');
    expect(items[1]).toHaveTextContent('Spring 2026');

    // Readable dates (yyyy-MM-dd → medium date style; no instant/time-zone shift).
    expect(items[0]).toHaveTextContent('Sep 1, 2026');
    expect(items[0]).toHaveTextContent('Dec 15, 2026');
    expect(items[1]).toHaveTextContent('Jan 5, 2026');

    // The "Active" badge appears iff isActive (D110-1 — at most one badge).
    const badges = screen.getAllByText('Active');
    expect(badges).toHaveLength(1);
    expect(badges[0].closest('li')).toBe(items[0]);

    // Course count (D110-3), singular and plural.
    expect(items[0]).toHaveTextContent('4 courses');
    expect(items[1]).toHaveTextContent('1 course');
  });

  it('offers per-row Edit, Delete and activation actions with unambiguous labels', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onActivate = vi.fn();
    const user = userEvent.setup();
    render(
      <SemesterList
        semesters={[fall, spring]}
        activatingId={null}
        onEdit={onEdit}
        onDelete={onDelete}
        onActivate={onActivate}
      />
    );

    // The active row offers "Deactivate"; the non-active row offers "Set as active" (D110-1).
    await user.click(screen.getByRole('button', { name: /deactivate fall 2026/i }));
    expect(onActivate).toHaveBeenCalledWith(fall, false);

    await user.click(screen.getByRole('button', { name: /set spring 2026 as active/i }));
    expect(onActivate).toHaveBeenCalledWith(spring, true);

    await user.click(screen.getByRole('button', { name: /edit spring 2026/i }));
    expect(onEdit).toHaveBeenCalledWith(spring);

    await user.click(screen.getByRole('button', { name: /delete fall 2026/i }));
    expect(onDelete).toHaveBeenCalledWith(fall);
  });

  it('shows the per-row pending state while an activation is in flight', () => {
    render(
      <SemesterList
        semesters={[fall, spring]}
        activatingId="sem-2"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onActivate={vi.fn()}
      />
    );

    // The in-flight row's activation button is loading (disabled); the other
    // row stays fully interactive.
    expect(screen.getByRole('button', { name: /set spring 2026 as active/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /deactivate fall 2026/i })).toBeEnabled();
    // Editing/deleting the in-flight row is blocked too.
    expect(screen.getByRole('button', { name: /edit spring 2026/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /delete spring 2026/i })).toBeDisabled();
  });
});

describe('formatCalendarDate', () => {
  it('formats a valid yyyy-MM-dd calendar date in the browser zone without shifting it', () => {
    expect(formatCalendarDate('2026-09-01')).toBe(
      new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(2026, 8, 1))
    );
  });

  it('falls back to the raw string for malformed input', () => {
    expect(formatCalendarDate('not-a-date')).toBe('not-a-date');
  });
});
