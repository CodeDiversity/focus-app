import api from '@/shared/api/httpClient';
import type { AssignmentPriority, AssignmentType, CourseAssignment } from '@/shared/types/academic';

/** SP-113 create contract. Unset optional fields use the backend defaults (D115-2: omitted type stores null). */
export interface CreateAssignmentRequest {
  title: string;
  courseId?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  priority?: AssignmentPriority | null;
  type?: AssignmentType | null;
  description?: string | null;
}

/** 201: 11-key projection (`type` after `priority`); 400: field errors; 404: uniform course miss. */
export async function createAssignment(data: CreateAssignmentRequest): Promise<CourseAssignment> {
  const body: CreateAssignmentRequest = { title: data.title };
  if (data.courseId) body.courseId = data.courseId;
  if (data.dueDate) body.dueDate = data.dueDate;
  if (data.estimatedHours != null) body.estimatedHours = data.estimatedHours;
  if (data.priority) body.priority = data.priority;
  if (data.type) body.type = data.type;
  if (data.description) body.description = data.description;
  const response = await api.post<CourseAssignment>('/assignments', body);
  return response.data;
}

/**
 * Patch semantics: each field is optional; `null`/omitted keeps the stored value.
 * For `type` this is D115-3 — a null never clears an assignment type, so an
 * unset select sends no `type` key at all.
 */
export interface UpdateAssignmentRequest {
  title?: string;
  dueDate?: string | null;
  estimatedHours?: number | null;
  priority?: AssignmentPriority | null;
  type?: AssignmentType | null;
  description?: string | null;
}

/** 200: updated 11-key projection; 400: field errors; 404: uniform miss. */
export async function updateAssignment(
  assignmentId: string,
  data: UpdateAssignmentRequest
): Promise<CourseAssignment> {
  const response = await api.patch<CourseAssignment>(`/assignments/${assignmentId}`, data);
  return response.data;
}

/** 204 on success; 404 when the assignment is missing or foreign. */
export async function deleteAssignment(assignmentId: string): Promise<void> {
  await api.delete(`/assignments/${assignmentId}`);
}
