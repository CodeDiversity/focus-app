import api from '@/shared/api/httpClient';
import type {
  StudySession,
  StudySessionListResponse,
  ConfirmedTimeListResponse,
  ConfirmedTimeSingleResponse,
} from '../model/types';

export interface StartStudySessionRequest {
  assignmentId: string;
  plannedMinutes: number;
}

export interface ListStudySessionsParams {
  assignmentId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/** 201: StudySession projection; 400 field errors; 404 uniform; 409 open session. */
export async function startStudySession(data: StartStudySessionRequest): Promise<StudySession> {
  const response = await api.post<StudySession>('/study-sessions', {
    assignmentId: data.assignmentId,
    plannedMinutes: data.plannedMinutes,
  });
  return response.data;
}

/**
 * EP13B — `POST /study-sessions/from-planned/:plannedSessionId`: start a focus
 * session straight from the plan. The assignment and the planned duration are
 * inherited server-side.
 *
 * EP13I (D-I4): an optional `plannedMinutes` (5..480) overrides the target —
 * the "Just 10 min" micro-start — while the planned row's lifecycle stays
 * exactly EP13B's.
 *
 * 201: StudySession projection (linked, ACTIVE); 404 uniform (missing or
 * foreign); 409 open session / not today / not startable; 400 bad minutes.
 */
export async function startSessionFromPlanned(
  plannedSessionId: string,
  body?: { plannedMinutes: number }
): Promise<StudySession> {
  const response = await api.post<StudySession>(
    `/study-sessions/from-planned/${plannedSessionId}`,
    body
  );
  return response.data;
}

/**
 * EP13I — `POST /study-sessions/:id/absorb-next` (D-I8): fold the next
 * planned session of the same assignment today into the running session; the
 * target grows in place.
 *
 * 200: the updated StudySession; 404 uniform; 409 not running / no candidate.
 */
export async function absorbNextSession(id: string): Promise<StudySession> {
  const response = await api.post<StudySession>(`/study-sessions/${id}/absorb-next`);
  return response.data;
}

/** 200: StudySession projection | null (null when no open session). */
export async function getCurrentStudySession(): Promise<StudySession | null> {
  const response = await api.get<StudySession | null>('/study-sessions/current');
  return response.data;
}

/** 200: StudySession projection (status PAUSED); 404 uniform; 409 invalid transition. */
export async function pauseStudySession(id: string): Promise<StudySession> {
  const response = await api.post<StudySession>(`/study-sessions/${id}/pause`);
  return response.data;
}

/** 200: StudySession projection (status ACTIVE); 404 uniform; 409 invalid transition. */
export async function resumeStudySession(id: string): Promise<StudySession> {
  const response = await api.post<StudySession>(`/study-sessions/${id}/resume`);
  return response.data;
}

/** 200: StudySession projection (status COMPLETED); 404 uniform; 409 invalid transition. */
export async function finishStudySession(
  id: string,
  confirmedMinutes?: number
): Promise<StudySession> {
  const body: { confirmedMinutes?: number } = {};
  if (confirmedMinutes !== undefined) {
    body.confirmedMinutes = confirmedMinutes;
  }
  const response = await api.post<StudySession>(`/study-sessions/${id}/finish`, body);
  return response.data;
}

/** GET /study-sessions — completed sessions, newest first. */
export async function listStudySessions(
  params: ListStudySessionsParams = {}
): Promise<StudySessionListResponse> {
  const query: Record<string, string | number> = {};
  if (params.assignmentId) query.assignmentId = params.assignmentId;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (params.limit !== undefined) query.limit = params.limit;
  if (params.offset !== undefined) query.offset = params.offset;
  const response = await api.get<StudySessionListResponse>('/study-sessions', { params: query });
  return response.data;
}

/** GET /study-sessions/confirmed-time — per-assignment totals. */
export async function getConfirmedTime(): Promise<ConfirmedTimeListResponse>;
export async function getConfirmedTime(assignmentId: string): Promise<ConfirmedTimeSingleResponse>;
export async function getConfirmedTime(
  assignmentId?: string
): Promise<ConfirmedTimeListResponse | ConfirmedTimeSingleResponse> {
  const query: Record<string, string> = {};
  if (assignmentId) query.assignmentId = assignmentId;
  const response = await api.get<ConfirmedTimeListResponse | ConfirmedTimeSingleResponse>(
    '/study-sessions/confirmed-time',
    { params: query }
  );
  return response.data;
}
