import { ValidationPipeOptions } from '@nestjs/common';

/**
 * The one source of truth for the global validation policy (D106-6,
 * EP14B D-B1a / R-EP13-03, R-EP14-06).
 *
 * `main.ts` and the test harness (`test/test-http.ts`) both construct their
 * `FieldValidationPipe` from this object, so the gated strictness specs prove
 * exactly what production enforces. Spec-local pipes that claim production
 * parity import it too instead of re-typing the literal.
 *
 * - `whitelist` + `forbidNonWhitelisted`: unknown body fields → 400.
 * - `transform`: bodies arrive as DTO instances (nested `@Type` descent).
 * - `enableImplicitConversion: false`: no implicit coercion — a wrong-typed
 *   body field (`locked: "yes"`) must 400, never silently convert. Query
 *   params that need numbers carry explicit `@Transform(Number)`.
 *
 * Pinned by `validation-pipe-options.spec.ts`.
 */
export const FIELD_VALIDATION_PIPE_OPTIONS: Readonly<ValidationPipeOptions> = Object.freeze({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: Object.freeze({
    enableImplicitConversion: false,
  }),
});
