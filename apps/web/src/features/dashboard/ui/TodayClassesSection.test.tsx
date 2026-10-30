import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { Providers } from '@/test/providers';
import type { CalendarEvent } from '@/entities/calendar/model/types';
import { TodayClassesSection } from './TodayClassesSection';

const TODAY = '2026-10-30';

function makeClass(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'class:m1:2026-10-30',
    type: 'CLASS',
    title: 'Calculus lecture',
    subtitle: 'MATH101',
    date: TODAY,
    startTime: '09:00',
    endTime: '10:00',
    courseId: 'c1',
    courseName: 'Calculus',
    courseColor: '#10b981',
    assignmentId: null,
    completed: false,
    focus: false,
    link: '/courses/c1',
    ...overrides,
  };
}

const renderSection = (props: Partial<ComponentProps<typeof TodayClassesSection>> = {}) =>
  render(
    <Providers initialEntries={['/dashboard']}>
      <TodayClassesSection
        events={[]}
        today={TODAY}
        status="ready"
        onRetry={vi.fn()}
        emptyState={{ title: 'No classes today.' }}
        {...props}
      />
    </Providers>
  );

describe('TodayClassesSection (EP05B)', () => {
  it('renders one row per class of the selected day with the time range, the title and the course', () => {
    renderSection({
      events: [
        makeClass(),
        makeClass({
          id: 'class:m2:2026-10-30',
          title: 'Physics lecture',
          startTime: '13:00',
          endTime: '14:30',
          courseName: 'Physics',
          link: '/courses/c2',
        }),
      ],
    });

    expect(screen.getByText('09:00 – 10:00')).toBeInTheDocument();
    expect(screen.getByText('Calculus')).toBeInTheDocument();
    expect(screen.getByText('13:00 – 14:30')).toBeInTheDocument();
    expect(screen.getByText('Physics')).toBeInTheDocument();
  });

  it('renders a point event as a single time', () => {
    renderSection({ events: [makeClass({ startTime: '09:00', endTime: null })] });

    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.queryByText('09:00 – 10:00')).not.toBeInTheDocument();
  });

  it('does not render a class from another day', () => {
    renderSection({
      events: [
        makeClass(),
        makeClass({ id: 'class:m1:2026-10-31', date: '2026-10-31', title: 'Tomorrow' }),
      ],
    });

    expect(screen.getByText('Calculus')).toBeInTheDocument();
    expect(screen.queryByText('Tomorrow')).not.toBeInTheDocument();
  });

  it('keeps the payload order (no client-side re-sort)', () => {
    renderSection({
      events: [
        makeClass({ id: 'class:b', title: 'Bravo', startTime: '11:00' }),
        makeClass({ id: 'class:a', title: 'Alpha', startTime: '09:00' }),
      ],
    });

    const titles = screen.getAllByRole('listitem').map((item) => item.textContent ?? '');
    expect(titles[0]).toContain('Bravo');
    expect(titles[1]).toContain('Alpha');
  });

  it('renders the title as a link to the event link and as plain text without one', () => {
    renderSection({
      events: [makeClass(), makeClass({ id: 'class:x', title: 'No link class', link: null })],
    });

    const link = screen.getByRole('link', { name: 'Calculus lecture' });
    expect(link).toHaveAttribute('href', '/courses/c1');
    expect(screen.queryByRole('link', { name: 'No link class' })).not.toBeInTheDocument();
    expect(screen.getByText('No link class')).toBeInTheDocument();
  });

  it('caps the rows at five and shows the remainder', () => {
    renderSection({
      events: Array.from({ length: 7 }, (_, index) =>
        makeClass({ id: `class:${index}`, title: `Class ${index}` })
      ),
    });

    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('renders a "See all" link to the calendar with a section-specific accessible name', () => {
    renderSection({ events: [makeClass()] });

    const seeAll = screen.getByRole('link', { name: "See all today's classes on the calendar" });
    expect(seeAll).toHaveAttribute('href', '/calendar');
    expect(seeAll).toHaveTextContent('See all');
  });

  it('renders the loading skeleton instead of rows', () => {
    renderSection({ status: 'loading', events: [makeClass()] });

    const section = screen.getByRole('region', { name: "Today's classes" });
    expect(section).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Calculus')).not.toBeInTheDocument();
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

    const title = screen.getByRole('heading', { name: 'No classes today.' });
    expect(title).toBeInTheDocument();
    expect(title.parentElement?.querySelector('svg')).not.toBeNull();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('exposes the section as a named region and exposes no live region of its own', () => {
    renderSection({ events: [makeClass()] });

    expect(screen.getByRole('region', { name: "Today's classes" })).toBeInTheDocument();
    expect(screen.queryAllByRole('status')).toHaveLength(0);
    expect(within(screen.getByRole('region')).queryAllByRole('alert')).toHaveLength(0);
  });
});
