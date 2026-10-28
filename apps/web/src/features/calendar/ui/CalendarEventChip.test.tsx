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
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Class: Calculus, 09:00');
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
});
