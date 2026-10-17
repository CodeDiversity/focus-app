# SP-109C: `shared/ui` and `shared/api` — design system, transport, recovery

**Story ID:** SP-109C
**Epic:** Cross-cutting technical task (standalone; see [SP-109](./SP-109.md))
**Milestone:** M1
**Layer / owner:** Frontend, `implementer` (single writer)
**Status:** Queued (SP-109B must land first)
**Dependencies:** SP-109A, SP-109B (types are re-homed in B)
**Jira key:** Pending creation

## Summary and bounded scope

Move the two remaining generic building blocks into the `shared` layer: the
reusable UI (`Button`, `Input`) and the HTTP transport (`httpClient`,
`tokenStore`, `recovery`). After this child `src/services/` and
`src/components/Button|Input` are gone, every remaining folder in the app has a
single owner, and the SP-105G interceptor semantics are provably unchanged
because the test files move with their modules and pass unedited.

Excluded: the service-method split (D/E), all feature folders (E/F), widgets
(G — it owns `Layout`/`Header`/`EmailVerificationBanner`/the guards) and pages
(H).

## Source requirement references

RQ-109-02 (components in their owning folder), RQ-109-04, RQ-109-06; RD4 and
RD5 in the [breakdown README](./README.md); shared
[DoD](../../epics/README.md#definition-of-done) items 1, 4, 8, 9.

## Acceptance criteria

1. `src/components/Button.tsx` + `Button.test.tsx` → `src/shared/ui/Button.tsx`
   + `src/shared/ui/Button.test.tsx`; `src/components/Input.tsx` →
   `src/shared/ui/Input.tsx`. Export names (`Button`, `Input`, prop types)
   unchanged; **no markup, class or accessibility attribute is edited.**
2. `src/services/api.ts` → `src/shared/api/httpClient.ts`,
   `src/services/api.test.ts` → `src/shared/api/httpClient.test.ts`,
   `src/services/tokenStore.ts` → `src/shared/api/tokenStore.ts`,
   `src/services/recovery.ts` + `recovery.test.ts` →
   `src/shared/api/recovery.ts` + `src/shared/api/recovery.test.ts`.
   Every export keeps its name and signature: the axios default export,
   `refreshAccessToken`, `setSessionExpiredHandler` (+ `setAuthFailureHandler`
   alias), `SessionExpiredHandler`, `apiGet/apiPost/apiPut/apiPatch/apiDelete`,
   `tokenStore`, `RecoveryError`, `isRecoveryBarrierActive`,
   `onRecoveryBarrierReleased`, `snapshotSessionGeneration`,
   `setInFlightRefresh`, `sanitizeRecoveryError`, `runRecoveryReset`,
   `ResetPasswordResult`, `registerLocalSessionClearer`,
   `isRecoveryError` (RD4/RD5). `src/services/` no longer exists.
3. Only the module's own `import`/`export` lines change: paths become
   `@/shared/api/*`, `@/shared/lib/errors`, `@/shared/api/types`,
   `@/features/auth/model/types` (auth payloads),
   `@/entities/user/model/types` (`SessionUser` used by `recovery.ts`).
   A code comment that cites a moved path (e.g.
   `httpClient.ts` "shared `src/services/api.ts` axios instance",
   `sessionApi.ts`'s doc block) is updated to the new path; **no logic line is
   touched.**
4. All importers are repointed, verified by grep to leave zero references to
   `src/services/` or `src/components/Button|Input`:
   `src/services/auth.ts` (moved in E, so this child rewrites its imports in
   place), `src/store/api.ts`, `src/store/api.test.ts`,
   `src/hooks/useResendVerification.test.tsx`, `src/context/*.tsx`,
   `src/pages/*.tsx` + their tests (`vi.mock('../services/auth')` targets are
   unaffected — that module is E's move), and every page/widget that imported
   `@/shared/ui/Button` or `@/shared/ui/Input`.
5. `pnpm --filter @studypilot/web test` → 19 files / 193 tests green with
   **zero edits to any test assertion**; `typecheck` → exit 0; `lint` → exit 0.

## Tests (future obligations)

| Area | File | Named cases |
|---|---|---|
| Transport | `src/shared/api/httpClient.test.ts` (moved, unchanged) | all existing cases — single-flight refresh, `AUTH_PATHS` exclusion, retry-once, generation guard, recovery-path sanitization — green from the new path |
| Recovery barrier | `src/shared/api/recovery.test.ts` (moved, unchanged) | all existing barrier/generation/sanitization cases green |
| Shared UI | `src/shared/ui/Button.test.tsx` (moved, unchanged) | existing Button cases green |
| Regression for consumers | existing `src/store/api.test.ts`, `src/context/*.test.tsx`, `src/pages/*.test.tsx` | unchanged and green against the relocated transport |

## Technical notes

### Inspected code (2026-10-17, planner)

- `src/services/api.ts` (212 lines) — axios instance, `RECOVERY_PATHS`,
  `AUTH_PATHS`, `isAuthPath`, `isRecoveryPath`, the single-flight
  `refreshPromise`/`deferredRefresh`, request/response interceptors, sanitized
  rejects, and the `apiGet/…/apiDelete` helpers. Imports
  `./tokenStore`, `./recovery` and `../types` (lines 7–15) — all three targets
  move into `shared` in this child, which is why no upward import appears.
- `src/services/recovery.ts` (434 lines) — barrier, generation counter,
  `RecoveryError`, `sanitizeRecoveryError`, `runRecoveryReset`; imports
  `../types` (`AuthResponse`) and `./tokenStore` (lines 29–30).
- `src/services/tokenStore.ts` (17 lines) — memory-only access token; no
  `localStorage`/`sessionStorage` (SP-102 constraint, unchanged).
- `src/components/Button.tsx` (91 lines) and `Input.tsx` (107 lines) — the
  focus-visible classes SP-103/SP-108 reviews cited
  (`Button.tsx:28`, `Input.tsx:60`); moved verbatim.
- `src/components/Layout.tsx` imports `./Header` and
  `./EmailVerificationBanner` — those files belong to G, so `Layout` keeps its
  relative import until G runs and is **not** touched here.

### Proposed (not verified)

- Keep the file name `httpClient.ts` while the module keeps `api` as its default
  export. If the implementer prefers `shared/api/client.ts`, that rename is
  allowed as long as every specifier and the doc comments are consistent.
- `shared/api/types.ts` already exists after B (`ApiError`, `ApiResponse<T>`);
  this child does not add types.

## Sizing

- **Outcome:** `shared/ui` and `shared/api` hold all generic UI and the whole
  HTTP/session transport, and `src/services/` is gone, with identical behavior.
- **Time estimate:** 60–90 min: 8 file moves, 2 import-path-only edits inside
  the transport, and ~12 importer rewrites, then three verification commands.
  Uncertainty is low; the interceptor code is copied, not re-authored.
- **Files:** production — `src/shared/ui/{Button,Input}.tsx`,
  `src/shared/api/{httpClient,tokenStore,recovery}.ts` (new paths);
  `src/services/*` and `src/components/{Button,Input}.tsx` deleted;
  importers rewritten (`src/store/api.ts`, `src/services/auth.ts` until E,
  `src/hooks/useResendVerification.test.tsx`, `src/context/*`, `src/pages/*`).
  Tests — `src/shared/api/httpClient.test.ts`, `src/shared/api/recovery.test.ts`,
  `src/shared/ui/Button.test.tsx` (all moved, unchanged).
- **Start context:** this ticket; [breakdown README](./README.md) *Target
  structure* + RD4/RD5; `apps/web/src/services/api.ts` (full),
  `src/services/recovery.ts` (header + exports), `src/services/tokenStore.ts`,
  `src/components/Button.tsx`.
- **Verification:** `pnpm --filter @studypilot/web test` → 19 files / 193 tests;
  `typecheck` → exit 0; `lint` → exit 0; `grep -rn "src/services\|services/api\|services/recovery\|services/tokenStore" apps/web/src` → only historical comment text,
  if any, remains and is corrected.
- **Dependencies / exclusions:** A (alias), B (types). Excludes the
  `authService` split (D/E), features (E/F), widgets (G), pages/app (H),
  final verification (I).

## Definition of Done

DoD 1 and 8 apply; DoD 4 (actionable errors) is explicitly preserved — the
interceptor, `RecoveryError` sanitization and message strings move unchanged and
their suites pass unedited, which is the evidence. DoD 3 N/A (no backend data
access or ownership change; only file location changes — reason in the README
DoD map). DoD 2/5/6/7 N/A — no validation, state, keyboard or responsive change
(reasons in the README map). DoD 9 covered by this ticket and the breakdown; the
root `README.md` transport-path line is repointed by I (RD12). DoD 10 belongs to
the combined SP-109 review. Evidence goes to `./artifacts/SP-109C/`.

## Tracker reference

`Pending creation` (RD11).

## Out of scope

- Splitting `authService` and moving the auth context — [SP-109E](./SP-109E-feature-auth.md).
- `entities/user` service extraction — [SP-109D](./SP-109D-entity-user.md).
- `Layout`/`Header`/banner/guards — [SP-109G](./SP-109G-widgets.md).
