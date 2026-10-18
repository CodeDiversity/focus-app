# SP-109 Breakdown — Frontend feature-sliced (FSD) folder structure

**Story type:** Cross-cutting technical task (no single epic owner). Per
[docs/epics/README.md](../../epics/README.md#release-milestones), cross-cutting
technical tasks are tracked as technical stories linked to the appropriate
milestone — this one is **M1** (it reorganizes the M1 web app and defines the
structure EP02–EP08 will build in).
**Jira:** STUDY-44 (parent); children A–I are **STUDY-45–STUDY-53** — verified 2026-10-17.
**Status:** Planned 2026-10-17 (planner); all children (A–I) implemented 2026-10-17;
combined parent review 2026-10-17: **PASS** — meets the shared DoD and acceptance
criteria (19 files / 193 tests, typecheck, lint and build all green — reviewer-executed);
IR-005 and IR-009 closed by the review's docs sync; IR-001…IR-004 and IR-006…IR-008
remain optional polish. Report: `./artifacts/SP-109/review.md`.
**Origin:** User request 2026-10-17 — “implement front end code structure into
feature folders, all the components, slices, etc. should be in feature folders”,
answered in-session with **Feature-Sliced Design (FSD) layers** as the convention.

## Execution queue

**Delivery home:** `docs/stories/SP-109/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-109/` (parent checkpoint / final index)

**Active substory:** None — all children (A–I) are implemented and the combined parent
review passed 2026-10-17 (report `./artifacts/SP-109/review.md`).

**Next substory:** None — the parent scope A–I is implemented and reviewed (2026-10-17,
verdict PASS, report `./artifacts/SP-109/review.md`). No implementer work is authorized
or outstanding; the open items IR-001…IR-004 and IR-006…IR-008 are optional polish that
remain individually user-approved.

**Implementation owner:** `implementer`, sequential. All children are
frontend-scope moves/config work; single writer, one commit per child.

**Final review:** one combined SP-109 review after every child is implemented,
at `./artifacts/SP-109/review.md`; integration/index owner: SP-109I (parent index
`./artifacts/SP-109/implementation.md`). No per-child review gates. **Performed
2026-10-17 — verdict PASS:** all nine children verified against the code; the web
suite (19 files / 193 tests, exit 0), typecheck (exit 0), lint (exit 0) and build
(exit 0, 1557 modules) are reviewer-executed evidence; no backend file changed.
Findings IR-001…IR-009 (all polish): IR-005/IR-009 closed by the review's docs sync;
IR-001…IR-004, IR-006…IR-008 open polish. Dev-server smoke CANNOT VERIFY (SP-108
precedent). Report: `./artifacts/SP-109/review.md`.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](../../jira-sync/tombstones.md#story-sp-109a) | Reviewed (2026-10-17) | None | — | `./artifacts/SP-109A/` |
| [B](../../jira-sync/tombstones.md#story-sp-109b) | Reviewed (2026-10-17) | A | — | `./artifacts/SP-109B/` |
| [C](../../jira-sync/tombstones.md#story-sp-109c) | Reviewed (2026-10-17) | B | — | `./artifacts/SP-109C/` |
| [D](../../jira-sync/tombstones.md#story-sp-109d) | Reviewed (2026-10-17) | B, C | — | `./artifacts/SP-109D/` |
| [E](../../jira-sync/tombstones.md#story-sp-109e) | Reviewed (2026-10-17) | C, D | — | `./artifacts/SP-109E/` |
| [F](../../jira-sync/tombstones.md#story-sp-109f) | Reviewed (2026-10-17) | E | — | `./artifacts/SP-109F/` |
| [G](../../jira-sync/tombstones.md#story-sp-109g) | Reviewed (2026-10-17) | C, E, F | — | `./artifacts/SP-109G/` |
| [H](../../jira-sync/tombstones.md#story-sp-109h) | Reviewed (2026-10-17) | G | — | `./artifacts/SP-109H/` |
| [I](../../jira-sync/tombstones.md#story-sp-109i) | Reviewed (2026-10-17) | B–H | — | `./artifacts/SP-109I/` · report `./artifacts/SP-109/review.md` |

All children (A–I) are implemented (2026-10-17) and the combined parent review
passed (verdict PASS, 2026-10-17 — report `./artifacts/SP-109/review.md`); the
queue above is the canonical record.

## Child inventory

| ID | Layer / owner | Outcome | Dependency | Target size | Jira |
|---|---|---|---|---|---|
| [A](../../jira-sync/tombstones.md#story-sp-109a) | Implemented — awaiting parent review (2026-10-17) | Frontend config, `implementer` | `@/` alias in tsconfig + Vite, layer folder skeleton, ESLint layer-direction rules | None | One 45–60 min session | STUDY-45 |
| [B](../../jira-sync/tombstones.md#story-sp-109b) | Implemented — awaiting parent review (2026-10-17) | Frontend, `implementer` | `shared/lib` + `shared/api/types` + per-layer type homes replace `src/utils` and `src/types` | A | One 60–90 min session | STUDY-46 |
| [C](../../jira-sync/tombstones.md#story-sp-109c) | Frontend, `implementer` | `shared/ui` (Button/Input) and `shared/api` (httpClient, tokenStore, recovery) | B | One 60–90 min session | STUDY-47 |
| [D](../../jira-sync/tombstones.md#story-sp-109d) | Frontend, `implementer` | `entities/user` — user types + `getProfile`/`updateProfile` extracted from `authService` | B, C | One 60–90 min session | STUDY-48 |
| [E](../../jira-sync/tombstones.md#story-sp-109e) | Frontend, `implementer` | `features/auth` — auth API service, auth types, `AuthProvider`/`useAuth` context | C, D | One 60–90 min session | STUDY-49 |
| [F](../../jira-sync/tombstones.md#story-sp-109f) | Frontend, `implementer` | `features/session` (slice, thunks, selectors, RTK Query API), `features/email-verification` hook, `app/store` | E | One 60–90 min session | STUDY-50 |
| [G](../../jira-sync/tombstones.md#story-sp-109g) | Frontend, `implementer` | `widgets/` — layout, header, verification banner, route guards | C, E, F | One 45–60 min session | STUDY-51 |
| [H](../../jira-sync/tombstones.md#story-sp-109h) | Frontend, `implementer` | `pages/<route>/ui/*` + `app/App.tsx` router + `app/providers/AppProviders.tsx` + `main.tsx` | G | One 60–90 min session | STUDY-52 |
| [I](../../jira-sync/tombstones.md#story-sp-109i) | Frontend/verification + docs, `implementer` | Proved boundary enforcement, legacy folders gone, repo docs repointed, full green verification | B–H | One 60–90 min session | STUDY-53 |

Sequence A → B → C → D → E → F → G → H → I, one sequential writer. D and G/H
have partial independence from E, but they are ordered so only one child touches
a given file at a time (`authService.ts` in D+E, `App.tsx`/`main.tsx` in H only,
test-store wiring in F).

## Target structure (verified current → planned)

Every row below was verified in the working tree on 2026-10-17
(`apps/web/src`, 55 files, 7 303 lines; baseline `pnpm --filter @studypilot/web
test` = **19 files / 193 tests green**, `typecheck` exit 0, `lint` exit 0).

```text
apps/web/src/
  main.tsx                                  (entry; unchanged location)
  app/
    App.tsx                       ← src/App.tsx
    providers/AppProviders.tsx    (new: BrowserRouter → Redux Provider → AuthProvider)
    store/store.ts                ← src/store/store.ts
    store/hooks.ts                ← src/store/hooks.ts
    store/store.test.tsx          ← src/store/store.test.tsx
  pages/
    home/ui/HomePage.tsx          ← src/pages/Home.tsx
    login/ui/LoginPage.tsx (+test)      ← src/pages/Login.tsx (+test)
    register/ui/RegisterPage.tsx (+test)
    dashboard/ui/DashboardPage.tsx
    profile/ui/ProfilePage.tsx (+test)
    verify-email/ui/VerifyEmailPage.tsx (+test)
    forgot-password/ui/ForgotPasswordPage.tsx (+test)
    reset-password/ui/ResetPasswordPage.tsx (+test)
  widgets/
    layout/ui/Layout.tsx          ← src/components/Layout.tsx
    header/ui/Header.tsx          ← src/components/Header.tsx
    email-verification-banner/ui/EmailVerificationBanner.tsx (+test)
    protected-route/ui/ProtectedRoute.tsx
    public-route/ui/PublicRoute.tsx
    protected-route/ui/ProtectedRoute.test.tsx  ← src/context/ProtectedRoute.test.tsx
  entities/
    user/model/types.ts           (SessionUser, User, RegisteredUser — from src/types/index.ts)
    user/api/userService.ts       (getProfile, updateProfile — extracted from src/services/auth.ts)
  features/
    auth/api/authService.ts       ← src/services/auth.ts (auth/recovery endpoints only)
    auth/model/types.ts           (AuthResponse, LoginCredentials, RegisterCredentials,
                                   VerificationResponse, ResetPasswordRequest)
    auth/model/AuthContext.tsx    ← src/context/AuthContext.tsx (+ AuthContext.test.tsx,
                                   + AuthContext.registerLogout.test.tsx)
    session/model/authSlice.ts    ← src/store/authSlice.ts (+ .selectors.ts, + tests)
    session/model/authSlice.thunks.ts (+ authSlice.thunks.test.ts)
    session/api/sessionApi.ts     ← src/store/api.ts (+ api.test.ts)
    email-verification/model/useResendVerification.ts (+test)
  shared/
    ui/Button.tsx (+test), ui/Input.tsx        ← src/components/*
    api/httpClient.ts (+test)                  ← src/services/api.ts (+ api.test.ts)
    api/tokenStore.ts                          ← src/services/tokenStore.ts
    api/recovery.ts (+test)                    ← src/services/recovery.ts (+ recovery.test.ts)
    api/types.ts                               (ApiError, ApiResponse<T>)
    lib/errors.ts, lib/linkToken.ts, lib/datetime.ts (+test)   ← src/utils/*
    types/academic.ts                          (Semester, Course, Assignment, Task,
                                                StudySession — provisional home, RD9)
  test/                                        (setup.ts, providers.tsx, user.ts — RD8)
```

Folders removed at the end of the parent scope: `src/components/`, `src/pages/`,
`src/context/`, `src/hooks/`, `src/services/`, `src/store/`, `src/types/`,
`src/utils/`. SP-109I owns that proof.

### Import-direction contract (all children must obey)

`shared` → nothing; `entities` → `shared`; `features` → `shared`, `entities`,
other `features`; `widgets` → `features`, `shared`; `pages` → `widgets`,
`features`, `shared`; `app` → everything below it; `test/` is exempt (it
composes the store and router for suites).

Three documented exceptions: (1) RD7 — `features/session/**` may import
`@/app/store/store` and `@/app/store/hooks` (typed `RootState`/`AppDispatch`
only), and `features/auth/model/AuthContext.tsx` may import
`@/app/store/hooks` (`useAppDispatch`); (2) RD13 — `shared/api/*` may
type-import `@/features/auth/model/types` (only `AuthResponse`; erased at
compile time, no runtime shared→features dependency). No other upward import
from `app` or `shared`.

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| RD1 | The frontend adopts **Feature-Sliced Design** layers `app / pages / widgets / features / entities / shared`, with feature folders owning their own components, hooks, slices and API modules. | User, 2026-10-17 (in-session answer to the planner's convention question). |
| RD2 | **Imports become alias-based** (`@/shared/ui/Button`), because ESLint layer rules can only match aliased specifiers; today every import in `apps/web/src` is relative (verified by grep, 100% `../` or `./`). | Planner 2026-10-17, grounded in the import grep; required for RD6. |
| RD3 | **Single alias `@/` → `apps/web/src`**. The eight unused aliases (`@components`, `@pages`, `@hooks`, `@services`, `@types`, `@utils`, `@context`) are **deleted** — verified zero usages repo-wide. `@types/*` in particular shadowed real package specifiers. | Planner 2026-10-17, verified by grep (no matches). |
| RD4 | `services/api.ts` becomes **`shared/api/httpClient.ts`**, and `services/recovery.ts` becomes **`shared/api/recovery.ts`**, keeping export names (`api` default export, `refreshAccessToken`, `setSessionExpiredHandler`, `RecoveryError`, `runRecoveryReset`, …) and the SP-105G interceptor semantics byte-for-byte in behavior. `recovery.ts` stays in `shared` because the transport itself must consume the recovery barrier/generation module — putting it under `features/` would force `shared → features`. | Planner 2026-10-17, grounded in `services/api.ts:8-14` (imports the barrier) and SP-105G R4. |
| RD5 | `tokenStore` lives in **`shared/api/tokenStore.ts`** (memory-only access token; the httpOnly refresh cookie is never touched by JS) for the same reason as RD4. Export name `tokenStore` unchanged. | Planner 2026-10-17, grounded in `services/api.ts:7`, `services/auth.ts:2`, `AuthContext.tsx:13`. |
| RD6 | Layer direction is enforced by **ESLint** in `apps/web/.eslintrc.cjs`, not by convention alone. Mechanism is **Provisional**: the implementer must demonstrate a red/green proof (a deliberately violating import in a page/widget/shared file is reported, then reverted). Preferred forms, in order: `no-restricted-imports` groups on `@/...` specifiers; if per-layer direction cannot be expressed that way on ESLint 8.56, install `eslint-plugin-import` (devDependency) and use `import/no-restricted-paths` zones. The form actually used is recorded in `artifacts/SP-109A/implementation.md`. | Planner 2026-10-17; ESLint rule capability not executable by the planner (docs-only role) → verification task in A and I. |
| RD7 | The only sanctioned `features → app` imports are `@/app/store/store` and `@/app/store/hooks` for RTK `RootState`/`AppDispatch` types, in exactly three files (`authSlice.selectors.ts`, `authSlice.thunks.ts`, `AuthContext.tsx`). This is the standard FSD store escape hatch, kept narrow and named. | Planner 2026-10-17, grounded in current imports (`authSlice.selectors.ts:2`, `authSlice.thunks.ts:7`, `AuthContext.tsx:22`). |
| RD8 | `src/test/` (`setup.ts`, `providers.tsx`, `user.ts`) stays where it is and is **exempt** from layer ordering: `providers.tsx` deliberately composes the store, RTK Query API and `MemoryRouter`. `vite.config.ts`'s `setupFiles` path therefore does not change. | Planner 2026-10-17, grounded in `test/providers.tsx:5-6` and `vite.config.ts` `test.setupFiles`. |
| RD9 | **Provisional:** the unused academic types (`Semester`, `Course`, `Assignment`, `Task`, `StudySession`) move to `shared/types/academic.ts` rather than creating five empty `entities/*` folders. Follow-up owner: the **EP02 breakdown** (semester/course) must relocate them to `entities/<entity>/model/types.ts` when those entities are first built. | Planner 2026-10-17, grounded in `types/index.ts:65-137` (declared, zero consumers — verified by grep). |
| RD10 | **Settled 2026-10-17:** the single RTK Query API (`src/store/api.ts`: resend-verification mutation + axios `baseQuery`) moves as one unit to `features/session/api/sessionApi.ts` and is **not** split per feature in this parent. Rationale: it is one endpoint over one transport today (`store/api.ts:66-79`); splitting it inside a pure-move refactor adds churn and risk without a consumer to justify it. **Consequence for EP02+:** the first story that adds a non-session endpoint must introduce a per-feature RTK Query API (`features/<feature>/api/…`) and register its reducer/middleware in `app/store/store.ts` — that story becomes the convention's owner and may retire `sessionApi` by absorbing its endpoint. | Planner recommendation, **delegated and adopted by the user 2026-10-17** ("your decision"), grounded in `store/api.ts:66-79`. |
| RD11 | Story home is a standalone folder `docs/stories/SP-109/`, milestone **M1**; Jira key `Pending creation` at planning time; **no Jira sync authorized or performed** then. *(Superseded 2026-10-17: keys `STUDY-44`–`STUDY-53` created and verified by the authorized bootstrap sync.)* | Planner 2026-10-17, per the epics README technical-tasks note (SP-108 precedent). |
| RD12 | The root `README.md` "State Management" line references `apps/web/src/services/api.ts` and must be repointed to `shared/api/httpClient.ts`. The planner writes only `docs/`, so **SP-109I owns the root README edit**; docs/ files (`docs/epics/README.md`, `docs/epics/EP05-student-dashboard.md`) are repointed by the planner now (PC-001). | Planner 2026-10-17; SP-108 RD6 write-scope precedent. |
| RD13 | The `src/shared` zone in `apps/web/.eslintrc.cjs` gains `except: ['auth/model/types.ts']` (type-only exception). The transport's type-only `AuthResponse` import from `features/auth/model/types` is the sole sanctioned `shared → features` import (erased at compile time; no runtime dependency). Verified 2026-10-17: without the except the moved files fail lint (both aliased and relative forms flagged); with it, exactly that file is exempt, other features imports still trip the rule, and full lint stays clean. | User-approved 2026-10-17 (refiner), grounded in empirical ESLint 8.57.1 + eslint-plugin-import 2.32.0 probe (temp copy of `apps/web`). |

## Source requirements and test traceability

SP-109 is a user-initiated technical task with no parent-epic `AC-*`/`TR-*`.
Stable story-local requirements:

| Req | Requirement (original request / decision wording) | Owning children |
|---|---|---|
| RQ-109-01 | "Front end code structure into feature folders" — a feature-sliced folder layout exists (RD1) | A (folders/config), B–H (contents), I (proof) |
| RQ-109-02 | "All the components … should be in feature folders" — no component stays in a flat `src/components/` folder | C (`shared/ui`), G (`widgets/*/ui`), H (`pages/*/ui`) |
| RQ-109-03 | "…slices, etc …" — every Redux slice/thunk/selector, RTK Query API and typed store hook lives in a feature or `app/store` folder | F |
| RQ-109-04 | Hooks, contexts, services and utils move out of flat top-level folders into their owning layer | B, C, D, E, F |
| RQ-109-05 | Layer direction is machine-enforced, not documentation-only (RD6) | A (rules), I (red/green proof) |
| RQ-109-06 | **Zero behavior change**: every existing test keeps passing; typecheck and lint stay green | A–I each re-run the suite; baseline 19 files / 193 tests |
| RQ-109-07 | The eight stale path aliases are removed (RD3) | A |
| RQ-109-08 | Repository docs point at the new paths (RD12) | I (root README), planner (`docs/` now) |

| Test requirement | Owning tests |
|---|---|
| TR-109-01 — relocated modules keep their existing behavior | B (`datetime.test.ts`, existing cases unchanged), C (`httpClient.test.ts`, `recovery.test.ts`, `Button.test.tsx` move intact), E (`AuthContext` suites), F (`authSlice*`, `sessionApi` suites) |
| TR-109-02 — extracted `userService` behaves like the removed `authService` methods | D: existing `Profile.test.tsx` + `AuthContext.test.tsx` cases run against the extracted service unchanged |
| TR-109-03 — app boots and routes resolve after the move | H: existing `ResetPassword`/`ForgotPassword`/`VerifyEmail` suites (they render the real `App`) plus `ProtectedRoute.test.tsx` |
| TR-109-04 — layer boundaries are enforced by the linter | A (config), I (red/green proof recorded in the implementation record; not a permanent test) |
| TR-109-05 — no legacy folders or stale aliases remain | I: `ls`/`grep` proof + full suite |

| Shared DoD | Owner / applicability |
|---|---|
| 1 functional criteria | A–H (structure only, behavior preserved); I verifies integrated behavior |
| 2 invalid input validation | N/A — no form, DTO or validation code changes (recorded reason) |
| 3 academic data scoped to the authenticated student | N/A — no backend query, ownership helper or data-access change; the frontend transport is unchanged in behavior (RD4) |
| 4 actionable errors | Preserved verbatim — `shared/api/httpClient.ts` interceptor, `shared/lib/errors.ts` and every error message move unchanged (E/F regression suite) |
| 5 loading/empty/error states | N/A — no UI is added, removed or altered; existing state behavior is regression-tested (TR-109-03) |
| 6 keyboard / 7 responsive | N/A — no markup or class changes (recorded reason) |
| 8 automated business-rule tests | B, C, D, E, F (relocated/extracted suites), I (full suite + boundary proof) |
| 9 API/docs changes documented | I (root README + final structure note), planner (`docs/epics/README.md`, EP05), this breakdown |
| 10 integrated development review | Required; owned by the combined SP-109 final review, not by a child |

## Plan correction log

Planner findings (PC-*) were raised while producing this breakdown; review
findings (IR-*) carry the stable IDs from `artifacts/SP-109/review.md`
(combined parent review, pass 1, 2026-10-17, verdict PASS). Original findings
are preserved verbatim in the report and are never rewritten here. Per the
review cadence, **only the reviewer closes review findings**: IR-005 and
IR-009 are closed by that review's passing docs sync; the remaining polish
items are explicitly left open for the planner/implementer.

### PC-001 — Forward-looking docs point at folders this story deletes

- **Discovery:** 2026-10-17, planner inspection.
- **Original finding (preserved):** `docs/epics/EP05-student-dashboard.md:49`
  instructs future work to compose domain endpoints on
  `apps/web/src/services/api.ts`, and the epics README's frontend line gives no
  folder convention. After SP-109 both paths are wrong, and EP02–EP08 would be
  planned against a dead path.
- **Consequence:** four downstream epics inherit a stale structure convention.
- **Correction:** `docs/epics/README.md` gained a **Frontend architecture**
  section (FSD layers + link to this breakdown); the EP05 line now names
  `apps/web/src/shared/api/httpClient.ts`. The root `README.md` line is
  implementer-owned and is repointed by SP-109I (RD12).
- **Verification:** grep for `apps/web/src/(services|components|pages|context|hooks|store|types|utils)` across `docs/epics/**` after the edit — only `docs/artifacts/**` (historical evidence,
  preserved verbatim) may still match.
- **Status:** `Fixed in plan`.

### PC-002 — Eight declared path aliases resolve to nothing that exists and one shadows a real specifier

- **Discovery:** 2026-10-17, planner inspection of `apps/web/tsconfig.json` and
  `apps/web/vite.config.ts`.
- **Original finding (preserved):** `@components/*`, `@pages/*`, `@hooks/*`,
  `@services/*`, `@types/*`, `@utils/*`, `@context/*` are declared in both
  configs while **zero** source files import through them (grep-verified), and
  the `@types/*` alias shadows the `@types/*` npm scope used by devDependencies.
- **Consequence:** the alias block advertises a structure the code does not use
  and can silently win module resolution against `@types/*` packages.
- **Correction:** RD3 — A replaces the block with the single `@/` alias.
- **Verification:** grep for the removed alias prefixes returns no matches after
  A; `typecheck` + `lint` + full suite green in A.
- **Status:** `Fixed in plan`.

### IR-001 — SP-109D AC2 deviation: `refreshToken` comment block dropped

- **Discovery:** 2026-10-17, combined parent review
  (`artifacts/SP-109/review.md` §IR-001).
- **Original finding (preserved verbatim in the report):** D's commit
  `2276b27` removed the 4-line comment block above `refreshToken` in
  `services/auth.ts` (the refresh-delegation doc) while extracting
  `getProfile`/`updateProfile`; AC2 (`SP-109D-entity-user.md:42-45`) requires
  the remaining methods to "keep their **bodies, order and comments**".
  Current state: `features/auth/api/authService.ts:83-85` is a bare
  `refreshToken() { return refreshAccessToken(); }` with no comment.
- **Consequence:** the call-site documentation of the refresh delegation is
  lost; **no behavior change** — bodies and order verified preserved; the
  single-flight semantics remain documented in `shared/api/httpClient.ts:63-68`.
- **Correction:** restore the 4-line comment above `refreshToken` in
  `features/auth/api/authService.ts` (wording "the api module" → "the shared
  httpClient").
- **Owner:** implementer (code file — outside the reviewer's passing-sync
  write scope).
- **Status:** `Open` (polish).

### IR-002 — SP-109E has no implementation record at all

- **Discovery:** 2026-10-17, combined parent review (§IR-002).
- **Original finding (preserved):** `artifacts/SP-109E/` is absent entirely —
  no `checkpoint.md`, no `implementation.md` — while the canonical layout
  (`docs/artifacts/README.md:21-23`) requires both per child. E's completion
  is evidenced only by commit `dff638a` (30 files, 54+/56−, pure move + import
  repoints).
- **Consequence:** a DoD auditor reading `artifacts/SP-109E/` finds nothing;
  E's evidence path rests on the commit, the parent index and the review
  report. E changed no API or schema and its code was verified directly by the
  review, so this is an evidence-hygiene gap, not a verification gap.
- **Correction:** a docs slice reconstructing
  `artifacts/SP-109E/implementation.md` strictly from commit `dff638a` + the
  review's verified results (SP-108G precedent: no new evidence), plus a
  `checkpoint.md`.
- **Owner:** implementer.
- **Status:** `Open` (polish).

### IR-003 — SP-109D has no `checkpoint.md`

- **Discovery:** 2026-10-17, combined parent review (§IR-003).
- **Original finding (preserved):** `artifacts/SP-109D/` contains
  `implementation.md` only; the canonical layout requires both files. D's
  record itself is faithful (claims re-verified; the one deviation is IR-001).
- **Consequence:** a resuming agent has no resume record for D; cosmetic for a
  completed, single-window child.
- **Correction:** add a `checkpoint.md` noting D completed in one window
  (status complete, HEAD `2276b27`).
- **Owner:** implementer.
- **Status:** `Open` (polish).

### IR-004 — Eight of nine child tickets carry stale `Status:` lines

- **Discovery:** 2026-10-17, combined parent review (§IR-004).
- **Original finding (preserved):** A `:7` "Ready"; B `:7` "Queued (SP-109A
  must land first…)"; C `:7` "Ready (…queue-row reconciliation pending)";
  D/E/F/G `:7` "Queued (…must land first)"; I `:7` "In progress (2026-10-17;
  checkpoint …)". Only **H** is current. All eight children are implemented
  (commits + records + code verified in the review).
- **Consequence:** anyone opening a ticket gets a stale state; the execution
  queue is the canonical record and is reconciled by this sync, so the tickets
  are secondary bookkeeping.
- **Correction:** one docs pass setting each ticket's `Status:` to its
  verified state (A–H "Implemented — awaiting parent review (2026-10-17;
  commit …)", I likewise with `fe3b7d4`).
- **Owner:** planner/implementer — child tickets are outside the reviewer's
  passing-sync write scope (SP-108 precedent).
- **Status:** `Open` (polish).

### IR-005 — Stale parent-level status lines

- **Discovery:** 2026-10-17, combined parent review (§IR-005).
- **Original finding (preserved):** `README.md:9` — "Planned 2026-10-17
  (planner); SP-109A implemented 2026-10-17; SP-109B implemented 2026-10-17;
  SP-109C implemented 2026-10-17." (stops at C); `README.md:45` — "SP-109A and
  SP-109B are implemented; C–I are `Queued`…" (contradicts the queue table
  above it); `SP-109.md:7` — "Planned 2026-10-17. Nothing implemented."
- **Consequence:** the coordination record understated the completed work.
- **Correction:** this review's passing docs sync rewrote all three to the
  verified state (status line, queue prose, parent ticket status).
- **Verification:** the three lines now read "all children implemented;
  combined review PASS 2026-10-17; report `./artifacts/SP-109/review.md`".
- **Status:** `Closed` — **review 2026-10-17 (verdict PASS)**, by the
  reviewer's passing docs sync.

### IR-006 — Committed checkpoints do not reflect completion (I, G)

- **Discovery:** 2026-10-17, combined parent review (§IR-006).
- **Original finding (preserved):** `artifacts/SP-109I/checkpoint.md`
  (committed in `fe3b7d4`) is a **pre-work resume state** — all five AC boxes
  unchecked, "Saved work: none yet for I", "HEAD at last update: `23fe1b5`
  (SP-109H)" — committed in the same commit as its completion record
  (`artifacts/SP-109I/implementation.md:5` "Status: Implementation complete —
  awaiting parent review"). Second instance:
  `artifacts/SP-109G/checkpoint.md:5` header "In progress (resumed after a
  lost context)" vs `artifacts/SP-109G/implementation.md:5` "Implementation
  complete — awaiting parent review".
- **Consequence:** an agent resuming from I's checkpoint would redo completed
  work; the resume record and the completion record contradict each other.
- **Correction:** update I's checkpoint (boxes checked, saved-work/HEAD
  refreshed to `fe3b7d4`, state complete) and G's header to complete.
- **Owner:** implementer.
- **Status:** `Open` (polish).

### IR-007 — Parent index "Queue reconciliation" asserts a queue state that was never committed

- **Discovery:** 2026-10-17, combined parent review (§IR-007).
- **Original finding (preserved):** `artifacts/SP-109/implementation.md:110-114`
  — "All rows … are marked `Implemented — awaiting parent review` (A) /
  `Implementation complete — awaiting parent review` (I); **Active = None**" —
  while the committed README at `fe3b7d4` read row I "In progress
  (2026-10-17)" and "Active substory: SP-109I — In progress" (see IR-009 for
  the root cause).
- **Consequence:** the index — the artifact a DoD auditor reads — contained a
  false statement about the canonical queue.
- **Correction:** this review's sync reconciles the queue to a state at least
  as current as the index's claim (rows → `Reviewed`, Active/Next → `None`),
  so the drift is healed; the index text itself is implementer-owned and is not
  rewritten by the reviewer — reword it to describe what the queue said at
  `fe3b7d4` and that the final reconciliation is the reviewer's.
- **Owner:** implementer.
- **Status:** `Open` (polish).

### IR-008 — Parent index Git scope is stale and self-inconsistent

- **Discovery:** 2026-10-17, combined parent review (§IR-008).
- **Original finding (preserved):** `artifacts/SP-109/implementation.md:7` —
  "Scope window (Git): `84ef7ea` (baseline before A) → `23fe1b5` (SP-109H,
  **HEAD**)" — while `HEAD` is `fe3b7d4` (I); the "Combined Git change scope"
  table lists A–H with **no row for `fe3b7d4`**; and `84ef7ea` is
  simultaneously "baseline before A" and A's commit row — `git log
  84ef7ea..HEAD` excludes `84ef7ea` itself, so the two labels cannot both be
  right.
- **Consequence:** a reader computing the parent scope from the index excludes
  I's commit and the window's true bounds.
- **Correction:** extend the window to `fe3b7d4`, add an I row (8 files, all
  docs + root README one line), and label the baseline as `84ef7ea`'s parent.
- **Owner:** implementer.
- **Status:** `Open` (polish).

### IR-009 — SP-109I AC5 queue-repoint never committed

- **Discovery:** 2026-10-17, combined parent review (§IR-009).
- **Original finding (preserved):** `SP-109I-boundaries-docs-verification.md:61-66`
  (AC5) requires the execution-queue rows to be "repointed to the per-child
  artifacts and marked `Implemented — awaiting parent review`". I's commit
  `fe3b7d4` flipped the queue to I's **start** state (Active = I, row I
  "In progress") and left it there; the completion repoint was never
  committed, and I's implementation record never mentions it.
- **Consequence:** the canonical queue understated completion; AC5 was
  partially met (index written; repoint absent).
- **Correction:** this review's sync re-points the queue (rows A–I →
  `Reviewed`, Active/Next → `None` with the report link) — a state more
  current than the AC asked for.
- **Verification:** the execution queue above now reads `Reviewed
  (2026-10-17)` for all nine rows, with Active/Next `None` and the report
  link.
- **Status:** `Closed` — **review 2026-10-17 (verdict PASS)**, by the
  reviewer's passing docs sync.

## Quality gate (2026-10-17)

| Gate | Status | Evidence / limitation |
|---|---|---|
| Child separation and sizing | Pass | Nine slices, each 45–90 min, each with a sizing block; aliased-import rewrite, layer content, structural extraction, shell move and enforcement/docs verification are separate outcomes. |
| Requirement/test coverage | Pass | RQ-109-01…08 and TR-109-01…05 mapped above; every requirement has an owning child file. |
| Applicable DoD, incl. item 10 | Pass | DoD map above; items 2/3/5/6/7 marked N/A with reasons; item 10 owned by the combined final review. |
| Contract consistency | Pass | No backend contract touched; interceptor/recovery/auth semantics are frozen by RD4/RD5 and regression-tested by the moved suites. |
| Code paths inspected | Pass | All 55 files of `apps/web/src` inventoried (full-tree `ls`, `wc -l`, import grep); `App.tsx`, `main.tsx`, `services/api.ts` (full), `services/auth.ts` (full), `store/api.ts` (full), `store/authSlice*.ts` (headers), `context/AuthContext.tsx` (header), `hooks/useResendVerification.ts` (header), `types/index.ts` (full), `test/providers.tsx`, `vite.config.ts`, `tsconfig.json`, `.eslintrc.cjs`, `package.json`. Backend `apps/api` was **not** re-inspected: no backend file is in scope (verified: the plan names no API file). |
| Frontend-flow risks | Pass (with limits) | No runtime flow changes: the suite (193 tests, several rendering the real `App` router and guards) is the regression net for every child. Residual: no runtime dev-server smoke is authorized in this environment (same limitation SP-108 recorded), so `build` + dev-server verification is CANNOT VERIFY here. |
| Dependency mapping and sequencing | Pass | A → B → C → D → E → F → G → H → I; one sequential writer; file-disjointness checked (`authService.ts` D+E sequential, `App.tsx`/`main.tsx` only H, test-store wiring only F). |
| Material decisions | Pass | RD1 from an explicit user answer; RD10 settled 2026-10-17 on the user's delegation of the choice to the planner, with the EP02+ follow-up owner named; RD4/RD5/RD7/RD8 planner-grounded in inspected imports; RD6 and RD9 marked **Provisional** with named verification/follow-up owners. |
| Correction-log history | Pass | PC-001 and PC-002 preserve their original findings with correction + verification; both are `Fixed in plan` in `docs/` (EP05 + epics README convention section, and RD3's alias removal owned by A). No correction redefined a product, security or MVP-scope policy. |
| Jira identity/sync | Not applicable | No sync was authorized in that pass; keys are now `STUDY-44`–`STUDY-53` (verified 2026-10-17); no duplicate keys. |

**Outcome:** `Plan Ready` — nine sized children with a frozen import-direction
contract and per-child verification. **Implementation Blocked** for B–I until A
lands (they consume the `@/` alias); A itself is unblocked.

## Final implementation review unit

Parent: [SP-109](../../jira-sync/tombstones.md#story-sp-109) · In-scope children: A–I · Integration/index
owner: SP-109I (`./artifacts/SP-109/implementation.md`) · One combined review
after every child is implemented: `./artifacts/SP-109/review.md`. Child
completion — not review approval — unblocks dependents; no per-child review
gates.

## User-authorized sync and prune exception (2026-10-18)

The user explicitly requested Jira synchronization and local SP-109 removal,
then instructed "override" after being informed of nonterminal Jira issues,
unresolved mandatory review findings and an uncommitted parent specification.
This is acceptance of the disclosed outstanding findings for this removal only
and authorization to transition STUDY-44–STUDY-53 to Done. It does not close
IR-001/002/003/004/006/007/008, revise the preserved review, or establish a new
independent passing review. Preserve complete specification bytes in Git before
pruning, keep this README and all artifacts, and record recovery tombstones.

**Removal completed:** 2026-10-18 — STUDY-44–STUDY-53 verified Done; the
parent and nine child specifications were pruned under the exception above.
Exact specifications remain recoverable from Git via the
[removal tombstones](../../jira-sync/tombstones.md#story-sp-109).
This README, traceability and all existing artifacts remain local.
