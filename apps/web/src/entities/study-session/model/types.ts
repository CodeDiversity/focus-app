/** Study session projection consumed by the web client (EP07 shared contract). */
export interface StudySession {
  id: string;
  assignmentId: string | null;
  taskId: string | null;
  /** EP13B: the planned session this focus session executes, or null. */
  plannedSessionId: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  startTime: string;
  endTime: string | null;
  elapsedSeconds: number;
  durationMinutes: number;
  plannedMinutes: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StudySessionStatus = StudySession['status'];

/** Response of GET /study-sessions. */
export interface StudySessionListResponse {
  items: StudySession[];
  total: number;
}

/** Per-assignment confirmed-time entry (GET /study-sessions/confirmed-time without assignmentId). */
export interface ConfirmedTimeAssignment {
  assignmentId: string;
  confirmedMinutes: number;
  sessionCount: number;
}

/** Response of GET /study-sessions/confirmed-time without assignmentId. */
export interface ConfirmedTimeListResponse {
  assignments: ConfirmedTimeAssignment[];
}

/** Response of GET /study-sessions/confirmed-time?assignmentId=... */
export interface ConfirmedTimeSingleResponse {
  assignmentId: string;
  confirmedMinutes: number;
  sessionCount: number;
}

export type ConfirmedTimeResponse = ConfirmedTimeListResponse | ConfirmedTimeSingleResponse;

/**
 * EP13K (D-K5) — response of GET /study-sessions/momentum. Minutes and days
 * only; there is no percentage field (D13-9). Civil dates are `YYYY-MM-DD`
 * in the profile zone — the client does no date arithmetic (D05-6).
 */
export interface MomentumSummary {
  date: string;
  timeZone: string;
  today: { confirmedMinutes: number; goalMinutes: number; goalMet: boolean };
  week: {
    startDate: string;
    studyDays: string[];
    studyDayCount: number;
    goalDays: number;
    goalMet: boolean;
  };
  run: { currentWeeks: number; bestWeeks: number; currentWeekCounted: boolean; capped?: true };
  hasHistory: boolean;
}
