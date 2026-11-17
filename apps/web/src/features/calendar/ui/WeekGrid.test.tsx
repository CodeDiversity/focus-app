import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeekGrid } from './WeekGrid';
import type { CalendarDay, CalendarEvent } from '@/entities/calendar/model/types';

const WEEK = [
  '2026-10-26',
  '2026-10-27',
  '2026-10-28',
  '2026-10-29',
  '2026-10-30',
  '2026-10-31',
  '2026-11-01',
];
const days = (overrides: Partial<Record<string, Partial<CalendarDay>>> = {}): CalendarDay[] =>
  WEEK.map((date) => ({
    date,
    wakeTime: '08:00',
    sleepTime: '23:00',
    free: [{ startTime: '08:00', endTime: '23:00' }],
    ...overrides[date],
  }));
const ev = (o: Partial<CalendarEvent> & { id: string }): CalendarEvent =>
  ({
    type: 'CLASS',
    title: 'Calculus',
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
    ...o,
  }) as CalendarEvent;
const byDay = (events: CalendarEvent[]) => {
  const m = new Map<string, CalendarEvent[]>();
  for (const e of events) m.set(e.date, [...(m.get(e.date) ?? []), e]);
  return m;
};
const renderGrid = (events: CalendarEvent[], d = days(), onOpen = vi.fn(), today = '2026-10-28') =>
  render(<WeekGrid days={d} eventsByDay={byDay(events)} today={today} onOpenEvent={onOpen} />);
const column = (date: string) => document.querySelector(`[data-day="${date}"]`) as HTMLElement;

describe('WeekGrid (EP15E)', () => {
  it('EP15E-AC1: renders seven day columns, an hour axis from the computed range, and the all-day row above the hours', () => {
    const { container } = renderGrid([]);
    expect(screen.getByRole('list', { name: 'Week view' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-day]')).toHaveLength(7);
    expect(screen.getByText('07:00')).toBeInTheDocument(); // defaults → 07:00–24:00
    expect(screen.getByText('23:00')).toBeInTheDocument();
    expect(screen.queryByText('06:00')).not.toBeInTheDocument();
    expect(screen.getByText('All day')).toBeInTheDocument();
    expect(screen.getByText('Mon 26')).toBeInTheDocument();
    const todayHeader = screen.getByText('Wed 28').closest('[data-today]');
    expect(todayHeader).toHaveTextContent('(today)');
  });

  it('EP15E-AC1: each timed item carries data-start/data-end minutes and a grid-row span matching its times (EVENT, CLASS, STUDY_SESSION, FIXED PLANNED_SESSION, STUDY_BLOCK)', () => {
    renderGrid([
      ev({ id: 'c', type: 'CLASS', startTime: '09:00', endTime: '10:00' }),
      ev({
        id: 'e',
        type: 'EVENT',
        title: 'Busy',
        startTime: '12:00',
        endTime: '13:30',
        date: '2026-10-27',
      }),
      ev({
        id: 's',
        type: 'STUDY_SESSION',
        startTime: '14:00',
        endTime: '15:00',
        date: '2026-10-28',
      }),
      ev({
        id: 'p',
        type: 'PLANNED_SESSION',
        anchor: 'FIXED',
        startTime: '16:00',
        endTime: '17:00',
        date: '2026-10-29',
      }),
      ev({
        id: 'b',
        type: 'STUDY_BLOCK',
        title: 'Study',
        startTime: '18:00',
        endTime: '20:00',
        date: '2026-10-30',
      }),
    ]);
    const spans = [
      ['CLASS', 540, 600, '9 / 13'],
      ['EVENT', 720, 810, '21 / 27'],
      ['STUDY_SESSION', 840, 900, '29 / 33'],
      ['PLANNED_SESSION', 960, 1020, '37 / 41'],
      ['STUDY_BLOCK', 1080, 1200, '45 / 53'],
    ] as const;
    for (const [kind, start, end, row] of spans) {
      const el = document.querySelector(`[data-kind="${kind}"]`) as HTMLElement;
      expect(el.dataset.start).toBe(String(start));
      expect(el.dataset.end).toBe(String(end));
      expect(el.style.gridRow).toBe(row);
    }
  });

  it('EP15E-AC1: deadlines and FLEX_DAY planned sessions render in the all-day row, never in the hours', () => {
    renderGrid([
      ev({
        id: 'd',
        type: 'ASSIGNMENT_DEADLINE',
        title: 'Essay',
        startTime: '23:59',
        endTime: null,
      }),
      ev({
        id: 'x',
        type: 'EXAM_DEADLINE',
        title: 'Midterm',
        startTime: '09:00',
        endTime: null,
        date: '2026-10-27',
      }),
      ev({
        id: 'f',
        type: 'PLANNED_SESSION',
        anchor: 'FLEX_DAY',
        title: 'Reading',
        startTime: '10:00',
        endTime: '11:00',
      }),
    ]);
    const allDayMon = document.querySelector('[data-all-day-for="2026-10-26"]') as HTMLElement;
    expect(
      within(allDayMon).getByRole('button', { name: /^Assignment\b.*Essay/ })
    ).toBeInTheDocument();
    expect(
      within(allDayMon).getByRole('button', { name: /^Planned\b.*Reading.*Anytime/ })
    ).toBeInTheDocument();
    expect(within(column('2026-10-26')).queryAllByRole('button')).toHaveLength(0);
    expect(document.querySelector('[data-kind]')).toBeNull();
  });

  it("EP15E-AC1: every kind shows a lucide icon and a visible text label; no kind relies on colour (EVENT 'Busy', STUDY_BLOCK 'Study block')", () => {
    renderGrid([
      ev({ id: 'e', type: 'EVENT', title: 'Dentist', startTime: '12:00', endTime: '13:00' }),
      ev({
        id: 'b',
        type: 'STUDY_BLOCK',
        title: 'Deep work',
        startTime: '18:00',
        endTime: '20:00',
      }),
      ev({ id: 'c', type: 'CLASS', startTime: '09:00', endTime: '10:00' }),
    ]);
    const busy = screen.getByRole('button', { name: /^Busy\b.*Dentist.*12:00–13:00/ });
    expect(busy.querySelector('svg')).not.toBeNull();
    const block = screen.getByRole('button', { name: /^Study block\b.*Deep work.*18:00–20:00/ });
    expect(block.querySelector('svg')).not.toBeNull();
    expect(
      screen.getByRole('button', { name: /^Class\b.*Calculus.*09:00–10:00/ })
    ).toBeInTheDocument();
  });

  it("EP15E-AC1: a chip equal to its default title ('Busy'/'Study') shows the kind label once", () => {
    renderGrid([
      ev({ id: 'e', type: 'EVENT', title: 'Busy', startTime: '12:00', endTime: '13:00' }),
      ev({ id: 'b', type: 'STUDY_BLOCK', title: 'Study', startTime: '18:00', endTime: '20:00' }),
    ]);
    const busy = screen.getByRole('button', { name: /^Busy\b/ });
    expect(busy.textContent?.match(/Busy/g)).toHaveLength(1);
    const block = screen.getByRole('button', { name: /^Study block\b/ });
    expect(block.textContent?.match(/Study/g)).toHaveLength(1);
  });

  it('EP15E-AC1: density tiers — ≥ 60 min shows label, title and time; 30–59 min shows label and title with the time sr-only; < 30 min shows icon and title with label and time sr-only; the accessible name is complete in every tier (D-E8)', () => {
    renderGrid([
      ev({ id: 'full', title: 'Long', startTime: '09:00', endTime: '10:00' }),
      ev({ id: 'compact', title: 'Mid', startTime: '11:00', endTime: '11:45', date: '2026-10-27' }),
      ev({ id: 'mini', title: 'Short', startTime: '13:00', endTime: '13:15', date: '2026-10-28' }),
    ]);
    const full = screen.getByRole('button', { name: /^Class\b.*Long.*09:00–10:00/ });
    expect(full.dataset.tier).toBe('full');
    expect(within(full).getByText('09:00–10:00').parentElement).not.toHaveClass('sr-only');
    const compact = screen.getByRole('button', { name: /^Class\b.*Mid.*11:00–11:45/ });
    expect(compact.dataset.tier).toBe('compact');
    expect(within(compact).getByText('11:00–11:45').parentElement).toHaveClass('sr-only');
    expect(within(compact).getByText(/Class/)).not.toHaveClass('sr-only');
    const mini = screen.getByRole('button', { name: /^Class\b.*Short.*13:00–13:15/ });
    expect(mini.dataset.tier).toBe('mini');
    expect(within(mini).getByText(/Class/)).toHaveClass('sr-only');
    expect(within(mini).getByText('13:00–13:15').parentElement).toHaveClass('sr-only');
    expect(within(mini).getByText('Short')).not.toHaveClass('sr-only');
  });

  it('EP15E-AC1: click and Enter on any chip call onOpenEvent with the event', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const cls = ev({ id: 'c' });
    const zone = ev({
      id: 'z',
      type: 'STUDY_BLOCK',
      title: 'Study',
      startTime: '18:00',
      endTime: '20:00',
    });
    renderGrid([cls, zone], days(), onOpen);
    await user.click(screen.getByRole('button', { name: /^Class\b/ }));
    expect(onOpen).toHaveBeenLastCalledWith(cls);
    screen.getByRole('button', { name: /^Study block\b/ }).focus();
    await user.keyboard('{Enter}');
    expect(onOpen).toHaveBeenLastCalledWith(zone);
  });

  it("EP15E-AC2: the before/after shaded regions have role img and the exact accessible names 'Before your day starts' / 'After your day ends'; the visible captions read 'Day starts 08:00' / 'Day ends 23:00' and are aria-hidden", () => {
    renderGrid([]);
    const mon = column('2026-10-26');
    const before = within(mon).getByRole('img', { name: 'Before your day starts' });
    const after = within(mon).getByRole('img', { name: 'After your day ends' });
    expect(before.style.gridRow).toBe('1 / 5'); // 07:00–08:00
    expect(after.style.gridRow).toBe('65 / 69'); // 23:00–24:00
    expect(within(before).getByText('Day starts 08:00')).toHaveAttribute('aria-hidden', 'true');
    expect(within(after).getByText('Day ends 23:00')).toHaveAttribute('aria-hidden', 'true');
  });

  it("EP15E-AC2: a 24:00 sleep value renders no 'after' region", () => {
    renderGrid(
      [],
      days({
        '2026-10-26': { sleepTime: '24:00', free: [{ startTime: '08:00', endTime: '24:00' }] },
      })
    );
    const mon = column('2026-10-26');
    expect(within(mon).queryByRole('img', { name: 'After your day ends' })).toBeNull();
    expect(
      within(column('2026-10-27')).getByRole('img', { name: 'After your day ends' })
    ).toBeInTheDocument();
  });

  it("EP15E-AC2: free pieces ≥ 30 min read 'Free · 14:00–16:00'; shorter pieces are drawn with aria-hidden and no text", () => {
    renderGrid(
      [],
      days({
        '2026-10-26': {
          free: [
            { startTime: '14:00', endTime: '16:00' },
            { startTime: '17:00', endTime: '17:15' },
          ],
        },
      })
    );
    const mon = column('2026-10-26');
    expect(within(mon).getByText('Free · 14:00–16:00')).toBeInTheDocument();
    const short = mon.querySelector('[data-free="17:00-17:15"]') as HTMLElement;
    expect(short).toHaveAttribute('aria-hidden', 'true');
    expect(short.textContent).toBe('');
    expect(short.style.gridRow).toBe('41 / 42');
  });

  it('EP15E-AC2: free pieces and shaded regions are not focusable (D-E2)', () => {
    renderGrid([], days({ '2026-10-26': { free: [{ startTime: '14:00', endTime: '16:00' }] } }));
    const mon = column('2026-10-26');
    expect(within(mon).queryAllByRole('button')).toHaveLength(0);
    for (const el of mon.querySelectorAll('[data-free], [role="img"]')) {
      expect(el.getAttribute('tabindex')).toBeNull();
    }
  });

  it('EP15E-AC4: tab order within a day is time order, all-day row first; focus ring class present', () => {
    renderGrid([
      ev({ id: 'late', title: 'Late', startTime: '15:00', endTime: '16:00' }),
      ev({ id: 'early', title: 'Early', startTime: '09:00', endTime: '10:00' }),
      ev({
        id: 'd',
        type: 'ASSIGNMENT_DEADLINE',
        title: 'Essay',
        startTime: '23:59',
        endTime: null,
      }),
      ev({ id: 'z', type: 'STUDY_BLOCK', title: 'Study', startTime: '12:00', endTime: '13:00' }),
    ]);
    const names = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(names.findIndex((n) => n.includes('Essay'))).toBe(0);
    expect(names.findIndex((n) => n.includes('Early'))).toBeLessThan(
      names.findIndex((n) => n.includes('Study'))
    );
    expect(names.findIndex((n) => n.includes('Study'))).toBeLessThan(
      names.findIndex((n) => n.includes('Late'))
    );
    expect(screen.getByRole('button', { name: /Early/ }).className).toMatch(/focus-visible:ring-2/);
  });

  it('EP15E-AC4: introduces no animation without its reduced-motion companion', () => {
    const { container } = renderGrid([ev({ id: 'c' })]);
    for (const el of container.querySelectorAll('[class*="animate-"], [class*="transition"]')) {
      expect(el.className).toMatch(/motion-reduce:(animate|transition)-none/);
    }
  });
});
