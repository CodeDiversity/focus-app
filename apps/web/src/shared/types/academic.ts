// Semester Types
export interface Semester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Course Types
export interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string;
  credits: number | null;
  /** The course's instructor (SP-111A, D111-1) — null when unset. */
  instructor: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Class Meeting Types (SP-112)
/**
 * A recurring weekly class meeting (the shared API contract, SP-112 README):
 * the canonical 6-key `toMeetingResponse` shape — `userId`/`courseId` are
 * never exposed (the course is the navigation unit, D112-2).  `createdAt`/
 * `updatedAt` are ISO timestamps.
 */
export interface ClassMeeting {
  id: string;
  /** 0–6, Sunday=0 … Saturday=6 (D112-1, the `AvailabilitySlot` precedent). */
  dayOfWeek: number;
  /** 24-hour `HH:mm`, exactly as stored (recurring time of day — no time-zone). */
  startTime: string;
  /** 24-hour `HH:mm`; strictly after `startTime` on the same day (no midnight wrap). */
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

// Assignment Types
export type AssignmentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SUBMITTED' | 'GRADED';
export type AssignmentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  estimatedHours: number | null;
  actualHours: number | null;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  course: Course | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The read-only assignment projection on the course detail route (SP-112,
 * D112-3/D112-6): the `Assignment` type minus the nested `course` — the
 * backend's 10-key `toAssignmentResponse` shape (`dueDate` ISO;
 * `userId`/`courseId` never exposed).  The full `Assignment` type stays
 * untouched (it is referenced only by `Task`).
 */
export type CourseAssignment = Omit<Assignment, 'course'>;

// Task Types
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  status: TaskStatus;
  priority: TaskPriority;
  orderIndex: number;
  assignment: Assignment | null;
  createdAt: string;
  updatedAt: string;
}

// Study Session Types
export interface StudySession {
  id: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  notes: string | null;
  isFocusMode: boolean;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
}
