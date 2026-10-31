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
