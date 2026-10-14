import { Controller, Post, Body, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailVerificationService } from './email-verification.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

export const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function refreshCookieOptions() {
  return {
    httpOnly: true,
    path: '/auth',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

function setRefreshCookie(res: Response, rawToken: string) {
  res.cookie(REFRESH_COOKIE_NAME, rawToken, {
    ...refreshCookieOptions(),
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}

function clearRefreshCookie(res: Response) {
  res.cookie(REFRESH_COOKIE_NAME, '', {
    ...refreshCookieOptions(),
    maxAge: 0,
  });
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly verification: EmailVerificationService
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.verification.verifyEmail(dto.token);
  }

  @HttpCode(HttpStatus.OK)
  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.verification.resendVerification(dto.email);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...result } = await this.authService.login(loginDto);
    setRefreshCookie(res, refreshToken);
    return result;
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[
      REFRESH_COOKIE_NAME
    ];
    await this.authService.logout(rawToken);
    clearRefreshCookie(res);
    return { message: 'Logged out successfully' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[
      REFRESH_COOKIE_NAME
    ];
    try {
      const { refreshToken, ...result } = await this.authService.refresh(rawToken);
      setRefreshCookie(res, refreshToken);
      return result;
    } catch (error) {
      clearRefreshCookie(res);
      throw error;
    }
  }
}
