import { readFileSync } from 'fs';
import { join } from 'path';
import { FieldValidationPipe } from './validation.pipe';
import { FIELD_VALIDATION_PIPE_OPTIONS } from './validation-pipe-options';

/**
 * R-EP14-06 (EP14B-AC1 unit clause): the validation policy the gated
 * strictness specs prove is the one production enforces. Two pins:
 *
 * 1. The shared options object is strict (no implicit coercion, whitelist,
 *    forbid-non-whitelisted, transform) and frozen — a drift here fails
 *    loudly instead of silently relaxing `main.ts`.
 * 2. `main.ts` and `test/test-http.ts` both build their pipe from the
 *    constant and carry no inline option literal, so "parity" holds by
 *    construction rather than by two hand-kept copies.
 *
 * No database required.
 */
describe('FIELD_VALIDATION_PIPE_OPTIONS', () => {
  it('pins the strict production policy', () => {
    expect(FIELD_VALIDATION_PIPE_OPTIONS).toEqual({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    });
    expect(FIELD_VALIDATION_PIPE_OPTIONS.transformOptions?.enableImplicitConversion).toBe(false);
  });

  it('is frozen so no caller can relax it at runtime', () => {
    expect(Object.isFrozen(FIELD_VALIDATION_PIPE_OPTIONS)).toBe(true);
    expect(Object.isFrozen(FIELD_VALIDATION_PIPE_OPTIONS.transformOptions)).toBe(true);
  });

  it('is accepted unchanged by FieldValidationPipe (no option is dropped or rewritten)', () => {
    const pipe = new FieldValidationPipe(FIELD_VALIDATION_PIPE_OPTIONS) as unknown as {
      validatorOptions: Record<string, unknown>;
      transformOptions: Record<string, unknown>;
      isTransformEnabled: boolean;
    };
    expect(pipe.isTransformEnabled).toBe(true);
    expect(pipe.validatorOptions).toMatchObject({ whitelist: true, forbidNonWhitelisted: true });
    expect(pipe.transformOptions).toEqual({ enableImplicitConversion: false });
  });

  describe('main.ts ≡ test/test-http.ts by construction', () => {
    const src = (rel: string) => readFileSync(join(__dirname, '..', '..', rel), 'utf8');

    it.each(['main.ts', 'test/test-http.ts'])('%s builds its pipe from the constant', (rel) => {
      const text = src(rel);
      expect(text).toContain('new FieldValidationPipe(FIELD_VALIDATION_PIPE_OPTIONS)');
      expect(text).toMatch(
        /import \{ FIELD_VALIDATION_PIPE_OPTIONS \} from '[./]+\/common\/pipes\/validation-pipe-options'/
      );
      // No inline literal may shadow the shared policy.
      expect(text).not.toMatch(/enableImplicitConversion\s*:/);
      expect(text).not.toMatch(/new (Field)?ValidationPipe\(\s*\{/);
    });
  });
});
