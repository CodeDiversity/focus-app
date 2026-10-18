# SP-109I Implementation Record

**Story:** SP-109I — boundary red/green proof, legacy-folder proof, root README repoint, parent verification & index
**Date:** 2026-10-17
**Status:** Implementation complete — awaiting parent review
**Jira:** STUDY-53
**Index owner:** this child (`docs/stories/SP-109/artifacts/SP-109/implementation.md`)

## Summary

Closed the SP-109 parent scope: the FSD layer rules are proven enforced (red/green
lint proof), every legacy folder and stale alias is gone, the single out-of-docs
root reference (`README.md`) is repointed, and the full verification set is green.
This record also writes the parent implementation index consumed by the combined
SP-109 review.

## AC1 — Boundary proof (red / green)

Rule form actually used: **`eslint-plugin-import` `import/no-restricted-paths` zones**
in `apps/web/.eslintrc.cjs` (RD6 — chosen by SP-109A; the planner's docs-only role
could not execute the proof itself). Two deliberate, file-scoping violations were
added as throwaway files, then reverted.

```sh
# RED case 1 — shared/ must not import features/
cat > apps/web/src/shared/__boundary_probe.ts <<'EOF'
import { useAuth } from '@/features/auth/model/AuthContext';
export const probeShared = useAuth;
EOF
# RED case 2 — widgets/ must not import app/
cat > apps/web/src/widgets/__boundary_probe.tsx <<'EOF'
import App from '@/app/App';
export const probeWidgets = App;
EOF

pnpm --filter @studypilot/web lint
```

Verbatim lint output:

```text
/Users/michael/Documents/GitHub/focus-app/apps/web/src/shared/__boundary_probe.ts
  2:25  error  Unexpected path "@/features/auth/model/AuthContext" imported in restricted zone. shared/ files cannot import from entities/, features/, widgets/, pages/, or app/ (except: type-only import of AuthResponse from features/auth/model/types — RD13)  import/no-restricted-paths

/Users/michael/Documents/GitHub/focus-app/apps/web/src/widgets/__boundary_probe.tsx
  2:17  error  Unexpected path "@/app/App" imported in restricted zone. widgets/ files cannot import from pages/ or app/ (use eslint-disable for sanctioned store/hooks exceptions)  import/no-restricted-paths

✖ 2 problems (2 errors, 0 warnings)
ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @studypilot/web@1.0.0 lint … Exit status 1
```

The rule name and message confirm `import/no-restricted-paths` (not
`no-restricted-imports`) is the active mechanism, and both messages name the exact
zone + sanctioned-exception (RD13) — so RD6 and RD13 are demonstrably enforced.

Revert + green:

```sh
rm apps/web/src/shared/__boundary_probe.ts apps/web/src/widgets/__boundary_probe.tsx
pnpm --filter @studypilot/web lint   # exit 0 (no output)
```

Verbatim green output: (empty — lint passes silently on exit 0, as the baseline run
already confirmed). The three test-only `@/app/App` disables added by SP-109H
remain (AC2 of that child); they are lint-clean because they are explicitly
disabled, consistent with the contract's `test/` exemption.

## AC2 — Legacy proof

```text
$ ls apps/web/src
app
entities
features
index.css
main.tsx
pages
shared
test
widgets
```

Exactly the expected set (only the 8 `pages/<route>` subdirectories remain under
`pages/`, not shown by a top-level `ls`).

```text
$ grep -rn "src/components\|src/context\|src/hooks\|src/services\|src/store\|src/types\|src/utils" apps/web/src   # no matches
$ grep -rn "@components/\|@pages/\|@hooks/\|@services/\|@types/\|@utils/\|@context/" apps/web/src                # no matches
$ grep -rn "^@/components\|^@/pages\|^@/hooks\|^@/services\|^@/types\|^@/utils\|^@/context" apps/web/src  # no matches
```

All greps returned zero matches → RD3 (stale aliases removed) and the deleted
legacy folders (`src/components/`, `src/context/`, `src/hooks/`, `src/services/`,
`src/store/`, `src/types/`, `src/utils/`) are confirmed gone.

## AC3 — Docs repoint (RD12)

`git diff README.md`:

```diff
-**State Management**: Redux Toolkit + RTK Query (auth state in an RTK slice; server data via RTK Query over the shared axios transport in `apps/web/src/services/api.ts`)
+**State Management**: Redux Toolkit + RTK Query (auth state in an RTK slice; server data via RTK Query over the shared axios transport in `apps/web/src/shared/api/httpClient.ts`)
```

Only the stale path was repointed. The root `README.md` states no FSD folder
layout, so no layout sentence was added (per AC3).

## AC4 — Full verification

| Check | Command | Result |
|---|---|---|
| Tests | `pnpm --filter @studypilot/web test` | **19 files / 193 tests passed** |
| Typecheck | `pnpm --filter @studypilot/web typecheck` | exit 0 |
| Lint | `pnpm --filter @studypilot/web lint` | exit 0 |
| Build | `pnpm --filter @studypilot/web build` | ✅ built (1557 modules) |
| Dev-server smoke | — | **CANNOT VERIFY** — no runtime dev-server smoke is
authorized in this environment (SP-108 recorded the identical
limitation); `tsc && vite build` + 193 tests is the available net |
| Backend in SP-109 range | `git diff --name-only` over `84ef7ea..23fe1b5` | **0 backend files**
(`apps/api/**` untouched) |

## Out of scope (confirmed unchanged)

- No app code/test change; only the one `README.md` repoint + throwaway probe files
  (created then deleted, no trace left).
- No Jira sync (RD11).

## Notes / follow-ups surfaced

- `./artifacts/SP-109E/` has no checkpoint directory — SP-109E's evidence is
  commit `dff638a` only. Not a failure of I, but a parent gap the reviewer may note.
- `./artifacts/SP-109D/` has `implementation.md` but no `checkpoint.md` (child D
  recorded completion inline). Surfacing for reviewer awareness.
- RD9 (academic types) and RD10 (per-feature RTK Query API) remain EP02 follow-ups
  per the breakdown; not addressed here.

Evidence lives verbatim in this file; `checkpoint.md` is the resume record.
