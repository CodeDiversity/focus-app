import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { validateSync } from 'class-validator';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND, assertAffected } from '../../common/ownership/ownership';
import { CreateAvailabilitySlotDto } from './dto/create-availability-slot.dto';
import { UpdateAvailabilitySlotDto } from './dto/update-availability-slot.dto';

/**
 * An `availability_slots` row as stored (the model's scalar fields).
 */
type AvailabilitySlotRow = {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * The `AvailabilitySlot` API shape (shared API contract, EP04 README):
 * `{ id, dayOfWeek, startTime, endTime, isAvailable, createdAt, updatedAt }`
 * with ISO timestamps.  `userId` is never exposed — the principal is
 * implicit, and leaking it would reveal ownership/handle data the contract
 * excludes.
 */
function toSlotResponse(row: AvailabilitySlotRow) {
  return {
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    isAvailable: row.isAvailable,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** `HH:mm` 24-hour format. */
const HH_MM = /^\d{2}:\d{2}$/;

/**
 * Re-run a DTO's complete declared constraint set without coercion
 * (assignments.service.ts precedent): defense in depth for non-HTTP
 * callers — the global `FieldValidationPipe` still owns the HTTP path.
 * Returns the field-level `errors` map, or `null` when valid.
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

/**
 * The slot time rules (shared API contract, backend authoritative):
 * `dayOfWeek` integer 0–6 (Sunday=0 … Saturday=6); both times `HH:mm` with
 * hour 00–23 / minute 00–59; `endTime` **strictly after** `startTime` on
 * the same day — a midnight wrap (e.g. 23:00 → 01:00) is 400, never stored
 * (the model is a same-day window, AC-E04-04/05).  Zero-padded `HH:mm`
 * compares chronologically under plain string comparison, so `end > start`
 * is safe.  Returns the field-level `errors` map, or `null` when valid.
 */
function validateSlotTimes(
  dayOfWeek: unknown,
  startTime: unknown,
  endTime: unknown
): Record<string, string[]> | null {
  const errors: Record<string, string[]> = {};
  if (
    typeof dayOfWeek !== 'number' ||
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 0 ||
    dayOfWeek > 6
  ) {
    errors.dayOfWeek = ['dayOfWeek must be an integer between 0 (Sunday) and 6 (Saturday)'];
  }
  for (const field of ['startTime', 'endTime'] as const) {
    const value = field === 'startTime' ? startTime : endTime;
    if (typeof value !== 'string' || !HH_MM.test(value)) {
      errors[field] = [`${field} must be a 24-hour HH:mm time (e.g. 09:00)`];
    } else if (Number(value.slice(0, 2)) > 23 || Number(value.slice(3, 5)) > 59) {
      errors[field] = [`${field} must be a valid 24-hour time (hour 00-23, minute 00-59)`];
    }
  }
  if (!errors.startTime && !errors.endTime && !((endTime as string) > (startTime as string))) {
    errors.endTime = ['endTime must be strictly after startTime (same day)'];
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Availability slots service (SP-128A) — the top-level recurring
 * availability surface (D404-11): `GET/POST /availability-slots`,
 * `PATCH/DELETE /availability-slots/:id`, over the existing `AvailabilitySlot`
 * model (D404-5 — no migration).  `isAvailable: true` rows are the student's
 * free study windows; `isAvailable: false` rows are recurring blocked times;
 * they share one resource and differ by that flag only.
 *
 * Ownership (repo convention, `common/ownership/ownership.ts`): every read
 * and write carries the principal's `userId` in the `where` clause;
 * a missing record, another student's record, or a malformed id all produce
 * the same uniform 404 `Resource not found` — no existence oracle, no
 * answer written with 403.  `userId` comes from the JWT principal only
 * (the global pipe forbids a `userId` body field).
 *
 * Validation: the DTOs declare the per-field rules for the global
 * `FieldValidationPipe`; the service re-checks them via `validateSync`
 * (defense in depth for non-HTTP callers, assignments precedent) and owns
 * the cross-field `endTime > startTime` rule a single-field decorator
 * cannot express.  The uniqueness constraint
 * (`@@unique([userId, dayOfWeek, startTime])`) maps P2002 to the
 * resource-specific 409.
 */
@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /availability-slots — the student's slots, ordered `dayOfWeek` asc
   * then `startTime` asc (contract).
   *
   * 200 → `[ AvailabilitySlot ]`; 401 → unauthenticated (global guard).
   */
  async list(userId: string) {
    const rows = await this.prisma.availabilitySlot.findMany({
      where: { userId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return rows.map((row) => toSlotResponse(row));
  }

  /**
   * POST /availability-slots — create a slot for the requesting student.
   *
   * `isAvailable` omitted → `true` (the schema default); an explicit
   * `false` records a recurring blocked time.
   *
   * 201 → the created `AvailabilitySlot`; 400 → field-level errors
   * (dayOfWeek 0–6, `HH:mm` format + hour/minute bounds, `end > start`
   * same day); 409 → the same `dayOfWeek` + `startTime` slot already exists
   * for this student (P2002, `@@unique([userId, dayOfWeek, startTime])`);
   * 401 → unauthenticated (global guard).
   */
  async create(userId: string, dto: CreateAvailabilitySlotDto) {
    const fieldErrors = dtoErrors(dto, new CreateAvailabilitySlotDto());
    if (fieldErrors) {
      throwFieldErrors(fieldErrors);
    }

    const errors = validateSlotTimes(dto.dayOfWeek, dto.startTime, dto.endTime);
    if (errors) {
      throwFieldErrors(errors);
    }

    try {
      const row = await this.prisma.availabilitySlot.create({
        data: {
          userId,
          dayOfWeek: dto.dayOfWeek,
          startTime: dto.startTime,
          endTime: dto.endTime,
          // Omitted or explicit null → the schema default (true).
          ...(dto.isAvailable != null ? { isAvailable: dto.isAvailable } : {}),
        },
      });
      return toSlotResponse(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An availability slot already exists at this time.');
      }
      throw error;
    }
  }

  /**
   * PATCH /availability-slots/:id — partial merge of
   * `{ dayOfWeek?, startTime?, endTime?, isAvailable? }` (at least one
   * field; unknown fields → 400 via the global pipe).
   *
   * The scoped `findFirst({ id, userId })` makes every miss shape (missing,
   * another student's, malformed id) the same uniform 404 with no write.
   * Validation runs on the **merged** values (a patch of one field is only
   * legal against the stored row — e.g. an `endTime` patched to equal the
   * stored `startTime` must 400); only the provided fields are written
   * (partial merge).  404 → uniform; 400 → field-level errors or empty
   * body; 409 → a duplicate `(userId, dayOfWeek, startTime)` **after** the
   * merge; 200 → the updated `AvailabilitySlot`; 401 → unauthenticated
   * (global guard).
   */
  async update(userId: string, slotId: string, dto: UpdateAvailabilitySlotDto) {
    const fieldErrors = dtoErrors(dto, new UpdateAvailabilitySlotDto());
    if (fieldErrors) {
      throwFieldErrors(fieldErrors);
    }

    const existing = await this.prisma.availabilitySlot.findFirst({
      where: { id: slotId, userId },
    });
    if (!existing) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }

    // An explicit null is treated as omitted (the DTO's `@IsOptional()`
    // skips nulls) — normalize before merging.  `false` is a real value.
    const has = (value: unknown): boolean => value !== undefined && value !== null;

    // At least one field (contract: "any subset … an empty body is a 400").
    if (!has(dto.dayOfWeek) && !has(dto.startTime) && !has(dto.endTime) && !has(dto.isAvailable)) {
      throw new BadRequestException('At least one field must be provided');
    }

    // Merge the patch over the stored values, then validate the merged
    // values (backend authoritative).
    const mergedDayOfWeek = has(dto.dayOfWeek) ? dto.dayOfWeek! : existing.dayOfWeek;
    const mergedStartTime = has(dto.startTime) ? dto.startTime! : existing.startTime;
    const mergedEndTime = has(dto.endTime) ? dto.endTime! : existing.endTime;

    const errors = validateSlotTimes(mergedDayOfWeek, mergedStartTime, mergedEndTime);
    if (errors) {
      throwFieldErrors(errors);
    }

    // Only the provided fields are written (partial merge).
    const data: {
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
      isAvailable?: boolean;
    } = {};
    if (has(dto.dayOfWeek)) {
      data.dayOfWeek = mergedDayOfWeek;
    }
    if (has(dto.startTime)) {
      data.startTime = mergedStartTime;
    }
    if (has(dto.endTime)) {
      data.endTime = mergedEndTime;
    }
    if (has(dto.isAvailable)) {
      data.isAvailable = dto.isAvailable!;
    }

    try {
      const updated = await this.prisma.availabilitySlot.update({
        where: { id: slotId, userId },
        data,
      });
      return toSlotResponse(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('An availability slot already exists at this time.');
        }
        if (error.code === 'P2025') {
          // The target vanished (or was never this student's) between the
          // read and the write — the same uniform 404 as the read miss.
          throw new NotFoundException(RESOURCE_NOT_FOUND);
        }
      }
      throw error;
    }
  }

  /**
   * DELETE /availability-slots/:id — remove the slot.
   *
   * The scoped `deleteMany` carries the principal's `userId` in the where;
   * 0 affected rows (missing / another student's / malformed id) → uniform
   * 404 via `assertAffected`.  204 → deleted; 401 → unauthenticated
   * (global guard).
   */
  async delete(userId: string, slotId: string): Promise<void> {
    const result = await this.prisma.availabilitySlot.deleteMany({
      where: { id: slotId, userId },
    });
    assertAffected(userId, result.count);
  }
}
