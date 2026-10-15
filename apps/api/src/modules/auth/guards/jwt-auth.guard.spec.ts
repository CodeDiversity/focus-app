import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { PUBLIC_ROUTES } from '../public-routes';
import type { PrismaService } from '../../prisma/prisma.service';

const SECRET = 'unit-test-jwt-secret';

// A hand-rolled HS256 signer: the unit spec only needs a token the real
// passport-jwt strategy will accept, without adding a jsonwebtoken
// dependency to the package.
function base64url(input: string | Buffer): string {
  return Buffer.isBuffer(input)
    ? input.toString('base64url')
    : Buffer.from(input, 'utf8').toString('base64url');
}

function signJwt(claims: Record<string, unknown>, secret: string, exp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...claims, iat: now, exp }));
  const signature = base64url(createHmac('sha256', secret).update(`${header}.${body}`).digest());
  return `${header}.${body}.${signature}`;
}

function makeContext(
  method: string,
  path: string,
  options: { authorization?: string; isRouteHandler?: boolean; ordinaryHandler?: boolean } = {}
) {
  const request: {
    method: string;
    path: string;
    headers: Record<string, string>;
    user?: { id: string; email: string; name: string };
  } = { method, path, headers: {} };
  if (options.authorization !== undefined) {
    request.headers.authorization = options.authorization;
  }
  const context = {
    getHandler: () =>
      options.ordinaryHandler
        ? function handler() {}
        : { isRouteHandler: () => options.isRouteHandler ?? true },
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  const student = { id: 'user-1', email: 'ada@example.com', name: 'Ada' };

  beforeAll(() => {
    // Registering the strategy is what makes passport's 'jwt' lookup resolve;
    // a real JwtStrategy is used so the delegate path exercises the real
    // passport pipeline (with a stubbed user lookup).
    const configService = {
      get: (key: string) => (key === 'JWT_SECRET' ? SECRET : undefined),
    } as unknown as ConfigService;
    const prisma = {
      user: { findUnique: async () => student },
    } as unknown as PrismaService;
    new JwtStrategy(configService, prisma);

    guard = new JwtAuthGuard();
  });

  it('knows exactly the eight allowlisted public routes', () => {
    expect(PUBLIC_ROUTES.map((route) => `${route.method} ${route.path}`).sort()).toEqual(
      [
        'POST /auth/forgot-password',
        'POST /auth/login',
        'POST /auth/logout',
        'POST /auth/refresh',
        'POST /auth/register',
        'POST /auth/resend-verification',
        'POST /auth/reset-password',
        'POST /auth/verify-email',
      ].sort()
    );
  });

  it('allows each of the eight allowlisted public routes without a token', async () => {
    for (const route of PUBLIC_ROUTES) {
      const { context } = makeContext(route.method, route.path);
      // Synchronous `true` on the allowlist path — no passport round-trip.
      expect(await guard.canActivate(context)).toBe(true);
    }
  });

  it('does not allow a non-allowlisted method on a public path (GET /auth/login)', async () => {
    const { context } = makeContext('GET', '/auth/login');
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('protects an unlisted route (GET /users/me without a token)', async () => {
    const { context } = makeContext('GET', '/users/me');
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('delegates protected routes to the JWT strategy: a valid token attaches req.user', async () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const { context, request } = makeContext('GET', '/users/me', {
      authorization: `Bearer ${signJwt({ sub: student.id, email: student.email }, SECRET, exp)}`,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(student);
  });

  it('rejects a malformed bearer token with 401', async () => {
    const { context } = makeContext('GET', '/users/me', { authorization: 'Bearer not-a-jwt' });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an expired token with 401', async () => {
    const exp = Math.floor(Date.now() / 1000) - 120;
    const { context } = makeContext('GET', '/users/me', {
      authorization: `Bearer ${signJwt({ sub: student.id, email: student.email }, SECRET, exp)}`,
    });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('protects ordinary Nest handlers without an isRouteHandler marker', async () => {
    const { context } = makeContext('GET', '/users/me', { ordinaryHandler: true });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('authenticates valid tokens on ordinary Nest handlers', async () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const { context, request } = makeContext('GET', '/users/me', {
      ordinaryHandler: true,
      authorization: `Bearer ${signJwt({ sub: student.id }, SECRET, exp)}`,
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(student);
  });

  it('skips non-route handlers', async () => {
    const { context } = makeContext('GET', '/anything', { isRouteHandler: false });
    expect(await guard.canActivate(context)).toBe(true);
  });
});
