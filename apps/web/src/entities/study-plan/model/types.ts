// Study-plan entity (EP06F). Mirrors the API contract in the EP06 parent
// README's shared contract → `PlanPreview` / `SavedPlan` (EP06D).
//
// The preview is a client-held proposal (D06-19): the page edits these
// sessions in component state and projects each onto the four-field
// `ProposedSessionInput` before saving (D06-5, D06-21).

export interface PlanPreviewSession {
  assignmentId: string;
  assignmentTitle: string;
  startTime: string; // HH:mm (wall-clock, profile zone)
  endTime: string; // HH:mm
  durationMinutes: number;
}

export interface PlanPreviewDay {
  date: string; // YYYY-MM-DD (civil, profile zone)
  targetMinutes: number;
  sessions: PlanPreviewSession[];
}

export type PlanWarningCategory =
  'NO_AVAILABLE_TIME' | 'INSUFFICIENT_TIME_BEFORE_DEADLINE' | 'OVERDUE';

export interface PlanWarning {
  assignmentId: string;
  assignmentTitle: string;
  category: PlanWarningCategory;
  minutes: number;
  dueDate: string | null;
}

/** Backwards-compatible alias for the looser preview warning shape (EP06F). */
export type PlanPreviewWarning = PlanWarning;

export interface PlanDeferred {
  assignmentId: string;
  minutes: number;
  /** Optional display title; falls back to assignmentId when absent. */
  assignmentTitle?: string;
  title?: string;
}

export interface PlanPreview {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  timeZone: string;
  generatedAt: string;
  preferences: {
    sessionLengthMinutes: number;
    minSessionMinutes: number;
    maxSessionMinutes: number;
    dailyCapMinutes: number;
  };
  days: PlanPreviewDay[];
  warnings: PlanWarning[];
  deferred: PlanDeferred[];
}

export interface SavedPlanSession {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  status: string;
}

export interface SavedPlanDay {
  date: string; // YYYY-MM-DD
  targetMinutes: number;
  sessions: SavedPlanSession[];
}

export interface SavedPlan {
  from: string;
  to: string;
  timeZone: string;
  days: SavedPlanDay[];
}

/** A session as held/edited in the client (the proposal). */
export interface ProposedSession {
  assignmentId: string;
  assignmentTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

/** The four-field projection the save body accepts (D06-21). */
export interface ProposedSessionInput {
  assignmentId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface PlanConflict {
  sessionIndex: number;
  date: string;
  startTime: string;
  reason:
    | 'OVERLAPS_CLASS'
    | 'OVERLAPS_BLOCKED_TIME'
    | 'OVERLAPS_CONFIRMED_SESSION'
    | 'OVERLAPS_PLANNED_SESSION';
}

export const CONFLICT_REASON_LABEL: Record<PlanConflict['reason'], string> = {
  OVERLAPS_CLASS: 'This overlaps a class',
  OVERLAPS_BLOCKED_TIME: 'This overlaps blocked time',
  OVERLAPS_CONFIRMED_SESSION: 'This overlaps a logged study session',
  OVERLAPS_PLANNED_SESSION: 'This overlaps another planned session',
};

// Remaining work (EP06G). Mirrors the API contract in the EP06 parent README.
export type RemainingWorkFlag = null | 'MISSING_ESTIMATE' | 'MISSING_DUE_DATE';

export interface RemainingWorkItem {
  assignmentId: string;
  title: string;
  courseCode: string | null;
  dueDate: string | null;
  estimatedMinutes: number | null;
  confirmedMinutes: number;
  remainingMinutes: number | null;
  status: string;
  flagged: RemainingWorkFlag;
}

export interface RemainingWorkResponse {
  items: RemainingWorkItem[];
  unattributedConfirmedMinutes: number;
}
