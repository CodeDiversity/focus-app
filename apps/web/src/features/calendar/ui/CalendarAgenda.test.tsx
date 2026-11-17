import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarAgenda } from './CalendarAgenda';
import { CalendarEventChip } from './CalendarEventChip';
import type { CalendarDay, CalendarEvent } from '@/entities/calendar/model/types';

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

const WEEK = [
  '2026-10-26',
  '2026-10-27',
  '2026-10-28',
  '2026-10-29',
  '2026-10-30',
  '2026-10-31',
  '2026-11-01',
]; // Mon 26 – Sun 01
// EP15E: the payload's days[] — bounds and free time exist every day.
const days: CalendarDay[] = WEEK.map((date) => ({
  date,
  wakeTime: '08:00',
  sleepTime: '23:00',
  free:
    date === '2026-10-26'
      ? [
          { startTime: '10:00', endTime: '12:00' },
          { startTime: '12:00', endTime: '12:15' },
        ]
      : [{ startTime: '08:00', endTime: '23:00' }],
}));

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

    // EP15E (D-E4): every day is listed — bounds and free time exist every day.
    for (const name of [
      'Mon 26',
      'Tue 27',
      'Wed 28 (today)',
      'Thu 29',
      'Fri 30',
      'Sat 31',
      'Sun 1',
    ]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }

    // Exactly once: two Calculus/lab entries and two Physics entries via their
    // unique accessible names.
    // EP14D (D-D3): names come from the visible content, in the agenda's
    // visible order (type, time, title).
    expect(screen.getAllByRole('button', { name: /^Class\b.*09:00.*Calculus/ })).toHaveLength(1);
    expect(
      screen.getAllByRole('button', { name: /^Assignment\b.*23:59.*Lab report/ })
    ).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /^Class\b.*11:00.*Physics/ })).toHaveLength(1);
    expect(
      screen.getAllByRole('button', { name: /^Assignment\b.*12:00.*Done essay/ })
    ).toHaveLength(1);

    // Within the Mon group, payload order (startTime order) is preserved.
    const monGroup = screen.getByRole('group', { name: /Mon 26/ });
    const monButtons = within(monGroup).getAllByRole('button');
    expect(monButtons).toHaveLength(2);
    expect(monButtons[0]).toHaveAccessibleName(/^Class\b.*09:00.*Calculus/);
    expect(monButtons[1]).toHaveAccessibleName(/^Assignment\b.*23:59.*Lab report/);
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
    await user.click(screen.getByRole('button', { name: /^Class\b.*11:00.*Physics/ }));
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
    const physics = screen.getByRole('button', { name: /^Class\b.*11:00.*Physics/ });
    const text = physics.textContent ?? '';
    expect(text.indexOf('11:00')).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('11:00')).toBeLessThan(text.indexOf('Physics'));
  });

  it('an entirely empty payload still lists the seven days with their bounds and free time, and no entries (EP15E supersedes R129-002)', () => {
    render(
      <CalendarAgenda
        days={days}
        eventsByDay={new Map()}
        today="2026-10-28"
        onOpenEvent={vi.fn()}
      />
    );
    // D129A-05: the page owns the empty-week copy; the agenda shows the days as they are.
    const agenda = screen.getByRole('list', { name: 'Week agenda' });
    expect(within(agenda).getAllByRole('listitem')).toHaveLength(7);
    expect(within(agenda).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getAllByText('Free · 08:00–23:00')).toHaveLength(6);
  });

  it("EP15E-AC4: lists all seven days, each with a bounds line 'Day 08:00–23:00', items and free lines in time order (D-E4)", () => {
    render(
      <CalendarAgenda
        days={days}
        eventsByDay={eventsByDay}
        today="2026-10-28"
        onOpenEvent={vi.fn()}
      />
    );
    expect(screen.getAllByText('Day 08:00–23:00')).toHaveLength(7);
    const mon = screen.getByRole('group', { name: /Mon 26/ });
    const texts = Array.from(mon.children).map((c) => c.textContent ?? '');
    // 09:00 class, then the 10:00–12:00 free line, then the 23:59 deadline.
    expect(texts[0]).toMatch(/Class.*09:00.*Calculus/);
    expect(texts[1]).toBe('Free · 10:00–12:00');
    expect(texts[2]).toMatch(/Assignment.*23:59.*Lab report/);
  });

  it('EP15E-AC4: free lines use the same 60-minute threshold as the grid (D-E7 overridden)', () => {
    render(
      <CalendarAgenda
        days={days}
        eventsByDay={eventsByDay}
        today="2026-10-28"
        onOpenEvent={vi.fn()}
      />
    );
    expect(screen.getByText('Free · 10:00–12:00')).toBeInTheDocument();
    expect(screen.queryByText('Free · 12:00–12:15')).toBeNull();
    // D-E10: agenda chips show the range, so lengths are comparable at a glance.
    expect(
      screen.getByRole('button', { name: /^Class\b.*09:00–10:00.*Calculus/ })
    ).toBeInTheDocument();
  });

  it('EP15E-AC4: activating an item opens the same details dialog (hands the event up)', async () => {
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
    await user.click(screen.getByRole('button', { name: /^Assignment\b.*23:59.*Lab report/ }));
    expect(onOpen).toHaveBeenCalledWith(events[1]);
  });

  it('the week-layout chip keeps the title above the time (contrast check)', () => {
    const { container } = render(<CalendarEventChip event={events[2]} onOpen={vi.fn()} />);
    const text = container.querySelector('button')?.textContent ?? '';
    expect(text.indexOf('Physics')).toBeLessThan(text.indexOf('11:00'));
  });
});
