# SP-107E checkpoint

Updated: 2026-10-18 (closeout complete)
Execution state: [SP-107 README queue](../../README.md) — row E `Implemented — awaiting parent review`; Active substory `None`; Next substory SP-107F — implement
Story: [SP-107E-wizard-step3-course.md](../../SP-107E-wizard-step3-course.md)
Review unit: SP-107 (parent; index will live at `../SP-107/implementation.md`, written by SP-107F)
Role / scope: implementer; frontend — wizard step 3 optional-first-course form (`Step3Course`) + `entities/course` create API. Excluded: step 2 (SP-107D, done), integration sign-off (SP-107F), course management UI (EP02), `docs/jira-sync/`, other stories' artifacts, the coordinator-owned `## Autopilot` section.

## Repository state

- Workspace / branch: `/Users/michael/Documents/GitHub/focus-app`, `main`
- HEAD at last update: the SP-107E scoped commit (hash in the returned closeout; baseline before the first included change: `00141c0`)
- Saved work: all scoped SP-107E paths committed in one scoped commit (see [implementation.md](./implementation.md) → "Commit scope"). Working tree for this child's scoped paths: clean.
- Other work to preserve: the coordinator/autopilot-owned `## Autopilot` run-record section in [the SP-107 README](../../README.md) is intentionally **not** part of this commit.

## Progress

- [x] `entities/course/api/courseApi.ts` — `createCourse` POST `/courses` (optional `semesterId` omitted from the body when null; EP02-extend home)
- [x] `entities/course/api/courseApi.test.ts` — 6 tests (body with/without `semesterId`, 201 → `Course` mapping, 409/404/400 sanitized rejection shapes through the real interceptor chain)
- [x] `features/onboarding/ui/Step3Course.tsx` — optional label + read-only semester context line (D107-8), code + name zod form, "Finish without a course" (completion only, no course), "Add course" → create → complete, 400 field errors / 409 code error / 404 inline alert with no-semester resubmit / network toast with values preserved, completion-failure inline retry (completion only, form frozen), in-flight disabling of both exit paths
- [x] `features/onboarding/ui/Step3Course.test.tsx` — 19 tests (the ticket's full test list)
- [x] `features/onboarding/ui/WizardShell.tsx` — step-3 "coming" placeholder → `Step3Course` (placeholder component removed — all three steps are real forms)
- [x] `pages/onboarding/ui/OnboardingPage.test.tsx` — step-3 assertion moved from the removed placeholder's `<h2>` to the real form's `Course code` label
- [x] Full verification: 283/283 tests (26 files), typecheck clean, lint clean (2026-10-18)
- [x] Closeout: `implementation.md` written, README queue row E + active/next fields + queue summary updated, scoped commit made

## Findings / Deviations

All findings are recorded with dispositions in [implementation.md](./implementation.md) → "Findings / Deviations":

- **F-107E-1** (auxiliary files beyond the ticket's file list: `WizardShell.tsx` render-point swap, `OnboardingPage.test.tsx` step-3 assertion) — fixed (necessary registration; mirrors F-107C-1 / F-107D-1 / F-107D-4).
- **F-107E-2** (the ticket's 404 AC names no presentation vehicle) — fixed (persistent inline red `role="alert"` — the app's only existing alert convention — instead of a transient toast; the context line also switches to the no-semester variant so a resubmit omits the stale `semesterId`, D107-8).
- **F-107E-3** (independent "Finish without a course" / "Add course" buttons could race) — fixed (shared `busy` flag disables both exit paths and both inputs while either write is in flight).
- **F-107E-4** (the two never-resolving-promise tests emit React `act()` warnings) — noted (pre-existing tolerated pattern; Step2Semester's equivalent emits 48, all passing; no test fails).

No open findings.

## Decisions and dependencies

- D107-8 (step-3 semester context from the onboarding state; `semesterId: null` → course without a semester, context line adjusted), D107-6 (minimal `POST /courses` contract; 404 uniform, 409 duplicate code), D107-4 (the shell's "Skip for now" stays — step 3's "Finish without a course" is the distinct primary completion path; both dispatch `completeOnboarding`, no conflicting navigation).
- Shared API contract (SP-107 README) verified against `apps/api/src/modules/courses/{courses.service.ts, dto/create-course.dto.ts}` from `03a412a`: 201 matches the frontend `Course` type; 409 message `'A course with this code already exists.'`; 404 uniform `Resource not found` (`RESOURCE_NOT_FOUND` in `common/ownership/ownership.ts`); 400 carries the field-level `errors` map.
- Design: `semesterId` is read from the onboarding slice (`selectOnboarding`); no slice change needed (`completeOnboarding` already exists from SP-107C). A 404 on submit (semester vanished between load and submit) sets a local unavailable flag: the context line switches to the no-semester variant and a resubmit omits the stale `semesterId` (D107-8: create without a semester) while the inline alert offers "Finish without a course".
- Design: a completion-PATCH failure after a successful course create freezes the form and offers an inline retry that re-dispatches **only** `completeOnboarding` (the course must never be re-created — a resubmit would 409 on the duplicate code), mirroring the SP-107D progress-save retry; the thunk result is matched with `completeOnboarding.rejected.match(result)`.

## Verification

- `pnpm --filter @studypilot/web exec vitest run` → **26/26 files, 283/283 tests passed, 0 skipped** (baseline at `00141c0`: 24 files / 258 tests; +25 new tests — courseApi 6, Step3Course 19; the re-asserted `OnboardingPage.test.tsx` keeps its 14)
- `pnpm --filter @studypilot/web run typecheck` → exit 0
- `pnpm --filter @studypilot/web run lint` (`--max-warnings 0`) → exit 0 (after a prettier auto-fix pass over the two new Step3 files; the full suite + lint re-ran clean)
- Note: the two never-resolving-promise tests emit React `act()` warnings — a pre-existing tolerated pattern (Step2Semester's equivalent emits 48, all passing); F-107E-4.

Details in [implementation.md](./implementation.md) → "Verification".

## Resume next

None — child complete. The queue names SP-107F — implement (integration + DoD 10 sign-off; a fresh dispatch; this writer is relinquished).
