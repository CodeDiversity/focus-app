# SP-108 Breakdown — Redux Toolkit adoption on the web frontend

**Story type:** Cross-cutting technical task (no single epic owner). Per
[docs/epics/README.md](../../epics/README.md#release-milestones), cross-cutting
technical tasks are tracked as technical stories linked to the appropriate
milestone — this one is **M1**.
**Jira:** STUDY-36 (parent); children A–G are **STUDY-37–STUDY-43** — verified 2026-10-17.
**Status:** Planned 2026-10-16; all children (A–D) implemented 2026-10-16;
combined parent review 2026-10-17 verdict **FAIL** (IR-001 blocker +
IR-002/IR-003 should-fix); fix pass SP-108E → SP-108F → SP-108G implemented
2026-10-17; combined parent review **pass 2, 2026-10-17: PASS** — IR-001,
IR-002 and IR-003 closed; IR-004…IR-012 remain optional polish; **pass 3,
2026-10-17: PASS** (verification pass — same verdict, gates now executed:
18 files / 178 tests, typecheck, lint all green; no new finding).

## Execution queue

**Delivery home:** `docs/stories/SP-108/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-108/` (created when the parent
checkpoint/index is written)

**Active substory:** None — the fix pass (E → F → G) is fully implemented and the
combined parent review was re-run on 2026-10-17 (verdict **PASS**), confirmed by
a verification pass 3 on the same tree with executed gate evidence.

**Next substory:** None — the parent scope A–G is implemented and reviewed
(passes 2 and 3, 2026-10-17, report `./artifacts/SP-108/review.md`). No
implementer work is authorized or outstanding; the open items IR-004…IR-012 are
optional polish that remain individually user-approved.

**Implementation owner:** `implementer`, sequential across all layers (all
children are frontend-scope work; single writer).

**Final review:** One combined SP-108 review after every child (incl. fix-pass
children) is implemented; no automatic child reviews. Final artifact path:
`./artifacts/SP-108/review.md`; integration/index owner: SP-108D (parent index
written at `./artifacts/SP-108/implementation.md`). **Pass 1 (2026-10-17) —
verdict FAIL: DoD 1/5/8/10 failed via IR-001 (blocker) and IR-002/IR-003
(should-fix); preserved verbatim at commit `b931451`. Fix pass E → F → G
implemented (`b3533a8`, `f059534`, `45e3e54`, `b931451`, `dab1db7`). Pass 2
(re-review, 2026-10-17, `HEAD` = `dab1db7`) — verdict PASS: IR-001, IR-002 and
IR-003 independently closed; DoD 1/5/8/10 now PASS; IR-004…IR-008 remain open
polish and IR-009…IR-012 were raised. **Pass 3 (verification pass, 2026-10-17,
same `HEAD` = `dab1db7` + uncommitted reviewer docs) — verdict PASS**, unchanged
verdict with **executed** gate evidence now attached: the web suite (18 files /
178 tests, exit 0), `typecheck` (exit 0) and `lint` (exit 0) were run by a
delegated read-only helper and are reviewer-attached evidence rather than
implementer-attested; IR-001…IR-012 dispositions were re-verified unchanged and
no new finding was raised. The saved report is under
`./artifacts/SP-108/review.md` (parent-replaced latest). Gates still CANNOT
VERIFY in every pass: `pnpm --filter @studypilot/web build`,
`pnpm install --frozen-lockfile`, and the runtime dev-server smoke (never
performed, with its recorded reason). No backend suite run is needed: no backend
file was changed by this scope (verified from the fix-pass commit scope and
`git status`).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](../../jira-sync/tombstones.md#story-sp-108a) | Reviewed (passes 2 and 3, 2026-10-17) | None — TanStack Query and AuthContext remain fully operational during this slice | None — A4 restored and pinned by SP-108E (IR-001 closed, re-verified executed-green in pass 3); record added by SP-108G (IR-003 closed) | `./artifacts/SP-108A/implementation.md` (+ `checkpoint.md`) |
| [B](../../jira-sync/tombstones.md#story-sp-108b) | Reviewed (passes 2 and 3, 2026-10-17) | A (store + typed hooks exist) | None — B4 negative tests added by SP-108F (IR-002 closed, re-verified executed-green in pass 3); IR-004/IR-009 polish open | `./artifacts/SP-108B/implementation.md` (+ checkpoints cp1, cp2) |
| [C](../../jira-sync/tombstones.md#story-sp-108c) | Reviewed (passes 2 and 3, 2026-10-17) | A (store) landed; independent of B's scope | None — all C criteria PASS; TanStack zero-match grep and full suite executed in pass 3 | `./artifacts/SP-108C/` (checkpoint, implementation) |
| [D](./SP-108D-tanstack-removal-verification.md) | Reviewed (passes 2 and 3, 2026-10-17) | B, C implemented — met; refined 2026-10-16 | None — D4 partial on the Git-scope/index gap only (IR-005, IR-010 polish); `build`/frozen-lockfile remain CANNOT VERIFY | `./artifacts/SP-108D/` (checkpoint, implementation); parent index `./artifacts/SP-108/implementation.md` |
| [E](../../jira-sync/tombstones.md#story-sp-108e) | Reviewed (passes 2 and 3, 2026-10-17) | None (fixes landed SP-108A/B code) — met | None — IR-001 closed: slice boots `isLoading: true`, 4 real-guard regression tests executed green (`store/authSlice.ts:19`, `context/ProtectedRoute.test.tsx`) | `./artifacts/SP-108E/` (checkpoint, implementation) |
| [F](../../jira-sync/tombstones.md#story-sp-108f) | Reviewed (passes 2 and 3, 2026-10-17) | E (both edit `authSlice.test.ts`; one writer) — met | None — IR-002 closed: 8 thunk/adapter error+loading tests through the real paths, executed green; IR-012 polish open | `./artifacts/SP-108F/` (checkpoint, implementation) |
| [G](../../jira-sync/tombstones.md#story-sp-108g) | Reviewed (passes 2 and 3, 2026-10-17) | None — met | None — IR-003 closed: SP-108A record verified faithful to `checkpoint.md`, parent index row for A repointed; the index still lacks a G row (IR-010 polish) | record itself (`./artifacts/SP-108G/implementation.md`, checkpoint) |

The queue is the current execution record. SP-108A–D were implemented
2026-10-16 and reviewed together 2026-10-17; the review returned FAIL, so the
queue's active scope became the fix pass **SP-108E → SP-108F → SP-108G** (each
with a full sizing block grounded in the verified code and the review), followed
by the re-run of the combined review — which was performed on 2026-10-17 and
returned **PASS** (`artifacts/SP-108/review.md`). `Needs refinement` items B–D
from the original plan were refined and implemented; their historical rows are
preserved in Git history.

## Child inventory

| ID | Layer / owner | Scope | Dependency | Target size | Jira |
|---|---|---|---|---|---|
| [A](../../jira-sync/tombstones.md#story-sp-108a) | Frontend, `implementer` | Install RTK, store, typed hooks, `Provider` wiring | None | One 30–90 min session | STUDY-37 |
| [B](../../jira-sync/tombstones.md#story-sp-108b) | Frontend, `implementer` | Auth/session state into an RTK `authSlice`; `AuthProvider` becomes a store-backed adapter | A | Cohesive ~2–3h multi-window, 3 checkpoints | STUDY-38 |
| [C](../../jira-sync/tombstones.md#story-sp-108c) | Frontend, `implementer` | RTK Query service (axios baseQuery) replaces every TanStack Query usage | A | Cohesive ~2–3h multi-window, 3 checkpoints | STUDY-39 |
| [D](./SP-108D-tanstack-removal-verification.md) | Frontend/Integration, `implementer` | Remove TanStack deps, repo-doc flip, full verification | B, C | One 30–60 min session | STUDY-40 |
| [E](../../jira-sync/tombstones.md#story-sp-108e) | Frontend, `implementer` | Review fix IR-001: restore `isLoading: true` boot gate + real-guard regression tests | None | One 30–60 min session | STUDY-41 |
| [F](../../jira-sync/tombstones.md#story-sp-108f) | Frontend, `implementer` | Review fix IR-002: thunk/adapter error+loading negative tests | E | One 30–60 min session | STUDY-42 |
| [G](../../jira-sync/tombstones.md#story-sp-108g) | Docs/artifacts, `implementer` | Review fix IR-003: SP-108A implementation record + parent-index repoint | None | One ~20–30 min docs slice (under the code-slice floor, reconstruction-only — rationale in the ticket) | STUDY-43 |

Sequence: A → B → C → D, then the review fix pass **E → F → G** (F after E
because both edit `authSlice.test.ts`; G is independent and placed last).
C is independent of B but ordered to keep one writer.
No parallel implementation.

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| RD1 | **Redux Toolkit is the client-state library** (chosen over Zustand and over the status quo). Includes migrating **all** existing client state into RTK. | User, 2026-10-16: “Migrate everything to RTK and replace architecture decision”. |
| RD2 | **RTK Query fully replaces TanStack Query** for data fetching/mutations; the documented TanStack architecture decision is reversed. | User, 2026-10-16: “Full replace with RTK Query”. |
| RD3 | Auth/session state moves into an RTK `authSlice`; the [SP-105G](../../jira-sync/tombstones.md#story-sp-105g) session-generation/barrier semantics are preserved **exactly**. `AuthProvider` is re-implemented as a store-backed adapter with the same public `AuthContextType` interface, so the 9 `useAuth` consumers and their tests are untouched in B. Removing the adapter later is optional, separately tracked future work — it is not silently dropped, just deferred by design. | Planner, grounded in `AuthContext.tsx` inspection; part of RD1's “everything”. |
| RD4 | **Provisional:** RTK Query uses a **custom axios `baseQuery` delegating to the existing `services/api.ts` instance**, so the single-flight refresh, recovery barrier, session generations and `AUTH_PATHS` handling keep working unchanged. A `fetchBaseQuery` rewrite would discard that SP-105G machinery. Verification task: all `api.test.ts`/`AuthContext.test.tsx`/`recovery.test.ts` generation regression cases must stay green after C. | Planner 2026-10-16, grounded in `api.ts`/`recovery.ts` inspection. |
| RD5 | Story home is a standalone folder `docs/stories/SP-108/` (cross-cutting technical task; not an EP01 capability), milestone **M1**; Jira key Pending creation at planning time; **no Jira sync authorized or performed** then. *(Superseded 2026-10-17: parent verified as STUDY-36, children STUDY-37–STUDY-43.)* | Planner 2026-10-16, per the epics README technical-tasks note. |
| RD6 | The repo still documents TanStack: root `README.md` “State Management” line and `.agents/skills/studypilot-frontend/SKILL.md`. The planner may only write `docs/`; **SP-108D owns the root README line**; the skill text update is flagged to the user/coordinator (out of planner write scope). | Planner 2026-10-16, write-scope rule. |

## Source requirements and test traceability

SP-108 is a user-initiated technical task with no parent-epic ACs. Its original
requirements are the decisions above (RD1/RD2) plus **regression preservation**
of all existing behavior. Story-local requirement IDs (stable):

| Req | Requirement (original user/decision wording) | Owning children |
|---|---|---|
| RQ-108-01 | Install Redux Toolkit and wire the store into the app (RD1) | A |
| RQ-108-02 | All auth/session client state lives in Redux (RD1) | B |
| RQ-108-03 | RTK Query replaces TanStack Query for every data fetch/mutation (RD2) | C |
| RQ-108-04 | No TanStack dependency remains in the web app (RD2) | D |
| RQ-108-05 | SP-105G session-generation/barrier semantics preserved exactly (regression) | B, C (implementation); D (full-suite proof); **SP-108E** (review IR-001: restores the boot-loading part of the same session-restore contract and its regression test) |
| RQ-108-06 | All existing web suites, typecheck and lint stay green throughout (regression; baseline: web suite 11 files / 142 tests green per the SP-105 record) | B, C, D each re-run |

| Test requirement | Owning tests |
|---|---|
| TR-108-01 — store configures, typed hooks dispatch/select, serializability middleware active | A: `src/store/store.test.ts` (new) |
| TR-108-02 — slice/thunk behavior incl. error/loading paths | B: `src/store/authSlice.test.ts` (review IR-002: incomplete — 8 reducer cases only) + existing `AuthContext.test.tsx` (passes unchanged); **fix ownership: SP-108F** (`authSlice.thunks.test.ts` + adapter-callback tests through the real paths) |
| TR-108-03 — SP-105G generation/barrier regression cases keep passing after the state moves | B + C: existing `services/recovery.test.ts`, `services/api.test.ts`, `context/AuthContext.test.tsx` |
| TR-108-04 — RTK Query mutation parity with the old `useMutation` hook contract | C: `src/store/api.test.ts` (new) + existing `useResendVerification` consumers' page tests (Update test wrappers) |
| TR-108-05 — zero `@tanstack` references and dependencies | D: grep proof + full suite |

| Shared DoD | Owner / applicability |
|---|---|
| 1 functional criteria | A, B, C; D verifies integrated behavior. **Review 2026-10-17: FAIL via IR-001** → SP-108E restores/owns A4's behavior clause |
| 2 invalid input validation | B (thunk error paths), C (mutation error parity); no new user inputs created |
| 3 academic data scope | N/A — no academic data or API ownership change; state management only (recorded reason) |
| 4 actionable errors | B, C (sanitized error handling preserved verbatim) |
| 5 loading/empty/error states | N/A for new UI — no new screens; existing states must keep working (B/C regression). **Review 2026-10-17: FAIL via IR-001 (boot loading state)** → SP-108E |
| 6 keyboard, 7 responsive | N/A — no new UI; recorded reason |
| 8 automated business-rule tests | A (store), B (slice/thunks + generation regression), C (RTK Query parity), D (full suite). **Review 2026-10-17: FAIL** (IR-001 guard tests, IR-002 thunk tests missing) → SP-108E + SP-108F |
| 9 API/docs changes | D — root README architecture line flip; story docs. **Review gap: SP-108A missing record (IR-003)** → SP-108G |
| 10 integrated development review | Required; performed by the combined SP-108 final review, not a child |

## Plan correction log

Findings below carry the review's stable IDs from
`artifacts/SP-108/review.md` (combined parent review, pass 1, 2026-10-17, verdict
FAIL; pass 2, 2026-10-17, verdict PASS). Original findings are preserved
verbatim there and are never rewritten here. Per the review cadence, **only the
reviewer closes review findings**; the dispositions below are the reviewer's
verified closures from pass 2, with the polish items explicitly left open.

### IR-001 — Blocker: the boot-session loading gate on guarded routes is gone

- **Discovery:** 2026-10-17, `artifacts/SP-108/review.md` §IR-001 (SP-108A A4
  FAIL, DoD 1/5/8 FAIL; re-verified in code by the planner 2026-10-17:
  `authSlice.ts:14-19` initialises `isLoading: false`;
  `AuthContext.tsx:175-206` dispatches only `setLoading(false)` in the
  `finally`; `ProtectedRoute.tsx`/`PublicRoute.tsx` gate on the flag first).
- **Original finding (preserved, never overwritten):** SP-108B AC3 and the
  README quality gate asserted SP-105G boot semantics preserved "exactly" /
  "Routing/guards unchanged… `isLoading` semantics", while a refreshing
  student on a protected page is redirected to `/login` mid-refresh (URL
  bounce, login flash, deep-link `state.from` lost). Pre-migration value was
  `useState<boolean>(true)` (`SP-108B-auth-state-slice.md:247`),
  contract: `SP-102` doc line 76 and `STUDY-9/implementation.md:99-100`.
- **Root cause in plan:** SP-108B's proposed slice snippet already specified
  `isLoading: false` (ticket line 121) under the "exactly preserved" headline
  — the boot-loading contract was not carried into the slice spec, and no test
  exercises the real route guards (grep-confirmed: no test references
  `ProtectedRoute`/`PublicRoute`).
- **Consequence:** user-visible regression with green tests — the exact class
  of silent regression DoD 8 exists to catch.
- **Correction:** fix planned as
  [SP-108E](../../jira-sync/tombstones.md#story-sp-108e) (initial `isLoading: true`,
  real-guard regression tests, slice-default case updated; the README
  quality-gate row corrected today to stop asserting something untrue).
- **Verification:** reviewer-only — re-run of the combined review after
  E/F/G.
- **Status:** `Closed` — **review pass 2, 2026-10-17 (verdict PASS)**:
  independently verified, not taken from the fix record. `authSlice.ts:19`
  initialises `isLoading: true` with the contract comment at `:16-18`; the boot
  effect still clears it once (`AuthContext.tsx:193-197`); guards gate on the
  flag first (`ProtectedRoute.tsx:8-14`, `PublicRoute.tsx:7-13`). New
  `context/ProtectedRoute.test.tsx` drives the **real** guards (4 cases:
  `:93-104`, `:106-118`, `:120-133`, `:141-157`); read-traced sensitivity shows
  all four are red against the old `isLoading: false` boot value. Slice boot-value
  assertions updated (`authSlice.test.ts:66-74`, `:90-99`). The README
  quality-gate row is still unrestated — planner-owned, tracked as **IR-011**.
  Report: `artifacts/SP-108/review.md` §IR-001.

### IR-002 — Should-fix: SP-108B AC4 thunk error/loading paths have no automated test

- **Discovery:** 2026-10-17, `artifacts/SP-108/review.md` §IR-002 (B4 FAIL,
  DoD 8 FAIL; planner-verified 2026-10-17: `authSlice.test.ts` carries 8
  pure-reducer cases only).
- **Original finding (preserved, never overwritten):** the ticket's named
  thunk cases (`login/register/logout/updateProfile` phases, sanitized-error
  and always-clear-token) were never written; the parent index marked
  TR-108-02 "Pass" without executing evidence; the swallowed-rejection
  defect class SP-108C repaired is untested by construction.
- **Consequence:** a refactor of `authSlice.thunks.ts` or the inline
  register/logout callbacks can break user-facing error handling with a green
  suite.
- **Correction:** fix planned as
  [SP-108F](../../jira-sync/tombstones.md#story-sp-108f) — tests through the real
  production paths (`login`/`updateProfile` thunks; `AuthContext` register/
  logout callbacks), because `registerThunk`/`logoutThunk`
  (`authSlice.thunks.ts:48/:68`) are **dead exports** (review IR-006) and
  tests against them would be vacuous. The parent index's invalid TR-108-02
  "Pass" is repointed by SP-108F's record update.
- **Verification:** reviewer-only — combined re-review after E/F/G.
- **Status:** `Closed` — **review pass 2, 2026-10-17 (verdict PASS)**,
  independently verified. `store/authSlice.thunks.test.ts` (4 cases, real
  `login`/`updateProfile` thunks against mocked `services/auth`) and
  `context/AuthContext.registerLogout.test.tsx` (4 cases, real `register`/
  `logout` adapter callbacks) now cover the sanitized `getErrorMessage` string in
  the slice `error`, the `rejectWithValue` payload, the loading transitions and
  the always-clear-token guarantee on both logout outcomes. The dead
  `registerThunk`/`logoutThunk` exports were correctly not tested (IR-006), so
  the cases are not vacuous; read-traced sensitivity matches the implementer's
  recorded 4-of-8 mutation run. SP-108B's record cites all 8
  (`artifacts/SP-108B/implementation.md:28-29, :39, :45-47`) and the parent's
  TR-108-02 row was repointed with the earlier false "Pass" disclosed
  (`artifacts/SP-108/implementation.md:40`). Residual: the pending phase of
  `register`/`updateProfile` is not directly observed — **IR-012** (polish).
  Report: `artifacts/SP-108/review.md` §IR-002.

### IR-003 — Should-fix: SP-108A has no implementation record

- **Discovery:** 2026-10-17, `artifacts/SP-108/review.md` §IR-003 (SP-108A
  record-completeness FAIL, DoD 9 partial).
- **Original finding (preserved, never overwritten):** `artifacts/SP-108A/`
  contains only `checkpoint.md`; the parent index resolves A's evidence to a
  progress artifact; a checkpoint is explicitly not the final implementation
  record.
- **Consequence:** DoD 9 documentation element unmet for a manifest change and
  the app-wide store; reviewer/AoD evidence path broken for A.
- **Correction:** fix planned as
  [SP-108G](../../jira-sync/tombstones.md#story-sp-108g) — reconstruct the
  record strictly from `checkpoint.md` + git history + the review's verified
  results (no new evidence), and repoint the parent-index row.
- **Verification:** reviewer-only — combined re-review after E/F/G.
- **Status:** `Closed` — **review pass 2, 2026-10-17 (verdict PASS)**,
  independently verified. `artifacts/SP-108A/implementation.md` exists with the
  wiring summary, five-file table, AC1–AC4 rows, deviations and open items; its
  fidelity was checked line by line against `artifacts/SP-108A/checkpoint.md`
  (five-file table, 12 files/145 tests, clean typecheck/lint, empty-reducer
  warning, TanStack-providers note all match) and every verification line is
  marked "per checkpoint; **not re-run**" (`:73-86`) — no fabricated evidence
  found, and A4 is explicitly not self-certified (`:57`). The parent index row for
  A now resolves to the record (`artifacts/SP-108/implementation.md:49`) and
  `artifacts/SP-108A/checkpoint.md` is untouched. Report:
  `artifacts/SP-108/review.md` §IR-003.

### IR-004…IR-008 — polish findings (deferred, optional)

- Recorded by the review as optional polish: stale SP-108B `Status:` line and
  missing CP3 file (IR-004), incomplete parent Git-scope block (IR-005), dead
  `registerThunk`/`logoutThunk`/`selectIsAuthenticated` exports (IR-006), the
  vacuous same-id banner test case (IR-007), `hooks.ts` type-export deviation
  (IR-008). Not planned in this fix pass — the user's request scoped the fix
  to the must-close set (IR-001/002/003). If a fix-child touches a related
  surface by its own scope (F's test-path note cites IR-006), that does not
  open the polish items; they remain individually user-approved work.
- **Status after review pass 2 (2026-10-17): all five still `Open` (polish)**,
  re-verified unchanged against the code: `SP-108B-auth-state-slice.md:7` still
  `Needs refinement` and `artifacts/SP-108B/` still has cp1/cp2 only (IR-004);
  the parent's "Combined Git scope" still ends at `37b9eb3` (IR-005);
  `authSlice.thunks.ts:48`/`:68` and `authSlice.selectors.ts:4` still have zero
  consumers (IR-006); `authSlice.test.ts:39-45` still never dismisses the banner
  before re-setting the same id (IR-007); `hooks.ts:2` still imports the types
  exported from `store.ts:19-20` (IR-008). None blocks sign-off.

### IR-009…IR-012 — new polish findings (review pass 2, 2026-10-17)

Back-filled by the reviewer that raised them; none blocks the PASS verdict.

- **IR-009 (polish)** — `artifacts/SP-108B/implementation.md:52-55` still states
  "82 tests fail because they import `App` … These will be fixed by SP-108C", a
  condition resolved long ago and still presented as current in the record the
  DoD auditor reads; the same section's SP-108F links are inconsistent
  (`checkpoint.md` at `:28-29` vs `implementation.md` at `:39`). Suggested fix:
  delete/date-stamp the superseded bullet and normalise the links.
- **IR-010 (polish)** — the parent index's child table lists A–F but has no row
  for SP-108G (`artifacts/SP-108/implementation.md:47-54`), and its "Combined Git
  scope" block still ends at `37b9eb3`, omitting `02e94a3` and the whole fix pass
  (`b3533a8`, `f059534`, `45e3e54`, `b931451`, `dab1db7`) — the same weakness as
  IR-005 plus an inventory omission.
- **IR-011 (polish, planner-owned)** — IR-001's closure also asked that the
  "Frontend-flow risks" quality-gate row be restated to verified behavior; it
  still reads "**Original Pass is invalid → under correction**" (this file,
  Quality gate table). The untrue assertion is correctly retracted, but the
  promised restatement has not happened, so the planning record understates
  verified behavior. It is planner-owned planning content, outside the reviewer's
  write scope, and is reported rather than rewritten.
- **IR-012 (polish)** — SP-108F AC3 asks that `register` "transitions `isLoading`
  true→false", but `AuthContext.registerLogout.test.tsx:82, :99` assert only the
  settled `false`, and the two `updateProfile` cases
  (`authSlice.thunks.test.ts:102, :117`) likewise observe only the settled value;
  no test observes the pending raise for those two paths, so removing
  `dispatch(setLoading(true))` from `register`/`updateProfile` would not fail the
  suite. IR-002's own closure condition is met, so this is not blocking.

**Report:** `artifacts/SP-108/review.md` (the latest saved report is **pass 3**,
2026-10-17; pass 1 is preserved verbatim at commit `b931451` and pass 2's
version at `dab1db7`).

### Pass 3 verification note (review, 2026-10-17, verdict PASS)

Pass 2 returned PASS but could execute no command, so its gates were
implementer-attested. Pass 3 re-reviewed the **same** tree (`HEAD` = `dab1db7`;
no application file changed between the two passes) specifically to attach
**executed** evidence, and re-verified every disposition independently rather
than accepting pass 2's or the fix records' claims.

- **Closed and re-verified with executed gates:** IR-001 (`authSlice.ts:19`
  boot `isLoading: true`, guards gate first at `ProtectedRoute.tsx:8-14` /
  `PublicRoute.tsx:7-13`; 4 real-guard cases in `context/ProtectedRoute.test.tsx`
  executed green), IR-002 (`store/authSlice.thunks.test.ts` 4 +
  `context/AuthContext.registerLogout.test.tsx` 4, all executed green; the dead
  `registerThunk`/`logoutThunk` exports still have zero consumers, so the tests
  are not vacuous), IR-003 (`artifacts/SP-108A/implementation.md` re-checked
  line by line against `checkpoint.md`; parent-index row A resolves to it;
  `dab1db7` is docs-only).
- **Executed gates (delegated read-only helper; provenance disclosed in the
  report's Limitations):** `pnpm --filter @studypilot/web test` → **18 files /
  178 tests passed, exit 0**; `typecheck` → **exit 0**; `lint` → **exit 0**
  (`--max-warnings 0`); scoped TanStack grep over `apps/web/src`,
  `apps/web/package.json`, `pnpm-lock.yaml`, root `README.md` and the frontend
  skill → **zero matches, exit 1**; per-commit scope for `b3533a8` (one
  production file), `45e3e54` (no production file) and `dab1db7` (docs only).
  DoD 1/5/8/10 remain PASS, now on executed rather than attested evidence.
- **Open polish, re-verified unchanged:** IR-004…IR-012. **No new finding was
  raised in pass 3** — the reviewed application tree is identical to pass 2's.
- **Still CANNOT VERIFY in every pass (named in the verdict line):**
  `pnpm --filter @studypilot/web build`, `pnpm install --frozen-lockfile`, and
  the runtime dev-server smoke (never performed — no registered test-account
  credential; obtaining one would require reading secret files or writing to the
  user's local dev database). Backend suites were not run and are **not** a gap:
  no backend file was changed by this parent scope, verified from the fix-pass
  commit scope and `git status`.
- **IR-011 remains open and is not the reviewer's to rewrite.** The
  "Frontend-flow risks" quality-gate row below still reads "Original Pass is
  invalid → under correction"; pass 3 confirms the underlying behaviour is fixed
  and executed-green, but the restatement is planner-owned planning content
  outside the reviewer's write scope.

## Quality gate (2026-10-16)

| Gate | Status | Evidence / limitation |
|---|---|---|
| Child separation and sizing | Pass | A and D are single-session slices with sizing blocks; B and C are declared cohesive multi-window tasks with bounded checkpoints and named indivisible cores (see each story's Sizing section). Independently verifiable outcomes are separated (install ≠ state migration ≠ data-layer migration ≠ dependency removal). |
| Requirement/test coverage | Pass | RQ-108-01..06 and TR-108-01..05 mapped above; no requirement owned only in prose. |
| Applicable DoD, incl. item 10 | Pass | DoD map above; items 3/5/6/7 marked N/A with reasons; item 10 owned by the combined final review. |
| Contract consistency | Pass | No backend contract touched. RD3/RD4 keep the `AuthContextType` interface and the axios interceptor semantics as the fixed cross-child contracts. |
| Code paths inspected | Pass | `main.tsx`, `App.tsx`, `context/AuthContext.tsx`, `hooks/useResendVerification.ts`, `services/api.ts` (first 120 lines), `services/recovery.ts` (header + generation counter), `apps/web/package.json`; `useAuth`/`@tanstack` consumer grep. RTK Query internals are **not** inspected (library is uninstalled) — flagged as the unverified area in RD4. |
| Frontend-flow risks | **Original Pass is invalid → under correction** | The row asserted "Routing/guards unchanged (RD3 adapter keeps `isAuthenticated`/`isLoading` semantics)" — proven untrue by review IR-001 and planner code inspection 2026-10-17 (boot-restore spinner gate regressed; no real-guard test exists). Under correction by SP-108E; the row is restated to verified behavior after the fix and re-verified by the re-run review. |
| Dependency mapping and sequencing | Pass | A → B → C → D, then the review fix pass E → F → G (F after E; G independent); C independent of B but sequential for one writer. |
| Material decisions | Pass | RD1/RD2 cite explicit user answers (2026-10-16); RD4 marked Provisional with a verification task; RD3/RD5/RD6 planner-grounded. |
| Jira identity/sync | Not applicable | No sync was authorized in that pass; keys are now STUDY-36–STUDY-43 (verified 2026-10-17); no duplicate keys. |

**Outcome:** plan executed — SP-108A–D implemented 2026-10-16; combined review
pass 1 (2026-10-17) returned **FAIL** (IR-001 blocker; IR-002/IR-003 closed by
the fix pass SP-108E → SP-108F → SP-108G, implemented 2026-10-17);
combined review **pass 2 (2026-10-17) returned PASS** — IR-001, IR-002 and IR-003
independently closed, DoD 1/5/8/10 now PASS, IR-004…IR-012 remaining optional
polish (IR-011 planner-owned); **pass 3 (2026-10-17) returned PASS** on the same
tree, re-verifying all twelve dispositions unchanged and raising no new finding,
with the gates now **executed** (web suite 18 files / 178 tests, typecheck, lint
— all green) instead of implementer-attested. `build`,
`pnpm install --frozen-lockfile` and the runtime dev-server smoke remain CANNOT
VERIFY / not performed. Formal sign-off for the parent scope is established by
`artifacts/SP-108/review.md`.
