import * as z from 'zod';
import type { CalendarEvent } from '@/entities/calendar/model/types';
import type {
  CreateScheduleBlockRequest,
  EnergyLevel,
  ScheduleBlock,
  ScheduleBlockKind,
  UpdateScheduleBlockRequest,
} from '@/entities/schedule-block/model/types';
import { minutesOfTime, toApiEndTime, toInputEndTime } from '@/features/day-bounds/lib/midnight';

/**
 * The block sheet's form model (EP15G, pure — no React, no I/O). Mirrors
 * contracts § Field rules (DoD 2; the API stays the authority) and maps the
 * form to the `POST` / `PATCH` bodies. `endTime` follows the midnight mapping
 * (D-G6): the input's `00:00` is the API's `24:00`.
 */
export interface BlockFormValues {
  kind: ScheduleBlockKind;
  title: string;
  /** The block's date; "Starts on" when weekly. */
  date: string;
  startTime: string;
  endTime: string;
  weekly: boolean;
  /** 0…6, Sunday = 0; meaningful only when `weekly`. */
  weekdays: number[];
  /** "Ends on" — weekly only; empty = open-ended. */
  endDate: string;
  /** Study only; empty = no course. */
  courseId: string;
  /** Study only. */
  energy: EnergyLevel;
}

/** Form fields an API 400 `errors` map can name (contracts § Field rules → the sheet's fields). */
export const FIELD_ERROR_FIELDS = [
  'title',
  'startDate',
  'startTime',
  'endTime',
  'weekdays',
  'endDate',
  'courseId',
  'energy',
] as const;

/** API field → form field (the two names that differ). */
export const API_TO_FORM_FIELD: Record<(typeof FIELD_ERROR_FIELDS)[number], keyof BlockFormValues> =
  {
    title: 'title',
    startDate: 'date',
    startTime: 'startTime',
    endTime: 'endTime',
    weekdays: 'weekdays',
    endDate: 'endDate',
    courseId: 'courseId',
    energy: 'energy',
  };

export const MAX_TITLE = 60;
const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const blockFormSchema = z
  .object({
    kind: z.enum(['BUSY', 'STUDY']),
    title: z.string().refine((t) => t.trim().length <= MAX_TITLE, {
      message: 'Keep the title under 60 characters.',
    }),
    date: z.string().regex(CIVIL_DATE, 'Pick a date.'),
    startTime: z.string().refine((v) => {
      const m = minutesOfTime(v);
      return m !== null && m < 1440;
    }, 'Enter a start time (HH:mm).'),
    endTime: z.string().refine((v) => minutesOfTime(v) !== null, 'Enter an end time (HH:mm).'),
    weekly: z.boolean(),
    weekdays: z.array(z.number().int().min(0).max(6)),
    endDate: z.string(),
    courseId: z.string(),
    energy: z.enum(['HIGH', 'NORMAL', 'LOW']),
  })
  .superRefine((data, ctx) => {
    const start = minutesOfTime(data.startTime);
    const end = minutesOfTime(toApiEndTime(data.endTime));
    if (start !== null && start < 1440 && end !== null && end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'End must be after start.',
      });
    }
    if (data.weekly) {
      if (data.weekdays.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['weekdays'],
          message: 'Pick at least one day.',
        });
      }
      if (data.endDate !== '' && !CIVIL_DATE.test(data.endDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'Pick an end date.',
        });
      } else if (data.endDate !== '' && data.endDate < data.date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'Ends on must be on or after the start date.',
        });
      }
    }
  });

/** Add `minutes` to an `HH:mm` value, capped at `24:00`, returned as an **input** end value. */
export function addMinutesCapped(time: string, minutes: number): string {
  const m = minutesOfTime(time) ?? 0;
  const total = Math.min(1440, m + minutes);
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return toInputEndTime(`${hh}:${mm}`);
}

/** Weekday 0…6 of a civil date (Sunday = 0), by integer arithmetic only. */
export function weekdayOfDate(civil: string): number {
  const year = Number(civil.slice(0, 4));
  const month = Number(civil.slice(5, 7));
  const day = Number(civil.slice(8, 10));
  const days = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  return (((days + 4) % 7) + 7) % 7;
}

/**
 * Create-mode defaults (AC1): Busy, the given date, the given start (see
 * `defaults.ts`), end one hour later, weekly off with the date's weekday
 * pre-selected for when it is switched on, energy Normal, empty title.
 */
export function defaultFormValues(input: {
  date: string;
  startTime: string;
  endTime?: string;
  kind?: ScheduleBlockKind;
}): BlockFormValues {
  return {
    kind: input.kind ?? 'BUSY',
    title: '',
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime ?? addMinutesCapped(input.startTime, 60),
    weekly: false,
    weekdays: [weekdayOfDate(input.date)],
    endDate: '',
    courseId: '',
    energy: 'NORMAL',
  };
}

/** The `POST` body (AC1): one-off omits `weekdays`/`endDate`; Busy omits course/energy; empty title omitted. */
export function toPayload(values: BlockFormValues): CreateScheduleBlockRequest {
  const title = values.title.trim();
  const body: CreateScheduleBlockRequest = {
    kind: values.kind,
    startDate: values.date,
    startTime: values.startTime,
    endTime: toApiEndTime(values.endTime),
  };
  if (title) body.title = title;
  if (values.weekly) {
    body.weekdays = [...values.weekdays].sort((a, b) => a - b);
    if (values.endDate) body.endDate = values.endDate;
  }
  if (values.kind === 'STUDY') {
    if (values.courseId) body.courseId = values.courseId;
    body.energy = values.energy;
  }
  return body;
}

/**
 * Edit-mode pre-fill (AC2). The calendar occurrence carries kind, title,
 * date, times, energy and course; the series shape (`weekdays`, `endDate`)
 * comes from the `ScheduleBlock` row when it has been fetched. A server
 * default title ("Busy" / "Study") pre-fills as empty — the placeholder
 * shows it. The API's `24:00` end shows as `00:00` (D-G6).
 */
export function fromBlock(event: CalendarEvent, block?: ScheduleBlock): BlockFormValues {
  const kind: ScheduleBlockKind = event.type === 'STUDY_BLOCK' ? 'STUDY' : 'BUSY';
  const defaultTitle = kind === 'STUDY' ? 'Study' : 'Busy';
  const title = block ? (block.title ?? '') : event.title === defaultTitle ? '' : event.title;
  const weekly = block ? block.weekdays !== null : Boolean(event.recurring);
  return {
    kind,
    title,
    date: event.date,
    startTime: event.startTime,
    endTime: toInputEndTime(event.endTime ?? event.startTime),
    weekly,
    weekdays: block?.weekdays ? [...block.weekdays] : [weekdayOfDate(event.date)],
    endDate: block?.endDate ?? '',
    courseId: event.courseId ?? block?.courseId ?? '',
    energy: event.energy ?? block?.energy ?? 'NORMAL',
  };
}

const sameSet = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

/**
 * D-G10: on a weekly item, a change to the weekday chips, "Ends on" or the
 * weekly switch itself is series-level — "Just this day" has no meaning, so
 * the sheet saves for this and following weeks without the prompt.
 */
export function changedSeriesFields(initial: BlockFormValues, current: BlockFormValues): boolean {
  if (!initial.weekly) return false;
  if (!current.weekly) return true;
  return !sameSet(initial.weekdays, current.weekdays) || initial.endDate !== current.endDate;
}

/** `true` when any "More" value differs from its default (auto-expand in edit mode). */
export function hasNonDefaultMore(values: BlockFormValues): boolean {
  return (
    (values.weekly && values.endDate !== '') ||
    (values.kind === 'STUDY' && (values.courseId !== '' || values.energy !== 'NORMAL'))
  );
}

/**
 * The `PATCH` body: only the fields that changed, mapped to the API's names
 * and null-clears; switching weekly off sends `weekdays: null, endDate: null`
 * (contracts § PATCH semantics). Empty when nothing changed.
 */
export function toUpdatePayload(
  initial: BlockFormValues,
  current: BlockFormValues
): UpdateScheduleBlockRequest {
  const body: UpdateScheduleBlockRequest = {};
  const title = current.title.trim();
  if (title !== initial.title.trim()) body.title = title === '' ? null : title;
  if (current.date !== initial.date) body.startDate = current.date;
  if (current.startTime !== initial.startTime) body.startTime = current.startTime;
  if (toApiEndTime(current.endTime) !== toApiEndTime(initial.endTime)) {
    body.endTime = toApiEndTime(current.endTime);
  }
  if (current.weekly) {
    if (!initial.weekly || !sameSet(initial.weekdays, current.weekdays)) {
      body.weekdays = [...current.weekdays].sort((a, b) => a - b);
    }
    if (current.endDate !== initial.endDate)
      body.endDate = current.endDate === '' ? null : current.endDate;
  } else if (initial.weekly) {
    body.weekdays = null;
    body.endDate = null;
  }
  if (current.kind === 'STUDY') {
    if (current.courseId !== initial.courseId)
      body.courseId = current.courseId === '' ? null : current.courseId;
    if (current.energy !== initial.energy) body.energy = current.energy;
  }
  return body;
}
