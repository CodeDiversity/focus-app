# SP-108D: TanStack removal, repo-doc flip, and verification

**Story ID:** SP-108D
**Epic:** Cross-cutting technical task (standalone; see [SP-108](./SP-108.md))
**Milestone:** M1
**Layer / owner:** Frontend/Integration, `implementer` (single writer)
**Status:** Implemented — awaiting parent review (2026-10-16). TanStack packages
and `package-lock.json` removed, `pnpm-lock.yaml` regenerated, README/skill docs
flipped, 166/166 web tests plus typecheck/lint/build/frozen-lockfile green, AC2
grep zero matches. Evidence: `./artifacts/SP-108D/implementation.md` (and
checkpoint). Dev-server smoke **not performed** — no registered test-account
credential was available; recorded with that reason in the child record. SP-108B
and SP-108C are implemented (`./artifacts/SP-108B/implementation.md`,
`./artifacts/SP-108C/implementation.md`) and `apps/web/src` has zero TanStack
references.
**Dependencies:** SP-108C (zero remaining TanStack usage), SP-108B (auth fully
off React state)
**Jira key:** Pending creation (no sync authorized or performed for SP-108)
**Refined:** 2026-10-16

## Summary and bounded scope

Remove the now-unused TanStack packages from the web workspace and its canonical
lockfile, delete the tracked npm lockfile, flip the two remaining repo documents
that still name TanStack Query, and record full verification plus the SP-108
parent index. This is the integration/index owner for SP-108. No runtime,
component, service or state behavior changes: SP-108A/B/C already moved every
usage, so D's production diff is dependency metadata and documentation only.

## Source requirements

RQ-108-04 (dependency removal), RQ-108-05 and RQ-108-06 (regression proof — no
TanStack removal may regress the SP-105G session-generation/barrier behavior or
any existing web suite); TR-108-05; shared
[DoD](../../epics/README.md#definition-of-done) items 1/8/9.

## Preconditions (Git state, verified 2026-10-16)

SP-108A and SP-108B behavior is implemented but **still uncommitted** in the
working tree: `@reduxjs/toolkit` and `react-redux` added to
`apps/web/package.json`, +82 lines in `pnpm-lock.yaml`, new untracked
`apps/web/src/store/{authSlice.ts,authSlice.thunks.ts,authSlice.selectors.ts,authSlice.test.ts,hooks.ts}`,
a modified `apps/web/src/context/AuthContext.test.tsx`, and untracked
`./artifacts/SP-108A/` and `./artifacts/SP-108B/`. Only SP-108C is committed
(`5308efa`, `7439f8f`, `5cce85e`, `57a8850`, `607917d`).

D must start from a clean tree: the A/B leftovers are committed by the
coordinating implementer **before** D's first commit, so D's removal commit and
its AC2 diff proof contain only D's own files. If that has not happened when D
resumes, reconcile Git state first rather than folding unrelated A/B changes
into D's commits. Note this also means D's `pnpm install` runs on a lockfile
that already carries the Redux additions — the regenerated `pnpm-lock.yaml`
therefore legitimately differs from the committed one by both the Redux entries
(persisted from A/B) and the removed TanStack entries.

## Acceptance criteria

1. **Packages and lockfiles removed.** `@tanstack/react-query` and
   `@tanstack/react-query-devtools` are deleted from
   `apps/web/package.json` (`dependencies`, lines 20–21); `pnpm-lock.yaml` is
   regenerated and contains no `@tanstack` entry; the tracked npm lockfile
   `package-lock.json` is deleted (`git rm package-lock.json`); and
   `pnpm install --frozen-lockfile` succeeds afterwards, matching
   `.github/workflows/ci.yml`.
2. **Zero references (grep proof).**
   `grep -rniE "tanstack|queryclient|usemutation|reactquerydevtools" apps/web/src apps/web/package.json pnpm-lock.yaml README.md .agents/skills/studypilot-frontend/SKILL.md`
   returns **no matches**. Scope is code, config, lockfile and live agent/README
   documentation: `node_modules/` is excluded, and `docs/` is excluded because
   its TanStack mentions are historical records of RD2/RD4 and past stories
   (`docs/stories/SP-108/**`, `docs/artifacts/STUDY-20/implementation.md`).
3. **Docs flip (RD6).** `README.md:33` reads a Redux Toolkit + RTK Query state
   line (auth state in an RTK slice; server data via RTK Query over the shared
   axios transport in `apps/web/src/services/api.ts`), and
   `.agents/skills/studypilot-frontend/SKILL.md` no longer directs implementers
   to TanStack Query — frontmatter `description` (line 3), stack line 12, and
   the data-fetching guidance on line 41. `docs/epics/EP05-student-dashboard.md:47`
   is **already** flipped to RTK Query by the planner; D verifies it and does not
   edit `docs/`.
4. **Full verification recorded.** Child record
   `./artifacts/SP-108D/implementation.md` and parent index
   `./artifacts/SP-108/implementation.md` both written, with: web suite green at
   the current baseline (**15 files / 166 tests**, not the stale 142 in the
   original ticket), `pnpm --filter @studypilot/web typecheck`, `lint` and
   `build` clean, the frozen-lockfile install result, and the AC2 grep result.
   The dev-server smoke (login → dashboard → logout) is performed only if
   Postgres + API + a registered test account are available; otherwise it is
   recorded as not performed with the reason (see Technical notes).

## Tests (future obligations)

No new test files. D adds no runtime behavior, so its test obligation is
regression proof plus the mechanical grep/lockfile checks.

| Area | File / command | Named cases |
|---|---|---|
| Regression | `pnpm --filter @studypilot/web test` | `src/store/store.test.tsx`, `src/store/authSlice.test.ts`, `src/store/api.test.ts` (8), `src/hooks/useResendVerification.test.tsx` (5), `src/context/AuthContext.test.tsx` (14), `src/services/api.test.ts` (14), `src/services/recovery.test.ts` (23) all pass unchanged — 166 total |
| SP-105G barrier regression | same run | session-generation / recovery-barrier cases in `recovery.test.ts` and `api.test.ts` stay green with the packages uninstalled |
| Lockfile consistency (AC1) | `pnpm install --lockfile-only` then `pnpm install --frozen-lockfile` | lockfile matches `apps/web/package.json`; no `@tanstack` key remains; second install is a no-op success, as CI runs it |
| Proof (AC2) | the scoped grep above | zero matches; `git diff --stat` shows only `apps/web/package.json`, `pnpm-lock.yaml`, `package-lock.json` (deleted), `README.md`, `.agents/skills/studypilot-frontend/SKILL.md` and the two artifact files |
| Runtime smoke (conditional) | `pnpm dev` web + API + Postgres | login → dashboard → logout renders and signs out without console errors |

## Technical notes

### Current state (inspected 2026-10-16)

- `apps/web/package.json:20-21` — the only remaining TanStack declarations.
- `apps/web/src/main.tsx` — no `QueryClient`, `QueryClientProvider` or
  `ReactQueryDevtools` (SP-108C CP4); `main.tsx` renders
  `StrictMode > BrowserRouter > Provider(store) > AuthProvider > App`.
- `apps/web/src/test/providers.tsx` — the shared `makeTestStore()` /
  `Providers` wrapper; no test file imports a query client.
- Repo-wide grep: `@tanstack` survives only in `apps/web/package.json`,
  `pnpm-lock.yaml` and `package-lock.json`.
- Lockfiles: `pnpm-lock.yaml` is canonical — root `package.json:29` pins
  `"packageManager": "pnpm@8.15.0"` and CI runs `pnpm install --frozen-lockfile`.
  `package-lock.json` is also tracked but is read by no tool in this repo; the
  docs (`README.md:54`, `README.md:305`) only ever say `pnpm install`.
- Docs flip targets: `README.md:33`; `.agents/skills/studypilot-frontend/SKILL.md`
  lines 3, 12, 41.
- `docs/epics/EP05-student-dashboard.md:47` already names RTK Query (planner
  applied it); the original ticket's "planner performs this flip" note is stale.

### Implementation notes

- Order matters: edit `apps/web/package.json` first, then
  `pnpm install --lockfile-only` to regenerate `pnpm-lock.yaml`, then
  `git rm package-lock.json`, then `pnpm install --frozen-lockfile` as the
  CI-parity check. Running `--frozen-lockfile` before regenerating fails by
  design and is not a defect.
- Commit as two focused commits (per
  `.agents/skills/studypilot-frontend/SKILL.md`): dependency/lockfile removal,
  then the documentation flip + artifacts.
- Artifacts: this story's own checkpoint
  `./artifacts/SP-108D/checkpoint.md` and record
  `./artifacts/SP-108D/implementation.md`; because D is the last child, it also
  writes the parent index `./artifacts/SP-108/implementation.md` indexing A–D,
  the combined Git scope and the commands/results the combined review consumes.
  Do not write `./artifacts/SP-108/review.md` — that is the reviewer's file.
- Manual smoke prerequisites, if attempted: Postgres via `docker compose up db`,
  the API dev server, a registered test account, and API env configuration set
  by the user (JWT secret, database URL). Never read or record secret values; the
  record states only that configuration was present.
- No Prisma model, migration, endpoint, DTO or environment variable is added,
  changed or removed by D.
- Security: no academic data, ownership scoping or user-enumeration surface is
  touched (DoD 3 stays N/A by the parent's recorded reason). Token handling is
  unchanged — still in-memory through `apps/web/src/services/api.ts`; the
  reduction in dependencies removes no auth logic.

### Decisions

| # | Question | Answer |
|---|---|---|
| D1 | Which lockfile(s) does D update? | Regenerate `pnpm-lock.yaml` (canonical, enforced by CI `--frozen-lockfile`) and **delete** the tracked `package-lock.json`. Keeping two lockfiles in a pnpm workspace left a second, drifting source of dependency truth still pinning TanStack. No doc or script references npm. |
| D2 | Who updates `.agents/skills/studypilot-frontend/SKILL.md`? | Authorized in this story: D updates its 3 TanStack lines (description, stack, data-fetching guidance). It is the guidance every frontend implementation session loads, so leaving it would re-teach a removed library. This authorization extends D's file set beyond `docs/`. |
| D3 | How is verification bounded? | Web-only automated gate (`pnpm install --frozen-lockfile`, web test/typecheck/lint/build, scoped grep). No API suite run — D changes no API code and those suites need Postgres. The dev-server smoke is conditional: performed if Postgres + API + a test account are available, otherwise recorded as not performed with the reason rather than silently skipped. |
| D4 | Uncommitted SP-108A/B working-tree changes? | Commit A/B leftovers **before** D starts (coordinating implementer), so D begins from a clean tree. D's commits and its diff-based proof then contain only D's files; folding A/B changes into D's removal commit would make AC2's proof unusable and blur the child boundaries the parent review indexes. |

## Sizing

- **Outcome:** TanStack is absent from the web workspace, lockfiles and live
  repo documentation, and full verification plus the SP-108 parent index are
  recorded.
- **Time estimate:** 45–75 min including the frozen-lockfile install, the full
  web regression run and both artifacts. Uncertainty is concentrated in the
  lockfile regeneration and any smoke setup; the code change itself is two
  deleted lines in one manifest.
- **Files:** production/config — `apps/web/package.json`, `pnpm-lock.yaml`,
  `package-lock.json` (deleted), `README.md` (one line),
  `.agents/skills/studypilot-frontend/SKILL.md` (three lines); documentation —
  `./artifacts/SP-108D/checkpoint.md` (new),
  `./artifacts/SP-108D/implementation.md` (new),
  `./artifacts/SP-108/implementation.md` (new parent index). No application
  source or test file changes.
- **Start context:** this ticket; the [SP-108 README](./README.md) decision
  register (RD2, RD6) and requirement table (RQ-108-04/05/06, TR-108-05);
  `./artifacts/SP-108C/implementation.md` (current baseline and the confirmed
  zero-TanStack state); `apps/web/package.json`; `README.md:33`;
  `.agents/skills/studypilot-frontend/SKILL.md` lines 3, 12, 41.
- **Verification:** the commands in AC4; observable pass conditions are the
  empty grep, the successful frozen-lockfile install, 166/166 green web tests,
  clean typecheck/lint/build, and both artifact files present.
- **Dependencies / exclusions:** requires SP-108B and SP-108C implemented (both
  are) and the SP-108A/B Git precondition above satisfied before D's first
  commit. Excludes runtime/state behavior changes, new slices or features, the
  combined SP-108 review, and any `docs/` edit
  (`docs/epics/EP05-student-dashboard.md` needs no change).

## Definition of Done

DoD 1 (functional criteria), 8 (automated regression proof) and 9 (documented
architecture change) apply. DoD 3/5/6/7 are N/A by the parent's recorded reasons
(no academic-data or ownership change, no new UI). DoD 10 is the combined SP-108
final review; D produces the parent index that review consumes and does not
request or perform a child review. No passing results are claimed here — the
implementer records them in `./artifacts/SP-108D/implementation.md`.

## Out of scope

- Any runtime, component, service or state behavior change (SP-108A/B/C own the
  migration).
- Deleting the now-unused `authService.resendVerification` (kept as C's parity
  reference) and removing the store-backed `AuthProvider` adapter (RD3's
  explicitly deferred future work).
- Any edit under `docs/` — `docs/epics/EP05-student-dashboard.md` is already
  flipped; the SP-108 README/queue and the parent review report belong to the
  planner/reviewer.
- `./artifacts/SP-108/review.md` and any formal review.
- Backend work, new endpoints, Prisma migrations, new environment variables.
- Jira sync (never authorized for SP-108; keys stay Pending creation).