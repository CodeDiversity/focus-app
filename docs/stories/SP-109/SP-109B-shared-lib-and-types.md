# SP-109B: Shared layer foundations — `shared/lib` and per-layer type homes

**Story ID:** SP-109B
**Epic:** Cross-cutting technical task (standalone; see [SP-109](./SP-109.md))
**Milestone:** M1
**Layer / owner:** Frontend, `implementer` (single writer)
**Status:** Queued (SP-109A must land first — the moves use the `@/` alias)
**Dependencies:** SP-109A
**Jira key:** Pending creation

## Summary and bounded scope

Move the three helper modules into `shared/lib`, and replace the single
`src/types/index.ts` barrel with one type home per layer, so no shared module
has to import from a feature or entity. `src/utils/` and `src/types/` stop
existing; the two folders they occupied are gone at the end of this child.

Excluded: `shared/ui` and `shared/api` (C), the `entities/user` API
extraction (D), and every feature/widget/page move (E–H). No type is renamed,
reshaped or re-optionalized — this is a relocation.

## Source requirement references

RQ-109-01, RQ-109-04 (helpers/types move out of flat top-level folders),
RQ-109-06 (zero behavior change); RD9 (academic types, provisional) in the
[breakdown README](./README.md); shared
[DoD](../../epics/README.md#definition-of-done) items 1, 8, 9.

## Acceptance criteria

1. `src/utils/errors.ts` → `src/shared/lib/errors.ts`, `src/utils/linkToken.ts`
   → `src/shared/lib/linkToken.ts`, `src/utils/datetime.ts` +
   `src/utils/datetime.test.ts` → `src/shared/lib/` (same filenames, same
   exports). `src/utils/` no longer exists.
2. `src/types/index.ts` is deleted and its types are distributed with identical
   definitions:
   - `src/shared/api/types.ts` — `ApiError`, `ApiResponse<T>`
   - `src/entities/user/model/types.ts` — `SessionUser`, `User`,
     `RegisteredUser`
   - `src/features/auth/model/types.ts` — `AuthResponse`, `LoginCredentials`,
     `RegisterCredentials`, `VerificationResponse`, `ResetPasswordRequest`
   - `src/shared/types/academic.ts` — `Semester`, `Course`, `Assignment`,
     `AssignmentStatus`, `AssignmentPriority`, `Task`, `TaskStatus`,
     `TaskPriority`, `StudySession` (RD9; follow-up owner: EP02 breakdown)
3. `ResetPasswordResult` stays with the recovery module that declares it
   (`src/services/recovery.ts`, moved by C) — it is **not** duplicated into a
   type home in this child.
4. Every importer of the moved modules/types is rewritten to an aliased import
   (`@/shared/lib/errors`, `@/shared/api/types`, `@/entities/user/model/types`,
   `@/features/auth/model/types`, `@/shared/types/academic`) — no importer is
   left pointing at `../types`, `../utils/*` or `@/shared/types/academic`'s
   future consumers. Consumers in this child: `services/api.ts`,
   `services/auth.ts`, `store/authSlice.ts`, `store/authSlice.thunks.ts`,
   `store/authSlice.selectors.ts`, `store/api.ts`, `context/AuthContext.tsx`,
   `hooks/useResendVerification.ts`, `pages/{Login,Register,Profile,ForgotPassword,ResetPassword,VerifyEmail}.tsx`,
   `components/{ProtectedRoute,PublicRoute,EmailVerificationBanner,Header}.tsx`
   and every `*.test.*` file that imports a moved type or helper (verified:
   15 files import `../types`, 6 import `../utils/errors`, 2 import
   `../utils/linkToken`, 1 test imports `../utils/datetime`).
   No import specifier changes behavior — only its path.
5. `pnpm --filter @studypilot/web test` → 19 files / 193 tests green; `typecheck`
   → exit 0; `lint` → exit 0.

## Tests (future obligations)

| Area | File | Named cases |
|---|---|---|
| Shared helpers | `src/shared/lib/datetime.test.ts` (moved, unchanged) | all 7 existing cases pass from the new path; no case edited |
| Regression on type-homed modules | existing `src/services/api.test.ts`, `src/services/recovery.test.ts`, `src/context/AuthContext.test.tsx`, all `src/pages/*.test.tsx` | unchanged and green — they exercise the relocated `errors.ts`/`linkToken.ts` and the re-homed types through the real imports |

New test cases are **not** required in this child: the relocated code is
unchanged and already covered. Adding a case here would be a behavior change
outside RQ-109-06.

## Technical notes

### Inspected code (2026-10-17, planner)

- `src/utils/errors.ts:1` — the only cross-folder import it makes is
  `import { ApiError } from '../types'`; after this child it is
  `@/shared/api/types`, which keeps `shared` free of upward imports.
- `src/utils/datetime.ts` (32 lines) — pure helpers, no imports.
- `src/utils/linkToken.ts` (13 lines) — pure, no imports.
- `src/types/index.ts` (137 lines) — five commented groups: Auth, API Response,
  Semester, Course, Assignment, Task, Study Session. `SessionUser` carries the
  documented `timeZone?` / `preferences?` optionality from SP-106A/B — it must
  be copied verbatim, comments included.
- Zero consumers of the academic group (grep-verified) — RD9.
- Import consumers verified by grep: `../types` appears in 15 files,
  `../utils/errors` in 6, `../utils/linkToken` in 2, `../utils/datetime` in 1
  (the moved test).

### Proposed (not verified)

- A temporary `src/types/index.ts` re-export barrel is **not** created; that
  would defeat the layer split (a shared barrel re-exporting features).
- Splitting `services/auth.ts` methods per feature is D/E, not B.

## Sizing

- **Outcome:** `shared/lib` + four type homes exist, and `src/utils/` and
  `src/types/` no longer exist, with no runtime change.
- **Time estimate:** 60–90 min: 4 module moves, 5 new type files, ~24 import
  rewrites (mechanical, grep-counted), then three verification commands. Medium
  uncertainty is only in the *count* of importers — each edit is one line.
- **Files:** production — `src/shared/lib/{errors,linkToken,datetime}.ts`,
  `src/shared/api/types.ts`, `src/shared/types/academic.ts`,
  `src/entities/user/model/types.ts`, `src/features/auth/model/types.ts` (all
  new paths); ~20 existing importers (rewritten import lines only);
  `src/utils/*` and `src/types/index.ts` deleted. Tests — `src/shared/lib/datetime.test.ts`
  (moved); existing suites otherwise unchanged.
- **Start context:** this ticket; [breakdown README](./README.md) *Target
  structure* and RD9; `apps/web/src/types/index.ts`, `src/utils/*`,
  `src/services/api.ts`, `src/store/authSlice.ts` (as the representative
  importer).
- **Verification:** `pnpm --filter @studypilot/web test` → 19 files / 193 tests;
  `typecheck` → exit 0; `lint` → exit 0; `grep -rn "utils/\|types/index" apps/web/src`
  → no matches.
- **Dependencies / exclusions:** SP-109A (the `@/` alias). Excludes `shared/ui`
  and `shared/api` (C), `entities/user` service extraction (D), features
  (E/F), widgets (G), pages/app (H), and the final verification (I).

## Definition of Done

DoD 1 and 8 apply (criteria pass; the moved helper suite plus the untouched
regression suites). DoD 4 (actionable errors) is preserved verbatim: `errors.ts`
and `ApiError` move unchanged, proven by the passing suites. DoD 2/3/5/6/7 N/A —
no form, data access, UI or error-message edits (reasons in the README DoD map).
DoD 9 covered by this ticket and the breakdown; DoD 10 belongs to the combined
SP-109 review. Evidence goes to `./artifacts/SP-109B/`.

## Tracker reference

`Pending creation` (RD11 — no Jira sync authorized).

## Out of scope

- `shared/ui` + `shared/api` moves — [SP-109C](./SP-109C-shared-ui-and-transport.md).
- `entities/user` API extraction — [SP-109D](./SP-109D-entity-user.md).
- Relocating the academic types to real entities (RD9 follow-up → EP02 breakdown).
