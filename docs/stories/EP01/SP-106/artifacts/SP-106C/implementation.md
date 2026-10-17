# SP-106C Implementation Record

**Story:** SP-106C — Profile and Preferences Form (Frontend)
**Status:** Implemented — awaiting combined parent review (2026-10-17)
**Parent:** SP-106 (STUDY-11)
**Delivery home:** `docs/stories/EP01/SP-106/`

## Summary

The Profile page gained a Time zone field — pre-filled per D106-3, validated
client-side with the shared TECH-01 IANA helper before any request, submitted
via `PATCH /users/me` (D106-2) with the SP-106B field-level `errors` map
rendered under the matching input, plus loading/success/error states and the
stored-zone display line through the shared date/time helper.

## Files changed (commit `6ece311`)

### New files
1. `apps/web/src/pages/Profile.test.tsx` — 9 wrapper tests following the
   `Register.test.tsx` page-test pattern (seeded store + real `AuthProvider` +
   mocked `authService`).

### Modified files
2. `apps/web/src/pages/Profile.tsx` — time-zone field: `timeZone` in
   `profileSchema` (`z.string().min(1).refine(isValidTimeZone, …)`), D106-3
   pre-fill, submit body `{ name, timeZone }` only (D106-9), server field
   errors via RHF `setError('timeZone'|'name', { type: 'server', … })`,
   sanitized toast for non-400 failures, stored-zone display line
   (`formatDateTime(new Date(), storedTimeZone ?? defaultTimeZone)` under the
   field), loading disables all fields + submit spinner, Reset unchanged.
3. `apps/web/src/services/auth.ts` — `updateProfile`: `api.put` → `api.patch`
   (D106-2; no alias on the API side).
4. `apps/web/src/types/index.ts` — `SessionUser.timeZone?: string`,
   `SessionUser.preferences?: Record<string, unknown> | null`;
   `ApiError.message` widened to `string | string[]` (the 400 wire truth).
5. `apps/web/src/utils/errors.ts` — new `getFieldError(error, field)`
   (returns the first message from the 400 `errors` map, or null), plus
   `extractApiError`/`apiErrorMessage` helpers for the error plumbing.
6. `apps/web/src/store/authSlice.thunks.ts` — `updateProfile` catch parses the
   interceptor rejection's `response.data` and rejects with
   `{ message: string, apiError?: ApiError }` instead of a bare string. The
   slice error surface keeps the sanitized message (now actionable for 400s).
7. `apps/web/src/context/AuthContext.tsx` — `updateProfileFn` rethrows the
   structured payload with the parsed `ApiError` attached under `apiError`;
   string-payload fallback path unchanged (login/recovery untouched).
8. `apps/web/src/store/authSlice.thunks.test.ts` — the updateProfile-rejection
   test now pins the structured payload; new test pins the interceptor-shaped
   400 → `{ message, apiError }` plumbing (D106-6).

## Acceptance criteria verification

| AC | Status | Evidence |
|---|---|---|
| AC-106-04 (form pre-fill) | ✅ | D106-3 rule in `Profile.tsx`; tests: stored non-`UTC` value pre-fills; `UTC` falls back to browser zone (mocked `resolvedOptions` → `Europe/Paris`); missing field (login shape) also falls back |
| AC-106-03 client (TR-106-01) | ✅ | `refine(isValidTimeZone)` rejects `Mars/Olympus` with "Enter a valid IANA time zone, e.g. America/New_York"; test asserts no request was sent |
| AC-106-02 (PATCH submit) | ✅ | Test asserts `updateProfile` called with exactly `{ name, timeZone }`; `auth.put` → `auth.patch` switch in `services/auth.ts`; slice user round-trips the PATCH response (test reads `store.getState().auth.user.timeZone`) |
| AC-106-06 field-level | ✅ | Test: 400 with `errors.timeZone` renders the message under the input, `aria-invalid` set, toast suppressed; non-400 failure → sanitized toast |
| AC-106-06 states (DoD 5) | ✅ | Test: pending promise → submit disabled + fields disabled (spinner); success toast asserted in the happy-path test |
| Stored-zone display line | ✅ | Test freezes `Date` and asserts the line shows `formatDateTime(frozen, 'America/New_York')` — same helper, no re-implementation |
| Keyboard/responsive (DoD 6/7) | ✅ | The `Input` component's existing `aria-invalid`/`aria-describedby` error wiring covers the new field (asserted); existing card layout untouched |

## Test results

- **Full web suite:** 188/188 pass (19 files)
- **Typecheck:** clean (`tsc --noEmit`)
- **Lint:** clean (`eslint --max-warnings=0`)

## Grounded deviations from the ticket's technical notes

1. **Error plumbing through the thunk/adapter (plumbing only, recorded in the
   checkpoint):** the ticket said the thunk/adapter are unchanged and only
   `errors.ts` needs `getFieldError`. That cannot render field-level messages:
   the thunk slashed the 400 to a string (`rejectWithValue(getErrorMessage)`),
   and the adapter rethrew `new Error(string)`. The `errors` map now rides the
   structured thunk payload (`{ message, apiError }`) and the adapter rethrows
   with `apiError` attached. **Slice state shape, `getErrorMessage` behavior,
   and all other thunks/adapters are unchanged**; login/recovery flows were
   not touched (their SP-105 tests stay green untouched).
2. **`SessionUser` fields typed optional:** the ticket claimed login/register/
   boot responses gain the new fields from SP-106A/B; the backend auth service
   selects only `id/name/email/emailVerifiedAt` for login/refresh — the fields
   are present only on `GET/PATCH /users/me` payloads. Optional typing plus the
   pre-fill guard keeps D106-3 behavior honest (browser-zone fallback). Token
   users see the stored zone after a PATCH round-trip, exactly per D106-3.
3. **`ApiError.message` widened to `string | string[]`** to make the SP-106C
   code honest about the preserved array on 400s (D106-6); the pre-existing
   interceptor cast still compiles.

## Dependencies

- **SP-106A / SP-106B:** implemented (commits `fbd0ab7`/`71aff0d`, `51add91`);
  the PATCH contract consumed here is pinned by B's integration spec.
- **SP-106D:** unblocked — D can now verify the browser↔API round-trip over a
  real deployment (cross-session proof and manual sign-off).

## Known limitations

- `preferences` is not surfaced in the M1 UI (D106-9) — the stored bag is left
  untouched by the form's partial PATCH body.
- The displayed "currently … there" line reflects the *stored* zone, not the
  value being typed (story note: display uses the stored zone).
