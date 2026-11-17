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

describe('CalendarEventChip — schedule blocks (EP15E-AC1)', () => {
  const busy: CalendarEvent = {
    ...baseEvent,
    id: 'event:b1:2026-10-27',
    type: 'EVENT',
    title: 'Dentist',
    subtitle: null,
    courseId: null,
    courseName: null,
    courseColor: null,
    link: null,
    blockId: 'b1',
    recurring: false,
    energy: null,
  };
  const block: CalendarEvent = {
    ...busy,
    id: 'study-block:b2:2026-10-27',
    type: 'STUDY_BLOCK',
    title: 'Deep work',
    subtitle: 'CS101',
    blockId: 'b2',
    recurring: true,
    energy: 'HIGH',
  };

  it("EP15E-AC1: EVENT reads 'Busy' with the Briefcase icon; STUDY_BLOCK reads 'Study block' with the BookOpen icon", () => {
    const { unmount } = render(<CalendarEventChip event={busy} onOpen={vi.fn()} />);
    expect(screen.getByText('Busy')).toBeInTheDocument();
    expect(screen.getByRole('button').querySelector('svg.lucide-briefcase')).not.toBeNull();
    expect(screen.getByRole('button')).toHaveAccessibleName(/^Busy\b.*Dentist.*09:00/);
    unmount();
    render(<CalendarEventChip event={block} onOpen={vi.fn()} />);
    expect(screen.getByText('Study block')).toBeInTheDocument();
    expect(screen.getByRole('button').querySelector('svg.lucide-book-open')).not.toBeNull();
    expect(screen.getByRole('button')).toHaveAccessibleName(
      /^Study block\b.*High energy.*Deep work.*repeats weekly.*09:00/
    );
  });

  it("EP15E-AC1: a recurring item shows the Repeat icon with sr-only 'repeats weekly'; a one-off shows none", () => {
    const { unmount } = render(<CalendarEventChip event={block} onOpen={vi.fn()} />);
    expect(screen.getByTestId('repeat-marker')).toBeInTheDocument();
    expect(screen.getByText('repeats weekly')).toHaveClass('sr-only');
    unmount();
    render(<CalendarEventChip event={busy} onOpen={vi.fn()} />);
    expect(screen.queryByTestId('repeat-marker')).toBeNull();
    expect(screen.queryByText('repeats weekly')).toBeNull();
  });

  it("EP15E-AC1: STUDY_BLOCK energy HIGH/LOW shows the text tag 'High energy'/'Low energy'; NORMAL shows no tag (D-J6 carried over)", () => {
    const { unmount } = render(<CalendarEventChip event={block} onOpen={vi.fn()} />);
    expect(screen.getByTestId('energy-tag')).toHaveTextContent('High energy');
    unmount();
    const { unmount: u2 } = render(
      <CalendarEventChip event={{ ...block, energy: 'LOW' }} onOpen={vi.fn()} />
    );
    expect(screen.getByTestId('energy-tag')).toHaveTextContent('Low energy');
    u2();
    const { unmount: u3 } = render(
      <CalendarEventChip event={{ ...block, energy: 'NORMAL' }} onOpen={vi.fn()} />
    );
    expect(screen.queryByTestId('energy-tag')).toBeNull();
    u3();
    render(<CalendarEventChip event={{ ...busy, energy: 'HIGH' }} onOpen={vi.fn()} />);
    expect(screen.queryByTestId('energy-tag')).toBeNull(); // energy is a study-block thing
  });

  it('EP15E-AC1 (EP14D D-D3 kept): the accessible name follows the visible order in week, agenda and grid layouts', () => {
    const { unmount } = render(<CalendarEventChip event={busy} onOpen={vi.fn()} layout="week" />);
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-label');
    expect(screen.getByRole('button')).toHaveAccessibleName(/^Busy\b.*Dentist.*09:00/);
    unmount();
    const { unmount: u2 } = render(
      <CalendarEventChip event={busy} onOpen={vi.fn()} layout="agenda" />
    );
    expect(screen.getByRole('button')).toHaveAccessibleName(/^Busy\b.*09:00.*Dentist/);
    u2();
    render(<CalendarEventChip event={busy} onOpen={vi.fn()} layout="grid" heightPx={20} />);
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-label');
    expect(screen.getByRole('button')).toHaveAccessibleName(/^Busy\b.*Dentist.*09:00–10:00/);
  });
});
