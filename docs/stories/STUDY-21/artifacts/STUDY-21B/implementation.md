# STUDY-21B Implementation Record — Pre-commit hooks (husky + lint-staged)

**Story:** [STUDY-21B](../../STUDY-21B.md) · **Parent:** [STUDY-21](../../README.md) · **Milestone:** M1 · **Layer:** Infrastructure · **Jira:** STUDY-23
**Implemented:** 2026-10-18 · **Record written:** 2026-10-18 by the implementer
**Baseline:** `576f073` (HEAD at start; clean tree) · **Commit:** see "Commit scope" below (hash backfilled at closeout)
**State:** Implemented — awaiting the STUDY-21 parent review.

## Summary

Installed `husky` 9.1.7 and `lint-staged` 15.5.2 at the repository root and
configured a `pre-commit` hook that runs `lint-staged` on **staged files only**
(decision D21-3). Staged `apps/api/src/**/*.ts` and `apps/web/src/**/*.{ts,tsx}`
files get `eslint --fix --max-warnings 0` + `prettier --write`;
`packages/**` code files and `**/package.json` get `prettier --write`.
Fixable problems are corrected and re-staged automatically; lint errors that
cannot be auto-fixed reject the commit. The hooks install themselves on
`pnpm install` (root `prepare` script). Root README documents the hook, the
per-pattern table, and the `git commit --no-verify` bypass. No ESLint/Prettier
configs, no CI, no application code — those are STUDY-21A (done) and STUDY-21C
(queued).

The design was first proven in a throwaway sandbox (fresh `git archive` checkout
+ `pnpm install` in `/private/var/folders/.../T/opencode/sp-21b-sandbox`, since
deleted): every hook scenario below passed in the **clean** pnpm layout, then
re-verified in this repository's checkout (a hybrid hoisted layout — F-21B-1).

## Files changed

| File | Action |
|---|---|
| `package.json` (root) | **Modified** — `husky ^9.0.0` + `lint-staged ^15.0.0` devDeps; `prepare: "husky"` script; inline `lint-staged` config (4 pattern groups) |
| `pnpm-lock.yaml` | Lockfile entries for husky 9.1.7 + lint-staged 15.5.2 (and their deps) |
| `.husky/pre-commit` | **New** — `./node_modules/.bin/lint-staged` (AC-21B-1/3) |
| `.husky/_/.gitignore` | **New** (husky-generated, `*`) — keeps the generated `_` hook shims out of Git |
| `README.md` (root) | New "Pre-commit hooks" subsection under Linting & Formatting: pattern table, auto-install, rejection semantics, `--no-verify` bypass, CI note (AC-21B-6) |
| `docs/stories/STUDY-21/README.md` | Execution queue row + active/next fields (closeout) |
| `docs/stories/STUDY-21/STUDY-21B.md` | Status line |
| `docs/stories/STUDY-21/artifacts/STUDY-21B/checkpoint.md` | **New** — durable checkpoint |
| `docs/stories/STUDY-21/artifacts/STUDY-21B/implementation.md` | **New** — this record |

## Acceptance criteria

| # | Criterion | Status | Evidence |
|---|---|---|---|
| AC-21B-1 | `husky` installed at root, configured as git hooks manager, `.husky/` created | ✅ Done (wording nuance F-21B-4: husky v9's command is `husky`, not `husky install`) | `husky 9.1.7` in root devDeps; `pnpm install` ran `prepare` → `husky`; verified `git config core.hooksPath` = `.husky/_`; `.husky/pre-commit` + `.husky/_/` created |
| AC-21B-2 | `lint-staged` installed at root with a pattern→command config | ✅ Done | `lint-staged 15.5.2` in root devDeps; inline `lint-staged` config in root `package.json` (story plan allows "or inline in package.json"): api src ts / web src ts,tsx → `eslint --fix --max-warnings 0` + `prettier --write`; `packages/**` code → `prettier --write` (F-21B-2); `**/package.json` → `prettier --write` |
| AC-21B-3 | Pre-commit runs `lint-staged` on staged files only | ✅ Done | `.husky/pre-commit` = `./node_modules/.bin/lint-staged` (F-21B-5); sandbox test: staged clean file committed while a malformed **unstaged** file in the same directory stayed byte-identical |
| AC-21B-4 | Commit with lint errors on staged files is rejected (auto-fix where possible; unfixable blocks) | ✅ Done | Both layouts: unused-variable `.ts` (api) and missing-`alt` `.tsx` (web, `jsx-a11y/alt-text`) → `husky - pre-commit script failed (code 1)`, no commit created, staged file restored |
| AC-21B-5 | Unformatted staged file auto-corrected by Prettier; corrected file remains staged | ✅ Done | Malformed `.ts` staged → commit succeeded; `git show HEAD:<file>` = formatted version; worktree file matches the commit (lint-staged re-stages modifications) |
| AC-21B-6 | README documents how the hook works and how to bypass it | ✅ Done | Root README "Pre-commit hooks": pattern table, auto-install via `prepare`, rejection semantics, `git commit --no-verify` bypass, "same rules run in CI" note |

TR-04 (pre-commit rejects/re-formats) is met by T-21B-1…T-21B-4 below.

## Tests delivered (script verification)

| # | Test | Result |
|---|---|---|
| T-21B-1 | `git commit` with a staged file containing a lint error → rejected (or auto-fixed if fixable) | Rejected in both clean (sandbox) and hybrid (real repo) layouts: `@typescript-eslint/no-unused-vars` error, husky exit 1, no commit |
| T-21B-2 | `git commit` with an unformatted staged file → Prettier auto-runs, formatted version committed | Commit succeeded; committed bytes = formatted bytes; worktree consistent |
| T-21B-3 | `git commit --no-verify` bypasses the hook | Commit with a lint error succeeded via `--no-verify` (bypass documented in README) |
| T-21B-4 | Staged `.ts` with a known unfixable violation (unused variable) → commit rejected | Rejected (same probe as T-21B-1; `--fix` cannot remove an unused variable) |

Additional scenarios verified in the sandbox: web `jsx-a11y/alt-text` violation
rejected; `packages/**` `.cjs` auto-formatted; `**/package.json` group active;
unstaged files untouched.

## Verification evidence

All real-repo commands run at the repository root (branch `main`, then scratch
branch `21b-hook-verify` for commit tests, deleted after passing):

| Gate | Result |
|---|---|
| `pnpm install` | husky 9.1.7 + lint-staged 15.5.2 installed; `prepare` → `husky` done; `core.hooksPath` = `.husky/_` |
| `pnpm install --frozen-lockfile` | exit 0 — lockfile in sync (the Dockerfile path) |
| `pnpm lint` (root, turbo, both apps) | exit 0 — 2/2 tasks successful |
| `pnpm --filter @studypilot/api format -- --check` | exit 0 |
| `pnpm --filter @studypilot/web format -- --check` | exit 0 |
| Scratch-branch commit tests (hybrid layout) | T-21B-1/4 rejected, T-21B-2 auto-fixed+committed, T-21B-3 bypass OK |
| Sandbox (clean pnpm layout, `git archive` + fresh `pnpm install`) | full matrix above passed; root `eslint`/`prettier` present via pnpm default `public-hoist-pattern` `['*eslint*','*prettier*']` |

No application code, tests, or endpoint behaviour changed; no database or
Prisma impact.

## Deviations from the story's implementation plan

1. **`packages/**` gets `prettier --write` only, not `eslint --fix` (F-21B-2).**
   The plan's "same as above" for `packages/**` is not implementable: no ESLint
   config covers `packages/` or the repository root (STUDY-21A scoped ESLint to
   the two apps), so eslint would fail "No ESLint Configuration found" and
   reject every commit touching a `packages/` file. The glob was extended with
   `cjs,mjs` so the shared `.prettierrc.cjs` is covered.
2. **Web glob is `*.{ts,tsx}`, not `*.{ts,tsx,js,jsx}` (F-21B-3).** Matches the
   app's own lint scope (`eslint . --ext ts,tsx`); no `.js`/`.jsx` files exist
   under `apps/web/src`.
3. **Config is inline in `package.json`, not `lint-staged.config.mjs`.** The
   story explicitly allows either; inline keeps one fewer file.
4. **`.husky/pre-commit` invokes `./node_modules/.bin/lint-staged` directly
   (F-21B-5)** instead of the plan's `npx lint-staged`: `npx` is fragile in this
   checkout's hybrid layout (STUDY-21A F-21A-4) and `pnpm exec` adds implicit
   dep-verification noise and fails cryptically on a malformed `package.json`.
   lint-staged resolves `eslint`/`prettier` itself via `preferLocal` from the
   root `.bin`, so the direct binary loses nothing.
5. **`husky init` was not run (plan step 2).** Its only effects are the
   `prepare` script and a placeholder `pre-commit` (`npm test`); both were
   written directly instead — identical outcome (F-21B-4 covers the v9 command
   name).

## Findings

| ID | Finding | Disposition |
|---|---|---|
| F-21B-1 | This checkout's root `node_modules` is a **hybrid layout** (real npm-style dirs + pnpm symlinks; no `.npmrc` in repo or user config). A fresh `pnpm install` still reproduces root `.bin/eslint` + `.bin/prettier` via pnpm's **default** `public-hoist-pattern` `['*eslint*','*prettier*']` (verified in the sandbox), so root-resolved hook commands are safe in clean *and* hybrid layouts. | Resolved (verified both layouts) |
| F-21B-2 | Story plan's `packages/** → eslint --fix` not implementable (no ESLint config covers `packages/` or root). | Resolved — prettier-only for `packages/**` (deviation 1); a future story may add a packages ESLint config |
| F-21B-3 | Web `.js`/`.jsx` in the plan's glob exceeds the app's lint scope. | Resolved — `ts,tsx` only (deviation 2) |
| F-21B-4 | AC-21B-1 says `husky install`; husky v9 renamed the command to `husky` (same effect: sets `core.hooksPath`). | Resolved — `prepare: "husky"`; wording nuance only |
| F-21B-5 | Hook entry point: direct `.bin` invocation chosen over `npx`/`pnpm exec` (rationale in deviation 4). | Resolved |
| F-21B-6 | lint-staged 15 prints an outer listr group named after the config file (`package.json — N files`) plus one group per pattern — verified against `lib/runAll.js`; normal display, not a bug. | Informational — no action |
| F-21B-7 | A **partial, untracked reviewer report** exists at `docs/stories/STUDY-21/artifacts/STUDY-21/review.md` (STUDY-21A review, "pass 1", ends at an `<!--APPEND-2b-->` marker, **no verdict recorded**) — a reviewer session was interrupted after saving it (mtime 13:46, before this implementation). Preserved untouched; **not** part of this commit. | **Open** — owner: coordinator (resume the reviewer to complete the STUDY-21A review) |

## Open items

- F-21B-7: the interrupted STUDY-21A parent review needs to be resumed/completed
  by the coordinator; the STUDY-21 final gate (all three children) still
  awaits STUDY-21C.
- Nothing else open for this child.

## Out of scope

ESLint/Prettier config creation (STUDY-21A), CI workflow (STUDY-21C),
application logic, tests, endpoint behaviour, database — none changed.

## Commit scope

Scoped paths committed together with this record: root `package.json`,
`pnpm-lock.yaml`, `.husky/` (pre-commit + `_/.gitignore`), root `README.md`,
`docs/stories/STUDY-21/README.md`, `docs/stories/STUDY-21/STUDY-21B.md`,
`docs/stories/STUDY-21/artifacts/STUDY-21B/`. Explicitly **excluded**:
`docs/stories/STUDY-21/artifacts/STUDY-21/review.md` (reviewer's untracked
WIP, F-21B-7).
