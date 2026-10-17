# SP-109A Implementation Record

**Story:** SP-109A — FSD foundation: `@/` alias, layer folders, lint boundaries
**Status:** Complete
**Date:** 2026-10-17

## Acceptance criteria

### AC 1: `@/` alias in tsconfig.json ✅
- `apps/web/tsconfig.json` `compilerOptions.paths` now contains exactly `"@/*": ["./src/*"]`
- Seven legacy aliases (`@components/*`, `@pages/*`, `@hooks/*`, `@services/*`, `@types/*`, `@utils/*`, `@context/*`) removed
- Verified: `grep` for legacy aliases returns no matches in `tsconfig.json`

### AC 2: `@` alias in vite.config.ts ✅
- `apps/web/vite.config.ts` `resolve.alias` now contains exactly `'@'` → `path.resolve(__dirname, './src')`
- Seven legacy aliases removed
- `test.setupFiles`, `server.port`, and `/api` dev-proxy blocks are byte-identical

### AC 3: Layer directories exist ✅
Created under `apps/web/src/`:
- `app/`, `app/providers/`, `app/store/`
- `pages/`, `widgets/`, `entities/`
- `features/`, `features/shared/`, `features/shared/ui/`, `features/shared/api/`, `features/shared/lib/`, `features/shared/types/`
- All directories contain `.gitkeep` (git tracks non-empty directories)

### AC 4: ESLint layer-direction rules ✅
- Added `import` plugin and `import/no-restricted-paths` rule to `apps/web/.eslintrc.cjs`
- 5 zones enforcing FSD layer direction:
  1. `src/shared` cannot import from `src/entities|features|widgets|pages|app`
  2. `src/entities` cannot import from `src/features|widgets|pages|app`
  3. `src/features` cannot import from `src/widgets|pages|app`
  4. `src/widgets` cannot import from `src/pages|app`
  5. `src/pages` cannot import from `src/app`
- `basePath: './'` resolves paths relative to ESLint config directory (`apps/web/`)
- RD6 form: `import/no-restricted-paths` zones (fallback — `no-restricted-imports` with `context` not supported by ESLint 8.56)

### AC 5: Red/green proof ✅
- **Red:** Created `src/shared/_test_violation.ts` with import `from '../app/store/store'` (relative path to file in upper layer)
- Lint output:
  ```
  /Users/michael/Documents/GitHub/focus-app/apps/web/src/shared/_test_violation.ts
    3:30  error  Unexpected path "../app/store/store" imported in restricted zone. shared/ files cannot import from entities/, features/, widgets/, pages/, or app/  import/no-restricted-paths
  ```
- **Green:** Removed `_test_violation.ts`; `pnpm --filter @studypilot/web lint` exits 0 (clean)

### AC 6: Full suite green ✅
- `pnpm --filter @studypilot/web test` → 19 files / 193 tests pass
- `pnpm --filter @studypilot/web typecheck` → exit 0
- `pnpm --filter @studypilot/web lint` → exit 0

## Files modified

| File | Change |
|---|---|
| `apps/web/tsconfig.json` | 8 aliases → 1 (`@/*`) |
| `apps/web/vite.config.ts` | 8 aliases → 1 (`@`) |
| `apps/web/.eslintrc.cjs` | Added `import` plugin + `import/no-restricted-paths` rule (5 zones) |
| `apps/web/package.json` | Added `eslint-plugin-import` (devDependency) |

## Files created

| File | Purpose |
|---|---|
| `apps/web/src/app/.gitkeep` | FSD scaffold |
| `apps/web/src/app/providers/.gitkeep` | FSD scaffold |
| `apps/web/src/app/store/.gitkeep` | FSD scaffold |
| `apps/web/src/pages/.gitkeep` | FSD scaffold |
| `apps/web/src/widgets/.gitkeep` | FSD scaffold |
| `apps/web/src/entities/.gitkeep` | FSD scaffold |
| `apps/web/src/features/.gitkeep` | FSD scaffold |
| `apps/web/src/features/shared/.gitkeep` | FSD scaffold |
| `apps/web/src/features/shared/ui/.gitkeep` | FSD scaffold |
| `apps/web/src/features/shared/api/.gitkeep` | FSD scaffold |
| `apps/web/src/features/shared/lib/.gitkeep` | FSD scaffold |
| `apps/web/src/features/shared/types/.gitkeep` | FSD scaffold |

## Deviation from plan

- **RD6 form:** The planner's preferred form was `no-restricted-imports` groups on `@/...` specifiers. However, ESLint 8.56 does not support the `context` option needed to match the importing file's layer. The fallback (`import/no-restricted-paths` zones) was used instead, and works correctly with relative imports (no resolver needed).
- **Resolver configuration:** Multiple resolver configurations were tested (`eslint-import-resolver-typescript`, `eslint-import-resolver-alias`, `node` with `alias`). None were needed — the rule works with relative imports without any resolver configuration.
