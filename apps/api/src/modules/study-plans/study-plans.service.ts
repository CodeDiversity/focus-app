import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
import type {
  AssignmentFacts,
  ClassifiedAssignment,
  RemainingWorkFlag,
  StudyPreferences,
  UnfinishedAssignmentStatus,
} from '../../domain/study-planning/types';
import { UpdateStudyPreferencesDto } from './dto/update-study-preferences.dto';

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
}
