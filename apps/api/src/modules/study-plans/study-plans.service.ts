import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { validateSync } from 'class-validator';

import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND, assertAffected } from '../../common/ownership/ownership';
import { resolveTimeZone, toCivilDate } from '../../common/lib/civil-date';
import {
  PREFERENCES_BAG_MAX_BYTES,
  STUDY_PREFERENCE_KEYS,
  readStudyPreferences,
  validateStudyPreferences,
} from '../../domain/study-planning/preferences';
import { classifyAssignments } from '../../domain/study-planning/remaining-work';
import { compareAssignments } from '../../domain/study-planning/ordering';
import { schedule } from '../../domain/study-planning/scheduler';
import { findConflicts } from '../../domain/study-planning/conflicts';
import type {
  AssignmentFacts,
  AssignmentStatusValue,
  ClassifiedAssignment,
  DatedInterval,
  RemainingWorkFlag,
  StudyPreferences,
  UnfinishedAssignmentStatus,
  WeeklyWindow,
} from '../../domain/study-planning/types';
import { UpdateStudyPreferencesDto } from './dto/update-study-preferences.dto';
import { SaveStudyPlanDto } from './dto/save-study-plan.dto';

/**
 * Study-plans service (EP06A + EP06B) — the study-planning surface: the
 * study-preferences half (`GET /study-preferences`, `PUT /study-preferences`
 * over the `studyDefaults` object stored in `User.preferences`, D06-4,
 * D06-14) and the remaining-work half (`GET /study-plans/remaining-work`,
 * AC-E06-02 / AC-E06-09).
 *
 * The shapes, the defaults, the bounds, the cross-field rules, the
 * defensive reader, the remaining-work classification and the shared
 * comparator live in the **pure domain module**
 * (`domain/study-planning/`); this service only owns the HTTP concerns — the
 * projection, the DTO re-validation, the scoped reads and the scoped write.
 * EP06D extends this module with the plan API.
 *
 * Ownership (repo convention, `common/ownership/ownership.ts`): the
 * principal's own `User` row is the record — `User.id` **is** the userId (the
 * model has no `userId` column), so the scoped where is `{ id: userId }`.
 * The write goes through a scoped `updateMany` and `assertAffected`, so a
 * vanished row is the same uniform 404 `Resource not found` as a missing
 * one — never a 403, never a distinct message (no existence oracle). Every
 * academic query carries the authenticated `userId` in its `where` clause.
 *
 * Validation: the DTO declares the per-field rules for the global
 * `FieldValidationPipe`; the service re-checks them via `validateSync`
 * (defense in depth for non-HTTP callers, the `availability` module's
 * precedent) and owns the cross-field rules, which it applies to the
 * **merged** values.
 */

/**
 * One row of the remaining-work read (the shared API contract's
 * `RemainingWorkItem`).
 *
 * `userId` is never exposed — the principal is implicit. `dueDate` is the
 * **profile zone's civil date** (`YYYY-MM-DD | null`, D06-24).
 * `estimatedMinutes` and `remainingMinutes` are `null` exactly when the
 * assignment is flagged `MISSING_ESTIMATE`.
 */
export type RemainingWorkItem = {
  assignmentId: string;
  title: string;
  courseCode: string | null;
  dueDate: string | null;
  estimatedMinutes: number | null;
  confirmedMinutes: number;
  remainingMinutes: number | null;
  status: UnfinishedAssignmentStatus;
  flagged: RemainingWorkFlag | null;
};

/** The body of `GET /study-plans/remaining-work`. */
export type RemainingWorkResponse = {
  items: RemainingWorkItem[];
  /**
   * The student's confirmed minutes that could **not** be attributed to an
   * assignment (D06-7, seam V-07-3). In state A — today's schema, where
   * `StudySession` has no `assignmentId` — that is the student's entire
   * confirmed total.
   */
  unattributedConfirmedMinutes: number;
};

/**
 * The response projection (the `availability` module's `toSlotResponse`
 * precedent): exactly the four contract keys, in the contract's order.
 * `userId` is never exposed and neither is the rest of the preferences bag.
 */
function toStudyPreferencesResponse(prefs: StudyPreferences): StudyPreferences {
  return {
    sessionLengthMinutes: prefs.sessionLengthMinutes,
    minSessionMinutes: prefs.minSessionMinutes,
    maxSessionMinutes: prefs.maxSessionMinutes,
    dailyCapMinutes: prefs.dailyCapMinutes,
  };
}

/**
 * Re-run a DTO's complete declared constraint set without coercion: defense
 * in depth for non-HTTP callers (the `availability` module's `dtoErrors`
 * precedent). Returns the field-level `errors` map, or `null` when valid.
 */
function dtoErrors(dto: object, template: object): Record<string, string[]> | null {
  const failures = validateSync(Object.assign(template, dto), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (!failures.length) {
    return null;
  }
  return Object.fromEntries(
    failures.map((failure) => [failure.property, Object.values(failure.constraints ?? {})])
  );
}

function throwFieldErrors(errors: Record<string, string[]>): never {
  throw new BadRequestException({
    statusCode: 400,
    message: Object.values(errors).flat(),
    error: 'Bad Request',
    errors,
  });
}

/** A JSON object (not an array, not `null`). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The client's subset of the four keys. An explicit `null` is treated as
 * omitted (the DTO's `@IsOptional()` skips nulls) — the availability module
 * normalizes the same way.
 */
function providedValues(dto: UpdateStudyPreferencesDto): Partial<StudyPreferences> {
  const subset: Partial<StudyPreferences> = {};
  for (const key of STUDY_PREFERENCE_KEYS) {
    const value = dto[key];
    if (value === undefined || value === null) {
      continue;
    }
    subset[key] = value;
  }
  return subset;
}

/**
 * The remaining-work projection (the `availability` module's
 * `toSlotResponse` precedent): exactly the documented keys, in the
 * contract's order. `userId` is never exposed, and neither `priority` nor
 * `createdAt` — they are the comparator's inputs, not part of the payload.
 */
function toRemainingWorkItem(assignment: ClassifiedAssignment): RemainingWorkItem {
  return {
    assignmentId: assignment.id,
    title: assignment.title,
    courseCode: assignment.courseCode,
    dueDate: assignment.dueDate,
    estimatedMinutes: assignment.estimatedMinutes,
    confirmedMinutes: assignment.confirmedMinutes,
    remainingMinutes: assignment.remainingMinutes,
    status: assignment.status,
    flagged: assignment.flagged,
  };
}

// ---------------------------------------------------------------------------
// Plan payload types (shared API contract, EP06 README).
// ---------------------------------------------------------------------------

export type PlanPreviewSession = {
  assignmentId: string;
  assignmentTitle: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

export type PlanPreviewDay = {
  date: string;
  targetMinutes: number;
  sessions: PlanPreviewSession[];
};

export type PlanPreviewWarning = {
  assignmentId: string;
  assignmentTitle: string;
  category: string;
  minutes: number;
  dueDate: string | null;
};

export type PlanPreview = {
  from: string;
  to: string;
  timeZone: string;
  generatedAt: string;
  preferences: StudyPreferences;
  days: PlanPreviewDay[];
  warnings: PlanPreviewWarning[];
  deferred: { assignmentId: string; minutes: number }[];
};

export type SavedPlanSession = {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
};

export type SavedPlanDay = {
  date: string;
  targetMinutes: number;
  sessions: SavedPlanSession[];
};

export type SavedPlan = {
  from: string;
  to: string;
  timeZone: string;
  days: SavedPlanDay[];
};

// ---------------------------------------------------------------------------
// Local helpers.
// ---------------------------------------------------------------------------

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function minutesToHHmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatToday(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: resolveTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function zoneParts(instant: Date, timeZone: string): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolveTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(instant);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '00';
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  let h = get('hour');
  if (h === '24') h = '00';
  return { date, minutes: Number(h) * 60 + Number(get('minute')) };
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return tzDate.getTime() - utcDate.getTime();
}

function wallToInstant(dateStr: string, hhmm: string, timeZone: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  let guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  for (let i = 0; i < 3; i++) {
    const offsetMs = tzOffsetMs(new Date(guess), timeZone);
    const corrected = Date.UTC(y, m - 1, d, hh, mm, 0) - offsetMs;
    if (corrected === guess) break;
    guess = corrected;
  }
  return new Date(guess);
}

function dayOfWeekOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00.000Z`).getUTCDay();
}

@Injectable()
export class StudyPlansService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /study-preferences — the student's **effective** study defaults: the
   * stored values with the per-field defaults filled in for any missing or
   * invalid field, then the documented repair order (the defensive reader,
   * D06-14). A missing, partial or malformed stored bag never fails the
   * request and never yields an invalid combination.
   *
   * 200 → `{ sessionLengthMinutes, minSessionMinutes, maxSessionMinutes,
   * dailyCapMinutes }`; 404 → the uniform `Resource not found` (the
   * principal's row no longer exists); 401 → unauthenticated (global guard).
   */
  async getPreferences(userId: string): Promise<StudyPreferences> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });
    if (!user) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
    return toStudyPreferencesResponse(readStudyPreferences(user.preferences));
  }

  /**
   * PUT /study-preferences — a **merge**: the client's subset is applied on
   * top of the current *effective* values, the merged result is validated,
   * and the complete four-key object is written into
   * `preferences.studyDefaults`. The bag's other keys survive unchanged
   * (the write is a merge **into** the `studyDefaults` key, never a
   * replacement of the whole column — D06-14, SP106's free-form bag).
   *
   * A single-field update is legal only against the stored values: e.g. a
   * `sessionLengthMinutes` below the effective `minSessionMinutes` is a
   * 400 naming `sessionLengthMinutes` (the availability module's "the
   * validation runs on the merged values" rule).
   *
   * 200 → the effective values; 400 → a field-level `errors` map (a
   * non-integer or out-of-range value, an unknown body field, a broken
   * cross-field rule, or a bag that would exceed the column's 4096-byte
   * cap) and **nothing written**; 404 → the uniform `Resource not found`;
   * 401 → unauthenticated (global guard).
   */
  async updatePreferences(
    userId: string,
    dto: UpdateStudyPreferencesDto
  ): Promise<StudyPreferences> {
    // Defense in depth for non-HTTP callers (the HTTP path is owned by the
    // global FieldValidationPipe): an unknown field or an out-of-range
    // value is rejected before anything is read or written.
    const fieldErrors = dtoErrors(dto, new UpdateStudyPreferencesDto());
    if (fieldErrors) {
      throwFieldErrors(fieldErrors);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });
    if (!user) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }

    // The merge: the client's subset on top of the current effective values.
    const effective = readStudyPreferences(user.preferences);
    const merged: StudyPreferences = { ...effective, ...providedValues(dto) };

    // The cross-field rules run on the merged values.
    const mergedErrors = validateStudyPreferences(merged);
    if (mergedErrors) {
      throwFieldErrors(mergedErrors);
    }

    // The write is a merge into the bag: every other key of the student's
    // preferences survives unchanged.
    const bag = {
      ...(isPlainObject(user.preferences) ? user.preferences : {}),
      studyDefaults: merged,
    };

    // The column's serialized-size cap (SP-106, D106-5) applies to the
    // resulting bag, not to the old one.
    const serialized = JSON.stringify(bag);
    if (Buffer.byteLength(serialized, 'utf8') > PREFERENCES_BAG_MAX_BYTES) {
      throwFieldErrors({
        preferences: [
          `preferences serialized size must not exceed ${PREFERENCES_BAG_MAX_BYTES} bytes`,
        ],
      });
    }

    // The scoped write: the principal's own row only.  0 affected rows
    // (the row vanished) is the same uniform 404 as a missing record.
    const result = await this.prisma.user.updateMany({
      where: { id: userId },
      data: { preferences: bag },
    });
    assertAffected(userId, result.count);

    return toStudyPreferencesResponse(merged);
  }

  /**
   * GET /study-plans/remaining-work — every **unfinished** assignment with
   * its estimate, its confirmed study time and what is left of it, plus the
   * reason an assignment was **flagged** instead of scheduled (AC-E06-02,
   * AC-E06-09).
   *
   * The rules live in the pure domain module: the estimate → minutes
   * conversion, the unfinished-status filter, the flagging matrix and the
   * remaining-work arithmetic (`domain/study-planning/remaining-work.ts`).
   * This method owns the three reads, the **one** civil-date conversion
   * (D06-24) and the ordering.
   *
   * Ordering: the items are sorted by the **shared comparator**
   * (`domain/study-planning/ordering.ts`, D06-22) — on-time assignments
   * first (due date ascending), then overdue, then undated; inside a group by
   * priority descending, then `createdAt` ascending, then `id` ascending. It
   * is the same comparator the scheduler places with, so the read and the
   * plan always agree about which work is "next".
   *
   * There is no request input to validate (the endpoint takes no body and no
   * query), so there is no DTO to re-run for non-HTTP callers; the principal
   * is still received explicitly and never read from the request.
   *
   * 200 → `{ items, unattributedConfirmedMinutes }`; 404 → the uniform
   * `Resource not found` (the principal's row no longer exists); 401 →
   * unauthenticated (global guard).
   */
  async getRemainingWork(userId: string): Promise<RemainingWorkResponse> {
    // The principal's own row: the profile zone every date is reported in
    // (D06-24). A missing row is the uniform 404, never a 403.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timeZone: true },
    });
    if (!user) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
    const timeZone = resolveTimeZone(user.timeZone);

    // The student's own assignments. The status filter is the domain's rule
    // (one implementation of "unfinished only"), so the query is not filtered
    // here. `actualHours` is deliberately **not** selected: confirmed time
    // comes from the session log, never from the denormalized column
    // (D07-2, AC 4).
    const assignments = await this.prisma.assignment.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        course: { select: { code: true } },
        dueDate: true,
        estimatedHours: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    });

    // The confirmed-time aggregation (D06-6): EP06 owns its own read of the
    // session log; it does not consume EP07B's `GET
    // /study-sessions/confirmed-time` (seam V-07-2 stays closed).
    //
    // STATE A (today's schema, D06-7): `StudySession` has no `assignmentId`
    // and no `status`, so a confirmed minute cannot be attributed to an
    // assignment. The student's total is reported as
    // `unattributedConfirmedMinutes` and every item's `confirmedMinutes` is
    // `0`.
    //
    // THE STATE-B UPGRADE (when EP07A's migration lands — seam V-07-3, named
    // here, not a new story and not a blocker):
    //   1. the `select` becomes
    //      `{ id: true, durationMinutes: true, assignmentId: true, status: true }`;
    //   2. only `status === 'COMPLETED'` sessions count as confirmed time (an
    //      `ACTIVE`/`PAUSED` session is not confirmed time);
    //   3. the rows are grouped by `assignmentId` into `confirmedByAssignment`
    //      — a row with a null `assignmentId` (including one whose
    //      assignment was deleted: EP07A uses `onDelete: SetNull`) stays in
    //      `unattributedConfirmedMinutes`.
    // The value it changes is `0` in both states until EP07A creates
    // sessions, so EP06's behaviour is unchanged today.
    const sessions = await this.prisma.studySession.findMany({
      where: { userId },
      select: { id: true, durationMinutes: true },
    });
    const unattributedConfirmedMinutes = sessions.reduce(
      (sum, session) => sum + session.durationMinutes,
      0
    );
    // State A: no session can be attributed to an assignment, so the map is
    // empty and every item's `confirmedMinutes` is 0.
    const confirmedByAssignment = new Map<string, number>();

    // The one civil-date conversion (D06-24): the stored instant becomes the
    // profile zone's civil date, and the domain stays zone-free.
    const facts: AssignmentFacts[] = assignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      courseCode: assignment.course?.code ?? null,
      dueDate: assignment.dueDate ? toCivilDate(assignment.dueDate, timeZone) : null,
      estimatedHours: assignment.estimatedHours,
      status: assignment.status,
      priority: assignment.priority,
      createdAt: assignment.createdAt,
    }));

    const { schedulable, flagged } = classifyAssignments(facts, confirmedByAssignment);

    // The shared comparator (D06-22). "Today" is the server's civil date in
    // the profile zone — the client never derives a date from the browser's
    // clock (D06-23).
    const today = toCivilDate(new Date(), timeZone);
    const ordered = [...schedulable, ...flagged].sort((a, b) => compareAssignments(a, b, today));

    return {
      items: ordered.map(toRemainingWorkItem),
      unattributedConfirmedMinutes,
    };
  }

  // -----------------------------------------------------------------------
  // EP06D — the plan preview / save / read API.
  // -----------------------------------------------------------------------

  private async gatherPlanData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timeZone: true, preferences: true },
    });
    if (!user) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
    const timeZone = resolveTimeZone(user.timeZone);
    const preferences = readStudyPreferences(user.preferences);

    const today = formatToday(timeZone);
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(today, i));
    }

    const assignments = await this.prisma.assignment.findMany({
      where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      select: {
        id: true,
        title: true,
        course: { select: { code: true } },
        dueDate: true,
        estimatedHours: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    });

    const slots = await this.prisma.availabilitySlot.findMany({ where: { userId } });

    const courses = await this.prisma.course.findMany({
      where: { userId, isActive: true },
      include: { meetings: true },
    });

    const sessions = await this.prisma.studySession.findMany({ where: { userId } });

    const facts: AssignmentFacts[] = assignments.map((a) => ({
      id: a.id,
      title: a.title,
      courseCode: a.course?.code ?? null,
      dueDate: a.dueDate ? toCivilDate(a.dueDate, timeZone) : null,
      estimatedHours: a.estimatedHours,
      status: a.status as AssignmentStatusValue,
      priority: a.priority as AssignmentFacts['priority'],
      createdAt: a.createdAt,
    }));

    const confirmedByAssignment = new Map<string, number>();
    const { schedulable } = classifyAssignments(facts, confirmedByAssignment);

    const available: WeeklyWindow[] = [];
    const blocked: WeeklyWindow[] = [];
    for (const slot of slots) {
      const w: WeeklyWindow = {
        dayOfWeek: slot.dayOfWeek,
        startMinute: hhmmToMinutes(slot.startTime),
        endMinute: hhmmToMinutes(slot.endTime),
      };
      if (slot.isAvailable) available.push(w);
      else blocked.push(w);
    }
    const classes: WeeklyWindow[] = [];
    for (const course of courses) {
      for (const m of course.meetings) {
        classes.push({
          dayOfWeek: m.dayOfWeek,
          startMinute: hhmmToMinutes(m.startTime),
          endMinute: hhmmToMinutes(m.endTime),
        });
      }
    }
    const busy: DatedInterval[] = sessions.map((s) => {
      const start = zoneParts(s.startTime, timeZone);
      const end = zoneParts(s.endTime, timeZone);
      return { date: start.date, startMinute: start.minutes, endMinute: end.minutes };
    });

    const titleById = new Map(assignments.map((a) => [a.id, a.title]));
    const dueById = new Map(
      assignments.map((a) => [a.id, a.dueDate ? toCivilDate(a.dueDate, timeZone) : null])
    );

    return {
      timeZone,
      preferences,
      days,
      available,
      blocked,
      classes,
      busy,
      schedulable,
      titleById,
      dueById,
      assignments,
    };
  }

  async preview(userId: string): Promise<PlanPreview> {
    const data = await this.gatherPlanData(userId);
    const output = schedule({
      days: data.days,
      assignments: data.schedulable,
      availability: data.available,
      blocked: data.blocked,
      classes: data.classes,
      busy: data.busy,
      preferences: data.preferences,
    });

    const sessionsByDay = new Map<string, PlanPreviewSession[]>();
    for (const d of data.days) sessionsByDay.set(d, []);
    for (const s of output.sessions) {
      const list = sessionsByDay.get(s.date);
      if (!list) continue;
      list.push({
        assignmentId: s.assignmentId,
        assignmentTitle: s.assignmentTitle,
        startTime: minutesToHHmm(s.startMinute),
        endTime: minutesToHHmm(s.endMinute),
        durationMinutes: s.durationMinutes,
      });
    }

    const days: PlanPreviewDay[] = data.days.map((date) => {
      const sessions = sessionsByDay.get(date) ?? [];
      const targetMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
      return { date, targetMinutes, sessions };
    });

    const warnings: PlanPreviewWarning[] = output.results
      .filter((r) => r.deficitCategory !== null)
      .map((r) => ({
        assignmentId: r.assignmentId,
        assignmentTitle: data.titleById.get(r.assignmentId) ?? '',
        category: r.deficitCategory as string,
        minutes: r.deficitMinutes,
        dueDate: data.dueById.get(r.assignmentId) ?? null,
      }));

    const deferred = output.results
      .filter((r) => r.deferredMinutes > 0)
      .map((r) => ({ assignmentId: r.assignmentId, minutes: r.deferredMinutes }));

    return {
      from: data.days[0],
      to: data.days[6],
      timeZone: data.timeZone,
      generatedAt: new Date().toISOString(),
      preferences: toStudyPreferencesResponse(data.preferences),
      days,
      warnings,
      deferred,
    };
  }

  async save(userId: string, dto: SaveStudyPlanDto): Promise<SavedPlan> {
    const fieldErrors = dtoErrors(dto, new SaveStudyPlanDto());
    if (fieldErrors) {
      throwFieldErrors(fieldErrors);
    }

    const data = await this.gatherPlanData(userId);
    const todayStr = data.days[0];

    // Window validation.
    if (dto.to !== addDays(dto.from, 6)) {
      throwFieldErrors({ to: ['to must be exactly six days after from'] });
    }
    const minFrom = addDays(todayStr, -6);
    if (dto.from < minFrom || dto.from > todayStr) {
      throw new HttpException(
        {
          statusCode: 409,
          message: 'The plan week has rolled over — generate a new proposal to save it.',
          error: 'WINDOW_ROLLED_OVER',
        },
        409
      );
    }

    // Malformed sessions.
    const sessionErrors: Record<string, string[]> = {};
    dto.sessions.forEach((s, i) => {
      if (!s.assignmentId || !s.assignmentId.trim()) {
        sessionErrors[`sessions.${i}.assignmentId`] = ['assignmentId is required'];
      }
      if (s.date < dto.from || s.date > dto.to) {
        sessionErrors[`sessions.${i}.date`] = ['date must be within the named window'];
      }
      const startMin = hhmmToMinutes(s.startTime);
      const endMin = hhmmToMinutes(s.endTime);
      if (endMin <= startMin) {
        sessionErrors[`sessions.${i}.endTime`] = ['endTime must be after startTime'];
      }
    });
    if (Object.keys(sessionErrors).length) {
      throwFieldErrors(sessionErrors);
    }

    // Assignment ownership.
    const uniqueIds = [...new Set(dto.sessions.map((s) => s.assignmentId))];
    for (const id of uniqueIds) {
      const a = await this.prisma.assignment.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!a || a.userId !== userId) {
        throw new NotFoundException(RESOURCE_NOT_FOUND);
      }
    }

    // Conflict re-check.
    const affectedDates: string[] = [];
    let cur = dto.from;
    while (cur <= dto.to) {
      affectedDates.push(cur);
      cur = addDays(cur, 1);
    }

    const classesDated: DatedInterval[] = [];
    const blockedDated: DatedInterval[] = [];
    for (const date of affectedDates) {
      const dow = dayOfWeekOf(date);
      for (const w of data.classes) {
        if (w.dayOfWeek === dow) {
          classesDated.push({ date, startMinute: w.startMinute, endMinute: w.endMinute });
        }
      }
      for (const w of data.blocked) {
        if (w.dayOfWeek === dow) {
          blockedDated.push({ date, startMinute: w.startMinute, endMinute: w.endMinute });
        }
      }
    }
    const busyDated = data.busy.filter((b) => b.date >= dto.from && b.date <= dto.to);

    const submitted = dto.sessions.map((s) => ({
      assignmentId: s.assignmentId,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
    }));
    const conflicts = findConflicts(submitted, {
      classes: classesDated,
      blocked: blockedDated,
      busy: busyDated,
    });
    if (conflicts.length) {
      throw new HttpException(
        {
          statusCode: 409,
          message: 'The plan conflicts with your calendar.',
          error: 'Conflict',
          conflicts,
        },
        409
      );
    }

    // Atomic transaction.
    const sessionsByDay = new Map<string, number>();
    for (const s of dto.sessions) {
      const mins = hhmmToMinutes(s.endTime) - hhmmToMinutes(s.startTime);
      sessionsByDay.set(s.date, (sessionsByDay.get(s.date) ?? 0) + mins);
    }

    await this.prisma.$transaction(async (tx) => {
      const planIdByDate = new Map<string, string>();
      for (const date of affectedDates) {
        const placedMinutes = sessionsByDay.get(date) ?? 0;
        const targetHours = placedMinutes / 60;
        const d = new Date(`${date}T00:00:00.000Z`);
        const plan = await tx.studyPlan.upsert({
          where: { userId_date: { userId, date: d } },
          create: { userId, date: d, targetHours },
          update: { targetHours },
          select: { id: true },
        });
        planIdByDate.set(date, plan.id);
      }

      const fromDate = new Date(`${dto.from}T00:00:00.000Z`);
      const toDate = new Date(`${dto.to}T00:00:00.000Z`);
      await tx.plannedSession.deleteMany({
        where: { studyPlan: { userId, date: { gte: fromDate, lte: toDate } } },
      });

      if (dto.sessions.length > 0) {
        await tx.plannedSession.createMany({
          data: dto.sessions.map((s) => ({
            studyPlanId: planIdByDate.get(s.date)!,
            assignmentId: s.assignmentId,
            startTime: wallToInstant(s.date, s.startTime, data.timeZone),
            endTime: wallToInstant(s.date, s.endTime, data.timeZone),
            durationMinutes: hhmmToMinutes(s.endTime) - hhmmToMinutes(s.startTime),
            status: 'SCHEDULED',
          })),
        });
      }
    });

    return this.getPlan(userId, dto.from, dto.to);
  }

  async getPlan(userId: string, from?: string, to?: string): Promise<SavedPlan> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timeZone: true },
    });
    if (!user) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
    const timeZone = resolveTimeZone(user.timeZone);

    let effectiveFrom: string;
    let effectiveTo: string;

    if (from && to) {
      // Validate range.
      const errors: Record<string, string[]> = {};
      const fromDate = new Date(`${from}T00:00:00.000Z`);
      const toDate = new Date(`${to}T00:00:00.000Z`);
      if (isNaN(fromDate.getTime())) errors.from = ['from must be YYYY-MM-DD'];
      if (isNaN(toDate.getTime())) errors.to = ['to must be YYYY-MM-DD'];
      if (!errors.from && !errors.to) {
        if (fromDate.getTime() > toDate.getTime()) {
          errors.from = ['from must not be after to'];
          errors.to = ['from must not be after to'];
        }
        const spanDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
        if (spanDays > 31) {
          errors.from = [...(errors.from ?? []), 'the inclusive range may not exceed 31 days'];
          errors.to = [...(errors.to ?? []), 'the inclusive range may not exceed 31 days'];
        }
      }
      if (Object.keys(errors).length) {
        throwFieldErrors(errors);
      }
      effectiveFrom = from;
      effectiveTo = to;
    } else if (!from && !to) {
      const latest = await this.prisma.studyPlan.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
        select: { date: true },
      });
      if (latest) {
        const lastDate = latest.date.toISOString().slice(0, 10);
        effectiveTo = lastDate;
        effectiveFrom = addDays(lastDate, -6);
      } else {
        const today = formatToday(timeZone);
        effectiveFrom = today;
        effectiveTo = addDays(today, 6);
      }
    } else {
      throwFieldErrors({
        from: ['from and to must both be provided'],
        to: ['from and to must both be provided'],
      });
    }

    const fromDate = new Date(`${effectiveFrom}T00:00:00.000Z`);
    const toDate = new Date(`${effectiveTo}T00:00:00.000Z`);
    const plans = await this.prisma.studyPlan.findMany({
      where: { userId, date: { gte: fromDate, lte: toDate } },
      include: { sessions: { include: { assignment: { select: { title: true } } } } },
      orderBy: { date: 'asc' },
    });

    const planByDate = new Map(plans.map((p) => [p.date.toISOString().slice(0, 10), p]));

    const days: SavedPlanDay[] = [];
    let cur = effectiveFrom;
    while (cur <= effectiveTo) {
      const plan = planByDate.get(cur);
      const sessions: SavedPlanSession[] = (plan?.sessions ?? []).map((sess) => {
        const start = zoneParts(sess.startTime, timeZone);
        const end = zoneParts(sess.endTime, timeZone);
        return {
          id: sess.id,
          assignmentId: sess.assignmentId,
          assignmentTitle: sess.assignment?.title ?? '',
          startTime: minutesToHHmm(start.minutes),
          endTime: minutesToHHmm(end.minutes),
          durationMinutes: sess.durationMinutes,
          status: sess.status,
        };
      });
      const targetMinutes = plan ? Math.round(plan.targetHours * 60) : 0;
      days.push({ date: cur, targetMinutes, sessions });
      cur = addDays(cur, 1);
    }

    return {
      from: effectiveFrom,
      to: effectiveTo,
      timeZone,
      days,
    };
  }
}
