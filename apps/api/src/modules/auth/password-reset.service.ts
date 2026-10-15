import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_PROVIDER, EmailProvider } from '../email/email-provider';

export const RESET_TOKEN_TTL_MS = 3_600_000; // 1 hour
export const COOLDOWN_MS = 60 * 1000; // 60 seconds

export const RESET_SUCCESS_MESSAGE = 'Password updated. Please sign in.';
export const INVALID_RESET_MESSAGE =
  'This reset link is invalid or has expired. Please request a new one.';

export interface PreparedResetToken {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
  requestedAt: Date;
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
    const rawToken = randomBytes(32).toString('base64url');
    const requestedAt = new Date();
    return {
      rawToken,
      tokenHash: createHash('sha256').update(rawToken).digest('hex'),
      requestedAt,
      expiresAt: new Date(requestedAt.getTime() + RESET_TOKEN_TTL_MS),
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
        // 1. Claim the account's cooldown atomically.
        //    Zero rows means the account is still cooling down — no email, no token.
        const claim = await tx.user.updateMany({
          where: {
            email,
            OR: [
              { passwordResetRequestedAt: null },
              {
                passwordResetRequestedAt: {
                  lte: new Date(prepared.requestedAt.getTime() - COOLDOWN_MS),
                },
              },
            ],
          },
          data: { passwordResetRequestedAt: prepared.requestedAt },
        });
        if (claim.count === 0) return false;

        // 2. Find the user (for email and relation write).
        const user = await tx.user.findUnique({
          where: { email },
          select: { id: true, email: true },
        });
        if (!user) throw new Error('Claimed reset owner is unavailable');

        // 3. Retire all outstanding tokens for this account.
        await tx.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() },
        });

        // 4. Create the new token row.
        await tx.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: prepared.tokenHash,
            expiresAt: prepared.expiresAt,
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
}
