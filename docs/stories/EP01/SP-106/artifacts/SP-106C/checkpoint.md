# SP-106C Checkpoint

**Story:** SP-106C — Profile and Preferences Form (Frontend)
**Status:** Implemented — awaiting parent review (2026-10-17); IR-106-01 fixed 2026-10-17 (`5050b82`)
**Sequence:** A → B → C → D (sequential)
**Commit:** `6ece311` (implementation) · `5050b82` (IR-106-01 fix + tests, from the combined parent review) — checkpoint/queue docs in docs commits

## Combined parent review finding IR-106-01 — fixed 2026-10-17 (commit `5050b82`)

**Finding (review pass 1, `../SP-106/review.md`):** the page read the stored zone
from the *session* user, but login/refresh/boot project only
`id/name/email/emailVerifiedAt`, so `user.timeZone` was `undefined` on every
normal session; D106-3's "pre-fill the stored value" branch was unreachable, the
display line showed the browser zone, and a name-only save PATCHed that fallback
over the stored zone. Verified in code before fixing (`Profile.tsx:33-35` +
`AuthContext.tsx:184-198`).

**Fix (test-first; 5 new page tests were RED first):**

- `Profile.tsx` reads the full profile once via `AuthContext.refreshProfile()`
  (`GET /users/me`) and re-seeds the form when the stored profile arrives
  (react-hook-form `defaultValues` do not refresh after mount). The request is
  deferred one microtask because the provider mirrors `user` into its own ref in
  an effect that runs *after* this page's mount effects — an immediate call is a
  silent no-op. In-progress keystrokes win: the re-seed is skipped once the
  student has typed (`markEdited` on both inputs).
- The PATCH body keeps the form contract `{ name, timeZone }`, but omits
  `timeZone` while the stored value is still unknown and the student has not
  touched the field — so an unreadable stored zone can never be overwritten by
  the browser fallback. (C's AC3 contract is preserved for the normal path.)
- `Profile.test.tsx`: hydration pre-fill + display line, name-only save after
  hydration re-sends the stored zone, unknown-zone name-only save sends no
  `timeZone`, explicit zone choice still sends the chosen zone, and a slow-read
  race proving a late hydration does not clobber typing.
- `README.md` (repo root) API list: `PUT /users/me` → `PATCH /users/me`
  (review polish IR-106-04).

**Verification after the fix:** web suite **19 files / 193 tests passed**
(188 + 5 new); `typecheck` + `lint` clean; API suite re-run unchanged on a
disposable Postgres — **25 suites / 288 tests, 0 skips**; API typecheck clean,
lint 0 errors (1 pre-existing warning). Non-blocking polish IR-106-02/03/06 were
left untouched (they are SP-106B behaviour the review classified as polish; not
authorized in this fix pass).

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

- Queue row C → `Implemented — awaiting parent review` (IR-106-01 fixed in
  `5050b82` after the combined parent review's first pass; re-review next)
- Next actionable: the single combined SP-106 parent re-review
  (`../SP-106/review.md`).
