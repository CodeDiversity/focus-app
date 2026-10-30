import { isOverdueAssignment, isUnfinishedAssignment } from '@/entities/assignment/model/status';
import type { AssignmentListItem } from '@/shared/types/academic';
import type { CalendarEvent } from '@/entities/calendar/model/types';
import { selectTodayEvents } from './dashboardRange';

/**
 * EP05A — the dashboard's derived sets (D05-9).
 *
 * Every function here is pure: it filters the endpoint's payload and keeps the
 * endpoint's order (the documented default sort — `dueDate asc` with nulls
 * last, then `title asc`, then `id asc`). The dashboard performs **no**
 * client-side re-sort, so it cannot drift from the server's contract.
 *
 * "Unfinished" and "overdue" are never re-derived: they come from the shared
 * predicates in `entities/assignment/model/status.ts`, the single source of
 * truth (SP-121B/D121-4, SP-123A/D123-1-2).
 */

/** The clock the overdue predicate reads. Injected so the split is deterministic. */
export type NowInput = Date | number | string;

/**
 * Today's classes: the `CLASS` events on `today` (the server-echoed
 * profile-zone date).
 */
export function selectTodayClasses(events: CalendarEvent[], today: string): CalendarEvent[] {
  return selectTodayEvents(events, today).filter((event) => event.type === 'CLASS');
}

/**
 * Today's study sessions: the `STUDY_SESSION` events on `today`. The events
 * are returned unchanged, so a session's `focus` flag survives the selection.
 */
export function selectTodayStudySessions(events: CalendarEvent[], today: string): CalendarEvent[] {
  return selectTodayEvents(events, today).filter((event) => event.type === 'STUDY_SESSION');
}

/**
 * The overdue assignments: unfinished **and** overdue (a non-null `dueDate`
 * strictly before `now` — the shared predicate's rule, no end-of-day grace).
 * Finished rows are never overdue.
 */
export function selectOverdueAssignments(
  rows: AssignmentListItem[],
  now?: NowInput
): AssignmentListItem[] {
  return rows.filter((row) => isUnfinishedAssignment(row) && isOverdueAssignment(row, now));
}

/**
 * The upcoming deadlines: unfinished and **not** overdue. An unfinished row
 * with a null `dueDate` is unfinished work without a deadline and stays in this
 * list (last, in the endpoint's nulls-last order).
 */
export function selectUpcomingAssignments(
  rows: AssignmentListItem[],
  now?: NowInput
): AssignmentListItem[] {
  return rows.filter((row) => isUnfinishedAssignment(row) && !isOverdueAssignment(row, now));
}

export interface LimitedRows<T> {
  /** The rows the section shows. */
  rows: T[];
  /** How many rows were left out — the section's "…and N more". */
  remaining: number;
}

/**
 * Truncates `rows` to `limit` and reports how many were left out. The order
 * is preserved (no re-sort).
 */
export function limitRows<T>(rows: T[], limit: number): LimitedRows<T> {
  const max = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  const kept = rows.slice(0, max);
  return { rows: kept, remaining: rows.length - kept.length };
}
