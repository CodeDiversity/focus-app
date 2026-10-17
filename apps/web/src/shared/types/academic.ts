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
  isActive: boolean;
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
