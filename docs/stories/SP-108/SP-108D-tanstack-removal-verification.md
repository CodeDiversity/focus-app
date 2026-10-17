# SP-108D: TanStack removal, repo-doc flip, and verification

**Story ID:** SP-108D
**Epic:** Cross-cutting technical task (standalone; see [SP-108](./SP-108.md))
**Milestone:** M1
**Layer / owner:** Frontend/Integration, `implementer` (single writer)
**Status:** Needs refinement (after B/C land)
**Dependencies:** SP-108C (zero remaining TanStack usage), SP-108B (auth fully
off React state)
**Jira key:** Pending creation

## Summary and bounded scope

Remove the now-unused TanStack dependencies, flip the repo's documented
architecture to Redux Toolkit/RTK Query, and record full verification. This is
the integration/index owner for SP-108: it also records the parent index at
`./artifacts/SP-108/implementation.md`. Exclude any code change beyond
dependency/lockfile removal and documentation (all runtime migration is B/C's).

## Source requirements

RQ-108-04, RQ-108-06 (RD2/RD6); TR-108-05; shared
[DoD](../../epics/README.md#definition-of-done) items 1/8/9.

## Acceptance criteria

1. **Dependencies removed:** `@tanstack/react-query` and
   `@tanstack/react-query-devtools` are removed from `apps/web/package.json`
   and the lockfile; `pnpm install` succeeds.
2. **Zero references (grep proof):**
   `grep -r "tanstack\|QueryClient\|useMutation" apps/web/src apps/web/package.json`
   returns no matches.
3. **Docs flip (RD6):** the root `README.md` "State Management" line now
   documents Redux Toolkit + RTK Query (auth state in an RTK slice; server
   data via RTK Query on the axios transport). The
   `.agents/skills/studypilot-frontend/SKILL.md` text still says TanStack —
   **flagged to the user/coordinator** (outside implementation write scope
   unless authorized).
4. **Full verification recorded:** full web suite (baseline 142 tests), API
   unit suite untouched-expected, `typecheck`, `lint` all green; dev-server
   smoke of login → dashboard → logout; parent index written.

## Tests (future obligations)

| Area | File | Named cases |
|---|---|---|
| Regression | full `pnpm --filter @studypilot/web test` | every existing suite green after dependency removal (no stubs added) |
| Proof | grep (AC2) + lockfile diff review | no TanStack package, import, or config remnant |

## Technical notes

- Root `README.md` line 33 currently says “State Management: TanStack Query
  (React Query)” — the flip target (RD6).
- `docs/epics/EP05-student-dashboard.md` line 47 says future dashboard work
  should use TanStack Query — after RD2 this guidance is stale. EP05 is a
  **planning document the planner may update**; flip it to RTK Query
  (implementer must not touch `docs/`; planner performs this flip when D
  completes, or it can be done now — recorded here for the queue).
- Lockfile (`package-lock.json`) changes are part of dependency removal.

## Sizing

- **Outcome:** TanStack is gone from the repo, the docs match reality, and
  full verification is recorded with the SP-108 parent index.
- **Time estimate:** 30–60 min including the full regression run; low
  uncertainty.
- **Files:** `apps/web/package.json`, root `package-lock.json`,
  root `README.md` (one line), `docs/stories/SP-108/artifacts/SP-108/implementation.md`
  (new index); `docs/epics/EP05-student-dashboard.md` (planner performs, not
  the implementer).
- **Start context:** this ticket; [SP-108 README](./README.md) RD2/RD6;
  B/C implementation artifacts; `apps/web/package.json`, root `README.md`.
- **Verification:** commands in AC4; observable pass conditions are the grep
  result and green suites.
- **Dependencies / exclusions:** requires B and C implemented. Excludes new
  features, new slices, any runtime behavior change.

## Definition of Done

DoD 1/8/9 apply; DoD 3/5/6/7 N/A; DoD 10 is the combined SP-108 final review
(this story writes the parent index that review consumes). No passing results
are claimed here.

## Out of scope

- Any runtime/state behavior change (B/C own migration).
- Jira sync (never authorized for SP-108; keys stay Pending creation).
