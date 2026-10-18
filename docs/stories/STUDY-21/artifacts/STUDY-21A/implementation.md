# STUDY-21A Implementation Record — Shared Prettier + per-app ESLint configs

**Story:** [STUDY-21A](../../STUDY-21A.md) · **Parent:** [STUDY-21](../../README.md) · **Milestone:** M1 · **Layer:** Backend + Frontend (cross-cutting) · **Jira:** STUDY-22
**Implemented:** 2026-10-18 · **Record written:** 2026-10-18 by the implementer
**State:** Implemented — awaiting the STUDY-21 parent review.

## Summary

Created the shared Prettier workspace package (`packages/config/prettier`,
`@studypilot/prettier-config`), pointed both apps' `format` / `format:write`
scripts at it, upgraded both apps' ESLint configs to run Prettier as a rule
(`plugin:prettier/recommended`), added `eslint-plugin-jsx-a11y` to the frontend
(`recommended` + explicit accessibility rules per decision D21-6), pre-fixed the
existing codebase (lint clean, format clean), and documented the tooling in the
root README. No application logic, test, or endpoint behaviour changed; the only
source edits are formatting plus two ESLint config files and two package
manifests. Pre-commit hooks (STUDY-21B) and CI (STUDY-21C) were deliberately
not touched.

## Files changed

| File | Action |
|---|---|
| `packages/config/prettier/package.json` | **New** — `@studypilot/prettier-config` workspace package (AC-21A-1) |
| `packages/config/prettier/.prettierrc.cjs` | **New** — single source of truth: printWidth 100, semi, singleQuote, trailingComma `es5`, tabWidth 2, LF |
| `.prettierrc` | **Deleted** — replaced by the pointer below (settings were identical, F-21A-1) |
| `.prettierrc.cjs` | **New** — root pointer requiring the shared package (editors + root-level runs) |
| `pnpm-workspace.yaml`, `package.json` (root) | `packages/*` → `packages/**` so the nested `packages/config/prettier` resolves (F-21A-8) |
| `pnpm-lock.yaml` | Lockfile entries for the new workspace package + web deps |
| `apps/api/package.json` | `format` = shared-config `--check`, new `format:write`, `lint` gains `--max-warnings 0`, `@studypilot/prettier-config` devDep |
| `apps/api/.eslintrc.cjs` | `prettier` config → `plugin:prettier/recommended`; `no-console` overrides (error in `src/test/**`, off in `src/main.ts`); `src/generated` ignored |
| `apps/api/.prettierignore` | **New** — excludes `src/generated/` (gitignored Prisma client) from formatting (F-21A-13) |
| `apps/web/package.json` | New `format` / `format:write` scripts, `prettier`, `eslint-plugin-prettier`, `eslint-plugin-jsx-a11y`, `eslint-config-prettier`, `@studypilot/prettier-config` devDeps |
| `apps/web/.eslintrc.cjs` | + `plugin:jsx-a11y/recommended` + `plugin:prettier/recommended`; explicit `alt-text` / `aria-props` / `tabindex-no-positive` rules (D21-6, with the F-21A-7 deviation noted in-file) |
| 72 app source files (30 api + 42 web) | Formatting-only pre-format pass (quotes, line breaks, trailing commas per the shared config); verified whitespace/quote-level changes only, typecheck + full test suites green |
| `README.md` (root) | New "Linting & Formatting" section (commands, shared config location, rule overrides); `packages/` added to the structure tree (AC-21A-8) |
| `docs/stories/STUDY-21/README.md`, `STUDY-21A.md` | Queue row / story status updates |

## Acceptance criteria

| # | Criterion | Status | Evidence |
|---|---|---|---|
| AC-21A-1 | Shared Prettier config at `packages/config/prettier/` with printWidth 100, semi, singleQuote, trailingComma `es5` | ✅ Done | `packages/config/prettier/.prettierrc.cjs` (settings verified in-file); root `.prettierrc.cjs` pointer resolves it (`node -e require` check) |
| AC-21A-2 | Both apps' `format` scripts reference the shared config | ✅ Done | `--config ../../packages/config/prettier/.prettierrc.cjs` in both `format` and `format:write` scripts (relative path because prettier 3 `--config` rejects a bare package name — F-21A-9) |
| AC-21A-3 | Backend ESLint: `@typescript-eslint` rules, `eslint-plugin-prettier`, `eslint-config-prettier` | ✅ Done | `plugin:prettier/recommended` extends (pulls in both prettier packages) + `plugin:@typescript-eslint/recommended`; api `lint` exits 0 |
| AC-21A-4 | Frontend ESLint: backend rules + react, react-hooks, jsx-a11y with sensible defaults (at least `alt-text`, `aria-props`, `focus-tabindex`, `jsx-no-target-blank`) | ✅ Done **with one recorded deviation** — see Deviations 1 | `plugin:jsx-a11y/recommended` + explicit `alt-text: error`, `aria-props: error`, `tabindex-no-positive: error`; `focus-tabindex` / `jsx-no-target-blank` do not exist in any registry 6.x build (F-21A-7) |
| AC-21A-5 | `npm run lint` succeeds on both apps with zero errors/warnings (or pre-fixed) | ✅ Done | api exit 0 with 0 errors / 0 warnings under `--max-warnings 0` (the one pre-existing `no-console` warning in `src/main.ts` handled by a config override — no app code touched, F-21A-12); web exit 0 under its existing `--max-warnings 0` |
| AC-21A-6 | `npm run format -- --check` passes on the existing codebase (or pre-formatted) | ✅ Done | 72 files pre-formatted (two `format:write` passes — prettier 3.9.10 chain non-idempotency, F-21A-10); `format` and `format -- --check` both exit 0 in both apps (T-21A-4/5) |
| AC-21A-7 | A frontend file with a deliberate jsx-a11y violation is flagged by `npm run lint` | ✅ Done | T-21A-7: temp `.tsx` with `<img>` lacking `alt` → `jsx-a11y/alt-text` error, lint exit 1; probe removed |
| AC-21A-8 | README documents how to run lint/format per app, the shared config location, and how to disable/override rules | ✅ Done | Root README "Linting & Formatting" section: per-app `pnpm --filter` commands, `packages/config/prettier` location, `eslint-disable` + `overrides` usage, shared-config change procedure |

## Tests delivered (script verification, T-21A-1 … T-21A-8)

| # | Test | Result |
|---|---|---|
| T-21A-1 | `pnpm --filter @studypilot/api run lint` | exit 0 (0 errors, 0 warnings) |
| T-21A-2 | `pnpm --filter @studypilot/web run lint` | exit 0 (`--max-warnings 0`) |
| T-21A-3 | `pnpm lint` (root, `turbo run lint`) | exit 0 |
| T-21A-4 | `pnpm --filter @studypilot/api format -- --check` | exit 0 (bare `format` too) |
| T-21A-5 | `pnpm --filter @studypilot/web format -- --check` | exit 0 (bare `format` too) |
| T-21A-6 | temp `console.log` file in `apps/api/src` → `lint` fails | exit 1 (no-console warn + `--max-warnings 0`); probe removed |
| T-21A-7 | temp `<img>` without `alt` in `apps/web/src` → `lint` fails | exit 1 (`jsx-a11y/alt-text`); probe removed |
| T-21A-8 | temp badly-formatted file in `apps/api/src` → `format -- --check` fails | exit 1; probe removed |

TR-01 (lint succeeds on clean repo, both apps) = T-21A-1/2/3; TR-02 (format
check fails on malformed files) = T-21A-8; TR-05 (jsx-a11y fires) = T-21A-7.

## Verification evidence (all run at completion)

| Gate | Result |
|---|---|
| api lint / web lint / root `pnpm lint` | exit 0 / exit 0 / exit 0 |
| api + web `format` and `format -- --check` (clean tree) | exit 0 (all four invocations) |
| Negative probes T-21A-6/7/8 | all fail as required (exit 1), probes removed |
| `src/generated` bad-format probe | `format --check` still exit 0 (`.prettierignore` exclusion) |
| `pnpm --filter ... typecheck` (both apps) | exit 0 — reformatting broke no syntax |
| Web test suite (`vitest run`) | 19 files / 193 tests passed |
| Api test suite (`jest`, unit) | 22 suites / 258 tests passed, 3 suites + 30 tests skipped (DB-gated integration specs, by design) |
| `pnpm install` | lockfile up to date; 4 workspace projects resolve |

## Deviations and notes

1. **D21-6 rule names not implementable as written (F-21A-7 — reviewer to adjudicate).**
   The settled D21-6 (planner commit `7ca4296`) lists explicit rules
   `alt-text`, `aria-props`, `focus-tabindex`, `jsx-no-target-blank`.
   `eslint-plugin-jsx-a11y` 6.10.2 (installed from `^6.8.0`) contains 39 rules
   and **neither `focus-tabindex` nor `jsx-no-target-blank`** — verified absent
   in packed tarballs 6.2.0/6.4.0/6.5.1/6.6.0/6.7.0/6.8.0/6.9.0 as well.
   Disposition: keep 6.10.2 (its `recommended` set of 34 rules already covers
   the accessibility intent, including `alt-text: error`, `aria-props: error`,
   `no-noninteractive-tabindex: warn`); explicit block = `alt-text: error`,
   `aria-props: error`, `tabindex-no-positive: error` (closest surviving
   equivalent of `focus-tabindex`); `jsx-no-target-blank` dropped (no equivalent
   in this plugin version; modern browsers default `rel="noopener"` for
   `target="_blank"`). The deviation is documented in `apps/web/.eslintrc.cjs`.
   If the reviewer requires the literal rule names, the only path is a
   non-6.x plugin version, which is not available in this registry.
2. **`format` scripts carry a small shell wrapper (F-21A-11).** pnpm 8 inlines
   `run` extra-args as raw shell words; prettier treats tokens after `--` as
   file patterns, so a bare script made `format -- --check` fail (exit 2) even
   on a clean tree. The `format` scripts wrap the prettier call in
   `f() { while [ "$1" = "--" ]; do shift; done; exec prettier … "$@"; }; f`
   so `format`, `format -- --check`, and `format -- --write` all behave
   correctly under both pnpm and npm.
3. **Api `lint` gained `--max-warnings 0` (F-21A-12).** Matches the web
   convention and is required for AC-21A-5's zero-warning bar; the one
   pre-existing warning (`console.log` in `src/main.ts`) is handled by a
   file-scoped `no-console: off` override in the ESLint config — no
   application code was modified (the story excludes app-code changes).
   `no-console` is `error` in `src/test/**` per the story's implementation
   plan ("warn in production, error in tests").
4. **Prettier 3.9.10 non-idempotency (F-21A-10).** A method-chain layout
   (`harness.pendingFor(...).resolve(...)`) is broken by the first `--write`
   and rejoined by a second; two `format:write` passes reach the fixed point.
   Reproduced with a minimal probe (also under the default config) — an
   upstream prettier behaviour, not a config defect. Future `format:write`
   runs on already-stable code are idempotent.
5. **`npx eslint` from `apps/web` is broken pre-existing (F-21A-4, out of
   scope).** Doubled `node_modules/node_modules/.pnpm` path from the hybrid
   hoisted root layout. All verification uses `pnpm --filter … run/exec`;
   flagged for a future infra story.
6. **Workspace glob `packages/*` → `packages/**` (F-21A-8).** The nested
   `packages/config/prettier` did not match the old glob, so the workspace
   package would not have resolved on a fresh install.
7. **Story "inspected code paths" were stale (F-21A-1).** Both apps already
   had `.eslintrc.cjs` and a root `.prettierrc` (from STUDY-20/SP-109 work);
   the plan was adapted to extend the existing configs rather than recreate
   them.

## Open items

- Deviation 1 (D21-6 rule names) is the one item for the parent review to
  adjudicate: accept the remapped rule set (recommended), or direct a
  registry/registry-version investigation. Everything else is settled.

## Out of scope

Pre-commit hooks (STUDY-21B), CI workflow (STUDY-21C), application logic,
tests, and endpoint behaviour — none changed. The 72 pre-formatted source
files are formatting-only (quotes/line-breaks/trailing commas per the shared
config), confirmed by typecheck and the full test suites.
