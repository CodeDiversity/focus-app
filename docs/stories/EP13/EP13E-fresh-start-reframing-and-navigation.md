# EP13E — Fresh-Start Reframing and Navigation

**Story ID:** EP13E
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Frontend
**Status:** Needs refinement (ui-refiner required, D13-14)
**Dependencies:** EP13C implemented (reshaped recovery contract, self-healing reads).
**Jira key:** Pending creation

## Summary

Information architecture is the other half of auto-forgiveness: once EP13C
makes plans self-heal, no screen may ever lead with the backlog. This story
reframes the returning-student experience as a fresh start — the plan page
leads with *today*, the recovery surface becomes an optional, informational
"plan health" view (rolled-forward totals, feasibility warnings), and
navigation finally exposes what exists: Focus (and its history) joins the nav,
the dead-end standalone `/catch-up` entry is folded into plan health, and
catch-up regeneration becomes a secondary action there. Rejection-sensitive
users abandon tools that greet them with failure; this story makes that
structurally impossible (extends D08-8 from copy to architecture, D13-9).

## Scope

**In scope:**
- Plan page: today-first presentation (today's sessions above the week grid;
  exact layout per ui-refiner) using EP13C's reconciled reads.
- Plan-health view replacing the standalone recovery summary: rolled-forward
  work, feasibility warnings, optional "Regenerate my week" (existing
  catch-up preview flow reused); never a gate, never a count-led headline.
- Navigation (`navGroups.ts`): add Focus (page + history); fold `/catch-up`
  into plan health with a redirect; keep EP11's grouped-nav rules (D11-5).
- Returning-after-absence framing: first load after ≥2 absent days leads with
  "here's today" plus a quiet "we moved X forward" note (copy per ui-refiner).
- Component tests (TR-E13-05); recorded manual a11y pass (TR-E13-14).

**Out of scope:**
- The what-now card and today section internals (EP13D). Momentum (EP13K).
- Backend changes (EP13C owns the contract).

## Source requirement references

- Epic AC-E13-04 (framing half), AC-E13-12 (copy/IA rule).
- Shared DoD 1, 4, 5, 6, 7, 8. TR-E13-05, TR-E13-14. EP11 D11-5, EP08 D08-8.

## Acceptance criteria

1. No route, redirect or default view leads with missed/rolled-forward counts;
   the plan page's first meaningful content is today's plan.
2. The plan-health view presents rolled-forward work and feasibility warnings
   informationally, with regeneration as an optional action; declining or
   ignoring it never degrades the current plan.
3. Navigation exposes Focus and plan health per EP11's grouped-nav
   conventions; `/catch-up` redirects without breaking bookmarks; no dead
   routes remain.
4. The absence note is a single neutral sentence (no counts of missed
   sessions, no percentages, no shaming terms — asserted by test).
5. All states handled (loading/empty/error); keyboard and narrow-screen
   behavior per EP11 patterns.

## Tests (TR-E13-05)

- Today-first ordering of the plan page; week grid still reachable.
- Plan-health view rendering per state matrix; regenerate flow wiring
  (mocked); decline/ignore leaves plan untouched.
- Nav: new entries, grouping, active states, redirect from `/catch-up`.
- Copy assertions: no shaming terms, no counts-led headlines, no percentages.
- Keyboard + narrow-screen checks.

## Technical notes

- **Inspected (2026-11-14):** `widgets/header/ui/navGroups.ts` has no Focus or
  catch-up entry (summary-level; re-verify at implementation); `/catch-up`
  routes exist in `App.tsx` but nothing links to them; `RecoverySummary.tsx`
  and `CatchUpPreview.tsx` are the reuse targets.
- **Proposed:** rename/move recovery feature surface into a plan-health view
  (FSD: `features/plan-health/`), reusing `CatchUpPreview` unchanged; nav
  additions in `navGroups.ts`; redirect route.
- **UI/UX gaps for the ui-refiner (D13-14):** plan-health layout and naming
  ("Plan health"? "This week"?); absence-note copy; where regeneration sits;
  today-first plan-page hierarchy vs. the EP06 preview/editor flow; nav
  grouping and labels (Planning group vs. a Focus group).

## Definition of Done

1. Functional criteria pass (AC-E13-04 framing).
2. N/A (no new inputs). 3. N/A (server-side scoping).
4. API errors surfaced actionably.
5. Loading/empty/error states. 6. Keyboard. 7. Responsive.
8. Automated tests (TR-E13-05).
9. N/A (no API/migration).
10–11. Combined EP13 parent review / reviewer walkthrough.

## Sizing

- **Outcome:** returning students are greeted with today's plan, never a backlog; focus and plan health are reachable from the nav.
- **Estimate:** 2 requests/tokens.
- **Model recommendation:** 3 — mostly IA/composition and copy discipline over existing components.
- **Production files:** `apps/web/src/widgets/header/ui/navGroups.ts`, `apps/web/src/app/App.tsx` (redirect), `features/plan-health/*` (moved/new), plan page ordering.
- **Test files:** colocated component tests.
- **Minimal start context:** this story + ui-refiner record, EP13C contract, `navGroups.ts`, recovery/catch-up features, EP11 nav decisions.
- **Verification:** `pnpm --filter @studypilot/web test`, lint, typecheck.
- **Dependencies:** EP13C, ui-refiner pass. EP13D recommended first (shared today data), not required.
- **Exclusions:** what-now card (EP13D), momentum (EP13K).

## Tracker reference

Jira key: Pending creation (no sync authorized).
