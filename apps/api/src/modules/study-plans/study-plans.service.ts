import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { validateSync } from 'class-validator';

import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND, assertAffected } from '../../common/ownership/ownership';
import { addDays, dayOfWeekOf } from '../../common/lib/calendar-date';
import {
  resolveTimeZone,
  toCivilDate,
  wallClockToInstant,
  zoneParts,
} from '../../common/lib/civil-date';
import {
  PREFERENCES_BAG_MAX_BYTES,
  STUDY_PREFERENCE_KEYS,
  readStudyPreferences,
  validateStudyPreferences,
} from '../../domain/study-planning/preferences';
import { classifyAssignments } from '../../domain/study-planning/remaining-work';
import { calibrationSamplesOf, computeCalibration } from '../../domain/study-planning/calibration';
import type { CalibrationTable } from '../../domain/study-planning/calibration';
import { compareAssignments } from '../../domain/study-planning/ordering';
import { schedule } from '../../domain/study-planning/scheduler';
import { findConflicts } from '../../domain/study-planning/conflicts';
import { replan } from '../../domain/study-planning/catch-up';
import type { ReplanBusyInterval } from '../../domain/study-planning/catch-up';
import type {
  AssignmentFacts,
  AssignmentStatusValue,
  CalibrationAnnotation,
  ClassifiedAssignment,
  DatedInterval,
  PartOfDayValue,
  PlannedSessionAnchorValue,
  RemainingWorkFlag,
  StudyPreferences,
  UnfinishedAssignmentStatus,
  WeeklyWindow,
} from '../../domain/study-planning/types';
import { UpdateStudyPreferencesDto } from './dto/update-study-preferences.dto';
import { SaveStudyPlanDto } from './dto/save-study-plan.dto';
import { SetSessionLockDto } from './dto/set-session-lock.dto';

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
  /**
   * EP13L — the explanation behind a calibrated `remainingMinutes`
   * (`{ assignmentType, multiplier, samples }`), or `null` when the
   * student's history gave no multiplier (the figure is EP13A's unchanged).
   */
  calibration: CalibrationAnnotation | null;
};

/** The body of `GET /study-plans/remaining-work`. */
export type RemainingWorkResponse = {
  items: RemainingWorkItem[];
  /**
   * The student's confirmed minutes that could **not** be attributed to an
   * assignment (D06-7). Since EP13A (the State-B upgrade of seam V-07-3)
   * attributed minutes live on each item's `confirmedMinutes`; this figure is
   * the remainder — task-only sessions and sessions whose assignment was
   * deleted (`onDelete: SetNull`).
   */
  unattributedConfirmedMinutes: number;
};

// ---------------------------------------------------------------------------
// EP08A — recovery summary (missed sessions + unfinished work + confirmed
// minutes total).
// ---------------------------------------------------------------------------

/** One missed planned session (derived, never stored). */
export type MissedSession = {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  date: string; // profile zone civil date YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  locked: boolean;
};

/** The body of `GET /study-plans/recovery-summary`. */
export type RecoverySummary = {
  /**
   * Past sessions still `SCHEDULED` — after EP13C's read-time reconciliation
   * this is (almost always) empty: unstarted past work rolls forward instead
   * of accumulating. Kept for the shipped EP08D surface until EP13E lands.
   */
  missedSessions: MissedSession[];
  missedCount: number;
  /**
   * EP13C — the plan-health view's informational detail: sessions rolled
   * forward (`RESCHEDULED`) over the **last 7 days** whose assignment is
   * still unfinished. Bounded by construction so it can never become an
   * accumulating ledger (AC-E13-04).
   */
  rolledForward: MissedSession[];
  rolledForwardCount: number;
  rolledForwardMinutes: number;
  unfinishedWork: RemainingWorkItem[];
  confirmedMinutes: number;
  message: string;
};

// ---------------------------------------------------------------------------
// EP13C — the today read (GET /study-plans/today).
// ---------------------------------------------------------------------------

/** One of today's planned sessions, with its live status. */
export type TodaySession = {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  date: string; // profile zone civil date YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  status: string;
  locked: boolean;
  /**
   * EP13G — `FLEX_DAY` means the times above are a suggestion and this
   * session can be started whenever the student is ready today; `FIXED`
   * keeps the clock commitment.
   */
  anchor: PlannedSessionAnchorValue;
  /** EP13G — a flex-only part-of-day suggestion; `null` on a fixed session. */
  windowHint: PartOfDayValue | null;
};

/** The body of `GET /study-plans/today`. */
export type TodayPlan = {
  date: string;
  timeZone: string;
  sessions: TodaySession[];
  /** The single recommended next session, or null with a stated reason. */
  nextSession: TodaySession | null;
  nextSessionReason: 'NO_PLAN' | 'NOTHING_LEFT_TODAY' | null;
  /** Confirmed minutes studied inside today's profile-zone civil day. */
  confirmedMinutesToday: number;
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
    // EP13F's two placement levers (D13-5), additive to the D06-4 four.
    breakMinutes: prefs.breakMinutes,
    densityPercent: prefs.densityPercent,
    // EP13K's two momentum goals (D-K6/D-K7), additive.
    dailyGoalMinutes: prefs.dailyGoalMinutes,
    weeklyGoalDays: prefs.weeklyGoalDays,
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
    calibration: assignment.calibration,
  };
}

/**
 * EP13L — the distinct annotations behind a set of classified assignments,
 * one per figure (a type's own, or the overall fallback), in a stable
 * order. Empty for the uncalibrated student (EP13L-AC3: no annotation noise).
 */
function calibrationAnnotationsOf(
  assignments: readonly ClassifiedAssignment[]
): CalibrationAnnotation[] {
  const byKey = new Map<string, CalibrationAnnotation>();
  for (const a of assignments) {
    if (a.calibration) byKey.set(a.calibration.assignmentType ?? '', a.calibration);
  }
  return [...byKey.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
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
  /**
   * EP13G (D13-4 option b). `FLEX_DAY` — the times above are the engine's
   * *suggestion* and the session belongs to its day; `FIXED` — the slot is
   * a commitment (the deadline left no slack, or the student pinned it).
   */
  anchor: PlannedSessionAnchorValue;
  /** EP13G — a flex-only part-of-day suggestion; `null` on a fixed session. */
  windowHint: PartOfDayValue | null;
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
  /**
   * EP13L — every multiplier the proposal was planned with, each with its
   * history (`{ assignmentType, multiplier, samples }`); `assignmentType:
   * null` is the overall fallback (D-L3). Empty when no history calibrated
   * anything — the proposal is then exactly EP13A's.
   */
  calibration: CalibrationAnnotation[];
};

export type CatchUpPreview = PlanPreview & {
  missedSessions: MissedSession[];
  lockedPreserved: number;
  completedPreserved: number;
};

/**
 * The body of `PATCH /study-plans/sessions/:sessionId/lock` (EP08E): exactly
 * the two keys, `userId` never exposed.
 */
export type PlannedSessionLock = {
  id: string;
  locked: boolean;
};

export type SavedPlanSession = {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
  /** EP13G — see `PlanPreviewSession.anchor`. */
  anchor: PlannedSessionAnchorValue;
  /** EP13G — a flex-only part-of-day suggestion; `null` on a fixed session. */
  windowHint: PartOfDayValue | null;
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

function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function minutesToHHmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

@Injectable()
export class StudyPlansService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * EP13A — the one confirmed-time aggregation (closes the State-A seam,
   * V-07-3 / V-08-5): confirmed minutes are the `COMPLETED` session-log rows,
   * summed per assignment. Rows without an `assignmentId` (task-only
   * sessions, sessions whose assignment was deleted — EP07A uses
   * `onDelete: SetNull`) stay unattributed and never reduce an assignment's
   * remaining work (V-13-1). Every planning read shares this helper; there is
   * no second read path (AC-E13-01).
   */
  private async confirmedTimeByAssignment(userId: string): Promise<{
    byAssignment: Map<string, number>;
    unattributedMinutes: number;
    totalMinutes: number;
  }> {
    const groups = await this.prisma.studySession.groupBy({
      by: ['assignmentId'],
      where: { userId, status: 'COMPLETED' },
      _sum: { durationMinutes: true },
    });
    const byAssignment = new Map<string, number>();
    let unattributedMinutes = 0;
    let totalMinutes = 0;
    for (const group of groups) {
      const minutes = group._sum.durationMinutes ?? 0;
      totalMinutes += minutes;
      if (group.assignmentId === null) {
        unattributedMinutes += minutes;
      } else {
        byAssignment.set(group.assignmentId, minutes);
      }
    }
    return { byAssignment, unattributedMinutes, totalMinutes };
  }

  /**
   * EP13L (D-L5) — the student's calibration table, computed once per plan
   * read from their own finished assignments and the confirmed-time map
   * above (D-L2: confirmed session minutes, never `actualHours`). Pure
   * arithmetic over owned rows; nothing is persisted and `Assignment` is
   * never written. The query is `userId`-scoped and pre-filters what the
   * domain's sample rule (`calibrationSamplesOf`) re-applies.
   */
  private async calibrationTable(
    userId: string,
    confirmedByAssignment: ReadonlyMap<string, number>
  ): Promise<CalibrationTable> {
    const finished = await this.prisma.assignment.findMany({
      where: {
        userId,
        status: { in: ['COMPLETED', 'SUBMITTED', 'GRADED'] },
        estimatedHours: { gt: 0 },
      },
      select: { id: true, type: true, estimatedHours: true, status: true },
    });
    const samples = calibrationSamplesOf(
      finished.map((row) => ({
        id: row.id,
        assignmentType: row.type ?? null,
        estimatedHours: row.estimatedHours,
        status: row.status as AssignmentStatusValue,
      })),
      confirmedByAssignment
    );
    return computeCalibration(samples);
  }

  /**
   * EP13C — the lazy, idempotent rollover (AC-E13-04): every owned planned
   * session that is still `SCHEDULED`, dated strictly before today's civil
   * date, and **not actually done** flips to `RESCHEDULED`. The row is
   * preserved (history is never deleted) and no minute arithmetic happens
   * here — remaining work already flows from estimate − confirmed (EP13A),
   * so rolling forward is purely a status/reporting change.
   *
   * "Not actually done" = no linked `COMPLETED` study session with ≥ 1
   * confirmed minute. (EP13B completes such rows atomically, so this guard is
   * belt-and-braces; crucially it must NOT exclude rows whose linked session
   * finished with 0 minutes — those were deliberately handed back as
   * `SCHEDULED` and the work still remains.)
   *
   * Invoked at the start of every plan read/preview/save, the catch-up
   * paths, the recovery summary and the today read — there are no scheduled
   * jobs (D13-8), so reads self-heal. The conditional `updateMany` makes it
   * idempotent and concurrency-safe: a racing second reconcile matches 0
   * rows. Locked past rows roll like any other and keep their `locked` flag
   * (D13-2 provisional, V-13-2). Never writes `StudySession`, `Assignment`
   * or `Task`.
   */
  private async reconcilePastSessions(userId: string, todayCivil: string): Promise<number> {
    const bound = new Date(`${todayCivil}T00:00:00.000Z`);
    const result = await this.prisma.plannedSession.updateMany({
      where: {
        status: 'SCHEDULED',
        studyPlan: { userId, date: { lt: bound } },
        studySessions: { none: { status: 'COMPLETED', durationMinutes: { gte: 1 } } },
      },
      data: { status: 'RESCHEDULED' },
    });
    return result.count;
  }

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
    const { items, unattributedConfirmedMinutes } = await this.remainingWorkInternal(userId);
    return { items, unattributedConfirmedMinutes };
  }

  /**
   * The shared remaining-work computation behind `getRemainingWork` and the
   * recovery summary. Returns the public response plus the student's **total**
   * confirmed minutes (attributed + unattributed), which the recovery summary
   * reports but the remaining-work contract does not expose (EP13A).
   */
  private async remainingWorkInternal(
    userId: string
  ): Promise<RemainingWorkResponse & { totalConfirmedMinutes: number }> {
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
        type: true,
      },
    });

    // The confirmed-time aggregation (D06-6): EP06 owns its own read of the
    // session log; it does not consume EP07B's `GET
    // /study-sessions/confirmed-time` (seam V-07-2 stays closed).
    //
    // STATE B (EP13A — the documented V-07-3 upgrade, implemented): only
    // `COMPLETED` sessions count as confirmed time, summed per assignment;
    // a row with a null `assignmentId` (task-only, or the assignment was
    // deleted — `onDelete: SetNull`) stays in `unattributedConfirmedMinutes`.
    const confirmedTime = await this.confirmedTimeByAssignment(userId);
    const unattributedConfirmedMinutes = confirmedTime.unattributedMinutes;
    const confirmedByAssignment = confirmedTime.byAssignment;

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
      assignmentType: assignment.type ?? null,
    }));

    // EP13L: the student's own pace scales each estimate before confirmed
    // time is subtracted (D-L1); every item carries its explanation.
    const calibration = await this.calibrationTable(userId, confirmedByAssignment);
    const { schedulable, flagged } = classifyAssignments(facts, confirmedByAssignment, calibration);

    // The shared comparator (D06-22). "Today" is the server's civil date in
    // the profile zone — the client never derives a date from the browser's
    // clock (D06-23).
    const today = toCivilDate(new Date(), timeZone);
    const ordered = [...schedulable, ...flagged].sort((a, b) => compareAssignments(a, b, today));

    return {
      items: ordered.map(toRemainingWorkItem),
      unattributedConfirmedMinutes,
      totalConfirmedMinutes: confirmedTime.totalMinutes,
    };
  }

  /**
   * GET /study-plans/recovery-summary — the student's recovery summary
   * (EP08A): the missed planned sessions, the unfinished work (reusing
   * EP06's remaining-work classification and ordering) and the total
   * confirmed study time, plus a neutral, non-blaming message.
   *
   * Read-only: no row is written. Ownership-scoped: every query carries the
   * authenticated `userId`; a missing principal is the uniform 404.
   *
   * 200 → `RecoverySummary`; 404 → the uniform `Resource not found`; 401 →
   * unauthenticated (global guard).
   */
  async getRecoverySummary(userId: string): Promise<RecoverySummary> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timeZone: true },
    });
    if (!user) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
    const timeZone = resolveTimeZone(user.timeZone);

    // Civil "today" rendered as a UTC-midnight Date (EP06 convention, D06-24).
    // Do NOT convert a profile-zone midnight to an instant.
    const todayCivil = toCivilDate(new Date(), timeZone);
    const bound = new Date(`${todayCivil}T00:00:00.000Z`);

    // EP13C: the summary reports a self-healed plan — unstarted past work is
    // rolled forward first, so the "missed" list below no longer accumulates
    // (AC-E13-04). The rolled-forward detail is reported separately, bounded
    // to the last 7 days.
    await this.reconcilePastSessions(userId, todayCivil);

    const missedRows = await this.prisma.plannedSession.findMany({
      where: {
        studyPlan: { userId, date: { lt: bound } },
        status: 'SCHEDULED',
        assignment: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      },
      include: {
        studyPlan: { select: { date: true } },
        assignment: { select: { id: true, title: true } },
      },
      orderBy: [{ studyPlan: { date: 'asc' } }, { startTime: 'asc' }],
    });

    const missedSessions: MissedSession[] = missedRows.map((row) => {
      const start = zoneParts(row.startTime, timeZone);
      const end = zoneParts(row.endTime, timeZone);
      return {
        id: row.id,
        assignmentId: row.assignmentId,
        assignmentTitle: row.assignment?.title ?? '',
        date: row.studyPlan.date.toISOString().slice(0, 10),
        startTime: start.time,
        endTime: end.time,
        durationMinutes: row.durationMinutes,
        locked: row.locked,
      };
    });

    // Reuse EP06's remaining-work classification + ordering for the
    // unfinished-work list. Since EP13A (V-08-5 closed) per-assignment
    // `confirmedMinutes` is real, and the summary's `confirmedMinutes` is the
    // **total** confirmed study time (attributed + unattributed), per the
    // EP08 contract; EP08A does not re-implement the aggregation.
    const remaining = await this.remainingWorkInternal(userId);

    // EP13C — the informational rolled-forward detail: RESCHEDULED rows of
    // the last 7 days whose assignment is still unfinished. Same projection
    // as the missed list; a finished assignment's rolled rows drop out, and
    // the 7-day bound keeps this from ever becoming a ledger.
    const rolledBound = new Date(`${addDays(todayCivil, -7)}T00:00:00.000Z`);
    const rolledRows = await this.prisma.plannedSession.findMany({
      where: {
        studyPlan: { userId, date: { gte: rolledBound, lt: bound } },
        status: 'RESCHEDULED',
        assignment: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      },
      include: {
        studyPlan: { select: { date: true } },
        assignment: { select: { id: true, title: true } },
      },
      orderBy: [{ studyPlan: { date: 'asc' } }, { startTime: 'asc' }],
    });
    const rolledForward: MissedSession[] = rolledRows.map((row) => {
      const start = zoneParts(row.startTime, timeZone);
      const end = zoneParts(row.endTime, timeZone);
      return {
        id: row.id,
        assignmentId: row.assignmentId,
        assignmentTitle: row.assignment?.title ?? '',
        date: row.studyPlan.date.toISOString().slice(0, 10),
        startTime: start.time,
        endTime: end.time,
        durationMinutes: row.durationMinutes,
        locked: row.locked,
      };
    });

    return {
      missedSessions,
      missedCount: missedSessions.length,
      rolledForward,
      rolledForwardCount: rolledForward.length,
      rolledForwardMinutes: rolledForward.reduce((sum, s) => sum + s.durationMinutes, 0),
      unfinishedWork: remaining.items,
      confirmedMinutes: remaining.totalConfirmedMinutes,
      message:
        "Here's where your plan stands. You can create a catch-up plan whenever you're ready.",
    };
  }

  /**
   * GET /study-plans/today (EP13C) — the reconciled view of **today**: every
   * planned session of today's civil date with its live status, the single
   * recommended next session, and the minutes already confirmed inside
   * today's profile-zone day.
   *
   * `nextSession` is deterministic: the first session (startTime ascending,
   * ties by the shared comparator on the assignment facts, then id) whose own
   * status is `SCHEDULED`/`IN_PROGRESS` **and** whose assignment is still
   * unfinished. When it is null, `nextSessionReason` says why: `NO_PLAN`
   * (today has no sessions at all) or `NOTHING_LEFT_TODAY`.
   *
   * 200 → `TodayPlan`; 404 → the uniform `Resource not found`; 401 →
   * unauthenticated (global guard).
   */
  async getToday(userId: string): Promise<TodayPlan> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timeZone: true },
    });
    if (!user) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
    const timeZone = resolveTimeZone(user.timeZone);
    const today = toCivilDate(new Date(), timeZone);

    await this.reconcilePastSessions(userId, today);

    const rows = await this.prisma.plannedSession.findMany({
      where: { studyPlan: { userId, date: new Date(`${today}T00:00:00.000Z`) } },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
            dueDate: true,
          },
        },
      },
      orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
    });

    const sessions: TodaySession[] = rows.map((row) => {
      const start = zoneParts(row.startTime, timeZone);
      const end = zoneParts(row.endTime, timeZone);
      return {
        id: row.id,
        assignmentId: row.assignmentId,
        assignmentTitle: row.assignment?.title ?? '',
        date: today,
        startTime: start.time,
        endTime: end.time,
        durationMinutes: row.durationMinutes,
        status: row.status,
        locked: row.locked,
        // EP13G: the today read carries the anchor so the client can offer
        // "start whenever" rather than a clock-time promise (EP13H).
        anchor: row.anchor,
        windowHint: row.windowHint,
      };
    });

    // The deterministic "what now" pick. Ties on startTime cannot normally
    // exist (save's conflict check forbids overlaps), so the comparator and
    // id tie-breaks only pin the total order for directly-seeded data.
    const candidates = rows
      .filter(
        (row) =>
          (row.status === 'SCHEDULED' || row.status === 'IN_PROGRESS') &&
          (row.assignment?.status === 'PENDING' || row.assignment?.status === 'IN_PROGRESS')
      )
      .sort((a, b) => {
        if (a.startTime.getTime() !== b.startTime.getTime()) {
          return a.startTime.getTime() - b.startTime.getTime();
        }
        const byWork = compareAssignments(
          {
            id: a.assignmentId,
            dueDate: a.assignment?.dueDate ? toCivilDate(a.assignment.dueDate, timeZone) : null,
            priority: (a.assignment?.priority ?? 'MEDIUM') as AssignmentFacts['priority'],
            createdAt: a.assignment?.createdAt ?? a.startTime,
          },
          {
            id: b.assignmentId,
            dueDate: b.assignment?.dueDate ? toCivilDate(b.assignment.dueDate, timeZone) : null,
            priority: (b.assignment?.priority ?? 'MEDIUM') as AssignmentFacts['priority'],
            createdAt: b.assignment?.createdAt ?? b.startTime,
          },
          today
        );
        if (byWork !== 0) return byWork;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });

    const next = candidates.length > 0 ? sessions.find((s) => s.id === candidates[0].id)! : null;

    // Confirmed minutes inside today's profile-zone civil day. Which day a
    // session belongs to is decided by the canonical mapping — `toCivilDate`
    // on the stored instant, the same rule every other surface uses — NOT by
    // wall-clock bounds: `wallClockToInstant` resolves a DST-transition-day
    // midnight with the post-transition offset, which would silently drop the
    // first local hour of a DST-end day once a year. The instant range below
    // is a safe over-fetch (any zone's civil "today" lies within ±1 day of
    // its UTC midnight); the exact filter runs on the civil date.
    const todayUtcMidnight = new Date(`${today}T00:00:00.000Z`).getTime();
    const completedNearToday = await this.prisma.studySession.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        startTime: {
          gte: new Date(todayUtcMidnight - 24 * 3600 * 1000),
          lt: new Date(todayUtcMidnight + 48 * 3600 * 1000),
        },
      },
      select: { startTime: true, durationMinutes: true },
    });
    const confirmedMinutesToday = completedNearToday
      .filter((s) => toCivilDate(s.startTime, timeZone) === today)
      .reduce((sum, s) => sum + s.durationMinutes, 0);

    return {
      date: today,
      timeZone,
      sessions,
      nextSession: next,
      nextSessionReason: next ? null : sessions.length === 0 ? 'NO_PLAN' : 'NOTHING_LEFT_TODAY',
      confirmedMinutesToday,
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

    const today = toCivilDate(new Date(), timeZone);

    // EP13C: plans self-heal at read time — unstarted past sessions roll
    // forward before anything else is gathered.
    await this.reconcilePastSessions(userId, today);

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
        type: true,
      },
    });

    const slots = await this.prisma.availabilitySlot.findMany({ where: { userId } });

    const courses = await this.prisma.course.findMany({
      where: { userId, isActive: true },
      include: { meetings: true },
    });

    const sessions = await this.prisma.studySession.findMany({
      where: { userId, endTime: { not: null } },
    });

    // EP13A (AC-E13-01): confirmed study time is attributed per assignment
    // (State B) and feeds the classification below, so work already done is
    // never scheduled again.
    const confirmedTime = await this.confirmedTimeByAssignment(userId);

    // EP13L (D-L5): the calibration table, once per plan read, beside the
    // confirmed map it is derived from. Applied below in classification
    // (`est × m − confirmed`, D-L1) so placement v2 and the EP13G partition
    // read calibrated remaining work through the one existing path
    // (EP13L-AC2, EP13L-AC5).
    const calibration = await this.calibrationTable(userId, confirmedTime.byAssignment);

    // EP13A (AC-E13-02): one read of the planned sessions serves every
    // planning path. Preserved rows (completed or locked) become busy
    // intervals for the engine and for save/confirm conflict checks — a kept
    // commitment can never be double-booked. The `completed`/`locked` tags
    // ride into `replan`, which derives its preserved counts from them.
    const plannedRows = await this.prisma.plannedSession.findMany({
      where: { studyPlan: { userId } },
      include: { studyPlan: { select: { date: true } } },
    });
    const plannedBusy: ReplanBusyInterval[] = plannedRows
      .filter((ps) => ps.status === 'COMPLETED' || ps.locked)
      .map((ps) => {
        const start = zoneParts(ps.startTime, timeZone);
        const end = zoneParts(ps.endTime, timeZone);
        return {
          date: start.date,
          startMinute: hhmmToMinutes(start.time),
          endMinute: hhmmToMinutes(end.time),
          completed: ps.status === 'COMPLETED',
          locked: ps.locked,
        };
      });

    const facts: AssignmentFacts[] = assignments.map((a) => ({
      id: a.id,
      title: a.title,
      courseCode: a.course?.code ?? null,
      dueDate: a.dueDate ? toCivilDate(a.dueDate, timeZone) : null,
      estimatedHours: a.estimatedHours,
      status: a.status as AssignmentStatusValue,
      priority: a.priority as AssignmentFacts['priority'],
      createdAt: a.createdAt,
      assignmentType: a.type ?? null,
    }));

    const { schedulable: classified } = classifyAssignments(
      facts,
      confirmedTime.byAssignment,
      calibration
    );

    // EP13A (AC-E13-02): minutes held by locked, future, still-SCHEDULED
    // sessions are kept commitments — subtract them from the work handed to
    // the engine so locked time is never scheduled twice. Past locked rows
    // subtract nothing: that commitment was not kept, so the work remains.
    const lockedFutureByAssignment = new Map<string, number>();
    for (const ps of plannedRows) {
      if (ps.status !== 'SCHEDULED' || !ps.locked) continue;
      if (ps.studyPlan.date.toISOString().slice(0, 10) < today) continue;
      lockedFutureByAssignment.set(
        ps.assignmentId,
        (lockedFutureByAssignment.get(ps.assignmentId) ?? 0) + ps.durationMinutes
      );
    }
    // Zero-remaining assignments are effectively complete (AC-E13-05): they
    // stay in the remaining-work read with `remainingMinutes: 0`, but they are
    // not engine input — the engine marks every overdue assignment `OVERDUE`
    // even with nothing left to place (scheduler.ts), which would surface a
    // spurious warning for finished work.
    const schedulable = classified
      .map((a) => {
        const lockedMinutes = lockedFutureByAssignment.get(a.id) ?? 0;
        return lockedMinutes > 0
          ? { ...a, remainingMinutes: Math.max(0, a.remainingMinutes - lockedMinutes) }
          : a;
      })
      .filter((a) => a.remainingMinutes > 0);

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
    // Confirmed study sessions stay untagged (they count towards neither
    // preserved total); preserved planned sessions carry their tags (EP13A).
    const busy: ReplanBusyInterval[] = [
      ...sessions
        .filter((s): s is typeof s & { endTime: Date } => s.endTime !== null)
        .map((s) => {
          const start = zoneParts(s.startTime, timeZone);
          const end = zoneParts(s.endTime, timeZone);
          return {
            date: start.date,
            startMinute: hhmmToMinutes(start.time),
            endMinute: hhmmToMinutes(end.time),
          };
        }),
      ...plannedBusy,
    ];

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
      // EP13L (EP13L-AC3): the explanations behind the engine's input —
      // empty for the uncalibrated student.
      calibration: calibrationAnnotationsOf(schedulable),
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
        // EP13G: the engine's partition travels with the proposal.
        anchor: s.anchor,
        windowHint: s.windowHint,
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
      calibration: data.calibration,
    };
  }

  async catchUpPreview(userId: string): Promise<CatchUpPreview> {
    const data = await this.gatherPlanData(userId);

    // The sessions being recovered from (EP13C): after the read-time
    // reconciliation (run inside `gatherPlanData`) unstarted past work is
    // `RESCHEDULED`, so the catch-up preview lists the last 7 days of
    // rolled-forward sessions whose assignment is still unfinished — the
    // same 7-day bound as the recovery summary, so neither view can become
    // an accumulating ledger (AC-E13-04). Shape unchanged (`MissedSession`).
    const bound = new Date(`${data.days[0]}T00:00:00.000Z`);
    const rolledBound = new Date(`${addDays(data.days[0], -7)}T00:00:00.000Z`);
    const missedRows = await this.prisma.plannedSession.findMany({
      where: {
        studyPlan: { userId, date: { gte: rolledBound, lt: bound } },
        status: 'RESCHEDULED',
        assignment: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      },
      include: {
        studyPlan: { select: { date: true } },
        assignment: { select: { id: true, title: true } },
      },
      orderBy: [{ studyPlan: { date: 'asc' } }, { startTime: 'asc' }],
    });
    const missedSessions: MissedSession[] = missedRows.map((row) => {
      const start = zoneParts(row.startTime, data.timeZone);
      const end = zoneParts(row.endTime, data.timeZone);
      return {
        id: row.id,
        assignmentId: row.assignmentId,
        assignmentTitle: row.assignment?.title ?? '',
        date: row.studyPlan.date.toISOString().slice(0, 10),
        startTime: start.time,
        endTime: end.time,
        durationMinutes: row.durationMinutes,
        locked: row.locked,
      };
    });

    // The busy set (confirmed sessions + tagged completed/locked planned
    // rows) is gathered once in `gatherPlanData` (EP13A); `replan` derives
    // `lockedPreserved`/`completedPreserved` from the tags.
    const output = replan({
      days: data.days,
      assignments: data.schedulable,
      availability: data.available,
      blocked: data.blocked,
      classes: data.classes,
      busy: data.busy,
      missedSessions,
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
        // EP13G: the engine's partition travels with the proposal.
        anchor: s.anchor,
        windowHint: s.windowHint,
      });
    }

    const days = data.days.map((date) => {
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
      calibration: data.calibration,
      missedSessions: output.missedSessions,
      lockedPreserved: output.lockedPreserved,
      completedPreserved: output.completedPreserved,
    };
  }

  async catchUpConfirm(userId: string, dto: SaveStudyPlanDto): Promise<SavedPlan> {
    const fieldErrors = dtoErrors(dto, new SaveStudyPlanDto());
    if (fieldErrors) {
      throwFieldErrors(fieldErrors);
    }

    const data = await this.gatherPlanData(userId);
    const todayStr = data.days[0];

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
      // EP13G: a part-of-day hint only means something on a day-anchored
      // session — a clock slot already says when (AC-4).
      if (s.windowHint && (s.anchor ?? 'FIXED') !== 'FLEX_DAY') {
        sessionErrors[`sessions.${i}.windowHint`] = [
          'windowHint is only allowed on a FLEX_DAY session',
        ];
      }
    });
    if (Object.keys(sessionErrors).length) {
      throwFieldErrors(sessionErrors);
    }

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

    // `data.busy` already contains the preserved (completed/locked) planned
    // rows as busy intervals — gathered once in `gatherPlanData` (EP13A). The
    // replaced SCHEDULED non-locked rows are excluded by construction
    // (PR-002), so an unedited confirm never conflicts with itself.
    const busyDated = data.busy.filter((b) => b.date >= dto.from && b.date <= dto.to);

    const submitted = dto.sessions.map((s) => ({
      assignmentId: s.assignmentId,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      // EP13G: a flex session's slot is a suggestion, so it neither suffers
      // nor causes a clock-overlap conflict (AC-2). Its minutes still count
      // towards the day's budget — that accounting is the engine's.
      anchor: s.anchor ?? ('FIXED' as const),
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
        where: {
          status: 'SCHEDULED',
          locked: false,
          studyPlan: { userId, date: { gte: fromDate, lte: toDate } },
        },
      });

      if (dto.sessions.length > 0) {
        await tx.plannedSession.createMany({
          data: dto.sessions.map((s) => ({
            studyPlanId: planIdByDate.get(s.date)!,
            assignmentId: s.assignmentId,
            startTime: wallClockToInstant(s.date, s.startTime, data.timeZone),
            endTime: wallClockToInstant(s.date, s.endTime, data.timeZone),
            durationMinutes: hhmmToMinutes(s.endTime) - hhmmToMinutes(s.startTime),
            status: 'SCHEDULED',
            locked: false,
            // EP13G: omitted means FIXED — a pre-EP13G client keeps its
            // clock-commitment semantics, and the hint rides only on flex.
            anchor: s.anchor ?? 'FIXED',
            windowHint: s.anchor === 'FLEX_DAY' ? (s.windowHint ?? null) : null,
          })),
        });
      }
    });

    return this.getPlan(userId, dto.from, dto.to);
  }

  /**
   * The student's explicit lock toggle (EP08E, D08-4/V-08-1) behind
   * `PATCH /study-plans/sessions/:sessionId/lock`.
   *
   * Ownership (repo convention): `PlannedSession` has no `userId` column —
   * the scoped `where` carries the authenticated `userId` **through the
   * parent** (`studyPlan.userId`), the count goes through `assertAffected`,
   * and a missing or foreign id is the same uniform 404 `Resource not found`
   * — never a 403, never a distinct message (no existence oracle).
   *
   * Semantics: sets `locked` — never `status`, times, or any
   * `StudySession`/`Assignment`/`Task` row. Status-agnostic on purpose:
   * confirm only deletes `SCHEDULED && !locked` rows, so locking a
   * non-SCHEDULED row persists without a scheduling effect, and the preview
   * only surfaces SCHEDULED rows for toggling anyway.
   *
   * EP13G (AC-5): **locking a session also fixes it** — `locked: true`
   * writes `anchor: FIXED`. A lock is the student saying "keep this one
   * exactly here", which is a clock commitment by definition; the invariant
   * `locked ⇒ FIXED` is therefore enforced by the write rather than
   * rejected as an invalid combination. Unlocking leaves the anchor alone:
   * a session that was pinned stays pinned until the plan is regenerated.
   */
  async setSessionLock(
    userId: string,
    sessionId: string,
    dto: SetSessionLockDto
  ): Promise<PlannedSessionLock> {
    const fieldErrors = dtoErrors(dto, new SetSessionLockDto());
    if (fieldErrors) {
      throwFieldErrors(fieldErrors);
    }

    const updated = await this.prisma.plannedSession.updateMany({
      where: { id: sessionId, studyPlan: { userId } },
      data: dto.locked ? { locked: true, anchor: 'FIXED' } : { locked: false },
    });
    assertAffected(userId, updated.count);

    // Scoped echo read: `findMany` (relation filters are only allowed on the
    // non-unique finders); the `select` keeps the body at exactly the two
    // contract keys.
    const rows = await this.prisma.plannedSession.findMany({
      where: { id: sessionId, studyPlan: { userId } },
      select: { id: true, locked: true },
    });
    if (rows.length === 0) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
    return rows[0];
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
      // EP13G: a part-of-day hint only means something on a day-anchored
      // session — a clock slot already says when (AC-4).
      if (s.windowHint && (s.anchor ?? 'FIXED') !== 'FLEX_DAY') {
        sessionErrors[`sessions.${i}.windowHint`] = [
          'windowHint is only allowed on a FLEX_DAY session',
        ];
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
      // EP13G: a flex session's slot is a suggestion, so it neither suffers
      // nor causes a clock-overlap conflict (AC-2). Its minutes still count
      // towards the day's budget — that accounting is the engine's.
      anchor: s.anchor ?? ('FIXED' as const),
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
      // EP13A (AC-E13-02): save preserves locked and completed sessions —
      // only `SCHEDULED && !locked` rows are replaced, the same selective
      // delete as EP08C's catch-up confirm (no save↔confirm drift).
      await tx.plannedSession.deleteMany({
        where: {
          status: 'SCHEDULED',
          locked: false,
          studyPlan: { userId, date: { gte: fromDate, lte: toDate } },
        },
      });

      if (dto.sessions.length > 0) {
        await tx.plannedSession.createMany({
          data: dto.sessions.map((s) => ({
            studyPlanId: planIdByDate.get(s.date)!,
            assignmentId: s.assignmentId,
            startTime: wallClockToInstant(s.date, s.startTime, data.timeZone),
            endTime: wallClockToInstant(s.date, s.endTime, data.timeZone),
            durationMinutes: hhmmToMinutes(s.endTime) - hhmmToMinutes(s.startTime),
            status: 'SCHEDULED',
            locked: false,
            // EP13G: omitted means FIXED — a pre-EP13G client keeps its
            // clock-commitment semantics, and the hint rides only on flex.
            anchor: s.anchor ?? 'FIXED',
            windowHint: s.anchor === 'FLEX_DAY' ? (s.windowHint ?? null) : null,
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

    // EP13C: the saved-plan read self-heals too — a student returning after
    // days away gets a valid current plan from this read alone (AC-E13-04).
    await this.reconcilePastSessions(userId, toCivilDate(new Date(), timeZone));

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
        const today = toCivilDate(new Date(), timeZone);
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
          startTime: start.time,
          endTime: end.time,
          durationMinutes: sess.durationMinutes,
          status: sess.status,
          // EP13G: the saved row's anchor and its flex-only hint.
          anchor: sess.anchor,
          windowHint: sess.windowHint,
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
