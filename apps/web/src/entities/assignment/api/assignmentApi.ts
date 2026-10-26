import api from '@/shared/api/httpClient';
import type {
  AssignmentListItem,
  AssignmentPriority,
  AssignmentStatus,
  AssignmentType,
  CourseAssignment,
  Subtask,
} from '@/shared/types/academic';

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
  status?: AssignmentStatus | null;
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

/** 200: ordered 6-key subtasks; 404: uniform assignment miss. The checklist does not call this — it reads the course projection (D120-5). */
export async function listSubtasks(assignmentId: string): Promise<Subtask[]> {
  const response = await api.get<Subtask[]>(`/assignments/${assignmentId}/subtasks`);
  return response.data;
}

/** Create body is title only (D120-3). Omitted `orderIndex` appends (D120-7). Status is never sent. */
export interface CreateSubtaskRequest {
  title: string;
}

/** 201: 6-key subtask; 400: field errors; 404: uniform assignment miss. */
export async function createSubtask(
  assignmentId: string,
  data: CreateSubtaskRequest
): Promise<Subtask> {
  const response = await api.post<Subtask>(`/assignments/${assignmentId}/subtasks`, {
    title: data.title,
  });
  return response.data;
}

/** Partial merge. Callers send only the fields they change. */
export interface UpdateSubtaskRequest {
  title?: string;
  status?: 'PENDING' | 'COMPLETED';
  orderIndex?: number;
}

/** 200: updated 6-key subtask; 400: field errors; 404: uniform miss. */
export async function updateSubtask(
  assignmentId: string,
  subtaskId: string,
  data: UpdateSubtaskRequest
): Promise<Subtask> {
  const response = await api.patch<Subtask>(
    `/assignments/${assignmentId}/subtasks/${subtaskId}`,
    data
  );
  return response.data;
}

/** 204 on success; 404 when the assignment or subtask is missing or foreign. */
export async function deleteSubtask(assignmentId: string, subtaskId: string): Promise<void> {
  await api.delete(`/assignments/${assignmentId}/subtasks/${subtaskId}`);
}

/** `GET /assignments` query (SP-122A contract). All fields optional and AND-combined. */
export interface ListAssignmentsParams {
  courseId?: string;
  status?: AssignmentStatus;
  priority?: AssignmentPriority;
  type?: AssignmentType;
  dueFrom?: string;
  dueTo?: string;
  q?: string;
  sort?: 'dueDate' | 'title' | 'priority' | 'status' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}

/**
 * Lists the authenticated student's assignments across courses (SP-122A
 * contract). Unset/empty params are omitted so the backend defaults apply
 * and the whitelist is not tripped.
 */
export async function listAssignments(
  params: ListAssignmentsParams = {}
): Promise<AssignmentListItem[]> {
  const query: Record<string, string> = {};
  if (params.courseId) query.courseId = params.courseId;
  if (params.status) query.status = params.status;
  if (params.priority) query.priority = params.priority;
  if (params.type) query.type = params.type;
  if (params.dueFrom) query.dueFrom = params.dueFrom;
  if (params.dueTo) query.dueTo = params.dueTo;
  if (params.q && params.q.trim()) query.q = params.q.trim();
  if (params.sort) query.sort = params.sort;
  if (params.order) query.order = params.order;
  const response = await api.get<AssignmentListItem[]>('/assignments', { params: query });
  return response.data;
}
