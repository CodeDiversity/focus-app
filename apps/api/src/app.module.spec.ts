import { EmailVerificationService } from './modules/auth/email-verification.service';
import { EMAIL_PROVIDER } from './modules/email/email-provider';
import { ApplicationConfig } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { AppModule } from './app.module';
import { AuthService } from './modules/auth/auth.service';
import { UsersService } from './modules/users/users.service';

// Regression test for the boot failure where UsersModule did not export
// UsersService: compiling the real module graph resolves every dependency
// without a server or a database connection.
describe('AppModule wiring', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'wiring-test-secret';

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  it('resolves every provider in the dependency graph', async () => {
    expect(moduleRef.get(EmailVerificationService)).toBeDefined();
    expect(moduleRef.get(EMAIL_PROVIDER)).toBeDefined();
    expect(moduleRef.get(AuthService)).toBeDefined();
    expect(moduleRef.get(UsersService)).toBeDefined();
  });

  // Regression test for SP-104: default-deny authentication is the global
  // guard. The scanner rewrites the APP_GUARD provider token to an internal
  // one, so the wiring is asserted through the application config, which the
  // scanner populates from APP_GUARD providers.
  it('registers the global guard as JwtAuthGuard', () => {
    const applicationConfig = moduleRef.get(ApplicationConfig);
    const globalGuards = applicationConfig.getGlobalGuards();
    expect(globalGuards).toHaveLength(1);
    expect(globalGuards[0]).toBeInstanceOf(JwtAuthGuard);
  });

  // Regression test for the boot failure where class-transformer was not
  // installed: the global ValidationPipe only loads it at instantiation.
  it('can instantiate the global validation pipe', () => {
    expect(
      () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        })
    ).not.toThrow();
  });
});
