# EP12C — Unify web API clients per domain

**Stable ID:** EP12C
**Title:** Unify web API clients per domain
**Parent Epic:** [EP12: Tech Debt Cleanup](../../epics/EP12-tech-debt-cleanup.md)
**Parent Story:** [EP12](./README.md)
**Milestone:** M5
**Layer:** Frontend
**Status:** Needs refinement → **Ready** (refined 2026-10-31)
**Dependencies:** EP04/EP05 pages exist. No blocking dependency on other EP12 children.
**Jira:** Pending creation
**Refined:** 2026-10-31

## Summary and Bounded Scope

The dashboard's two RTK Query slices re-state the URL contract of endpoints that the plain-axios
entity clients already own. This story makes the **entity modules the single fetch implementation**
for the two dashboard-consumed reads — the RTK slices delegate to them through a small shared
baseQuery — so each endpoint has one URL, one param builder, one payload type, one fetch path
(D12C-1: *user approval 2026-10-31*, resolving the D404-10/D05-8 tension). Refactor only; no
caller, behavior, or caching change.

**Verified duplication (both transports already share `shared/api/httpClient.ts` — RD4):**

| Endpoint | Entity client (axios, kept as canonical) | RTK slice (URL re-stated, becomes delegating) | Callers |
|---|---|---|---|
| `GET /calendar/events` | `entities/calendar/api/calendarApi.ts:28` (`listCalendarEvents`, params `{from,to}`) | `features/calendar/api/calendarApi.ts:26-30` (literal URL + params) | axios: `pages/calendar/ui/CalendarPage.tsx:97`. RTK: `pages/dashboard/ui/DashboardPage.tsx:139` |
| `GET /assignments` | `entities/assignment/api/assignmentApi.ts:142` (`listAssignments`, whitelisted param builder `:132-141`) | `features/assignments/api/assignmentsApi.ts:24-26` (literal URL, `no-params`) | axios: `AssignmentsPage.tsx:170`, `FinishSessionDialog.tsx:74`, `FocusAssignmentPanel.tsx:28`, `StudyHistoryPage.tsx:76`. RTK: `DashboardPage.tsx:138` |

Writes (`POST/PATCH/DELETE /assignments*`, subtasks) have no duplication — they exist only in
the entity client and are untouched. Payload types are already shared (`CalendarEventsResult`
from `entities/calendar/model/types`, `AssignmentListItem` from `shared/types/academic`).

**Explicit out-of-scope list** (do not drift):
- Migrating pages/dialogs (CalendarPage, AssignmentsPage, focus, history) to RTK hooks — D12C-4.
- Other domains (courses, availability, semesters, study-preferences, focus/session) — follow-up.
- Caching semantics: `keepUnusedDataFor: 60`, `reducerPath`, hook names, `store.ts:15-25` and
  `test/providers.tsx:22-30` registrations — all unchanged. No tag/invalidation system.
- Backend, entity writers, `httpClient`, interceptor chain.

## Source Requirement References

- Tech-debt item **TD-03** (see breakdown README): parallel web API clients duplicating
  endpoint contracts; epic AC "each backend endpoint consumed by the dashboard has a single
  client module; no duplicated URL/params/type contract remains" — satisfied literally by
  D12C-1 (entity module = the single client; RTK slice = caching delegate).
- **Amends** the `features/calendar/api/calendarApi.ts:7-8` recording of **D404-10**
  ("plain-axios entity client per D404-10 (no RTK Query)") and **D05-8** ("the slice imports
  neither another feature nor `entities/`"): after this story the two dashboard slices import
  their entity api module. D404-10/D05-8 remain in force for every other domain.
- Decision record: D12C-1…D12C-5; user approval 2026-10-31.

## Acceptance Criteria

- [ ] **AC-12C-1 (calendar: one client).** `features/calendar/api/calendarApi.ts` no longer
  states the `GET /calendar/events` URL or params: its baseQuery delegates to
  `listCalendarEvents` (entity module keeps URL `:28`, params, payload type). After the change,
  a repo grep finds the literal `/calendar/events` **only** inside `entities/calendar/` (and
  the API's own source, which is out of scope).
- [ ] **AC-12C-2 (assignments: one client).** Same shape for the assignments slice — the
  delegating baseQuery calls `listAssignments`, so the URL, the call, and the param-whitelist
  builder are owned by the entity module only. After the change, a repo grep finds the literal
  `/assignments` outside `entities/assignment/` **only** in the API/axios-guard code that
  already referenced it legitimately (e.g. `AUTH_PATHS`/interceptors if any), and never in
  `features/` slices.
- [ ] **AC-12C-3 (shared delegating baseQuery, one new export).** The delegation helper lives
  in the **existing** `apps/web/src/shared/api/rtkBaseQuery.ts` (no new file): a generic
  `entityBaseQuery<Arg, Result>(fetcher)` returning `BaseQueryFn<Arg, Result, AxiosBaseQueryError>`,
  with the **identical error mapping** as `axiosBaseQuery` — `{ message, code: String(status) }`
  read from the interceptor's rejection shape (`failure.response?.status`). Endpoints use it via
  the arg-passthrough pattern (`query: (arg) => arg`; the helper receives the arg and calls
  `fetcher(arg)`) — see D12C-3.
- [ ] **AC-12C-4 (callers untouched).** Diff touches only the two feature slices,
  `shared/api/rtkBaseQuery.ts`, and their spec files. DashboardPage, CalendarPage,
  AssignmentsPage, FinishSessionDialog, FocusAssignmentPanel, StudyHistoryPage, store,
  test/providers, and every entity module are change-free. (No callsite changes; no
  refetch/invalidation rework — callers refetch exactly as today.)
- [ ] **AC-12C-5 (existing suites green in intent).** Both RTK slice suites
  (`calendarApi.test.ts`, `assignmentsApi.test.ts` — they run against the **real axios
  adapter**, not mocks) pass with at most comment adjustments; both entity suites
  (`calendarApi.test.ts`, `assignmentApi.test.ts` in `entities/`) pass **unchanged**.
- [ ] **AC-12C-6 (new regression guards).** The named new cases in § Tests are added: the
  delegated path is proven to carry the entity client's URL/params (whitelist, `q` trimming)
  and the exact RTK error shape after delegation.
- [ ] **AC-12C-7 (clean gates).** `pnpm --filter @studypilot/web test`, `lint
  --max-warnings 0`, `typecheck`, `build` all exit 0; no new lint warnings.

## Tests

Extend the two RTK slice suites (same real-adapter harness style as `assignmentsApi.test.ts:58ff`):

| Case | Named description | Why |
|---|---|---|
| T-12C-1 | `assignmentsApi` — 'the dashboard read is served by the entity client: unset params send no query string and `q` is trimmed' | pins that the slice now rides the entity whitelist (`assignmentApi.ts:129-143`), not a second contract |
| T-12C-2 | `calendarApi` — 'a 400 answer surfaces the identical error shape after delegation (`{ message, code: "400" }`)' | the load-bearing error-pipeline identity (D12C-1); the suite already has failure fixtures (`assignmentsApi.test.ts:48-56` shape) |
| T-12C-3 | `calendarApi` — 'a 404 answer surfaces `code: "404"` and the uniform message' | DoD 4 (actionable API errors) survives the transport swap |

No new entity-module cases: those contracts are already pinned by `entities/*/*Api.test.ts`
(e.g. `assignmentApi.test.ts:247-309` for `listAssignments`) and must not move.

Verification: `pnpm --filter @studypilot/web test`, `pnpm --filter @studypilot/web lint`,
`pnpm --filter @studypilot/web typecheck`, `pnpm --filter @studypilot/web build`.

## Technical Notes

### Approved architecture (one paragraph)

The entity module stays the client of record (URL, param builder, payload type, fetch). The RTK
slice becomes a **caching decorator** over it: `baseQuery: entityBaseQuery(listCalendarEvents)`
with `query: (arg) => arg`. Everything the dashboard relies on — reducerPath, middleware,
`keepUnusedDataFor: 60`, hook names, `error.code` string statuses — is unchanged, so
`DashboardPage.tsx:138-139` needs no edit.

### Implementer constraints

- **Error mapping is the whole game.** `entityBaseQuery` catch block must be byte-equivalent in
  behavior to `rtkBaseQuery.ts:46-57`: read `failure.response?.status` from the interceptor
  rejection, emit `{ message: failure.message ?? 'An unexpected error occurred', code: String(status)
  }`. Anything clever here breaks the dashboard's error copy and DoD 4.
- **Extend `rtkBaseQuery.ts`, do not create a new file** — `AxiosBaseQueryError` and the mapping
  already live there; splitting the error pipeline across two modules recreates the duplication
  class this story deletes.
- **`query: (arg) => arg` passthrough**: with a delegating baseQuery the endpoint's `query`
  returns the arg unchanged for the helper to forward. For the void-arg assignments endpoint use
  `query: () => undefined` and a fetcher that ignores its arg (`fetcher: () => listAssignments()`).
- **Comment updates mandated:** `calendarApi.ts:5-17` (the D05-1/D05-8/D05-6 header comment) and
  `assignmentsApi.ts:5-14` must be rewritten to record the D12C-1 amendment — URLs no longer
  re-stated here; the entity module owns the contract. Keep the `keepUnusedDataFor` rationale
  comments verbatim.
- **Entity modules get no changes at all** — not even comment churn (their headers, e.g.
  `entities/calendar/api/calendarApi.ts:4-9`, still accurately describe ownership).
- **Do not add tags, invalidations, or `providesTags`** — callers refetch imperatively today;
  introducing invalidation would be a behavior change outside the story.
- **The RTK suites' real-adapter harness survives** because the delegation still routes through
  `httpClient`; the adapter swap (`assignmentsApi.test.ts:58`) keeps working. Only the
  module-level mock targets, if any test mocked `axiosBaseQuery` directly, need re-pointing (none
  found at refinement time).

### Decisions

| ID | Question | Decision | Provenance |
|---|---|---|---|
| D12C-1 | Which unification shape? Entity-owned fetch with RTK delegating, shared contract constants only (two fetch paths remain), or migrating pages to RTK hooks? | **Entity owns the fetch; the two RTK slices delegate via `entityBaseQuery`.** This satisfies the epic AC ("single client module") literally, keeps pages/focus/history untouched, and replaces the smallest new abstraction over the current split. | **User approval 2026-10-31** ("Entity owns fetch, RTK delegates"). |
| D12C-2 | Where does the delegating helper live? | **Extend `shared/api/rtkBaseQuery.ts`** (`entityBaseQuery` + identical error mapping). One error pipeline; no new file. | Refiner 2026-10-31 — the error shape and its documentation already live in this module. |
| D12C-3 | How do endpoints pass their args to the delegated fetcher? | **Arg-passthrough** (`query: (arg) => arg`; `query: () => undefined` for void). Keeps endpoint definitions declarative and the helper generic. | Refiner 2026-10-31. |
| D12C-4 | Do any callers (dashboard/pages/focus/history) change? | **No.** Zero callsite edits; no tag/invalidation rework; caching policy untouched. | Refiner 2026-10-31 — "no behavior change" is the story's charter. |
| D12C-5 | Are other domains (courses, availability, semesters) unified now? | **No** — recorded as follow-up only; this story's blast radius is the two dashboard-consumed GETs. | Refiner 2026-10-31; closure of the draft's open question. |

## Definition of Done

Shared DoD items 1, 4, 8, 10 apply. Item 4 (actionable API errors) is the substance: the
delegated transport must surface errors exactly as the dashboard receives them today (T-12C-2/
T-12C-3 pin it). Items 2, 3, 5, 6, 7, 9 are not applicable (no input, UI, data, or layout
change).

## Tracker reference

Jira key: Pending creation.

## Sizing Block

| Field | Value |
|---|---|
| **Outcome** | One client per in-scope endpoint: the entity modules own URL/params/types/fetch; the two RTK slices delegate through one shared generic in `rtkBaseQuery.ts`; URL literals leave `features/`; all callers and tests keep their behavior. |
| **Request/token estimate** | ~1 request. Three production files with precise, well-pinned changes; the only judgment is byte-equivalent error mapping. |
| **Model recommendation** | 2 (was 3 pre-refinement) — the design choice is settled (D12C-1..4), the suites keep their real-adapter harness, and the diff is small and mechanical. Risk concentrates in the error mapping, which the constraints pin explicitly. |
| **Production files** | `apps/web/src/shared/api/rtkBaseQuery.ts` (add `entityBaseQuery`), `apps/web/src/features/calendar/api/calendarApi.ts` (delegate + rewrite the D05-8/D404-10 recording comment), `apps/web/src/features/assignments/api/assignmentsApi.ts` (delegate + rewrite recording comment) |
| **Test files** | `apps/web/src/features/calendar/api/calendarApi.test.ts` (T-12C-2/3), `apps/web/src/features/assignments/api/assignmentsApi.test.ts` (T-12C-1) |
| **Minimal start context** | `rtkBaseQuery.ts`, the two feature slice files + their tests, the two entity client files (`:25-32`, `:129-144`) |
| **Verification commands** | `pnpm --filter @studypilot/web test`, `pnpm --filter @studypilot/web lint`, `pnpm --filter @studypilot/web typecheck`, `pnpm --filter @studypilot/web build` |
| **Dependencies** | EP04/EP05 pages exist; D12C-1 settled by user approval 2026-10-31 |
| **Exclusions** | pages/hooks migration, other domains, entity writers, caching/tags, backend, `httpClient` |
