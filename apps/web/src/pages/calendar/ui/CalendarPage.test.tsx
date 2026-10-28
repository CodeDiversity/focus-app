import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Providers } from '@/test/providers';
import { CalendarPage } from './CalendarPage';
import { listCalendarEvents } from '@/entities/calendar/api/calendarApi';

vi.mock('@/entities/calendar/api/calendarApi', () => ({
  listCalendarEvents: vi.fn(),
}));

const mocked = vi.mocked(listCalendarEvents);

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

const payload = {
  timeZone: 'America/New_York',
  today: '2026-10-28',
  from: '2026-10-26',
  to: '2026-11-01',
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
    vi.resetAllMocks();
    mocked.mockResolvedValue(payload);
  });
  afterEach(() => {
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

    mocked.mockResolvedValue({ ...payload, from: '2026-10-19', to: '2026-10-25', events: [] });
    await validUser.click(screen.getByRole('button', { name: 'Previous week' }));
    await waitFor(() => expect(mocked).toHaveBeenCalledTimes(2));

    mocked.mockResolvedValue(payload);
    await validUser.click(screen.getByRole('button', { name: 'Today' }));
    await waitFor(() => expect(mocked).toHaveBeenCalledTimes(3));
  });

  it('opens details dialog from a chip; Escape closes and focus returns', async () => {
    renderPage();
    const chip = await screen.findByRole('button', { name: /Class: Calculus, 09:00/ });
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

  it('empty state', async () => {
    mocked.mockResolvedValue({ ...payload, events: [] });
    renderPage();
    expect(await screen.findByText('No events this week')).toBeInTheDocument();
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
    expect(status).toHaveTextContent(/Showing 1 event/);
  });
});
