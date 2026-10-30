# EP06E implementation record

**Story:** [EP06E-study-preferences-ui.md](../../EP06E-study-preferences-ui.md)
**Implemented:** 2026-10-30 (single implementer pass; frontend only — the study-preferences section on `/profile`)
**Baseline HEAD before changes:** `8f470d1` (coordinator's reconciliation commit); the plan's own baseline is `9b1ec19`
**Parent:** [EP06 breakdown](../../README.md) — one combined parent review after EP06H.
**Scope:** the preferences surface on `/profile`: the entity client, the validated form, and its mount on the existing profile page. **Excluded:** EP06F (plan page), EP06G (remaining-work surface), any change to `PATCH /users/me`, any change to the existing name/time-zone form or its payload, the backend (EP06A, done), the scheduling engine/plan API (EP06C/EP06D, done).

## Changed paths

Production:
- `apps/web/src/entities/study-preferences/model/types.ts` (new) — `StudyPreferences` interface mirroring the API shape exactly (`sessionLengthMinutes`, `minSessionMinutes`, `maxSessionMinutes`, `dailyCapMinutes`), plus `UpdateStudyPreferencesPayload`.
- `apps/web/src/entities/study-preferences/api/studyPreferencesApi.ts` (new) — `getStudyPreferences()` (`GET /study-preferences`) and `putStudyPreferences(payload)` (`PUT /study-preferences`), plain axios over the shared transport.
- `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.tsx` (new) — the form component: its own `useForm` instance, zod schema mirroring the server's bounds and cross-field rules, the loading/read-error/populated/saving/success/field-error/generic-error states, the `fieldset` + visually-hidden legend, the `role="status"` live region, and the save control.
- `apps/web/src/pages/profile/ui/ProfilePage.tsx` (modified) — mounts `<StudyPreferencesForm />` as a separate `Card` below the existing account card; the name/time-zone form and its `{ name, timeZone }` payload are untouched.

Tests:
- `apps/web/src/entities/study-preferences/api/studyPreferencesApi.test.ts` (new) — 7 client tests (method/path/payload unwrapping, defaults, field-level 400, cross-field 400, 401).
- `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.test.tsx` (new) — 16 component tests (pre-fill, defaults, validation matrix, successful save + announcement + re-population, field-level 400, generic error + toast, disabled-while-saving, loading spinner card, read-error + Try again, fieldset/legend, keyboard tabbing).

Docs:
- `docs/stories/EP06/artifacts/EP06E/checkpoint.md`
- `docs/stories/EP06/artifacts/EP06E/implementation.md` (this file)
- `docs/stories/EP06/EP06E-study-preferences-ui.md` — `**Status:**` and artifact pointers
- `docs/stories/EP06/README.md` — the execution queue row and the Active/Next substory fields

**No** change to `PATCH /users/me`, **no** change to the existing name/time-zone form or its payload, **no** backend change, **no** schema/migration change, **no** new shared primitive.

## AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 The profile page shows a study-preferences section (its own `Card`) with the four values pre-filled from `GET /study-preferences` (defaults `60 / 15 / 120 / 240` when unset) | **PASS.** `<StudyPreferencesForm />` renders its own `Card` and loads via `getStudyPreferences()` on mount; the form is reset from the response. The defaults case is pinned by the component test ("shows the API defaults"). | `StudyPreferencesForm.tsx` (load + reset); `StudyPreferencesForm.test.tsx` ("pre-fills the four values", "shows the API defaults") |
| 2 The form rejects, before any request, an out-of-bounds value and a broken cross-field combination, each with a message on the offending field; an invalid form never reaches the API | **PASS.** The zod schema enforces the bounds (`5..480 / 5..480 / 5..480 / 5..1440`) and the three cross-field rules via `.refine(..., { path })` attached to `minSessionMinutes` / `maxSessionMinutes` / `dailyCapMinutes`. The component tests assert `mockedPut` is not called. | `StudyPreferencesForm.tsx` (schema); `StudyPreferencesForm.test.tsx` (validation block, 6 cases) |
| 3 A valid save calls `PUT /study-preferences` and, on success, shows the values the server stored and announces "Study preferences saved." in a live region | **PASS.** `onSubmit` calls `putStudyPreferences(data)`, resets the form from the response, and sets the status message. The component test asserts the PUT argument, the re-populated value and `role="status"` text. | `StudyPreferencesForm.tsx` (onSubmit); `StudyPreferencesForm.test.tsx` ("calls PUT with the four values and announces success") |
| 4 A server-side 400 renders its field-level messages under the matching fields; any other failure shows a readable, actionable message and leaves the input intact | **PASS.** On a 400, `setError` is called per offending field via `getFieldError(apiError, field)`; otherwise `toast.error(getErrorMessage(err) || fallback)`. Input values are preserved (react-hook-form does not reset on error). | `StudyPreferencesForm.tsx` (onSubmit catch); `StudyPreferencesForm.test.tsx` ("renders field-level 400 errors", "shows a toast and keeps input values on a generic save failure") |
| 5 The section's loading state is distinguishable from the populated form (a spinner card, never defaults), and the controls are disabled while a save is in flight | **PASS.** While loading, a `Card` with a `Loader2` spinner and "Loading study preferences…" is rendered instead of the form; during save all inputs and the save button are `disabled` and the button shows its spinner (`isLoading`). | `StudyPreferencesForm.tsx` (isLoading branch, disabled props); `StudyPreferencesForm.test.tsx` ("shows a spinner card before the GET resolves", "disables controls while saving") |
| 6 The section is a separate part of the profile page with its own save control; the existing name/time-zone form keeps its `{ name, timeZone }` payload and its own behavior | **PASS.** `<StudyPreferencesForm />` is mounted below the account card; the account card's form, submit handler and payload are untouched (no edit to that block beyond the import and the mount). | `ProfilePage.tsx` (import + mount only) |
| 7 Every control is reachable and operable with the keyboard, has a visible focus ring and an accessible name; the four fields are grouped in a `fieldset` with a legend; the section is usable at a 375px viewport | **PASS (automated portion).** Native `<input type="number">` via `Input` (label → `htmlFor`/`id`), `min`/`max`/`step`/`inputMode` attributes, `fieldset` + `sr-only` legend "Study session durations", `grid-cols-1 sm:grid-cols-2`, tap targets ≥44px inherited from `Input`/`Button`. The manual 375px/keyboard-only pass is recorded as TR-E06-09 evidence (not executed in this environment). | `StudyPreferencesForm.tsx`; `StudyPreferencesForm.test.tsx` ("wraps the four inputs in a fieldset", "is keyboard operable") |
| 8 The component tests cover the pre-fill, the validation matrix, the successful save, the field-level error and the generic error path | **PASS.** 16 component tests + 7 client tests; see the Tests section. | `StudyPreferencesForm.test.tsx`, `studyPreferencesApi.test.ts` |

## TR-E06-05 / TR-E06-09 coverage

- TR-E06-05: the four fields, the client-side bounds mirror, the save round-trip, the loading/error/success states, and the keyboard operability are covered by `StudyPreferencesForm.test.tsx`.
- TR-E06-09: the manual accessibility pass (375px viewport, keyboard only) is recorded as pending manual evidence; the automated tests cover the fieldset/legend, keyboard tabbing to the save button and the disabled-while-saving state. No new manual evidence was produced in this environment.

## Verification

Working directory: `/Users/michaelrobert/Desktop/focus-app` for every command.

| Command | cwd | Result | Tested state |
|---|---|---|---|
| `pnpm --filter web test` | repo root | **80 suites / 985 tests passed**, exit 0 | `8f470d1` + EP06E code (incl. 23 new tests) |
| `pnpm --filter web test -- StudyPreferences` | repo root | **2 suites / 23 tests passed**, exit 0 | the EP06E client + component tests |
| `pnpm --filter web typecheck` | repo root | exit 0, no output | `tsc --noEmit` over `apps/web` |
| `pnpm --filter web lint` | repo root | exit 0, 0 warnings (`--max-warnings 0`) | `eslint` over `apps/web/src` |

The pre-existing, unrelated `apps/api/tsconfig.json` modification was left untouched and unstaged.

## Decisions followed

- **Control choice:** free-text number inputs (`type="number"`, `step={1}`, `min`/`max`, `inputMode="numeric"`); no presets, no slider (ui-refiner decision).
- **Section placement:** a separate `Card` mounted below the account card in `ProfilePage`; the account card and Account Actions are untouched.
- **Cross-field errors:** each rule's message is attached to the offending field (`minSessionMinutes` / `maxSessionMinutes` / `dailyCapMinutes`) via zod `.refine(..., { path })`; no summary line.
- **Labels & units:** the unit is written in the label in parentheses.
- **Responsive layout:** `grid-cols-1` below `sm`, `sm:grid-cols-2` from 640px up.
- **Field grouping:** `fieldset` with a visually-hidden legend "Study session durations".
- **Focus after save:** focus stays on the save button; the outcome is announced by the always-present `role="status"` live region.
- **Never-set case:** no "Using defaults" messaging; the form shows the values the API returns.
- **No Reset button:** values are re-read from the server on mount.
- **Loading state:** a spinner card is shown while the GET is in flight; default values are never rendered before the read resolves.
- **Success re-population:** on a successful PUT the form is reset to the response's effective values.
- **Generic save error:** `toast.error(getErrorMessage(err) || 'We could not save your study preferences. Try again.')`.
- **Client-side validation mirrors the server:** integer bounds `5..480 / 5..480 / 5..480 / 5..1440` and the cross-field rules `min ≤ sessionLength ≤ max`, `dailyCap ≥ min`.
- **Plain axios entity client** (no RTK Query), following the `availabilityApi.ts` pattern; top-level `/study-preferences` routes.
- **FSD layering:** new code lives in `entities/study-preferences/` and `features/study-preferences/`; no flat top-level folder; `ProfilePage` imports the feature component (pages may import features).

## Findings and deviations

**Findings/deviations: None.** No deviation from the child spec, the shared contract, the decision register or the UI/UX specification. No change outside EP06E's scope. No findings were recorded in the checkpoint.

## Status

Implemented — awaiting parent review. EP06E's artifacts: [checkpoint](./checkpoint.md) · [implementation record](./implementation.md).