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
  // The last two entries are named by SP-105; they are inert until those
  // routes land and exist so SP-105 does not ship 401-on-public foot-guns.
  { method: 'POST', path: '/auth/forgot-password' },
  { method: 'POST', path: '/auth/reset-password' },
];

export function isPublicRoute(method: string, path: string): boolean {
  return PUBLIC_ROUTES.some((route) => route.method === method && route.path === path);
}
