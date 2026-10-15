import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest, AuthenticatedUser } from '../types';

/**
 * Exposes the authenticated student to a controller handler:
 *
 *   getProfile(@CurrentUser() user: AuthenticatedUser) { ... }
 *
 * This is the only sanctioned way a controller reads the authenticated
 * principal (SP-104). Do not use `@Req()` / `@Request()` in controllers —
 * `req.user` is populated by the global `JwtAuthGuard` (which 401s when
 * absent), so a handler decorated with `@CurrentUser()` can rely on `user`
 * being defined. (`AuthController` keeps `@Req()` for its httpOnly refresh
 * cookie reads, which are not principal access.)
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
