import {
  BookOpen,
  ClipboardList,
  FileText,
  GraduationCap,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';
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
  PENDING: 'bg-surface-muted text-text-muted',
  IN_PROGRESS: 'bg-accent/10 text-accent',
  SUBMITTED: 'bg-accent/10 text-accent',
  COMPLETED: 'bg-success/10 text-success',
  GRADED: 'bg-accent/10 text-accent',
};

/** The priority pill palette (D112B-4) — the same text-plus-color pairing. */
export const PRIORITY_STYLES: Record<AssignmentPriority, string> = {
  LOW: 'bg-surface-muted text-text-muted',
  MEDIUM: 'bg-warning/10 text-warning',
  HIGH: 'bg-warning/10 text-warning',
  URGENT: 'bg-danger/10 text-danger',
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
export const TYPE_STYLE = 'bg-surface-muted text-text-muted';

/** Overdue pill palette (SP-123A, D123A-3): red text-plus-color pill. */
export const OVERDUE_STYLE = 'bg-danger/10 text-danger';
export const OVERDUE_LABEL = 'Overdue';

/** Due-soon badge palette (SP-125 / R-125-007): amber text-plus-color badge. */
export const DUE_SOON_STYLE = 'bg-warning/10 text-warning';
export const DUE_SOON_LABEL = 'Due soon';

/**
 * Compact progress label for the row disclosure (SP-125 / R-125-007):
 * "2/4 subtasks" style. Empty rows still render the disclosure (RV-125-001);
 * that control uses `subtaskSummary` ("No subtasks") instead of this label.
 */
export function subtaskProgress(subtasks: Subtask[]): string {
  const count = subtasks.length;
  const done = subtasks.filter((item) => item.status === 'COMPLETED').length;
  return `${done}/${count} subtasks`;
}

/**
 * The row's type icon (SP-125 / R-125-007): one neutral lucide glyph per
 * assignment type inside the small tile. Decorative — the meta line always
 * spells the type out for screen readers.
 */
export const TYPE_ICONS: Record<AssignmentType, LucideIcon> = {
  HOMEWORK: BookOpen,
  PAPER: FileText,
  PROJECT: ClipboardList,
  QUIZ: ListChecks,
  EXAM: GraduationCap,
};

/** The default glyph when the assignment carries no stored type. */
export const DEFAULT_TYPE_ICON: LucideIcon = FileText;

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
  PENDING: 'bg-surface-muted text-text-muted border-border',
  IN_PROGRESS: 'bg-accent/10 text-accent border-accent/30',
  SUBMITTED: 'bg-accent/10 text-accent border-accent/30',
  COMPLETED: 'bg-success/10 text-success border-success/30',
  GRADED: 'bg-accent/10 text-accent border-accent/30',
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
