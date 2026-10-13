import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  const makeRes = () => ({ cookie: jest.fn() });
  const makeReq = (token?: string) => ({
    cookies: token ? { refresh_token: token } : {},
  });

  it('login sets an httpOnly refresh_token cookie with Path=/auth and hides the raw token', async () => {
    const authService = {
      login: jest.fn().mockResolvedValue({
        accessToken: 'access-1',
        user: { id: 'user-1', name: 'Ada Lovelace', email: 'student@example.com' },
        refreshToken: 'raw-refresh',
      }),
    } as unknown as AuthService;
    const controller = new AuthController(authService);
    const res = makeRes();

    const result = await controller.login(
      { email: 'student@example.com', password: 'Password123' },
      res as never,
    );

    expect(result).toEqual({
      accessToken: 'access-1',
      user: { id: 'user-1', name: 'Ada Lovelace', email: 'student@example.com' },
    });
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'raw-refresh',
      expect.objectContaining({ httpOnly: true, path: '/auth', sameSite: 'lax' }),
    );
    const options = res.cookie.mock.calls[0][2];
    expect(options.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('refresh sets the rotated cookie and returns the login shape', async () => {
    const authService = {
      refresh: jest.fn().mockResolvedValue({
        accessToken: 'access-2',
        user: { id: 'user-1', name: 'Ada Lovelace', email: 'student@example.com' },
        refreshToken: 'raw-new',
      }),
    } as unknown as AuthService;
    const controller = new AuthController(authService);
    const res = makeRes();

    const result = await controller.refresh(makeReq('raw-old') as never, res as never);

    expect(authService.refresh).toHaveBeenCalledWith('raw-old');
    expect(result).toEqual({
      accessToken: 'access-2',
      user: { id: 'user-1', name: 'Ada Lovelace', email: 'student@example.com' },
    });
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'raw-new',
      expect.objectContaining({ httpOnly: true, path: '/auth' }),
    );
  });

  it('logout clears the cookie with Max-Age=0 and returns 200 shape', async () => {
    const authService = {
      logout: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuthService;
    const controller = new AuthController(authService);
    const res = makeRes();

    const result = await controller.logout(makeReq('raw-old') as never, res as never);

    expect(authService.logout).toHaveBeenCalledWith('raw-old');
    expect(result).toEqual({ message: 'Logged out successfully' });
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      '',
      expect.objectContaining({ httpOnly: true, path: '/auth', maxAge: 0 }),
    );
  });
});
