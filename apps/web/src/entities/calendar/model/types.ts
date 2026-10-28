// Calendar types (SP-127B) — the `GET /calendar/events` payload contract
// (docs/stories/EP04/README.md#shared-api-contract). The server owns the date
// math (D404-2); the client only renders these pre-bucketed values.

export type CalendarEventType =
  | 'CLASS'
  | 'ASSIGNMENT_DEADLINE'
  | 'EXAM_DEADLINE'
  | 'STUDY_SESSION'
  | 'AVAILABILITY'
  | 'BLOCKED_TIME';

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  subtitle: string | null;
  date: string; // yyyy-MM-dd in the student's time zone
  startTime: string; // HH:mm in the student's time zone
  endTime: string | null; // HH:mm; null for point events (deadlines)
  courseId: string | null;
  courseName: string | null;
  courseColor: string | null;
  assignmentId: string | null;
  completed: boolean; // deadlines only
  focus: boolean; // STUDY_SESSION only
  link: string | null;
}

export interface CalendarEventsResult {
  timeZone: string;
  today: string;
  from: string;
  to: string;
  events: CalendarEvent[];
}
