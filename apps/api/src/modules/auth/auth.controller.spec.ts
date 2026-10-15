import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  PasswordResetService,
  RESET_SUCCESS_MESSAGE,
  INVALID_RESET_MESSAGE,
} from './password-reset.service';
import type { ResetPasswordDto } from './dto/reset-password.dto';

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

  // --- SP-105B: reset-password ---
  const resetDto: ResetPasswordDto = {
    token: 'a'.repeat(43),
    password: 'Password123',
    confirmPassword: 'Password123',
  };

  it('expires the HttpOnly refresh cookie only after a committed reset', async () => {
    const passwordResetService = {
      resetPassword: jest.fn().mockResolvedValue({ message: RESET_SUCCESS_MESSAGE }),
    } as unknown as PasswordResetService;
    const controller = new AuthController(
      {} as AuthService,
      {} as EmailVerificationService,
      passwordResetService
    );
    const res = makeRes();

    const result = await controller.resetPassword(resetDto, res as never);

    expect(passwordResetService.resetPassword).toHaveBeenCalledWith(resetDto);
    expect(result).toEqual({ message: RESET_SUCCESS_MESSAGE });
    // The existing helper attributes: HttpOnly, Path=/auth, SameSite=Lax,
    // expired (Max-Age=0) — the SPA cannot clear an HttpOnly cookie itself.
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      '',
      expect.objectContaining({
        httpOnly: true,
        path: '/auth',
        sameSite: 'lax',
        maxAge: 0,
      })
    );
  });

  it('emits no cookie cleanup when the redemption fails or rolls back', async () => {
    const passwordResetService = {
      resetPassword: jest.fn().mockRejectedValue(new BadRequestException(INVALID_RESET_MESSAGE)),
    } as unknown as PasswordResetService;
    const controller = new AuthController(
      {} as AuthService,
      {} as EmailVerificationService,
      passwordResetService
    );
    const res = makeRes();

    await expect(controller.resetPassword(resetDto, res as never)).rejects.toThrow(
      BadRequestException
    );
    expect(res.cookie).not.toHaveBeenCalled();
  });
});

import { INestApplication, ValidationPipe, BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'net';
import { EmailVerificationService } from './email-verification.service';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { RecoveryRateLimitStore } from './recovery-rate-limit.store';

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
    resetPassword: jest.fn().mockResolvedValue({ message: RESET_SUCCESS_MESSAGE }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: EmailVerificationService, useValue: verification },
        { provide: PasswordResetService, useValue: passwordReset },
        // SP-105F: the controller's recovery routes carry the rate-limit
        // guard, so this manual module must supply its store. Always
        // allow: these contracts test the services, and the limiter itself
        // is covered by its own specs.
        {
          provide: RecoveryRateLimitStore,
          useValue: { admit: jest.fn().mockResolvedValue({ allowed: true }) },
        },
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
    passwordReset.resetPassword.mockResolvedValue({ message: RESET_SUCCESS_MESSAGE });
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

  // --- SP-105B: reset-password over real global-pipe + filter wiring ---
  const validResetBody = {
    token: 'a'.repeat(43),
    password: 'Password123',
    confirmPassword: 'Password123',
  };

  it('exposes reset-password publicly, returns explicit 200, and emits the expiry cookie with the existing attributes', async () => {
    const response = await post('/auth/reset-password', validResetBody);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: RESET_SUCCESS_MESSAGE });
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toMatch(/^refresh_token=;/); // emptied
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/Path=\/auth/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    expect(setCookie).toMatch(/Max-Age=0/);
    expect(passwordReset.resetPassword).toHaveBeenCalledWith(validResetBody);
  });

  it('returns the uniform invalid-token 400 envelope and emits no cookie cleanup on token failure', async () => {
    passwordReset.resetPassword.mockRejectedValueOnce(new BadRequestException(INVALID_RESET_MESSAGE));
    const response = await post('/auth/reset-password', validResetBody);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      statusCode: 400,
      message: INVALID_RESET_MESSAGE,
      path: '/auth/reset-password',
    });
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it.each([
    // Token-shape failures must read like an invalid link (SP-105 AC5).
    ['/auth/reset-password', { password: 'Password123', confirmPassword: 'Password123' }],
    ['/auth/reset-password', { ...validResetBody, token: 'a'.repeat(42) }],
  ])('maps a token failure %s %o to the uniform invalid-link message', async (path, payload) => {
    const response = await post(path as string, payload);
    expect(response.status).toBe(400);
    const error = (await response.json()) as { message: unknown };
    expect(Array.isArray(error.message)).toBe(true);
    for (const message of error.message as string[]) {
      expect(message).toBe(INVALID_RESET_MESSAGE);
    }
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(passwordReset.resetPassword).not.toHaveBeenCalled();
  });

  it.each([
    // Field failures stay field errors — never proof about the token (SP-105B AC4).
    ['/auth/reset-password', { ...validResetBody, password: 'short', confirmPassword: 'short' }],
    ['/auth/reset-password', { ...validResetBody, password: 'Password123', confirmPassword: 'Different123' }],
    ['/auth/reset-password', { ...validResetBody, userId: 'other' }],
  ])('keeps password/confirmation/whitelist failures as field errors %s %o', async (path, payload) => {
    const response = await post(path as string, payload);
    expect(response.status).toBe(400);
    const error = (await response.json()) as { message: unknown };
    expect(error).toMatchObject({ statusCode: 400, path, error: 'Bad Request', timestamp: expect.any(String) });
    expect(Array.isArray(error.message)).toBe(true);
    expect(JSON.stringify(error.message)).not.toContain(INVALID_RESET_MESSAGE);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(passwordReset.resetPassword).not.toHaveBeenCalled();
  });
});
