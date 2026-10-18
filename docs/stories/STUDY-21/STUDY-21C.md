# STUDY-21C — CI lint workflow

**Stable ID:** STUDY-21C
**Title:** CI lint workflow
**Parent Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)
**Parent Story:** [STUDY-21](./README.md)
**Milestone:** M1
**Layer:** Infrastructure
**Status:** Queued (blocked for implementation)
**Dependencies:** STUDY-21A (configs must exist before CI references them)
**Jira:** STUDY-24

## Summary and Bounded Scope

Create a GitHub Actions CI workflow that runs `npm run lint` (via `turbo run lint`) on every push and pull request. The lint step **fails the build** when lint errors are present, matching the CI description from TECH-01 (STUDY-20). This story does not create ESLint or Prettier configs (those are STUDY-21A) or pre-commit hooks (those are STUDY-21B).

**Explicit exclusions:**
- No ESLint or Prettier config creation — covered by STUDY-21A.
- No pre-commit hooks — covered by STUDY-21B.
- No other CI steps (typecheck, tests, Prisma check) — those belong to TECH-01 (STUDY-20) or future stories.

## Source Requirement References

| ID | Source |
|---|---|
| AC-02 | STUDY-21: Lint errors fail CI; formatting is checked in CI. |
| AC-05 | STUDY-21: The rules and how to run/fix them are documented in the README. |
| TR-03 | CI pipeline fails when lint errors are present. |
| DoD 1, 8, 9, 10 | Shared Definition of Done (functional tooling, test coverage, documentation, integrated review). |

## Acceptance Criteria

- [ ] **AC-21C-1:** A GitHub Actions workflow file exists at `.github/workflows/ci.yml` (or equivalent path).
- [ ] **AC-21C-2:** The workflow runs on `push` and `pull_request` events targeting the default branch (and all branches for PRs).
- [ ] **AC-21C-3:** The workflow installs dependencies (`pnpm install` or equivalent) and runs `turbo run lint` (which delegates to each app via `turbo.json`).
- [ ] **AC-21C-4:** The lint step **fails the build** (non-zero exit code) when lint errors are present in either app.
- [ ] **AC-21C-5:** The workflow uses the same Node.js version specified in `package.json` `engines.node` (`>=18.0.0`).
- [ ] **AC-21C-6:** README documents the CI lint step and how to run it locally as a proxy for CI.

## Tests

| # | Test type | Description |
|---|---|---|
| T-21C-1 | Script verification | `pnpm lint` (root) exits 0 on clean code — mirrors what CI runs. |
| T-21C-2 | Negative test | Introduce a lint violation, run `pnpm lint`, confirm exit code is non-zero. Remove violation after test. |
| T-21C-3 | Integration test | Push a commit with a lint violation to a feature branch; confirm the CI check fails on GitHub. |

## Technical Notes

### Inspected code paths (verified)

| Path | Finding |
|---|---|
| `.` (root) | No `.github/` directory exists. No CI workflows. |
| `package.json` (root) | `engines.node: ">=18.0.0"`. `packageManager: "pnpm@8.15.0"`. |
| `turbo.json` | `lint` task defined with no caching — adequate for CI. |
| `apps/api/package.json` | `lint` script: `eslint "{src,apps,libs,test}/**/*.ts" --fix`. |
| `apps/web/package.json` | `lint` script: `eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`. |
| STUDY-20 (Jira) | Description mentions: "CI pipeline: lint, typecheck, tests for both apps; Prisma migration check on backend changes" and "CI runs lint as a failing step, matching TECH-01's pipeline." |

### Implementation plan

1. **Create directory:** `.github/workflows/` at the root.

2. **Create workflow file:** `.github/workflows/ci.yml` with:
   - Trigger: `push` (default branch), `pull_request` (all branches)
   - Job: `lint`
     - `uses: actions/checkout@v4`
     - `uses: pnpm/action-setup@v2`
     - `uses: actions/setup-node@v4` with `node-version: 18` and `cache: 'pnpm'`
     - `run: pnpm install --frozen-lockfile`
     - `run: pnpm lint` (which runs `turbo run lint` → each app's `eslint`)

3. **Verify locally:** `pnpm lint` should pass on clean code (post-STUDY-21A).

4. **Document:** Update root README with CI section describing the lint workflow and how to run it locally.

### Decisions applied

- **D21-4:** GitHub Actions (`.github/workflows/ci.yml`) matching TECH-01's CI description.
- **D21-5:** Node.js 18 (from `engines.node`), pnpm 8.15.0 (from `packageManager`).

## Definition of Done

- [ ] AC-21C-1 through AC-21C-6 all pass.
- [ ] TR-03 obligation met.
- [ ] DoD items 1 (functional), 8 (tests), 9 (documentation), 10 (review) satisfied.
- [ ] No ESLint/Prettier configs — those are STUDY-21A.
- [ ] No pre-commit hooks — those are STUDY-21B.

## Sizing Block

| Field | Value |
|---|---|
| **Outcome** | GitHub Actions CI workflow running `turbo run lint` on push/PR; README updated |
| **Time estimate** | 30–45 minutes |
| **Production files** | `.github/workflows/ci.yml` (new), `README.md` (root, add CI section), `docs/stories/STUDY-21/README.md` (update) |
| **Test files** | None (script-based verification via T-21C-1 through T-21C-3) |
| **Minimal start context** | Root `package.json` (lines 1–30, `engines` + `packageManager`), `turbo.json` (lines 1–28), `apps/api/package.json` (lint script), `apps/web/package.json` (lint script) |
| **Verification commands** | `pnpm lint` (local proxy for CI), push to feature branch (full CI) |
| **Dependencies** | STUDY-21A (ESLint and Prettier configs must exist) |
| **Exclusions** | ESLint/Prettier config creation (STUDY-21A), pre-commit hooks (STUDY-21B), other CI steps (typecheck, tests, Prisma — TECH-01 scope) |
