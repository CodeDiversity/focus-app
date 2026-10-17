# SP-108C checkpoint
Updated: 2026-10-16 22:40 +0100
Status: in progress
Story: docs/stories/SP-108/SP-108C-rtk-query-data-layer.md
Review unit: SP-108 parent — `docs/stories/SP-108/artifacts/SP-108/implementation.md`
Role / scope: implementer; frontend-only slice. Owns `src/store/api.ts`,
`src/hooks/useResendVerification.ts`, `src/store/store.ts`, `src/main.tsx`,
`src/test/providers.tsx` and the named test wrappers. Excludes `src/services/**`,
`@tanstack` package removal and repo-doc flips (SP-108D).

## Repository state
- Workspace / branch: /Users/michael/Documents/GitHub/focus-app (feature branch with SP-108 docs + A/B work)
- HEAD at last update: 55aa794 docs(SP-108A): fix delivery-state relative link depth
- Saved work: SP-108A/B application code is present but **uncommitted**
  (`apps/web/src/store/`, `AuthContext.tsx`, `main.tsx`, `AuthContext.test.tsx`,
  `apps/web/package.json`, `pnpm-lock.yaml`) — preserved, not touched beyond this story.
- Other work to preserve: `docs/stories/EP01/SP-105/**` edits belong to another
  story's reviewer; leave untouched.

## Progress
- [x] Baseline measured: `pnpm --filter @studypilot/web test` → 13 files, 153 tests,
  7 files / 82 tests red (matches the ticket baseline: six AuthProvider-rendering
  files without a Redux Provider + 2 stale `store.test.tsx` assertions).
- [ ] CP1 `src/store/api.ts` + `src/store/api.test.ts` (4 baseQuery + 2 parity cases).
- [ ] CP2 store wiring + `src/test/providers.tsx`; Login/Register wrappers; 2 stale assertions.
- [ ] CP3 `useResendVerification` migration + `src/hooks/useResendVerification.test.ts`.
- [ ] CP4 `src/main.tsx` swap + 4 remaining wrappers; full suite/typecheck/lint/grep.
- Current step: CP1 — write `src/store/api.test.ts` (red), then `src/store/api.ts`.

## Decisions and dependencies
- Ticket Decisions D1–D8 are authoritative for the API shape; do not re-derive.
- RD4 confirmed: the baseQuery must delegate to the default-exported axios instance
  in `src/services/api.ts`, which stays byte-for-byte unchanged (AC4).
- Dependencies satisfied: A (store + typed hooks) landed; B landed (authSlice +
  store-backed AuthProvider), which is why six wrapper files are red.

## Verification
- `cd apps/web && pnpm vitest run` → baseline 82 failed / 71 passed (recorded above).
- Not yet run for C: focused `pnpm vitest run src/store/api.test.ts`, typecheck, lint.

## Resume next
1. Create `apps/web/src/store/api.test.ts` with the six named cases, run it red.
2. Create `apps/web/src/store/api.ts` (axios baseQuery + `resendVerification` endpoint
   + `resendErrorMessage` + `createApi` config); run `pnpm vitest run src/store/api.test.ts` green.
- Read next: `src/services/api.ts` (interceptor rejection shape), `src/services/auth.ts:28-38`
  (message source), `src/store/store.test.tsx` (stale assertions).