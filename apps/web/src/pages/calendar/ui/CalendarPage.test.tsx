import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Providers } from '@/test/providers';
import { CalendarPage } from './CalendarPage';
import { listCalendarEvents } from '@/entities/calendar/api/calendarApi';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@/entities/calendar/api/calendarApi', () => ({
  listCalendarEvents: vi.fn(),
}));

const mocked = vi.mocked(listCalendarEvents);

// jsdom has no matchMedia; stub it for the viewport switch. `narrow` drives
// both the initial snapshot and change events (SP-129A tests). The listener
// signature matches the real MediaQueryList addEventListener(type, callback)
// so change events can be replayed after mount (R129-005).
let narrow = false;
const mediaListeners = new Set<() => void>();
function installMatchMedia() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(max-width: 639px)' ? narrow : false,
    media: query,
    onchange: null,
    addEventListener: (_type: string, cb: () => void) => {
      mediaListeners.add(cb);
    },
    removeEventListener: (_type: string, cb: () => void) => {
      mediaListeners.delete(cb);
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
function setNarrow(value: boolean) {
  narrow = value;
  for (const listener of mediaListeners) listener();
}

const sampleEvent = {
  id: 'class:m1:2026-10-27',
  type: 'CLASS' as const,
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

const WEEK = [
  '2026-10-26',
  '2026-10-27',
  '2026-10-28',
  '2026-10-29',
  '2026-10-30',
  '2026-10-31',
  '2026-11-01',
];
const daysOf = (dates: string[], wakeTime = '08:00', sleepTime = '23:00') =>
  dates.map((date) => ({
    date,
    wakeTime,
    sleepTime,
    free: [{ startTime: wakeTime, endTime: sleepTime }],
  }));
const weekOf = (monday: string): string[] =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${monday}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });

const payload = {
  timeZone: 'America/New_York',
  today: '2026-10-28',
  from: '2026-10-26',
  to: '2026-11-01',
  days: daysOf(WEEK),
  events: [sampleEvent],
};

const validUser = userEvent.setup();

const renderPage = () =>
  render(
    <Providers initialEntries={['/calendar']}>
      <CalendarPage />
    </Providers>
  );

describe('CalendarPage (SP-127B)', () => {
  beforeEach(() => {
    // EP13H2 (F-EP13D-01/F-EP13H-04): the page derives its week from the
    // real clock while these fixtures are frozen at 2026-10-26…11-01, so the
    // suite silently broke the day the real date left that week. Freeze
    // *only* Date (timers stay real, so userEvent/waitFor are unaffected)
    // to the Wednesday of the fixtures' week.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-28T12:00:00'));
    vi.resetAllMocks();
    mediaListeners.clear();
    narrow = false;
    installMatchMedia();
    mocked.mockResolvedValue(payload);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders week header, time zone label, and one chip per event with type label', async () => {
    renderPage();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(await screen.findByText(/America\/New_York/)).toBeInTheDocument();
    expect(await screen.findByText('Class')).toBeInTheDocument();
    expect(await screen.findByText('Calculus')).toBeInTheDocument();
  });

  it('re-queries on previous/next/today', async () => {
    renderPage();
    await screen.findByText('Calculus');

    mocked.mockResolvedValue({
      ...payload,
      from: '2026-10-19',
      to: '2026-10-25',
      days: daysOf(weekOf('2026-10-19')),
      events: [],
    });
    await validUser.click(screen.getByRole('button', { name: 'Previous week' }));
    await waitFor(() => expect(mocked).toHaveBeenCalledTimes(2));

    mocked.mockResolvedValue(payload);
    await validUser.click(screen.getByRole('button', { name: 'Today' }));
    await waitFor(() => expect(mocked).toHaveBeenCalledTimes(3));
  });

  it('opens details dialog from a chip; Escape closes and focus returns', async () => {
    renderPage();
    const chip = await screen.findByRole('button', { name: /^Class\b.*Calculus.*09:00/ });
    chip.focus();
    await validUser.click(chip);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Calculus');
    await validUser.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(chip).toHaveFocus();
  });

  it('loading state', async () => {
    mocked.mockImplementation(() => new Promise(() => undefined));
    renderPage();
    expect(await screen.findByText(/Loading your calendar/i)).toBeInTheDocument();
  });

  it('empty state (EP15E-AC4 copy)', async () => {
    mocked.mockResolvedValue({ ...payload, events: [] });
    renderPage();
    expect(
      await screen.findByText('Nothing on your calendar yet — it’s all free time')
    ).toBeInTheDocument();
  });

  it('error state with retry', async () => {
    mocked.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce(payload);
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Network Error');
    await validUser.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(mocked).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Calculus')).toBeInTheDocument();
  });

  it('live region announces week and count', async () => {
    renderPage();
    await screen.findByText('Calculus');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/Showing 1 item for .* · Your day 08:00–23:00/);
  });

  it('renders the agenda instead of the week grid at a narrow viewport (SP-129A)', async () => {
    setNarrow(true);
    renderPage();
    expect(await screen.findByText('Calculus')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Week agenda' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Week view' })).not.toBeInTheDocument();
  });

  it('renders the week grid, not the agenda, at a wide viewport (SP-129A)', async () => {
    renderPage();
    expect(await screen.findByText('Calculus')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Week view' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Week agenda' })).not.toBeInTheDocument();
  });

  it('opens the details dialog from an agenda entry; Escape closes and focus returns (SP-129A)', async () => {
    setNarrow(true);
    renderPage();
    const entry = await screen.findByRole('button', { name: /^Class\b.*09:00.*Calculus/ });
    entry.focus();
    await validUser.click(entry);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Calculus');
    await validUser.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(entry).toHaveFocus();
  });

  it('EP14D-AC1: under StrictMode (as the app mounts), Escape on the agenda detail returns focus to the entry (F-EP13M-01)', async () => {
    setNarrow(true);
    render(
      <StrictMode>
        <Providers initialEntries={['/calendar']}>
          <CalendarPage />
        </Providers>
      </StrictMode>
    );
    const entry = await screen.findByRole('button', { name: /^Class\b.*09:00.*Calculus/ });
    entry.focus();
    await validUser.click(entry);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Calculus');
    await validUser.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(entry).toHaveFocus();
  });

  it('an empty week at a narrow viewport shows the empty copy once above an agenda that still lists the days (EP15E-AC4 supersedes R129-002)', async () => {
    setNarrow(true);
    mocked.mockResolvedValue({ ...payload, events: [] });
    renderPage();
    expect(
      await screen.findByText('Nothing on your calendar yet — it’s all free time')
    ).toBeInTheDocument();
    const agenda = screen.getByRole('list', { name: 'Week agenda' });
    expect(within(agenda).getAllByRole('listitem')).toHaveLength(7);
    expect(screen.queryByRole('list', { name: 'Week view' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Class/ })).not.toBeInTheDocument();
  });

  it('switches from the week view to the agenda after a live narrow resize (SP-129A, R129-005)', async () => {
    renderPage();
    expect(await screen.findByRole('list', { name: 'Week view' })).toBeInTheDocument();
    await act(async () => {
      setNarrow(true);
    });
    expect(screen.getByRole('list', { name: 'Week agenda' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Week view' })).not.toBeInTheDocument();
  });

  // ===================== EP15E — server-derived week (AC3) =====================

  describe('EP15E-AC3: the week comes from the server (FU-EP04-01)', () => {
    // Profile zone Pacific/Kiritimati (UTC+14) vs a browser at Etc/GMT+12 (UTC−12):
    // 26 hours apart. The frozen clock is 2026-10-28T12:00Z, so the UTC guess is
    // the week of 10-26 while the server's today is already Thursday 10-29.
    const kiritimati = {
      timeZone: 'Pacific/Kiritimati',
      today: '2026-10-29',
      from: '2026-10-26',
      to: '2026-11-01',
      days: daysOf(WEEK, '07:00', '22:00'),
      events: [
        { ...sampleEvent, id: 'e-thu', date: '2026-10-29', title: 'Thursday class' },
        {
          ...sampleEvent,
          id: 'e-sun',
          date: '2026-11-01',
          title: 'Sunday class',
          startTime: '20:00',
          endTime: '21:00',
        },
      ],
    };

    it('EP15E-AC3 (FU-EP04-01 a): headers are the profile zone’s week — the response’s from..to drive the seven headers', async () => {
      mocked.mockResolvedValue(kiritimati);
      renderPage();
      await screen.findByText('Thursday class');
      expect(mocked).toHaveBeenCalledWith({ from: '2026-10-26', to: '2026-11-01' });
      for (const name of ['Mon 26', 'Tue 27', 'Wed 28', 'Thu 29', 'Fri 30', 'Sat 31', 'Sun 1']) {
        expect(screen.getByText(name, { exact: false })).toBeInTheDocument();
      }
    });

    it('EP15E-AC3 (FU-EP04-01 b): every returned event renders in the column matching its civil date; none is dropped', async () => {
      mocked.mockResolvedValue(kiritimati);
      renderPage();
      await screen.findByText('Thursday class');
      const thu = document.querySelector('[data-day="2026-10-29"]') as HTMLElement;
      const sun = document.querySelector('[data-day="2026-11-01"]') as HTMLElement;
      expect(within(thu).getByRole('button', { name: /Thursday class/ })).toBeInTheDocument();
      expect(within(sun).getByRole('button', { name: /Sunday class/ })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /^Class\b/ })).toHaveLength(2);
    });

    it('EP15E-AC3 (FU-EP04-01 c): the marked column equals result.today', async () => {
      mocked.mockResolvedValue(kiritimati);
      renderPage();
      await screen.findByText('Thursday class');
      const marked = document.querySelector('[data-today]') as HTMLElement;
      expect(marked).toHaveTextContent('Thu 29');
      expect(marked).toHaveTextContent('(today)');
    });

    it('EP15E-AC3 (FU-EP04-01 d): Today requests mondayOf(result.today); previous/next request from−7/from+7 as civil strings', async () => {
      mocked.mockResolvedValue(kiritimati);
      renderPage();
      await screen.findByText('Thursday class');
      mocked.mockResolvedValue({
        ...kiritimati,
        from: '2026-10-19',
        to: '2026-10-25',
        days: daysOf(weekOf('2026-10-19')),
        events: [],
      });
      await validUser.click(screen.getByRole('button', { name: 'Previous week' }));
      await waitFor(() =>
        expect(mocked).toHaveBeenLastCalledWith({ from: '2026-10-19', to: '2026-10-25' })
      );
      mocked.mockResolvedValue({
        ...kiritimati,
        from: '2026-10-12',
        to: '2026-10-18',
        days: daysOf(weekOf('2026-10-12')),
        events: [],
      });
      await validUser.click(screen.getByRole('button', { name: 'Previous week' }));
      await waitFor(() =>
        expect(mocked).toHaveBeenLastCalledWith({ from: '2026-10-12', to: '2026-10-18' })
      );
      mocked.mockResolvedValue({
        ...kiritimati,
        from: '2026-10-19',
        to: '2026-10-25',
        days: daysOf(weekOf('2026-10-19')),
        events: [],
      });
      await validUser.click(screen.getByRole('button', { name: 'Next week' }));
      await waitFor(() =>
        expect(mocked).toHaveBeenLastCalledWith({ from: '2026-10-19', to: '2026-10-25' })
      );
      mocked.mockResolvedValue(kiritimati);
      await validUser.click(screen.getByRole('button', { name: 'Today' }));
      await waitFor(() =>
        expect(mocked).toHaveBeenLastCalledWith({ from: '2026-10-26', to: '2026-11-01' })
      );
    });

    it('EP15E-AC3: when the first response’s today falls outside the guessed range, the page re-requests the week of today before rendering (D-E5)', async () => {
      // The guess is the week of 10-26; the server says today is Monday 11-02.
      const first = { ...payload, today: '2026-11-02', events: [] };
      const second = {
        ...payload,
        today: '2026-11-02',
        from: '2026-11-02',
        to: '2026-11-08',
        days: daysOf(weekOf('2026-11-02')),
        events: [{ ...sampleEvent, id: 'nov', date: '2026-11-03', title: 'November class' }],
      };
      mocked.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
      renderPage();
      await screen.findByText('November class');
      expect(mocked).toHaveBeenNthCalledWith(1, { from: '2026-10-26', to: '2026-11-01' });
      expect(mocked).toHaveBeenNthCalledWith(2, { from: '2026-11-02', to: '2026-11-08' });
      expect(mocked).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Mon 2', { exact: false })).toBeInTheDocument();
      expect(screen.queryByText('Mon 26', { exact: false })).not.toBeInTheDocument();
    });

    it('EP15E-AC3: the page module uses no browser-local Date getters', () => {
      const source = readFileSync(join(__dirname, 'CalendarPage.tsx'), 'utf8');
      expect(source).not.toMatch(
        /\b(getDay|getDate|getMonth|getFullYear|getHours|setDate|setHours)\(/
      );
    });
  });

  // ===================== EP15E — states (AC4) =====================

  describe('EP15E-AC4: states', () => {
    it("EP15E-AC4: loading skeleton has seven column placeholders and an sr-only 'Loading your calendar…'", () => {
      mocked.mockImplementation(() => new Promise(() => undefined));
      renderPage();
      expect(screen.getByText('Loading your calendar…')).toHaveClass('sr-only');
      expect(screen.getAllByTestId('skeleton-column')).toHaveLength(7);
      for (const el of document.querySelectorAll('[class*="animate-"]')) {
        expect(el.className).toMatch(/motion-reduce:animate-none/);
      }
    });

    it("EP15E-AC4: empty week shows 'Nothing on your calendar yet — it's all free time' with the grid (bounds shading) still rendered", async () => {
      mocked.mockResolvedValue({ ...payload, events: [] });
      renderPage();
      expect(
        await screen.findByText('Nothing on your calendar yet — it’s all free time')
      ).toBeInTheDocument();
      expect(screen.getByRole('list', { name: 'Week view' })).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: 'Before your day starts' })).toHaveLength(7);
      expect(screen.getAllByText('Free · 08:00–23:00')).toHaveLength(7);
    });

    it("EP15E-AC4: error state renders role alert and 'Try again' refetches", async () => {
      mocked.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce(payload);
      renderPage();
      expect(await screen.findByRole('alert')).toHaveTextContent('Network Error');
      await validUser.click(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByText('Calculus')).toBeInTheDocument();
      expect(mocked).toHaveBeenCalledTimes(2);
    });

    it('EP15E-AC4: narrow viewport renders the agenda with bounds and free lines; wide renders the grid; a live resize switches', async () => {
      setNarrow(true);
      renderPage();
      await screen.findByText('Calculus');
      expect(screen.getAllByText('Day 08:00–23:00')).toHaveLength(7);
      expect(screen.getAllByText('Free · 08:00–23:00').length).toBeGreaterThan(0);
      await act(async () => {
        setNarrow(false);
      });
      expect(screen.getByRole('list', { name: 'Week view' })).toBeInTheDocument();
      expect(screen.queryByRole('list', { name: 'Week agenda' })).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Your day 08:00–23:00');
    });
  });
});
