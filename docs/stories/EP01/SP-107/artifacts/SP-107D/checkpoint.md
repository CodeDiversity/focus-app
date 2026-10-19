# SP-107D checkpoint

Updated: 2026-10-18 (dispatch complete)
Execution state: [SP-107 README queue](../../README.md) — row D `Implemented — awaiting parent review`; Active substory `None`; Next substory SP-107E — implement
Story: [SP-107D-wizard-step2-semester.md](../../SP-107D-wizard-step2-semester.md)
Review unit: SP-107 (parent; index will live at `../SP-107/implementation.md`, written by SP-107F)
Role / scope: implementer; frontend — wizard step 2 first-semester form (`Step2Semester`) + `entities/semester` create API + minimal `advanceOnboarding` `semesterId` extension (D107-8). Excluded: step 3 (SP-107E), integration sign-off (SP-107F), semester management UI (EP02), `docs/jira-sync/`, other stories' artifacts, the coordinator-owned `## Autopilot` section.

## Repository state

- Workspace / branch: `/Users/michael/Documents/GitHub/focus-app`, `main`
- HEAD at last update: `1d9b64f` (baseline before the first included change; coordinator dispatch — SP-107C code at `5863b44`, SP-107B at `03a412a`)
- Saved work: all scoped SP-107D paths committed in one scoped commit (hash in the returned closeout; see [implementation.md](./implementation.md) → "Commit scope"). Working tree for this child's scoped paths: clean.
- Other work to preserve: the coordinator/autopilot-owned `## Autopilot` run-record section in [the SP-107 README](../../README.md) is intentionally **not** part of this commit.

## Progress

- [x] `entities/semester/api/semesterApi.ts` — `createSemester` POST `/semesters` (request `yyyy-MM-dd` as-is, D107-7; EP02-extend home)
- [x] `entities/semester/api/semesterApi.test.ts` — 4 tests (request shape, 201 mapping, 409 + 400 sanitized rejection shapes)
- [x] `features/onboarding/ui/Step2Semester.tsx` — name + start/end dates (zod client validation incl. end-after-start), submit = create → advance `{ step: 3, semesterId }` (D107-8), 400 field errors / 409 name error / network toast with values preserved, progress-save-failure inline retry (progress only, form frozen), in-flight disabling, keyboard + responsive
- [x] `features/onboarding/ui/Step2Semester.test.tsx` — 14 tests (the ticket's full test list)
- [x] `features/onboarding/ui/WizardShell.tsx` — step-2 placeholder → `Step2Semester` (step-3 placeholder remains for SP-107E)
- [x] `features/onboarding/model/onboardingSlice.ts` — `advanceOnboarding` payload extended to `{ step, semesterId? }` (minimal; body omits `semesterId` when unset, so step-1 behavior is byte-identical) + `onboardingSlice.test.ts` +2 tests
- [x] `Step1Preferences.tsx` call site updated to the object payload; `OnboardingPage.test.tsx` step-2 assertions moved from the removed placeholder to the real form
- [x] Full verification: 258/258 tests (24 files), typecheck clean, lint clean (2026-10-18)
- [x] Closeout: `implementation.md` written, README queue row D + active/next fields + queue summary updated, scoped commit made

## Findings / Deviations

All findings are recorded with dispositions in [implementation.md](./implementation.md) → "Findings / Deviations":

- **F-107D-1** (auxiliary files beyond the ticket's file list: `WizardShell.tsx` render-point swap, `onboardingSlice.ts` thunk extension, `Step1Preferences.tsx` + `onboardingSlice.test.ts` call sites, `OnboardingPage.test.tsx` assertions) — fixed (necessary registration; mirrors F-107C-1; the thunk extension was explicitly sanctioned by the dispatch).
- **F-107D-2** (the shared `getFieldError` helper reads `apiError`/top-level `errors`, but the raw `httpClient` interceptor rejection carries the body only at `response.data`) — fixed (step-2 error path extracts via `extractApiError` first, then feeds the parsed `ApiError` body to `getFieldError`).
- **F-107D-3** (RTK `dispatch(asyncThunk)` resolves to the final action — it does **not** throw on rejection; the first draft's try/catch + unconditional marker clear never entered the frozen/retry state on a progress-save failure) — fixed (`advanceOnboarding.rejected.match(result)` guard; caught by the new test before closeout).
- **F-107D-4** (the `OnboardingPage.test.tsx` step-2 assertions matched the removed placeholder's `<h2>` by exact text) — fixed (assertions now target the real form's `Semester name` label in both step-2 tests).

No open findings.

## Decisions and dependencies

- D107-7 (`yyyy-MM-dd` strings sent as-is — no instant/time-zone conversion), D107-8 (persist the created semester id in the onboarding state for step-3 resume), D107-5 (minimal create endpoint; EP02 extends the same module).
- Shared API contract (SP-107 README): `POST /semesters` 201/400/409 shapes verified against `apps/api/src/modules/semesters/{semesters.service.ts, dto/create-semester.dto.ts}` from `03a412a` — 409 message is the string `'A semester with this name already exists.'`; 400 carries the field-level `errors` map.
- Design: after a successful create whose progress save fails, the form freezes and an inline retry re-dispatches **only** the progress save with the stored semester id (never re-creates the semester — a resubmit would 409).

## Verification

Re-run in the closeout context (2026-10-18, cwd `apps/web`):

- `pnpm exec vitest run` → **24/24 files, 258/258 tests passed, 0 skipped** (baseline at `1d9b64f`: 22 files / 238 tests; +2 new test files — semesterApi 4, Step2Semester 14 — and +2 slice tests = +20 tests)
- `pnpm run typecheck` → exit 0
- `pnpm run lint` (`--max-warnings 0`) → exit 0 (after a prettier auto-fix pass over `Step2Semester.tsx`)

Details in [implementation.md](./implementation.md) → "Verification".

## Resume next

None — child complete. The queue names SP-107E — implement (a fresh dispatch;
this writer is relinquished).
