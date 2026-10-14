import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_PROVIDER, EmailProvider } from '../email/email-provider';

export interface PreparedVerificationToken {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
  requestedAt: Date;
}

export const INVALID_VERIFICATION_MESSAGE =
  'This verification link is invalid or has expired. Request a new email.';
export const RESEND_VERIFICATION_MESSAGE =
  'If this email needs verification, a link will be sent. Check your inbox and wait a minute before requesting another.';
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
    private readonly config: ConfigService
  ) {}

  prepareToken(): PreparedVerificationToken {
    const rawToken = randomBytes(32).toString('base64url');
    const requestedAt = new Date();
    return {
      rawToken,
      tokenHash: createHash('sha256').update(rawToken).digest('hex'),
      requestedAt,
      expiresAt: new Date(requestedAt.getTime() + VERIFICATION_TTL_MS),
    };
  }

  // SMTP starts after commit and never participates in public response latency.
  sendVerification(to: string, rawToken: string): void {
    setImmediate(() => {
      void this.deliver(to, rawToken).catch(() => {
        this.logger.warn(`Email verification delivery failed; correlation=${randomUUID()}`);
      });
    });
  }

  private async deliver(to: string, rawToken: string): Promise<void> {
    const configuredUrl = this.config.get<string>('FRONTEND_URL');
    const base =
      configuredUrl ??
      (this.config.get('NODE_ENV') === 'production' ? undefined : 'http://localhost:3000');
    if (!base) throw new Error('Verification URL is not configured');
    const link = new URL('/verify-email', base);
    if (
      !['http:', 'https:'].includes(link.protocol) ||
      (this.config.get('NODE_ENV') === 'production' && link.protocol !== 'https:')
    ) {
      throw new Error('Verification URL is not configured securely');
    }
    link.hash = `token=${rawToken}`;
    await this.email.send({
      to,
      subject: 'Verify your StudyPilot email',
      text: `Verify your email by opening this link and choosing "Verify email":\n\n${link.toString()}\n\nThis link expires in 24 hours. You can continue using StudyPilot while unverified. If you did not create this account, you can ignore this email.`,
    });
  }

  async verifyEmail(rawToken: string): Promise<{ message: string }> {
    if (typeof rawToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(rawToken)) {
      throw new BadRequestException(INVALID_VERIFICATION_MESSAGE);
    }
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.$transaction(async (tx) => {
      const record = await tx.emailVerificationToken.findUnique({ where: { tokenHash } });
      const now = new Date();
      if (!record || record.usedAt || record.expiresAt <= now) {
        throw new BadRequestException(INVALID_VERIFICATION_MESSAGE);
      }
      // Consistent owner-before-token writes serialize issuance/confirmation.
      // PostgreSQL rechecks these predicates after waiting for a row lock.
      const owner = await tx.user.updateMany({
        where: { id: record.userId, emailVerifiedAt: null },
        data: { emailVerifiedAt: now },
      });
      if (owner.count !== 1) throw new BadRequestException(INVALID_VERIFICATION_MESSAGE);
      const token = await tx.emailVerificationToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: now },
      });
      if (token.count !== 1) throw new BadRequestException(INVALID_VERIFICATION_MESSAGE);
      await tx.emailVerificationToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: now },
      });
    });
    return { message: 'Email verified successfully.' };
  }

  async resendVerification(address: string): Promise<{ message: string }> {
    const email = address.trim().toLowerCase();
    const prepared = this.prepareToken();
    try {
      const issued = await this.prisma.$transaction(async (tx) => {
        const claim = await tx.user.updateMany({
          where: {
            email,
            emailVerifiedAt: null,
            OR: [
              { emailVerificationRequestedAt: null },
              {
                emailVerificationRequestedAt: {
                  lte: new Date(prepared.requestedAt.getTime() - COOLDOWN_MS),
                },
              },
            ],
          },
          data: { emailVerificationRequestedAt: prepared.requestedAt },
        });
        if (claim.count === 0) return false;
        const user = await tx.user.findUnique({ where: { email }, select: { id: true } });
        if (!user) throw new Error('Claimed verification owner is unavailable');
        await tx.emailVerificationToken.create({
          data: { userId: user.id, tokenHash: prepared.tokenHash, expiresAt: prepared.expiresAt },
        });
        return true;
      });
      if (issued) this.sendVerification(email, prepared.rawToken);
    } catch {
      this.logger.warn(`Email verification issuance failed; correlation=${randomUUID()}`);
    }
    return { message: RESEND_VERIFICATION_MESSAGE };
  }
}
