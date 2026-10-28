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
});
