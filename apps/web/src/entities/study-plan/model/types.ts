// Study-plan entity (EP06F). Mirrors the API contract in the EP06 parent
// README's shared contract → `PlanPreview` / `SavedPlan` (EP06D).
//
// The preview is a client-held proposal (D06-19): the page edits these
// sessions in component state and projects each onto the four-field
// `ProposedSessionInput` before saving (D06-5, D06-21).

/**
 * EP13G/EP13H — how a planned session relates to the clock. `FLEX_DAY` is a
 * day-anchored intention: the stored times are a *suggestion*, the session
 * can be started whenever the student is ready, and it is never "missed" at
 * a clock time. `FIXED` is the clock commitment (the EP06 behaviour).
 */
export type PlannedSessionAnchor = 'FIXED' | 'FLEX_DAY';

/** EP13G/EP13H — the optional, flex-only part-of-day suggestion. */
export type PartOfDay = 'MORNING' | 'AFTERNOON' | 'EVENING';

export interface PlanPreviewSession {
  assignmentId: string;
  assignmentTitle: string;
  startTime: string; // HH:mm (wall-clock, profile zone)
  endTime: string; // HH:mm
  durationMinutes: number;
  anchor: PlannedSessionAnchor;
  windowHint: PartOfDay | null;
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
    // EP13F (D13-5): the two placement levers ride on every preview.
    breakMinutes: number;
    densityPercent: number;
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
  anchor: PlannedSessionAnchor;
  windowHint: PartOfDay | null;
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
  anchor: PlannedSessionAnchor;
  windowHint: PartOfDay | null;
}

/**
 * The save-body projection (D06-21 + EP13G's anchor fields). `windowHint`
 * must be **omitted** (not `null`) on a fixed session — the server 400s a
 * hint on fixed (EP13G AC-4/AC-5).
 */
export interface ProposedSessionInput {
  assignmentId: string;
  date: string;
  startTime: string;
  endTime: string;
  anchor: PlannedSessionAnchor;
  windowHint?: PartOfDay;
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

// Recovery summary (EP08D). Mirrors the API contract in the EP08 parent README.
export interface MissedSession {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  date: string; // YYYY-MM-DD (civil, profile zone)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  locked: boolean;
}

export interface RecoverySummary {
  /**
   * Past sessions still `SCHEDULED`. After EP13C's read-time reconciliation
   * this is (almost always) empty — unstarted past work rolls forward
   * instead of accumulating. EP13E's plan-health view does not render it.
   */
  missedSessions: MissedSession[];
  missedCount: number;
  /**
   * EP13C — the plan-health detail (EP13E's "Moved forward" section):
   * sessions rolled forward over the **last 7 days** whose assignment is
   * still unfinished. Bounded by construction, so it can never become an
   * accumulating ledger (AC-E13-04).
   */
  rolledForward: MissedSession[];
  rolledForwardCount: number;
  rolledForwardMinutes: number;
  unfinishedWork: RemainingWorkItem[]; // reuse existing type
  confirmedMinutes: number;
  message: string;
}

// Catch-up preview (EP08E). Mirrors the exported service types at
// apps/api/src/modules/study-plans/study-plans.service.ts (CatchUpPreview)
// and the PATCH /study-plans/sessions/:sessionId/lock response.
export interface CatchUpPreview extends PlanPreview {
  missedSessions: MissedSession[];
  lockedPreserved: number;
  completedPreserved: number;
}

/** The lock-toggle response — exactly the two keys. */
export interface PlannedSessionLock {
  id: string;
  locked: boolean;
}

// ---------------------------------------------------------------------------
// EP13C/EP13D — the today read (`GET /study-plans/today`).
// ---------------------------------------------------------------------------

/** One of today's planned sessions, with its live status. */
export interface TodaySession {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  date: string; // YYYY-MM-DD (civil, profile zone)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'RESCHEDULED';
  locked: boolean;
  anchor: PlannedSessionAnchor;
  windowHint: PartOfDay | null;
}

/** Why there is no recommended next session. */
export type NextSessionReason = 'NO_PLAN' | 'NOTHING_LEFT_TODAY';

/** The body of `GET /study-plans/today`. */
export interface TodayPlan {
  date: string;
  timeZone: string;
  sessions: TodaySession[];
  nextSession: TodaySession | null;
  nextSessionReason: NextSessionReason | null;
  confirmedMinutesToday: number;
}
