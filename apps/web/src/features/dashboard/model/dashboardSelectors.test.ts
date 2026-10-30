import { describe, it, expect } from 'vitest';
import type { AssignmentListItem } from '@/shared/types/academic';
import type { CalendarEvent } from '@/entities/calendar/model/types';
import {
  limitRows,
  selectOverdueAssignments,
  selectTodayClasses,
  selectTodayStudySessions,
  selectUpcomingAssignments,
} from './dashboardSelectors';

function assignment(overrides: Partial<AssignmentListItem> & { id: string }): AssignmentListItem {
  return {
    title: 'Assignment',
    description: null,
    dueDate: null,
    estimatedHours: null,
    actualHours: null,
    status: 'PENDING',
    priority: 'MEDIUM',
    type: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    course: null,
    subtasks: [],
    ...overrides,
  };
}

function event(date: string, overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: `event:${date}:${overrides.type ?? 'CLASS'}`,
    type: 'CLASS',
    title: 'Event',
    subtitle: null,
    date,
    startTime: '09:00',
    endTime: '10:00',
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

const NOW = new Date('2026-01-15T12:00:00.000Z');

describe('the overdue split (the shared predicates only)', () => {
  it('treats an unfinished row whose dueDate is strictly before now as overdue', () => {
    const rows = [
      assignment({ id: 'pending', status: 'PENDING', dueDate: '2026-01-15T11:59:59.000Z' }),
      assignment({ id: 'in-progress', status: 'IN_PROGRESS', dueDate: '2026-01-15T11:59:59.000Z' }),
    ];

    expect(selectOverdueAssignments(rows, NOW).map((row) => row.id)).toEqual([
      'pending',
      'in-progress',
    ]);
  });

  it('never treats a finished row as overdue, whatever its dueDate', () => {
    const rows = (['COMPLETED', 'SUBMITTED', 'GRADED'] as const).map((status) =>
      assignment({ id: status.toLowerCase(), status, dueDate: '2026-01-01T00:00:00.000Z' })
    );

    expect(selectOverdueAssignments(rows, NOW)).toEqual([]);
    expect(selectUpcomingAssignments(rows, NOW)).toEqual([]);
  });

  it('never treats a null dueDate as overdue', () => {
    const rows = [assignment({ id: 'no-due-date', status: 'PENDING', dueDate: null })];

    expect(selectOverdueAssignments(rows, NOW)).toEqual([]);
    expect(selectUpcomingAssignments(rows, NOW).map((row) => row.id)).toEqual(['no-due-date']);
  });

  it('treats a row due exactly at now as not overdue (the rule is “strictly before”)', () => {
    const rows = [assignment({ id: 'due-now', status: 'PENDING', dueDate: NOW.toISOString() })];

    expect(selectOverdueAssignments(rows, NOW)).toEqual([]);
    expect(selectUpcomingAssignments(rows, NOW).map((row) => row.id)).toEqual(['due-now']);
  });
});

describe('the upcoming split', () => {
  it('keeps the unfinished, non-overdue rows and excludes the overdue ones', () => {
    const rows = [
      assignment({ id: 'overdue', dueDate: '2026-01-10T00:00:00.000Z' }),
      assignment({ id: 'upcoming', dueDate: '2026-01-20T00:00:00.000Z' }),
      assignment({ id: 'no-due-date', dueDate: null }),
    ];

    expect(selectUpcomingAssignments(rows, NOW).map((row) => row.id)).toEqual([
      'upcoming',
      'no-due-date',
    ]);
    expect(selectOverdueAssignments(rows, NOW).map((row) => row.id)).toEqual(['overdue']);
  });
});

describe('order preservation (no client-side re-sort)', () => {
  it('keeps the endpoint’s order even when the title order contradicts the due-date order', () => {
    // The endpoint’s documented order is `dueDate asc` (nulls last), then
    // `title asc`, then `id asc` — so this payload is ordered by due date,
    // while its titles run the other way.
    const rows = [
      assignment({ id: 'a', title: 'Zebra', dueDate: '2026-01-10T00:00:00.000Z' }),
      assignment({ id: 'b', title: 'Yak', dueDate: '2026-01-20T00:00:00.000Z' }),
      assignment({ id: 'c', title: 'Xerus', dueDate: null }),
    ];

    expect(selectUpcomingAssignments(rows, NOW).map((row) => row.id)).toEqual(['b', 'c']);
    expect(selectOverdueAssignments(rows, NOW).map((row) => row.id)).toEqual(['a']);
  });

  it('keeps the endpoint’s order inside each derived list', () => {
    const rows = [
      assignment({ id: 'a', title: 'Zebra', dueDate: '2026-01-10T00:00:00.000Z' }),
      assignment({ id: 'b', title: 'Yak', dueDate: '2026-01-11T00:00:00.000Z' }),
      assignment({ id: 'c', title: 'Xerus', dueDate: '2026-01-12T00:00:00.000Z' }),
    ];

    expect(selectOverdueAssignments(rows, NOW).map((row) => row.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('limitRows', () => {
  it('truncates to the limit and reports the remainder', () => {
    const rows = ['a', 'b', 'c', 'd', 'e'];

    expect(limitRows(rows, 3)).toEqual({ rows: ['a', 'b', 'c'], remaining: 2 });
  });

  it('reports no remainder when the list fits', () => {
    const rows = ['a', 'b'];

    expect(limitRows(rows, 5)).toEqual({ rows: ['a', 'b'], remaining: 0 });
  });

  it('reports every row as remaining for a non-positive limit', () => {
    const rows = ['a', 'b'];

    expect(limitRows(rows, 0)).toEqual({ rows: [], remaining: 2 });
  });
});

describe('the calendar sets', () => {
  it('selects only the CLASS events on the selected day', () => {
    const events = [
      event('2026-01-15', { id: 'class-today', type: 'CLASS' }),
      event('2026-01-15', { id: 'session-today', type: 'STUDY_SESSION' }),
      event('2026-01-16', { id: 'class-tomorrow', type: 'CLASS' }),
    ];

    expect(selectTodayClasses(events, '2026-01-15').map((e) => e.id)).toEqual(['class-today']);
  });

  it('selects only the STUDY_SESSION events on the selected day and keeps the focus flag', () => {
    const events = [
      event('2026-01-15', { id: 'class-today', type: 'CLASS' }),
      event('2026-01-15', { id: 'session-today', type: 'STUDY_SESSION', focus: true }),
      event('2026-01-14', { id: 'session-yesterday', type: 'STUDY_SESSION' }),
    ];

    const sessions = selectTodayStudySessions(events, '2026-01-15');

    expect(sessions.map((e) => e.id)).toEqual(['session-today']);
    expect(sessions[0].focus).toBe(true);
    expect(sessions[0]).toBe(events[1]);
  });
});
