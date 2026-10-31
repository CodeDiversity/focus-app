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
