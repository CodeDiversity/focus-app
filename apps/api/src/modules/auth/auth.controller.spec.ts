import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';

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
    const controller = new AuthController(
      authService,
      {} as EmailVerificationService,
      {} as PasswordResetService
    );
    const res = makeRes();

    const result = await controller.login(
      { email: 'student@example.com', password: 'Password123' },
      res as never
    );

    expect(result).toEqual({
      accessToken: 'access-1',
      user: { id: 'user-1', name: 'Ada Lovelace', email: 'student@example.com' },
    });
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'raw-refresh',
      expect.objectContaining({ httpOnly: true, path: '/auth', sameSite: 'lax' })
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
    const controller = new AuthController(
      authService,
      {} as EmailVerificationService,
      {} as PasswordResetService
    );
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
      expect.objectContaining({ httpOnly: true, path: '/auth' })
    );
  });

  it('logout clears the cookie with Max-Age=0 and returns 200 shape', async () => {
    const authService = {
      logout: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuthService;
    const controller = new AuthController(
      authService,
      {} as EmailVerificationService,
      {} as PasswordResetService
    );
    const res = makeRes();

    const result = await controller.logout(makeReq('raw-old') as never, res as never);

    expect(authService.logout).toHaveBeenCalledWith('raw-old');
    expect(result).toEqual({ message: 'Logged out successfully' });
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      '',
      expect.objectContaining({ httpOnly: true, path: '/auth', maxAge: 0 })
    );
  });

  it('exposes forgot-password and returns 200 with the generic message', async () => {
    const passwordResetService = {
      forgotPassword: jest.fn().mockResolvedValue({
        message:
          'If an account exists for that email address, a password reset link has been sent. Check your inbox and wait a minute before requesting another.',
      }),
    } as unknown as PasswordResetService;
    const controller = new AuthController(
      {} as AuthService,
      {} as EmailVerificationService,
      passwordResetService
    );

    const result = await controller.forgotPassword({ email: 'ada@example.com' });

    expect(passwordResetService.forgotPassword).toHaveBeenCalledWith('ada@example.com');
    expect(result).toEqual({
      message:
        'If an account exists for that email address, a password reset link has been sent. Check your inbox and wait a minute before requesting another.',
    });
  });
});

import { INestApplication, ValidationPipe, BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'net';
import { EmailVerificationService } from './email-verification.service';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';

describe('AuthController HTTP verification contracts', () => {
  let app: INestApplication;
  let base: string;
  const verification = {
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
  };
  const passwordReset = {
    forgotPassword: jest.fn().mockResolvedValue({
      message:
        'If an account exists for that email address, a password reset link has been sent. Check your inbox and wait a minute before requesting another.',
    }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: EmailVerificationService, useValue: verification },
        { provide: PasswordResetService, useValue: passwordReset },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      })
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.listen(0, '127.0.0.1');
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    verification.verifyEmail.mockResolvedValue({ message: 'Email verified successfully.' });
    verification.resendVerification.mockResolvedValue({
      message:
        'If this email needs verification, a link will be sent. Check your inbox and wait a minute before requesting another.',
    });
    passwordReset.forgotPassword.mockResolvedValue({
      message:
        'If an account exists for that email address, a password reset link has been sent. Check your inbox and wait a minute before requesting another.',
    });
  });
  afterAll(async () => {
    await app?.close();
  });
  const post = (path: string, payload: unknown) =>
    fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  it('exposes confirmation without a JWT guard and returns only a message without setting cookies', async () => {
    const response = await post('/auth/verify-email', { token: 'a'.repeat(43) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: 'Email verified successfully.' });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(verification.verifyEmail).toHaveBeenCalledWith('a'.repeat(43));
  });
  it('exposes normalized public resend with generic 200 and no cooldown headers or cookies', async () => {
    const response = await post('/auth/resend-verification', { email: ' Ada@Example.COM ' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      await verification.resendVerification.mock.results[0].value
    );
    expect(verification.resendVerification).toHaveBeenCalledWith('ada@example.com');
    expect(response.headers.get('retry-after')).toBeNull();
    expect(response.headers.get('set-cookie')).toBeNull();
  });
  it.each([
    ['/auth/verify-email', {}],
    ['/auth/verify-email', { token: 'bad' }],
    ['/auth/verify-email', { token: 'a'.repeat(43), userId: 'other' }],
    ['/auth/resend-verification', { email: '' }],
    ['/auth/resend-verification', { email: 'bad' }],
    ['/auth/resend-verification', { email: 'ada@example.com', emailVerifiedAt: 'now' }],
  ])(
    'rejects invalid DTO or extra fields through real global-pipe HTTP wiring %s %o',
    async (path, payload) => {
      const response = await post(path as string, payload);
      expect(response.status).toBe(400);
      const error = (await response.json()) as { message: unknown };
      expect(error).toMatchObject({
        statusCode: 400,
        path,
        error: 'Bad Request',
        timestamp: expect.any(String),
      });
      expect(Array.isArray(error.message)).toBe(true);
      expect(error.message).toEqual(expect.arrayContaining([expect.any(String)]));
      expect(verification.verifyEmail).not.toHaveBeenCalled();
      expect(verification.resendVerification).not.toHaveBeenCalled();
    }
  );
  it('returns the actionable invalid-token envelope without treating it as a session 401', async () => {
    verification.verifyEmail.mockRejectedValue(
      new BadRequestException(
        'This verification link is invalid or has expired. Request a new email.'
      )
    );
    const response = await post('/auth/verify-email', { token: 'a'.repeat(43) });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Request a new email'),
    });
  });
  it('exposes forgot-password without a JWT guard and returns 200 with the generic message', async () => {
    const response = await post('/auth/forgot-password', { email: 'Ada@Example.COM' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message:
        'If an account exists for that email address, a password reset link has been sent. Check your inbox and wait a minute before requesting another.',
    });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(passwordReset.forgotPassword).toHaveBeenCalledWith('ada@example.com');
  });
  it.each([
    ['/auth/forgot-password', { email: '' }],
    ['/auth/forgot-password', { email: 'bad' }],
    ['/auth/forgot-password', { email: 'ada@example.com', userId: 'other' }],
  ])(
    'rejects invalid DTO or extra fields through real global-pipe HTTP wiring %s %o',
    async (path, payload) => {
      const response = await post(path as string, payload);
      expect(response.status).toBe(400);
      const error = (await response.json()) as { message: unknown };
      expect(error).toMatchObject({
        statusCode: 400,
        path,
        error: 'Bad Request',
        timestamp: expect.any(String),
      });
      expect(Array.isArray(error.message)).toBe(true);
      expect(error.message).toEqual(expect.arrayContaining([expect.any(String)]));
      expect(passwordReset.forgotPassword).not.toHaveBeenCalled();
    }
  );
});
