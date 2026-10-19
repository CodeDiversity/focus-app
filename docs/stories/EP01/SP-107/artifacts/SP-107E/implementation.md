# SP-107E implementation record

**Status:** implementation complete — awaiting parent review
**Date:** 2026-10-18
**Implementer:** implementer (single writer; dispatch `SP107-implementer-E` under the SP-107 autopilot run)
**Baseline:** `00141c0` (HEAD before the first included change)
**Scope:** frontend — wizard step 3 optional-first-course form (`Step3Course`), `entities/course` create API, and the step-3 render-point registration. Excluded: step 2 (SP-107D, done), integration sign-off (SP-107F), course management UI (EP02), `docs/jira-sync/`, other stories' artifacts, the coordinator-owned `## Autopilot` section.

## Changed paths

| Path | Change |
|---|---|
| `apps/web/src/entities/course/api/courseApi.ts` | new — `CreateCourseRequest` + `createCourse` POST `/courses` on the shared `httpClient` (`semesterId` omitted from the body when null; the entity is the module home; EP02 extends this folder, D107-9) |
| `apps/web/src/entities/course/api/courseApi.test.ts` | new — 6 tests (body with/without `semesterId`, 201 → `Course` mapping, 409/404/400 sanitized rejection shapes) |
| `apps/web/src/features/onboarding/ui/Step3Course.tsx` | new — step-3 form: "This step is optional" label, read-only semester context line (D107-8), code + name zod form, "Finish without a course", "Add course" → complete, 400/409/404/network error handling, completion-failure inline retry, in-flight disabling of both exit paths |
| `apps/web/src/features/onboarding/ui/Step3Course.test.tsx` | new — 19 tests (the ticket's full test list) |
| `apps/web/src/features/onboarding/ui/WizardShell.tsx` | step-3 "coming" placeholder → `Step3Course` (the placeholder component is removed — all three steps are real forms) |
| `apps/web/src/pages/onboarding/ui/OnboardingPage.test.tsx` | the step-3 assertion moved from the removed placeholder's `<h2>` to the real form's `Course code` label (F-107E-1) |
| `docs/stories/EP01/SP-107/README.md` | execution fields + queue row E + queue summary only (planner content untouched) |
| `docs/stories/EP01/SP-107/artifacts/SP-107E/` | this record + [checkpoint](./checkpoint.md) |

## AC-by-AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 — Step 3 is clearly optional: visible "This step is optional" label and a "Finish without a course" button that completes onboarding (`PATCH /onboarding { completed: true }`) **without** creating any course, then navigates to `/dashboard` | Pass | `Step3Course.test.tsx` (AC-1 block): the label and both exit paths render; clicking "Finish without a course" calls `updateState` **exactly once** with `{ completed: true }` and `createCourse` **never**; the slice's `completed` flips to `true` — the page's redirect to `/dashboard` on that flip is SP-107C's (the terminal-redirect test in `OnboardingPage.test.tsx` covers the redirect itself; this step's spec asserts the slice flip that drives it, since the component never navigates itself) |
| 2 — Course form collects code (`Input`) and name (`Input`); client validation: code non-empty ≤ 20 chars; name non-empty ≤ 100 chars; the onboarding semester (from the onboarding state, D107-8) shown as read-only attachment context ("Adding to your first semester"); no semester picker in M1 | Pass | `Step3Course.test.tsx` (AC-2 block): empty code, 21-char code, empty name, 101-char name — each rejected with the exact message and `aria-invalid` on the matching input, and **no API call** (the backend re-validates, AC-107-07); with a `semesterId` in the slice the context line reads "Adding to your first semester" and the form renders exactly the two labeled inputs — no picker |
| 3 — "Add course" → `POST /courses { code, name, semesterId? }` → on `201` → `PATCH /onboarding { completed: true }` → `/dashboard`; `semesterId: null` edge creates the course without a semester and adjusts the context line | Pass | `Step3Course.test.tsx` (AC-3 block): the create strictly precedes the completion write (invocation call order); the request body is the form values plus the slice's `semesterId`; the slice's `completed` flips with `error` null. Null-`semesterId` edge: the context line reads "…will be added without a semester", the create is called with `semesterId: null`, and completion follows. `courseApi.test.ts` pins the transport behavior: the serialized body **omits** the `semesterId` key entirely when null (not sent as `null`), and the 201 body maps to the existing `Course` type |
| 4 — Error handling: `400` field-level errors per field; `409` duplicate code → actionable message on the code field; `404` (semester vanished between load and submit) → actionable message offering "Finish without a course"; network failure → retry with values preserved | Pass | `Step3Course.test.tsx` (AC-4 block): a 400 `errors` map renders under the matching inputs with `aria-invalid` (toast suppressed — no duplication) and never completes; a 409 renders "A course with this code already exists." on the code field and never completes; a 404 renders a persistent inline `role="alert"` offering "Finish without a course" (F-107E-2), switches the context line to the no-semester variant, and a resubmit creates the course **without** the stale `semesterId` (D107-8) then completes; a network failure toasts the sanitized message, the inputs keep their values, the submit re-enables, and the resubmit succeeds and completes. `courseApi.test.ts` pins the sanitized 400/404/409 rejection shapes the UI consumes through the real interceptor chain |
| 5 — After completion (either path) the wizard is terminal for the student (the redirect itself is SP-107C's, verified here on the completion flow); the step handles submitting states, is keyboard operable, and fits mobile and desktop | Pass | `Step3Course.test.tsx` (AC-5 block): keyboard-only completion of **both** paths (Enter on "Finish without a course"; Tab code → name → finish → add, Enter on "Add course" submits the native form); every control is labeled, focusable and carries the shared `Input`/`Button` focus-ring classes; responsive class contract (action buttons stack on mobile / side-by-side `sm:`, matching the step-2 contract) inside the shell's existing `max-w-2xl` card; while **either** write is in flight a shared `busy` flag disables both exit paths and both inputs (no duplicate submission, no racing second completion write — F-107E-3); the slice `completed` flip is the terminal state the page redirects on (SP-107C) |

DoD (ticket): 1, 2, 4, 5, 6, 7, 8 pass as above; 3 N/A (no scoping logic client-side — the endpoint is principal-scoped, SP-107B); 9 N/A (no API changes); 10 via SP-107F sign-off + the combined parent review (not this child).

## Contract consumed (unchanged)

```text
POST /courses     → 201 { id, code, name, description, color, credits, isActive, createdAt, updatedAt }
                    400 field-level `errors` map · 404 uniform `Resource not found` · 409 duplicate code · 401   (SP-107B)
PATCH /onboarding → { completed: true } → updated state (the `completed` flip is the terminal state)   (SP-107A)
```

No contract deviation: `createCourse` sends the shared contract's body field
for field (verified against `apps/api/src/modules/courses/{courses.service.ts,
dto/create-course.dto.ts}` from `03a412a`); `semesterId` is omitted from the
body when null (the backend treats an absent field as "no semester"); the 201
body matches the existing `Course` type exactly; rejections are sanitized
through the shared `extractApiError`/`apiErrorMessage`/`getFieldError`/
`getErrorMessage` helpers (mirrors F-107D-2).

## Verification

All commands (2026-10-18, re-run in the closeout context):

| Check | Command | Result |
|---|---|---|
| Full suite | `pnpm --filter @studypilot/web exec vitest run` | **26/26 files, 283/283 tests passed, 0 skipped** (baseline at `00141c0`: 24 files / 258 tests; +2 new test files — courseApi 6, Step3Course 19 = +25 tests; the re-asserted `OnboardingPage.test.tsx` keeps its 14) |
| Typecheck | `pnpm --filter @studypilot/web run typecheck` (`tsc --noEmit`) | exit 0 |
| Lint | `pnpm --filter @studypilot/web run lint` (`--max-warnings 0`) | exit 0 (after a prettier auto-fix pass over the two new Step3 files; the full suite + lint re-ran clean) |

Tested state: jsdom component/unit tests — `createCourse` and
`onboardingService` are mocked in the Step3 spec (no real HTTP, no database,
no `.env*` read); the spec runs against the shared `makeTestStore()` with the
onboarding slice seeded at step 3. `courseApi.test.ts` drives the **real**
`httpClient` interceptor chain through a stubbed adapter (the established
`semesterApi.test.ts` pattern), so the sanitized rejection shapes are proven
end-to-end at the transport boundary. The two never-resolving-promise tests
(in-flight disabling) emit React `act()` warnings — a pre-existing tolerated
pattern (Step2Semester's equivalent emits 48, all passing); F-107E-4.

## Findings / Deviations

| ID | Finding | Disposition |
|---|---|---|
| F-107E-1 | Auxiliary files beyond the ticket's file list: the `WizardShell.tsx` render-point swap (placeholder removed) and the `OnboardingPage.test.tsx` step-3 assertion update. The ticket lists only `Step3Course.{tsx,ts test}` + `entities/course/api/*`. | **Fixed** — included in scope as necessary registration (the shell swap is the ticket's stated render point; the page test asserted the removed placeholder's `<h2>` by exact text). Mirrors F-107C-1 / F-107D-1 / F-107D-4. |
| F-107E-2 | The ticket's 404 AC says "actionable message offering 'Finish without a course'" without naming the presentation vehicle. | **Fixed** — implemented as a **persistent inline `role="alert"`** (red — the app's only existing alert convention, Step2Semester's frozen state; there is no amber in the app) rather than a transient toast: the message must stay visible while the student chooses between the two recovery paths, and a toast auto-dismisses. On 404 the context line also switches to the no-semester variant, so a resubmit omits the stale `semesterId` (D107-8: create without a semester). |
| F-107E-3 | "Finish without a course" and "Add course" are independent buttons; a draft that enabled both while a write was in flight would allow a racing second completion write (409 on the terminal state) or an unneeded course. | **Fixed** — a shared `busy` flag disables **both** exit paths and both inputs while either write is in flight; the tests assert the cross-disabling in both directions. |
| F-107E-4 | The two never-resolving-promise tests (in-flight disabling) emit React `act()` warnings. | **Noted** — pre-existing tolerated pattern: Step2Semester's equivalent tests emit 48 warnings and all pass. Not fixed; matches the established step-2 convention, and no test fails. |

Design decisions (recorded in the [checkpoint](./checkpoint.md); none change
the contract):

- The code schema is `z.string().trim().min(1).max(20)` and the name schema
  `z.string().trim().min(1).max(100)` — the trim makes both bounds check the
  trimmed value, mirroring the SP-107B service (`code.trim()` then length
  checks); the submitted values are therefore trimmed exactly as the backend
  would store them.
- `semesterId` is read from the onboarding slice (`selectOnboarding`) — no
  slice change needed (`completeOnboarding` already exists from SP-107C).
- On a completion-PATCH failure after a successful create the form **freezes**
  (inputs + both buttons disabled) and an inline `role="alert"` offers
  "Retry finishing", which re-dispatches **only** `completeOnboarding` (the
  course must never be re-created — a resubmit would 409 on the duplicate
  code), mirroring the SP-107D progress-save retry. The RTK
  `dispatch(asyncThunk)` result is matched with
  `completeOnboarding.rejected.match(result)` (the pattern Step2Semester
  already uses — `dispatch` does not throw on rejection).
- The success state is the slice `completed` flip: the page's redirect to
  `/dashboard` is SP-107C's (the terminal-redirect test in
  `OnboardingPage.test.tsx` covers it; this step's spec asserts the flip that
  drives it — no success toast).

**Open findings: none.** All four are fixed/noted with the evidence above. No
deviations from the ticket's ACs, the shared API contract, or the decision
register (D107-6/8).

## Commit scope

One scoped commit (hash in the returned closeout) on `main` from baseline
`00141c0` covering exactly the "Changed paths" table above. The
coordinator-owned `## Autopilot` run-record section of the SP-107 README was
**not** modified by this child.
