# SP-108 Implementation Index

**Parent story:** SP-108 — Redux Toolkit adoption on the web frontend
**Date:** 2026-10-16 · **Updated:** 2026-10-17 (fix-pass children E, F, G added)
**Status:** All children implemented, including the review fix pass
(SP-108E → SP-108F → SP-108G) — awaiting the re-run combined SP-108 review.
The 2026-10-17 combined review returned **FAIL** (IR-001 blocker, IR-002/IR-003
should-fix); those findings are addressed by E/F/G and are closed only by the
reviewer's re-run verdict.
**Delivery home:** `docs/stories/SP-108/` · **Parent artifacts:** `./artifacts/SP-108/`
**Prepared by:** single sequential `implementer`

This is the integration/index record the combined SP-108 review consumes. It is
**not** a review: no verdict, no approval and no sign-off is claimed here. The
combined review is written by the independent read-only reviewer at
`./artifacts/SP-108/review.md`.

## Outcome

RD1 and RD2 are implemented end to end. Redux Toolkit is the client-state
library: auth/session state lives in an RTK `authSlice`, and RTK Query replaces
TanStack Query for every data fetch/mutation. TanStack Query is gone from the web
workspace, both lockfiles and the live repo documentation, with the full web
suite green afterwards.

| Req | Requirement | Owning children | Status |
|---|---|---|---|
| RQ-108-01 | Install RTK and wire the store into the app (RD1) | A | Implemented |
| RQ-108-02 | All auth/session client state lives in Redux (RD1) | B | Implemented |
| RQ-108-03 | RTK Query replaces TanStack Query for every fetch/mutation (RD2) | C | Implemented |
| RQ-108-04 | No TanStack dependency remains in the web app (RD2) | D | Implemented |
| RQ-108-05 | SP-105G session-generation/barrier semantics preserved exactly | B, C; D proof; E (boot loading gate) | Implemented — regression green; the boot-loading part was restored by SP-108E after review IR-001 |
| RQ-108-06 | All web suites, typecheck and lint stay green | B, C, D, E, F | Implemented — 166/166 + clean gates at D; **178/178 + clean gates** after the E → F fix pass |

## Test coverage delivered

| Test req | Tests | State |
|---|---|---|
| TR-108-01 — store configures, typed hooks dispatch/select, serializability middleware | `apps/web/src/store/store.test.tsx` | Pass |
| TR-108-02 — slice/thunk behavior incl. error/loading paths; `AuthContext` unchanged | `apps/web/src/store/authSlice.test.ts` (8 reducer), `apps/web/src/store/authSlice.thunks.test.ts` (4 thunk phases), `apps/web/src/context/AuthContext.registerLogout.test.tsx` (4 adapter callbacks), `apps/web/src/context/AuthContext.test.tsx` (14) | Pass — the thunk/adapter error+loading cases were added 2026-10-17 by SP-108F (review IR-002); the original "Pass" claim rested on the reducer cases only |
| TR-108-03 — SP-105G generation/barrier regression | `apps/web/src/services/recovery.test.ts` (23), `apps/web/src/services/api.test.ts` (14) | Pass |
| TR-108-04 — RTK Query mutation parity with the old `useMutation` contract | `apps/web/src/store/api.test.ts` (8), `apps/web/src/hooks/useResendVerification.test.tsx` (5) | Pass |
| TR-108-05 — zero `@tanstack` references and dependencies | scoped grep + frozen-lockfile install | Pass (zero matches) |

## Child index

| Child | Outcome | Record | Commits |
|---|---|---|---|
| [A](./../SP-108A-store-foundation.md) | RTK installed; store, typed hooks, serializability middleware; `Provider` wiring in `main.tsx` | `./artifacts/SP-108A/implementation.md` (+ progress record `./artifacts/SP-108A/checkpoint.md`) | `d164841` |
| [B](./../SP-108B-auth-state-slice.md) | Auth/session state moved into `authSlice`; `AuthProvider` re-implemented as a store-backed adapter with the same `AuthContextType` interface (RD3) | `./artifacts/SP-108B/implementation.md` (+ checkpoints cp1, cp2) | `d164841` |
| [C](./../SP-108C-rtk-query-data-layer.md) | RTK Query service on the shared axios `baseQuery` replaces every TanStack usage; `QueryClientProvider`/devtools removed; shared test providers added | `./artifacts/SP-108C/implementation.md` | `5308efa`, `7439f8f`, `5cce85e`, `57a8850`, `607917d` |
| [D](./../SP-108D-tanstack-removal-verification.md) | TanStack packages + `package-lock.json` removed, `pnpm-lock.yaml` regenerated, README/skill docs flipped, full verification, this index | `./artifacts/SP-108D/implementation.md` | `32e5dd5`, `37b9eb3` |
| [E](./../SP-108E-boot-loading-gate-fix.md) | Fix pass — boot-session loading gate restored (`authSlice` boots `isLoading: true`) + 4 real route-guard regression tests (review IR-001) | `./artifacts/SP-108E/implementation.md` | `b3533a8` |
| [F](./../SP-108F-thunk-phase-tests.md) | Fix pass — 8 thunk/adapter error+loading phase tests through the real production paths (review IR-002) | `./artifacts/SP-108F/implementation.md` | `45e3e54` |

## Combined Git scope

```text
git log --oneline 55aa794..37b9eb3
5308efa feat(web): RTK Query service on the shared axios instance (SP-108C CP1)
7439f8f feat(web): wire RTK Query into the store and add shared test providers (SP-108C CP2)
5cce85e feat(web): migrate useResendVerification to the RTK Query mutation (SP-108C CP3)
57a8850 feat(web): drop QueryClientProvider and move the last four test wrappers to RTK Query (SP-108C CP4)
607917d docs(SP-108C): implementation record, final checkpoint, queue advances to SP-108D
d164841 feat(web): commit SP-108A store foundation and SP-108B auth slice (previously uncommitted)
32e5dd5 chore(web): remove TanStack Query packages and the npm lockfile (SP-108D)
37b9eb3 docs: flip the state-management architecture line to Redux Toolkit + RTK Query (SP-108D)
```

Principal application files across the whole parent scope:

| File | Child | Description |
|---|---|---|
| `apps/web/src/store/store.ts` | A, C | Store config; registers `api.reducer`, appends `api.middleware`, `serializableCheck.ignoredActions: [api.reducerPath]` |
| `apps/web/src/store/hooks.ts` | A | Typed `useAppDispatch` / `useAppSelector` |
| `apps/web/src/store/authSlice.ts` | B | Auth/session state |
| `apps/web/src/store/authSlice.thunks.ts` | B | Login/register/refresh/logout/profile thunks, sanitized rejections |
| `apps/web/src/store/authSlice.selectors.ts` | B | Derived auth selectors |
| `apps/web/src/store/api.ts` | C | `axiosBaseQuery` delegating to the shared `services/api.ts` instance; `resendVerification` mutation |
| `apps/web/src/context/AuthContext.tsx` | B, C | Store-backed adapter; public `AuthContextType` interface unchanged (RD3) |
| `apps/web/src/hooks/useResendVerification.ts` | C | Mutation plumbing swapped; public contract unchanged |
| `apps/web/src/main.tsx` | A, C | `Provider(store)` wired; `QueryClientProvider`/`ReactQueryDevtools` removed |
| `apps/web/src/test/providers.tsx` | C | `makeTestStore()` / shared `Providers` test wrapper |
| `apps/web/package.json`, `pnpm-lock.yaml`, `package-lock.json` | A, D | RTK/`react-redux` added; TanStack and the npm lockfile removed |
| `README.md`, `.agents/skills/studypilot-frontend/SKILL.md` | D | Architecture line and implementer guidance flipped (RD6) |

**Not touched by SP-108:** `apps/web/src/services/api.ts` and
`apps/web/src/services/recovery.ts` (the SP-105G transport/barrier machinery —
C reused them unchanged rather than reimplementing them), `VerifyEmail.tsx`,
`EmailVerificationBanner.tsx`, and every backend file. No Prisma model,
migration, endpoint, DTO or environment variable was added, changed or removed.

## Final verification (run at the end of D, 2026-10-16)

| Gate | Command | Result |
|---|---|---|
| Web regression suite | `pnpm --filter @studypilot/web test` | **15 files / 166 tests passed (166)** |
| Typecheck | `pnpm --filter @studypilot/web typecheck` | clean |
| Lint | `pnpm --filter @studypilot/web lint` | clean (`--max-warnings 0`) |
| Production build | `pnpm --filter @studypilot/web build` | ✓ built in 1.01s |
| Lockfile consistency | `pnpm install --frozen-lockfile` | success, `-35` packages, no `@tanstack` key |
| Zero-reference proof | scoped grep (code, manifest, lockfile, README, frontend skill) | zero matches, exit 1 |

**Not performed — conditional runtime smoke.** Docker, Postgres (5432) and the
API (3000) were all available, but no registered test account credential exists
in the repo and obtaining one would require reading environment/secret files
(prohibited) or creating a user in the user's local development database. Recorded
as not performed with this reason rather than silently skipped; compile- and
behavior-level integration is covered by the build and the 166-test suite.

## Deferred, by design (not gaps)

- RD3: the store-backed `AuthProvider` adapter and the now-unused
  `authService.resendVerification` remain in place. Their removal is optional,
  separately tracked future work that RD3 explicitly deferred — not dropped.
- RD6: `docs/stories/SP-108/**` still names TanStack in historical planning
  context (RD2/RD4 rationale). These are records, not live guidance.

## Known open items for the review

1. The dev-server smoke gap above (the only AC4 element not performed).
2. Unrelated open working-tree changes under `docs/stories/EP01/SP-105/**` from
   another contributor; deliberately outside SP-108's scope and not committed.
3. RD4 was marked **provisional** by the planner because RTK Query internals were
   uninspected while the library was uninstalled. Its verification task is
   satisfied — `api.test.ts`, `AuthContext.test.tsx` and `recovery.test.ts`
   generation-regression cases stayed green throughout — but the reviewer should
   confirm the label can now be retired.