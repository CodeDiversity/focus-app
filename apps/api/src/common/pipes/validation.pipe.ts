import { BadRequestException, ValidationPipe } from '@nestjs/common';

/**
 * Field-level validation pipe (D106-6).
 *
 * Extends Nest's stock `ValidationPipe` and overrides
 * `exceptionFactory` so that a 400 validation error includes both:
 *
 * - `message: string[]` — the stock array of constraint messages
 *   (preserved verbatim for backward compatibility).
 * - `errors: Record<string, string[]>` — a field-level map where each
 *   key is the property name and each value is the array of constraint
 *   messages for that property.
 *
 * This is the additive change: existing endpoints that rely on the
 * `message` array continue to work unchanged; consumers that inspect
 * `errors` get per-field feedback.
 *
 * Registered in `main.ts` (replacing the stock pipe) and in
 * `test/test-http.ts` (test-harness parity).
 */
export class FieldValidationPipe extends ValidationPipe {
  // Override as a property (Nest's ValidationPipe defines exceptionFactory
  // as a property, not a method — using a method causes TS2425).
  protected exceptionFactory = (
    errors: { property: string; constraints?: Record<string, string> }[]
  ): BadRequestException => {
    // Build the field-level errors map.
    const errorsMap: Record<string, string[]> = {};
    const messageArray: string[] = [];

    for (const validationError of errors) {
      const constraints = validationError.constraints;
      if (!constraints) continue;

      // Collect the property path (nested properties like "preferences.key"
      // are joined with "." by class-validator).
      const property = validationError.property;

      // Collect constraint messages for this property.
      const messages = Object.values(constraints) as string[];
      errorsMap[property] = messages;

      // Also collect into the stock message array (backward compat).
      messageArray.push(...messages);
    }

    return new BadRequestException({
      statusCode: 400,
      message: messageArray,
      error: 'Bad Request',
      errors: errorsMap,
    });
  };
}
