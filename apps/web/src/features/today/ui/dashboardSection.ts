import { formatDate } from '@/shared/lib/datetime';

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
/** EP16B (D16-3): Coming up shows at most five rows; "All assignments" carries the rest. */
export const COMING_UP_LIMIT = 5;

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
