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
import { lockOwner, databaseNow } from './owner-lock';
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
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

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

  /**
   * Verify credentials against the stored argon2id hash *before* opening any
   * transaction (SP-105E), capturing the exact hash verified as an immutable
   * snapshot. Returns the account (plus the snapshot hash) on success, or
   * `null` for an unknown email or a wrong password.
   *
   * Unknown emails run a real verify against a dummy hash so they cost the
   * same as wrong-password attempts (no timing oracle). No client-supplied
   * owner identifier is ever trusted — the owner is discovered from the
   * account itself.
   */
  private async authenticate(
    email: string,
    password: string
  ): Promise<(AuthenticatedUser & { emailVerifiedAt: Date | null; passwordHash: string }) | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      try {
        await argon2.verify(await getDummyHash(), password);
      } catch {
        // Dummy verification outcome is irrelevant.
      }
      return null;
    }

    // Verify against the snapshot hash; login/refresh re-check it under the
    // owner lock to close the reset-then-session race.
    const snapshot = user.passwordHash;
    const isPasswordValid = await argon2.verify(snapshot, password);

    if (!isPasswordValid) {
      return null;
    }

    // Return the account together with the verified snapshot hash so the
    // caller can re-check it under the owner lock.
    const { passwordHash: _passwordHash, ...result } = user;
    return { ...result, passwordHash: snapshot };
  }

  async validateUser(
    email: string,
    password: string
  ): Promise<(AuthenticatedUser & { emailVerifiedAt: Date | null }) | null> {
    const verified = await this.authenticate(email, password);

    if (!verified) {
      return null;
    }

    // Return the user object without the password hash.
    const { passwordHash: _passwordHash, ...result } = verified;
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

    // 1. Advisory read + verify against an immutable password-hash snapshot
    //    *before* the transaction (SP-105E): the expensive argon2 work never
    //    runs while holding the owner lock. Unknown email / wrong password
    //    fail uniformly with the generic 401 and never open a transaction.
    const verified = await this.authenticate(email, loginDto.password);
    if (!verified) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const familyId = uuidv4();
    const rawRefreshToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    // 2. Owner-first: lock the account, re-read it under the lock, and require
    //    the stored hash to still equal the snapshot we verified. A password
    //    reset that committed while this login was in flight changes the hash,
    //    so the re-check fails and no session is persisted (uniform 401). The
    //    access JWT is signed while holding the lock and returned only after
    //    the refresh row commits.
    const accessToken = await this.prisma.$transaction(async (tx): Promise<string> => {
      if (!(await lockOwner(tx, verified.id))) {
        throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
      }

      const current = await tx.user.findUnique({
        where: { id: verified.id },
        select: { id: true, passwordHash: true },
      });
      if (!current || current.passwordHash !== verified.passwordHash) {
        throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
      }

      await tx.refreshToken.create({
        data: {
          userId: verified.id,
          familyId,
          tokenHash: newTokenHash,
          expiresAt,
        },
      });

      const payload: JwtPayload = { sub: verified.id, email: verified.email };
      return this.jwtService.sign(payload);
    });

    return {
      accessToken,
      user: {
        id: verified.id,
        name: verified.name,
        email: verified.email,
        emailVerifiedAt: verified.emailVerifiedAt,
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
          accessToken: string;
        };

    const outcome: RefreshOutcome = await this.prisma.$transaction(
      async (tx): Promise<RefreshOutcome> => {
        // 1. Advisory owner discovery — no lock, no write. A missing token
        //    fails the same as any other invalid session (no existence oracle).
        const probe = await tx.refreshToken.findUnique({
          where: { tokenHash },
          select: { id: true, userId: true },
        });
        if (!probe) {
          return { kind: 'invalid' };
        }

        // 2. Owner-first: lock the account **before any token write**
        //    (SP-105E). A missing owner row is the same invalid outcome.
        if (!(await lockOwner(tx, probe.userId))) {
          return { kind: 'invalid' };
        }

        // 3. Fresh post-lock wall clock, so a token that expired while this
        //    transaction waited for the lock cannot be rotated.
        const checkedAt = await databaseNow(tx);

        // 4. Re-read the token under the lock and validate fresh expiry.
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

        if (!record || record.expiresAt.getTime() <= checkedAt.getTime()) {
          return { kind: 'invalid' };
        }

        // Reuse / lost-claim: rotate or reuse was already detected. Revoke the
        // whole family and COMMIT (not a throw inside the tx) — the 401 is
        // raised after commit so the intended family revocation is durable.
        if (record.revokedAt || record.replacedByTokenId) {
          await tx.refreshToken.updateMany({
            where: { familyId: record.familyId },
            data: { revokedAt: checkedAt },
          });
          return { kind: 'invalid' };
        }

        // Atomically claim the presented token: only one concurrent caller
        // can flip a still-active row, so a token cannot be redeemed twice.
        const successorId = uuidv4();
        const claim = await tx.refreshToken.updateMany({
          where: {
            id: record.id,
            revokedAt: null,
            replacedByTokenId: null,
          },
          data: {
            revokedAt: checkedAt,
            replacedByTokenId: successorId,
          },
        });

        if (claim.count === 0) {
          await tx.refreshToken.updateMany({
            where: { familyId: record.familyId },
            data: { revokedAt: checkedAt },
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
            expiresAt: new Date(checkedAt.getTime() + REFRESH_TOKEN_TTL_MS),
          },
        });

        const user = await this.resolveTokenUser(record, tx);
        // Signed while holding the owner lock; returned only after commit.
        const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });
        return { kind: 'ok', user, refreshToken: newRawToken, accessToken };
      }
    );

    if (outcome.kind === 'invalid') {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    return {
      accessToken: outcome.accessToken,
      user: outcome.user,
      refreshToken: outcome.refreshToken,
    };
  }

  async logout(rawToken: string | undefined | null): Promise<void> {
    if (!rawToken) {
      return;
    }

    const tokenHash = hashRefreshToken(rawToken);

    // Owner-first (SP-105E): discover the owner without a write, lock the
    // account before the family revoke, then revoke that one family with a
    // fresh post-lock timestamp. Idempotent: an unknown token or a missing
    // owner row commits as a no-op and leaves every other family untouched.
    await this.prisma.$transaction(async (tx) => {
      const probe = await tx.refreshToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, familyId: true },
      });
      if (!probe) {
        return;
      }
      if (!(await lockOwner(tx, probe.userId))) {
        return;
      }
      const checkedAt = await databaseNow(tx);
      await tx.refreshToken.updateMany({
        where: { familyId: probe.familyId },
        data: { revokedAt: checkedAt },
      });
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
