# EP13H — Flexible Sessions UI

**Story ID:** EP13H
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Frontend (+ one additive backend calendar field — see Technical notes / flagged for the implementer)
**Status:** Ready (ui-refiner pass complete 2026-11-15)
**Refined:** 2026-11-15 (ui-refiner)
**Dependencies:** EP13G implemented (D13-4 ruled option (b)); EP13D/EP13E surfaces shipped.
**Jira key:** Pending creation

## Summary

Present day-anchored sessions as what they are — intentions for the day, not
appointments. One word carries the whole model: **"Anytime."** A flex session
reads "Anytime today · 60 min · evening suggested" with the same Start button
it already has; it never shows a clock slot that can be missed. Fixed
sessions keep their clock presentation. The plan editor can pin a flex
session ("Pin to this time") or free a fixed one ("Make flexible"), and
choosing a start time for a flex session pins it — picking a time *is* the
commitment. The calendar renders flex sessions as day-level items at the top
of their day instead of fake clock blocks, which also dissolves F-EP13G-02
(two flex sessions sharing a suggested slot no longer draw as a collision).

## Scope

**In scope:**
- Client types mirror EP13G's shipped payload fields (`anchor`,
  `windowHint`) on `PlanPreviewSession`, `SavedPlanSession`, `TodaySession`,
  `ProposedSession`, `ProposedSessionInput`; `flattenPreview`/
  `projectSessions` round-trip them.
- `PlanWeek` + `PlanSessionEditor`: flex vs fixed presentation, the
  pin/unpin toggle, the choose-a-time-pins rule, hint rendering.
- `TodayPlanCard` hero + `TodayPlanRow`: "Anytime today" meta line for flex;
  start flow unchanged (the backend fixes the real time, EP13G AC-3).
- Calendar: `CalendarEvent` gains `anchor` (additive backend emission +
  flex-first ordering within a day); the chip shows **Anytime** in place of
  a start time for flex planned sessions.
- Component tests (TR-E13-08); recorded manual a11y pass (TR-E13-14).

**Out of scope:**
- Model/engine/API semantics (EP13G). Momentum, micro-start (EP13K, EP13J).
- Any new preference or per-session setting.

## Source requirement references

- Epic AC-E13-09 (UI half), AC-E13-12 (copy rule). Shared DoD 1, 2, 4, 5, 6,
  7, 8. TR-E13-08, TR-E13-14. EP13G F-EP13G-02/F-EP13G-04.

## Acceptance criteria

1. Flex and fixed sessions are visually and semantically distinct on every
   surface that renders sessions (plan grid, editor, today card, calendar):
   flex leads with **Anytime**, fixed leads with its clock time; the editor
   explains in one line why fixed sessions keep their slot.
2. A flex session can be started directly from any of its renderings; its
   copy never shows a missable clock time (the suggested slot is never
   printed as the primary time of a flex session anywhere).
3. Pinning/unpinning in the editor round-trips through the EP13G save
   contract (`anchor`, flex-only `windowHint`); choosing a start time for a
   flex session pins it, with the change announced; changing only duration
   does not pin. Validation errors surface actionably.
4. No "overdue at 9:00"-style framing exists for flex sessions anywhere —
   copy assertions pin the absence of clock-missed framing and of the D13-9
   blame terms.
5. All states, keyboard operability and narrow-screen behavior per EP11
   patterns; the flex/fixed distinction is text + layout, never colour alone.

## Tests (TR-E13-08)

Vitest + React Testing Library, colocated (repo convention):

- `TodayPlanRow.test.tsx` / `TodayPlanCard.test.tsx` (extend) — flex rows and
  a flex hero render "Anytime today · {n} min" (+ "{part of day} suggested"
  when hinted) and never the suggested clock range; fixed rows unchanged;
  start flow identical for both.
- `PlanWeek.test.tsx` (extend/new cases) — a flex card reads "Anytime ·
  {n} min", a fixed card keeps "{start} – {end}"; accessible names match.
- `PlanSessionEditor.test.tsx` (extend) — the toggle pins/unpins with the
  right labels; unpinning derives the hint from the suggested start;
  changing a flex row's start time (input or Move earlier/later) auto-pins
  and announces; Shorten/Lengthen does not pin; `projectSessions` output
  carries `anchor` always and `windowHint` only on flex.
- `CalendarEventChip.test.tsx` (extend) — a flex `PLANNED_SESSION` shows
  "Anytime" where the time goes, in both layouts; accessible name says
  "anytime"; a fixed one is unchanged.
- `calendar.service.spec.ts` (api, extend) — events carry `anchor`
  (planned sessions only, `null` elsewhere); within a date, flex planned
  sessions sort before clock events; everything else keeps the old order.
- Copy assertions — no "missed"/"late"/"overdue" adjacent to flex rendering;
  no `%`; the word "Anytime" present for flex and absent for fixed.
- Keyboard + narrow-screen checks inside the component tests.

## Technical notes

### Inspected code (2026-11-15, ui-refiner)

- `features/today-plan/ui/{TodayPlanCard,TodayPlanRow}.tsx` — meta line is
  `eventTimeRange(start, end) · {n} min`; status badges text-only (D-D7);
  start flow via `useStartPlannedSession`.
- `features/study-plan/ui/PlanWeek.tsx` — per-day cards print
  `{start} – {end} ({n} min)`; accessible name repeats the times.
- `features/study-plan/ui/PlanSessionEditor.tsx` — per-row Day/Start/End
  controls, Move/Shorten/Lengthen/Delete buttons, one `role="status"` live
  region, conflict marking by row index.
- `features/study-plan/lib/preview.ts` — `flattenPreview` builds
  `ProposedSession`s; `projectSessions` builds the exact save body.
- `entities/study-plan/model/types.ts` — none of the session types carry
  `anchor`/`windowHint` yet (EP13G is backend-only).
- `apps/api/src/modules/calendar/calendar.service.ts` — `CalendarEvent` has
  no `anchor`; events sort by date, then startTime (the reason flex needs a
  payload field *and* an ordering rule to become a day-level item).
- EP13G record — the save DTO accepts `anchor`/`windowHint` (hint flex-only,
  400 otherwise); omitted anchor means FIXED; starting a flex session fixes
  it server-side; `locked ⇒ FIXED`.

### Flagged for the implementer (technical, not UI/UX)

1. **The calendar needs an additive backend field**: `anchor` on
   `CalendarEvent` (`PlannedSessionAnchor` for planned sessions, `null` for
   every other type) plus the flex-first ordering within a date. Same
   cross-layer precedent as EP13D's `PLANNED_SESSION` emission.
2. Client types: add the two fields across the five session types and the
   two preview helpers; `ProposedSessionInput.windowHint` must be omitted
   (not `null`) for fixed sessions so the DTO's flex-only rule is never
   tripped.

### Decisions (ui-refiner, 2026-11-15)

| ID | Question | Decision + rationale |
|---|---|---|
| D-H1 | The flex visual language | **One word: "Anytime."** Today surfaces say **"Anytime today"**, plan/calendar say **"Anytime"**, always in the slot where the clock time would have been. No new icon, no new colour: the time position is where every eye already looks, so replacing the time *is* the distinction, and text can never be a colour-only cue. |
| D-H2 | Window-hint presentation | A gentle suffix in the same meta line: **"morning/afternoon/evening suggested"**. Suggestion-flavoured copy on purpose — a hint chip styled like a slot would re-create the appointment it replaces. Absent hint → no suffix. |
| D-H3 | How does a fixed session justify its clock? | It keeps its time display (the time *is* the semantics), and the **editor** carries one shared explanatory line: *"Fixed-time sessions keep their slot — usually because a deadline is close, or you picked the time yourself."* No per-session provenance exists in the contract (engine-pinned vs student-pinned is not stored), so per-row "reasons" would be invented. **Deviation from AC-1's original letter, recorded.** |
| D-H4 | Where do pin/unpin live? | A per-row toggle button in `PlanSessionEditor`: flex rows → **"Pin to this time"**; fixed rows → **"Make flexible"**. Buttons with distinct labels rather than a switch — the action, not the state, is what the student is choosing. Each use announces via the editor's existing live region. |
| D-H5 | What auto-pins a flex session? | **Choosing when it starts** — the Start-time input and Move earlier/later. Changing the **day** keeps it flex (the student picked a day, which is exactly what day-anchored means) and re-derives nothing. **Shorten/Lengthen keep it flex** (duration is not a clock commitment). Announced: "{title} pinned to {time} — you chose a time." |
| D-H6 | What happens to the hint on pin/unpin? | Pinning clears it (the DTO forbids a hint on fixed, and the clock now says when). Unpinning derives it from the row's current suggested start with the engine's own mapping (<12:00 morning, <17:00 afternoon, else evening) — one mechanical rule on both sides of the seam, nothing for the student to maintain. |
| D-H7 | Calendar treatment | Flex planned sessions become **day-level items**: the payload gains `anchor`, the server sorts flex planned sessions **first within their date** (like all-day events in every calendar the student has used), and the chip prints **"Anytime"** where the start time goes. This also retires F-EP13G-02: two flex sessions sharing a suggested slot can no longer draw as a clock collision, because no flex chip draws at a clock position. |
| D-H8 | Today card hero and rows | The meta line swaps per anchor: fixed → `{start} – {end} · {n} min` (unchanged); flex → `Anytime today · {n} min` (+ hint suffix). The hero's Start button, the row Start buttons, 409/404 handling and D-D13's single-alert rule are all untouched — EP13G's backend fixes the real time on start, so the UI changes nothing about the flow. |
| D-H9 | Mixed days in the editor | No grouping or reordering: rows keep their list order, each row shows its own Anytime/clock meta. A reorder would fight the conflict-marking-by-index contract (EP08E) for pure cosmetics. |
| D-H10 | Save round-trip | `ProposedSession` carries `anchor`/`windowHint`; `projectSessions` emits `anchor` always and `windowHint` **only when flex** (omitted otherwise — the DTO 400s a hint on fixed). The editor cannot construct the invalid combination by design (DoD 2 by construction, plus a test pinning the projection). |
| D-H11 | Copy rules | Assertions pin: "Anytime" present for flex and absent for fixed; no "missed"/"late"/"overdue at" adjacent to a flex rendering; no compliance `%` (D13-9). The suggested slot of a flex session is never printed as its primary time on any surface. |
| D-H12 | States and a11y | No new async states (all data rides existing queries). The toggle and Start buttons are real buttons with the shared focus ring and `max-sm:min-h-[44px]`; accessible names carry "anytime" for flex chips/rows so screen-reader users hear the model, not a fake slot. |

### Component plan (Feature-Sliced Design)

| Component / module | Placement | Change |
|---|---|---|
| `sessionTimeLabel` helper | `entities/study-plan/model/` (new, tiny) | One shared "Anytime …" / time-range formatter + the hint suffix + the client-side hint derivation — three surfaces, one vocabulary (D-H1/D-H2/D-H6). |
| `TodayPlanCard`, `TodayPlanRow` | `features/today-plan/ui/` (extend) | Meta-line swap per anchor (D-H8). |
| `PlanWeek` | `features/study-plan/ui/` (extend) | Session type gains the two fields; card meta per anchor. |
| `PlanSessionEditor` | `features/study-plan/ui/` (extend) | Toggle, auto-pin rule, announcements (D-H4/D-H5). |
| `flattenPreview` / `projectSessions` | `features/study-plan/lib/preview.ts` (extend) | Round-trip the two fields (D-H10). |
| `CalendarEventChip` | `features/calendar/ui/` (extend) | "Anytime" in the time slot for flex planned events (D-H7). |
| `calendar.service.ts` (+ spec) | `apps/api/src/modules/calendar/` (extend) | `anchor` on the payload; flex-first in-day ordering (D-H7). |
| Client types | `entities/{study-plan,calendar}/model/types.ts` (extend) | Mirror EP13G's fields. |

## Definition of Done

1. Functional criteria pass (AC-E13-09 UI).
2. Client validation mirrors EP13G DTO rules (by construction, D-H10).
3. N/A (server-side scoping). 4. Errors actionable (existing paths).
5. States (no new async states). 6. Keyboard. 7. Responsive.
8. Automated tests (TR-E13-08). 9. The additive calendar field is documented
   in the implementation record.
10–11. Combined EP13 parent review / reviewer walkthrough.

## Sizing

- **Outcome:** day-anchored sessions read and behave as startable intentions across plan, today and calendar; picking a time is the only way to make a clock promise.
- **Estimate:** 2–3 requests/tokens.
- **Model recommendation:** 3 — presentation/composition over shipped components; the risk is breadth, not logic.
- **Production files:** `entities/study-plan/model/*`, `entities/calendar/model/types.ts`, `features/study-plan/{ui,lib}/*`, `features/today-plan/ui/*`, `features/calendar/ui/CalendarEventChip.tsx`, `apps/api/src/modules/calendar/calendar.service.ts` (+ spec).
- **Test files:** colocated component tests; `calendar.service` spec (api).
- **Minimal start context:** this story, the EP13G record, the inspected components above.
- **Verification:** `pnpm --filter @studypilot/web test`, `pnpm --filter @studypilot/api test`, lint, typecheck.
- **Dependencies:** EP13G. Blocks nothing (EP13M journeys reference it if landed).
- **Exclusions:** engine/API semantics (EP13G); micro-start (EP13J).

## Tracker reference

Jira key: Pending creation (no sync authorized).
