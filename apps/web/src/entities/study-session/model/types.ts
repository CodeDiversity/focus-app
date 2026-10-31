/** Study session projection consumed by the web client (EP07 shared contract). */
export interface StudySession {
  id: string;
  assignmentId: string | null;
  taskId: string | null;
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
