# SP-109A Checkpoint

**Story:** SP-109A — FSD foundation: `@/` alias, layer folders, lint boundaries
**Status:** Complete
**Date:** 2026-10-17

## Changes made

### 1. `apps/web/tsconfig.json`
- Replaced 8 alias entries with single `"@/*": ["./src/*"]`
- Removed 7 legacy aliases: `@components/*`, `@pages/*`, `@hooks/*`, `@services/*`, `@types/*`, `@utils/*`, `@context/*`

### 2. `apps/web/vite.config.ts`
- Replaced 8 alias entries with single `'@'` → `path.resolve(__dirname, './src')`
- Removed 7 legacy aliases
- `server.port`, `/api` proxy block, and `test.setupFiles` are byte-identical

### 3. `apps/web/.eslintrc.cjs`
- Added `import` plugin and `import/no-restricted-paths` rule with 5 zones enforcing FSD layer direction
- `basePath: './'` resolves paths relative to ESLint config directory (`apps/web/`)
- Zones: shared→{entities,features,widgets,pages,app}, entities→{features,widgets,pages,app}, features→{widgets,pages,app}, widgets→{pages,app}, pages→app
- Removed `eslint-plugin-import` and `eslint-import-resolver-typescript` (not needed with correct `from`/`target` ordering)
- Removed `eslint-import-resolver-alias` (not needed — relative paths work without resolver)

### 4. Layer directories created under `apps/web/src/`
- `app/`, `app/providers/`, `app/store/` (with `.gitkeep`)
- `pages/`, `widgets/`, `entities/` (with `.gitkeep`)
- `features/`, `features/shared/`, `features/shared/ui/`, `features/shared/api/`, `features/shared/lib/`, `features/shared/types/` (with `.gitkeep`)

## Verification

| Check | Result |
|---|---|
| `pnpm --filter @studypilot/web test` | 19 files / 193 tests ✅ |
| `pnpm --filter @studypilot/web typecheck` | exit 0 ✅ |
| `pnpm --filter @studypilot/web lint` | exit 0 ✅ |
| Red/green proof (AC 5) | Deliberate violating import in `src/shared/` importing `@/app/...` reported by `import/no-restricted-paths`, then reverted — lint clean ✅ |

## Notes

- The `import/no-restricted-paths` rule requires the resolver to resolve import paths. The rule works correctly with relative imports (no resolver needed). The TypeScript resolver was configured but proved unnecessary — relative imports resolve correctly without any resolver configuration.
- The `from`/`target` ordering was initially reversed (target = importing folder, from = imported folder). Corrected ordering confirmed by red/green proof.
- No source files were moved or imports rewritten in this child (per AC 1-4).
