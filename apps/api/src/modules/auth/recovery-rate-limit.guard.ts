import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { isIP } from 'node:net';
import type { Request, Response } from 'express';
import {
  RECOVERY_UNAVAILABLE_MESSAGE,
  RecoveryEndpoint,
  RecoveryRateLimitStore,
} from './recovery-rate-limit.store';

/**
 * Route-level guard enforcing SP-105's shared per-IP recovery limits (SD8)
 * on `POST /auth/forgot-password` (10/60s) and `POST /auth/reset-password`
 * (30/60s). It runs in the guard stage — **before** the global
 * `ValidationPipe` and before the A/B services — so a denied attempt executes
 * no DTO transformation, no account lookup, and no credential mutation.
 *
 * Source-address policy (AC4): the actual socket peer from Express `req.ip`
 * (direct address; `trust proxy` is not enabled). Client-supplied
 * `X-Forwarded-For` is never read and cannot steer the bucket. Deployments
 * behind a trusted proxy must configure `trust proxy` explicitly (see the
 * implementation artifact); the default is the direct peer.
 *
 * Fail-closed (AC5): an unresolvable or malformed source address, a route
 * this guard does not own, or a storage failure in the store all yield a
 * sanitized, account-independent 503 — never a pass-through that would
 * silently disable the limits.
 */

export const RATE_LIMITED_MESSAGE = 'Too many recovery requests. Wait and try again.';

/**
 * Bucket key per exact route (method + path, the `public-routes.ts`
 * convention). The guard is registered only on these two routes; any other
 * route fails closed rather than defaulting to unlimited.
 */
const ENDPOINT_BY_ROUTE: ReadonlyMap<string, RecoveryEndpoint> = new Map([
  ['POST /auth/forgot-password', 'forgot-password'],
  ['POST /auth/reset-password', 'reset-password'],
]);

/**
 * Normalize a raw source address into the bucket key: lowercase, and map
 * IPv4-mapped IPv6 (`::ffff:a.b.c.d`) to dotted-quad so an IPv4 client gets
 * one bucket regardless of the socket family the kernel chose. IPv6 zone
 * ids (link-local `%zone`) are preserved so distinct interfaces stay
 * distinct buckets. Returns `null` for anything that is not a valid IP —
 * callers fail closed.
 */
export function normalizeSourceIp(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const value = raw.trim().toLowerCase();
  if (!value) {
    return null;
  }
  const mapped = value.match(/^::ffff:(.+)$/);
  const address = mapped ? mapped[1] : value;
  if (!isIP(address)) {
    return null;
  }
  return address;
}

@Injectable()
export class RecoveryRateLimitGuard implements CanActivate {
  constructor(private readonly store: RecoveryRateLimitStore) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const endpoint = ENDPOINT_BY_ROUTE.get(`${request.method} ${request.path}`);
    if (!endpoint) {
      // A route this guard does not own is a wiring bug — refuse rather
      // than silently leaving it unlimited.
      throw new ServiceUnavailableException(RECOVERY_UNAVAILABLE_MESSAGE);
    }

    const sourceIp = normalizeSourceIp(request.ip);
    if (!sourceIp) {
      // No trustworthy client address — refuse. Pooling unidentifiable
      // traffic into a shared bucket would 429 legitimate users (AC4/AC5).
      throw new ServiceUnavailableException(RECOVERY_UNAVAILABLE_MESSAGE);
    }

    const admission = await this.store.admit(endpoint, sourceIp);
    if (!admission.allowed) {
      // Set before throwing: the global exception filter writes the standard
      // envelope and never clears headers, so `Retry-After` survives into
      // the filtered 429 response (PR-001). CORS exposure lives in
      // `src/common/cors.ts` (main.ts parity).
      // Nest 10 has no TooManyRequestsException, so the 429 body is built
      // explicitly to keep the standard { statusCode, message, error } shape.
      response.setHeader('Retry-After', String(admission.retryAfterSeconds));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: RATE_LIMITED_MESSAGE,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
