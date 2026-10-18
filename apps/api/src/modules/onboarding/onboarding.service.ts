import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

/**
 * Response shape for GET /onboarding (the same shape PATCH returns).
 */
export interface OnboardingState {
  step: number;
  completed: boolean;
  completedAt: string | null;
  semesterId: string | null;
}

/** The three onboarding columns of a `User` row (the service's full view). */
interface OnboardingRow {
  onboardingStep: number;
  onboardingCompletedAt: Date | null;
  onboardingSemesterId: string | null;
}

const ONBOARDING_SELECT = {
  onboardingStep: true,
  onboardingCompletedAt: true,
  onboardingSemesterId: true,
} as const;

/**
 * Onboarding state service (SP-107A).
 *
 * The state lives on the `User` row itself (D107-1): `onboardingStep`
 * (first incomplete step, 1–3), `onboardingCompletedAt` (set on complete
 * or skip; `completed` is derived from it — terminal), `onboardingSemesterId`
 * (semester created in step 2, for step-3 resume).
 *
 * Every operation is scoped to the requesting student's own row via the JWT
 * principal (SP-104) — there is no id parameter and no cross-student access.
 * The only cross-entity reference is `semesterId`, ownership-checked with the
 * repo convention (`common/ownership/ownership.ts`): missing or another
 * student's id → uniform 404 `Resource not found` (no existence oracle).
 */
@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Read the onboarding state for a single user.
   *
   * `semesterId` is returned only when the stored id points to a semester
   * that still exists AND belongs to the requesting student (ownership
   * predicate in the query).  Otherwise it is null.
   */
  async getState(userId: string): Promise<OnboardingState> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: ONBOARDING_SELECT,
    });

    // A user that does not exist is treated as a fresh registration:
    // step 1, not completed, no semester.  (The route is authenticated
    // so this path is unreachable in normal operation; it is a safety
    // net for the unit test.)
    if (!user) {
      return {
        step: 1,
        completed: false,
        completedAt: null,
        semesterId: null,
      };
    }

    return this.toState(userId, user);
  }

  /**
   * Update onboarding state for a single user.
   *
   * Rules (shared API contract, SP-107 README):
   * - At least one field must be provided (empty body → 400).
   * - `step` must be 1–3; regression (new < current) → 400.
   * - `completed: true` sets `onboardingCompletedAt` to now().
   * - `completed: false` → 400 (explicitly rejected).
   * - `semesterId` must exist AND belong to the user (missing or foreign
   *   → 404 "Resource not found"); an explicit null clears it.
   * - Any write to an already-completed state → 409 (terminal).
   *
   * Race safety (ticket AC-4): the write is a *claim* — `updateMany`
   * predicated on `onboardingCompletedAt: null`.  Unlike `update` (which
   * throws P2025 → 404 when zero rows match), `updateMany` silently
   * affects 0 rows, so a zero-count claim means another request completed
   * onboarding between our read and write: re-read and return 409 (the
   * same convention as `assertAffected` in `common/ownership/ownership.ts`).
   */
  async update(userId: string, input: UpdateOnboardingDto): Promise<OnboardingState> {
    // --- Validate: empty body ---
    const hasStep = input.step !== undefined;
    const hasCompleted = input.completed !== undefined;
    const hasSemesterId = input.semesterId !== undefined;

    if (!hasStep && !hasCompleted && !hasSemesterId) {
      throw new BadRequestException('At least one field must be provided');
    }

    // --- Validate: step range ---
    if (hasStep && (input.step! < 1 || input.step! > 3)) {
      throw new BadRequestException('Step must be between 1 and 3');
    }

    // --- Validate: completed: false is rejected ---
    if (hasCompleted && input.completed === false) {
      throw new BadRequestException('Setting completed to false is not allowed');
    }

    // --- Read the current user state ---
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: ONBOARDING_SELECT,
    });

    if (!existing) {
      // Should not happen for an authenticated user, but handle safely.
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }

    // --- Terminal check: any write to an already-completed state → 409 ---
    // (Must come before step regression so that completed users always 409,
    //  regardless of what step they try to set.)
    if (existing.onboardingCompletedAt !== null) {
      throw new ConflictException('Onboarding is already completed — this state is terminal');
    }

    // --- Validate: step regression (the 400 regression path, ticket AC-4) ---
    if (hasStep && input.step! < existing.onboardingStep) {
      throw new BadRequestException(
        'Step cannot regress: current step is ' + existing.onboardingStep
      );
    }

    // --- Validate: semesterId ownership (if provided and non-null) ---
    // Missing or another student's id → uniform 404; nothing is written.
    let semesterIdToSet: string | null = input.semesterId ?? null;
    if (hasSemesterId && input.semesterId) {
      const semester = await this.prisma.semester.findFirst({
        where: { id: input.semesterId, userId },
        select: { id: true },
      });
      if (!semester) {
        throw new NotFoundException(RESOURCE_NOT_FOUND);
      }
      semesterIdToSet = semester.id;
    }

    // --- Build the partial update data ---
    const data: Prisma.UserUpdateManyMutationInput = {};
    if (hasStep) {
      data.onboardingStep = input.step!;
    }
    if (hasSemesterId) {
      // Validated id, or an explicit null (clears the stored semester).
      data.onboardingSemesterId = semesterIdToSet;
    }
    if (hasCompleted && input.completed === true) {
      data.onboardingCompletedAt = new Date();
    }

    // --- Claim (race-safe): only write if not yet completed ---
    // `updateMany` matches 0 rows silently when the user was completed
    // concurrently (instead of throwing P2025 → 404 like `update` would).
    const claimed = await this.prisma.user.updateMany({
      where: { id: userId, onboardingCompletedAt: null },
      data,
    });

    if (claimed.count === 0) {
      // The claim lost the race: another request completed onboarding
      // between our read and write.  Re-read to confirm the terminal
      // state, then 409 (or, defensively, return the current state).
      const reRead = await this.prisma.user.findUnique({
        where: { id: userId },
        select: ONBOARDING_SELECT,
      });

      if (!reRead) {
        throw new NotFoundException(RESOURCE_NOT_FOUND);
      }

      if (reRead.onboardingCompletedAt !== null) {
        throw new ConflictException('Onboarding is already completed — this state is terminal');
      }

      // Defensive: the claim predicate only checks completion, so a
      // zero-row claim with a still-incomplete re-read is unreachable in
      // practice (nothing clears `onboardingCompletedAt`).  Return the
      // current state rather than erroring.
      return this.toState(userId, reRead);
    }

    // --- Claimed: re-read the updated row and return the current state ---
    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      select: ONBOARDING_SELECT,
    });

    if (!updated) {
      // Unreachable for an authenticated principal; fail closed.
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }

    return this.toState(userId, updated);
  }

  /**
   * Project an onboarding row to the API shape, validating the stored
   * semesterId against the requesting student (ownership predicate in the
   * query — a foreign or deleted semester is silently nullified).
   */
  private async toState(userId: string, user: OnboardingRow): Promise<OnboardingState> {
    const semester = user.onboardingSemesterId
      ? await this.prisma.semester.findFirst({
          where: { id: user.onboardingSemesterId, userId },
          select: { id: true },
        })
      : null;

    return {
      step: user.onboardingStep,
      completed: user.onboardingCompletedAt !== null,
      completedAt: user.onboardingCompletedAt ? user.onboardingCompletedAt.toISOString() : null,
      semesterId: semester ? semester.id : null,
    };
  }
}
