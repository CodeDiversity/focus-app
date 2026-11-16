import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { appCorsOptions } from './common/cors';
import cookieParser = require('cookie-parser');
import { FieldValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // Global validation pipe (D106-6: field-level errors).
  app.useGlobalPipes(
    new FieldValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        // EP14B (D-B1a, R-EP13-03): no implicit coercion — a wrong-typed body
        // field (locked: "yes") must 400, never silently convert. Query
        // params that need numbers carry explicit @Transform(Number).
        enableImplicitConversion: false,
      },
    })
  );

  // Uniform error-response shape for every failure
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable CORS (SP-105F: exposes the limiter's Retry-After header to the SPA)
  app.enableCors(appCorsOptions());

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
