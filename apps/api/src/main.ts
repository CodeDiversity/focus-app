import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { appCorsOptions } from './common/cors';
import cookieParser = require('cookie-parser');
import { FieldValidationPipe } from './common/pipes/validation.pipe';
import { FIELD_VALIDATION_PIPE_OPTIONS } from './common/pipes/validation-pipe-options';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // Global validation pipe (D106-6: field-level errors).
  // Options are the shared constant (R-EP14-06): the test harness builds its
  // pipe from the same object, so the gated strictness specs prove what
  // production enforces.
  app.useGlobalPipes(new FieldValidationPipe(FIELD_VALIDATION_PIPE_OPTIONS));

  // Uniform error-response shape for every failure
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable CORS (SP-105F: exposes the limiter's Retry-After header to the SPA)
  app.enableCors(appCorsOptions());

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
