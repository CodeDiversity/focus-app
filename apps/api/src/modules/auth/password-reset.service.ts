import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_PROVIDER, EmailProvider } from '../email/email-provider';
import { ARGON2_OPTIONS } from './auth.service';
import { databaseNow, lockOwner } from './owner-lock';
// Type-only on purpose: the DTO imports the message constants from this
// module at runtime, so a runtime import here would form a cycle.
import type { ResetPasswordDto } from './dto/reset-password.dto';

export const RESET_TOKEN_TTL_MS = 3_600_000; // 1 hour
export const COOLDOWN_MS = 60 * 1000; // 60 seconds

export const RESET_SUCCESS_MESSAGE = 'Password updated. Please sign in.';
export const INVALID_RESET_MESSAGE =
  'This reset link is invalid or has expired. Please request a new one.';

export interface PreparedResetToken {
  rawToken: string;
  tokenHash: string;
}

const GENERIC_SUCCESS_MESSAGE =
  'If an account exists for that email address, a password reset link has been sent. Check your inbox and wait a minute before requesting another.';

/**
 * Operator-safe identifier for a failure: the error *name* only (e.g.
 * `Error`, `PrismaClientInitializationException`) — never the message,
 * which may contain the requester's email or connection details.
 */
function failureName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
    private readonly config: ConfigService
  ) {}

  prepareToken(): PreparedResetToken {
    // PR-107: deliberately clock-free. Every issued timestamp — the cooldown
    // claim marker, the cooldown boundary, the retirement stamp, and the
    // token expiry — is derived from the database clock inside the
    // transaction, after the owner-lock wait. Stamping from the application
    // clock (the pre-fix behavior) let app/DB clock skew shift the effective
    // 60 s cooldown and 1 h TTL, and could diverge across replicas.
    const rawToken = randomBytes(32).toString('base64url');
    return {
      rawToken,
      tokenHash: createHash('sha256').update(rawToken).digest('hex'),
    };
  }

  /**
   * SMTP starts after commit and never participates in public response latency.
   */
  private sendReset(to: string, rawToken: string): void {
    setImmediate(() => {
      void this.deliverReset(to, rawToken).catch((error) => {
        this.logger.warn(
          `event=reset_email_delivery_failed correlation=${randomUUID()} error=${failureName(error)}`,
        );
      });
    });
  }

  private async deliverReset(to: string, rawToken: string): Promise<void> {
    const configuredUrl = this.config.get<string>('FRONTEND_URL');
    const base =
      configuredUrl ??
      (this.config.get('NODE_ENV') === 'production' ? undefined : 'http://localhost:3000');
    if (!base) throw new Error('FRONTEND_URL is not configured');
    const link = new URL('/reset-password', base);
    if (
      !['http:', 'https:'].includes(link.protocol) ||
      (this.config.get('NODE_ENV') === 'production' && link.protocol !== 'https:')
    ) {
      throw new Error('FRONTEND_URL is not configured securely');
    }
    link.hash = `token=${rawToken}`;
    await this.email.send({
      to,
      subject: 'Reset your StudyPilot password',
      text: `Reset your password by opening this link:\n\n${link.toString()}\n\nThis link expires in 1 hour. If you did not request a password reset, you can ignore this email.`,
    });
  }

  /**
   * Issue a single-use, 1-hour reset token for the given email.
   *
   * Enforces a 60-second per-account cooldown via a persisted conditional
   * update on `User.passwordResetRequestedAt`.  Returns the same generic
   * `200` for eligible accounts, cooled-down accounts, unregistered emails,
   * and SMTP failures.  The raw token is never persisted, logged, or
   * returned in a response.
   */
  async forgotPassword(address: string): Promise<{ message: string }> {
    const email = address.trim().toLowerCase();
    const prepared = this.prepareToken();

    try {
      const issued = await this.prisma.$transaction(async (tx) => {
        // 1. Discover the owner without writing or locking (owner-first,
        //    the shared SP-105 protocol). Unknown email — generic success,
        //    no email, no token.
        const user = await tx.user.findUnique({
          where: { email },
          select: { id: true, email: true },
        });
        if (!user) return false;

        // 2. Lock the owner's row before any credential write. Concurrent
        //    issuances, redemptions (SP-105B) and session mutations
        //    (SP-105E) now all serialize on this same row.
        if (!(await lockOwner(tx, user.id))) return false;

        // 3. Fresh post-lock wall clock. The cooldown boundary, the claim
        //    marker, the retirement stamp, and the token expiry all derive
        //    from this database time (PR-107) — never the application clock.
        const checkedAt = await databaseNow(tx);

        // 4. Claim the account's cooldown atomically. Zero rows means the
        //    account is still cooling down — no email, no token.
        const claim = await tx.user.updateMany({
          where: {
            id: user.id,
            OR: [
              { passwordResetRequestedAt: null },
              {
                passwordResetRequestedAt: {
                  lte: new Date(checkedAt.getTime() - COOLDOWN_MS),
                },
              },
            ],
          },
          data: { passwordResetRequestedAt: checkedAt },
        });
        if (claim.count === 0) return false;

        // 5. Retire all outstanding tokens for this account.
        await tx.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: checkedAt },
        });

        // 6. Create the new token row.
        await tx.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: prepared.tokenHash,
            expiresAt: new Date(checkedAt.getTime() + RESET_TOKEN_TTL_MS),
          },
        });

        return true;
      });

      // 5. After commit, fire-and-forget the email.
      if (issued) {
        this.sendReset(email, prepared.rawToken);
      }
    } catch (error) {
      // Deliberate security trade-off: every transaction failure — cooldown
      // claim, user lookup, token retirement, token insert, or a database
      // outage — is absorbed so the API response stays identical for
      // eligible, cooling-down, unregistered, and broken outcomes (no
      // enumeration or existence oracle).  Operators instead monitor the
      // structured `event=reset_issuance_failed` log line: its absence means
      // normal flow, and `error=` names the failure class (e.g.
      // PrismaClientInitializationException = database down).  Only the error
      // name is logged — never the message, which may contain the email.
      this.logger.warn(
        `event=reset_issuance_failed correlation=${randomUUID()} error=${failureName(error)}`,
      );
    }

    return { message: GENERIC_SUCCESS_MESSAGE };
  }

  /**
   * Redeem a reset token (SP-105B): update the owner's password, retire
   * every other outstanding reset token, and revoke every refresh family
   * in one transaction, so the account must sign in again.
   *
   * Token/password/confirmation are validated by the global pipe
   * (`ResetPasswordDto`) before this runs: a short or mismatched
   * password is a *field* error that never reaches here, and a token that
   * is not a 43-character base64url value is treated as a *token* failure
   * — the uniform 400 below, never a field error.
   *
   * Concurrency — the owner-first protocol shared with SP-105A issuance
   * (SP-105E applies the same order to login/refresh/logout):
   *   1. discover the token's owner without locking or writing the token;
   *   2. lock the owner's `users` row before any token write;
   *   3. take a fresh database wall-clock after the lock wait;
   *   4. conditionally claim the presented token; zero rows rolls back;
   *   5. retire the remaining unused tokens, revoke all unrevoked refresh
   *      rows for the owner;
   *   6. update the locked owner's password hash.
   *
   * Two concurrent redemptions for one owner — same or distinct tokens —
   * serialize on the owner lock: the loser's conditional claim fails and
   * every dependent write rolls back, so exactly one succeeds. The
   * issuance cooldown marker is preserved — a reset never grants an extra
   * email attempt. The raw token and the proposed password are never
   * persisted, returned, or logged: on failure the error is thrown for
   * the global filter, and the only values stored are digests.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(dto.token)) {
      throw new BadRequestException(INVALID_RESET_MESSAGE);
    }
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');

    // Hash before opening the transaction so the expensive argon2 work
    // never runs while holding the owner lock.
    const passwordHash = await argon2.hash(dto.password, ARGON2_OPTIONS);

    await this.prisma.$transaction(async (tx) => {
      // 1. Advisory discovery — no lock, no write.
      const token = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true },
      });
      if (!token) throw new BadRequestException(INVALID_RESET_MESSAGE);

      // 2. Owner-first lock. A missing owner row is the same uniform 400
      //    as an unknown token — never a distinct message.
      if (!(await lockOwner(tx, token.userId))) {
        throw new BadRequestException(INVALID_RESET_MESSAGE);
      }

      // 3. Fresh post-lock wall clock, so a token that expires while this
      //    transaction waited for the lock cannot be claimed.
      const checkedAt = await databaseNow(tx);

      // 4. Conditional claim: only one redemption can flip this row.
      const claim = await tx.passwordResetToken.updateMany({
        where: {
          id: token.id,
          userId: token.userId,
          usedAt: null,
          expiresAt: { gt: checkedAt },
        },
        data: { usedAt: checkedAt },
      });
      if (claim.count !== 1) throw new BadRequestException(INVALID_RESET_MESSAGE);

      // 5. Retire the remaining unused tokens for the owner, then revoke
      //    every unrevoked refresh row across all families.
      await tx.passwordResetToken.updateMany({
        where: { userId: token.userId, usedAt: null },
        data: { usedAt: checkedAt },
      });
      await tx.refreshToken.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: checkedAt },
      });

      // 6. Update only the locked owner's password hash (the same argon2id
      //    options as registration). The cooldown marker is untouched.
      await tx.user.update({ where: { id: token.userId }, data: { passwordHash } });
    });

    return { message: RESET_SUCCESS_MESSAGE };
  }
}
