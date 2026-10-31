import api from '@/shared/api/httpClient';
import type { StudySession } from '../model/types';

export interface StartStudySessionRequest {
  assignmentId: string;
  plannedMinutes: number;
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
export async function finishStudySession(id: string): Promise<StudySession> {
  const response = await api.post<StudySession>(`/study-sessions/${id}/finish`, {});
  return response.data;
}
