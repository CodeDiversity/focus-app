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

export interface PlanPreviewWarning {
  assignmentId: string;
  assignmentTitle: string;
  category: string;
  minutes: number;
  dueDate: string | null;
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
  warnings: PlanPreviewWarning[];
  deferred: { assignmentId: string; minutes: number }[];
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
