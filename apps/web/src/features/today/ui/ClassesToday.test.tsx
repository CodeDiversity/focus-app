import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ClassesToday } from './ClassesToday';
import type { CalendarEvent } from '@/entities/calendar/model/types';

const TODAY = '2026-10-30';
const cls = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'class:1',
  type: 'CLASS',
  title: 'Cell Biology',
  subtitle: 'BIO 101',
  date: TODAY,
  startTime: '10:00',
  endTime: '11:00',
  courseId: 'c1',
  courseName: 'Cell Biology',
  courseColor: null,
  assignmentId: null,
  completed: false,
  focus: false,
  link: '/courses/c1',
  ...overrides,
});

const events = [
  cls({ id: 'a' }),
  cls({
    id: 'b',
    title: 'Calculus',
    subtitle: 'MATH 201',
    startTime: '14:00',
    link: '/courses/c2',
  }),
  cls({ id: 'tomorrow', date: '2026-10-31', title: 'Tomorrow' }),
  cls({ id: 'deadline', type: 'ASSIGNMENT_DEADLINE', title: 'Essay' }),
];

const renderClasses = (props: Partial<Parameters<typeof ClassesToday>[0]> = {}) => {
  const onRetry = vi.fn();
  const view = render(
    <MemoryRouter>
      <ClassesToday events={events} today={TODAY} status="ready" onRetry={onRetry} {...props} />
    </MemoryRouter>
  );
  return { ...view, onRetry };
};

describe('ClassesToday (EP16B-AC4)', () => {
  it('renders "Classes today" then "HH:mm CODE" per class in payload order', () => {
    renderClasses();
    expect(screen.getByRole('heading', { level: 2, name: 'Classes today' })).toBeInTheDocument();
    expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual([
      '10:00 BIO 101',
      '14:00 MATH 201',
    ]);
  });

  it('each class is a link to event.link whose accessible name starts with its visible text', () => {
    renderClasses();
    const link = screen.getByRole('link', { name: '10:00 BIO 101, Cell Biology' });
    expect(link).toHaveAttribute('href', '/courses/c1');
    expect(screen.getByRole('link', { name: '14:00 MATH 201, Calculus' })).toHaveAttribute(
      'href',
      '/courses/c2'
    );
  });

  it('a class with no link renders as text', () => {
    renderClasses({ events: [cls({ id: 'nolink', link: null })] });
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('10:00 BIO 101')).toBeInTheDocument();
  });

  it('renders nothing when no class falls on today, ignoring neighbouring days', () => {
    const { container } = renderClasses({ events: [events[2], events[3]] });
    expect(container).toBeEmptyDOMElement();
  });

  it('loading renders nothing; error renders the one-line message with Try again (D-B7)', async () => {
    expect(renderClasses({ status: 'loading' }).container).toBeEmptyDOMElement();
    const { onRetry } = renderClasses({ status: 'error' });
    expect(screen.getByText("We couldn't load today's classes.")).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
