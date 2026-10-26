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
/** The closed optional assignment classification (SP-115, D115-1 — no `OTHER`, no free text). */
export type AssignmentType = 'HOMEWORK' | 'PAPER' | 'PROJECT' | 'QUIZ' | 'EXAM';

export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  /** Optional type (SP-115): null when unset; PATCH null/omit keeps a stored value (D115-3). */
  type: AssignmentType | null;
  course: Course | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The assignment projection on the course detail route (SP-112, D112-3/D112-6,
 * plus SP-120 D120-5): `Assignment` minus nested `course`, plus ordered
 * `subtasks`. Direct POST/PATCH `/assignments` responses stay the 11-key
 * shape (no `subtasks` key); only `GET /courses/:id` adds it.
 */
export type CourseAssignment = Omit<Assignment, 'course'> & {
  /** Ordered checklist (D120-5): `orderIndex` asc, then `createdAt` asc. */
  subtasks: Subtask[];
};

/**
 * The 6-key subtask projection (SP-120, D120-3). `userId` and `assignmentId`
 * are never exposed. `status` is only `PENDING` | `COMPLETED` (D120-4).
 */
export interface Subtask {
  id: string;
  title: string;
  status: 'PENDING' | 'COMPLETED';
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

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

/**
 * The cross-course assignment list projection (SP-122A, D122-6): the 11
 * assignment keys (`type` after `priority`) plus `course: { id, name, code,
 * color } | null` and `subtasks: Subtask[]`. Returned by `GET /assignments`.
 */
export interface AssignmentListItemCourse {
  id: string;
  name: string;
  code: string;
  color: string;
}

export interface AssignmentListItem {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  type: AssignmentType | null;
  createdAt: string;
  updatedAt: string;
  course: AssignmentListItemCourse | null;
  subtasks: Subtask[];
}
