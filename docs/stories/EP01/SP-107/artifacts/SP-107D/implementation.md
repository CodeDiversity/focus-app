# SP-107D implementation record

**Status:** implementation complete — awaiting parent review
**Date:** 2026-10-18
**Implementer:** implementer (single writer; dispatch `SP107-implementer-D` under the SP-107 autopilot run)
**Baseline:** `1d9b64f` (HEAD before the first included change)
**Scope:** frontend — wizard step 2 first-semester form (`Step2Semester`), `entities/semester` create API, and the minimal `advanceOnboarding` `semesterId` extension (D107-8). Excluded: step 3 (SP-107E), integration sign-off (SP-107F), semester management UI (EP02), `docs/jira-sync/`, other stories' artifacts, the coordinator-owned `## Autopilot` section.

## Changed paths

| Path | Change |
|---|---|
| `apps/web/src/entities/semester/api/semesterApi.ts` | new — `CreateSemesterRequest` + `createSemester` POST `/semesters` on the shared `httpClient` (the entity is the module home; EP02 extends this folder, D107-9) |
| `apps/web/src/entities/semester/api/semesterApi.test.ts` | new — 4 tests (request shape, 201 mapping, 409/400 sanitized rejection shapes) |
| `apps/web/src/features/onboarding/ui/Step2Semester.tsx` | new — step-2 form: name + start/end dates (native date inputs), zod client validation, submit = create → advance, 400/409/network error handling, progress-save-failure inline retry, in-flight disabling |
| `apps/web/src/features/onboarding/ui/Step2Semester.test.tsx` | new — 14 tests (the ticket's full test list) |
| `apps/web/src/features/onboarding/ui/WizardShell.tsx` | step-2 "coming" placeholder → `Step2Semester` (step-3 placeholder remains for SP-107E) |
| `apps/web/src/features/onboarding/model/onboardingSlice.ts` | `advanceOnboarding` payload extended `number` → `{ step, semesterId? }` (D107-8); body omits `semesterId` when unset (F-107D-1) |
| `apps/web/src/features/onboarding/model/onboardingSlice.test.ts` | call sites updated to the object payload; +2 tests (semesterId persisted for step-3 resume; omitted when not provided) |
| `apps/web/src/features/onboarding/ui/Step1Preferences.tsx` | call site updated to `advanceOnboarding({ step: 2 })` (F-107D-1) |
| `apps/web/src/pages/onboarding/ui/OnboardingPage.test.tsx` | the two step-2 assertions moved from the removed placeholder's `<h2>` to the real form's `Semester name` label (F-107D-4) |
| `docs/stories/EP01/SP-107/README.md` | execution fields + queue row D + queue summary only (planner content untouched) |
| `docs/stories/EP01/SP-107/artifacts/SP-107D/` | this record + [checkpoint](./checkpoint.md) |

## AC-by-AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 — Step 2 renders a form: semester name (`Input`), start/end dates (native `<input type="date">`, `yyyy-MM-dd`); client validation: name non-empty after trim ≤ 100 chars; both dates required; `end > start` (field error "End date must be after the start date.") | Pass | `Step2Semester.test.tsx` (client-validation block): empty name, 101-char name, missing dates (both fields flagged `aria-invalid`), `end == start`, `end < start` — each rejected with the exact message and **no API call**; the end-after-start rule compares `yyyy-MM-dd` strings chronologically and applies only when both dates are present (mirrors the SP-107B service, which re-validates server-side — TR-107-04) |
| 2 — Submit → `POST /semesters { name, startDate, endDate }` → on `201` → `PATCH /onboarding { step: 3, semesterId: <created id> }` (progress saved after the step; the id persisted for step-3 resume, D107-8) → advance to step 3 | Pass | `Step2Semester.test.tsx` (submit block): the create call strictly precedes the progress save (invocation call order); `updateState` called with `{ step: 3, semesterId: 'sem-1' }`; the request body is the form values with `yyyy-MM-dd` strings; the slice step becomes 3 with `semesterId` set and `error` null — the shell re-renders step 3 (the announced step line is the success state). `onboardingSlice.test.ts` pins the thunk body for the `semesterId` pass-through and its omission otherwise |
| 3 — Error handling: `400` field-level `errors` displayed per field (incl. end-after-start re-validated server-side); `409` duplicate name → actionable message on the name field; network failure → actionable message + retry, form values preserved; progress-save failure after a successful create → error with retry of the **progress save only** (the semester is never re-created) | Pass | `Step2Semester.test.tsx`: a 400 `errors` map renders under the matching inputs with `aria-invalid` (toast suppressed — no duplication); a 409 renders "A semester with this name already exists." on the name field; a network failure toasts the sanitized message, the inputs keep their values, the button re-enables, and the resubmit re-creates (safe — nothing was written); a progress-save failure after a successful create keeps the slice step at 2, records the slice error the shell displays, freezes the form, and offers an inline retry that re-dispatches the progress save with the stored id — `createSemester` is asserted to have been called **exactly once** across the retry. `semesterApi.test.ts` pins the sanitized 400/409 rejection shapes the UI consumes |
| 4 — Submitting state (disabled controls, no duplicate submission) and success states; fully keyboard operable with visible focus; fits mobile and desktop within the wizard card | Pass | `Step2Semester.test.tsx`: while the create is in flight the submit button and all inputs are disabled; success = the slice step flip to 3 (the shell's announced step line + `aria-current` indicator, unchanged from SP-107C); keyboard-only completion (Tab/Enter on the submit button submits the native form); every control is labeled, focusable and carries the shared `Input` focus-ring classes; responsive class contract (dates stack on mobile / side-by-side `sm:`, action row `flex-col-reverse sm:flex-row`) inside the shell's existing `max-w-2xl` card |

DoD (ticket): 1, 2, 4, 5, 6, 7, 8 pass as above; 3 N/A (no scoping logic client-side — the endpoint is principal-scoped, SP-107B); 9 N/A (no API changes); 10 via SP-107F sign-off + the combined parent review (not this child).

## Contract consumed (unchanged)

```text
POST /semesters   → 201 { id, name, startDate, endDate, isActive, createdAt, updatedAt }
                    400 field-level `errors` map · 409 duplicate name · 401   (SP-107B)
PATCH /onboarding → { step: 3, semesterId } → updated state                    (SP-107A)
```

No contract deviation: `createSemester` sends the shared contract's body field
for field (verified against `apps/api/src/modules/semesters/{semesters.service.ts,
dto/create-semester.dto.ts}` from `03a412a`); dates are `yyyy-MM-dd` strings
sent as-is (D107-7); rejections are sanitized through the shared
`extractApiError`/`apiErrorMessage`/`getFieldError`/`getErrorMessage` helpers
(F-107D-2).

## Verification

All commands from `apps/web` (2026-10-18, re-run in the closeout context):

| Check | Command | Result |
|---|---|---|
| Full suite | `pnpm exec vitest run` | **24/24 files, 258/258 tests passed, 0 skipped** (baseline at `1d9b64f`: 22 files / 238 tests; +2 new test files — semesterApi 4, Step2Semester 14 — and +2 slice tests = +20 tests; the re-asserted `OnboardingPage.test.tsx` keeps its 14) |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | exit 0 |
| Lint | `pnpm run lint` (`--max-warnings 0`) | exit 0 (after a prettier auto-fix pass over `Step2Semester.tsx`; re-run clean) |

Tested state: jsdom component/unit tests — `createSemester` and
`onboardingService` are mocked in every new/extended spec (no real HTTP, no
database, no `.env*` read); `semesterApi.test.ts` drives the **real**
`httpClient` interceptor chain through a stubbed adapter (the established
`sessionApi.test.ts` pattern), so the sanitized rejection shapes are proven
end-to-end at the transport boundary. The slice spec runs against the shared
`makeTestStore()`.

## Findings / Deviations

| ID | Finding | Disposition |
|---|---|---|
| F-107D-1 | Auxiliary files beyond the ticket's file list: the `WizardShell.tsx` render-point swap, the `advanceOnboarding` payload extension in `onboardingSlice.ts`, the `Step1Preferences.tsx` call-site update, and the `onboardingSlice.test.ts` call-site updates. The ticket lists only `Step2Semester.{tsx,ts test}` + `entities/semester/api/*`. | **Fixed** — included in scope as necessary registration (the dispatch explicitly sanctioned the minimal thunk extension; the shell swap is the ticket's stated render point; the call-site updates follow from the payload-type change). Mirrors F-107C-1. |
| F-107D-2 | The shared `getFieldError` helper reads an attached `apiError` or a top-level `errors` property, but the raw `httpClient` interceptor rejection (`{ ...axiosError, message }`) carries the 400 body only at `response.data` — feeding it directly would find no field map. | **Fixed** — the step-2 error path extracts the body via `extractApiError(err)` first, then feeds the parsed `ApiError` (already shaped like the 400 body) to `getFieldError` — the helper's documented fallback path. No shared-helper change. |
| F-107D-3 | RTK `dispatch(asyncThunk)` resolves to the final action — it does **not** throw on rejection. The first draft wrapped the progress save in `try/catch` and cleared the pending marker unconditionally, so a failed progress save never entered the frozen/retry state (the marker was nulled in the same tick). | **Fixed** — the result is matched with `advanceOnboarding.rejected.match(result)` (the pattern `LoginPage` already uses for the fetch thunk); the marker is kept on rejection so the inline retry is offered. Caught by the new progress-save-failure test before closeout. |
| F-107D-4 | `OnboardingPage.test.tsx` asserted the step-2 content via the placeholder's `<h2>Your first semester</h2>` (exact text match); replacing the placeholder with the real form removed that node and would have broken both step-2 tests. | **Fixed** — the two assertions now target the real form's `Semester name` label (a stronger assertion: the step-2 *form* renders, not just its title line). |

Design decisions (recorded in the [checkpoint](./checkpoint.md); none change
the contract):

- The end-after-start refinement applies only when **both** dates are present
  (the SP-107B service does the same), so a missing date surfaces as its own
  "required" error rather than a confusing end-after-start one.
- The name schema is `z.string().trim().min(1).max(100)` — the trim makes both
  bounds check the trimmed value, mirroring the service (`name.trim()` then
  length checks); the submitted name is therefore trimmed exactly as the
  backend would store it.
- On a progress-save failure the form **freezes** (inputs + submit disabled)
  and an inline `role="alert"` offers the retry: editing and resubmitting
  would re-create the semester and 409 on the duplicate name. On a *create*
  failure the form stays editable (nothing was written — resubmit is safe).
- The success state is the slice step flip to 3: the shell's announced step
  line (`aria-live="polite"`) and `aria-current` indicator are the perceivable
  transition (same mechanism as step 1 — no success toast).

**Open findings: none.** All four are fixed with the evidence above. No
deviations from the ticket's ACs, the shared API contract, or the decision
register (D107-5/7/8).

## Commit scope

One scoped commit (hash in the returned closeout) on `main` from baseline
`1d9b64f` covering exactly the "Changed paths" table above. The
coordinator-owned `## Autopilot` run-record section of the SP-107 README was
**not** modified by this child.
