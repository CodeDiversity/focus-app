import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Providers } from '@/test/providers';
import { CalendarEventDetails } from './CalendarEventDetails';
import type { CalendarEvent } from '@/entities/calendar/model/types';

const event: CalendarEvent = {
  id: 'e1',
  type: 'ASSIGNMENT_DEADLINE',
  title: 'Essay',
  subtitle: 'ENG101',
  date: '2026-10-27',
  startTime: '09:00',
  endTime: null,
  courseId: 'c1',
  courseName: 'English',
  courseColor: '#6366f1',
  assignmentId: 'a1',
  completed: false,
  focus: false,
  link: '/courses/c1',
};

describe('CalendarEventDetails (SP-127B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderDialog = () =>
    render(
      <Providers initialEntries={['/calendar']}>
        <CalendarEventDetails event={event} timeZone="America/New_York" onClose={vi.fn()} />
      </Providers>
    );

  it('renders fields, completed state, and course link', () => {
    renderDialog();
    expect(screen.getByText('Essay')).toBeInTheDocument();
    expect(screen.getByText('Assignment')).toBeInTheDocument();
    expect(screen.getByText('Not completed')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'English' });
    expect(link).toHaveAttribute('href', '/courses/c1');
  });

  it('closes on Escape and returns focus to trigger', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const onClose = vi.fn();
    const view = render(
      <Providers initialEntries={['/calendar']}>
        <CalendarEventDetails event={event} timeZone="America/New_York" onClose={onClose} />
      </Providers>
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
    view.unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('renders without crashing', () => {
    renderDialog();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  // ============ EP13H2 (F-EP13H-03) — flex planned sessions ============

  it('a FLEX_DAY planned session reads Time: Anytime with a labelled suggestion row', () => {
    const flex: CalendarEvent = {
      ...event,
      type: 'PLANNED_SESSION',
      title: 'Problem set 3',
      endTime: '10:00',
      anchor: 'FLEX_DAY',
    };
    render(
      <Providers initialEntries={['/calendar']}>
        <CalendarEventDetails event={flex} timeZone="America/New_York" onClose={vi.fn()} />
      </Providers>
    );
    expect(screen.getByText('Anytime')).toBeInTheDocument();
    // The engine's slot survives, but only under an honest label.
    expect(screen.getByText('Suggested')).toBeInTheDocument();
    expect(screen.getByText('09:00 – 10:00')).toBeInTheDocument();
  });

  it('a FIXED planned session and every other type keep the plain time row', () => {
    const fixed: CalendarEvent = {
      ...event,
      type: 'PLANNED_SESSION',
      endTime: '10:00',
      anchor: 'FIXED',
    };
    const { unmount } = render(
      <Providers initialEntries={['/calendar']}>
        <CalendarEventDetails event={fixed} timeZone="America/New_York" onClose={vi.fn()} />
      </Providers>
    );
    expect(screen.getByText('09:00 – 10:00')).toBeInTheDocument();
    expect(screen.queryByText('Anytime')).not.toBeInTheDocument();
    expect(screen.queryByText('Suggested')).not.toBeInTheDocument();
    unmount();

    renderDialog(); // the ASSIGNMENT_DEADLINE base event (no anchor at all)
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.queryByText('Anytime')).not.toBeInTheDocument();
  });
});
