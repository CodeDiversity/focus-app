import type { AssignmentPriorityValue } from './types';

/**
 * The **one** comparator that orders both the scheduler's assignments and the
 * remaining-work read (D06-22) — so the list and the plan can never disagree
 * about which work is "next".
 *
 * The order (the shared contract, *The engine's rules* 2):
 *
 * 1. **on-time first** — an assignment whose civil due date is on or after
 *    today's civil date; inside the group, by **due date ascending**;
 * 2. then **overdue** — an assignment whose civil due date is before today;
 * 3. then **undated** — an assignment with no due date (always a flagged
 *    assignment, so the engine never places one);
 * 4. inside every group: **priority descending** (`URGENT` > `HIGH` >
 *    `MEDIUM` > `LOW`), then **`createdAt` ascending**, then **`id`
 *    ascending** — the last key makes the order total, so two runs over the
 *    same data can never differ.
 *
 * The comparator is **pure**: it reads no clock (the caller's `today` is an
 * input) and knows no time zone (the due dates it compares are **civil**
 * dates, `YYYY-MM-DD`, D06-24). `YYYY-MM-DD` sorts chronologically as a
 * string, so the comparisons are string comparisons.
 */

/** The fields the comparator reads — a subset of the classified assignment. */
export type OrderableAssignment = {
  id: string;
  /** The profile zone's civil due date (`YYYY-MM-DD`), or `null`. */
  dueDate: string | null;
  priority: AssignmentPriorityValue;
  createdAt: Date;
};

/** The priority ranking — `URGENT` first, `LOW` last (descending priority). */
const PRIORITY_RANK: Record<AssignmentPriorityValue, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/** The three due-date groups, in the order they are reported. */
const GROUP_RANK = {
  'on-time': 0,
  overdue: 1,
  undated: 2,
} as const;

type DueGroup = keyof typeof GROUP_RANK;

/**
 * The group an assignment belongs to: **on-time** (its civil due date is on
 * or after today), **overdue** (before today) or **undated** (no due date).
 */
function dueGroup(dueDate: string | null, today: string): DueGroup {
  if (dueDate === null) {
    return 'undated';
  }
  return dueDate >= today ? 'on-time' : 'overdue';
}

/**
 * Compare two assignments by the shared order (D06-22).
 *
 * `today` is the caller's **civil** today in the profile zone (`YYYY-MM-DD`) —
 * an input, so the comparator reads no clock and stays zone-free.
 *
 * Returns a negative number when `a` comes first, a positive number when `b`
 * comes first and `0` when the two are the same assignment.
 */
export function compareAssignments(
  a: OrderableAssignment,
  b: OrderableAssignment,
  today: string
): number {
  const groupA = dueGroup(a.dueDate, today);
  const groupB = dueGroup(b.dueDate, today);
  if (groupA !== groupB) {
    return GROUP_RANK[groupA] - GROUP_RANK[groupB];
  }

  // Inside a group, the due date comes first (ascending). The undated group
  // has no due date at all — both sides are `null` and the comparison is
  // skipped, so the three tie-breaks below decide it.
  const dueA = a.dueDate ?? '';
  const dueB = b.dueDate ?? '';
  if (dueA !== dueB) {
    return dueA < dueB ? -1 : 1;
  }

  // Priority descending.
  const priorityA = PRIORITY_RANK[a.priority];
  const priorityB = PRIORITY_RANK[b.priority];
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  // `createdAt` ascending.
  const createdA = a.createdAt.getTime();
  const createdB = b.createdAt.getTime();
  if (createdA !== createdB) {
    return createdA - createdB;
  }

  // `id` ascending — the last key makes the order total.
  if (a.id === b.id) {
    return 0;
  }
  return a.id < b.id ? -1 : 1;
}
