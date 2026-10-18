# STUDY-21B — Pre-commit hooks (husky + lint-staged)

**Stable ID:** STUDY-21B
**Title:** Pre-commit hooks (husky + lint-staged)
**Parent Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)
**Parent Story:** [STUDY-21](./README.md)
**Milestone:** M1
**Layer:** Infrastructure
**Status:** Queued (blocked for implementation)
**Dependencies:** STUDY-21A (configs must exist before hooks reference them)
**Jira:** STUDY-23

## Summary and Bounded Scope

Install and configure `husky` (v9+) and `lint-staged` so that every git commit runs lint and format on **staged files only**. This prevents lint errors and unformatted code from entering the repository. This story does not create ESLint or Prettier configs (those are STUDY-21A) or CI pipelines (those are STUDY-21C).

**Explicit exclusions:**
- No ESLint or Prettier config creation — covered by STUDY-21A.
- No CI pipeline — covered by STUDY-21C.
- No changes to application logic, tests, or existing code.

## Source Requirement References

| ID | Source |
|---|---|
| AC-04 | STUDY-21: A commit with lint errors or unformatted files is rejected or corrected locally by the pre-commit hook. |
| AC-05 | STUDY-21: The rules and how to run/fix them are documented in the README. |
| TR-04 | Pre-commit hook rejects a commit with lint errors or re-formats them. |
| DoD 1, 8, 9, 10 | Shared Definition of Done (functional tooling, test coverage, documentation, integrated review). |

## Acceptance Criteria

- [ ] **AC-21B-1:** `husky` is installed at the root and configured as the git hooks manager (`.husky/` directory created with `husky install`).
- [ ] **AC-21B-2:** `lint-staged` is installed at the root with a configuration mapping file patterns to commands (e.g., `*.ts` → `eslint --fix`, `*.{ts,tsx}` → `prettier --write`).
- [ ] **AC-21B-3:** A pre-commit hook runs `lint-staged` on staged files only (not the entire codebase).
- [ ] **AC-21B-4:** A commit with lint errors on staged files is **rejected** (lint-staged with `--fix` auto-corrects format; lint errors that cannot be auto-fixed block the commit).
- [ ] **AC-21B-5:** A commit with unformatted staged files is auto-corrected by Prettier via lint-staged (the corrected files remain staged for commit).
- [ ] **AC-21B-6:** README documents how the pre-commit hook works and how to bypass it (`git commit --no-verify`) when necessary.

## Tests

| # | Test type | Description |
|---|---|---|
| T-21B-1 | Script verification | `git commit` with a staged file containing a lint error is rejected (or auto-fixed if fixable). |
| T-21B-2 | Script verification | `git commit` with a staged file that is unformatted auto-runs Prettier and includes the formatted version. |
| T-21B-3 | Script verification | `git commit --no-verify` bypasses the hook (documented in README). |
| T-21B-4 | Negative test | Create a staged `.ts` file with a known lint violation that cannot be auto-fixed (e.g., unused variable) and confirm the commit is rejected. |

## Technical Notes

### Inspected code paths (verified)

| Path | Finding |
|---|---|
| `package.json` (root) | No `husky` or `lint-staged` in `devDependencies`. No `prepare` or `postinstall` script. |
| `.` (root) | No `.husky/` directory. No `lint-staged.config.*` file. |
| `apps/api/package.json` | Has `prettier` and `eslint` with `--fix` in scripts. |
| `apps/web/package.json` | Has `eslint` with `--report-unused-disable-directives --max-warnings 0` in scripts. |

### Implementation plan

1. **Install packages at root:** Add `husky` (v9+) and `lint-staged` to root `package.json` `devDependencies`.

2. **Initialize husky:** Run `npx husky init` at the root to create `.husky/` directory with a `pre-commit` hook script.

3. **Configure lint-staged:** Create root `lint-staged.config.mjs` (or inline in `package.json`) mapping:
   - `apps/api/src/**/*.{ts,tsx}` → `eslint --fix "{...}"`
   - `apps/web/src/**/*.{ts,tsx,js,jsx}` → `eslint --fix "{...}"`
   - `apps/api/src/**/*.ts` → `prettier --write "{...}"`
   - `apps/web/src/**/*.{ts,tsx,js,jsx}` → `prettier --write "{...}"`
   - `packages/**/*.{ts,tsx,js,jsx}` → same as above
   - `package.json` files → `prettier --write "{...}"`

4. **Verify:** Test with a staged file containing lint/format violations.

5. **Document:** Update root README and story README with how the hook works and bypass instructions.

### Decisions applied

- **D21-3:** `husky` v9+ with `lint-staged` — staged-files-only to avoid reformatting unrelated files and keep commits focused.

## Definition of Done

- [ ] AC-21B-1 through AC-21B-6 all pass.
- [ ] TR-04 obligation met.
- [ ] DoD items 1 (functional), 8 (tests), 9 (documentation), 10 (review) satisfied.
- [ ] No ESLint/Prettier configs — those are STUDY-21A.
- [ ] No CI workflow — that is STUDY-21C.

## Sizing Block

| Field | Value |
|---|---|
| **Outcome** | Root-level husky + lint-staged configuration; pre-commit hook runs lint/format on staged files; README updated |
| **Time estimate** | 30–60 minutes |
| **Production files** | `package.json` (add `husky`, `lint-staged` to `devDependencies`; add `prepare` script), `.husky/pre-commit` (new), `lint-staged.config.mjs` (new, or inline in package.json), `README.md` (root, document hook), `docs/stories/STUDY-21/README.md` (update) |
| **Test files** | None (script-based verification via T-21B-1 through T-21B-4) |
| **Minimal start context** | Root `package.json` (lines 1–30), `apps/api/package.json` (format script), `apps/web/package.json` (lint script) |
| **Verification commands** | `pnpm install`, `git add <file>`, `git commit` (with test file containing violations) |
| **Dependencies** | STUDY-21A (ESLint and Prettier configs must exist) |
| **Exclusions** | ESLint/Prettier config creation (STUDY-21A), CI workflow (STUDY-21C) |
