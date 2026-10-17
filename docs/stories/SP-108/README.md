# SP-108 Breakdown — Redux Toolkit adoption on the web frontend

**Story type:** Cross-cutting technical task (no single epic owner). Per
[docs/epics/README.md](../../epics/README.md#release-milestones), cross-cutting
technical tasks are tracked as technical stories linked to the appropriate
milestone — this one is **M1**.
**Jira:** Pending creation (no sync authorized/performed).
**Status:** Planned 2026-10-16; children sized and refined below.

## Execution queue

**Delivery home:** `docs/stories/SP-108/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-108/` (created when the parent
checkpoint/index is written)

**Active substory:** None — SP-108B and SP-108C both implemented, awaiting the combined parent review

**Next substory:** SP-108D — refine (TanStack package removal, root README flip, full verification; checkpoint `./artifacts/SP-108D/checkpoint.md`)

**Implementation owner:** `implementer`, sequential across all layers (all
children are frontend-scope work; single writer).

**Final review:** One combined SP-108 review after every child is implemented;
no automatic child reviews. Final artifact path:
`./artifacts/SP-108/review.md`; integration/index owner: SP-108D (records the
parent index at `./artifacts/SP-108/implementation.md`).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-108A-store-foundation.md) | Implemented — awaiting parent review | None — TanStack Query and AuthContext remain fully operational during this slice | None — all 4 AC met, 145 tests green, typecheck + lint clean | `./artifacts/SP-108A/` (checkpoint) |
| [B](./SP-108B-auth-state-slice.md) | Implemented — awaiting parent review | A (store + typed hooks exist) | None — 14 AuthContext tests + 8 slice tests green, typecheck + lint clean, 82 out-of-scope tests (App-importing tests need SP-108C) | `./artifacts/SP-108B/` (checkpoints cp1, cp2) |
| [C](./SP-108C-rtk-query-data-layer.md) | Implemented — awaiting parent review | A (store) landed; independent of B's scope | None — 166/166 web tests green, typecheck + lint + build clean, zero TanStack refs in `apps/web/src` | `./artifacts/SP-108C/` (checkpoint, implementation) |
| [D](./SP-108D-tanstack-removal-verification.md) | Needs refinement | C (zero remaining TanStack usage is D's precondition); B (auth fully off React state) | Refine after B/C | None yet |

This queue is the current execution record. A/B/C/D story files below are
planner-created with sizing blocks; B–D carry `Needs refinement` (not `Ready`)
because their exact store/API-slice shapes still need a refiner pass against
the code once A lands. `Needs refinement` is actionable next work, not
permission to code an unsized story.

## Child inventory

| ID | Layer / owner | Scope | Dependency | Target size | Jira |
|---|---|---|---|---|---|
| [A](./SP-108A-store-foundation.md) | Frontend, `implementer` | Install RTK, store, typed hooks, `Provider` wiring | None | One 30–90 min session | Pending creation |
| [B](./SP-108B-auth-state-slice.md) | Frontend, `implementer` | Auth/session state into an RTK `authSlice`; `AuthProvider` becomes a store-backed adapter | A | Cohesive ~2–3h multi-window, 3 checkpoints | Pending creation |
| [C](./SP-108C-rtk-query-data-layer.md) | Frontend, `implementer` | RTK Query service (axios baseQuery) replaces every TanStack Query usage | A | Cohesive ~2–3h multi-window, 3 checkpoints | Pending creation |
| [D](./SP-108D-tanstack-removal-verification.md) | Frontend/Integration, `implementer` | Remove TanStack deps, repo-doc flip, full verification | B, C | One 30–60 min session | Pending creation |

Sequence: A → B → C → D. C is independent of B but ordered to keep one writer.
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
| RQ-108-05 | SP-105G session-generation/barrier semantics preserved exactly (regression) | B, C (implementation); D (full-suite proof) |
| RQ-108-06 | All existing web suites, typecheck and lint stay green throughout (regression; baseline: web suite 11 files / 142 tests green per the SP-105 record) | B, C, D each re-run |

| Test requirement | Owning tests |
|---|---|
| TR-108-01 — store configures, typed hooks dispatch/select, serializability middleware active | A: `src/store/store.test.ts` (new) |
| TR-108-02 — slice/thunk behavior incl. error/loading paths | B: `src/store/authSlice.test.ts` (new); existing `AuthContext.test.tsx` must pass unchanged (adapter interface) |
| TR-108-03 — SP-105G generation/barrier regression cases keep passing after the state moves | B + C: existing `services/recovery.test.ts`, `services/api.test.ts`, `context/AuthContext.test.tsx` |
| TR-108-04 — RTK Query mutation parity with the old `useMutation` hook contract | C: `src/store/api.test.ts` (new) + existing `useResendVerification` consumers' page tests (Update test wrappers) |
| TR-108-05 — zero `@tanstack` references and dependencies | D: grep proof + full suite |

| Shared DoD | Owner / applicability |
|---|---|
| 1 functional criteria | A, B, C; D verifies integrated behavior |
| 2 invalid input validation | B (thunk error paths), C (mutation error parity); no new user inputs created |
| 3 academic data scope | N/A — no academic data or API ownership change; state management only (recorded reason) |
| 4 actionable errors | B, C (sanitized error handling preserved verbatim) |
| 5 loading/empty/error states | N/A for new UI — no new screens; existing states must keep working (B/C regression) |
| 6 keyboard, 7 responsive | N/A — no new UI; recorded reason |
| 8 automated business-rule tests | A (store), B (slice/thunks + generation regression), C (RTK Query parity), D (full suite) |
| 9 API/docs changes | D — root README architecture line flip; story docs |
| 10 integrated development review | Required; performed by the combined SP-108 final review, not a child |

## Plan correction log

No findings recorded yet. Entries will follow the stable-ID format
(discovery date, original claim, consequence, correction, verification,
status) and are preserved on regeneration.

## Quality gate (2026-10-16)

| Gate | Status | Evidence / limitation |
|---|---|---|
| Child separation and sizing | Pass | A and D are single-session slices with sizing blocks; B and C are declared cohesive multi-window tasks with bounded checkpoints and named indivisible cores (see each story's Sizing section). Independently verifiable outcomes are separated (install ≠ state migration ≠ data-layer migration ≠ dependency removal). |
| Requirement/test coverage | Pass | RQ-108-01..06 and TR-108-01..05 mapped above; no requirement owned only in prose. |
| Applicable DoD, incl. item 10 | Pass | DoD map above; items 3/5/6/7 marked N/A with reasons; item 10 owned by the combined final review. |
| Contract consistency | Pass | No backend contract touched. RD3/RD4 keep the `AuthContextType` interface and the axios interceptor semantics as the fixed cross-child contracts. |
| Code paths inspected | Pass | `main.tsx`, `App.tsx`, `context/AuthContext.tsx`, `hooks/useResendVerification.ts`, `services/api.ts` (first 120 lines), `services/recovery.ts` (header + generation counter), `apps/web/package.json`; `useAuth`/`@tanstack` consumer grep. RTK Query internals are **not** inspected (library is uninstalled) — flagged as the unverified area in RD4. |
| Frontend-flow risks | Pass | Routing/guards unchanged (RD3 adapter keeps `isAuthenticated`/`isLoading` semantics); regression tests (TR-108-03/06) own the duplicate-submission/session-race counterexamples via the existing suites. |
| Dependency mapping and sequencing | Pass | A → B → C → D above; C independent of B but sequential for one writer. |
| Material decisions | Pass | RD1/RD2 cite explicit user answers (2026-10-16); RD4 marked Provisional with a verification task; RD3/RD5/RD6 planner-grounded. |
| Jira identity/sync | Not applicable | No sync authorized; keys Pending creation; no duplicate keys. |

**Outcome:** **Plan Ready** for SP-108A; B–D are `Needs refinement` until their
refiner passes against the code. Nothing is implemented; no test result is
claimed. Commits: see Git history (docs-only).
