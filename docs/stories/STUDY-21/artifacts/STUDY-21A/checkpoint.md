# STUDY-21A checkpoint
Updated: 2026-10-18 (local, -0400), implementation complete — all ACs verified, all 8 tests passed, awaiting STUDY-21 parent review
Execution state: [STUDY-21 README queue](../../../README.md#execution-queue) — row STUDY-21A `In progress`
Story: [docs/stories/STUDY-21/STUDY-21A.md](../../../STUDY-21A.md)
Review unit: STUDY-21 parent, index will live at `docs/stories/STUDY-21/artifacts/STUDY-21/`
Role / scope: implementer; shared Prettier package + per-app ESLint configs + script updates + pre-fix + root README docs. Exclusions: pre-commit hooks (21B), CI (21C), application logic changes.

## Repository state
- Workspace / branch: `main`, single shared workspace
- HEAD at last update: `cffc4c2` (user commit of SP-109 artifact deletions); planner commit `7ca4296` (STUDY-21 docs settle) is the parent of HEAD
- Saved work: all STUDY-21A changes uncommitted in the working tree — 81 modified files (mostly prettier reformat of both apps), 1 deleted (`.prettierrc`), untracked: `.prettierrc.cjs`, `packages/`, `docs/stories/STUDY-21/artifacts/STUDY-21A/`; `pnpm-lock.yaml` +79 lines
- Other work to preserve: none else (user commits in parallel — re-check `git log`/`status` before committing; do not `git add -A` blindly)

## Baseline (verified before changes)
- Existing configs (story note "no existing configs" is stale): root `.prettierrc` JSON (settings identical to planned shared config), root `.prettierignore`, `apps/api/.eslintrc.cjs` (extends `prettier` config only, no prettier plugin), `apps/web/.eslintrc.cjs` (react + react-hooks + import + FSD zones; no jsx-a11y, no prettier plugin).
- `apps/web` lacks `prettier`, `eslint-plugin-prettier`, `eslint-plugin-jsx-a11y` in devDependencies.
- Lint baseline: api 0 errors / 1 warning (`no-console` in `src/main.ts`); web passes `--max-warnings 0` clean.
- Prettier check baseline (root config): 51 unformatted files in api, 42 in web → pre-format required by AC-21A-6.
- `apps/api/src/generated/prisma` = generated Prisma client → will be eslint-ignored + excluded from format globs.

## Findings
- F-21A-1 (fixed-in-plan): story "inspected code paths" claims no existing `.eslintrc*`/`.prettierrc*`; both exist (created by STUDY-20/SP-109 work). Disposition: adapt plan — extend existing configs instead of recreating; root `.prettierrc` becomes a pointer to the shared package (single source of truth, AC-01).
- F-21A-2 (settled): prettier 3.9.10 exits 0 for `--write --check` even when it fixes files (verified empirically + source `totalUnformatted && !options.write ? 1 : 0`). A `format` script hardcoding `--write` could never fail `npm run format -- --check` (TR-02/T-21A-8). Disposition: `format` = `--check` mode, `format:write` = `--write` mode; `format -- --write` still works.
- F-21A-3 (fixed): api `format` glob `test/**/*.ts` matches no files (tests live in `src/test`); prettier errors on unmatched patterns. Disposition: format globs = `src/**/*.ts` (covers `src/test`), plus `src/generated` excluded.
- F-21A-4 (open, out of scope, pre-existing): `npx eslint` from `apps/web` fails with a doubled `node_modules/node_modules/.pnpm/...` path — root `node_modules` is in a hybrid/hoisted layout (843 real top-level dirs). `pnpm --filter ... run/exec` and the app `.bin` shims work fine; all story verification uses pnpm. Not fixed here; flag for a future infra story.
- F-21A-5 (settled): plan suggested `eslint-import-resolver-typescript` in web settings; existing config uses `alias` + `node` resolvers and passes. No AC requires a resolver change → keep existing (minimal diff).
- F-21A-6 (settled): plan suggested `@typescript-eslint/no-floating-promises`; it requires type-aware linting (`parserOptions.project`) which no app config defines and no AC requires → not added.
- F-21A-7 (fixed, **deviation from settled D21-6**): `eslint-plugin-jsx-a11y` 6.10.2 (installed from `^6.8.0`) does NOT contain `focus-tabindex` or `jsx-no-target-blank` — verified absent in packed tarballs 6.2.0/6.4.0/6.5.1/6.6.0/6.7.0/6.8.0/6.9.0 too (39 rules in 6.10.2; `recommended` = 34). Disposition: keep 6.10.2 (`recommended` already sets `alt-text: error`, `aria-props: error`, `no-noninteractive-tabindex: warn`); explicit block = `alt-text: error`, `aria-props: error`, `tabindex-no-positive: error` (closest surviving equivalent of `focus-tabindex`); `jsx-no-target-blank` dropped (no equivalent in this plugin version; modern browsers default `rel="noopener"` for `target="_blank"`). Deviation documented in `apps/web/.eslintrc.cjs` + implementation.md; reviewer to adjudicate. Planner commit `7ca4296` settled D21-6 to `recommended` + these 4 rule names — the two named rules do not exist in any registry 6.x build, so the 4-rule list is not implementable as written.
- F-21A-8 (fixed): `pnpm-workspace.yaml` / root `package.json` workspaces used `packages/*`, which does not match the nested `packages/config/prettier` → install failed to link `@studypilot/prettier-config`. Changed to `packages/**` in both.
- F-21A-9 (fixed): prettier 3 `--config` rejects a bare package name (`@studypilot/prettier-config` → YAML Error). Scripts use the relative path `--config ../../packages/config/prettier/.prettierrc.cjs`; the `workspace:*` dep + root pointer remain for editor/robustness.
- F-21A-10 (fixed): prettier 3.9.10 is non-idempotent on a method-chain layout (first `--write` breaks `harness.pendingFor(...).resolve(...)` chains; second write rejoins them; reproduced with a minimal probe, also under default config). Disposition: two `format:write` passes reach the fixed point; recorded here so future format runs are not mistaken for drift.
- F-21A-11 (fixed): pnpm 8 inlines `run` extra-args as raw shell words at the end of the script string (verified with arg probes: `pnpm x -- --check` makes the child see `-- --check`). Prettier treats tokens after `--` as file patterns, so `format -- --check` failed with `No files matching the pattern: "--check"` (exit 2) even on a clean tree. Disposition: `format` scripts wrap the prettier call in a shell function that strips the leading `--` separator (`f() { while [ "$1" = "--" ]; do shift; done; exec prettier ... "$@"; }; f`) — `format`, `format -- --check`, and `format -- --write` all behave correctly.
- F-21A-12 (fixed): api `lint` had no warning gate and `src/main.ts` carried a pre-existing `no-console` warning; AC-21A-5 requires zero errors/warnings without touching app code. Disposition: api `lint` gains `--max-warnings 0` (matches web convention); `.eslintrc.cjs` overrides add `no-console: error` for `src/test/**` (story plan: "error in tests") and `no-console: off` for `src/main.ts` (intentional bootstrap log) — config-only, no app code changed.
- F-21A-13 (fixed): `src/generated` (gitignored Prisma client) matched the api format glob `src/**/*.ts`; a regenerated client would fail `format --check`. Disposition: new `apps/api/.prettierignore` with `src/generated/` (app-level, since prettier resolves ignore files from the run cwd).

## Progress
- [x] Baseline verification (lint both apps, prettier check both apps, config/package inspection)
- [x] AC-21A-1 shared Prettier package `packages/config/prettier/` (`package.json` + `.prettierrc.cjs`; root `.prettierrc` → `.prettierrc.cjs` pointer; workspaces glob `packages/**`)
- [x] AC-21A-2 format scripts reference shared config (both apps: `format` = `--check`, `format:write` = `--write`, `--config ../../packages/config/prettier/.prettierrc.cjs`)
- [x] AC-21A-3 backend ESLint: `plugin:prettier/recommended` (pulls in eslint-plugin-prettier + eslint-config-prettier) + `@typescript-eslint/recommended`; `src/generated` ignored
- [x] AC-21A-4 frontend ESLint: + react, react-hooks, jsx-a11y `recommended` + explicit rules (2 of 4 D21-6 names exist; remap per F-21A-7)
- [x] AC-21A-5 lint clean both apps — api exit 0 with 0 errors/0 warnings (F-21A-12); web exit 0 under `--max-warnings 0`
- [x] AC-21A-6 format check clean (pre-formatted: 51 api + 42 web files; two write passes per F-21A-10; `src/generated` ignored per F-21A-13)
- [x] AC-21A-7 jsx-a11y flags deliberate violation (T-21A-7 probe: `<img>` without alt → `jsx-a11y/alt-text` error, lint exit 1; probe removed)
- [x] AC-21A-8 root README tooling docs (Linting & Formatting section + `packages/` in structure tree)
- Current step: write implementation.md; update queue/story status; commit; request parent review

## Decisions and dependencies
- D21-1/2/6 from parent README (as settled by `7ca4296`) applied: shared package at `packages/config/prettier/`; `.eslintrc.cjs` (ESLint 8.57, no flat config); jsx-a11y `recommended` + explicit rules (see F-21A-7 for the 2-rule deviation).
- Shared package named `@studypilot/prettier-config`; scripts reference the shared file via relative `--config` path (F-21A-9); `workspace:*` dep kept in both apps.
- Root `.prettierrc` JSON replaced by `.prettierrc.cjs` requiring the shared package (editors + root-level runs keep one source of truth).
- Deps added: web `prettier ^3.1.1`, `eslint-plugin-prettier ^5.1.2`, `eslint-plugin-jsx-a11y ^6.8.0` (→6.10.2), `eslint-config-prettier ^9.1.0`; api `eslint-config-prettier`/`eslint-plugin-prettier`/`prettier ^3.1.1`; both `@studypilot/prettier-config workspace:*`.
- Workspaces glob `packages/*` → `packages/**` (F-21A-8) in `pnpm-workspace.yaml` + root `package.json`.

## Verification (final, post-change)
- Baseline (pre-change): api lint 0 errors / 1 warning (`no-console`, `src/main.ts:33`); web lint clean; 51 api + 42 web files unformatted.
- T-21A-1 `pnpm --filter @studypilot/api run lint` → exit 0 (0 errors, 0 warnings under `--max-warnings 0`)
- T-21A-2 `pnpm --filter @studypilot/web run lint` → exit 0 (`--max-warnings 0`)
- T-21A-3 `pnpm lint` (root, `turbo run lint`) → exit 0
- T-21A-4 `pnpm --filter @studypilot/api format -- --check` → exit 0 (bare `format` too)
- T-21A-5 `pnpm --filter @studypilot/web format -- --check` → exit 0 (bare `format` too)
- T-21A-6 temp `console.log` file in `apps/api/src` → api lint exit 1 (no-console warn + `--max-warnings 0`); probe removed
- T-21A-7 temp `<img>` without alt in `apps/web/src` → web lint exit 1 (`jsx-a11y/alt-text`); probe removed
- T-21A-8 temp badly-formatted file in `apps/api/src` → `format -- --check` exit 1; probe removed
- `src/generated` bad-format probe → `format --check` still exit 0 (`.prettierignore` exclusion works)
- `pnpm --filter ... typecheck` both apps → exit 0 (reformatting broke no syntax)
- `pnpm install` → lockfile up to date, 4 workspace projects resolved

## Resume next
1. [x] Wrote `docs/stories/STUDY-21/artifacts/STUDY-21A/implementation.md` (AC outcomes, findings dispositions, verification).
2. [x] Updated parent README queue row + story status to Done/awaiting-review.
3. [ ] Commit scoped work (code + docs together); backfill the commit hash into implementation.md.
4. [ ] Request one independent parent review (reviewer role, review unit STUDY-21); do not self-approve.
- Open for reviewer: F-21A-7 D21-6 rule-name deviation (2 of 4 named rules don't exist in any registry jsx-a11y 6.x build).
