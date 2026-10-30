# EP06E: Study-Preferences Surface

**Story ID:** EP06E
**Title:** Frontend — a study-preferences section on the profile page that reads and writes the student's study defaults
**Parent epic:** [EP06: Study Planning & Scheduling](../../epics/EP06-study-planning-and-scheduling.md) (Jira STUDY-15)
**Parent:** [EP06 breakdown](./README.md)
**Milestone:** M3
**Layer:** Frontend
**Status:** Needs refinement — the `ui-refiner` pass is complete (2026-10-30); a technical-refine pass is still required before implementation (D06-15).
**Dependencies:** EP06A implemented (the `GET/PUT /study-preferences` endpoints). EP06F/EP06G are independent of this story's surface.
**Jira key:** Pending creation
**Refined:** 2026-10-30 (ui-refiner pass). Technical-refine pass not yet run; this file is the planner's breakdown plus the settled UI/UX.

## Summary

The epic's first acceptance criterion is that students can set preferred study-session durations. EP06A owns the shape and the endpoints; this story is the surface where the student sets them — a "Study preferences" section on the existing profile page, next to the time zone the planner also depends on.

## Description & bounded scope

### In scope

1. **The entity client** `apps/web/src/entities/study-preferences/api/studyPreferencesApi.ts` (and its types in `apps/web/src/entities/study-preferences/model/types.ts`) — `getStudyPreferences()` and `putStudyPreferences(payload)` over the shared axios transport, following the `availabilityApi.ts` / `assignmentApi.ts` pattern.
2. **The preferences form** `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.tsx` — the four values (the default session length, the shortest and the longest session, the daily cap), the client-side validation that mirrors the server's bounds and cross-field rules, the save, and the re-read that shows the stored values.
3. **The mount** — the section is mounted on the existing profile page (`apps/web/src/pages/profile/ui/ProfilePage.tsx`) as a **separate section with its own save control**. It is **not** part of the existing name/time-zone form: that form deliberately sends only `{ name, timeZone }` and leaves `preferences` untouched (D106-9), and EP06 must not change that contract.
4. **The states** — the loading state (the values are not yet known), the error state (the read failed, or the save failed with a field-level error), the success state (the values were saved), and the empty/unset case (the API returns the defaults, so the form always shows a usable value).
5. **Tests** — the component tests for the form (TR-E06-05).

### Out of scope

- The plan page, the preview and the editing — **EP06F**.
- The remaining-work and deficit surfaces — **EP06G**.
- Changing the profile page's existing name/time-zone form or its payload.
- Changing the profile page's existing sections, layout or copy.
- Any change to `PATCH /users/me` (D06-14).
- Session-duration presets: settled by the `ui-refiner` pass — **free-text number inputs, no presets** (see Technical Notes → Decisions).

## Source requirement references

- **Epic AC-E06-01** ("Students can set preferred study-session durations") — the frontend half.
- **TR-E06-05** (this child's test obligations) and **TR-E06-09** (the recorded manual accessibility pass — this surface's manual pass is part of TR-E06-09's evidence).
- **Shared DoD** — items 1, 2, 4, 5, 6, 7, 8 apply; items 10/11 belong to the combined EP06 parent review.
- **Decisions:** D06-4 (the shape and the bounds the form mirrors), D06-14 (the bag's second writer — the form's own endpoint is the supported path), D06-15 (this story's `Needs refinement` status), D06-16 (the key names); and the parent README's **Shared API/data contract** → *The study-preferences shape* and *Endpoints*.

## Acceptance criteria

1. The profile page shows a study-preferences section (its own `Card`) with the four values — the default session length, the shortest session, the longest session and the daily cap — pre-filled from `GET /study-preferences` (so a student who has never set them sees the documented defaults `60 / 15 / 120 / 240`).
2. The form rejects, before any request, a value outside the server's bounds and a broken cross-field combination (`min > sessionLength`, `sessionLength > max`, `dailyCap < min`), each with a message attached to the offending field; an invalid form never reaches the API.
3. A valid save calls `PUT /study-preferences` and, on success, shows the values the server stored (the response is the effective set) and announces the success in a live region ("Study preferences saved.").
4. A server-side 400 (the server's merged validation rejected the result) renders its field-level messages under the matching fields; any other failure shows a readable, actionable message and leaves the student's input intact.
5. The section's loading state is distinguishable from the populated form (a spinner card, not a form showing defaults), and the controls are disabled while a save is in flight, so a double submit cannot fire twice.
6. The section is a **separate** part of the profile page with its own save control; the existing name/time-zone form keeps its own payload (`{ name, timeZone }`) and its own behavior, and saving the study preferences does not submit that form.
7. Every control is reachable and operable with the keyboard, has a visible focus ring and an accessible name; the four fields are grouped in a `fieldset` with a legend; the section is usable at a 375px viewport.
8. The component tests cover the pre-fill, the validation matrix, the successful save, the field-level error and the generic error path.

## Tests to add / update

- `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.test.tsx` (new) — the component tests:
  - the four values are pre-filled from the API response;
  - the API's defaults are shown when the response carries them;
  - the validation matrix (each out-of-range value and each broken cross-field rule blocks the submit and names the field);
  - a valid submit calls `PUT /study-preferences` with the four values and announces the success;
  - a 400 with a field-level `errors` map renders the message under the matching field;
  - a generic failure renders a readable message and keeps the input;
  - the controls are disabled while the save is in flight;
  - the keyboard path: the section is reachable by tabbing and the save is operable with the keyboard;
  - **(ui-refiner)** a loading spinner card is shown before the GET resolves and does not render default values prematurely;
  - **(ui-refiner)** a read failure renders an alert card with a "Try again" button that re-runs the GET;
  - **(ui-refiner)** the four inputs sit in a `fieldset` with an accessible legend;
  - **(ui-refiner)** on success the form re-populates from the PUT response and the live region reads "Study preferences saved.";
  - **(ui-refiner)** a generic save failure shows a toast and keeps the input values.
- `apps/web/src/entities/study-preferences/api/studyPreferencesApi.test.ts` (new) — the client calls the right method and path and unwraps the payload (the `availabilityApi.test.ts` pattern).

## Technical notes

### Verified baseline (inspected 2026-10-30 at HEAD `9b1ec19`)

- `apps/web/src/pages/profile/ui/ProfilePage.tsx` — the M1 form: a zod schema over `{ name, timeZone }` (`:21-27`), `useForm` with `zodResolver` (`:43-61`), the submit that sends **only** `{ name, timeZone }` and leaves `preferences` untouched (`:111-129`, D106-9), the field-error wiring through `getFieldError` (`:137-148`) and the `Input` component's `error` prop (`:166-170`). The page's own layout is `max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12` with `card` sections (`:153-217`).
- `apps/web/src/shared/ui/` — the EP10 primitives this surface must use: `Button` (with `isLoading`), `Input` (with `label` and `error`), `Select`, `Card`, `Badge`, `EmptyState`, `Dialog`. The semantic tokens live in `apps/web/tailwind.config.js` + `apps/web/src/index.css`; tap targets are ≥ 44px and focus rings are visible.
- `apps/web/src/entities/availability/api/availabilityApi.ts` (+ its `.test.ts`) — the entity-client precedent: plain axios over the shared transport.
- `apps/web/src/shared/api/httpClient.ts` — the shared transport; the base URL is `/api` and the Vite proxy strips it (`apps/web/vite.config.ts:15-26`).
- `apps/web/src/shared/lib/errors.ts` — `getFieldError(err, field)` and `getErrorMessage(err)`, the shared helpers for rendering an API error.
- `apps/web/src/features/availability/ui/AvailabilitySlotForm.tsx` — the closest form precedent in the codebase (a validated form with an inline error and a live region).
- `apps/web/.eslintrc.cjs` — the FSD layer rules (`import/no-restricted-paths`); the `@/` alias points at `apps/web/src`. The new code goes in `entities/study-preferences/` and `features/study-preferences/`, never in a flat top-level folder.

### Implementation notes (concrete)

1. **The entity client.** `getStudyPreferences(): Promise<StudyPreferences>` → `GET /study-preferences`; `putStudyPreferences(payload: Partial<StudyPreferences>): Promise<StudyPreferences>` → `PUT /study-preferences`. The types mirror the API contract exactly (`sessionLengthMinutes`, `minSessionMinutes`, `maxSessionMinutes`, `dailyCapMinutes` — all numbers).
2. **The form's validation.** The client-side rules mirror the server's exactly: the integer bounds `5..480 / 5..480 / 5..480 / 5..1440` and the cross-field rules `min ≤ sessionLength ≤ max` and `dailyCap ≥ min`. A zod schema in the feature folder (the `ProfilePage` pattern) is the natural fit, so the same `getFieldError`/`error` wiring applies.
3. **The section, not the form.** The study preferences are mounted as their own block on the profile page with their own `useForm` instance, their own submit handler and their own status region. The existing name/time-zone form is not touched — the profile page's own `updateProfile` payload stays `{ name, timeZone }`.
4. **The status region.** An always-present, empty-at-rest `role="status"` region announces the outcome ("Study preferences saved."), following EP04's D128B-12 pattern — the announcement is a status, not an error, and the error case uses the field-level errors or the sanitized toast.
5. **The `ui-refiner` pass.** This story's layout, the control choice for each value (a free-text number input vs. a preset select), the copy, the empty/unset presentation, the responsive behaviour and the keyboard behaviour are settled by the `ui-refiner` **before** implementation, and this file is amended in place by that pass (the same pattern EP04's SP-128B and EP05's EP05B/C used).

### UI/UX specification (ui-refiner pass, 2026-10-30)

**Element decisions**

- **Reuse** `Input` (`type="number"`, `label`, `error`, `hint`) for all four fields — it already carries `aria-invalid`/`aria-describedby`, the danger border and the ≥44px mobile tap target.
- **Reuse** `Button` (`variant="primary"`, `isLoading`) for the save action; `Card` for the section container; `toast` (react-hot-toast) for the generic save failure; `getFieldError`/`getErrorMessage` for API errors.
- **Reuse** the zod + `useForm` + `zodResolver` pattern from `ProfilePage` (same `setError`/`error` wiring).
- **New** `apps/web/src/entities/study-preferences/model/types.ts` — `StudyPreferences` interface mirroring the API shape exactly.
- **New** `apps/web/src/entities/study-preferences/api/studyPreferencesApi.ts` — `getStudyPreferences()` (`GET /study-preferences`) and `putStudyPreferences(payload)` (`PUT /study-preferences`), plain axios over the shared transport (the `availabilityApi.ts` pattern).
- **New** `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.tsx` — the form component, owning its own `useForm` instance, submit handler and status region. Colocate the zod schema in the form file (the `ProfilePage` pattern) or in `features/study-preferences/model/schema.ts` — implementer's choice.
- **No new primitive.** No slider, no preset select, no dialog, no new shared component. Number inputs only.

**Layout & hierarchy**

- The section is a **separate `Card`** rendered in `ProfilePage` **below the existing account card**, inside the same `max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12` container. The existing account card and the Account Actions block are untouched.
- Card heading: `Study preferences` (`h2`, `text-lg font-semibold text-text`), with a one-line sub-caption: "How long your study sessions should be. Used when generating a study plan." (`text-sm text-text-muted`).
- The four fields sit in a `fieldset` with a visually-hidden legend "Study session durations" (`sr-only`), inside a `grid grid-cols-1 gap-4 sm:grid-cols-2`. DOM order: default session length → shortest session → longest session → daily cap (wraps two-per-row at `sm:`).
- The save control lives in a `flex flex-col sm:flex-row gap-4` row at the bottom of the card, aligned like the account form: `Save study preferences` (primary, `isLoading` while saving). No Reset button — the values re-read from the server on mount.
- An always-present, empty-at-rest `role="status"` region (`aria-live="polite"`, `aria-atomic="true"`, `min-h-5`) sits directly under the fieldset, above the save row, and hosts both the success announcement and the in-flight spinner.

**States**

- **Loading (read in flight):** render the `Card` with a centered spinner (`Loader2` animate-spin, `motion-reduce:animate-none`) and the text "Loading study preferences…" — never the form with default values, so a student cannot mistake defaults for stored values.
- **Read error:** render the `Card` with a `role="alert"` block ("We could not load your study preferences. Try again.") plus a "Try again" button that re-runs `GET /study-preferences`.
- **Populated:** form pre-filled from the response (defaults when unset). No "Using defaults" badge or hint.
- **Saving:** all four inputs and the save button disabled; the save button shows its spinner (`isLoading`); the live region shows nothing extra (the success announcement lands on completion).
- **Success:** re-populate the form from the `PUT` response (the effective set) and announce "Study preferences saved." in the live region.
- **Save error, field-level (400):** `setError` per offending field (`sessionLengthMinutes`, `minSessionMinutes`, `maxSessionMinutes`, `dailyCapMinutes`) via `getFieldError`; the `Input` `error` prop renders the message; input values stay.
- **Save error, generic:** `toast.error(getErrorMessage(err) || 'We could not save your study preferences. Try again.')`; input values stay.

**Accessibility**

- All four inputs are native `<input type="number">` with a real `<label>` (via `Input`'s `label` prop → `htmlFor`/`id`), an accessible name, and `min`/`max`/`step={1}`/`inputMode="numeric"` attributes.
- The `fieldset` + `legend` (visually hidden) groups the four fields for screen readers; the legend text is "Study session durations".
- `aria-invalid` and `aria-describedby` (pointing at the error/hint paragraph) are provided by `Input` whenever an error or hint is present.
- Focus rings: `Input`'s `focus:border-accent focus:ring-2 focus:ring-accent focus:outline-none` and the `Button`'s `focus-visible:ring-2 focus-visible:ring-focus-ring` — unchanged, no override.
- Non-colour-only distinctions: errors use the danger border **plus** the text message under the field; the loading spinner is paired with text.
- Reduced motion: the spinner uses `motion-reduce:animate-none`; no other animation is introduced.
- Touch targets: `Input`'s `max-sm:min-h-[44px]` and `Button`'s `max-sm:min-h-[44px]` already satisfy ≥44px.
- Keyboard: tab order follows DOM order (default → shortest → longest → daily cap → save); `Enter` in any field submits; no key events are intercepted; focus stays on the save button after a successful save (no focus jump), with the outcome announced by the live region.

**Responsive**

- Mobile (<640px): single column, full-width inputs, save button full-width row; tap targets ≥44px.
- `sm:` and up: two-column grid for the four fields; save row right-aligned.
- The section inherits the page container (`max-w-2xl`) so it never exceeds the account card's width.

**Copy (concrete)**

- Card heading: `Study preferences`
- Card sub-caption: `How long your study sessions should be. Used when generating a study plan.`
- Field labels: `Default session length (minutes)`, `Shortest session (minutes)`, `Longest session (minutes)`, `Daily cap (minutes)`
- Field hints: `5–480` for the first three, `5–1440` for the daily cap.
- Save button: `Save study preferences`
- Loading text: `Loading study preferences…`
- Read-error text: `We could not load your study preferences. Try again.`
- Read-error button: `Try again`
- Success announcement: `Study preferences saved.`
- Generic save-error toast: `We could not save your study preferences. Try again.`
- Cross-field messages (attached to the offending field):
  - `minSessionMinutes` when `min > sessionLength`: "Shortest session must be no longer than the default session length."
  - `maxSessionMinutes` when `sessionLength > max`: "Longest session must be at least the default session length."
  - `dailyCapMinutes` when `dailyCap < min`: "Daily cap must be at least the shortest session."
- Bounds messages: `Must be between 5 and 480.` (first three) / `Must be between 5 and 1440.` (daily cap).
- Integer message: `Must be a whole number.`

### Decisions

- **Control choice:** free-text number inputs (`type="number"`, `step={1}`, `min`/`max` attributes) with bounds shown as hint text. No presets, no slider. (ui-refiner, 2026-10-30)
- **Section placement:** a separate `Card` below the existing account card, inside the same page container; the account card and Account Actions are untouched. (ui-refiner, 2026-10-30)
- **Cross-field errors:** each rule's message is attached to the offending field (`minSessionMinutes` / `maxSessionMinutes` / `dailyCapMinutes`) via zod `.refine(..., { path })`; no summary line. (ui-refiner, 2026-10-30)
- **Labels & units:** the unit is written in the label in parentheses — "Default session length (minutes)" etc. (ui-refiner, 2026-10-30)
- **Responsive layout:** one column below `sm`, two-column grid (`sm:grid-cols-2`) from 640px up. (ui-refiner, 2026-10-30)
- **Field grouping:** the four inputs are wrapped in a `fieldset` with a visually-hidden legend "Study session durations". (ui-refiner, 2026-10-30)
- **Focus after save:** focus stays on the save button; the outcome is announced by the always-present `role="status"` live region. (ui-refiner, 2026-10-30)
- **Never-set case:** no special "Using defaults" messaging; the form simply shows the values the API returns. (ui-refiner, 2026-10-30)
- **Assumption (Reset button):** no Reset button on the study-preferences card; values are re-read from the server on mount. Only a save control is provided. (ui-refiner, 2026-10-30)
- **Assumption (legend visibility):** the fieldset legend is visually hidden (`sr-only`); the card heading carries the visible title. (ui-refiner, 2026-10-30)
- **Assumption (loading state):** a spinner card is shown while the GET is in flight; default values are never rendered before the read resolves. (ui-refiner, 2026-10-30)
- **Assumption (success re-population):** on a successful PUT the form is reset to the response's effective values (so a repaired/clamped value the server stored is shown). (ui-refiner, 2026-10-30)

### Risks / open questions (none blocking)

- **The presets.** Settled: no presets — free-text number inputs (see Decisions).
- **The bag's second writer (D06-14).** A value set through `PATCH /users/me` by another client would not appear in this form until the form re-reads; the form always shows what the API returns, which is the effective set.
- **The profile page is EP06E's host but not EP06E's to redesign.** The section is a separate `Card` below the account card and does not disturb the sections above it.
- **Technical refinement still pending.** Files, DTOs, wiring and the zod schema placement are left to the technical-refiner pass; this pass settled UI/UX only.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Invalid input is validated — client-side, before any request, with the server's bounds and cross-field rules mirrored; the server remains authoritative.
3. Academic data is scoped to the authenticated student — the endpoint is scoped server-side (EP06A); the client sends no user id.
4. API errors produce actionable messages — the field-level 400 renders under the matching field; any other failure shows a readable message.
5. Loading, empty and error states are handled — the read's loading state, the write's in-flight state, the success announcement and the error state.
6. Core interactions support keyboard accessibility — every control is a native element with a visible focus ring and an accessible name; the section is reachable and operable by keyboard; the **manual** pass (375px viewport and keyboard only) is recorded as TR-E06-09's evidence.
7. Responsive layouts work on desktop and mobile — the section is usable at 375px and at desktop widths; the **manual** pass at 375px is recorded as TR-E06-09's evidence.
8. Business rules have automated tests — the component tests and the entity-client tests.
9. API changes are documented — not applicable in this story (no API change); the contract is EP06A's and lives in the parent README.
10. Integrated review — the combined EP06 parent review.
11. Reviewer walkthrough — the combined EP06 parent review.

## Tracker reference

Jira key: Pending creation. No sync was authorized for this planning task. (If the key is later created, tracker reconciliation is a planner/jira-sync action — this file stays the source of truth.)

## Sizing

- **Outcome:** the student can set, see and re-set their study-session defaults from the profile page, with the server's bounds and cross-field rules mirrored in the form and every outcome announced.

- **Request/token estimate:** 1 request/token — an entity client, a four-field validated form with its own save and status region, a mount on the existing profile page, and the component tests. The uncertainty is in the `ui-refiner`'s control choice, which may change the field markup but not the scope.

- **Model recommendation:** 2 — an ordinary validated form over a settled API contract, using the page's existing patterns. A value-tier model can carry it out; the risk is in the wiring to the existing page, not in the design.

- **Files:**
  - `apps/web/src/entities/study-preferences/model/types.ts` (new);
  - `apps/web/src/entities/study-preferences/api/studyPreferencesApi.ts` (new);
  - `apps/web/src/entities/study-preferences/api/studyPreferencesApi.test.ts` (new);
  - `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.tsx` (new);
  - `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.test.tsx` (new);
  - `apps/web/src/pages/profile/ui/ProfilePage.tsx` (modify — mount the section).

- **Start context:** this story file; the parent README's shared API/data contract → *The study-preferences shape* + *Endpoints*, and the decision register (D06-4, D06-14, D06-15, D06-16); EP06A's story file (the endpoints this client calls); `apps/web/src/pages/profile/ui/ProfilePage.tsx` (the host page and its patterns); `apps/web/src/shared/ui/` (the EP10 primitives); `apps/web/src/entities/availability/api/availabilityApi.ts` (the client precedent); `apps/web/src/shared/lib/errors.ts`. Do not read unrelated epic stories.

- **Verification:** `pnpm --filter web test -- StudyPreferences` (the component and client tests); `pnpm --filter web test` (the whole web suite); `pnpm --filter web typecheck`; `pnpm --filter web lint`; a manual browser pass at a 375px viewport and with the keyboard only (recorded as part of TR-E06-09's evidence).

- **Dependencies / exclusions:** EP06A implemented. Excludes the plan page (EP06F), the remaining-work and deficit surfaces (EP06G), the profile page's existing name/time-zone form and its payload, any change to `PATCH /users/me`, and the session-duration presets (settled: no presets — free-text number inputs).

## UI/UX gaps for the `ui-refiner`

All eight gaps recorded for this pass are settled — see Technical Notes → **UI/UX specification (ui-refiner pass)** and **Decisions** above. No open UI/UX question remains for this story.