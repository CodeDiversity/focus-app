# SP-106C Checkpoint

**Story:** SP-106C — Profile and Preferences Form (Frontend)
**Status:** Implemented — awaiting parent review (2026-10-17)
**Sequence:** A → B → C → D (sequential)
**Commit:** `6ece311` (implementation) — checkpoint/queue docs in a docs commit

## Grounding findings carried into implementation (deviations from ticket notes)

1. **Error payload plumbing (deviation, recorded for the parent review):** the
   ticket's five-file list could not deliver AC-106-06 — the thunk sanitized
   the 400 into a bare string and the adapter rethrew `new Error(string)`.
   Locked in: `authSlice.thunks.ts` `updateProfile` now rejects with
   `{ message, apiError }` (parsed from the interceptor rejection's
   `response.data`), `AuthContext.updateProfileFn` rethrows with `apiError`
   attached, and `Profile.tsx` renders it via the new
   `getFieldError`/`Input` wiring; the sanitized toast covers non-400
   failures. Slice shape, `getErrorMessage` and all other flows unchanged;
   SP-105 thunk/adapter tests stay green (login's string-payload path
   untouched), and the SP-108F thunk-spec expectations were updated to the new
   updateProfile payload contract.
2. **`SessionUser.timeZone`/`preferences` typed optional with guard:** backend
   login/refresh selects don't include the new fields (only GET/PATCH
   `/users/me` do) — the ticket's claim that those responses gain the fields
   is inaccurate. D106-3 pre-fill falls back to the browser zone when missing
   or `"UTC"`; the stored zone displays after a PATCH round-trip.
3. **No regressions entering C:** the full web suite was green before work
   started (verified during B's completion pass) and green after.

## Milestone evidence

### Files (commit `6ece311`)
- `apps/web/src/pages/Profile.tsx` — time-zone field, schema + zod refine
  (D106-4), pre-fill (D106-3), PATCH body `{ name, timeZone }` (D106-9),
  server field errors via RHF `setError`, sanitized toast, stored-zone display
  line, loading/success/error states
- `apps/web/src/pages/Profile.test.tsx` (new) — 9 page tests
- `apps/web/src/services/auth.ts` — `api.put` → `api.patch` (D106-2)
- `apps/web/src/types/index.ts` — `SessionUser` optional fields;
  `ApiError.message: string | string[]`
- `apps/web/src/utils/errors.ts` — `getFieldError` +
  `extractApiError`/`apiErrorMessage`
- `apps/web/src/store/authSlice.thunks.ts` — structured rejection
- `apps/web/src/context/AuthContext.tsx` — adapter rethrow with `apiError`

### Verification
- **Full web suite:** 188/188 pass (19 files)
- **Typecheck:** `pnpm --filter @studypilot/web typecheck` clean
- **Lint:** `pnpm --filter @studypilot/web lint` clean (`--max-warnings=0`)

### AC coverage
- AC-106-02 — form submits `{ name, timeZone }` via the existing thunk; slice
  user round-trips the PATCH response (test reads the store).
- AC-106-03 — client half: `Mars/Olympus` rejected before any request
  (backend half pinned by B's integration spec).
- AC-106-04 — D106-3 both branches + login-shape fallback.
- AC-106-06 — field-level 400 rendered under the input (aria wiring
  asserted); loading/error/success states.
- Story technical note — stored-zone display via the shared
  `formatDateTime` helper (frozen-instant test).

## Completion state

- Queue row C → `Implemented — awaiting parent review`
- Next actionable: [SP-106D](../../SP-106D-profile-integration.md) — implement
  (round-trip suite + manual browser sign-off).
