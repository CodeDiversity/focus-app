# EP13E implementation record

**Story:** [EP13E — Fresh-Start Reframing and Navigation](../../EP13E-fresh-start-reframing-and-navigation.md)
**Status:** Implemented — awaiting parent review (EP13 combined review unit)
**Date:** 2026-11-15
**Commit scope:** `apps/web/src/` only — `features/plan-health/` (new, replacing `features/recovery/`), `pages/plan-health/` (replacing `pages/catch-up/`), `app/App.tsx` + store, `pages/plan/ui/PlanPage.tsx`, `widgets/header/`, `features/catch-up/ui/CatchUpPreview.tsx` (return targets), `entities/study-plan/model/types.ts` (type-only mirror of EP13C's shipped keys), plus EP13E docs/queue updates. **No backend change, no migration.**

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| 1 — no surface leads with missed/rolled counts; the plan page's first meaningful content is today's plan | **Done.** `TodayPlanCard` (EP13D, reused unchanged) mounts directly under the `h1` on `/plan`, with its own `useTodayPlanQuery`. The two full-page early returns (saved-plan skeleton, saved-plan error) became a **scoped** week-region skeleton/error card, so a slow or failing week read no longer hides the next action. | `PlanPage.test.tsx`: DOM-order test (`compareDocumentPosition`), "renders today's plan while the saved-plan read is still loading", "…even when the saved-plan read fails, with a scoped retry" |
| 2 — plan health is informational; regeneration optional; ignoring it degrades nothing | **Done.** `PlanHealthView` reads `GET /study-plans/recovery-summary` and renders a lead line, the **Moved forward** section and **Unfinished work** with the server's flags. **Regenerate my week** is `variant="outline"` in the header, never disabled (EP08 disabled it on an empty summary), and routes to the unchanged EP08E preview, which still confirms or declines without side effects. | `PlanHealthView.test.tsx` (6 cases incl. "never disabled", informational rendering); `CatchUpPreview.test.tsx` unchanged decline/confirm guarantees |
| 3 — nav exposes Focus and plan health; `/catch-up` redirects; no dead routes | **Done.** Planning gained `Plan health` → `/plan/health`; a new **Focus** group holds `Focus session` → `/focus` and `Study history` → `/focus/history` (neither had a nav entry before). `/catch-up` → `/plan/health` and `/catch-up/preview` → `/plan/health/catch-up`, both `replace`. | `Header.test.tsx` (new Focus-group case + updated drawer inventory 13 → 16 focusables); `appRoutes.test.tsx` (both redirects + the Back-does-not-bounce case) |
| 4 — the absence note is one neutral sentence, no counts/percentages/shaming | **Done.** Shown only when `rolledForwardCount > 0`: "Some earlier sessions moved into your current plan — today's list is up to date." + a `See plan health` link. The sentence is asserted to contain **no digit at all**, which is stricter than the AC. | `PlanPage.test.tsx`: "shows one neutral, number-free return note…" (`not.toMatch(/\d/)`, `not.toMatch(/missed\|behind\|failed\|%/i)`) and the no-note case |
| 5 — all states; keyboard; narrow screen | **Done.** Loading = `aria-busy` skeletons with `motion-reduce:animate-none`; error = one `role="alert"` + "Try again" (refetch); empty = `EmptyState` "Your plan is up to date" + "See this week's plan". Controls are real buttons/links with the shared focus ring, `max-sm:min-h-[44px]` targets, header stacks below `sm`. | `PlanHealthView.test.tsx` (loading/error/empty/keyboard-tab-order cases); `MovedForwardList.test.tsx` (locked = icon + text) |

## Verification (from `apps/web`, 2026-11-15)

- `pnpm vitest run`: **1156 passed, 8 failed**, 0 skipped (102 files). The 8 failures are the **pre-existing** `CalendarPage.test.tsx` failures already reported as F-EP13D-01 (`Unable to find … text: Class/Calculus`); they are unrelated to this story, which does not touch the calendar. EP13D's baseline was 1144 passed with the same 8 failing.
- `pnpm typecheck`, `pnpm lint`, `pnpm format`: clean.
- New/changed tests: `PlanHealthView.test.tsx` (7, new), `MovedForwardList.test.tsx` (3, new), `appRoutes.test.tsx` (3, new), `PlanHealthPage.test.tsx` (3, migrated from `CatchUpPage.test.tsx`), `UnfinishedWorkList.test.tsx` (migrated verbatim), `PlanPage.test.tsx` (+5 EP13E cases), `Header.test.tsx` (+1 case, 2 updated inventories), `CatchUpPreview.test.tsx` (2 return-target expectations), `store.test.tsx` + `test/providers.tsx` (reducer inventory), `RemainingWorkSection.test.tsx` (module mock).

## Deviations from the plan (each with why)

1. **AC-2's "feasibility warnings" are the server-provided per-assignment flags on this page** (`No estimate`, `No due date`), not plan-proposal warnings. Settled as D-E8 during the ui-refiner pass: `NO_AVAILABLE_TIME` / `INSUFFICIENT_TIME_BEFORE_DEADLINE` / `OVERDUE` only exist on a generated proposal, so rendering them here would mean calling `POST /study-plans/catch-up/preview` on every visit to a read-only view. They remain visible inside the regeneration preview (`WorkloadWarnings`). **Flagged for the planner/reviewer.**
2. **The return note has no elapsed-absence trigger.** The story's "first load after ≥2 absent days" would need either a new API field or a localStorage day-counter; the shipped trigger is server truth — work actually moved forward (EP13C's bounded 7-day `rolledForward*`). D-E11/D-E12 record the reasoning: a guessed "you've been away N days" drifts across devices and invites exactly the sentence the epic forbids.
3. **`features/recovery/` was removed, not kept alongside.** After the redirect, `RecoverySummary` would have been unreachable dead code carrying "missed"/"behind" copy one import away. `UnfinishedWorkList` moved verbatim with its test; `MissedSessionRow`/`MissedSessionsList` were reframed into `MovedSessionRow`/`MovedForwardList` (same row shape, new heading/description); `RecoverySummary.test.tsx` is superseded by `PlanHealthView.test.tsx`.
4. **A seventh RTK Query slice (`planHealthApi`) joined the store.** `store.test.tsx` pins the reducer inventory, so its key list and the "state-size" assertions moved 6 → 7. Expected, not a regression — and the shared cache means `/plan` → `/plan/health` costs no second request.
5. **The desktop nav gap tightened to `gap-4 lg:gap-6`.** Five sections (Home, Dashboard, Academics, Planning, Focus) plus the logo and avatar are close to the `md` row budget; the `lg` spacing is unchanged from EP11.
6. **`CatchUpPreview`'s four return targets and its "Back to catch-up" label changed** (D-E14). The flow, its title and its guarantees are untouched; only the place it returns to moved.

## Findings

| ID | Finding | Disposition |
|---|---|---|
| F-EP13E-01 | The manual accessibility pass (TR-E13-14) was **not** executed in a browser — no browser/screen reader in this environment. Keyboard order, `aria-busy`/`role="alert"` structure, non-colour-only status and 320px classes are covered by component tests and code review only. | Open evidence item for the EP13 parent review unit; same disposition as F-EP13D-02. |
| F-EP13E-02 | The 8 `CalendarPage.test.tsx` failures reported in F-EP13D-01 are still failing on this branch, for the same reason, and remain outside EP13E's scope. | Open, inherited; reported not absorbed. |
| F-EP13E-03 | `GET /study-plans/recovery-summary` still returns the legacy `missedSessions`/`missedCount` keys, now unused by any client surface (EP13C kept them so the shipped EP08D page would not crash between C and E). They can be dropped by a later backend story. | Routed as an observation for the planner (backend cleanup, not EP13E's scope). Non-blocking. |

## Changed paths

- `apps/web/src/features/plan-health/api/planHealthApi.ts` — **new** (shared cached recovery-summary read).
- `apps/web/src/features/plan-health/ui/{PlanHealthView,MovedForwardList,MovedSessionRow,UnfinishedWorkList}.tsx` (+ tests) — new / moved from `features/recovery/`.
- `apps/web/src/features/recovery/` — **removed** (superseded).
- `apps/web/src/pages/plan-health/ui/PlanHealthPage.tsx` (+ test) — replaces `pages/catch-up/`.
- `apps/web/src/app/App.tsx` — `/plan/health` layout + nested `catch-up`, two legacy redirects.
- `apps/web/src/app/store/store.ts`, `src/test/providers.tsx`, `src/app/store/store.test.tsx` — `planHealthApi` registration.
- `apps/web/src/pages/plan/ui/PlanPage.tsx` (+ test) — today-first order, scoped week loading/error, the return note.
- `apps/web/src/widgets/header/ui/{navGroups.ts,Header.tsx}` (+ test) — Plan health item, Focus group, `DesktopMenu` union, nav gap.
- `apps/web/src/features/catch-up/ui/CatchUpPreview.tsx` (+ test) — return targets and label.
- `apps/web/src/entities/study-plan/model/types.ts` — `rolledForward*` keys on `RecoverySummary`.
- Docs: this record, `checkpoint.md`, the EP13 README queue row, the EP13E story status.
