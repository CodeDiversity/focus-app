import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { formatCalendarDate, parseCalendarDate } from '../../common/lib/calendar-date';
import { CreateSemesterDto } from './dto/create-semester.dto';

/**
 * Semester service (SP-107B, D107-5).
 *
 * This module is the **onboarding-minimal** create endpoint: `POST
 * /semesters` only.  **EP02 extends this module** with list/get/update/
 * delete, activation, and views — it must not create duplicate endpoints
 * (D107-9).
 *
 * Every operation is scoped to the requesting student via the JWT principal
 * (SP-104): `userId` comes from the authenticated user, never from the
 * request body (the global pipe forbids unknown fields).  The unique
 * constraint `@@unique([userId, name])` is per student, so the same name is
 * reusable across students but 409s within one.
 *
 * Dates (D107-7): the DTO takes strict `yyyy-MM-dd` strings; they are parsed
 * to UTC-midnight `Date`s for the `@db.Date` columns and serialized back as
 * `yyyy-MM-dd` in the response — calendar dates, never instants.
 */
@Injectable()
export class SemestersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a semester owned by the requesting student.
   *
   * - `name` is trimmed; non-empty and ≤ 100 chars (AC-107-06).
   * - `startDate`/`endDate` must be valid calendar dates and
   *   `endDate` must be strictly after `startDate` — violations → 400 with
   *   a field-level `errors` map (the service re-checks what the DTO
   *   declares: backend authoritative, ticket AC-2).
   * - Duplicate name for this student (Prisma P2002 on
   *   `@@unique([userId, name])`) → 409 with the resource-specific message;
   *   the global filter's generic P2002 message remains the fallback for any
   *   other unique path.
   * - `isActive` is deliberately omitted from `data`: the schema default
   *   `false` applies (EP02 owns activation, D107-5).
   */
  async create(userId: string, dto: CreateSemesterDto) {
    const name = dto.name.trim();
    const startDate = parseCalendarDate(dto.startDate);
    const endDate = parseCalendarDate(dto.endDate);

    const errors: Record<string, string[]> = {};
    if (name.length === 0 || name.length > 100) {
      errors.name = ['name must not be empty and must be 100 characters or fewer'];
    }
    if (!startDate) {
      errors.startDate = ['startDate must be a valid yyyy-MM-dd calendar date'];
    }
    if (!endDate) {
      errors.endDate = ['endDate must be a valid yyyy-MM-dd calendar date'];
    }
    // Both dates must be present to compare; UTC-midnight instants compare
    // as calendar dates (D107-7).
    if (startDate && endDate && endDate.getTime() <= startDate.getTime()) {
      errors.endDate = ['endDate must be after startDate'];
    }
    if (Object.keys(errors).length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: Object.values(errors).flat(),
        error: 'Bad Request',
        errors,
      });
    }

    try {
      const semester = await this.prisma.semester.create({
        data: {
          userId,
          name,
          startDate: startDate!,
          endDate: endDate!,
        },
      });
      return this.toResponse(semester);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A semester with this name already exists.');
      }
      throw error;
    }
  }

  /**
   * Project a semester row to the API shape: dates as `yyyy-MM-dd`
   * (date part only — never an instant, D107-7), timestamps as ISO strings.
   * Matches the frontend `Semester` type exactly.
   */
  private toResponse(semester: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: semester.id,
      name: semester.name,
      startDate: formatCalendarDate(semester.startDate),
      endDate: formatCalendarDate(semester.endDate),
      isActive: semester.isActive,
      createdAt: semester.createdAt.toISOString(),
      updatedAt: semester.updatedAt.toISOString(),
    };
  }
}
