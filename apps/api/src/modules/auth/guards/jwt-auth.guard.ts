import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isPublicRoute } from '../public-routes';

/**
 * Global, default-deny authentication guard (registered via `APP_GUARD` in
 * `AuthModule` — SP-104). Every route requires a valid access token unless
 * it is in the `PUBLIC_ROUTES` allowlist (`../public-routes`).
 *
 * Non-public routes delegate to the JWT strategy, which 401s on a missing,
 * malformed, or expired bearer token and on a token whose user no longer
 * exists, and attaches the authenticated student to `req.user`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  canActivate(context: ExecutionContext) {
    // Skip non-route contexts only when the handler positively identifies
    // itself as one (Nest ≥11 attaches `isRouteHandler()`; v10 attaches
    // nothing, so the check must fail closed — a context that does not
    // identify as a route is still authenticated).
    const handler = context.getHandler() as { isRouteHandler?: () => boolean };
    if (typeof handler.isRouteHandler === 'function' && !handler.isRouteHandler()) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    if (isPublicRoute(request.method, request.path)) {
      return true;
    }

    return super.canActivate(context);
  }
}
