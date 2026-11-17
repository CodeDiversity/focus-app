import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarEventChip } from './CalendarEventChip';
import type { CalendarEvent } from '@/entities/calendar/model/types';

const baseEvent: CalendarEvent = {
  id: 'e1',
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
};

describe('CalendarEventChip (SP-127B)', () => {
  it('renders icon and text label per type (no color-only)', () => {
    const onOpen = vi.fn();
    render(<CalendarEventChip event={baseEvent} onOpen={onOpen} />);
    expect(screen.getByText('Class')).toBeInTheDocument();
    expect(screen.getByText('Calculus')).toBeInTheDocument();
    expect(screen.getByText('09:00')).toBeInTheDocument();
    // EP14D (D-D3): the name is the visible content — no aria-label.
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-label');
    expect(screen.getByRole('button')).toHaveAccessibleName(/^Class\b.*Calculus.*09:00/);
  });

  it('EP14D-AC3 (D-D3): the accessible name starts with the visible type label and follows the visible order in both layouts', () => {
    const { unmount } = render(<CalendarEventChip event={baseEvent} onOpen={vi.fn()} />);
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-label');
    expect(screen.getByRole('button')).toHaveAccessibleName(/^Class\b.*Calculus.*09:00/);
    unmount();

    render(<CalendarEventChip event={baseEvent} onOpen={vi.fn()} layout="agenda" />);
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-label');
    expect(screen.getByRole('button')).toHaveAccessibleName(/^Class\b.*09:00.*Calculus/);
  });

  it('completed deadline renders Completed badge', () => {
    const event: CalendarEvent = {
      ...baseEvent,
      id: 'e2',
      type: 'ASSIGNMENT_DEADLINE',
      title: 'Essay',
      completed: true,
    };
    render(<CalendarEventChip event={event} onOpen={vi.fn()} />);
    expect(screen.getByText('Assignment')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('study session focus adds (focus) to label', () => {
    const event: CalendarEvent = {
      ...baseEvent,
      id: 'e3',
      type: 'STUDY_SESSION',
      title: 'Focus block',
      focus: true,
    };
    render(<CalendarEventChip event={event} onOpen={vi.fn()} />);
    expect(screen.getByText('Study session (focus)')).toBeInTheDocument();
  });

  it('calls onOpen when activated', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<CalendarEventChip event={baseEvent} onOpen={onOpen} />);
    await user.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledWith(baseEvent);
  });
  it('EP13D: a planned session reads as "Planned", distinct from a logged study session', () => {
    const planned: CalendarEvent = {
      ...baseEvent,
      id: 'planned:ps-1',
      type: 'PLANNED_SESSION',
      title: 'Problem set 3',
      subtitle: 'CS101',
      link: null,
    };
    const { unmount } = render(<CalendarEventChip event={planned} onOpen={vi.fn()} />);
    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAccessibleName(/^Planned\b.*Problem set 3.*09:00/);
    unmount();

    // A finished planned session reuses the established Completed badge.
    render(<CalendarEventChip event={{ ...planned, completed: true }} onOpen={vi.fn()} />);
    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  // ===================== EP13H — flex planned sessions =====================

  it('a FLEX_DAY planned session shows "Anytime" where the time goes, in both layouts (D-H7)', () => {
    const flex = {
      ...baseEvent,
      id: 'planned:ps-flex',
      type: 'PLANNED_SESSION' as const,
      title: 'Essay',
      subtitle: null,
      link: null,
      anchor: 'FLEX_DAY' as const,
    };

    const { unmount } = render(<CalendarEventChip event={flex} onOpen={vi.fn()} />);
    expect(screen.getByText('Anytime')).toBeInTheDocument();
    expect(screen.queryByText('09:00')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAccessibleName(/^Planned\b.*Essay.*Anytime/);
    unmount();

    render(<CalendarEventChip event={flex} onOpen={vi.fn()} layout="agenda" />);
    expect(screen.getByText('Anytime')).toBeInTheDocument();
    expect(screen.queryByText('09:00')).not.toBeInTheDocument();
  });

  it('a FIXED planned session keeps its start time (EP13D behaviour unchanged)', () => {
    const fixed = {
      ...baseEvent,
      id: 'planned:ps-fixed',
      type: 'PLANNED_SESSION' as const,
      title: 'Essay',
      subtitle: null,
      link: null,
      anchor: 'FIXED' as const,
    };
    render(<CalendarEventChip event={fixed} onOpen={vi.fn()} />);
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.queryByText('Anytime')).not.toBeInTheDocument();
  });
});

describe('CalendarEventChip energy tag (EP13J-AC4, D-J6)', () => {
  const available: CalendarEvent = {
    ...baseEvent,
    id: 'availability:s1:2026-10-27',
    type: 'AVAILABILITY',
    title: 'Available',
    subtitle: 'High energy',
    courseId: null,
    courseName: null,
    courseColor: null,
    link: '/availability',
  };

  it('an available window shows its energy as text and in the accessible name', () => {
    render(<CalendarEventChip event={available} onOpen={vi.fn()} />);
    expect(screen.getByTestId('energy-tag')).toHaveTextContent('High energy');
    expect(screen.getByRole('button')).toHaveAccessibleName(
      /^Available\b.*High energy.*Available.*09:00/
    );
  });

  it('a Normal window (null subtitle) and other event types show no energy tag', () => {
    const { unmount } = render(
      <CalendarEventChip event={{ ...available, subtitle: null }} onOpen={vi.fn()} />
    );
    expect(screen.queryByTestId('energy-tag')).not.toBeInTheDocument();
    unmount();
    render(<CalendarEventChip event={baseEvent} onOpen={vi.fn()} />);
    expect(screen.queryByTestId('energy-tag')).not.toBeInTheDocument();
  });
});
