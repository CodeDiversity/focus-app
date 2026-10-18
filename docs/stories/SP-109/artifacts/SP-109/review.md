# SP-109 Combined Parent Review — Frontend feature-sliced (FSD) folder structure

**Parent story:** SP-109 (children SP-109A … SP-109I)
**Review date:** 2026-10-17 (review session; all verification and gate execution performed in-session) — report saved 2026-10-18
**Pass:** 1 (first and only pass — one combined review after every child is implemented, per [.agents/review-cadence.md](../../../.agents/review-cadence.md); no per-child review gates exist or were run)
**Reviewed state:** `HEAD` = `fe3b7d4` ("SP-109I: boundary red/green proof, legacy-folder proof, root README repoint, parent implementation index") on `main`; working tree clean (`git status --porcelain` → empty, executed). Child commits: A = `84ef7ea`, B = `c904a5c`, C = `e0bc484`, D = `2276b27`, E = `dff638a`, F = `db477da`, G = `8e30bad`, H = `23fe1b5`, I = `fe3b7d4` (executed `git log --oneline 84ef7ea..HEAD`).
**Reviewed paths:** `docs/stories/SP-109/**` (breakdown README, parent ticket, all nine child tickets, all artifact files present); `apps/web/src/**` (full 70-file tree via executed `find`; `features/auth/api/authService.ts` read in full, `entities/user/api/userService.ts` read in full, `shared/api/httpClient.ts:50-109`, `shared/api/recovery.ts` (header), `app/store/*`, `features/session/*`, `main.tsx`, `app/App.tsx`, `app/providers/AppProviders.tsx`); `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/.eslintrc.cjs`, `apps/web/package.json`; root `README.md:28-37`; `docs/artifacts/README.md` (canonical layout); `docs/epics/README.md` (shared DoD); `.git` state (HEAD, refs, status, per-commit stats).
**Report path:** `docs/stories/SP-109/artifacts/SP-109/review.md` (README-resolved: Delivery home `docs/stories/SP-109/`, Artifact root `./artifacts/`, Parent artifacts `./artifacts/SP-109/`). First report at this path; nothing replaced.

## Scope and method

One combined review of the **whole** SP-109 parent scope after every child A–I is implemented, per the review-cadence rule. AC and DoD results are attributed to child IDs. The parent scope is a **pure relocation refactor** of `apps/web/src` into FSD layers plus one narrow structural extraction (SP-109D) and one config/enforcement pass (A, I); the frozen contract for every child is **zero behavior change** (RQ-109-06), with the 19-file / 193-test suite as the regression net.

Method, per the reviewer skill's [Running commands](../../../.agents/skills/studypilot-reviewer/SKILL.md#running-commands) procedure:

- **Executed gates obtained by delegating a bounded read-only helper** (this reviewer session has no shell; route 2 of the procedure). The helper ran the four `@studypilot/web` gates plus the code/config/git inspections quoted below, attested that it made no file modification, no git write, installed nothing, and opened no secret file; its output is treated as this reviewer's gate evidence and is quoted verbatim.
- **Every implementer claim re-checked against the actual files**, not trusted: the FSD tree, the alias config, the ESLint zones, the moved modules' exports, the `isLoading` boot value, the RTK Query config and the root-README repoint were all re-verified directly this session.
- **Independent reviewer greps** over `apps/web/src` (executed): legacy path references (`src/components|context|hooks|services|store|types|utils`) → **zero matches, exit 1**; legacy aliases (`@components/|@pages/|@hooks/|@services/|@types/|@utils/|@context/`) → **zero matches, exit 1**; `authService.getProfile|authService.updateProfile` → **zero matches** (D3).
- **Commit scope** (executed `git show --stat`): B = 40 files, C = move+rewrites, D = 10 files, E = 30 files (54+/56−, pure move + import repoints), F = 24 files, G = 11 files, H = 23 files, I = 8 files (all docs + root `README.md` one line). `git diff 84ef7ea..HEAD --name-only -- apps/api` → **empty** (no backend file in the whole parent scope).
- **Scope note (not a finding):** the range `84ef7ea..HEAD` also contains four `jira-sync`-role commits — `99c681b` (SP-109 Jira keys), `b4a4514` (SP-108 Jira keys), `9b36fe5` (EP01 Jira keys), `31ac85a` (EP01 story-file prune + ledger + tombstones). All are docs-only tracker bookkeeping outside the SP-109 implementation scope; they touch no `apps/**` file and are noted, not reviewed.

### Limitations (stated explicitly)

- **The executed gates were delegated, not run by this reviewer's own shell** (route 2, provenance as above). This is weaker in one respect than a self-run: the reviewer did not type the commands; the helper attested read-only execution and the unchanged clean tree was confirmed by a separate read of `.git` state.
- **Dev-server smoke: CANNOT VERIFY** — no runtime dev-server smoke is authorized in this environment (SP-108 recorded the identical limitation and the same reason). It is recorded as not performed, with its reason, not as verified. The available net is `tsc && vite build` (executed, exit 0) + the 193-test suite (executed, green), several of which render the real `App` router and guards.
- No `.env`, `.env.*`, credential or secret file was read, written or displayed at any point, by this reviewer or (per its attestation) by the helper. No secret was found in any reviewed file.
- No application, test, manifest, migration, story ticket, plan or Git state was modified by this review. The review's writes are this report and the scoped passing-review docs sync (see Handoff).

### Executed gate evidence (verbatim, delegated)

**`pnpm --filter @studypilot/web test` → exit 0** (per-file lines verbatim — note every suite runs from its **new FSD location**):

```
✓ src/features/session/model/authSlice.test.ts  (8 tests) 6ms
✓ src/features/session/model/authSlice.thunks.test.ts  (5 tests) 8ms
✓ src/shared/api/recovery.test.ts  (23 tests) 18ms
✓ src/features/session/api/sessionApi.test.ts  (8 tests) 12ms
✓ src/shared/api/httpClient.test.ts  (14 tests) 44ms
✓ src/app/store/store.test.tsx  (3 tests) 32ms
✓ src/features/email-verification/model/useResendVerification.test.tsx  (5 tests) 34ms
✓ src/features/auth/model/AuthContext.registerLogout.test.tsx  (4 tests) 43ms
✓ src/widgets/protected-route/ui/ProtectedRoute.test.tsx  (4 tests) 50ms
✓ src/features/auth/model/AuthContext.test.tsx  (14 tests) 150ms
✓ src/shared/lib/datetime.test.ts  (7 tests) 2ms
✓ src/shared/ui/Button.test.tsx  (4 tests) 100ms
✓ src/pages/register/ui/RegisterPage.test.tsx  (6 tests) 811ms
✓ src/pages/login/ui/LoginPage.test.tsx  (7 tests) 805ms
✓ src/widgets/email-verification-banner/ui/EmailVerificationBanner.test.tsx  (12 tests) 887ms
✓ src/pages/profile/ui/ProfilePage.test.tsx  (14 tests) 937ms
✓ src/pages/verify-email/ui/VerifyEmailPage.test.tsx  (18 tests) 2688ms
✓ src/pages/forgot-password/ui/ForgotPasswordPage.test.tsx  (16 tests) 2677ms
✓ src/pages/reset-password/ui/ResetPasswordPage.test.tsx  (21 tests) 4574ms

 Test Files  19 passed (19)
      Tests  193 passed (193)
```

(The run emitted pre-existing React `act(...)` advisories from the page tests — cosmetic, no failures, no effect on exit code.)

**`pnpm --filter @studypilot/web typecheck` → exit 0** (`tsc --noEmit`, no errors).

**`pnpm --filter @studypilot/web lint` → exit 0** (`eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`, no output).

**`pnpm --filter @studypilot/web build` → exit 0** — `✓ 1557 modules transformed. ✓ built in 1.14s` (bundle 453.44 kB / 145.51 kB gzip).

**Structure** — `ls apps/web/src` (executed): `app entities features index.css main.tsx pages shared test widgets` — exactly the expected set; no legacy folder. `find apps/web/src -type f` (executed): 70 files, all inside the six layers + `test/` + `main.tsx`/`index.css`.

**Config** — `apps/web/tsconfig.json` (executed read): `paths` contains exactly `"@/*": ["./src/*"]`; `apps/web/vite.config.ts:9-11` (executed read): exactly `'@': path.resolve(__dirname, './src')` plus the unchanged `server` block. `apps/web/.eslintrc.cjs` (executed read): `import/no-restricted-paths` (error) with five zones — `shared` ← {entities, features, widgets, pages, app} except `auth/model/types.ts` (RD13), `entities` ← {features, widgets, pages, app}, `features` ← {widgets, pages, app}, `widgets` ← {pages, app}, `pages` ← app.

**Sanctioned disables** — `grep -rn "eslint-disable-next-line import/no-restricted-paths" apps/web/src` (executed): exactly 7 lines — `features/auth/model/AuthContext.tsx:32`, `features/session/model/authSlice.selectors.ts:2`, `features/session/model/authSlice.thunks.ts:9` (the three RD7-sanctioned `@/app/store/*` type/hook imports, each with an explanatory comment) and the four page tests that render the real `@/app/App` router per SP-109H AC5 (`verify-email:9`, `profile:16`, `forgot-password:6`, `reset-password:7`). Lint passes under `--report-unused-disable-directives --max-warnings 0`, so none is stale.

**Frozen contracts** — `features/session/model/authSlice.ts:19` `isLoading: true` (executed grep; SP-108E/IR-001 contract preserved through the move); `features/session/api/sessionApi.ts:67` `reducerPath: 'api'`, `:69` `keepUnusedDataFor: 300` (executed grep); `shared/api/httpClient.ts:53-58` `setSessionExpiredHandler` + `setAuthFailureHandler` alias, `:63-68` `beginRefresh` single-flight doc comment, `:89-107` `refreshAccessToken` deferral logic (read directly — RD4/SP-105G semantics intact); root `README.md:33` repointed to `apps/web/src/shared/api/httpClient.ts` (read directly — RD12/I3).

## Verdict

**PASS — SP-109 meets the shared Definition of Done and its acceptance criteria.**

All nine children are implemented and verified against the code itself: the FSD tree is exactly the planned structure, every legacy folder and stale alias is gone (executed greps, zero matches), the layer-direction rules are enforced and proven red/green, the frozen transport/session contracts are byte-for-byte preserved, and the full gate set is **executed and green at `fe3b7d4`** — 19 files / 193 tests (exit 0), typecheck (exit 0), lint (exit 0, `--max-warnings 0`), build (exit 0, 1557 modules) — with the per-file output showing every suite running from its new FSD location. No backend file changed in the parent scope (executed: empty `apps/api` diff).

No open **blocker** or **should-fix** finding remains. Nine findings were raised (IR-001…IR-009), all **polish**: seven remain open (documentation/record drift with no behavior or verification impact) and two (IR-005, IR-009) are closed by this review's passing docs sync. The only unexecuted gate is the dev-server smoke — CANNOT VERIFY, recorded with its reason and the SP-108 precedent, and named in this verdict line rather than glossed.

Formal sign-off for the parent scope is established by this report; individual child stories were never separately reviewed, and none is required.

---

## Findings

Result key: severity per the reviewer skill — **blocker** / **should-fix** / **polish**. A verdict passes with no open blocker or should-fix; polish-only findings still pass.

| ID | Child | Severity | Disposition | One-line summary |
|---|---|---|---|---|
| IR-001 | D | Polish | **OPEN** | `refreshToken()` lost its 4-line comment block (AC2: "keep their bodies, order and comments") |
| IR-002 | E | Polish | **OPEN** | `artifacts/SP-109E/` absent entirely — no checkpoint, no implementation record |
| IR-003 | D | Polish | **OPEN** | `artifacts/SP-109D/` has no `checkpoint.md` (canonical layout requires both) |
| IR-004 | A–I | Polish | **OPEN** | 8 of 9 child tickets carry stale pre-implementation `Status:` lines |
| IR-005 | parent | Polish | **CLOSED by this review's docs sync** | Stale parent-level status lines (README `:9`, README `:45`, `SP-109.md:7`) |
| IR-006 | G, I | Polish | **OPEN** | Committed checkpoints don't reflect completion (I: all boxes unchecked; G: "In progress" header) |
| IR-007 | I | Polish | **OPEN** | Parent index "Queue reconciliation" asserts a queue state that was never committed |
| IR-008 | I | Polish | **OPEN** | Parent index scope window ends at H (stale "HEAD" label), no I row in the change-scope table |
| IR-009 | I | Polish | **CLOSED by this review's docs sync** | I's AC5 queue-repoint never committed (queue left in start state) |

### IR-001 — SP-109D AC2 deviation: `refreshToken` comment block dropped

- **Original claim (preserved):** `artifacts/SP-109D/implementation.md:15-16` — "Pure structural extraction (RD10-style lift-and-shift): the two `/users/me` profile methods move verbatim out of `services/auth.ts`…". The ticket's AC2 (`SP-109D-entity-user.md:42-45`) requires `authService`'s remaining methods to "keep their **bodies, order and comments**".
- **Gap (executed):** D's commit `2276b27` (C→D diff of `services/auth.ts`) removed the 4-line block above `refreshToken` — "Refresh token — rotates the httpOnly cookie server-side and returns the same shape as login so session restore needs no extra call. Delegates to the api module's single-flight primitive so boot restore and interceptor refreshes share one in-flight rotation." — while removing `getProfile`/`updateProfile`. Current state: `features/auth/api/authService.ts:83-85` is a bare `refreshToken() { return refreshAccessToken(); }` with no comment.
- **Consequence:** the call-site documentation of the refresh delegation is lost; **no behavior change** (body and method order verified preserved — all eight remaining methods read directly, in baseline order). The single-flight semantics remain documented in `shared/api/httpClient.ts:63-68` (`beginRefresh` doc comment) and `:95-97` (inline comment in `refreshAccessToken`), so the knowledge survives in the codebase, only not at the call site.
- **Suggested fix:** restore the 4-line comment above `refreshToken` in `features/auth/api/authService.ts` (wording "the api module" → "the shared httpClient").
- **Acceptance condition:** comment restored; lint/typecheck green; no other diff in the file.
- **Severity rationale:** cosmetic documentation deviation with zero consumer or behavior impact — the same class as SP-108 IR-008 (stated export location not honored → polish).

### IR-002 — SP-109E has no implementation record at all

- **Original claim (preserved):** parent index `artifacts/SP-109/implementation.md:34` — "E … commit `dff638a` only (no artifacts/SP-109E/ dir)"; canonical layout `docs/artifacts/README.md:21-23` requires `checkpoint.md` **and** `implementation.md` per child.
- **Gap (executed):** `docs/stories/SP-109/artifacts/` contains `SP-109/ A B C D F G H I` — **no `SP-109E/` directory**. E's completion is evidenced only by commit `dff638a` (30 files, 54+/56− — pure move + import repoints, executed stat).
- **Independent verification this review:** E's code was verified directly, not via a record — `features/auth/api/authService.ts` read in full (8 methods, user-facing error strings intact), `features/auth/model/types.ts` + `AuthContext.tsx` + both suites present in the executed `find` listing, `useAuth` contract intact, `src/services/` and `src/context/` gone (executed `ls`), and the moved suites executed green from the new paths (`AuthContext.test.tsx` 14, `AuthContext.registerLogout.test.tsx` 4).
- **Consequence:** a DoD auditor reading `artifacts/SP-109E/` finds nothing; E's evidence path rests on the commit, the parent index and this report.
- **Severity rationale:** E changed **no API or schema** (pure move of an existing service + context) — the skill's missing-summary FAIL clause applies to stories that changed the API or schema, and this review verified E's code directly, so the record's absence is an evidence-hygiene gap, not a verification gap. (Distinguished from SP-108 IR-003, where the missing record concealed substantive *new* wiring — that was should-fix.)
- **Suggested fix:** a docs slice reconstructing `artifacts/SP-109E/implementation.md` strictly from commit `dff638a` + this review's verified results (SP-108G precedent: no new evidence), plus a `checkpoint.md`.

### IR-003 — SP-109D has no `checkpoint.md`

- **Original claim (preserved):** parent index `artifacts/SP-109/implementation.md:33` — "D … `artifacts/SP-109D/` (no checkpoint, inline completion)".
- **Gap (executed):** `artifacts/SP-109D/` contains `implementation.md` only; the canonical layout requires both files. D's record itself is faithful (its claims re-verified this review — see D's AC table; the one deviation is IR-001).
- **Consequence:** a resuming agent has no resume record for D; cosmetic for a completed, single-window child.
- **Suggested fix:** add a `checkpoint.md` noting D completed in one window (status complete, HEAD `2276b27`).

### IR-004 — Eight of nine child tickets carry stale `Status:` lines

- **Original claim (preserved):** each child ticket's `**Status:**` line, read directly this review: A `SP-109A…:7` "Ready"; B `:7` "Queued (SP-109A must land first — the moves use the `@/` alias)"; C `:7` "Ready (refined 2026-10-17; SP-109A/B implemented 2026-10-17 — dependencies met; queue-row reconciliation pending)"; D `:7` "Queued (SP-109B and SP-109C must land first)"; E `:7` "Queued (SP-109C and SP-109D must land first)"; F `:7` "Queued (SP-109E must land first)"; G `:7` "Queued (SP-109C, SP-109E, SP-109F must land first)"; I `:7` "In progress (2026-10-17; checkpoint …)". Only **H** is current ("Implemented — awaiting parent review (2026-10-17; commit `23fe1b5` …)").
- **Gap:** all eight children are implemented (commits + records + code verified above); the tickets still advertise pre-implementation states.
- **Consequence:** anyone opening a ticket gets a stale state; the execution queue is the canonical record and is reconciled by this sync, so the tickets are secondary bookkeeping.
- **Suggested fix:** one docs pass setting each ticket's `Status:` to its verified state (A–H "Implemented — awaiting parent review (2026-10-17; commit …)", I likewise with `fe3b7d4`).
- **Owner note:** child tickets are outside the reviewer's passing-sync write scope (SP-108 precedent: the reviewer sync does not touch child tickets) — this stays open for the planner/implementer.

### IR-005 — Stale parent-level status lines — **CLOSED by this review's docs sync**

- **Original claim (preserved):** `docs/stories/SP-109/README.md:9` — "Planned 2026-10-17 (planner); SP-109A implemented 2026-10-17; SP-109B implemented 2026-10-17; SP-109C implemented 2026-10-17." (stops at C); `README.md:45` — "SP-109A and SP-109B are implemented; C–I are `Queued` because they need A's alias and B's relocated modules." (contradicts the queue table directly above it); `docs/stories/SP-109/SP-109.md:7` — "Planned 2026-10-17. Nothing implemented."
- **Consequence:** the coordination record understated the completed work.
- **Closure evidence:** this review's passing docs sync rewrites all three to the verified state (all children implemented; combined review PASS 2026-10-17; report link) — recorded in the breakdown README correction log.

### IR-006 — Committed checkpoints do not reflect completion (I, G)

- **Original claim (preserved):** `artifacts/SP-109I/checkpoint.md` (committed in `fe3b7d4`) — all five AC boxes unchecked, "Saved work: none yet for I; status-pointer edits uncommitted", "HEAD at last update: `23fe1b5` (SP-109H)", "Current step: run baseline test/typecheck/lint, then AC1 probe" — i.e., a **pre-work resume state** committed in the same commit as its completion record, which says "Status: Implementation complete — awaiting parent review" (`artifacts/SP-109I/implementation.md:5`) and "checkpoint.md is the resume record" (`:137`). Second instance: `artifacts/SP-109G/checkpoint.md:5` header "In progress (resumed after a lost context)" vs `artifacts/SP-109G/implementation.md:5` "Implementation complete — awaiting parent review".
- **Consequence:** an agent resuming from I's checkpoint would redo completed work; the resume record and the completion record contradict each other.
- **Suggested fix:** update I's checkpoint (boxes checked, saved-work/HEAD refreshed to `fe3b7d4`, state complete) and G's header to complete (implementer-owned).

### IR-007 — Parent index "Queue reconciliation" asserts a queue state that was never committed

- **Original claim (preserved):** `artifacts/SP-109/implementation.md:110-114` — "All rows in `docs/stories/SP-109/README.md` are marked `Implemented — awaiting parent review` (A) / `Implementation complete — awaiting parent review` (I); **Active = None**".
- **Gap (executed read of the committed README at `fe3b7d4`):** row I reads "In progress (2026-10-17)" and "Active substory: SP-109I — In progress". The index asserts a reconciliation that does not exist in the committed queue (see IR-009 for the root cause).
- **Consequence:** the index — the artifact a DoD auditor reads — contains a false statement about the canonical queue.
- **Note:** this review's sync reconciles the queue to a state at least as current as the index's claim (rows → `Reviewed`, Active/Next → `None`), so the drift is healed by the sync; the index text itself is implementer-owned and is not rewritten by the reviewer.
- **Suggested fix:** reword the section to describe what the queue said at `fe3b7d4` and that the final reconciliation is the reviewer's.

### IR-008 — Parent index Git scope is stale and self-inconsistent

- **Original claim (preserved):** `artifacts/SP-109/implementation.md:7` — "Scope window (Git): `84ef7ea` (baseline before A) → `23fe1b5` (SP-109H, **HEAD**)" — while `HEAD` is `fe3b7d4` (I, executed). The "Combined Git change scope" table (`:12-21`) lists A–H and has **no row for `fe3b7d4`**; and `84ef7ea` is simultaneously labeled "baseline before A" and listed in the same table as A's commit (`:14`) — `git log 84ef7ea..HEAD` excludes `84ef7ea` itself, so the two labels cannot both be right.
- **Consequence:** a reader computing the parent scope from the index excludes I's commit and the window's true bounds; I's own ticket AC5 asks for "a row per child A–I (commit range, …)" in the index.
- **Suggested fix:** extend the window to `fe3b7d4`, add an I row (8 files, all docs + root README one line), and label the baseline as `84ef7ea`'s parent (implementer-owned).

### IR-009 — SP-109I AC5 queue-repoint never committed — **CLOSED by this review's docs sync**

- **Original claim (preserved):** `SP-109I-boundaries-docs-verification.md:61-66` (AC5) — the parent index "plus `docs/stories/SP-109/README.md`'s execution-queue rows are repointed to the per-child artifacts and marked `Implemented — awaiting parent review`".
- **Gap (executed):** I's commit `fe3b7d4` flipped the queue to I's **start** state (Active = I, row I "Queued → In progress") and left it there; the completion repoint was never committed. I's implementation record never mentions the queue repoint (Summary `:9-15`; AC4 table `:110-120`) while carrying "Status: Implementation complete" — so the record, the queue and the index each tell a different story.
- **Consequence:** the canonical queue understated completion; AC5 is partially met (index written; repoint absent).
- **Closure evidence:** this review's sync re-points the queue (rows A–I → `Reviewed`, Active/Next → `None` with the report link) — a state more current than the AC asked for — recorded in the breakdown README correction log.

**No finding is a blocker or should-fix.** The open items (IR-001, IR-002, IR-003, IR-004, IR-006, IR-007, IR-008) are documentation/record drift: none affects behavior, none weakens a test, and none hides unverified code — every application claim in the parent scope was verified against the code and the executed gates above.

---

## Acceptance criteria, by child

Result key: **PASS** = verified against the code/tests themselves, with the executed gate green; **PARTIAL** = met with a recorded gap; **CANNOT VERIFY** = cannot be established from the evidence available to this pass.

### SP-109A — FSD foundation config

| # | Criterion | Result | Evidence |
|---|---|---|---|
| A1 | tsconfig `paths` exactly `"@/*": ["./src/*"]`; seven legacy aliases gone | PASS | Executed read of `apps/web/tsconfig.json`: single `@/*` mapping; executed grep for the seven legacy alias prefixes over `apps/web/src` → zero matches, exit 1 |
| A2 | Vite alias exactly `'@'` → `./src`; `setupFiles`/port/proxy byte-identical | PASS | Executed read `vite.config.ts:9-17`: `'@': path.resolve(__dirname, './src')` only; `server.port: 3000` + `/api` proxy block intact |
| A3 | Layer directories exist (may be empty + `.gitkeep`) | PASS | Executed `ls apps/web/src` + `find`: all planned folders present, including `app/providers/`, `app/store/`, `shared/{ui,api,lib,types}`, `widgets/` (`.gitkeep` present) |
| A4 | ESLint layer-direction rules per RD6; rule form recorded | PASS | Executed read of `apps/web/.eslintrc.cjs`: `import/no-restricted-paths` (error) with five zones + RD13 `except`; `eslint-plugin-import` added as devDependency (A commit `84ef7ea` = `.eslintrc.cjs` + `package.json` + `pnpm-lock.yaml`, executed stat); form recorded in `artifacts/SP-109A/implementation.md` |
| A5 | Red/green proof quoted in A's record (I re-proves) | PASS | `artifacts/SP-109A/implementation.md:38-44`: deliberate `src/shared/_test_violation.ts` importing `../app/store/store` → lint error quoted; removed → lint exit 0; I re-proved enforcement after all children landed (I1 below) |
| A6 | test/typecheck/lint green, same 19 files / 193 tests | PASS | Executed at HEAD: 19 files / 193 tests exit 0; typecheck exit 0; lint exit 0 |
| — | Record completeness | PASS | `artifacts/SP-109A/` has `checkpoint.md` (Complete) + `implementation.md` (Complete) |

### SP-109B — `shared/lib` + per-layer type homes

| # | Criterion | Result | Evidence |
|---|---|---|---|
| B1 | `utils/*` → `shared/lib/*` (same filenames/exports); `src/utils/` gone | PASS | Executed `find`: `shared/lib/{errors,linkToken,datetime}.ts` + `datetime.test.ts`; no `utils/` in `ls` |
| B2 | `types/index.ts` deleted; types distributed with identical definitions | PASS | Executed `find`: `shared/api/types.ts`, `entities/user/model/types.ts`, `features/auth/model/types.ts`, `shared/types/academic.ts`; no top-level `types/`; `typecheck` exit 0 (executed) proves the definitions resolve |
| B3 | `ResetPasswordResult` stays with the recovery module, not duplicated | PASS | `shared/api/recovery.ts` declares it; `features/auth/api/authService.ts:3` imports `type ResetPasswordResult` from `@/shared/api/recovery` (read directly) |
| B4 | Every importer rewritten to aliased imports; no specifier changes behavior | PASS | Executed greps: zero legacy path references, zero legacy aliases; B commit `c904a5c` = 40 files (renames + import rewrites, executed stat) |
| B5 | 19/193 green; typecheck; lint | PASS | Executed at HEAD (all exit 0) |
| — | Record completeness | PASS | `artifacts/SP-109B/` has `checkpoint.md` + `implementation.md` (both Complete) |

### SP-109C — `shared/ui` + `shared/api` transport

| # | Criterion | Result | Evidence |
|---|---|---|---|
| C1 | Button/Input → `shared/ui`; no markup/class/a11y edit | PASS | Executed `find`: `shared/ui/Button.tsx` (+test), `Input.tsx`; C commit is move + import lines; `Button.test.tsx` (4 tests) executed green from the new path |
| C2 | `api.ts` → `shared/api/httpClient.ts`, `tokenStore`, `recovery` (+tests); every export keeps name/signature (RD4/RD5); `services/` then holds only `auth.ts` | PASS | Executed `find`: `shared/api/{httpClient,tokenStore,recovery,types}.ts` (+tests); `ls` shows no `services/` (E removed the last file); read directly: `httpClient.ts:53-58` `setSessionExpiredHandler` + alias, `:60-107` refresh machinery, `:109+` interceptors — RD4/SP-105G semantics intact |
| C3 | In-file edits are import/comment lines only; no logic/assertion/message touched | PASS | C commit `e0bc484` (executed stat): moves + import rewrites; the frozen SP-105G behavior is pinned by `httpClient.test.ts` (14) + `recovery.test.ts` (23), both executed green from the new paths |
| C4 | All importers repointed to `@/shared/ui/*` / `@/shared/api/*` | PASS | Executed greps: zero legacy references/aliases repo-wide |
| C5 | 19/193 green; typecheck; lint | PASS | Executed at HEAD (all exit 0) |
| — | Record completeness | PASS | `artifacts/SP-109C/` has `checkpoint.md` + `implementation.md` |

### SP-109D — `entities/user` extraction

| # | Criterion | Result | Evidence |
|---|---|---|---|
| D1 | New `entities/user/api/userService.ts` with `getProfile`/`updateProfile`, bodies copied, importing `httpClient` + `User` | PASS | Read in full (22 lines): both methods with their original comments, `api.get<User>('/users/me')` / `api.patch<User>('/users/me', data)`, imports from `@/shared/api/httpClient` + `@/entities/user/model/types` |
| D2 | `authService` loses exactly those two; remaining methods keep bodies, order **and comments** | **PARTIAL** | Bodies and order preserved (read in full: all eight remaining methods, baseline order, all other comment blocks intact) — but the 4-line comment above `refreshToken` was dropped (executed C→D diff) → **IR-001** (polish; the single-flight semantics remain documented in `httpClient.ts:63-68`) |
| D3 | Every call site updated; zero `authService.getProfile`/`updateProfile` references | PASS | Executed grep: zero matches; `AuthContext.tsx` and `authSlice.thunks.ts` import `userService` (verified this review) |
| D4 | Test mocks follow the split without weakening assertions | PASS | `ProfilePage.test.tsx` (14), `AuthContext.test.tsx` (14), `authSlice.thunks.test.ts` (5) all executed green from the new paths, mocking `userService` |
| D5 | 19/193 green; typecheck; lint | PASS | Executed at HEAD (all exit 0) |
| — | Record completeness | PARTIAL | `implementation.md` present and faithful (claims re-verified); no `checkpoint.md` → **IR-003** (polish) |

### SP-109E — `features/auth` move

| # | Criterion | Result | Evidence |
|---|---|---|---|
| E1 | `services/auth.ts` → `features/auth/api/authService.ts`; mock targets repointed without body changes; `services/` gone | PASS | Read the moved file in full (8 methods, error strings verbatim); E commit `dff638a` = 30 files, 54+/56− (executed stat — pure move + repoints); `ls`: no `services/` |
| E2 | `AuthContext.tsx` + both suites → `features/auth/model/`; `AuthContextType`/`AuthProvider`/`useAuth` keep names, shapes, behavior (incl. `isLoading` boot `true`, single silent restore, expired-handler wiring) | PASS | Executed `find`: all three files at `features/auth/model/`; `authSlice.ts:19` `isLoading: true` (executed grep); the 12-member `AuthContextType` verified this review; both suites executed green (14 + 4) |
| E3 | `ProtectedRoute.test.tsx` keeps its assertions, follows new paths (stays for G to move) | PASS | It lived in `src/context/` after E and now sits at `widgets/protected-route/ui/` (G); 4 tests executed green |
| E4 | All `useAuth`/`authService` importers repointed; `context/` gone except the test | PASS | Executed `ls`: no `context/`; executed greps: zero legacy references |
| E5 | 19/193 green with no edited assertions; typecheck; lint | PASS | Executed at HEAD (all exit 0) |
| — | Record completeness | **GAP** | `artifacts/SP-109E/` absent entirely → **IR-002** (polish — E changed no API or schema; its code was verified directly by this review, so this is an evidence-hygiene gap, not a verification gap) |

### SP-109F — `features/session` + `app/store`

| # | Criterion | Result | Evidence |
|---|---|---|---|
| F1 | Slice family → `features/session/model/`; state shape, `isLoading: true` boot, reducer name, thunk names/payloads unchanged | PASS | Executed `find` + grep: `authSlice.ts:9/:19/:43` (`isLoading` field, boot `true`, reducer toggle); 8 slice + 5 thunk tests executed green from the new paths |
| F2 | `store/api.ts` → `features/session/api/sessionApi.ts`; exports + `reducerPath: 'api'` / `keepUnusedDataFor: 300` kept | PASS | Executed grep: `sessionApi.ts:67` `reducerPath: 'api'`, `:69` `keepUnusedDataFor: 300`; 8 tests executed green |
| F3 | `useResendVerification` (+test) → `features/email-verification/model/`; `hooks/` gone | PASS | Executed `find` + `ls`; 5 tests executed green |
| F4 | `store.ts`/`hooks.ts`/`store.test.tsx` → `app/store/`; `store`, `AppStore`, `RootState`, `AppDispatch`, typed hooks still exported; `store/` gone | PASS | Executed `find`: `app/store/{store,hooks,store.test.tsx}`; 3 tests executed green; no `store/` in `ls` |
| F5 | Import rewrites incl. the RD7 upward imports (only sanctioned `features → app` imports) | PASS | Executed grep: exactly the three RD7 disables at `AuthContext.tsx:32`, `authSlice.selectors.ts:2`, `authSlice.thunks.ts:9`, each with an explanatory comment; `main.tsx` and `test/providers.tsx` repointed (verified this review) |
| F6 | 19/193 green; typecheck; lint | PASS | Executed at HEAD (all exit 0) |
| — | Record completeness | PASS | `artifacts/SP-109F/` has `checkpoint.md` + `implementation.md` (committed in `db477da`) |

### SP-109G — `widgets/`

| # | Criterion | Result | Evidence |
|---|---|---|---|
| G1 | Five widget moves (layout, header, banner, both guards); component code unchanged apart from imports | PASS | Executed `find`: `widgets/{layout,header,email-verification-banner,protected-route,public-route}/ui/*`; G commit `8e30bad` stat shows pure renames + import rewrites (11 files) |
| G2 | `ProtectedRoute.test.tsx` moved with all 4 SP-108E cases, no assertion edited | PASS | `widgets/protected-route/ui/ProtectedRoute.test.tsx` — 4 tests executed green (50ms) |
| G3 | Internal widget wiring on aliases | PASS | Executed greps: zero legacy references; widget imports use `@/` specifiers (verified this review) |
| G4 | `components/` and `context/` no longer exist; grep clean | PASS | Executed `ls` + grep: both gone, zero matches |
| G5 | `App.tsx` (still top-level) repointed to the widget folders by path only | PASS | G commit touches `apps/web/src/App.tsx` (6 lines — import repoints, executed stat); H owns the move |
| G6 | 19/193 green; typecheck; lint | PASS | Executed at HEAD (all exit 0) |
| — | Record completeness | PARTIAL | Both files present; checkpoint header stale ("In progress") → **IR-006** (polish) |

### SP-109H — `pages/<route>/ui` + app shell

| # | Criterion | Result | Evidence |
|---|---|---|---|
| H1 | Eight page moves; `Home` → `HomePage` rename only where the filename changes; `pages/` holds only the 8 route folders | PASS | Executed `find`: `pages/{home,login,register,dashboard,profile,verify-email,forgot-password,reset-password}/ui/*Page.tsx` (+tests); H commit `23fe1b5` stat shows the renames (23 files) |
| H2 | New `app/providers/AppProviders.tsx` composing `BrowserRouter` → `Provider` → `AuthProvider`; no new provider/guard/middleware | PASS | Read directly: the three providers in the ticket's order; nothing else introduced |
| H3 | `App.tsx` → `app/App.tsx` with the same route table/grouping/fallback; aliased imports | PASS | Executed `find`: `app/App.tsx`; route table verified unchanged this review |
| H4 | `main.tsx` keeps its location; renders `StrictMode > AppProviders > App` | PASS | Read directly: imports `@/app/providers/AppProviders` + `@/app/App`; `StrictMode`/`createRoot`/`#root` unchanged |
| H5 | Test imports repointed only; the suites that import the real `App` carry justified disables; no assertion edited | PASS | Executed grep: exactly 4 test-only `@/app/App` disables (`verify-email:9`, `profile:16`, `forgot-password:6`, `reset-password:7`) — the suites that render the real router, per H's ticket; all executed green (18+14+16+21 page tests) |
| H6 | 19/193 green; typecheck; lint; no `../App` / `src/pages/[A-Z]` references | PASS | Executed gates (all exit 0); executed legacy-reference grep: zero matches |
| — | Record completeness | PASS | `artifacts/SP-109H/` has `checkpoint.md` + `implementation.md` (both current — the only child with a current ticket status line) |

### SP-109I — boundary proof, docs, verification, index

| # | Criterion | Result | Evidence |
|---|---|---|---|
| I1 | Red/green boundary proof, verbatim, naming the rule form actually used | PASS | `artifacts/SP-109I/implementation.md:17-66`: two deliberate violations (`shared → features`, `widgets → app`) with verbatim lint output naming `import/no-restricted-paths` + zone + the RD13 exception, then revert → exit 0. **Reviewer re-verified independently:** executed read of the five zones in `.eslintrc.cjs` + full lint exit 0 (executed) |
| I2 | Legacy proof: `ls` exactly the expected set; greps zero matches | PASS | Record quotes `ls` + 3 greps (`:70-94`); **reviewer re-ran** both greps (executed: exit 1, zero matches) and `ls` (executed: exactly `app entities features index.css main.tsx pages shared test widgets`) |
| I3 | Root README "State Management" line repointed (RD12) | PASS | `README.md:33` (read directly) now names `apps/web/src/shared/api/httpClient.ts`; the record quotes the one-line diff (`:100-103`) |
| I4 | Full verification executed and quoted; CANNOT VERIFY stated where not runnable | PASS (dev smoke CANNOT VERIFY) | Record quotes all gates (`:110-120`); **reviewer executed all four at HEAD**: 19 files / 193 tests exit 0, typecheck exit 0, lint exit 0, build exit 0 (1557 modules); dev-server smoke CANNOT VERIFY (environment limitation, SP-108 precedent, stated with reason in the record); backend check executed (empty `apps/api` diff) |
| I5 | Parent index with a row per child A–I **and** the queue rows repointed | **PARTIAL** | Index written but: scope window stale + no I row + self-inconsistent baseline label (**IR-008**); "Queue reconciliation" asserts a never-committed state (**IR-007**); the queue repoint itself never committed (**IR-009** — closed by this review's sync) |
| — | Record completeness | PARTIAL | `implementation.md` present and faithful (every claim re-verified above); `checkpoint.md` committed in pre-work state → **IR-006** (polish) |

### Parent-level requirements (README traceability)

| Req | Result | Evidence |
|---|---|---|
| RQ-109-01 FSD layout exists | PASS | A folders + B–H contents + I proof (executed `ls`/`find`) |
| RQ-109-02 No flat `src/components/` | PASS | C/G/H + I legacy proof (executed `ls`: no `components/`) |
| RQ-109-03 Slices/thunks/selectors/RTK API in feature or `app/store` | PASS | F (executed `find` + `isLoading`/`reducerPath` greps) |
| RQ-109-04 Hooks/contexts/services/utils out of flat folders | PASS | B/C/D/E/F (executed `ls` + greps) |
| RQ-109-05 Layer direction machine-enforced | PASS | A zones (executed read) + I red/green proof (record + reviewer re-verification) |
| RQ-109-06 Zero behavior change | PASS | **Executed**: 19 files / 193 tests green (identical to the baseline recorded in the breakdown), typecheck exit 0, lint exit 0 |
| RQ-109-07 Stale aliases removed | PASS | A + I (executed greps: zero matches) |
| RQ-109-08 Repo docs point at the new paths | PASS | I3 (root README, read directly); planner repointed `docs/epics/**` (PC-001, verified in plan) |
| TR-109-01…05 | PASS | Moved suites intact and executed from the new paths (per-file output above); boundary proof (TR-109-04) and legacy greps (TR-109-05) recorded + re-verified |

---

## Definition of Done audit (`docs/epics/README.md` shared DoD)

| # | Condition | Result | Evidence |
|---|---|---|---|
| 1 | The functional acceptance criteria pass | **PASS** | Every child's ACs verified above (D2 and I5 PARTIAL only on the documented polish items IR-001/IR-007/IR-008/IR-009; IR-009 closed by the sync). Executed: 193/193 tests green, typecheck and lint clean |
| 2 | Frontend and backend validation handle invalid input | **PASS (N/A, recorded reason)** | No form, DTO or validation code changed — a pure relocation; the moved error-handling strings are verbatim (read directly in `authService.ts:21-23`, `:33-35`) and pinned by executed suites |
| 3 | Academic data is scoped to the authenticated student | **PASS (N/A, confirmed)** | **No backend file changed** in the parent scope — executed `git diff 84ef7ea..HEAD --name-only -- apps/api` → empty. The frontend transport is behavior-unchanged (RD4); the ownership helpers in `apps/api/**` are outside this parent and unmodified |
| 4 | API errors produce actionable messages | **PASS** | Every user-facing message moved verbatim; the SP-105G sanitization chain is pinned by `recovery.test.ts` (23) + `httpClient.test.ts` (14), both executed green from `shared/api/` |
| 5 | Loading, empty and error states are handled | **PASS (N/A for UI change; regression-confirmed)** | No UI added/removed/altered; the boot-loading contract survives the move (`authSlice.ts:19` `isLoading: true`, executed grep) and its real-guard regression tests executed green (`ProtectedRoute.test.tsx` 4) |
| 6 | Core interactions support keyboard accessibility | **PASS (N/A, confirmed)** | No markup, focus or ARIA change in any commit (executed commit stats: moves + import lines only) |
| 7 | Responsive layouts work on desktop and mobile | **PASS (N/A, confirmed)** | No layout or styling file changed in the parent scope |
| 8 | Business rules have automated tests | **PASS** | The 193-test suite — including the SP-105G generation/barrier, SP-108E guard and SP-108F thunk/adapter cases — executed green **from the new FSD locations** (per-file output above) |
| 9 | API changes and migrations are documented | **PASS (with polish)** | No API/schema/migration change (verified). Architecture documented in the breakdown, the parent index and the repointed root `README.md:33` (read directly). Record gaps: IR-002 (E), IR-003 (D checkpoint) — polish |
| 10 | The feature has been reviewed in an integrated development environment | **PASS** | This combined review of the complete parent scope (A–I) with a passing verdict, with **executed** suite/typecheck/lint/build evidence attached (delegated read-only helper, provenance disclosed). The dev-server smoke remains CANNOT VERIFY, named in the verdict line |

---

## Out-of-scope check

- No AI feature, syllabus parsing, LMS integration, grade calculation, flashcard or native-mobile work was introduced (MVP exclusions in `docs/epics/README.md`). PASS.
- No backend, Prisma, migration, DTO or endpoint change — **verified this pass** (executed: empty `apps/api` diff over the whole window; per-commit stats list only `apps/web/**` and `docs/**`). PASS.
- No secret or credential material read, written or committed anywhere in the reviewed paths, by this reviewer or (per its attestation) by the delegated helper. PASS.
- Token handling unchanged: still in-memory via `shared/api/tokenStore`; the httpOnly refresh cookie is never touched by JS.
- Uniform-404 anti-enumeration posture untouched; the ownership helpers in `apps/api/**` are outside this parent and unmodified.
- The four `jira-sync`-role commits inside `84ef7ea..HEAD` (`99c681b`, `b4a4514`, `9b36fe5`, `31ac85a`) are docs-only tracker bookkeeping outside the SP-109 implementation scope — noted, not reviewed, no `apps/**` impact.
- Working tree clean at `fe3b7d4` (executed) — no other contributor's open work is present in the tree.
- No application, test, manifest, migration, story ticket, plan or Git state was modified by this review. The review's writes are this report and the scoped passing-review docs sync (see Handoff).

## Handoff

1. **Verdict: PASS** — SP-109 (children A–I) meets the shared Definition of Done and its acceptance criteria. No open blocker or should-fix finding. Open polish: **IR-001** (D `refreshToken` comment), **IR-002** (missing `artifacts/SP-109E/`), **IR-003** (missing SP-109D `checkpoint.md`), **IR-004** (8 stale child-ticket status lines), **IR-006** (stale I + G checkpoints), **IR-007** (index false queue claim), **IR-008** (index stale scope window / missing I row). Closed by this review's sync: **IR-005**, **IR-009**.
2. **Documentation bookkeeping performed by this reviewer on this passing verdict** (reviewer-skill passing-review docs sync, delivery home `docs/stories/SP-109/`): the breakdown README's status line, execution queue (Active/Next → None with the report link; rows A–I → `Reviewed`; the stale `:45` prose line), the correction-log entries for IR-001…IR-009, and the parent ticket `SP-109.md` status line. No AC, requirement, dependency, decision, quality-gate row, child ticket or code file was altered.
3. **Git handoff (closeout contract):** the reviewer does not commit. The sync writes (breakdown `README.md`, `SP-109.md`) and this report are **uncommitted** in the working tree at `docs/stories/SP-109/**`; the coordinator owns the commit.
4. **No decision requires the user**, except optionally whether to spend a slice on the open polish (a single docs pass could close IR-001/002/003/004/006/007/008 together).
5. **Residual gap:** the dev-server smoke was never performed (no authorized runtime smoke in this environment — SP-108 precedent); `build` is now reviewer-executed (exit 0, 1557 modules), so the only unexecuted gate is the smoke itself. No backend suite run is needed while the backend stays untouched by this scope (verified).

**Verdict: SP-109 (children A–I) meets the shared Definition of Done and its acceptance criteria.** No open blocker or should-fix finding remains; the open items are optional polish (IR-001…IR-004, IR-006…IR-008). The web suite (19 files / 193 tests), typecheck, lint and build are **executed, reviewer-attached evidence** (delegated read-only helper, provenance disclosed); the runtime dev-server smoke remains CANNOT VERIFY, as named above.
