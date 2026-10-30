import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { validateSync } from 'class-validator';

import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND, assertAffected } from '../../common/ownership/ownership';
import {
  PREFERENCES_BAG_MAX_BYTES,
  STUDY_PREFERENCE_KEYS,
  readStudyPreferences,
  validateStudyPreferences,
} from '../../domain/study-planning/preferences';
import type { StudyPreferences } from '../../domain/study-planning/types';
import { UpdateStudyPreferencesDto } from './dto/update-study-preferences.dto';

/**
 * Study-plans service (EP06A) — the study-preferences half of the
 * study-planning surface: `GET /study-preferences` and
 * `PUT /study-preferences` over the `studyDefaults` object stored in
 * `User.preferences` (D06-4, D06-14).
 *
 * The shape, the defaults, the bounds, the cross-field rules and the
 * defensive reader live in the **pure domain module**
 * (`domain/study-planning/preferences.ts`); this service only owns the HTTP
 * concerns — the projection, the DTO re-validation and the scoped write.
 * EP06B/EP06D extend this module with the remaining-work read and the plan
 * API.
 *
 * Ownership (repo convention, `common/ownership/ownership.ts`): the
 * principal's own `User` row is the record — `User.id` **is** the userId (the
 * model has no `userId` column), so the scoped where is `{ id: userId }`.
 * The write goes through a scoped `updateMany` and `assertAffected`, so a
 * vanished row is the same uniform 404 `Resource not found` as a missing
 * one — never a 403, never a distinct message (no existence oracle).
 *
 * Validation: the DTO declares the per-field rules for the global
 * `FieldValidationPipe`; the service re-checks them via `validateSync`
 * (defense in depth for non-HTTP callers, the `availability` module's
 * precedent) and owns the cross-field rules, which it applies to the
 * **merged** values.
 */

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
}
