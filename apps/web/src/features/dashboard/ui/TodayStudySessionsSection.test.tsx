import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { Providers } from '@/test/providers';
import type { CalendarEvent } from '@/entities/calendar/model/types';
import { TodayStudySessionsSection } from './TodayStudySessionsSection';

const TODAY = '2026-10-30';

function makeSession(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'session:s1:2026-10-30',
    type: 'STUDY_SESSION',
    title: 'Review calculus',
    subtitle: null,
    date: TODAY,
    startTime: '19:00',
    endTime: '20:00',
    courseId: null,
    courseName: null,
    courseColor: null,
    assignmentId: null,
    completed: false,
    focus: false,
    link: null,
    ...overrides,
  };
}

const renderSection = (props: Partial<ComponentProps<typeof TodayStudySessionsSection>> = {}) =>
  render(
    <Providers initialEntries={['/dashboard']}>
      <TodayStudySessionsSection
        events={[]}
        today={TODAY}
        status="ready"
        onRetry={vi.fn()}
        emptyState={{ title: 'No study sessions today.' }}
        {...props}
      />
    </Providers>
  );

describe('TodayStudySessionsSection (EP05B)', () => {
  it('renders one row per session of the selected day with its time range and title', () => {
    renderSection({
      events: [
        makeSession(),
        makeSession({
          id: 'session:s2:2026-10-30',
          title: 'Read chapter 4',
          startTime: '21:00',
          endTime: null,
        }),
      ],
    });

    expect(screen.getByText('19:00 – 20:00')).toBeInTheDocument();
    expect(screen.getByText('Review calculus')).toBeInTheDocument();
    expect(screen.getByText('21:00')).toBeInTheDocument();
    expect(screen.getByText('Read chapter 4')).toBeInTheDocument();
  });

  it('shows "Focus session" as text for a focus session and no label otherwise', () => {
    renderSection({
      events: [
        makeSession({ id: 'session:focus', title: 'Deep work', focus: true }),
        makeSession({ id: 'session:plain', title: 'Reading', focus: false }),
      ],
    });

    expect(screen.getByText('Focus session')).toBeInTheDocument();
    expect(screen.getAllByText('Focus session')).toHaveLength(1);
  });

  it('does not render a session from another day', () => {
    renderSection({
      events: [
        makeSession(),
        makeSession({ id: 'session:other', date: '2026-10-31', title: 'Tomorrow' }),
      ],
    });

    expect(screen.getByText('Review calculus')).toBeInTheDocument();
    expect(screen.queryByText('Tomorrow')).not.toBeInTheDocument();
  });

  it('renders no link and no button for a session row', () => {
    renderSection({ events: [makeSession({ focus: true })] });

    const list = within(screen.getByRole('list'));
    expect(list.queryAllByRole('link')).toHaveLength(0);
    expect(list.queryAllByRole('button')).toHaveLength(0);
  });

  it('caps the rows at three and shows the remainder', () => {
    renderSection({
      events: Array.from({ length: 5 }, (_, index) =>
        makeSession({ id: `session:${index}`, title: `Session ${index}` })
      ),
    });

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('renders a "See all" link to the calendar with a section-specific accessible name', () => {
    renderSection({ events: [makeSession()] });

    const seeAll = screen.getByRole('link', {
      name: "See all today's study sessions on the calendar",
    });
    expect(seeAll).toHaveAttribute('href', '/calendar');
    expect(seeAll).toHaveTextContent('See all');
  });

  it('renders the loading skeleton instead of rows', () => {
    renderSection({ status: 'loading', events: [makeSession()] });

    const section = screen.getByRole('region', { name: "Today's study sessions" });
    expect(section).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Review calculus')).not.toBeInTheDocument();
    const bars = section.querySelectorAll('.animate-pulse');
    expect(bars.length).toBeGreaterThan(0);
    bars.forEach((bar) => expect(bar).toHaveClass('motion-reduce:animate-none'));
  });

  it('renders the error message and a retry action that calls the callback once', async () => {
    const onRetry = vi.fn();
    renderSection({ status: 'error', error: { message: 'Calendar service unavailable' }, onRetry });

    expect(screen.getByRole('alert')).toHaveTextContent('Calendar service unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the empty state with the section icon and the supplied title', () => {
    renderSection({ events: [] });

    const title = screen.getByRole('heading', { name: 'No study sessions today.' });
    expect(title).toBeInTheDocument();
    expect(title.parentElement?.querySelector('svg')).not.toBeNull();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('exposes the section as a named region and exposes no live region of its own', () => {
    renderSection({ events: [makeSession()] });

    expect(screen.getByRole('region', { name: "Today's study sessions" })).toBeInTheDocument();
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });
});
