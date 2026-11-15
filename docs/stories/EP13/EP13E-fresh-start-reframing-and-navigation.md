# EP13E — Fresh-Start Reframing and Navigation

**Story ID:** EP13E
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Frontend
**Status:** Ready (ui-refiner pass complete 2026-11-15)
**Refined:** 2026-11-15 (ui-refiner)
**Dependencies:** EP13C implemented (reshaped recovery contract, self-healing reads). EP13D implemented (`TodayPlanCard`, `todayPlanApi` — reused here).
**Jira key:** Pending creation

## Summary

Information architecture is the other half of auto-forgiveness: once EP13C
makes plans self-heal, no screen may ever lead with the backlog. This story
reframes the returning-student experience as a fresh start — the plan page
leads with *today*, the recovery surface becomes an optional, informational
**Plan health** view (work that moved forward, unfinished work, an optional
regeneration), and navigation finally exposes what exists: Focus (and its
history) joins the nav, the dead-end standalone `/catch-up` entry is folded
into plan health with redirects, and catch-up regeneration becomes a
secondary action there. Rejection-sensitive users abandon tools that greet
them with failure; this story makes that structurally impossible (extends
D08-8 from copy to architecture, D13-9).

## Scope

**In scope:**
- Plan page: today-first presentation — `TodayPlanCard` (EP13D) mounted
  directly under the page header, above the week grid; the week/preview
  region owns its own loading and error states so a slow plan read never
  hides "what now".
- **Plan health** view (`features/plan-health/`) replacing the standalone
  recovery summary: work moved forward, unfinished work, optional
  **"Regenerate my week"** (existing catch-up preview flow reused); never a
  gate, never a count-led headline.
- Routes: `/plan/health` (index) + `/plan/health/catch-up`; `/catch-up` and
  `/catch-up/preview` redirect there (`replace`); no dead routes remain.
- Navigation (`navGroups.ts`): Planning gains **Plan health**; a new
  **Focus** group exposes Focus and Study history; EP11's grouped-nav rules
  (D11-5 icons + text) preserved.
- Returning-after-absence framing: a single neutral, number-free sentence on
  the plan page when work moved forward, linking to plan health.
- Component tests (TR-E13-05); recorded manual a11y pass (TR-E13-14).

**Out of scope:**
- The what-now card and today section internals (EP13D). Momentum (EP13K).
- Backend changes (EP13C owns the contract; this story only mirrors the
  already-shipped `rolledForward*` keys in the client type).

## Source requirement references

- Epic AC-E13-04 (framing half), AC-E13-12 (copy/IA rule).
- Shared DoD 1, 4, 5, 6, 7, 8. TR-E13-05, TR-E13-14. EP11 D11-5, EP08 D08-8.

## Acceptance criteria

1. No route, redirect or default view leads with missed/rolled-forward
   counts; the plan page's first meaningful content is today's plan
   (`TodayPlanCard`), rendered before and independently of the saved-plan
   read.
2. The plan-health view presents moved-forward work and unfinished-work
   flags informationally, with regeneration as an optional secondary action;
   declining or ignoring it never degrades the current plan.
3. Navigation exposes Focus, Study history and Plan health per EP11's
   grouped-nav conventions; `/catch-up` and `/catch-up/preview` redirect
   without breaking bookmarks; no dead routes remain.
4. The absence/return note is a single neutral sentence containing **no
   numbers** (no counts of missed or moved sessions, no percentages, no
   shaming terms — asserted by test).
5. All states handled (loading/empty/error); keyboard operable with visible
   focus; usable at 320px.

## Tests (TR-E13-05)

Vitest + React Testing Library, colocated `*.test.tsx` (repo convention):

- `PlanPage.test.tsx` (extend) — `TodayPlanCard` renders above the week grid
  in DOM order; it still renders while the saved-plan read is loading and
  when it fails; the moved-forward note appears only when
  `rolledForwardCount > 0`, contains no digits and links to `/plan/health`.
- `PlanHealthView.test.tsx` (new) — loading skeletons with `aria-busy`;
  error + "Try again" refetches; the all-clear empty state; moved-forward
  rows render with their date/time/duration; "Regenerate my week" navigates
  to `/plan/health/catch-up` and is never disabled; the heading is never a
  count; copy assertions (no `%`, none of the EP08 blame terms, no
  "missed"/"behind"/"failed").
- `MovedForwardList.test.tsx`, `UnfinishedWorkList.test.tsx` (migrated from
  `features/recovery/`) — row rendering, locked badge, flag badges.
- `PlanHealthPage.test.tsx` (migrated from `CatchUpPage.test.tsx`) — the
  layout renders its `<Outlet/>`.
- `App` routing (`appRoutes.test.tsx`, new) — `/catch-up` renders plan
  health at `/plan/health`; `/catch-up/preview` renders the catch-up
  preview; both replace history.
- `Header.test.tsx` (extend) — the Focus menu trigger and its two items; the
  Planning menu's fourth item; mobile drawer regions; active states.
- Keyboard + narrow-screen checks inside the view tests (every control
  reachable, `max-sm:min-h-[44px]` targets, no colour-only distinctions).

## Technical notes

### Inspected code (2026-11-15, ui-refiner)

- `widgets/header/ui/navGroups.ts` — three authenticated sections (`home`,
  `dashboard`, `academics`, `planning`); no Focus, no catch-up/plan-health
  entry. `Header.tsx` types desktop menus as
  `'academics' | 'planning' | 'account'` — a new group must extend that
  union; the desktop nav row is `hidden md:flex … gap-6`.
- `app/App.tsx` — `/catch-up` is a layout route with `index → RecoverySummary`
  and `preview → CatchUpPreview`; nothing in the app links to either.
- `features/recovery/ui/` — `RecoverySummary` (local `useState` fetch of
  `getRecoverySummary`), `MissedSessionsList`, `MissedSessionRow`,
  `UnfinishedWorkList`. `RecoverySummary` is reachable only from the
  `/catch-up` index route.
- `features/catch-up/ui/CatchUpPreview.tsx` — four hard-coded
  `navigate('/catch-up')` targets plus "Back to catch-up" copy.
- `pages/plan/ui/PlanPage.tsx` — two **full-page early returns** (saved-plan
  loading skeleton, saved-plan error card) before any content renders; the
  header carries Generate/Save; `RemainingWorkSection` then the week grid.
- `apps/api/.../study-plans.service.ts` → `RecoverySummary` already carries
  `rolledForward`, `rolledForwardCount`, `rolledForwardMinutes` (EP13C,
  bounded to the last 7 days and filtered to unfinished assignments); the
  client type in `entities/study-plan/model/types.ts` has **not** been
  updated yet.
- `features/today-plan/` (EP13D) — `TodayPlanCard` takes
  `plan`/`status`/`error`/`isFetching`/`onRetry`; `todayPlanApi` is an RTK
  Query slice over the entity client with `keepUnusedDataFor: 60`.
- `app/store/store.ts` + `test/providers.tsx` — six reducers; both list the
  RTK Query slices explicitly, and `store.test.tsx` pins the key list.

### Decisions (ui-refiner, 2026-11-15)

| ID | Question | Decision + rationale |
|---|---|---|
| D-E1 | Where does plan health live, and what is it called? | **"Plan health" at `/plan/health`**, a layout route with the view at the index and the catch-up preview nested at `/plan/health/catch-up`. The name describes the plan, not the student (no "catch up", no "recovery", no "behind"); the path puts it where its subject lives and makes the Planning nav group read as one place. |
| D-E2 | What happens to `/catch-up` and `/catch-up/preview`? | **Permanent in-app redirects** (`<Navigate replace />`) to `/plan/health` and `/plan/health/catch-up`. Bookmarks survive, no dead route remains, and `replace` keeps Back from bouncing between old and new paths. |
| D-E3 | Does the old recovery surface stay? | **No — it moves.** `features/recovery/` is renamed into `features/plan-health/`: `RecoverySummary` → `PlanHealthView` (rewritten), `MissedSessionsList`/`MissedSessionRow` → `MovedForwardList`/`MovedSessionRow` (reframed copy), `UnfinishedWorkList` carried over unchanged with its tests. Leaving a dead `RecoverySummary` behind would keep shaming copy one import away. |
| D-E4 | Plan-health page structure | Header (`h1` **"Plan health"**, one-line subtitle, secondary **"Regenerate my week"** button) → lead status line → **"Moved forward"** section → **"Unfinished work"** section. Never a number in a heading; counts exist only as the rows themselves. |
| D-E5 | Lead status line copy | `rolledForwardCount > 0` → **"Your plan moved unfinished work forward so today's list is current."** Otherwise → **"Your plan is current — nothing needed moving."** One sentence, present tense, the plan is the subject, never the student. |
| D-E6 | "Moved forward" section copy | Heading **"Moved forward"**; description **"These sessions were rescheduled for you. Nothing was lost."** Rows keep the EP08 shape (date · time range · duration · optional **Locked** badge) and the assignment title. No "missed", no totals line. |
| D-E7 | Where does regeneration sit, and is it ever blocked? | **Secondary** (`variant="outline"`) in the page header, label **"Regenerate my week"**, → `/plan/health/catch-up`. **Never disabled** (EP08 disabled it when the summary was empty) — a voluntary reset is a legitimate ADHD action, and after EP13C the old "nothing missed" gate would hide it exactly when a student wants a fresh layout. |
| D-E8 | What are the "feasibility warnings" on this view? | **The server-provided per-assignment flags only** — `No estimate` / `No due date` on the unfinished-work rows (existing `Badge variant="warning"`). Full feasibility warnings (`NO_AVAILABLE_TIME`, `INSUFFICIENT_TIME_BEFORE_DEADLINE`, `OVERDUE`) belong to a plan proposal, so they stay where they already render — inside the regeneration preview (`WorkloadWarnings`). Calling `POST /study-plans/catch-up/preview` just to decorate a read-only view would make an informational page generate a proposal on every visit. **Flagged for the planner:** AC-2's wording is satisfied informationally, not by preview warnings on this page. |
| D-E9 | Plan-health states | Loading → two skeleton blocks inside `aria-busy="true"` with `motion-reduce:animate-none`. Error → `role="alert"` card, **"We couldn't load your plan health."** + **"Try again"** (refetch). Empty (nothing moved, nothing unfinished) → `EmptyState` **"Your plan is up to date"** / "Nothing moved forward and no unfinished work is waiting." with action **"See this week's plan"** → `/plan`. |
| D-E10 | Plan page order and the loading/error regression | **`TodayPlanCard` renders directly under the `h1`, before the week region, and is never gated by the saved-plan read.** The two full-page early returns become a scoped plan-region skeleton/error card. Today's single next action must survive a slow or failing week read — that is the whole point of AC-1. |
| D-E11 | The returning-after-absence note | A quiet `<p>` under the today card, shown only when `rolledForwardCount > 0`: **"Some earlier sessions moved into your current plan — today's list is up to date."** plus an inline link **"See plan health"**. **No digits anywhere in the sentence** (AC-4): a count of moved sessions is a backlog tally in disguise, which is exactly what rejection-sensitive students flee. The detail stays one click away for whoever wants it. |
| D-E12 | How does the plan page learn that work moved? | A new RTK Query slice **`features/plan-health/api/planHealthApi.ts`** over the existing `getRecoverySummary` entity client (`keepUnusedDataFor: 60`, mirroring `todayPlanApi`). The plan page and the plan-health view share one cache entry, so navigating between them costs no second request. Registered in `app/store/store.ts` and `test/providers.tsx` (both pinned by `store.test.tsx`). **No elapsed-absence tracking**: the signal is server truth (work actually moved), not a localStorage "days away" counter that would guess, drift across devices, and invite a "you've been away N days" sentence. |
| D-E13 | Nav: where do Focus and plan health go? | **Planning** gains `{ plan-health, 'Plan health', Activity, '/plan/health' }` as its fourth item. A **new `focus` group** (`Timer`) holds **"Focus session"** (`/focus`, `Timer`) and **"Study history"** (`/focus/history`, `History`) — history has no home today and the Focus page's only link to it is inside a running timer. `DesktopMenu` grows a `'focus'` member; the desktop nav row's `gap-6` becomes `gap-4 lg:gap-6` so five sections still fit on one row at `md`. |
| D-E14 | Catch-up preview copy and return targets | Its four `navigate('/catch-up')` calls become `/plan/health`; "Back to catch-up" becomes **"Back to plan health"**. The preview's own title ("Catch-up plan") and flow stay as EP08E shipped them — the action is still a catch-up; only the place it lives is reframed. |
| D-E15 | Announcements and focus | Plan health keeps EP08's pattern: no live region on load, `role="alert"` for the error only. The redirects move focus nowhere special (the target view's `h1` is the first heading); the catch-up preview keeps its existing `h1` focus-on-entry. One `role="alert"` per surface. |

### Component plan (Feature-Sliced Design)

| Component / module | Placement | Why |
|---|---|---|
| `PlanHealthView` | `features/plan-health/ui/` (replaces `RecoverySummary`) | The informational view: header, lead line, the two sections, all states. |
| `MovedForwardList`, `MovedSessionRow` | `features/plan-health/ui/` (moved from `features/recovery/`) | Same row shape, reframed heading and description. |
| `UnfinishedWorkList` | `features/plan-health/ui/` (moved verbatim) | Already non-blaming; carries its flags and its tests. |
| `planHealthApi` | `features/plan-health/api/` (new) | One cached `recovery-summary` read shared by the plan page and the view (D-E12). |
| `PlanHealthPage` | `pages/plan-health/ui/` (replaces `pages/catch-up/`) | The layout route with the `<Outlet/>` (EP08E's container, renamed). |
| `TodayPlanCard`, `todayPlanApi` | `features/today-plan/` (reuse) | EP13D's card, mounted unchanged on the plan page. |
| `CatchUpPreview` | `features/catch-up/ui/` (reuse, return targets only) | The regeneration flow is unchanged (D-E14). |
| `Button`, `Badge`, `Card`, `EmptyState` | `shared/ui/` (reuse) | Design-system primitives already used by both surfaces. |

### Accessibility and responsive

- Every control is a real `button`/`a` with the shared
  `focus-visible:ring-focus-ring` treatment; no new focus traps.
- Status is never colour-only: the **Locked** badge carries an icon + text,
  the flags carry text, the lead line carries the state in words.
- Loading regions use `aria-busy="true"`; the single error per surface uses
  `role="alert"`; skeletons carry `motion-reduce:animate-none`.
- At `<sm` the plan-health header stacks (`flex-col-reverse`) with a
  full-width regenerate button, rows wrap, and touch targets are
  `max-sm:min-h-[44px]`; usable at 320px. The nav's mobile drawer renders
  Focus as its own labelled region, matching Academics/Planning.

### Flagged for the technical refiner / planner

1. **D-E8** narrows AC-2's "feasibility warnings" to server-provided flags on
   this page; richer warnings stay in the regeneration preview.
2. The client `RecoverySummary` type must gain EP13C's `rolledForward`,
   `rolledForwardCount`, `rolledForwardMinutes` keys — a type-only mirror of
   a shipped contract, not a backend change.
3. `store.test.tsx` and `test/providers.tsx` pin the reducer inventory; the
   new slice updates both (expected, not a regression).

## Definition of Done

1. Functional criteria pass (AC-E13-04 framing).
2. N/A (no new inputs). 3. N/A (server-side scoping).
4. API errors surfaced actionably (D-E9).
5. Loading/empty/error states (D-E9). 6. Keyboard. 7. Responsive.
8. Automated tests (TR-E13-05).
9. N/A (no API/migration).
10–11. Combined EP13 parent review / reviewer walkthrough.

## Sizing

- **Outcome:** returning students are greeted with today's plan, never a backlog; focus, history and plan health are reachable from the nav.
- **Estimate:** 2 requests/tokens.
- **Model recommendation:** 3 — mostly IA/composition and copy discipline over existing components.
- **Production files:** `apps/web/src/widgets/header/ui/{navGroups.ts,Header.tsx}`, `app/App.tsx`, `app/store/store.ts`, `test/providers.tsx`, `features/plan-health/*` (new/moved), `features/recovery/*` (removed), `features/catch-up/ui/CatchUpPreview.tsx`, `pages/plan-health/*` (new), `pages/catch-up/*` (removed), `pages/plan/ui/PlanPage.tsx`, `entities/study-plan/model/types.ts`.
- **Test files:** colocated component tests, plus `app/appRoutes.test.tsx`.
- **Minimal start context:** this story + EP13C contract, `navGroups.ts`/`Header.tsx`, recovery/catch-up features, `PlanPage.tsx`, EP11 nav decisions.
- **Verification:** `pnpm --filter @studypilot/web test`, lint, typecheck.
- **Dependencies:** EP13C, EP13D (both implemented).
- **Exclusions:** what-now card internals (EP13D), momentum (EP13K).

## Tracker reference

Jira key: Pending creation (no sync authorized).
