import type { ReactNode } from 'react';
import { formatDate } from '@/shared/lib/datetime';
import type { AssignmentListItem } from '@/shared/types/academic';

/**
 * EP05B — the shared dashboard vocabulary (D05-12 → Decisions #1, #3, #5,
 * #7, #8, #14).
 *
 * Six consumers need the same words — the four sections, the page and
 * EP05C's empty-state content — and duplicating them four times would let
 * them drift. This module therefore owns:
 *
 * - the three **states** every section renders (`DashboardSectionStatus`),
 * - the **empty-state content** contract (`DashboardEmptyState`) — the
 *   content is a *prop*, so EP05C replaces the copy without touching a
 *   section component (Decision #14),
 * - the **section limits** (D05-10, confirmed by the `ui-refiner`),
 * - the two shared **row helpers** — the event time range and the due-date
 *   label.
 *
 * The file is deliberately a `.ts` module (no JSX): it is vocabulary, not
 * markup.
 */

/** The three states a section renders: its own loading, empty and error. */
export type DashboardSectionStatus = 'loading' | 'ready' | 'error';

/**
 * The empty state's content. It is supplied by the **host** (the page), never
 * hard-coded in a section: EP05B ships provisional titles and EP05C replaces
 * the title, the description and the action **through this prop** (Decision
 * #14).
 */
export interface DashboardEmptyState {
  title: string;
  description?: string;
  action?: ReactNode;
}

/** The props every section shares (Decisions #7, #14). */
export interface DashboardSectionBaseProps {
  /** Which of the section's three states to render. */
  status: DashboardSectionStatus;
  /** The query's error — rendered by the section's error state. */
  error?: unknown;
  /** Whether the query is in flight (the retry button's busy state). */
  isFetching?: boolean;
  /** Refetches **this** section's query. */
  onRetry: () => void;
  /** The empty state's content, supplied by the host. */
  emptyState?: DashboardEmptyState;
}

/**
 * The props the two **assignment** sections share (D05-17, D05-18).
 *
 * `onOpenDetails` is the row → host callback: the row's title button calls it
 * exactly once with the row it rendered. The section never mounts the shared
 * assignment owner and never opens a dialog itself — the page host owns that
 * (one owner, one mount).
 */
export interface DashboardAssignmentSectionProps extends DashboardSectionBaseProps {
  /** The assignments payload — the section applies its own selector to it. */
  rows: AssignmentListItem[];
  /** The profile zone the due dates are displayed in (the payload's zone). */
  timeZone: string;
  /** D05-17: the row → host callback. */
  onOpenDetails: (row: AssignmentListItem) => void;
}

/** Today's classes — the cap (D05-10). */
export const CLASSES_LIMIT = 5;
/** Upcoming deadlines — the cap (D05-10). */
export const UPCOMING_DEADLINES_LIMIT = 5;
/** Overdue assignments — the cap (D05-10). */
export const OVERDUE_ASSIGNMENTS_LIMIT = 5;
/** Today's study sessions — the cap (D05-10). */
export const STUDY_SESSIONS_LIMIT = 3;

/**
 * The title used when a host supplies **no** empty-state content. It is
 * deliberately generic: the section-specific copy belongs to the host (and to
 * EP05C), never to a section component (Decision #14).
 */
export const EMPTY_STATE_FALLBACK_TITLE = 'Nothing to show';

/**
 * The event's time range: `09:00 – 10:00`, or just `09:00` when the event
 * has no end (a point event). The times are already the student's
 * profile-zone `HH:mm` strings — the client performs **no** zone arithmetic
 * on them (D05-6).
 */
export function eventTimeRange(startTime: string, endTime: string | null): string {
  return endTime ? `${startTime} – ${endTime}` : startTime;
}

/**
 * The row's due date: `Due Oct 30, 2026`, or `No due date` when the
 * assignment has none (D05-9 — a null deadline is labelled, never blank).
 *
 * `dueDate` is an ISO **instant**, so it is displayed in `timeZone` — the
 * calendar payload's profile zone, never the browser's (D05-6). The caller
 * owns that choice: the page passes the payload's zone and falls back to the
 * browser zone only when the calendar query has no payload (assumption A7).
 */
export function dueDateLabel(dueDate: string | null, timeZone: string): string {
  if (!dueDate) return 'No due date';
  return `Due ${formatDate(new Date(dueDate), timeZone)}`;
}
