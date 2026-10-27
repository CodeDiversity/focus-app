# SP-125 implementation record

**Story:** [SP-125-assignment-experience.md](../../SP-125-assignment-experience.md)
**Implemented:** 2026-10-27 (single implementer pass, presentation-only)
**Code commit:** `b3e92dbda27d20886024d1e54a9a966fa04429a2` (apps/web production + test files)
**Docs commit:** (this record + statuses — see [checkpoint](./checkpoint.md) for provenance)
**Parent:** standalone unit under [EP03 breakdown](../../README.md); reviewed state follows the reviewer, not this record.

## Changed paths

Production:

- `apps/web/src/features/assignments/ui/assignmentPresentation.ts` — added `STATUS_SELECT_STYLES` (text + border + color per status, D125-8).
- `apps/web/src/features/assignments/ui/AssignmentRow.tsx` — new local `StatusPillSelect` (native `<select>` wearing the palette, chevron overlay); Delete button gains destructive hover (`hover:bg-red-50 hover:text-red-700`); the Edit control is an icon-only `SquarePen` pencil at the end of the action cluster (after Delete; R-125-001), borderless ghost variant per the user's follow-up, keeping its accessible name and focus hook.
- `apps/web/src/features/assignments/ui/SubtaskChecklist.tsx` — panel becomes the framed surface (`rounded-lg border border-secondary-200/80 bg-secondary-50/75 p-3 sm:p-4`) with a `Subtasks` header and `{done} of {total} complete` counter.
- `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — two-tier filter bar, `showFilters` state, `secondaryActiveCount`, live-region summary hosting the refetch spinner, icon empty/no-match states with the adjusted-search subtext, red-accent initial error card; search field wears a left magnifier icon and shorter placeholder so it reads as search (R-125-002).
- `apps/web/src/features/assignments/ui/AssignmentForm.tsx` — dialog `max-w-md` → `max-w-lg`, Cancel uses the `secondary` variant, action footer gains a top divider.

Tests:

- `apps/web/src/pages/assignments/ui/AssignmentsPage.test.tsx` — three secondary-filter tests now open the panel first (presentation-owned change; the passed filter params are unchanged). New `AssignmentsPage presentation (SP-125)` describe: panel toggle + count, status palette, framed checklist header, dialog width/footer, no-match subtext.
- `apps/web/src/features/assignments/ui/AssignmentForm.test.tsx` — dialog width assertion `max-w-md` → `max-w-lg` only.

Not touched: `useAssignmentActions` (and its test), `assignmentApi`, router, `AssignmentsSection` code beyond inherited row/checklist rendering (its test file passed unchanged), e2e spec (selectors remain valid).

## AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 Two-tier filter presentation | **PASS.** Primary bar = Search, Course, Status, Filters toggle (`aria-expanded`, `aria-controls="advanced-filters-panel"`; name `Filters` / `Hide filters` / `Filters (n)` where n counts secondary controls incl. non-default sort). Secondary panel = Due from / Due to / Priority / Type / Sort by + order toggle, each with a visible label. | Test `toggles the secondary filter panel with expanded state and active-filter count`; test code moved `Priority`/`Type`/dates/sort into the panel flow |
| 2 Scannable status on rows | **PASS.** `StatusPillSelect` renders `STATUS_SELECT_STYLES` per value; pending status is visible during an in-flight PATCH; after refetch the settled item's status drives the class again. | Test `renders the row status selector with the text-plus-color palette (D125-8)` |
| 3 Row hierarchy & responsive stacking | **PASS (with a scope note).** DOM order and the `flex flex-wrap gap-2` action cluster are preserved (course-host contract test still green); the stack layout was already the shared row's `sm:` flex behavior, so this pass added the pill/select styling and destructive-hover polish rather than restructuring markup. Existing touch-target bumpers (`max-sm:min-h-[44px]` via the list's `ul` selectors) still apply. | `AssignmentsSection.test.tsx` cluster assertions unchanged and passing; page tab-order test passing |
| 4 Framed subtasks panel | **PASS.** Region keeps `role="region"`/`aria-labelledby`; container classes + `Subtasks` header + progress counter. | Test `frames the expanded subtask checklist with a progress header (D125-9)` |
| 5 Polished modal dialog | **PASS.** `max-w-lg`, Cancel `secondary`, footer divider; field grids/touch targets unchanged. | Test `widens the create dialog and aligns the action footer (D125-10)`; R-124-003 min-height assertions still passing |
| 6 States & host parity | **PASS.** Loading copy unchanged; live region now also hosts the background spinner; zero-state/CTAs unchanged with icons added; no-match state gains the recorded subtext and keeps a single `Clear filters` in that branch; initial error card is a red-accent alert. Course host renders the same shared row/checklist. | New no-match test; existing empty/error/busy tests green |
| 7 Accessible & responsive | **PASS.** Focus hooks preserved verbatim (`add`, `empty-add`, `status:${id}`, `edit:${id}`, `data-subtask-focus:*`): the SP-124 focus/celebration and tab-order tests all pass unchanged. Date/secondary fields no longer rely on `aria-label` alone (visible labels); all pills pair text with color. | 161 tests across the seven files in `src/pages/assignments` and `src/features/assignments` |

## Verification

- `pnpm --filter web test -- src/pages/assignments src/features/assignments` (cwd `apps/web`) — **7 files, 161 tests passed** (final run after prettier autofix; see checkpoint history for per-step runs including the intermediate 3/4 failures and their fixes).
- `pnpm --filter web typecheck` (cwd repo root) — exit 0.
- `pnpm --filter web exec eslint src/pages/assignments src/features/assignments --ext ts,tsx` — clean after an autofix pass; hooks/staging then ran eslint+prettier again on commit with no further modifications.

## DoD mapping

1 Functional — same behavioral contracts, plus the settled presentation: pass. 2 Validation — no new input: n/a. 3 Scoping — no new read/write: n/a. 4 API errors — unchanged toasts/alerts: pass (existing tests). 5 States — pass (table above). 6 Keyboard — pass (focus hooks + live regions intact). 7 Responsive — class-level evidence (44px bumpers, grid/breakpoint classes); no manual browser pass in this pass. 8 Tests — pass (161). 9 API/migration docs — n/a. 10 Integrated review — **open**; this record is the implementer's evidence, not the browser pass. 11 Reviewer walkthrough — reviewer-owned, once, at review.

## Findings and deviations

- **F-125-01 (closed):** Three existing page tests drove secondary filters while the panel was collapsed by construction of the old one-tier bar. Disposition: updated the tests to open the panel first — tests are presentation-owned under this story, and asserted behavior (query params, order toggle) is unchanged. Verified by the full suite.
- **F-125-02 (closed):** Scoped eslint flagged four prettier formatting deltas (`AssignmentRow`, `assignmentPresentation`, page import line, trailing blank). Disposition: `eslint --fix`, re-ran tests green, then hook-managed commit re-applied the same fixers.
- **F-125-03 (open):** `apps/web/e2e/assignments-list.spec.ts` was not executed in this pass — it needs the self-contained stack (API + throwaway Postgres, as used by the SP-124 review's R-124-006 run). Its selectors were checked against the implementation (`Course` label unchanged; dialog `Priority` unchanged; no page-level secondary-filter usage; the edit flow uses the title button, not the pencil). Owner: review unit (DoD-10) — run it (or the manual browser pass) with the reviewer in the loop before sign-off.
- **R-125-001 (closed):** User direction after the first implementation slice: the row Edit control should be a pencil at the end of the cluster, without the outline. Final state: `SquarePen` icon-only `ghost` button (`px-2 max-sm:min-w-[44px]`) placed **after** Delete as the cluster's last control; `aria-label="Edit {title}"` and `data-assignment-focus="edit:${id}"` unchanged. Tab-order assertions in `AssignmentsPage.test.tsx` and `AssignmentsSection.test.tsx` expect Delete before pencil-Edit now (presentation-owned test change; names/hooks preserved).
- **R-125-002 (closed):** User direction: the search field did not read as a search box. Final state: left `Search` magnifier icon via the shared `Input`'s `leftIcon`, placeholder shortened to "Search title or description"; `aria-label="Search assignments"` and debounced query behavior unchanged (161/161 green).
- **R-125-003 (closed):** User direction on top of R-125-002: the search box belongs on its own row so it can be wider. Final state: search is a full-width row in the primary bar; Course, Status, and the Filters toggle line up beneath it; secondary panel unchanged (43/43 page tests green).

Status: **Implemented — awaiting parent review.**
