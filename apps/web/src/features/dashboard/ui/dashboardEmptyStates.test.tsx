import { describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Providers } from '@/test/providers';
import { EmptyState } from '@/shared/ui/EmptyState';
import {
  CLASSES_EMPTY_ACTION_LABEL,
  DASHBOARD_EMPTY_STATE_COPY,
  SESSIONS_EMPTY_ACTION_LABEL,
  overdueAssignmentsEmptyState,
  todayClassesEmptyState,
  todayStudySessionsEmptyState,
  upcomingDeadlinesEmptyState,
} from './dashboardEmptyStates';

/**
 * EP05C — the per-section empty states: the settled copy, the affordances
 * and the boundaries (Decisions #8–#11; TR-E05-06).
 *
 * The content is supplied **through** the `emptyState` prop — the shared
 * `EmptyState` primitive renders it, so these tests render the content the
 * same way the sections do, without touching a section component.
 */
const renderEmptyState = (emptyState: ReturnType<typeof overdueAssignmentsEmptyState>) =>
  render(
    <Providers initialEntries={['/dashboard']}>
      <EmptyState
        title={emptyState.title}
        description={emptyState.description}
        action={emptyState.action}
      />
    </Providers>
  );

describe('dashboardEmptyStates (EP05C)', () => {
  it('carries the settled title and description for each of the four sections', () => {
    expect(DASHBOARD_EMPTY_STATE_COPY.overdue).toEqual({
      title: 'Nothing overdue.',
      description:
        "You're all caught up — no assignment is past its due date. Add an assignment to put the next one on your list.",
    });
    expect(DASHBOARD_EMPTY_STATE_COPY.upcoming).toEqual({
      title: 'No upcoming deadlines.',
      description: "Nothing is due ahead. Add an assignment to keep track of what's next.",
    });
    expect(DASHBOARD_EMPTY_STATE_COPY.classes).toEqual({
      title: 'No classes today.',
      description: "No classes are scheduled for today. View your week to see what's ahead.",
    });
    expect(DASHBOARD_EMPTY_STATE_COPY.sessions).toEqual({
      title: 'No study sessions today.',
      description:
        'Nothing is scheduled for study today. Check the calendar for your classes and deadlines.',
    });
  });

  it('renders the copy the sections receive through the emptyState prop', () => {
    renderEmptyState(overdueAssignmentsEmptyState(vi.fn()));
    expect(screen.getByRole('heading', { name: 'Nothing overdue.' })).toBeInTheDocument();
    expect(
      screen.getByText(
        "You're all caught up — no assignment is past its due date. Add an assignment to put the next one on your list."
      )
    ).toBeInTheDocument();
    cleanup();

    renderEmptyState(upcomingDeadlinesEmptyState(vi.fn()));
    expect(screen.getByRole('heading', { name: 'No upcoming deadlines.' })).toBeInTheDocument();
    expect(
      screen.getByText("Nothing is due ahead. Add an assignment to keep track of what's next.")
    ).toBeInTheDocument();
    cleanup();

    renderEmptyState(todayClassesEmptyState());
    expect(screen.getByRole('heading', { name: 'No classes today.' })).toBeInTheDocument();
    expect(
      screen.getByText("No classes are scheduled for today. View your week to see what's ahead.")
    ).toBeInTheDocument();
    cleanup();

    renderEmptyState(todayStudySessionsEmptyState());
    expect(screen.getByRole('heading', { name: 'No study sessions today.' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Nothing is scheduled for study today. Check the calendar for your classes and deadlines.'
      )
    ).toBeInTheDocument();
  });

  it("opens the shared create form from the two assignment sections' action", async () => {
    const onAddAssignment = vi.fn();

    renderEmptyState(overdueAssignmentsEmptyState(onAddAssignment));
    const action = screen.getByRole('button', { name: 'Add an assignment' });
    // The primary variant.
    expect(action.className).toContain('bg-accent');
    await userEvent.click(action);
    expect(onAddAssignment).toHaveBeenCalledTimes(1);
    cleanup();

    renderEmptyState(upcomingDeadlinesEmptyState(onAddAssignment));
    await userEvent.click(screen.getByRole('button', { name: 'Add an assignment' }));
    expect(onAddAssignment).toHaveBeenCalledTimes(2);
  });

  it("links the two calendar sections' action to the calendar", () => {
    renderEmptyState(todayClassesEmptyState());
    const weekLink = screen.getByRole('link', { name: CLASSES_EMPTY_ACTION_LABEL });
    expect(weekLink).toHaveAttribute('href', '/calendar');
    // The house treatment: an outline Button inside the link.
    expect(within(weekLink).getByRole('button').className).toContain('border-2');
    cleanup();

    renderEmptyState(todayStudySessionsEmptyState());
    expect(screen.getByRole('link', { name: SESSIONS_EMPTY_ACTION_LABEL })).toHaveAttribute(
      'href',
      '/calendar'
    );
  });

  it('names no feature the dashboard does not have', () => {
    const copy = Object.values(DASHBOARD_EMPTY_STATE_COPY)
      .map((entry) => `${entry.title} ${entry.description}`)
      .join(' ')
      .toLowerCase();

    expect(copy).not.toContain('study plan');
    expect(copy).not.toContain('focus session');
    expect(copy).not.toContain('hours studied');
    expect(copy).not.toContain('tasks completed');
    expect(copy).not.toContain('study stats');
  });

  it('offers no create-session action in any empty state', () => {
    renderEmptyState(todayStudySessionsEmptyState());

    const links = screen.getAllByRole('link');
    links.forEach((link) => expect(link).toHaveAttribute('href', '/calendar'));
    // The study-sessions empty state points at the calendar; it never offers
    // to create a session on the dashboard (D05-5, D05-11 final).
    expect(
      screen.queryByRole('button', { name: /create|start|new session/i })
    ).not.toBeInTheDocument();
  });

  it('reads as an expected state, not an error, and announces nothing', () => {
    renderEmptyState(todayStudySessionsEmptyState());

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('puts no data-assignment-focus attribute on any empty-state control', () => {
    renderEmptyState(overdueAssignmentsEmptyState(vi.fn()));
    expect(document.querySelectorAll('[data-assignment-focus]')).toHaveLength(0);
    cleanup();

    renderEmptyState(todayClassesEmptyState());
    expect(document.querySelectorAll('[data-assignment-focus]')).toHaveLength(0);
  });
});
