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

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
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

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        name: updateUserDto.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prisma.user.delete({ where: { id } });
  }
}
