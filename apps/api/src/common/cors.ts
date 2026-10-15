// `CorsOptions` is not top-level exported in Nest 10 — use the canonical path.
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * The API's single CORS configuration (SP-105F AC3 / PR-001).
 *
 * `Retry-After` is exposed so the separate-origin SPA can read the
 * recovery limiter's retry guidance from a filtered 429. No other response
 * headers are exposed. `origin` (trusted `FRONTEND_URL`) and `credentials`
 * are unchanged from the pre-limiter behavior.
 *
 * Shared between `main.ts` and the integration test helper
 * (`src/test/test-http.ts`) so tests assert the real configuration rather
 * than a hand-copied one; SP-105D verifies browser readability.
 */
export function appCorsOptions(): CorsOptions {
  return {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    exposedHeaders: ['Retry-After'],
  };
}
