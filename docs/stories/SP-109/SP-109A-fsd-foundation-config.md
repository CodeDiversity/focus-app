# SP-109A: FSD foundation — `@/` alias, layer folders, lint boundaries

**Story ID:** SP-109A
**Epic:** Cross-cutting technical task (standalone; see [SP-109](./SP-109.md))
**Milestone:** M1
**Layer / owner:** Frontend config, `implementer` (single writer)
**Status:** Ready
**Dependencies:** None
**Jira key:** STUDY-45 (verified 2026-10-17)

## Summary and bounded scope

Create the FSD scaffold every later child depends on: one `@/` alias in
`apps/web/tsconfig.json` and `apps/web/vite.config.ts`, the eight unused legacy
aliases removed, the layer directories in place, and ESLint rules that reject
upward imports. **No source file moves and no import is rewritten in this
child** — the app behaves and compiles exactly as it does now, and the full
193-test suite is the proof.

Excluded: any module relocation (B–H), the `src/test/` layer decision (RD8 is
already settled; no change), adding runtime dependencies, and the
red/green enforcement proof (SP-109I).

## Source requirement references

RQ-109-01 (feature-sliced layout exists), RQ-109-05 (direction is enforced),
RQ-109-06 (zero behavior change), RQ-109-07 (stale aliases removed); RD2, RD3,
RD6 in the [breakdown README](./README.md); shared
[DoD](../../epics/README.md#definition-of-done) items 1, 8, 9.

## Acceptance criteria

1. `apps/web/tsconfig.json` `compilerOptions.paths` contains exactly
   `"@/*": ["./src/*"]`; the seven legacy aliases (`@components/*`, `@pages/*`,
   `@hooks/*`, `@services/*`, `@types/*`, `@utils/*`, `@context/*`) are gone.
2. `apps/web/vite.config.ts` `resolve.alias` contains exactly `'@'` →
   `./src` (plus the existing `path.resolve(__dirname, './src')` form used
   today); the seven legacy aliases are gone. The `test.setupFiles`,
   `server.port` and `/api` dev-proxy blocks are byte-identical.
3. The layer directories exist under `apps/web/src`: `app/`,
   `app/providers/`, `app/store/`, `pages/`, `widgets/`, `entities/`,
   `features/`, `shared/ui`, `shared/api`, `shared/lib`, `shared/types`. They may
   be empty except for a `.gitkeep`; git does not track empty directories.
4. `apps/web/.eslintrc.cjs` adds layer-direction rules per RD6 that reject an
   upward import (e.g. a file in `shared/` importing `@/features/...` or
   `@/app/...`) and a cross-layer import that skips a layer downward is not
   flagged. The chosen rule form is recorded in
   `./artifacts/SP-109A/implementation.md` (RD6 verification task); adding
   `eslint-plugin-import` as a devDependency is allowed **only** if the
   `no-restricted-imports` group form cannot express per-layer direction on
   ESLint 8.56.
5. A deliberate violating import is temporarily added to prove rule 4 fires,
   then reverted before the commit; both the failing lint output and the green
   re-run are quoted in `./artifacts/SP-109A/implementation.md`. (SP-109I
   re-proves enforcement after all children land.)
6. `pnpm --filter @studypilot/web test`, `typecheck` and `lint` are green with
   the same 19 files / 193 tests as the baseline.

## Tests (future obligations)

No new test file in this child — the obligations are the existing suite plus
the recorded lint red/green proof.

| Area | Evidence |
|---|---|
| No behavioral change | existing 19 files / 193 tests unchanged (Vitest) |
| Type resolution intact | `pnpm --filter @studypilot/web typecheck` exit 0 |
| Lint rules parse and pass on the current tree | `pnpm --filter @studypilot/web lint` exit 0 |
| Rule actually rejects an upward import | red/green transcript in `./artifacts/SP-109A/implementation.md` (TR-109-04, re-proved in I) |

## Technical notes

### Inspected code (2026-10-17, planner)

- `apps/web/tsconfig.json` — 8 alias entries; `"strict": true`,
  `noUnusedLocals`, `moduleResolution: "bundler"`, `include: ["src"]`.
- `apps/web/vite.config.ts` — 8 aliases in the same order, `test.setupFiles:
  './src/test/setup.ts'`, `server.port: 3000`, `/api` proxy with
  `cookiePathRewrite`.
- `apps/web/.eslintrc.cjs` — `root: true`, `eslint:recommended`,
  `@typescript-eslint/recommended`, react + hooks recommended, `prettier`,
  `--max-warnings 0` in the lint script; `ignorePatterns` excludes
  `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`.
- `apps/web/package.json` — ESLint `^8.56.0`, no `eslint-plugin-import`.
- Import grep over `apps/web/src`: **zero** aliased imports; every local import
  is relative (`./` or `../`). This is why aliasing (RD2) is part of the
  foundation rather than an afterthought.

### Proposed (not verified)

- `no-restricted-imports` with `patterns`/`groups` on `@/...` specifiers is the
  preferred enforcement form (no new dependency). Per-layer *direction*
  normally needs one rule entry per importing folder, which the flat
  `.eslintrc.cjs` cannot express; if so, the fallback is
  `eslint-plugin-import`'s `import/no-restricted-paths` with zones (RD6). The
  implementer decides from a real lint run, not from this note.
- The `@/` alias must be added to **both** configs: `tsconfig.json` for
  `tsc`/IDE, `vite.config.ts` for the dev server, build and Vitest.

## Sizing

- **Outcome:** the FSD scaffold exists and upward imports are lint errors,
  with no application file touched.
- **Time estimate:** 45–60 min including the lint-rule experiment, the
  red/green proof and three verification commands. Low uncertainty: no runtime
  behavior is involved; the only uncertainty is which rule form expresses the
  direction, which has a named fallback.
- **Files:** production — `apps/web/tsconfig.json`, `apps/web/vite.config.ts`,
  `apps/web/.eslintrc.cjs` (modified); `apps/web/package.json` (modified **only**
  if `eslint-plugin-import` is required by RD6); new empty layer folders under
  `apps/web/src/`. Tests — none (existing suite only).
- **Start context:** this ticket; the [breakdown README](./README.md) sections
  *Target structure*, *Import-direction contract*, RD2/RD3/RD6/RD8; the four
  config files listed above; `docs/stories/SP-108/SP-108D-tanstack-removal-verification.md`
  only as a precedent for config-level verification wording.
- **Verification:** `pnpm --filter @studypilot/web test` → 19 files / 193 tests
  pass; `typecheck` → exit 0; `lint` → exit 0; plus the recorded deliberate
  violation proving the rule fires.
- **Dependencies / exclusions:** none. Excludes all file moves (B–H) and the
  boundary re-proof plus docs repointing (I).

## Definition of Done

DoD 1 (criteria pass) and 8 (no regression: existing suite green) apply; DoD 9
is covered by this ticket plus the breakdown's decision register. DoD 2/4/5/6/7
are N/A — no form, error, UI or data-access code changes (reason recorded in the
README DoD map). DoD 10 belongs to the combined SP-109 review. Evidence goes to
`./artifacts/SP-109A/` per
[delivery state](../../../.agents/delivery-state.md).

## Tracker reference

`STUDY-45` — verified 2026-10-17; parent SP-109 is `STUDY-44`
(RD11 superseded: the authorized bootstrap sync created and verified these keys).

## Out of scope

- Moving any module — [SP-109B](./SP-109B-shared-lib-and-types.md) through
  [SP-109H](./SP-109H-pages-and-app-shell.md).
- Final enforcement proof, root `README.md` repoint and full parent verification
  — [SP-109I](./SP-109I-boundaries-docs-verification.md).
