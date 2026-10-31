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
