/**
 * The one configuration location for public (unauthenticated) routes.
 *
 * The global `JwtAuthGuard` (registered via `APP_GUARD` in `AuthModule`)
 * is default-deny: every route requires a valid access token unless it
 * appears in this list. Any future public route needs an entry here —
 * that is the review point.
 *
 * Matching is exact method + path (`req.method` / `req.path`, no prefixes,
 * no wildcards, no query strings): `GET /auth/login` is NOT public even
 * though `POST /auth/login` is.
 */
export interface PublicRoute {
  readonly method: string;
  readonly path: string;
}

export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  { method: 'POST', path: '/auth/register' },
  { method: 'POST', path: '/auth/login' },
  { method: 'POST', path: '/auth/logout' },
  { method: 'POST', path: '/auth/refresh' },
  { method: 'POST', path: '/auth/verify-email' },
  { method: 'POST', path: '/auth/resend-verification' },
  // SP-105's recovery endpoints (SP-105A issuance, SP-105B redemption).
  { method: 'POST', path: '/auth/forgot-password' },
  { method: 'POST', path: '/auth/reset-password' },
];

export function isPublicRoute(method: string, path: string): boolean {
  return PUBLIC_ROUTES.some((route) => route.method === method && route.path === path);
}
