import api from '@/shared/api/httpClient';
import type { AssignmentPriority, CourseAssignment } from '@/shared/types/academic';

/** SP-113 create contract. Unset optional fields use the backend defaults. */
export interface CreateAssignmentRequest {
  title: string;
  courseId?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  priority?: AssignmentPriority | null;
  description?: string | null;
}

/** 201: 10-key projection; 400: field errors; 404: uniform course miss. */
export async function createAssignment(data: CreateAssignmentRequest): Promise<CourseAssignment> {
  const body: CreateAssignmentRequest = { title: data.title };
  if (data.courseId) body.courseId = data.courseId;
  if (data.dueDate) body.dueDate = data.dueDate;
  if (data.estimatedHours != null) body.estimatedHours = data.estimatedHours;
  if (data.priority) body.priority = data.priority;
  if (data.description) body.description = data.description;
  const response = await api.post<CourseAssignment>('/assignments', body);
  return response.data;
}
