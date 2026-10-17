# SP-108 Breakdown — Redux Toolkit adoption on the web frontend

**Story type:** Cross-cutting technical task (no single epic owner). Per
[docs/epics/README.md](../../epics/README.md#release-milestones), cross-cutting
technical tasks are tracked as technical stories linked to the appropriate
milestone — this one is **M1**.
**Jira:** Pending creation (no sync authorized/performed).
**Status:** Planned 2026-10-16; all children (A–D) implemented 2026-10-16;
combined parent review 2026-10-17 verdict **FAIL** (IR-001 blocker +
IR-002/IR-003 should-fix) — fix pass planned as SP-108E → SP-108F → SP-108G.

## Execution queue

**Delivery home:** `docs/stories/SP-108/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-108/` (created when the parent
checkpoint/index is written)

**Active substory:** SP-108F — implement the IR-002 thunk/adapter error+loading
negative tests (SP-108E completed 2026-10-17, commit `b3533a8`)

**Next substory:** SP-108G — write the SP-108A implementation record and repoint
the parent index (IR-003), then re-run the combined parent review.

**Implementation owner:** `implementer`, sequential across all layers (all
children are frontend-scope work; single writer).

**Final review:** One combined SP-108 review after every child (incl. fix-pass
children) is implemented; no automatic child reviews. Final artifact path:
`./artifacts/SP-108/review.md`; integration/index owner: SP-108D (parent index
written at `./artifacts/SP-108/implementation.md`). **Combined review run
2026-10-17 — verdict FAIL: DoD 1/5/8/10 fail via IR-001 (blocker) and
IR-002/IR-003 (should-fix).** Fix pass planned as E → F → G; the combined
review is then re-run and only the reviewer closes its findings. The saved
report is under `./artifacts/SP-108/review.md` (parent-replaced latest).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-108A-store-foundation.md) | Implemented — awaiting parent review | None — TanStack Query and AuthContext remain fully operational during this slice | None — but review A4 FAIL (via IR-001); IR-003 record gap open (SP-108G) | `./artifacts/SP-108A/` (checkpoint) |
| [B](./SP-108B-auth-state-slice.md) | Implemented — awaiting parent review | A (store + typed hooks exist) | None — but review B4 FAIL (IR-002 tests missing); IR-001 fix spans B's surface (SP-108E) | `./artifacts/SP-108B/` (checkpoints cp1, cp2) |
| [C](./SP-108C-rtk-query-data-layer.md) | Implemented — awaiting parent review | A (store) landed; independent of B's scope | None — review PASS on all C criteria | `./artifacts/SP-108C/` (checkpoint, implementation) |
| [D](./SP-108D-tanstack-removal-verification.md) | Implemented — awaiting parent review | B, C implemented — met; refined 2026-10-16 | None — but review D4 partial (IR-005 Git-scope polish, deferred) | `./artifacts/SP-108D/` (checkpoint, implementation); parent index `./artifacts/SP-108/implementation.md` |
| [E](./SP-108E-boot-loading-gate-fix.md) | Implemented — awaiting parent review | None (fixes landed SP-108A/B code) — met | None — implemented 2026-10-17 (`b3533a8`): slice boots `isLoading: true`, 4 real-guard regression tests, suite 16 files / 170 tests green | `./artifacts/SP-108E/` (checkpoint, implementation) |
| [F](./SP-108F-thunk-phase-tests.md) | In progress | E (both edit `authSlice.test.ts`; one writer) — met | Implement — thunk/adapter error+loading negative tests (IR-002) | `./artifacts/SP-108F/` (checkpoint) |
| [G](./SP-108G-store-implementation-record.md) | Ready | None | Implement — write `artifacts/SP-108A/implementation.md`, repoint the parent index (IR-003) | record itself; queue evidence cell updated on completion |

The queue is the current execution record. SP-108A–D were implemented
2026-10-16 and reviewed together 2026-10-17; the review returned FAIL, so the
queue's active scope is the fix pass **SP-108E → SP-108F → SP-108G** (each with
a full sizing block grounded in the verified code and the review), followed by
a re-run of the combined review. `Needs refinement` items B–D from the original
plan were refined and implemented; their historical rows are preserved in Git
history.

## Child inventory

| ID | Layer / owner | Scope | Dependency | Target size | Jira |
|---|---|---|---|---|---|
| [A](./SP-108A-store-foundation.md) | Frontend, `implementer` | Install RTK, store, typed hooks, `Provider` wiring | None | One 30–90 min session | Pending creation |
| [B](./SP-108B-auth-state-slice.md) | Frontend, `implementer` | Auth/session state into an RTK `authSlice`; `AuthProvider` becomes a store-backed adapter | A | Cohesive ~2–3h multi-window, 3 checkpoints | Pending creation |
| [C](./SP-108C-rtk-query-data-layer.md) | Frontend, `implementer` | RTK Query service (axios baseQuery) replaces every TanStack Query usage | A | Cohesive ~2–3h multi-window, 3 checkpoints | Pending creation |
| [D](./SP-108D-tanstack-removal-verification.md) | Frontend/Integration, `implementer` | Remove TanStack deps, repo-doc flip, full verification | B, C | One 30–60 min session | Pending creation |
| [E](./SP-108E-boot-loading-gate-fix.md) | Frontend, `implementer` | Review fix IR-001: restore `isLoading: true` boot gate + real-guard regression tests | None | One 30–60 min session | Pending creation |
| [F](./SP-108F-thunk-phase-tests.md) | Frontend, `implementer` | Review fix IR-002: thunk/adapter error+loading negative tests | E | One 30–60 min session | Pending creation |
| [G](./SP-108G-store-implementation-record.md) | Docs/artifacts, `implementer` | Review fix IR-003: SP-108A implementation record + parent-index repoint | None | One ~20–30 min docs slice (under the code-slice floor, reconstruction-only — rationale in the ticket) | Pending creation |

Sequence: A → B → C → D, then the review fix pass **E → F → G** (F after E
because both edit `authSlice.test.ts`; G is independent and placed last).
C is independent of B but ordered to keep one writer.
No parallel implementation.

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| RD1 | **Redux Toolkit is the client-state library** (chosen over Zustand and over the status quo). Includes migrating **all** existing client state into RTK. | User, 2026-10-16: “Migrate everything to RTK and replace architecture decision”. |
| RD2 | **RTK Query fully replaces TanStack Query** for data fetching/mutations; the documented TanStack architecture decision is reversed. | User, 2026-10-16: “Full replace with RTK Query”. |
| RD3 | Auth/session state moves into an RTK `authSlice`; the [SP-105G](../../stories/EP01/SP-105/SP-105G-recovery-session-client.md) session-generation/barrier semantics are preserved **exactly**. `AuthProvider` is re-implemented as a store-backed adapter with the same public `AuthContextType` interface, so the 9 `useAuth` consumers and their tests are untouched in B. Removing the adapter later is optional, separately tracked future work — it is not silently dropped, just deferred by design. | Planner, grounded in `AuthContext.tsx` inspection; part of RD1's “everything”. |
| RD4 | **Provisional:** RTK Query uses a **custom axios `baseQuery` delegating to the existing `services/api.ts` instance**, so the single-flight refresh, recovery barrier, session generations and `AUTH_PATHS` handling keep working unchanged. A `fetchBaseQuery` rewrite would discard that SP-105G machinery. Verification task: all `api.test.ts`/`AuthContext.test.tsx`/`recovery.test.ts` generation regression cases must stay green after C. | Planner 2026-10-16, grounded in `api.ts`/`recovery.ts` inspection. |
| RD5 | Story home is a standalone folder `docs/stories/SP-108/` (cross-cutting technical task; not an EP01 capability), milestone **M1**; Jira key Pending creation; **no Jira sync authorized or performed**. | Planner 2026-10-16, per the epics README technical-tasks note. |
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
`artifacts/SP-108/review.md` (combined parent review, 2026-10-17, verdict
FAIL). Original findings are preserved verbatim there and are never rewritten
here. Per the review cadence, **only the reviewer closes review findings**;
the statuses below are the planner's `Unresolved — fix planned` dispositions
awaiting the re-run review.

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
  [SP-108E](./SP-108E-boot-loading-gate-fix.md) (initial `isLoading: true`,
  real-guard regression tests, slice-default case updated; the README
  quality-gate row corrected today to stop asserting something untrue).
- **Verification:** reviewer-only — re-run of the combined review after
  E/F/G.
- **Status:** `Unresolved` — fix planned; awaiting implementation and reviewer
  closure.

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
  [SP-108F](./SP-108F-thunk-phase-tests.md) — tests through the real
  production paths (`login`/`updateProfile` thunks; `AuthContext` register/
  logout callbacks), because `registerThunk`/`logoutThunk`
  (`authSlice.thunks.ts:48/:68`) are **dead exports** (review IR-006) and
  tests against them would be vacuous. The parent index's invalid TR-108-02
  "Pass" is repointed by SP-108F's record update.
- **Verification:** reviewer-only — combined re-review after E/F/G.
- **Status:** `Unresolved` — fix planned; awaiting implementation and reviewer
  closure.

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
  [SP-108G](./SP-108G-store-implementation-record.md) — reconstruct the
  record strictly from `checkpoint.md` + git history + the review's verified
  results (no new evidence), and repoint the parent-index row.
- **Verification:** reviewer-only — combined re-review after E/F/G.
- **Status:** `Unresolved` — fix planned; awaiting implementation and reviewer
  closure.

### IR-004…IR-008 — polish findings (deferred, optional)

- Recorded by the review as optional polish: stale SP-108B `Status:` line and
  missing CP3 file (IR-004), incomplete parent Git-scope block (IR-005), dead
  `registerThunk`/`logoutThunk`/`selectIsAuthenticated` exports (IR-006), the
  vacuous same-id banner test case (IR-007), `hooks.ts` type-export deviation
  (IR-008). Not planned in this fix pass — the user's request scoped the fix
  to the must-close set (IR-001/002/003). If a fix-child touches a related
  surface by its own scope (F's test-path note cites IR-006), that does not
  open the polish items; they remain individually user-approved work.

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
| Jira identity/sync | Not applicable | No sync authorized; keys Pending creation; no duplicate keys. |

**Outcome:** plan executed — SP-108A–D implemented 2026-10-16; combined review
2026-10-17 returned **FAIL** (IR-001 blocker; IR-002/IR-003 must be closed
before re-review). Fix pass planned and queued: SP-108E → SP-108F → SP-108G.
`Plan Ready` no longer describes the current post-review state; readiness
returns only with the reviewer's passing re-run verdict. Commits: see Git
history (docs-only).
