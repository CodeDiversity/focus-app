# EP17E — Editable week grid — implementation record

**Implementer:** implementer session, 2026-11-19. **Branch:**
`hfi/9ae11317-13de-4365-8abb-4bf7e0e3c7f3/elm` (worktree), base `0ec7b64`.

## Completed behavior

The proposed week on `/plan/proposal` renders **once**. A new
`EditableWeek` region (`features/plan-proposal/ui/EditableWeek.tsx`) groups
`useProposal`'s flat `edited` list by date for display only, keeps the flat
index as each card's identity (`data-session-index`, matching
`conflicts[].sessionIndex`), and holds at most one open editing panel.
`EditableSessionCard.tsx` carries the disclosure button (named by the
session's title and time label, `aria-expanded` / `aria-controls`) and
`SessionEditorPanel`, the controls moved verbatim from `PlanSessionEditor`:
day select, start/end time inputs with the `clampTime` / past-midnight
guards, Move earlier/later (pins `FLEX_DAY`, D-H5), Shorten/Lengthen (never
pins), Delete with the toast-Undo (D-E3, D-E7 — delete lives only inside the
panel), and the Pin/Make-flexible pair with their reviewed WCAG 2.5.3
accessible names (F-EP16C-01) and the D-H6 derived hint.

`PlanSessionEditor.tsx` and its test are **deleted** (D-E8);
`PlanProposal.tsx` renders `EditableWeek` where `PlanWeek` +
`PlanSessionEditor` stood; `WhatThisKeepsCard.tsx:21`'s stale comment now
names the editable week. `PlanWeek` itself is untouched — `/plan` still
renders it via the `WeekGrid` re-export.

Day headings, day-section accessible names and the in-panel day select all
read through the new `features/study-plan/lib/dayLabel.ts` ("Thu, Nov 19" —
`en-US`, UTC on the civil date, D-E5/D05-6).

Layout (D-E6): `grid grid-cols-1 gap-2 md:grid-cols-7`. The open panel is a
grid sibling rendered directly after its day section with
`md:order-last md:col-span-7` — below `md` it sits under its own day in the
single-column stack; at `md`+ the CSS `order` moves it to a full-width row
below the seven columns. No JS breakpoint.

One polite live region (`role="status"`, `aria-atomic`) owned by
`EditableWeek`; `PlanWeek`'s unused `plan-week-live` region was not
reproduced. Focus management runs through a post-commit focus request:
Escape → the panel's disclosure button; day change → the (relocated) card's
button, announced with the human day name; delete → the card that took the
removed card's place in its day, else the last remaining same-day card, else
the day heading (`tabIndex={-1}`); Undo → the restored card's button. Focus
never falls to `document.body`.

## AC-by-AC

| AC | Outcome |
|---|---|
| EP17E-AC1 | **Met.** One rendering (`editable-week`); `plan-week` and `plan-session-editor` both absent from the proposal (asserted); `PlanSessionEditor.tsx` no longer exists (`git rm`, grep clean). Day/start/length/pin/delete+undo all in place per session. |
| EP17E-AC2 | **Met.** Disclosure button first element, `aria-expanded`/`aria-controls` (controls set while open — an id reference to an unrendered panel is an axe violation), one panel at a time, Escape closes and refocuses the button. |
| EP17E-AC3 | **Met.** Keyboard path per edit (tests drive Enter and pointer), one live region, focus kept/returned after day change and undo; move/typed-start pin `FLEX_DAY` and announce; resize never pins. |
| EP17E-AC4 | **Met.** Toast-Undo preserved verbatim; delete focuses the next same-day card, else the day `h3` (`tabIndex -1`); undo restores at the original flat position and refocuses. |
| EP17E-AC5 | **Met.** `dayLabel` everywhere a day is named; negative test walks `renderedStrings` (text + `aria-label`/`title`/`alt`) for `/\d{4}-\d{2}-\d{2}/`. See F-EP17E-02 for the two out-of-scope EP16 cards that still print ISO dates elsewhere on the page. |
| EP17E-AC6 | **Met.** `data-conflicted`, `border-danger`, the reason text on the card (text + border, never colour alone), and the first conflicted session's panel opens on arrival. |
| EP17E-AC7 | **Met.** Skeleton, "Nothing new to schedule", error card with Try again all byte-unchanged in `PlanProposal.tsx`; empty day reads "No sessions". |
| EP17E-AC8 | **Met.** Class contract asserted (`grid-cols-1`/`md:grid-cols-7`, panel `md:col-span-7 md:order-last`, panel a grid sibling); no `min-w-[140px]`/`overflow-x-auto` horizontal trap below `md`; 44 px targets via `max-sm:min-h-[44px]`. |

## Verification (cwd `apps/web`, state: EP17E complete, pre-EP17F)

| Command | Result |
|---|---|
| `pnpm typecheck` | PASS (0 errors) |
| `npx vitest run src/features/plan-proposal src/features/study-plan` | PASS — 14 files, 105 tests |
| `pnpm test` (full web unit suite) | PASS — 136 files, 1455 tests |
| `npx eslint src/features/plan-proposal/ui src/features/study-plan/lib src/features/plan-proposal/model` | PASS (0 problems) |
| `npx eslint e2e/adaptive-scheduling.spec.ts e2e/today.spec.ts e2e/plan-flow.spec.ts e2e/study-plan.spec.ts` | 2 errors, both pre-existing F-EP17A-01 rows (`plan-flow.spec.ts` unused var, `today.spec.ts:76` prettier); no new error. The `today.spec.ts:145` pre-existing prettier error was incidentally resolved by the selector rewrite. |

Test counts (this record is the only home): new `EditableWeek.test.tsx` 14,
`EditableSessionCard.test.tsx` 9, `dayLabel.test.ts` 5; updated
`PlanProposal.test.tsx` 20; targeted run 105 / 0 failed; full web suite
1455 / 0 failed. `apps/api` untouched.

## Changed paths / commit scope

- `apps/web/src/features/plan-proposal/ui/EditableWeek.tsx` + `.test.tsx` (new)
- `apps/web/src/features/plan-proposal/ui/EditableSessionCard.tsx` + `.test.tsx` (new)
- `apps/web/src/features/study-plan/lib/dayLabel.ts` + `.test.ts` (new)
- `apps/web/src/features/plan-proposal/ui/PlanProposal.tsx`, `PlanProposal.test.tsx`
- `apps/web/src/features/plan-proposal/ui/WhatThisKeepsCard.tsx` (comment only)
- `apps/web/src/features/study-plan/ui/PlanSessionEditor.tsx`, `.test.tsx` (deleted)
- `apps/web/e2e/{adaptive-scheduling,today,plan-flow,study-plan}.spec.ts` (see deviation 2)
- `docs/stories/EP17/EP17E-editable-week-grid.md` (Status, sizing actual), `docs/stories/EP17/README.md` (queue row), this record

## Deviations

1. **`EditableWeek`'s `timeZone` prop** is used only in the group's
   accessible name (`Proposed week (America/New_York)`), following
   `PlanWeek`'s existing precedent; nothing visual renders it (the week line
   already explains the zone, D-C5).
2. **Playwright specs updated beyond the story's named test files.** Four e2e
   specs drove the removed `plan-session-editor` rows or the duplicated
   `plan-week` on the proposal; left alone they would assert UI that no
   longer exists. Changed **only** the proposal-surface selectors/flows:
   `plan-week`/`plan-session-editor` → `editable-week` on `/plan/proposal`
   (the `/plan` `plan-week` assertions are untouched), and each edit now
   opens the session's card before using the in-place panel
   (`study-plan.spec.ts`'s search loop reads times from the one open panel;
   `plan-flow.spec.ts`'s journey 1 and 409 test open first/last cards). These
   suites need a running DB/server and were **not run locally** — recorded
   honestly, not claimed green; EP17H owns the Playwright run (TR-E17-06).
3. **The D-E5 example weekday.** 2026-11-19 is a Thursday; `dayLabel` returns
   `"Thu, Nov 19"`. The story's `"Wed, Nov 19"` illustrates the format, which
   is implemented exactly.
4. **PlanProposal test fixture dates corrected** (`2026-10-32…36` were not
   real days; the old ISO-passthrough label masked it, `dayLabel` rightly
   throws). Replaced with `2026-10-31…2026-11-05`.

## Findings

- **F-EP17E-01** — source: implementing AC2/axe discipline; path:
  `EditableSessionCard.tsx`; issue: a permanent `aria-controls` to a
  mount-on-open panel violates axe `aria-valid-attr-value`; disposition:
  `aria-controls` set only while expanded (the attribute's referent always
  exists); owner: closed here; closure evidence: EditableWeek AC2 test
  asserts the open-state attribute.
- **F-EP17E-02** — source: V-17-4 sweep; paths:
  `apps/web/src/features/plan-proposal/ui/WhatThisKeepsCard.tsx:80`,
  `MovedSessionRow.tsx:23`; issue: both EP13/EP16 cards still render raw ISO
  dates (`<time>{s.date}</time>`) on the proposal page; EP17E-AC5's frozen
  text enumerates the week surfaces (headings, section names, day select),
  and both EP17E's and EP17F's Scope sections place these components out of
  scope ("change placement only, not source"); disposition: reported for the
  combined EP17 review / a follow-up story, not fixed here; owner: planner;
  closure evidence: pending.

Checkpoint: none (single-session child).
