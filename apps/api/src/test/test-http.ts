import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
// `import = require` (not `import ... from` or `import * as`): under this
// tsconfig (no esModuleInterop) a default import of this `export =` CJS
// module resolves to undefined at runtime, and a namespace import is not
// callable under esModuleInterop configurations — the same class of defect
// SP-102 caught in `main.ts`'s cookie-parser import. The require form is
// callable and typechecks under both settings.
import request = require('supertest');
import cookieParser = require('cookie-parser');

import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { OnboardingModule } from '../modules/onboarding/onboarding.module';
import { PrismaService } from '../modules/prisma/prisma.service';
import { EMAIL_PROVIDER } from '../modules/email/email-provider';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { appCorsOptions } from '../common/cors';
import { FieldValidationPipe } from '../common/pipes/validation.pipe';

/**
 * Test-only JWT secret. Integration specs sign/verify tokens with it; CI
 * sets JWT_SECRET explicitly and that value wins (never the placeholder).
 */
export const TEST_JWT_SECRET = 'integration-test-jwt-secret-not-a-real-secret';

export interface IntegrationApp {
  /** The initialized (not listening) Nest application. */
  app: INestApplication;
  /** supertest — call it with `app.getHttpAdapter().getInstance()`. */
  request: typeof request;
  /** The real Prisma client of the running module graph, for seeding and for asserting untouched rows. */
  prisma: PrismaService;
  /** The module's JWT service (same secret the strategy verifies with). */
  jwt: JwtService;
}

/**
 * Build the real HTTP application for integration specs (SP-104, decision
 * Q2): the real `PrismaService` against a real database, the real auth and
 * users modules, and `main.ts` parity (cookie-parser, global FieldValidationPipe,
 * AllExceptionsFilter) so what the tests exercise is what production
 * serves.
 *
 * The SMTP email provider is overridden with a no-op so seeded
 * registrations never touch a mail server.
 *
 * Fails fast with an actionable error when `DATABASE_URL` is unset —
 * integration specs self-skip in that case, but an unskipped spec must not
 * proceed against nothing.
 */
export async function createIntegrationApp(): Promise<IntegrationApp> {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Integration specs run against a real database: ' +
        'start it with `docker compose up db` and apply migrations with ' +
        '`pnpm --filter @studypilot/api exec prisma migrate deploy` (the app ' +
        'reads apps/api/.env.local), or run the suite in CI, which provides one.'
    );
  }

  process.env.JWT_SECRET = process.env.JWT_SECRET ?? TEST_JWT_SECRET;

  const moduleRef = await Test.createTestingModule({
    imports: [
      // Same config source as AppModule in tests: the process environment,
      // never .env files (ConfigModule ignores them when NODE_ENV=test).
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      AuthModule,
      UsersModule,
      PrismaModule,
      OnboardingModule,
    ],
  })
    .overrideProvider(EMAIL_PROVIDER)
    .useValue({ send: async () => undefined })
    .compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  // D106-6: field-validation pipe (parity with main.ts).
  app.useGlobalPipes(
    new FieldValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  // main.ts parity: CORS with the limiter's Retry-After exposed (SP-105F).
  app.enableCors(appCorsOptions());
  await app.init();

  return {
    app,
    request,
    prisma: moduleRef.get(PrismaService),
    jwt: moduleRef.get(JwtService),
  };
}
