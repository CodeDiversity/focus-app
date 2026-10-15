import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';
import { AuthenticatedRequest, AuthenticatedUser } from '../types';

interface RouteParamMetadata {
  index: number;
  data: unknown;
  factory: (data: unknown, context: ExecutionContext) => AuthenticatedUser;
  pipes: unknown[];
}

// `createParamDecorator` curries: calling the decorator stores the factory
// in route-args metadata; Nest invokes it per request with the real
// execution context. So the spec decorates a dummy handler and invokes the
// stored factory with a synthetic context.
describe('CurrentUser', () => {
  class DummyController {
    profile(@CurrentUser() user: AuthenticatedUser) {
      return user;
    }
  }

  it('returns req.user from a synthetic execution context', () => {
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, DummyController, 'profile');
    const entry = Object.values(metadata as Record<string, RouteParamMetadata>)[0];
    expect(entry).toBeDefined();

    const user: AuthenticatedUser = { id: 'user-1', email: 'ada@example.com', name: 'Ada' };
    const request: AuthenticatedRequest = { user } as AuthenticatedRequest;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    expect(entry.factory(undefined, context)).toBe(user);
  });
});
