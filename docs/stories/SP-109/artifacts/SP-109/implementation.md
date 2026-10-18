# SP-109 Implementation Index

**Parent story:** [SP-109](file:///Users/michael/Documents/GitHub/focus-app/docs/stories/SP-109.md) — Frontend feature-sliced (FSD) folder structure
**Milestone:** M1 · Jira: STUDY-44 (parent), STUDY-45–STUDY-53 (children)
**Review unit:** combined SP-109 final review — `./artifacts/SP-109/review.md`
**Integration/index owner:** SP-109I · Status: implementation complete — awaiting parent review
**Scope window (Git):** `84ef7ea` (baseline before A) → `23fe1b5` (SP-109H, HEAD)
**Backend in scope:** none (`./apps/api/**` untouched — verified by `git diff --name-only`)

## Combined Git change scope

| Commit | Child | Files (stat) | Verification at commit |
|---|---|---|---|
| `84ef7ea` SP-109A: FSD foundation config (zone format, alias resolver dependency) | A | 3 changed (apps/web/.eslintrc.cjs, apps/web/package.json, pnpm-lock.yaml) | `import/no-restricted-paths` zones + `@/` alias; baseline not yet green under new config (A's own AC) |
| `c904a5c` SP-109B: shared/lib + per-layer type homes | B | (renames + rewrites) | 193 tests, exit 0 |
| `e0bc484` SP-109C: move shared/ui (Button/Input) and shared/api | C | — | 193 tests, exit 0 |
| `2276b27` SP-109D: entities/user — extract getProfile/updateProfile | D | — | 193 tests, exit 0 |
| `dff638a` SP-109E: features/auth — move authService + AuthContext | E | — | 193 tests, exit 0 |
| `db477da` SP-109F: features/session, features/email-verification, app/store | F | — | 193 tests, exit 0 |
| `8e30bad` SP-109G: widgets/ — layout, header, verification banner, route guards | G | — | 193 tests, exit 0 |
| `23fe1b5` SP-109H: pages/<route>/ui + app/App.tsx + app/providers/AppProviders.tsx | H | 16 moves + 1 new + main.tsx slim + 8 test import repoints | 193 tests, exit 0 |

The full move is the union of `84ef7ea..23fe1b5`. Each child committed atomically
(one commit per child, per the breakdown's "single writer, one commit per child").

## Child inventory and status

| Child | Status (2026-10-17) | Evidence / artifact | AC status |
|---|---|---|---|
| A — `@/` alias + ESLint zones | Implemented — awaiting parent review | `artifacts/SP-109A/implementation.md` + checkpoint | RD6 rules land; red/green proof deferred to I |
| B — shared/lib + per-layer types | Implemented — awaiting parent review | `artifacts/SP-109B/` | legacy folders deleted |
| C — shared/ui + shared/api | Implemented — awaiting parent review | `artifacts/SP-109C/` | transport semantics preserved |
| D — entities/user | Implemented — awaiting parent review | `artifacts/SP-109D/` (no checkpoint, inline completion) | userService extracted |
| E — features/auth | Implemented — awaiting parent review | commit `dff638a` only (no artifacts/SP-109E/ dir) | auth context moved |
| F — features/session + app/store | Implemented — awaiting parent review | `artifacts/SP-109F/` | store wiring intact |
| G — widgets | Implemented — awaiting parent review | `artifacts/SP-109G/` | guards migrated |
| H — pages/<route>/ui + app shell | Implemented — awaiting parent review | `artifacts/SP-109H/` | router + providers real |
| I — enforcement proof + docs + index | Implementation complete — awaiting parent review | `artifacts/SP-109I/implementation.md` | AC1–AC5 all met |

## Requirements / test traceability (final)

- **RQ-109-01** (FSD layout exists) — A folders + B–H contents + I proof ✅
- **RQ-109-02** (no flat `src/components/`) — C/G/H + I legacy proof ✅
- **RQ-109-03** (slice/thunk/selectors/RTK API in feature or `app/store`) — F ✅
- **RQ-109-04** (hooks/contexts/services/utils out of flat folders) — B/C/D/E/F ✅
- **RQ-109-05** (machine-enforced direction) — A config + I red/green proof ✅
- **RQ-109-06** (zero behavior change) — full suite **19 files / 193 tests green**, typecheck exit 0, lint exit 0 ✅
- **RQ-109-07** (stale aliases removed) — A + I grep (zero matches) ✅
- **RQ-109-08** (docs point at new paths) — root `README.md` repoint (RD12); planner repointed `docs/epics/**` ✅
- **TR-109-01…05** — all covered by the moved/intact suites + I proofs ✅
- **DoD 1/8** — behavior preserved ✅; **DoD 2/3/5/6/7** — N/A for this pure-structural move (no form/DTO/data-error/UI change); **DoD 9** — root README + breakdown structure note; **DoD 10** — this combined review (pending reviewer).

## Final structure (`apps/web/src`)

```text
app/
  App.tsx
  providers/AppProviders.tsx
  store/store.ts
  store/store.test.tsx
  store/hooks.ts
entities/
  user/model/types.ts
  user/api/userService.ts
features/
  auth/api/authService.ts
  auth/model/types.ts
  auth/model/AuthContext.tsx  (+ 2 test suites)
  session/model/authSlice.ts
  session/model/authSlice.selectors.ts
  session/model/authSlice.thunks.ts (+ 2 test suites, sanctions in .eslintrc.cjs)
  session/api/sessionApi.ts
  email-verification/model/useResendVerification.ts (+test)
pages/
  home/ui/HomePage.tsx  login/ register/ dashboard/ profile/ verify-email/
  forgot-password/ reset-password/ui/<X>Page.tsx (+ 8 test suites)
shared/
  ui/Button.tsx (+test)  ui/Input.tsx
  api/httpClient.ts (+test)  tokenStore.ts  recovery.ts (+test)  types.ts
  lib/errors.ts  lib/linkToken.ts  lib/datetime.ts (+test)
  types/academic.ts
test/   setup.ts  providers.tsx  user.ts
widgets/
  layout/ui/Layout.tsx  header/ui/Header.tsx
  email-verification-banner/ui/EmailVerificationBanner.tsx (+test)
  protected-route/ui/ProtectedRoute.tsx (+test)
  public-route/ui/PublicRoute.tsx
main.tsx  index.css
```

## Verification (final, all green)

`pnpm --filter @studypilot/web test` → **19 files / 193 tests passed**
`pnpm --filter @studypilot/web typecheck` → exit 0
`pnpm --filter @studypilot/web lint` → exit 0
`pnpm --filter @studypilot/web build` → ✅ built (1557 modules transformed)
Dev-server smoke → **CANNOT VERIFY** (environment limitation, SP-108 precedent).

## Known gaps surfaced for the reviewer

1. `./artifacts/SP-109E/` directory is absent — SP-109E's completion is evidenced
   only by commit `dff638a`. Not a regression; a parent evidence gap.
2. `./artifacts/SP-109D/` has no `checkpoint.md` (completion recorded inline in
   its `implementation.md`).
3. `README.md:9` (`**Status:**`) lists only up to C — cosmetic; the per-child rows
   and queue table are the authoritative status. No change needed for this move.
4. RD9 (academic types) → EP02 follow-up; RD10 (per-feature RTK Query API) →
   EP02+ follow-up. Both explicitly out of scope per the breakdown.

## Queue reconciliation

All rows in `docs/stories/SP-109/README.md` are marked `Implemented — awaiting parent
review` (A) / `Implementation complete — awaiting parent review` (I); Active = None;
the combined SP-109 review is the next gate (DoD 10), dispatched by the reviewer.
