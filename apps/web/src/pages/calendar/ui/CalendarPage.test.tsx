import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Providers } from '@/test/providers';
import { CalendarPage } from './CalendarPage';
import { listCalendarEvents } from '@/entities/calendar/api/calendarApi';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@/entities/calendar/api/calendarApi', () => ({
  listCalendarEvents: vi.fn(),
}));
vi.mock('@/entities/day-bounds/api/dayBoundsApi', () => ({
  getDayBounds: vi.fn(),
  putDayBounds: vi.fn(),
}));
vi.mock('@/entities/schedule-block/api/scheduleBlockApi', () => ({
  listScheduleBlocks: vi.fn(),
  createScheduleBlock: vi.fn(),
  updateScheduleBlock: vi.fn(),
  deleteScheduleBlock: vi.fn(),
  cancelOccurrence: vi.fn(),
}));
vi.mock('@/entities/course/api/courseApi', () => ({ listCourses: vi.fn() }));
import { getDayBounds, putDayBounds } from '@/entities/day-bounds/api/dayBoundsApi';
import {
  cancelOccurrence,
  createScheduleBlock,
  deleteScheduleBlock,
  listScheduleBlocks,
} from '@/entities/schedule-block/api/scheduleBlockApi';
import {
  EMPTY_WEEK_COPY,
  PARTIAL_SAVE_COPY,
  deleteAnnouncement,
  saveAnnouncement,
} from './CalendarPage';

const mocked = vi.mocked(listCalendarEvents);
const mockedBounds = vi.mocked(getDayBounds);
const mockedPut = vi.mocked(putDayBounds);
const defaultBounds = {
  configured: false,
  days: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    wakeTime: '08:00',
    sleepTime: '23:00',
  })),
};

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

/** EP15G fixtures: a weekly Busy occurrence and a one-off Study block. */
const busyEvent = {
  ...sampleEvent,
  id: 'event:b1:2026-10-29',
  type: 'EVENT' as const,
  title: 'Work shift',
  subtitle: null,
  date: '2026-10-29',
  startTime: '13:00',
  endTime: '17:00',
  courseId: null,
  courseName: null,
  courseColor: null,
  link: null,
  blockId: 'b1',
  recurring: true,
  energy: null,
};
const studyEvent = {
  ...busyEvent,
  id: 'study-block:b2:2026-10-30',
  type: 'STUDY_BLOCK' as const,
  title: 'Study',
  date: '2026-10-30',
  blockId: 'b2',
  recurring: false,
  energy: 'NORMAL' as const,
};
const blockRow = (id: string, weekdays: number[] | null) => ({
  id,
  kind: 'BUSY' as const,
  title: 'Work shift',
  courseId: null,
  energy: null,
  startDate: '2026-10-01',
  endDate: null,
  weekdays,
  startTime: '13:00',
  endTime: '17:00',
  createdAt: 'x',
  updatedAt: 'x',
});

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
    window.sessionStorage.clear();
    mocked.mockResolvedValue(payload);
    mockedBounds.mockResolvedValue({ ...defaultBounds, configured: true });
  });
  afterEach(() => {
    // Unmount before restoring the matchMedia mock: a late render (a resolving
    // fetch) after restore would call an undefined matchMedia (EP15F flake fix).
    cleanup();
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
    // EP15I-AC3: the calendar's own Add is the CTA — no "Manage availability" link remains.
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Manage availability' })).toBeNull();
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
      // D-E12 (user, 2026-11-17): one full-width line above the view, not inside a column.
      const copy = screen.getByText('Nothing on your calendar yet — it’s all free time');
      expect(screen.getByRole('list', { name: 'Week view' })).not.toContainElement(copy);
      expect(copy.className).toMatch(/text-center/);
    });

    it('EP15E (D-E9): the now marker is drawn on today’s column in the profile zone', async () => {
      renderPage();
      await screen.findByText('Calculus');
      // Frozen clock 2026-10-28T12:00 local; the marker reads the profile zone through Intl.
      expect(screen.getByRole('img', { name: /^Now, \d\d:\d\d$/ })).toBeInTheDocument();
      expect(document.querySelectorAll('[data-now]')).toHaveLength(1);
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

  // ===================== EP15F — day bounds banner and sheet =====================

  describe('EP15F: day-bounds banner and sheet', () => {
    it('EP15F-AC1: the banner shows only while configured is false; Dismiss hides it for the session; nothing is blocked', async () => {
      mockedBounds.mockResolvedValue(defaultBounds);
      renderPage();
      await screen.findByText('Calculus');
      const banner = await screen.findByTestId('day-bounds-banner');
      expect(banner).toHaveTextContent('Your days run 08:00–23:00 for now.');
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByRole('button', { name: 'Today' })).toBeEnabled();
      await validUser.click(screen.getByRole('button', { name: 'Dismiss' }));
      expect(screen.queryByTestId('day-bounds-banner')).toBeNull();
      expect(window.sessionStorage.getItem('sp.dayBoundsBannerDismissed')).toBe('1');
    });

    it('EP15F-AC1: no banner once bounds are configured', async () => {
      renderPage();
      await screen.findByText('Calculus');
      await waitFor(() => expect(mockedBounds).toHaveBeenCalled());
      expect(screen.queryByTestId('day-bounds-banner')).toBeNull();
    });

    it('EP15F-AC2/AC3: the sheet opens from the banner and from a shaded caption; saving closes it, announces, re-reads the week and hides the banner; focus returns to the trigger', async () => {
      mockedBounds.mockResolvedValue(defaultBounds);
      const saved = {
        configured: true,
        days: defaultBounds.days.map((d) => ({ ...d, wakeTime: '07:00' })),
      };
      mockedPut.mockResolvedValue(saved);
      renderPage();
      await screen.findByText('Calculus');
      const setIt = await screen.findByRole('button', { name: 'Set it' });
      setIt.focus();
      await validUser.click(setIt);
      const dialog = await screen.findByRole('dialog', {
        name: 'When does your day start and end?',
      });
      expect(within(dialog).getByLabelText('Day starts')).toHaveValue('08:00');
      await validUser.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(setIt).toHaveFocus();

      const caption = screen.getAllByRole('button', { name: /^Day starts 08:00/ })[0];
      caption.focus();
      await validUser.click(caption);
      const sheet = await screen.findByRole('dialog', {
        name: 'When does your day start and end?',
      });
      fireEvent.change(within(sheet).getByLabelText('Day starts'), { target: { value: '07:00' } });
      const callsBefore = mocked.mock.calls.length;
      await validUser.click(within(sheet).getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(mockedPut).toHaveBeenCalledTimes(1));
      expect(mockedPut.mock.calls[0][0]).toHaveLength(7);
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(screen.getByRole('status')).toHaveTextContent('Day start and end saved.');
      await waitFor(() => expect(mocked.mock.calls.length).toBe(callsBefore + 1));
      expect(screen.queryByTestId('day-bounds-banner')).toBeNull();
      expect(caption).toHaveFocus();
    });

    it('EP15F-AC3: the announcement clears on the next week change', async () => {
      mockedBounds.mockResolvedValue(defaultBounds);
      mockedPut.mockResolvedValue({ ...defaultBounds, configured: true });
      renderPage();
      await screen.findByText('Calculus');
      await validUser.click(await screen.findByRole('button', { name: 'Set it' }));
      await validUser.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent('Day start and end saved.')
      );
      await validUser.click(screen.getByRole('button', { name: 'Next week' }));
      await waitFor(() =>
        expect(screen.getByRole('status')).not.toHaveTextContent('Day start and end saved.')
      );
    });
  });

  // ===================== EP15G — add / edit / remove blocks =====================

  describe('EP15G: the block sheet from the calendar', () => {
    beforeEach(() => {
      vi.mocked(listScheduleBlocks).mockResolvedValue([blockRow('b1', [4]), blockRow('b2', null)]);
      vi.mocked(createScheduleBlock).mockResolvedValue(blockRow('b9', null));
      vi.mocked(deleteScheduleBlock).mockResolvedValue(undefined);
      vi.mocked(cancelOccurrence).mockResolvedValue(undefined);
      mocked.mockResolvedValue({ ...payload, events: [sampleEvent, busyEvent, studyEvent] });
    });

    it("EP15G-AC1: the toolbar 'Add' opens the sheet with date = result.today when in view, else the week's Monday", async () => {
      renderPage();
      await screen.findByText('Calculus');
      const add = screen.getByRole('button', { name: 'Add' });
      expect(screen.getAllByRole('button')[0]).toBe(add); // first in the toolbar
      add.focus();
      await validUser.click(add);
      const sheet = await screen.findByRole('dialog', { name: 'Add to calendar' });
      expect(within(sheet).getByLabelText('Date')).toHaveValue('2026-10-28'); // today, in view
      await validUser.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(add).toHaveFocus();

      mocked.mockResolvedValue({
        ...payload,
        from: '2026-11-02',
        to: '2026-11-08',
        days: daysOf(weekOf('2026-11-02'), '07:30', '22:00'),
        events: [],
      });
      const fetchesBefore = mocked.mock.calls.length;
      await validUser.click(screen.getByRole('button', { name: 'Next week' }));
      await waitFor(() => expect(mocked.mock.calls.length).toBe(fetchesBefore + 1));
      await screen.findByText(EMPTY_WEEK_COPY);
      await validUser.click(screen.getByRole('button', { name: 'Add' }));
      const next = await screen.findByRole('dialog', { name: 'Add to calendar' });
      expect(within(next).getByLabelText('Date')).toHaveValue('2026-11-02'); // the week's Monday
      expect(within(next).getByLabelText('Start')).toHaveValue('08:00'); // wake 07:30 rounded up
      expect(within(next).getByLabelText('End')).toHaveValue('09:00');
    });

    it("EP15G-AC3: at a narrow viewport the same 'Add' is present and the agenda entry's details carry Edit and Remove", async () => {
      narrow = true;
      renderPage();
      await screen.findByText('Calculus');
      expect(screen.getByRole('list', { name: 'Week agenda' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
      await validUser.click(screen.getByRole('button', { name: /Work shift/ }));
      const dialog = await screen.findByRole('dialog', { name: 'Work shift' });
      expect(within(dialog).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Remove' })).toBeInTheDocument();
      // A class keeps only its course link — no Edit / Remove.
      await validUser.click(within(dialog).getByRole('button', { name: 'Close' }));
      await validUser.click(screen.getByRole('button', { name: /Calculus/ }));
      const classDialog = await screen.findByRole('dialog', { name: 'Calculus' });
      expect(within(classDialog).queryByRole('button', { name: 'Edit' })).toBeNull();
      expect(within(classDialog).queryByRole('button', { name: 'Remove' })).toBeNull();
    });

    it('EP15G-AC2: delete wirings — one-off → DELETE /schedule/blocks/:id; weekly this-day → DELETE …/occurrences/:date; weekly following → DELETE ?from=date; each refetches', async () => {
      renderPage();
      await screen.findByText('Calculus');
      const fetches = () => mocked.mock.calls.length;

      // one-off Study block → DELETE the row
      let before = fetches();
      const studyChip = screen.getByRole('button', { name: /^Study block\b/ });
      studyChip.focus();
      await validUser.click(studyChip);
      await validUser.click(await screen.findByRole('button', { name: 'Remove' }));
      await validUser.click(screen.getByRole('button', { name: 'Yes, remove' }));
      await waitFor(() => expect(deleteScheduleBlock).toHaveBeenCalledWith('b2'));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      await waitFor(() => expect(fetches()).toBe(before + 1));
      expect(screen.getByRole('status')).toHaveTextContent('Study block removed');
      await waitFor(() => expect(studyChip).toHaveFocus());

      // weekly → just this day → cancel the occurrence
      before = fetches();
      await validUser.click(screen.getByRole('button', { name: /Work shift/ }));
      await validUser.click(await screen.findByRole('button', { name: 'Remove' }));
      await validUser.click(screen.getByRole('button', { name: 'Just this day' }));
      await waitFor(() => expect(cancelOccurrence).toHaveBeenCalledWith('b1', '2026-10-29'));
      await waitFor(() => expect(fetches()).toBe(before + 1));
      expect(screen.getByRole('status')).toHaveTextContent('Removed for this day');

      // weekly → this and following → DELETE ?from=
      before = fetches();
      await validUser.click(screen.getByRole('button', { name: /Work shift/ }));
      await validUser.click(await screen.findByRole('button', { name: 'Remove' }));
      await validUser.click(screen.getByRole('button', { name: 'This and following' }));
      await waitFor(() =>
        expect(deleteScheduleBlock).toHaveBeenLastCalledWith('b1', { from: '2026-10-29' })
      );
      await waitFor(() => expect(fetches()).toBe(before + 1));
      expect(screen.getByRole('status')).toHaveTextContent('Removed for this and following weeks');

      // a failed removal keeps the dialog open with its footer restored
      vi.mocked(deleteScheduleBlock).mockRejectedValueOnce(new Error('Network Error'));
      await validUser.click(screen.getByRole('button', { name: /^Study block\b/ }));
      await validUser.click(await screen.findByRole('button', { name: 'Remove' }));
      await validUser.click(screen.getByRole('button', { name: 'Yes, remove' }));
      expect(await screen.findByRole('button', { name: 'Remove' })).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it("EP15G-AC4: announcements — 'Busy added', 'Study block added', 'Busy updated', 'Study block updated for this day', 'Study block updated for this and following weeks', 'Busy removed', 'Removed for this day', 'Removed for this and following weeks'", async () => {
      expect(saveAnnouncement({ kind: 'BUSY', action: 'created' })).toBe('Busy added');
      expect(saveAnnouncement({ kind: 'STUDY', action: 'created' })).toBe('Study block added');
      expect(saveAnnouncement({ kind: 'BUSY', action: 'updated' })).toBe('Busy updated');
      expect(saveAnnouncement({ kind: 'STUDY', action: 'this-day' })).toBe(
        'Study block updated for this day'
      );
      expect(saveAnnouncement({ kind: 'STUDY', action: 'following' })).toBe(
        'Study block updated for this and following weeks'
      );
      expect(saveAnnouncement({ kind: 'BUSY', action: 'this-day-partial' })).toBe(
        PARTIAL_SAVE_COPY
      );
      expect(deleteAnnouncement(busyEvent, 'all')).toBe('Busy removed');
      expect(deleteAnnouncement(studyEvent, 'all')).toBe('Study block removed');
      expect(deleteAnnouncement(busyEvent, 'this-day')).toBe('Removed for this day');
      expect(deleteAnnouncement(busyEvent, 'following')).toBe(
        'Removed for this and following weeks'
      );

      // End to end on the page: create → "Busy added", refetch, focus back on Add.
      renderPage();
      await screen.findByText('Calculus');
      const add = screen.getByRole('button', { name: 'Add' });
      add.focus();
      await validUser.click(add);
      const before = mocked.mock.calls.length;
      await validUser.click(await screen.findByRole('button', { name: 'Save' }));
      await waitFor(() => expect(createScheduleBlock).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(screen.getByRole('status')).toHaveTextContent('Busy added');
      await waitFor(() => expect(mocked.mock.calls.length).toBe(before + 1));
      await waitFor(() => expect(add).toHaveFocus());
      // The prefix clears on the next week change (same rule as EP15F).
      await validUser.click(screen.getByRole('button', { name: 'Next week' }));
      await waitFor(() => expect(screen.getByRole('status')).not.toHaveTextContent('Busy added'));
    });

    it("EP15G-AC2: partial failure announces exactly 'Saved your change, but the original block is still showing for this day — remove it from its details.' and the refetched week shows both items", async () => {
      vi.mocked(cancelOccurrence).mockRejectedValue(new Error('Network Error'));
      const newOneOff = {
        ...busyEvent,
        id: 'event:b9:2026-10-29',
        blockId: 'b9',
        recurring: false,
        startTime: '12:00',
      };
      renderPage();
      await screen.findByText('Calculus');
      const chip = screen.getByRole('button', { name: /Work shift/ });
      chip.focus();
      await validUser.click(chip);
      await validUser.click(await screen.findByRole('button', { name: 'Edit' }));
      const sheet = await screen.findByRole('dialog', { name: 'Edit Work shift' });
      expect(screen.getAllByRole('dialog')).toHaveLength(1); // details closed, sheet open
      await waitFor(() => expect(within(sheet).queryByText('Loading…')).toBeNull());
      expect(within(sheet).getByLabelText('Title (optional)')).toHaveValue('Work shift');
      fireEvent.change(within(sheet).getByLabelText('Start'), { target: { value: '12:00' } });
      mocked.mockResolvedValue({
        ...payload,
        events: [sampleEvent, busyEvent, studyEvent, newOneOff],
      });
      await validUser.click(within(sheet).getByRole('button', { name: 'Save' }));
      await validUser.click(await screen.findByRole('button', { name: 'Just this day' }));
      await waitFor(() => expect(cancelOccurrence).toHaveBeenCalledWith('b1', '2026-10-29'));
      expect(createScheduleBlock).toHaveBeenCalledWith({
        kind: 'BUSY',
        title: 'Work shift',
        startDate: '2026-10-29',
        startTime: '12:00',
        endTime: '17:00',
      });
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(screen.getByRole('status')).toHaveTextContent(PARTIAL_SAVE_COPY);
      expect(await screen.findAllByRole('button', { name: /Work shift/ })).toHaveLength(2);
      await waitFor(() => expect(chip).toHaveFocus());
    });
  });
});
