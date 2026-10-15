import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailVerificationService } from './email-verification.service';
import { AuthenticatedUser } from '../../common/types';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    emailVerifiedAt: Date | null;
  };
}

export interface AuthResult extends AuthResponse {
  refreshToken: string;
}

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const INVALID_SESSION_MESSAGE = 'Invalid or expired session';

function hashRefreshToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

let dummyHashPromise: Promise<string> | null = null;

function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = argon2.hash(randomBytes(32).toString('base64url'), ARGON2_OPTIONS);
  }
  return dummyHashPromise;
}

// OWASP-recommended argon2id parameters
// (https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
// Exported (SP-105B) so password reset reuses the exact same policy as
// registration — one source of truth for argon2id tuning in this module.
export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly verification: EmailVerificationService
  ) {}

  async validateUser(
    email: string,
    password: string
  ): Promise<(AuthenticatedUser & { emailVerifiedAt: Date | null }) | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Run a real verification against a dummy hash so unknown-email
      // logins cost the same as wrong-password logins (no timing oracle).
      try {
        await argon2.verify(await getDummyHash(), password);
      } catch {
        // Dummy verification outcome is irrelevant.
      }
      return null;
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      return null;
    }

    // Return user object without the password hash
    const { passwordHash: _passwordHash, ...result } = user;
    return result;
  }

  async register(registerDto: RegisterDto): Promise<RegisteredUser> {
    // Normalize so Ada@example.com and ada@example.com are the same account
    const email = registerDto.email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(
        'An account with this email already exists. Please sign in or register with a different email.'
      );
    }

    // Hash password
    const passwordHash = await argon2.hash(registerDto.password, ARGON2_OPTIONS);

    // Prisma nested creation commits the account, cooldown and hash together.
    const initialVerification = this.verification.prepareToken();
    const user = await this.usersService.create(
      {
        email,
        passwordHash,
        name: registerDto.name,
      },
      initialVerification
    );
    this.verification.sendVerification(user.email, initialVerification.rawToken);

    // Registration issues no token — the student signs in via SP-102's flow
    return { id: user.id, name: user.name, email: user.email };
  }

  async login(loginDto: LoginDto): Promise<AuthResult> {
    const email = loginDto.email.trim().toLowerCase();
    const user = await this.validateUser(email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const familyId = uuidv4();
    const rawRefreshToken = generateRefreshToken();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash: hashRefreshToken(rawRefreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt,
      },
      refreshToken: rawRefreshToken,
    };
  }

  async refresh(rawToken: string | undefined | null): Promise<AuthResult> {
    if (!rawToken) {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    const tokenHash = hashRefreshToken(rawToken);

    type RefreshOutcome =
      | { kind: 'invalid' }
      | {
          kind: 'ok';
          user: AuthResponse['user'];
          refreshToken: string;
        };

    const outcome: RefreshOutcome = await this.prisma.$transaction(
      async (tx): Promise<RefreshOutcome> => {
        const record = await tx.refreshToken.findUnique({
          where: { tokenHash },
          select: {
            id: true,
            userId: true,
            familyId: true,
            expiresAt: true,
            revokedAt: true,
            replacedByTokenId: true,
            user: { select: { id: true, name: true, email: true, emailVerifiedAt: true } },
          },
        });

        if (!record || record.expiresAt < new Date()) {
          return { kind: 'invalid' };
        }

        if (record.revokedAt || record.replacedByTokenId) {
          await tx.refreshToken.updateMany({
            where: { familyId: record.familyId },
            data: { revokedAt: new Date() },
          });
          return { kind: 'invalid' };
        }

        // Atomically claim the presented token: only one concurrent
        // caller can flip a still-active row, so a token cannot be
        // redeemed twice by racing requests.
        const successorId = uuidv4();
        const claim = await tx.refreshToken.updateMany({
          where: {
            id: record.id,
            revokedAt: null,
            replacedByTokenId: null,
          },
          data: {
            revokedAt: new Date(),
            replacedByTokenId: successorId,
          },
        });

        if (claim.count === 0) {
          await tx.refreshToken.updateMany({
            where: { familyId: record.familyId },
            data: { revokedAt: new Date() },
          });
          return { kind: 'invalid' };
        }

        const newRawToken = generateRefreshToken();
        await tx.refreshToken.create({
          data: {
            id: successorId,
            userId: record.userId,
            familyId: record.familyId,
            tokenHash: hashRefreshToken(newRawToken),
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
          },
        });

        const user = await this.resolveTokenUser(record, tx);
        return { kind: 'ok', user, refreshToken: newRawToken };
      }
    );

    if (outcome.kind === 'invalid') {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    const payload: JwtPayload = { sub: outcome.user.id, email: outcome.user.email };

    return {
      accessToken: this.jwtService.sign(payload),
      user: outcome.user,
      refreshToken: outcome.refreshToken,
    };
  }

  async logout(rawToken: string | undefined | null): Promise<void> {
    if (!rawToken) {
      return;
    }

    const tokenHash = hashRefreshToken(rawToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!record) {
      return;
    }

    await this.prisma.refreshToken.updateMany({
      where: { familyId: record.familyId },
      data: { revokedAt: new Date() },
    });
  }

  private async resolveTokenUser(
    record: {
      userId: string;
      user?: AuthResponse['user'] | null;
    },
    client: Pick<PrismaService, 'user'> = this.prisma
  ): Promise<AuthResponse['user']> {
    if (record.user) {
      return {
        id: record.user.id,
        name: record.user.name,
        email: record.user.email,
        emailVerifiedAt: record.user.emailVerifiedAt,
      };
    }

    const prismaUser = await client.user?.findUnique({
      where: { id: record.userId },
      select: { id: true, name: true, email: true, emailVerifiedAt: true },
    });
    if (prismaUser) {
      return prismaUser;
    }

    const fallback = await this.usersService.findById(record.userId);
    return {
      id: fallback.id,
      name: fallback.name,
      email: fallback.email,
      emailVerifiedAt: fallback.emailVerifiedAt,
    };
  }
}
