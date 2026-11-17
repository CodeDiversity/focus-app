# EP14D — Accessibility Debt from the EP13 Pass

**Story ID:** EP14D
**Parent epic:** [EP14: Adaptive Scheduling Follow-ups](../../epics/EP14-adaptive-scheduling-follow-ups.md)
**Milestone:** proposed M7 (D14-2)
**Layer:** Frontend (+ E2E gate)
**Status:** Reviewed — EP14 combined review round 2 passes (reviewer, 2026-11-16, at `5e35f2b`; [artifacts/EP14/review.md](./artifacts/EP14/review.md)). Previously: Implemented — awaiting parent review (implementer, 2026-11-16); record: [artifacts/EP14D/implementation.md](./artifacts/EP14D/implementation.md)
**Dependencies:** none. Sources: EP13R D-R9, D-R10, D-R11, D-R12 (user rulings 2026-11-16); F-EP13M-01, -02, -04, -05.

## Plan at a glance

- **What this changes:** Escape returns focus to the trigger on the assignment-create dialog and the phone-width calendar detail; assignment-dialog controls reach 44px; the success badge's text meets 4.5:1; calendar chips' accessible names contain their visible text; and the axe gate in `e2e/adaptive-scheduling.spec.ts` drops both allowlist entries.
- **Why it improves it:** keyboard and screen-reader users lose their place after closing two dialogs; low-vision users can't read success badges; voice-control users can't activate calendar chips by what they see (product, WCAG 2.4.3 / 2.5.8 / 1.4.3 / 2.5.3). The allowlist was a temporary truce (code).
- **Decisions needing you:** none ▲; D-D1…D-D3 auto-ratify (visual token and copy changes, same information).
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Fix the four pre-existing accessibility defects EP13's combined pass found,
and prove it by running the EP13 axe gate with no exclusions.

## Scope

**In:** the two dialog trigger sites, assignment-dialog control sizing, the `Badge` success variant (shared — every consumer benefits), `CalendarEventChip` naming, the two existing E2E tests, the allowlist removal.
**Out:** a general a11y audit of untouched surfaces; restyling beyond the success pairing.

## Source requirement references

AC-E14-05; TR-E14-05; DoD-6, DoD-7, DoD-8.

## Acceptance criteria

1. After Escape closes the assignment-create dialog (opened from the empty-list button) and the phone-width calendar event detail, focus is on the element that opened it — `e2e/assignments-list.spec.ts:23` and `e2e/calendar.spec.ts:100` pass. *(Line reference note, R-EP14-08c: the same test sits at `:101` after one comment line was added by EP14D.)*
2. At 375px every interactive control in the assignment dialog is ≥ 44px tall — `e2e/assignments-list.spec.ts:168` passes.
3. Success-badge text meets ≥ 4.5:1 against its background, and every calendar chip's accessible name contains its visible text in order (WCAG 2.5.3).
4. `expectNoAxeViolations` in `e2e/adaptive-scheduling.spec.ts` has no `ignore` predicate, and all seven journeys stay green.

## Tests

- AC1/AC2: the three existing E2E tests above (no new specs needed); a component test for each trigger site asserting focus restoration.
- AC3: `Badge.test.tsx` pins the success classes; `CalendarEventChip.test.tsx` asserts the accessible name starts with the visible type label and contains the title and time (existing anytime/energy cases updated).
- AC4: the journeys themselves.

## Technical notes

- Inspected: `apps/web/src/shared/ui/Dialog.tsx:45` already keeps a `restoreFocusRef` — the failing sites likely unmount or re-render their trigger (the empty-state button disappears once a row exists; the agenda re-renders on close); confirm per site before changing anything shared. `Badge.tsx:14` `success: 'bg-success/10 text-success'` (≈ 4.3:1 for caption text). `CalendarEventChip.tsx:68` builds `aria-label="{type}: {title}, {time}"` while the visible order differs. `e2e/adaptive-scheduling.spec.ts:104–110` holds the two exclusions.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-D1 | Focus return: (a) fix each site so the trigger survives or a stable fallback (the list heading) is focused; (b) change `Dialog` to focus `document.body` fallback | **(a)** — the primitive is correct; the sites lose their trigger | Ratified (user, 2026-11-16, "ratify all decisions for the stories") |

*Implementation note (F-EP14D-01, R-EP14-08d): D-D1's premise was wrong — both triggers survive; the cause was the shared `Dialog` re-capturing `document.activeElement` on its second `open` effect under `React.StrictMode`. Fixed in the primitive (capture only an element outside the dialog); the ruled outcome — focus returns to the opener — holds.*
| D-D2 | Success contrast: (a) a darker `success-strong` text token for the badge (≈ rgb 21 101 52, ≥ 4.5:1 on the 10% tint); (b) a solid success background with white text; (c) raise caption size | **(a)** — smallest visual change, keeps the soft-badge look | Ratified (user, 2026-11-16, "ratify all decisions for the stories") |
| D-D3 | Chip naming: (a) drop `aria-label` and let the name come from the visible content plus sr-only separators; (b) rewrite `aria-label` to the visible order | **(a)** — label-in-name holds by construction; anytime/energy text is already visible | Ratified (user, 2026-11-16, "ratify all decisions for the stories") |

## Definition of Done

1, 5 (states unchanged, verified), 6, 7, 8; 10–11 via the parent review.

## Sizing

- **Outcome:** EP13's accessibility gate passes with no exclusions.
- **Actual at closeout:** 7 source files (`Dialog.tsx` StrictMode-safe restore capture, `success-strong` token in `index.css`/`tailwind.config.js`, `Badge.tsx` + three same-pairing sites, `CalendarEventChip.tsx` name from content), 6 unit-test files, 3 specs; web unit 1273/0; isolated-stack E2E: 3 fully green full runs (54/0), journeys 7/7 in 4 of 5 (one browser-clock flake, F-EP14D-03); the 44 px defect was a mid-animation measurement (F-EP14D-02); findings F-EP14D-01…03.
- **Files:** `features/assignments/ui/AssignmentDialogs.tsx` (or the empty-state host), the calendar agenda/detail host, assignment form controls, `shared/ui/Badge.tsx`, `index.css`/`tailwind.config.js` (token), `features/calendar/ui/CalendarEventChip.tsx`, `e2e/adaptive-scheduling.spec.ts` + focused component tests.
- **Start context:** this story; F-EP13M-01/-02/-04/-05 in `docs/stories/EP13/artifacts/EP13M/implementation.md`.
- **Verification:** the three named E2E tests and all seven journeys green; web unit suite green.
- **Dependencies / exclusions:** E2E flakes → EP14C.
