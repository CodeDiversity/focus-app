# SP-108D Implementation Record

**Story:** SP-108D (TanStack removal, repo-doc flip, verification)
**Date:** 2026-10-16
**Status:** Implementation complete — awaiting parent review
**Delivery home:** `docs/stories/SP-108/` · **Artifacts:** `./artifacts/SP-108D/`
**Commits:** `32e5dd5` (dependency/lockfile removal), `37b9eb3` (documentation flip)

## Summary

TanStack Query is absent from the web workspace, both lockfiles and the live
repo documentation, with the full web regression suite green afterwards. D added
no runtime behavior: SP-108A/B/C had already moved every usage, so the production
diff is dependency metadata and documentation only. As the last child, D also
wrote the SP-108 parent index at `./artifacts/SP-108/implementation.md`.

## Preconditions (verified before starting)

| Precondition | Result |
|---|---|
| SP-108B implemented | Yes — `./artifacts/SP-108B/implementation.md` |
| SP-108C implemented; zero TanStack in `apps/web/src` | Yes — `./artifacts/SP-108C/implementation.md`; baseline 15 files / 166 tests |
| A/B Git leftovers committed before D's first commit (ticket D4) | Yes — `d164841`. D's combined diff therefore contains only D's files |

The working tree also carried unrelated modified files
(`docs/stories/EP01/SP-105/README.md`, `docs/stories/EP01/SP-105/artifacts/SP-105/review.md`)
from another contributor. They were **not** staged, committed or edited by D and
remain open in the working tree.

## Changes made

### AC1 — packages and lockfiles

| File | Change |
|---|---|
| `apps/web/package.json` | Removed `@tanstack/react-query` and `@tanstack/react-query-devtools` from `dependencies` (2 lines). No other dependency touched. |
| `pnpm-lock.yaml` | Regenerated with `pnpm install --lockfile-only`. `314` lines removed; **0** `@tanstack` keys remain. |
| `package-lock.json` | Deleted with `git rm` (18 181 lines). It was tracked but read by no tool, script or doc in this repo — root `package.json:29` pins `packageManager: pnpm@8.15.0` and CI runs pnpm. Removing it eliminates the second, drifting source of dependency truth that still pinned TanStack (decision D1). |

`pnpm install --frozen-lockfile` — **succeeds** (`Lockfile is up to date, resolution
step is skipped` / `Packages: -35` / `Done in 689ms`), matching
`.github/workflows/ci.yml`. Per the ticket's technical notes the frozen-lockfile
install was run *after* regenerating; running it before would fail by design.

### AC2 — zero references

```text
grep -rniE "tanstack|queryclient|usemutation|reactquerydevtools" \
  apps/web/src apps/web/package.json pnpm-lock.yaml README.md \
  .agents/skills/studypilot-frontend/SKILL.md
→ (no output)   exit code 1
```

Scope note (as refined): `node_modules/` excluded; `docs/` excluded because its
TanStack mentions are historical records of RD2/RD4 and past stories
(`docs/stories/SP-108/**`, `docs/artifacts/STUDY-20/implementation.md`).

### AC3 — documentation flip (RD6)

| File | Line(s) | Change |
|---|---|---|
| `README.md` | 33 | `State Management: TanStack Query (React Query)` → `Redux Toolkit + RTK Query (auth state in an RTK slice; server data via RTK Query over the shared axios transport in apps/web/src/services/api.ts)` |
| `.agents/skills/studypilot-frontend/SKILL.md` | 3 | frontmatter `description`: `TanStack Query data flows` → `RTK Query data flows` |
| same | 12 | stack line: `TanStack Query for data fetching` → `Redux Toolkit + RTK Query for data fetching` |
| same | 41 | guidance: `Compose domain-specific TanStack Query queries` → `Compose domain-specific RTK Query endpoints/services` |

`docs/epics/EP05-student-dashboard.md:47` was **verified** to already read "Use
RTK Query (SP-108 decision RD2…)" — no `docs/` edit was made or needed.

### AC4 — verification

| Gate | Command | Result |
|---|---|---|
| Web regression suite | `pnpm --filter @studypilot/web test` | **15 files / 166 tests passed (166)**, duration 5.19s |
| SP-105G barrier regression | same run | `src/services/recovery.test.ts` (23) and `src/services/api.test.ts` (14) green with the packages uninstalled |
| Typecheck | `pnpm --filter @studypilot/web typecheck` | clean |
| Lint | `pnpm --filter @studypilot/web lint` | clean (`--max-warnings 0`) |
| Production build | `pnpm --filter @studypilot/web build` | ✓ built in 1.01s; `dist/assets/index-D7g_sk5B.js` 451.21 kB (gzip 144.77 kB) |
| Frozen-lockfile install | `pnpm install --frozen-lockfile` | success, `-35` packages |
| AC2 grep | scoped grep above | zero matches |
| Diff containment | `git diff --stat d164841..HEAD` | exactly `apps/web/package.json` (−2), `pnpm-lock.yaml` (−314), `package-lock.json` (deleted), `README.md` (1), `.agents/skills/studypilot-frontend/SKILL.md` (3) + artifact files |

The 166/166 baseline matches SP-108C's recorded result exactly; the original
ticket's "142 tests" figure was stale and was not used.

### Runtime smoke — **not performed** (conditional, per decision D3)

Prerequisite status at attempt time: Docker daemon running, Postgres reachable on
`5432`, API responding on `3000`. The remaining prerequisite — a registered test
account — was **not available**: no test-account credential is recorded anywhere
in the repo, and obtaining one would require either reading environment/secret
files (prohibited by AGENTS.md) or choosing credentials and creating a user in
the user's local development database (an unauthorized environment write).
The smoke is therefore recorded as not performed with this reason rather than
silently skipped. The production build plus the 166-test suite cover the
integration at compile and behavioral level.

## Files changed by D

Production/config: `apps/web/package.json`, `pnpm-lock.yaml`,
`package-lock.json` (deleted), `README.md`,
`.agents/skills/studypilot-frontend/SKILL.md`.
Documentation: `./artifacts/SP-108D/checkpoint.md`,
`./artifacts/SP-108D/implementation.md`, `./artifacts/SP-108/implementation.md`.
No application source or test file changed.

## Requirements satisfied

| Req | Evidence |
|---|---|
| RQ-108-04 — no TanStack dependency remains | AC1 + AC2 (manifest, lockfile, source, docs) |
| RQ-108-05 — SP-105G generation/barrier semantics preserved | `recovery.test.ts` (23) + `api.test.ts` (14) green; D changed no transport code |
| RQ-108-06 — all web suites, typecheck and lint stay green | 166/166, typecheck, lint, build all clean |
| TR-108-05 — zero `@tanstack` references and dependencies | AC2 grep, empty |

## Definition of Done

DoD 1 (functional: TanStack fully removed with no regression), 8 (automated
regression proof: 166 tests + 4 command gates) and 9 (documented architecture
change: README + skill guidance) apply and are satisfied. DoD 3/5/6/7 remain N/A
by the parent's recorded reasons — no academic-data or ownership change, no new
UI. DoD 10 is the combined SP-108 final review, which D does not request or
perform; `./artifacts/SP-108/review.md` is the reviewer's file and was not
written.

## Notes for the combined review

- The dev-server smoke gap is recorded above as the one AC4 element not
  performed, with reason.
- Unrelated open working-tree changes (`docs/stories/EP01/SP-105/**`) belong to
  another contributor and are deliberately outside SP-108's scope.
- RD3's deferred future work stands unchanged: the store-backed `AuthProvider`
  adapter and `authService.resendVerification` remain in place by design.