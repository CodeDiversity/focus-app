// Calendar types (SP-127B, EP15D/EP15E) — the `GET /calendar/events` payload
// contract (docs/stories/EP15/contracts.md → Calendar read model). The server
// owns the date math (D404-2, AC-E15-09); the client only renders these
// pre-bucketed values and derives the visible week from the civil strings.

export type CalendarEventType =
  | 'CLASS'
  | 'ASSIGNMENT_DEADLINE'
  | 'EXAM_DEADLINE'
  | 'STUDY_SESSION'
  // EP13D: a session the plan proposes (closes EP06's V-05-1). Distinct from
  // STUDY_SESSION, which is time actually logged.
  | 'PLANNED_SESSION'
  // EP15D (D15-3): a BUSY schedule-block occurrence (an event the student
  // put on the calendar) and a STUDY schedule-block occurrence (time they
  // set aside to study). AVAILABILITY / BLOCKED_TIME are gone.
  | 'EVENT'
  | 'STUDY_BLOCK';

export type CalendarEnergy = 'HIGH' | 'NORMAL' | 'LOW';

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  subtitle: string | null;
  date: string; // yyyy-MM-dd in the student's time zone
  startTime: string; // HH:mm in the student's time zone
  endTime: string | null; // HH:mm ("24:00" allowed); null for point events (deadlines)
  courseId: string | null;
  courseName: string | null;
  courseColor: string | null;
  assignmentId: string | null;
  completed: boolean; // deadlines only
  focus: boolean; // STUDY_SESSION only
  link: string | null;
  // EP13H: PLANNED_SESSION only — FLEX_DAY renders day-level ("Anytime") and
  // the server sorts it first within its date; null for every other type.
  // Optional on the client so pre-EP13H fixtures/readers stay valid (the
  // server always sends it; absent reads as a fixed/clock event).
  anchor?: 'FIXED' | 'FLEX_DAY' | null;
  // EP15D: EVENT / STUDY_BLOCK only — the block behind the occurrence, whether
  // it repeats weekly, and (STUDY_BLOCK) its energy. Optional on the client so
  // older fixtures compile; the server always sends them (null elsewhere).
  blockId?: string | null;
  recurring?: boolean | null;
  energy?: CalendarEnergy | null;
}

/** EP15D — one civil date of the range: the day's bounds and its free time. */
export interface CalendarDay {
  date: string; // yyyy-MM-dd
  wakeTime: string; // HH:mm
  sleepTime: string; // HH:mm, "24:00" allowed
  free: { startTime: string; endTime: string }[];
}

export interface CalendarEventsResult {
  timeZone: string;
  today: string;
  from: string;
  to: string;
  /** EP15D — one entry per date in `[from, to]`, ascending. */
  days: CalendarDay[];
  events: CalendarEvent[];
}
