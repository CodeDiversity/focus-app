import type {
  AssignmentPriority,
  AssignmentStatus,
  AssignmentType,
  Subtask,
} from '@/shared/types/academic';

/**
 * The status pill palette (D112B-4): each status pairs **text with color**
 * (DoD 6 — the label is always present; color reinforces, never encodes
 * alone). The 500-level hue on a 100-level background keeps the pill legible
 * (WCAG 2.2 AA).
 */
export const STATUS_STYLES: Record<AssignmentStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  SUBMITTED: 'bg-violet-100 text-violet-700',
  COMPLETED: 'bg-green-100 text-green-700',
  GRADED: 'bg-teal-100 text-teal-700',
};

/** The priority pill palette (D112B-4) — the same text-plus-color pairing. */
export const PRIORITY_STYLES: Record<AssignmentPriority, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

/** The status labels (title-cased — the raw enum values are API wire format). */
export const STATUS_LABELS: Record<AssignmentStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  COMPLETED: 'Completed',
  GRADED: 'Graded',
};

/** The priority labels (title-cased). */
export const PRIORITY_LABELS: Record<AssignmentPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

/**
 * The type label palette (title-cased labels below). The five values carry no
 * severity semantics, so every type shares one neutral pill palette that the
 * section already uses (`PENDING`/`LOW`): text plus color — the label is
 * always rendered (D112B-4). A null type renders no badge: absence of a
 * category is not a category (SP-115, refined 2026-10-25).
 */
export const TYPE_STYLE = 'bg-slate-100 text-slate-700';

/** Overdue pill palette (SP-123A, D123A-3): red text-plus-color pill. */
export const OVERDUE_STYLE = 'bg-red-100 text-red-700';
export const OVERDUE_LABEL = 'Overdue';

/**
 * The status **control** palette (SP-125, D125-8): the row's status selector
 * wears the same text-plus-color pairing as the status pills so the current
 * status is readable at a glance while still being a real select. The dedicated
 * control export (not `STATUS_STYLES`) exists because the select carries a
 * border where the pill does not, and the control must always show enough
 * contrast for its native styling (WCAG 2.2 AA — color reinforces the label,
 * it never encodes it alone).
 */
export const STATUS_SELECT_STYLES: Record<AssignmentStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700 border-slate-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-300',
  SUBMITTED: 'bg-violet-100 text-violet-700 border-violet-300',
  COMPLETED: 'bg-green-100 text-green-700 border-green-300',
  GRADED: 'bg-teal-100 text-teal-700 border-teal-300',
};

export const TYPE_LABELS: Record<AssignmentType, string> = {
  HOMEWORK: 'Homework',
  PAPER: 'Paper',
  PROJECT: 'Project',
  QUIZ: 'Quiz',
  EXAM: 'Exam',
};

/** Collapsed disclosure copy (SP-120J). `done` counts `COMPLETED` only. */
export function subtaskSummary(subtasks: Subtask[]): string {
  const count = subtasks.length;
  if (count === 0) return 'No subtasks';
  const noun = count === 1 ? '1 subtask' : `${count} subtasks`;
  const done = subtasks.filter((item) => item.status === 'COMPLETED').length;
  if (done === 0) return noun;
  return `${noun}, ${done} complete`;
}
