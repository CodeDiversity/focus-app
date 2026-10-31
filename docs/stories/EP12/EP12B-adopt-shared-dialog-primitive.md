# EP12B — Adopt the shared `Dialog` primitive across hand-rolled modals

**Stable ID:** EP12B
**Title:** Adopt the shared `Dialog` primitive across hand-rolled modals
**Parent Epic:** [EP12: Tech Debt Cleanup](../../epics/EP12-tech-debt-cleanup.md)
**Parent Story:** [EP12](./README.md)
**Milestone:** M5
**Layer:** Frontend
**Status:** Needs refinement → **Ready** (refined 2026-10-31)
**Dependencies:** EP10B shared `Dialog` primitive (reviewed). No blocking dependency on other EP12 children.
**Jira:** Pending creation
**Refined:** 2026-10-31

## Summary and Bounded Scope

Migrate the 11 hand-rolled modal dialogs (`role="dialog" aria-modal="true"` in `apps/web/src/features/**`)
to the shared `apps/web/src/shared/ui/Dialog.tsx` primitive, so portal, focus-trap, scroll-lock,
Escape, backdrop, animation, and focus restoration are implemented once. One small,
backwards-compatible primitive extension is approved (D12B-1): an optional `busy` prop for the
in-flight state every dialog hand-rolls today. Refactor only; no copy, layout, or validation changes.

**Verified inventory (11 in-scope files, grep `role="dialog"`):**

| Family | File | Hand-rolled a11y lines (to delete) |
|---|---|---|
| assignments | `features/assignments/ui/DeleteAssignmentDialog.tsx` | trap+escape `:87-122`, focus-hold `:42-53`/`:60`/`:84`, skip-restore `:38`/`:51`/`:64` |
| assignments | `features/assignments/ui/DeleteSubtaskDialog.tsx` | trap+escape `:76-114`, focus-hold `:44-53`/`:56`/`:74`, skip-restore `:37`/`:47`/`:59` |
| assignments | `features/assignments/ui/AssignmentForm.tsx` | trap+escape around `:175`+, backdrop guard `:266`, focus-hold `:159`, container markup `:262-276` |
| courses | `features/courses/ui/CourseForm.tsx` | trap+escape `:233-238`+ |
| courses | `features/courses/ui/MeetingForm.tsx` | trap+escape `:141-147`+ |
| courses | `features/courses/ui/DeleteMeetingDialog.tsx` | same delete-dialog pattern, escape `:79` |
| courses | `features/courses/ui/ArchiveCourseDialog.tsx` | same delete-dialog pattern, escape `:73` |
| availability | `features/availability/ui/AvailabilitySlotForm.tsx` | trap+escape→`requestClose()` `:194-200`+ |
| availability | `features/availability/ui/DeleteAvailabilitySlotDialog.tsx` | same delete-dialog pattern, escape `:74` |
| semesters | `features/semesters/ui/DeleteSemesterDialog.tsx` | same delete-dialog pattern, escape `:66` |
| calendar | `features/calendar/ui/CalendarEventDetails.tsx` | trap+escape `:34-`/`:52`/`:98-` |

Shared primitive: `apps/web/src/shared/ui/Dialog.tsx` + `Dialog.test.tsx` (EP10B, reviewed).

**Explicit out-of-scope list** (do not drift):
- `widgets/header/ui/Header.tsx:609` — the header navigation drawer is `role="dialog"`
  markup with *different semantics* (top-anchored panel); leave it.
- Onboarding wizard shell (`features/onboarding/ui/Step1-3*`) — full-page steps, not overlays.
- `RowActionsMenu.tsx` / `CourseActionsMenu.tsx` Escape handlers — **dropdown menus, not
  dialogs**; the grep hits are not migrations.
- No new Dialog props beyond D12B-1; no copy changes; no form/validation changes.

## Source Requirement References

- Tech-debt item **TD-02** (see breakdown README): 11 hand-rolled dialogs duplicating
  focus-trap/scroll-lock/Escape/backdrop logic instead of `shared/ui/Dialog`.
- Builds directly on the EP10B shield pass; inherits its Dialog semantics as the baseline.
- Divergence verdicts recorded in Decisions D12B-1/D12B-2 (**user approval 2026-10-31**).

## Acceptance Criteria

- [ ] **AC-12B-1 (primitive `busy` support, D12B-1).** `Dialog.tsx` gains an optional
  `busy?: boolean` prop: while busy, Escape and backdrop clicks are **internally inert** (the
  caller's `onClose` is never invoked, so per-dialog close guards are unnecessary), and
  keyboard focus is **held on the dialog container** whenever the focusable set inside the
  dialog becomes empty or focus would otherwise be outside the dialog (inputs/buttons disable
  mid-flight today). The container sets `aria-busy={busy}` when the prop is provided.
  Backwards compatible: dialogs that never pass `busy` behave exactly as reviewed in EP10B.
- [ ] **AC-12B-2 (single implementation).** All 11 in-scope dialogs render via `Dialog`
  (portal + trap + escape + backdrop + scroll-lock + animation come from the primitive). The
  deleted per-dialog code includes: `FOCUSABLE_SELECTOR` copies, `document.addEventListener`
  keydown traps, `document.body.style.overflow` handling where present, backdrop divs,
  fixed-inset wrappers, and the focus-hold/skip-restore effects of the delete-dialog pattern.
- [ ] **AC-12B-3 (per-dialog semantics preserved).** Delete dialogs wire `busy={isDeleting}`
  and keep the error `role="alert"` block as primitive children; form dialogs keep the
  `<form>` (children) with the submit/cancel buttons inside it, `busy={isSubmitting}`, and
  pass `max-w-lg max-h-[90vh] overflow-y-auto` via `className`; `AvailabilitySlotForm` maps
  the primitive's Escape/backdrop to its dirty-check `requestClose()` via `onClose`; dynamic
  titles ("Delete {title}?", "Edit x") flow through the `title` prop; the Delete button's
  `aria-label` is retained; cancel-focus-restore and "success skips restoring to a deleted
  trigger" behavior is preserved (primitive's restore-to-disconnected is a no-op, so
  `skipRestoreRef` logic collapses away).
- [ ] **AC-12B-4 (out-of-scope untouched).** Header drawer, onboarding shell, action menus,
  copy, layouts, validation, and API calls are unchanged (diff shows only modal-shell
  replacement).
- [ ] **AC-12B-5 (existing tests, updated only for the shell).** All 11 dialog spec files and
  every page/section spec that mounts them pass. Updates are limited to: `getByRole('dialog')`
  surviving (it must — the primitive keeps `role="dialog"`), removed assertions on markup the
  primitive owns, and `findBy*` waits for the added close animation. No test loses coverage of
  behavior: Escape-cancel, backdrop-cancel, focus-restore, in-flight freeze, error rendering,
  and submit flows still all assert.
- [ ] **AC-12B-6 (new module-level regression guards).** The named new `Dialog` cases in
  § Tests (busy inert + focus-hold) are added and pass, plus one migrated-dialog fixture
  asserting focus returns to the trigger on cancel.
- [ ] **AC-12B-7 (clean gates).** `pnpm --filter @studypilot/web test`,
  `lint --max-warnings 0`, `typecheck`, `build` all exit 0; no new lint warnings.

## Tests

Extend `apps/web/src/shared/ui/Dialog.test.tsx`:

| Case | Named description | Why |
|---|---|---|
| T-12B-1 | `busy` — 'Escape does not invoke onClose while busy, and does after it clears' | the in-flight freeze, now structural in the primitive |
| T-12B-2 | `busy` — 'backdrop click does not invoke onClose while busy' | same freeze for pointer users |
| T-12B-3 | `busy` — 'holds focus on the dialog container when its focusable children all disable' | replicate the mid-flight disable of the form/delete dialogs (render buttons disabled on rerender); assert the container has focus |
| T-12B-4 | 'container advertises aria-busy when busy is passed, none otherwise' | the AC-12B-1 accessibility announcement |

Add/extend in the pilot family spec `DeleteAssignmentDialog.test.tsx`:

| Case | Named description |
|---|---|
| T-12B-5 | 'returns focus to the trigger button on cancel' (confirm existing coverage first; add only if absent — grep the file for `focus`) |

The other ten migrated dialogs gain **no new cases**: their existing specs
(`DeleteSubtaskDialog.test.tsx`, `AssignmentForm.test.tsx` etc., all in their `ui/` folders)
already pin Escape, backdrop, focus, error, and submit behavior and must keep passing unchanged
in intent (AC-12B-5).

Verification: `pnpm --filter @studypilot/web test`, `pnpm --filter @studypilot/web lint`,
`pnpm --filter @studypilot/web typecheck`, `pnpm --filter @studypilot/web build`.

## Technical Notes

### Landing order (incremental, one commit per family)

1. **Primitive first:** add `busy` + T-12B-1…4 in the same commit as the pilot migration.
2. **Pilot = `DeleteAssignmentDialog`** (the family with the most hand-rolled semantics:
   skip-restore, focus-hold, escape-freeze). It proves D12B-1 end-to-end.
3. Then, in order: remaining 5 delete dialogs → 4 form dialogs → `CalendarEventDetails`.
   Each family lands as one focused commit; do not batch all 11 into one commit.

### Implementer constraints

- **`busy` is internal-inert, not caller-guard**: the primitive ignores Escape/backdrop while
  `busy` is true; do NOT also wrap `onClose` in `isSubmitting` guards except where the guard
  is about something else (`requestClose()` dirty-check in `AvailabilitySlotForm` — that one
  stays, it decides close permission, not in-flight state).
- **Backdrop for busy dialogs:** use `busy` (not `disableBackdropClose={isSubmitting}`) —
  `busy` already covers the backdrop; passing both is redundant.
- **Form dialogs keep their `<form>` in children** with the footer buttons inside it (matches
  today's DOM and submit semantics). Do not switch to the primitive's `footer` prop — that
  would take the buttons out of the form and break `onSubmit`.
- **`className` for forms:** `max-w-lg max-h-[90vh] overflow-y-auto` replaces the hand-rolled
  container classes; delete dialogs take no `className` (primitive default `max-w-md` matches).
- **Error blocks stay in children** with their `role="alert"` and danger styling identical to
  today (the primitive's `description` prop is for static subtitle copy only).
- **Do not re-flow titles** into `aria-label`s; the primitive's `aria-labelledby` + `title`
  prop is the accessible name, as today.
- **Accepted passive deltas (D12B-2):** body scroll-lock while open, the close/open transition
  (tests wait for it), and the design-system `text-h3` title style. Do not compensate for or
  suppress any of them.
- **Portal target is `document.body` in the primitive** — unchanged from today's fixed-inset
  wrappers, so `getByRole('dialog')` queries keep working.

### Decisions

| ID | Question | Decision | Provenance |
|---|---|---|---|
| D12B-1 | Does EP12B extend the shared `Dialog` primitive to support in-flight state (frozen Escape/backdrop + focus-hold), which all 11 dialogs hand-roll today? | **Yes — add an optional `busy?: boolean` prop** (inert close + container focus-hold + `aria-busy`). One prop, backwards compatible, removes the need for any caller-side key-handling code. | **User approval 2026-10-31** ("Add optional busy prop"). |
| D12B-2 | Do migrated dialogs adopt the primitive's scroll-lock, close animation, and `text-h3` title style, which they never had? | **Yes, as EP10 alignment.** The primitive's reviewed semantics become the dialog baseline; tests update only for markup/animation waits. | **User approval 2026-10-31** ("Accept as EP10 alignment"). |
| D12B-3 | Pilot and landing granularity? | **Pilot = `DeleteAssignmentDialog`** (richest hand-rolled semantics); land family-per-commit: primitive+pilot → 5 delete dialogs → 4 form dialogs → details dialog. Proves the primitive gap before mass migration. | Refiner 2026-10-31, grounded in verified per-family semantics. |
| D12B-4 | Does the migration finish what the header drawer / onboarding shell / action menus would need? | **No.** Those are different semantics (top-anchored drawer, full-page steps, dropdown menus) — documented exclusions, potential future story. | Refiner 2026-10-31. |

## Definition of Done

Shared DoD items 1, 5, 6, 8, 10 apply. Item 6 (keyboard accessibility) is the substance: the
primitive's trap/Escape/busy-hold must behave identically across all 11 dialogs. Items 2, 3,
4, 7, 9 are not applicable (no data, API, or layout change).

## Tracker reference

Jira key: Pending creation.

## Sizing Block

| Field | Value |
|---|---|
| **Outcome** | All 11 hand-rolled modals use `shared/ui/Dialog`; ~450 lines of duplicated trap/escape/backdrop/scroll code deleted; primitive gains one `busy` prop; existing specs keep their coverage with markup-only updates; new busy regression guards in `Dialog.test.tsx`. |
| **Request/token estimate** | ~2 requests. Primitive + pilot needs care (in-flight semantics), families 2–4 are repetitive once the pilot pattern is settled. |
| **Model recommendation** | 3 — many files, but each migration must preserve a pinned semantic (escape-freeze, focus-hold, skip-restore, dirty-check close); a mechanical sweep without the busy prop would regress in-flight UX. |
| **Production files** | `apps/web/src/shared/ui/Dialog.tsx` (busy prop), then the 11 files listed in § Summary |
| **Test files** | `apps/web/src/shared/ui/Dialog.test.tsx` (T-12B-1…4), `DeleteAssignmentDialog.test.tsx` (T-12B-5 if absent); the other spec files only as markup-wait updates |
| **Minimal start context** | `shared/ui/Dialog.tsx` + `Dialog.test.tsx`, `DeleteAssignmentDialog(.test).tsx`, one form dialog (`AssignmentForm.tsx:255-276`), `AvailabilitySlotForm.tsx` (`requestClose`) |
| **Verification commands** | `pnpm --filter @studypilot/web test`, `pnpm --filter @studypilot/web lint`, `pnpm --filter @studypilot/web typecheck`, `pnpm --filter @studypilot/web build` |
| **Dependencies** | EP10B reviewed; D12B-1/D12B-2 settled by user approval 2026-10-31 |
| **Exclusions** | header drawer, onboarding shell, action menus, copy/layout/validation changes, Dialog props beyond `busy` |
