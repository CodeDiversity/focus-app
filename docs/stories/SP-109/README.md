# SP-109 Breakdown — Frontend feature-sliced (FSD) folder structure

**Story type:** Cross-cutting technical task (no single epic owner). Per
[docs/epics/README.md](../../epics/README.md#release-milestones), cross-cutting
technical tasks are tracked as technical stories linked to the appropriate
milestone — this one is **M1** (it reorganizes the M1 web app and defines the
structure EP02–EP08 will build in).
**Jira:** STUDY-44 (parent); children A–I are **STUDY-45–STUDY-53** — verified 2026-10-17.
**Status:** Planned 2026-10-17 (planner); SP-109A implemented 2026-10-17; SP-109B implemented 2026-10-17; SP-109C implemented 2026-10-17.
**Origin:** User request 2026-10-17 — “implement front end code structure into
feature folders, all the components, slices, etc. should be in feature folders”,
answered in-session with **Feature-Sliced Design (FSD) layers** as the convention.

## Execution queue

**Delivery home:** `docs/stories/SP-109/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-109/` (parent checkpoint / final index)

**Active substory:** [SP-109I](./SP-109I-boundaries-docs-verification.md) — In progress (2026-10-17); checkpoint `./artifacts/SP-109I/checkpoint.md`.

**Next substory:** SP-109I — resume from its checkpoint (enforcement proof, docs paths, full verification, parent index).

**Implementation owner:** `implementer`, sequential. All children are
frontend-scope moves/config work; single writer, one commit per child.

**Final review:** one combined SP-109 review after every child is implemented,
at `./artifacts/SP-109/review.md`; integration/index owner: SP-109I (parent index
`./artifacts/SP-109/implementation.md`). No per-child review gates.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-109A-fsd-foundation-config.md) | Implemented — awaiting parent review (2026-10-17) | None | — | `./artifacts/SP-109A/` |
| [B](./SP-109B-shared-lib-and-types.md) | Implemented — awaiting parent review (2026-10-17) | A | — | `./artifacts/SP-109B/` |
| [C](./SP-109C-shared-ui-and-transport.md) | Implemented — awaiting parent review (2026-10-17) | B (implemented 2026-10-17) | — | `./artifacts/SP-109C/` |
| [D](./SP-109D-entity-user.md) | Implemented — awaiting parent review (2026-10-17) | B, C | — | `./artifacts/SP-109D/` |
| [E](./SP-109E-feature-auth.md) | Implemented — awaiting parent review (2026-10-17) | C, D | — | `./artifacts/SP-109E/` |
| [F](./SP-109F-feature-session-store.md) | Implemented — awaiting parent review (2026-10-17) | E | — | `./artifacts/SP-109F/` |
| [G](./SP-109G-widgets.md) | Implemented — awaiting parent review (2026-10-17) | C, E, F | — | `./artifacts/SP-109G/` |
| [H](./SP-109H-pages-and-app-shell.md) | Implemented — awaiting parent review (2026-10-17) | G (implemented 2026-10-17) | — | `./artifacts/SP-109H/` |
| [I](./SP-109I-boundaries-docs-verification.md) | In progress (2026-10-17) | B–H (all implemented 2026-10-17) | Resume from checkpoint: enforcement proof, docs paths, full verification, parent index | `./artifacts/SP-109I/checkpoint.md` |

SP-109A and SP-109B are implemented; C–I are `Queued` because they need A's alias and B's relocated modules.

## Child inventory

| ID | Layer / owner | Outcome | Dependency | Target size | Jira |
|---|---|---|---|---|---|
| [A](./SP-109A-fsd-foundation-config.md) | Implemented — awaiting parent review (2026-10-17) | Frontend config, `implementer` | `@/` alias in tsconfig + Vite, layer folder skeleton, ESLint layer-direction rules | None | One 45–60 min session | STUDY-45 |
| [B](./SP-109B-shared-lib-and-types.md) | Implemented — awaiting parent review (2026-10-17) | Frontend, `implementer` | `shared/lib` + `shared/api/types` + per-layer type homes replace `src/utils` and `src/types` | A | One 60–90 min session | STUDY-46 |
| [C](./SP-109C-shared-ui-and-transport.md) | Frontend, `implementer` | `shared/ui` (Button/Input) and `shared/api` (httpClient, tokenStore, recovery) | B | One 60–90 min session | STUDY-47 |
| [D](./SP-109D-entity-user.md) | Frontend, `implementer` | `entities/user` — user types + `getProfile`/`updateProfile` extracted from `authService` | B, C | One 60–90 min session | STUDY-48 |
| [E](./SP-109E-feature-auth.md) | Frontend, `implementer` | `features/auth` — auth API service, auth types, `AuthProvider`/`useAuth` context | C, D | One 60–90 min session | STUDY-49 |
| [F](./SP-109F-feature-session-store.md) | Frontend, `implementer` | `features/session` (slice, thunks, selectors, RTK Query API), `features/email-verification` hook, `app/store` | E | One 60–90 min session | STUDY-50 |
| [G](./SP-109G-widgets.md) | Frontend, `implementer` | `widgets/` — layout, header, verification banner, route guards | C, E, F | One 45–60 min session | STUDY-51 |
| [H](./SP-109H-pages-and-app-shell.md) | Frontend, `implementer` | `pages/<route>/ui/*` + `app/App.tsx` router + `app/providers/AppProviders.tsx` + `main.tsx` | G | One 60–90 min session | STUDY-52 |
| [I](./SP-109I-boundaries-docs-verification.md) | Frontend/verification + docs, `implementer` | Proved boundary enforcement, legacy folders gone, repo docs repointed, full green verification | B–H | One 60–90 min session | STUDY-53 |

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

Findings raised by the planner while producing this breakdown. Original
findings are preserved verbatim.

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

Parent: [SP-109](./SP-109.md) · In-scope children: A–I · Integration/index
owner: SP-109I (`./artifacts/SP-109/implementation.md`) · One combined review
after every child is implemented: `./artifacts/SP-109/review.md`. Child
completion — not review approval — unblocks dependents; no per-child review
gates.
