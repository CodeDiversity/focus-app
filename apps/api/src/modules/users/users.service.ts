import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PreparedVerificationToken } from '../auth/email-verification.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createUserDto: CreateUserDto,
    verification?: Omit<PreparedVerificationToken, 'rawToken'>
  ) {
    return this.prisma.user.create({
      data: {
        email: createUserDto.email,
        passwordHash: createUserDto.passwordHash,
        name: createUserDto.name,
        ...(verification
          ? {
              emailVerificationRequestedAt: verification.requestedAt,
              emailVerificationTokens: {
                create: { tokenHash: verification.tokenHash, expiresAt: verification.expiresAt },
              },
            }
          : {}),
      },
      // SP-106A: timeZone + preferences are profile fields (D106-1);
      // registration leaves them unset in `data` so the schema defaults
      // ("UTC" / NULL) apply, and the select returns the defaulted row.
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        timeZone: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      // SP-106A: explicit select is the credential boundary for
      // GET /users/me — it returns the profile + preferences fields and
      // never passwordHash or the token relations.
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        timeZone: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Partially update the authenticated user's profile.
   *
   * Only provided fields are written to the database — omitted fields
   * are not included in the Prisma `data` object, so they remain
   * untouched.  The select returns the full safe profile shape
   * (timeZone + preferences, no credentials).
   *
   * (D106-7: `findAll` and `remove` are deleted — no route references
   *  them, and unscoped user lookups are a latent enumeration hazard.)
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    // Build the partial data object: only include fields that were
    // provided in the DTO (undefined fields are omitted).
    const data: Record<string, unknown> = {};
    if (updateUserDto.name !== undefined) {
      data.name = updateUserDto.name;
    }
    if (updateUserDto.timeZone !== undefined) {
      data.timeZone = updateUserDto.timeZone;
    }
    if (updateUserDto.preferences !== undefined) {
      data.preferences = updateUserDto.preferences;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        timeZone: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
