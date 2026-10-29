import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarAgenda } from './CalendarAgenda';
import { CalendarEventChip } from './CalendarEventChip';
import type { CalendarEvent } from '@/entities/calendar/model/types';

const baseEvent: Omit<CalendarEvent, 'id' | 'type' | 'title'> = {
  subtitle: null,
  date: '2026-10-26',
  startTime: '09:00',
  endTime: '10:00',
  courseId: null,
  courseName: null,
  courseColor: null,
  assignmentId: null,
  completed: false,
  focus: false,
  link: null,
};

function event(overrides: Partial<CalendarEvent> & { id: string }): CalendarEvent {
  // Pragmatic test builder — Partial overrides never remove the base fields.
  return { ...baseEvent, ...overrides } as CalendarEvent;
}

const days = [
  '2026-10-26',
  '2026-10-27',
  '2026-10-28',
  '2026-10-29',
  '2026-10-30',
  '2026-10-31',
  '2026-11-01',
]; // Mon 26 – Sun 01

const events: CalendarEvent[] = [
  event({ id: 'a', type: 'CLASS', title: 'Calculus', date: '2026-10-26', startTime: '09:00' }),
  event({
    id: 'b',
    type: 'ASSIGNMENT_DEADLINE',
    title: 'Lab report',
    date: '2026-10-26',
    startTime: '23:59',
    endTime: null,
  }),
  event({ id: 'c', type: 'CLASS', title: 'Physics', date: '2026-10-31', startTime: '11:00' }),
  event({
    id: 'd',
    type: 'ASSIGNMENT_DEADLINE',
    title: 'Done essay',
    date: '2026-10-31',
    startTime: '12:00',
    endTime: null,
    completed: true,
  }),
];

const eventsByDay = new Map<string, CalendarEvent[]>([
  ['2026-10-26', [events[0], events[1]]],
  ['2026-10-31', [events[2], events[3]]],
]);

describe('CalendarAgenda (SP-129A)', () => {
  it('groups events by day in payload order and renders each event exactly once', () => {
    const onOpen = vi.fn();
    render(
      <CalendarAgenda
        days={days}
        eventsByDay={eventsByDay}
        today="2026-10-28"
        onOpenEvent={onOpen}
      />
    );

    // Only days with events are grouped (Mon 26, Sat 31); Tue–Fri and Sun omitted.
    expect(screen.getByRole('heading', { name: 'Mon 26' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sat 31' })).toBeInTheDocument();
    for (const absent of ['Tue 27', 'Wed 28', 'Thu 29', 'Fri 30', 'Sun 1']) {
      expect(screen.queryByRole('heading', { name: absent })).not.toBeInTheDocument();
    }

    // Exactly once: two Calculus/lab entries and two Physics entries via their
    // unique accessible names.
    expect(screen.getAllByRole('button', { name: 'Class: Calculus, 09:00' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Assignment: Lab report, 23:59' })).toHaveLength(
      1
    );
    expect(screen.getAllByRole('button', { name: 'Class: Physics, 11:00' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Assignment: Done essay, 12:00' })).toHaveLength(
      1
    );

    // Within the Mon group, payload order (startTime order) is preserved.
    const monGroup = screen.getByRole('group', { name: /Mon 26/ });
    const monButtons = within(monGroup).getAllByRole('button');
    expect(monButtons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Class: Calculus, 09:00',
      'Assignment: Lab report, 23:59',
    ]);
  });

  it('shows the type label as text (not color only) and the Completed badge text', () => {
    render(
      <CalendarAgenda
        days={days}
        eventsByDay={eventsByDay}
        today="2026-10-28"
        onOpenEvent={vi.fn()}
      />
    );
    // Text, not only color: each class/assignment entry shows its type label,
    // and the completed deadline shows its "Completed" badge.
    expect(screen.getAllByText('Class')).toHaveLength(2);
    expect(screen.getAllByText('Assignment')).toHaveLength(2);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('each day group is labelled by its header', () => {
    render(
      <CalendarAgenda
        days={days}
        eventsByDay={eventsByDay}
        today="2026-10-28"
        onOpenEvent={vi.fn()}
      />
    );
    const monGroup = screen.getByRole('group', { name: /Mon 26/ });
    const headerId = monGroup.getAttribute('aria-labelledby');
    expect(headerId).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Mon 26' })).toHaveAttribute('id', headerId ?? '');
  });

  it('activating an entry hands the event to onOpenEvent', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <CalendarAgenda
        days={days}
        eventsByDay={eventsByDay}
        today="2026-10-28"
        onOpenEvent={onOpen}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Class: Physics, 11:00' }));
    expect(onOpen).toHaveBeenCalledWith(events[2]);
  });

  it('agenda entries show the time above the title (D129A-03, R129-001)', () => {
    render(
      <CalendarAgenda
        days={days}
        eventsByDay={eventsByDay}
        today="2026-10-28"
        onOpenEvent={vi.fn()}
      />
    );
    const physics = screen.getByRole('button', { name: 'Class: Physics, 11:00' });
    const text = physics.textContent ?? '';
    expect(text.indexOf('11:00')).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('11:00')).toBeLessThan(text.indexOf('Physics'));
  });

  it('an entirely empty payload renders no day groups and no entries (R129-002)', () => {
    render(
      <CalendarAgenda
        days={days}
        eventsByDay={new Map()}
        today="2026-10-28"
        onOpenEvent={vi.fn()}
      />
    );
    // D129A-05: the page owns the empty week; the agenda itself has nothing.
    const agenda = screen.getByRole('list', { name: 'Week agenda' });
    expect(agenda).toBeInTheDocument();
    expect(within(agenda).queryByRole('listitem')).not.toBeInTheDocument();
    expect(within(agenda).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('the week-layout chip keeps the title above the time (contrast check)', () => {
    const { container } = render(<CalendarEventChip event={events[2]} onOpen={vi.fn()} />);
    const text = container.querySelector('button')?.textContent ?? '';
    expect(text.indexOf('Physics')).toBeLessThan(text.indexOf('11:00'));
  });
});
