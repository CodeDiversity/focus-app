# SP-109C: `shared/ui` and `shared/api` — design system, transport, recovery

**Story ID:** SP-109C
**Epic:** Cross-cutting technical task (standalone; see [SP-109](./SP-109.md))
**Milestone:** M1
**Layer / owner:** Frontend, `implementer` (single writer)
**Status:** Ready (refined 2026-10-17; SP-109A/B implemented 2026-10-17 — dependencies met; queue-row reconciliation pending)
**Dependencies:** SP-109A (`@/` alias, layer zones), SP-109B (type homes) — both implemented 2026-10-17
**Jira key:** STUDY-47 (synced 2026-10-17, per [jira-sync ledger](../../jira-sync/README.md))
**Refined:** 2026-10-17

## Summary and bounded scope

Move the two remaining generic building blocks into the `shared` layer: the
reusable UI (`Button`, `Input`) and the HTTP transport (`httpClient`,
`tokenStore`, `recovery`). After this child `src/services/` contains only
`auth.ts` (E moves it) and `src/components/` retains only G's files
(`Layout`/`Header`/`EmailVerificationBanner`/guards); the SP-105G interceptor
semantics are provably unchanged because the test files move with their modules
and pass unedited. One config change accompanies the move: a narrow
`shared`-zone exception (RD13, user-approved 2026-10-17) so the transport can
type-import `AuthResponse` from `features/auth/model/types`.

Excluded: the service-method split (D/E), all feature folders (E/F), widgets
(G — it owns `Layout`/`Header`/`EmailVerificationBanner`/the guards), pages
(H), app shell (H) and final verification (I).

## Source requirement references

RQ-109-02 (components in their owning folder), RQ-109-04, RQ-109-06; RD2
(alias imports), RD4/RD5 (transport placement), RD6 (zone mechanism), RD13
(shared-zone type exception — new, this ticket); shared
[DoD](../../epics/README.md#definition-of-done) items 1, 4, 8, 9.

## Acceptance criteria

1. `src/components/Button.tsx` + `Button.test.tsx` → `src/shared/ui/Button.tsx`
   + `src/shared/ui/Button.test.tsx`; `src/components/Input.tsx` →
   `src/shared/ui/Input.tsx`. Export names (`Button`, `Input`, `ButtonProps`,
   `InputProps`) unchanged; **no markup, class or accessibility attribute is
   edited.** (`Input.test.tsx` does not exist — a pre-existing gap, not added
   here; see Out of scope.)
2. `src/services/api.ts` → `src/shared/api/httpClient.ts`,
   `src/services/api.test.ts` → `src/shared/api/httpClient.test.ts`,
   `src/services/tokenStore.ts` → `src/shared/api/tokenStore.ts`,
   `src/services/recovery.ts` + `recovery.test.ts` →
   `src/shared/api/recovery.ts` + `src/shared/api/recovery.test.ts`.
   Every export keeps its name and signature (RD4/RD5): the axios default
   export `api`, `refreshAccessToken`, `setSessionExpiredHandler`
   (+ `setAuthFailureHandler` alias), `SessionExpiredHandler`,
   `apiGet/apiPost/apiPut/apiPatch/apiDelete`, `tokenStore`, `RecoveryError`,
   `isRecoveryError`, `isRecoveryBarrierActive`, `onRecoveryBarrierReleased`,
   `snapshotSessionGeneration`, `advanceSessionGeneration`,
   `registerLocalSessionClearer`, `setInFlightRefresh`, `getInFlightRefresh`,
   `sanitizeRecoveryError`, `runRecoveryReset`, `ResetPasswordResult`,
   `RECOVERY_DRAIN_TIMEOUT_MS`. `src/services/` then contains **only**
   `auth.ts` (E's move — not deleted here).
3. In-file edits are import/comment lines only:
   - `httpClient.test.ts`: `./auth` → `@/services/auth` (auth.ts stays in
     `src/services/` until E; E repoints it to
     `@/features/auth/api/authService`).
   - `recovery.ts` header comment: the stale `../types` citation (dead since
     B) → `@/features/auth/model/types`.
   - `store/api.ts` doc comment (line 24): `src/services/api.ts` →
     `src/shared/api/httpClient.ts` (its `services/auth.ts` citations at lines
     41/59 stay valid until E).
   - Every other moved line is untouched: same-directory relative imports
     (`./tokenStore`, `./recovery`, `./api`, `./Button`) remain valid after
     the move, and B already aliased the cross-directory type imports.
   - **No logic line, no test assertion, no message string is touched.**
4. All importers of the moved modules are repointed to `@/shared/ui/*` /
   `@/shared/api/*` alias specifiers (RD2) — complete table in Technical
   notes. `vi.mock('../services/auth')` targets are unaffected (auth.ts is
   E's move). Verified by grep: **zero** references to `services/api`,
   `services/recovery`, `services/tokenStore`, `components/Button` or
   `components/Input` anywhere in `apps/web/src` (code or comments).
5. **Shared-zone exception (RD13):** the `src/shared` zone in
   `apps/web/.eslintrc.cjs` gains `except: ['auth/model/types.ts']` (message
   updated to name the type-only exception). Proof recorded in the
   implementation record: (a) the `AuthResponse` type import in the moved
   `src/shared/api/*` files lints clean; (b) a probe import of any **other**
   `@/features/...` module from a `src/shared/**` file is reported by
   `import/no-restricted-paths`, then reverted → lint exit 0. (SP-109I's
   final red/green proof must use a non-excepted features import for the same
   reason.)
6. A's misplaced skeleton `src/features/shared/` (`.gitkeep`-only; B's
   implementation record delegates its cleanup to C) is deleted.
7. `pnpm --filter @studypilot/web test` → 19 files / 193 tests green with
   **zero edits to any test assertion**; `typecheck` → exit 0; `lint` →
   exit 0. (Baseline re-verified 2026-10-17 post-B: 19/193 green, typecheck
   exit 0, lint exit 0.)

## Tests (future obligations)

| Area | File | Named cases |
|---|---|---|
| Transport | `src/shared/api/httpClient.test.ts` (moved; one import line repointed) | all existing cases — single-flight refresh, `AUTH_PATHS` exclusion, retry-once, generation guard, recovery-path sanitization — green from the new path |
| Recovery barrier | `src/shared/api/recovery.test.ts` (moved, unchanged) | all existing barrier/generation/sanitization cases green |
| Shared UI | `src/shared/ui/Button.test.tsx` (moved, unchanged) | existing Button cases green |
| Regression for consumers | `src/store/api.test.ts`, `src/context/{AuthContext,AuthContext.registerLogout}.test.tsx`, `src/components/EmailVerificationBanner.test.tsx`, `src/hooks/useResendVerification.test.tsx`, `src/pages/{Login,Register,VerifyEmail,ForgotPassword,ResetPassword}.test.tsx` | import lines only; unchanged assertions green against the relocated transport |

## Technical notes

### Decisions

- **RD13 (user-approved 2026-10-17):** the `src/shared` zone in
  `apps/web/.eslintrc.cjs` gains `except: ['auth/model/types.ts']`. The
  transport's type-only `AuthResponse` import from
  `features/auth/model/types` is the sole sanctioned `shared → features`
  import. Type-only imports are erased at compile time, so there is no
  runtime `shared → features` dependency and RD4's rationale (the transport
  must not consume feature code) holds. Verified 2026-10-17 in a temp copy of
  `apps/web`: without the except the moved files fail lint (aliased **and**
  relative forms both flagged); with it, exactly that file is exempt, other
  features imports are still flagged, and the full lint is clean. The
  `except` property is the schema-validated form in eslint-plugin-import
  2.32.0 (an `ignore` key is rejected); it resolves relative to each `from`
  entry, so it matches only `src/features/auth/model/types.ts`. Planner
  records RD13 in the breakdown README decision register and in the
  import-direction contract (the refiner writes only this story).
- **File name stays `httpClient.ts`** (RD4; EP05 and the epics README were
  repointed to `shared/api/httpClient.ts` by PC-001; SP-109I's root-README
  repoint names it). The earlier "rename to `client.ts` allowed" option is
  withdrawn as it would desync those docs.
- **Importers use `@/` alias specifiers** (RD2), not relative paths — the
  layer zones match resolved paths, and alias form is the repo convention B
  established.
- **`src/features/shared/` is deleted by C** (`.gitkeep`-only skeleton A
  created under `features/`; B's implementation record names C as the
  cleanup owner). B-era `.gitkeep` placeholders inside `src/shared/*` are
  left in place — harmless, not C's cleanup.
- **Transitional import:** `httpClient.test.ts` → `@/services/auth` is a
  deliberate temporary `shared → legacy-folder` import (not zone-restricted:
  `src/services` is not in the shared zone's `from` list); E repoints it.

### Inspected code (2026-10-17, refiner — post-A/B tree)

- `src/services/api.ts` (212 lines) — axios instance, `RECOVERY_PATHS`/
  `AUTH_PATHS`, single-flight `refreshPromise`/`deferredRefresh`,
  request/response interceptors, `apiGet/…/apiDelete`. Imports: `./tokenStore`,
  `./recovery` (same directory) and `@/shared/api/types`,
  `@/features/auth/model/types` (both already aliased by B) → **zero import
  edits** on the move.
- `src/services/recovery.ts` (434 lines) — barrier, generation counter,
  `RecoveryError`, `sanitizeRecoveryError`, `runRecoveryReset`. Imports
  `@/features/auth/model/types` (line 29) and `./tokenStore` (line 30) → zero
  import edits; header comment line 4 cites the dead `../types` path → update.
- `src/services/tokenStore.ts` (17 lines) — memory-only access token; no
  imports (SP-102 constraint, unchanged).
- `src/services/api.test.ts` (394 lines) — imports `./api`, `./auth`,
  `./tokenStore`, `./recovery` (relative) + `@/features/auth/model/types`;
  only `./auth` breaks on the move → repoint to `@/services/auth`.
- `src/services/recovery.test.ts` (401 lines) — all same-directory relative →
  unchanged.
- `src/components/Button.tsx` (91 lines), `Input.tsx` (107 lines),
  `Button.test.tsx` — external imports only (`react`, `clsx`,
  `tailwind-merge`, `lucide-react`, `@testing-library/react`); `./Button`
  same-directory → unchanged. No `Input.test.tsx` exists.
- `apps/web/.eslintrc.cjs` — A's five `import/no-restricted-paths` zones with
  `basePath: './'`; `eslint-import-resolver-alias` is installed (v1.1.2) and
  configured (`@ → ./src`), which is what makes **aliased** specifiers match
  zones (A's record claims no resolver was needed — its red/green proof used a
  relative import; the probe confirmed the alias resolver is what catches
  `@/...` specifiers).
- Baseline re-run 2026-10-17 post-B: 19 files / 193 tests green; typecheck
  exit 0; lint exit 0.

### Moved files (8)

| From | To | In-file edits |
|---|---|---|
| `src/components/Button.tsx` | `src/shared/ui/Button.tsx` | none |
| `src/components/Button.test.tsx` | `src/shared/ui/Button.test.tsx` | none (`./Button` same dir) |
| `src/components/Input.tsx` | `src/shared/ui/Input.tsx` | none |
| `src/services/api.ts` | `src/shared/api/httpClient.ts` | none |
| `src/services/api.test.ts` | `src/shared/api/httpClient.test.ts` | `./auth` → `@/services/auth` |
| `src/services/tokenStore.ts` | `src/shared/api/tokenStore.ts` | none |
| `src/services/recovery.ts` | `src/shared/api/recovery.ts` | header comment `../types` → `@/features/auth/model/types` |
| `src/services/recovery.test.ts` | `src/shared/api/recovery.test.ts` | none |

### Importer repoints (24 files; import lines only)

Production (14):

| File | Lines repointed |
|---|---|
| `src/services/auth.ts` (stays; E moves it) | `./api` → `@/shared/api/httpClient`, `./tokenStore` → `@/shared/api/tokenStore`, `./recovery` → `@/shared/api/recovery` |
| `src/store/api.ts` | `../services/api` → `@/shared/api/httpClient` + doc comment (line 24) |
| `src/store/authSlice.thunks.ts` | `../services/tokenStore` → `@/shared/api/tokenStore` |
| `src/context/AuthContext.tsx` | tokenStore, api, recovery → `@/shared/api/*` (3 lines) |
| `src/components/Header.tsx` | `./Button` → `@/shared/ui/Button` |
| `src/components/EmailVerificationBanner.tsx` | `./Button` → `@/shared/ui/Button` |
| `src/pages/Home.tsx`, `src/pages/Dashboard.tsx` | Button |
| `src/pages/Login.tsx`, `src/pages/Register.tsx`, `src/pages/Profile.tsx` | Button, Input |
| `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx` | Button, Input, `../services/recovery` → `@/shared/api/recovery` |
| `src/pages/VerifyEmail.tsx` | Button, Input (its `../services/auth` line stays — E) |

Tests (10):

| File | Lines repointed |
|---|---|
| `src/store/api.test.ts` | api, tokenStore (auth stays) |
| `src/context/AuthContext.test.tsx` | api, tokenStore, recovery (auth stays) |
| `src/context/AuthContext.registerLogout.test.tsx` | tokenStore (auth stays) |
| `src/components/EmailVerificationBanner.test.tsx` | api, tokenStore |
| `src/hooks/useResendVerification.test.tsx` | api, tokenStore |
| `src/pages/Login.test.tsx`, `src/pages/Register.test.tsx` | tokenStore (auth stays) |
| `src/pages/VerifyEmail.test.tsx`, `src/pages/ForgotPassword.test.tsx`, `src/pages/ResetPassword.test.tsx` | api, tokenStore |

**Unchanged** (no imports of moved modules — do not touch):
`src/context/ProtectedRoute.test.tsx`, `src/pages/Profile.test.tsx`,
`src/store/authSlice.thunks.test.ts`, `src/store/authSlice.test.ts`,
`src/store/store.test.tsx`, `src/store/{store,hooks,authSlice,
authSlice.selectors}.ts`, `src/components/{Layout,ProtectedRoute,
PublicRoute}.tsx`, `src/App.tsx`, `src/main.tsx`, `src/test/*`,
`src/hooks/useResendVerification.ts` (imports `../store/api`, not a moved
module).

### Config change (1)

- `apps/web/.eslintrc.cjs` — shared zone: add `except: ['auth/model/types.ts']`,
  update the zone message to name the type-only exception (AC5).

## Sizing

- **Outcome:** `shared/ui` and `shared/api` hold all generic UI and the whole
  HTTP/session transport; `src/services/` retains only `auth.ts` and
  `src/components/` only G's files, with identical behavior (193-test net
  green unedited).
- **Time estimate:** 60–90 min: 8 file moves (`git mv`), 1 ESLint zone line,
  2 comment fixes, ~35 import-line repoints across 24 files, 1 skeleton
  deletion, then three verification commands. Uncertainty is low: every edit
  is a move or an import/comment line; the interceptor code is copied, not
  re-authored. One window.
- **Files:** production — the 8 moves above (new paths
  `src/shared/ui/{Button,Input}.tsx`, `src/shared/api/{httpClient,tokenStore,
  recovery}.ts`), the 14 production repoints, `apps/web/.eslintrc.cjs`;
  tests — the 3 moved test files + the 10 test repoints. Nothing is created
  or deleted except the 8 moves, the `src/features/shared/` skeleton and the
  old `src/services/{api,api.test,recovery,recovery.test,tokenStore}.*` /
  `src/components/{Button,Button.test,Input}.*` source paths.
- **Split assessment (per story-sizing):** the large file count is moves, not
  new logic. The transport files are one inseparable unit (they import each
  other and share one zone exception; moving them apart would break the
  same-directory imports or the RD4 placement), and the UI move is a trivial
  3-file move with no zone interaction. Splitting UI from transport would add
  a queue row and a verification cycle without reducing risk, and D/E/G all
  depend on the complete `shared` layer — kept as one 60–90 min cohesive
  slice, matching the parent plan's quality gate.
- **Start context:** this ticket; [breakdown README](./README.md) *Target
  structure* + *Import-direction contract* + RD2/RD4/RD5/RD6;
  `apps/web/src/services/{api,recovery,tokenStore}.ts` (full),
  `src/components/{Button,Input}.tsx`, `apps/web/.eslintrc.cjs` (zones block).
- **Verification:** `pnpm --filter @studypilot/web test` → 19 files / 193
  tests; `typecheck` → exit 0; `lint` → exit 0;
  `grep -rn "services/api\|services/recovery\|services/tokenStore\|components/Button\|components/Input" apps/web/src`
  → zero matches; `ls apps/web/src/services` → `auth.ts` only;
  `ls apps/web/src/components` → Layout, Header, EmailVerificationBanner,
  ProtectedRoute, PublicRoute (+ banner test) only; `ls apps/web/src/features`
  → no `shared/` entry.
- **Dependencies / exclusions:** A (alias, zones) and B (types) — both
  implemented 2026-10-17, met. Excludes the `authService` split (D/E),
  features (E/F), widgets (G), pages/app shell (H), boundary proof + docs +
  final verification (I). Every excluded source requirement has an owner per
  the breakdown README map.

## Definition of Done

DoD 1 and 8 apply (AC7; relocated suites green from their new paths). DoD 4
(actionable errors) is explicitly preserved — the interceptor, `RecoveryError`
sanitization and every message string move unchanged, and their suites pass
unedited, which is the evidence. DoD 3 N/A (no backend data access or
ownership change; the transport is behavior-identical — RD4). DoD 2/5/6/7 N/A
— no validation, state, keyboard or responsive change (Button/Input markup is
byte-identical). DoD 9: no API/migration change (frontend move only); EP05 and
the epics README were already repointed by the planner (PC-001), the root
`README.md` line is I's (RD12), and the RD13 config change is documented here
and in the README register (planner). DoD 10 belongs to the combined SP-109
review. Evidence goes to `./artifacts/SP-109C/` (implementer-owned).

## Tracker reference

STUDY-47 (synced 2026-10-17, per the jira-sync ledger; status `To Do`). This
refinement rewrites the story file after the ledger baseline, so the
`localFileSha256` observation will drift — jira-sync reconciliation is
pending. The remote description is a curated summary + pointer and the title
is unchanged, so no tracker mutation is expected; jira-sync re-verifies.

## Out of scope

- Splitting `authService` and moving the auth context — [SP-109E](./SP-109E-feature-auth.md).
- `entities/user` service extraction — [SP-109D](./SP-109D-entity-user.md).
- `Layout`/`Header`/banner/guards — [SP-109G](./SP-109G-widgets.md).
- RTK slice/thunk/selector/`sessionApi`/store moves — [SP-109F](./SP-109F-feature-session-store.md).
- Pages and app shell — [SP-109H](./SP-109H-pages-and-app-shell.md).
- Boundary red/green proof, legacy-folder proof, root README repoint, parent
  index — [SP-109I](./SP-109I-boundaries-docs-verification.md).
- Adding `Input.test.tsx` (pre-existing coverage gap; belongs to a future
  UI/a11y story, not this pure move).
- Any interceptor, recovery or token-store logic change (RD4/RD5 freeze).
