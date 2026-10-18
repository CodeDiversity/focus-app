# STUDY-21A — Shared Prettier + per-app ESLint configs

**Stable ID:** STUDY-21A
**Title:** Shared Prettier + per-app ESLint configs
**Parent Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)
**Parent Story:** [STUDY-21](./README.md)
**Milestone:** M1
**Layer:** Backend + Frontend (cross-cutting)
**Status:** Done — awaiting STUDY-21 parent review (record: `artifacts/STUDY-21A/implementation.md`)
**Dependencies:** None (depends on STUDY-20 scaffold which installed packages)
**Jira:** STUDY-22

## Summary and Bounded Scope

Create a shared Prettier configuration and per-app ESLint configurations (backend and frontend) so that `npm run lint` and `npm run format` work consistently across the monorepo. This story creates the config files; it does not set up pre-commit hooks or CI (those are STUDY-21B and STUDY-21C).

**Explicit exclusions:**
- No pre-commit hooks (husky / lint-staged) — covered by STUDY-21B.
- No CI pipeline — covered by STUDY-21C.
- No changes to application logic, tests, or existing code.

## Source Requirement References

| ID | Source |
|---|---|
| AC-01 | STUDY-21: `npm run lint` and `npm run format` work per app and repo-wide, from a single shared configuration. |
| AC-03 | STUDY-21: jsx-a11y rules are active on the frontend and catch common accessibility violations. |
| AC-05 | STUDY-21: The rules and how to run/fix them are documented in the README. |
| TR-01 | `npm run lint` succeeds on a clean repo (both apps). |
| TR-02 | `npm run format -- --check` fails on intentionally malformed files. |
| TR-05 | jsx-a11y rules fire on a frontend file with a common accessibility violation. |
| DoD 1, 8, 9, 10 | Shared Definition of Done (functional tooling, test coverage, documentation, integrated review). |

## Acceptance Criteria

- [ ] **AC-21A-1:** A shared Prettier config exists at `packages/config/prettier/` (or equivalent shared workspace package) with settings: print width 100, semicolons true, single quotes, trailing comma `es5`.
- [ ] **AC-21A-2:** Both `apps/api/package.json` and `apps/web/package.json` `format` scripts reference the shared Prettier config (e.g., `--config ../../packages/config/prettier/.prettierrc`).
- [ ] **AC-21A-3:** Backend ESLint config enables: `@typescript-eslint/eslint-plugin` strict rules, `eslint-plugin-prettier` (runs Prettier as an ESLint rule), `eslint-config-prettier` (disables conflicting rules).
- [ ] **AC-21A-4:** Frontend ESLint config enables: all backend rules above **plus** `eslint-plugin-react`, `eslint-plugin-react-hooks`, and `eslint-plugin-jsx-a11y` with sensible defaults (at least `alt-text`, `aria-props`, `focus-tabindex`, `jsx-no-target-blank`).
- [ ] **AC-21A-5:** `npm run lint` succeeds on both `apps/api` and `apps/web` with zero errors/warnings on the existing codebase (or existing violations are pre-fixed).
- [ ] **AC-21A-6:** `npm run format -- --check` passes on the existing codebase (or existing files are pre-formatted).
- [ ] **AC-21A-7:** A frontend file with a deliberate jsx-a11y violation (e.g., `<img>` without `alt`) is flagged by `npm run lint` on the frontend.
- [ ] **AC-21A-8:** README documents how to run lint/format per app, the shared config location, and how to disable/override rules.

## Tests

| # | Test type | Description |
|---|---|---|
| T-21A-1 | Script verification | `pnpm --filter @studypilot/api lint` exits 0. |
| T-21A-2 | Script verification | `pnpm --filter @studypilot/web lint` exits 0. |
| T-21A-3 | Script verification | `pnpm lint` (root) exits 0 (delegates to both apps via turbo). |
| T-21A-4 | Script verification | `pnpm --filter @studypilot/api format -- --check` exits 0. |
| T-21A-5 | Script verification | `pnpm --filter @studypilot/web format -- --check` exits 0. |
| T-21A-6 | Negative test | Create a temporary `.ts` file in `apps/api/` with a known lint violation (e.g., `console.log`) and confirm `npm run lint` fails. Remove after test. |
| T-21A-7 | Negative test | Create a temporary `.tsx` file in `apps/web/` with `<img>` missing `alt` attribute and confirm `npm run lint` fails with a jsx-a11y warning/error. Remove after test. |
| T-21A-8 | Negative test | Create a temporary file with intentionally bad formatting and confirm `npm run format -- --check` fails. Remove after test. |

## Technical Notes

### Inspected code paths (verified)

| Path | Finding |
|---|---|
| `apps/api/package.json` | `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-config-prettier`, `eslint-plugin-prettier`, `prettier` already in `devDependencies`. `lint` script: `eslint "{src,apps,libs,test}/**/*.ts" --fix`. `format` script: `prettier --write "src/**/*.ts" "test/**/*.ts"`. |
| `apps/web/package.json` | `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-config-prettier`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-import-resolver-alias`, `eslint-import-resolver-typescript`, `eslint-plugin-import` already in `devDependencies`. `lint` script: `eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`. **Note:** `eslint-plugin-jsx-a11y` is NOT installed — must be added. |
| `package.json` (root) | `lint` script: `turbo run lint` — already delegates to each app. |
| `turbo.json` | `lint` task defined with no caching constraints — adequate. |
| `apps/api/src/` | NestJS modules: `auth`, `users`, plus placeholder modules. No existing `.eslintrc*` or `.prettierrc*` files. |
| `apps/web/src/` | FSD-structured frontend: `app/`, `pages/`, `widgets/`, `features/`, `entities/`, `shared/`, `test/`. No existing `.eslintrc*` or `.prettierrc*` files. |
| `.` (root) | No `.github/` directory (CI workflows to be created in STUDY-21C). No `.husky/` (pre-commit hooks to be created in STUDY-21B). No `.editorconfig`. |

### Implementation plan

1. **Shared Prettier config:** Create `packages/config/prettier/.prettierrc.cjs` (or `.json`) with:
   - `printWidth: 100`
   - `semi: true`
   - `singleQuote: true`
   - `trailingComma: 'es5'`
   - `tabWidth: 2`
   - `useTabs: false`

2. **Backend ESLint config:** Create `apps/api/.eslintrc.cjs` (or `eslint.config.js` if flat config is supported by the installed ESLint 8.x):
   - Extends `eslint:recommended`, `plugin:@typescript-eslint/recommended`, `plugin:prettier/recommended`
   - Parser: `@typescript-eslint/parser`
   - Plugin: `@typescript-eslint/eslint-plugin`
   - Rules: `@typescript-eslint/no-floating-promises`, `@typescript-eslint/no-unused-vars`, `no-console` (warn in production, error in tests)
   - NestJS-specific rules if available via `@nestjs/cli` schematics

3. **Frontend ESLint config:** Create `apps/web/.eslintrc.cjs` (or `eslint.config.js`):
   - Extends everything from backend **plus**:
   - `plugin:react/recommended`, `plugin:react-hooks/recommended`
   - `plugin:jsx-a11y/recommended` (lighter set — explicit rules for `alt-text`, `aria-props`, `focus-tabindex`, `jsx-no-target-blank`)
   - Import resolver: `typescript` + `alias` (already installed)
   - React version detection via `react` package

4. **Add missing package:** Add `eslint-plugin-jsx-a11y` to `apps/web/package.json` `devDependencies`.

5. **Update scripts:** Ensure `apps/api/package.json` and `apps/web/package.json` `format` scripts reference the shared Prettier config. Root `lint` already delegates via turbo.

6. **Pre-fix violations:** Run `npm run lint -- --fix` and `npm run format` on both apps to ensure clean baselines.

7. **Update README:** Document config locations, how to run/fix, and rule overrides.

### Decisions applied

- **D21-1:** Shared Prettier at `packages/config/prettier/` (monorepo workspace package).
- **D21-2:** Use `.eslintrc.cjs` (flat config not supported by ESLint 8.x without adapter; verified installed version is `^8.56.0`).
- **D21-6:** jsx-a11y scoped to frontend `.tsx`/`.jsx` files only.

## Definition of Done

- [ ] AC-21A-1 through AC-21A-8 all pass.
- [ ] All TR-01, TR-02, TR-05 obligations met.
- [ ] DoD items 1 (functional), 8 (tests), 9 (documentation), 10 (review) satisfied.
- [ ] No pre-commit hooks or CI — those are separate stories.

## Sizing Block

| Field | Value |
|---|---|
| **Outcome** | Shared Prettier config + backend ESLint config + frontend ESLint config (with jsx-a11y) + scripts updated + existing code pre-fixed + README updated |
| **Time estimate** | 45–75 minutes |
| **Production files** | `packages/config/prettier/.prettierrc.cjs` (new), `apps/api/.eslintrc.cjs` (new), `apps/web/.eslintrc.cjs` (new), `apps/web/package.json` (add `eslint-plugin-jsx-a11y`), `apps/api/package.json` (update `format` script), `apps/web/package.json` (update `lint`/`format` scripts), `docs/stories/STUDY-21/README.md` (update), `README.md` (root, document tooling) |
| **Test files** | None (script-based verification via T-21A-1 through T-21A-8) |
| **Minimal start context** | `apps/api/package.json` (lines 1–96), `apps/web/package.json` (lines 1–60), `package.json` (lines 1–30), `turbo.json` (lines 1–28), `apps/api/src/` directory listing, `apps/web/src/` directory listing |
| **Verification commands** | `pnpm --filter @studypilot/api lint`, `pnpm --filter @studypilot/web lint`, `pnpm lint`, `pnpm --filter @studypilot/api format -- --check`, `pnpm --filter @studypilot/web format -- --check` |
| **Dependencies** | None (STUDY-20 scaffold installed all required packages) |
| **Exclusions** | Pre-commit hooks (STUDY-21B), CI workflow (STUDY-21C), application code changes |
