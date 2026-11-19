# EP16B — Today's Secondary Content

**Story ID:** EP16B
**Parent epic:** [EP16: Today-First Simplification](../../epics/EP16-today-first-simplification.md)
**Milestone:** M9 (D16-1)
**Layer:** Frontend
**Status:** Reviewed — EP16 combined review passed 2026-11-18, pass 2 ([review.md](./artifacts/EP16/review.md)); record: [artifacts/EP16B/implementation.md](./artifacts/EP16B/implementation.md). D-B5…D-B10 ratified by default at implementation start (2026-11-18).
**Refined:** 2026-11-18
**Dependencies:** EP16A implemented (`TodayPage` composition root, `features/today`). Epic decisions D16-3 (ratified), D16-8 (ratified, option c), D16-12, D16-18.

## Plan at a glance

- **What this changes:** Under the hero, Today gets four regions in this order: one plan-note sentence with **See your week** (only when work moved forward), one compact momentum row (seven day marks, the weekly sentence and **See history**), **Coming up** (unfinished assignments, past-due ones first with a **Past due** text badge, five rows, **All assignments**), and a one-line **Classes today**. The plan note leaves `/plan`. `MomentumCard` is deleted. A shared forbidden-words test helper ships with this story.
- **Why it improves it:** After "what now", a student asks three things: "am I keeping up", "what's coming" and "where am I today". Each gets exactly one quiet region, and the page no longer leads with an "Overdue" list. Any region with nothing to say renders nothing (product, AC-E16-03/04/05). On the code side, the retired dashboard's four section components and its empty-state copy become four small components, and the dead `MomentumCard` and unused dashboard limits go away (code).
- **Decisions needing you:** none. The new rows D-B5…D-B10 are presentation and test-helper choices (none ▲); they ratify by default at implementation start.
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes. AC text freezes when implementation starts.

## Summary

Fill in Today's secondary regions per contracts § Today region contract (rows
2–5). The plan note moves from `/plan`, and the momentum sentences move from the
retired card into one row. Nothing new is read: the four queries are the ones
the dashboard already made — `GET /assignments`, `GET /calendar/events` (Today
already reads this one), `GET /study-sessions/momentum` and
`GET /study-plans/recovery-summary`.

## Scope

**In:**
- New `features/today/ui/{PlanNote,MomentumRow,ComingUp,ClassesToday}.tsx`, each with a test.
- `TodayPage` composition: three more queries, the refresh control refetches all five, the shared assignment owner gets Coming up's rows, and the live-region sentence (D-B9).
- `features/plan-health/api/planHealthApi.ts` moves to `features/today/api/recoverySummaryApi.ts` and is renamed (D-B5).
- `selectComingUp` added to `dashboardSelectors.ts` (D-B2).
- `DashboardAssignmentRow`: the **Past due** badge and the divided-list styling (D-B6).
- The plan note is removed from `PlanPage.tsx` (`:233-247`, plus its query and import at `:26`, `:91-98`).
- `MomentumCard` is deleted (D-B4).
- Dashboard-only exports that now have no importer are deleted (A-B3).
- New `apps/web/src/test/forbiddenWords.ts` helper with its own test (D-B8), and the copy audit over Today in every rendered state.

**Out (implementer: do not drift):**
- The hero, `TodayPlanCard` and its states (EP16A).
- Any `/plan` change beyond deleting the note (EP16C rebuilds the page).
- `PlanHealthView`, beyond the one import-path edit the move forces (EP16C deletes it).
- `features/assignments/**`, including `OVERDUE_LABEL` and `AssignmentRow` on `/assignments` (an EP03 surface — see the planner note under Decisions).
- `AssignmentDialogs` and its contents.
- Navigation, the header and the session indicator (EP16D).
- Any API, engine or schema change (D16-13).
- Playwright edits (EP16F owns `today.spec.ts`; F-EP16A-03). EP16B only runs the existing suite.
- A "Show week" disclosure, a progress bar or the daily sentence in the momentum row (D16-8 (c) excludes them).

## Source requirement references

AC-E16-03, AC-E16-04, AC-E16-05 (primary); AC-E16-07 (note link); AC-E16-12. TR-E16-01, TR-E16-05, TR-E16-06. DoD-1, 5, 6, 7, 8.

## Acceptance criteria

1. **EP16B-AC1 — Plan note:** when `rolledForwardCount > 0`, a single sentence renders directly under the hero: "Some earlier sessions moved into your current plan — today's list is up to date." It carries the link **See your week** → `/plan`. Otherwise nothing renders. No number appears. `PlanPage` no longer renders the note.
2. **EP16B-AC2 — Momentum row:** when `hasHistory`, one row renders: `MomentumWeekStrip compact` (decorative, with its sr-only sentence) beside `weeklyLine(momentum)` (and `runLine` when non-null), plus the link **See history** → `/focus/history`. There is no progress bar, no daily sentence, no card chrome and no heading with a count. When `!hasHistory`, nothing renders (the hero is the call to action). Loading and error are one line each (error: "We couldn't load your momentum." + Try again).
3. **EP16B-AC3 — Coming up:**
   - Unfinished assignments only, ordered past-due first (due ascending), then due ascending, then rows with no due date.
   - Capped at five via `limitRows`, with the footer link **All assignments** → `/assignments` (always shown when there is ≥ 1 row).
   - Past-due rows carry the text badge **Past due** (text, never colour alone).
   - Rows are `DashboardAssignmentRow` and open details through the page's shared owner (D05-17).
   - The heading is "Coming up", with no count.
   - Nothing renders when there are no unfinished assignments.
4. **EP16B-AC4 — Classes today:** one line, "Classes today · 10:00 BIO 101 · 14:00 MATH 201", built from `selectTodayClasses`. Each class links to its course (`event.link`). Nothing renders when there are no classes. The live region's count sentence covers the plan's sessions, the classes and the Coming up rows (uncapped totals).
5. **EP16B-AC5 — Copy audit:** `expectNoForbiddenWords(container)` passes for Today in every combination of states the tests render (loading, empty, error, full). The helper's list is contracts.md § Copy rules; the **Past due** badge is allowed.

(AC text unchanged from planning. How refinement interprets it is recorded in D-B6…D-B10; none changes an AC's substance.)

## Tests (TR-E16-01, TR-E16-05, TR-E16-06)

Vitest + Testing Library, colocated `*.test.tsx`. Page tests use the axios-adapter harness already in `pages/today/ui/TodayPage.test.tsx`. Component tests render with props, no network. **Fixture titles must not contain forbidden words**: the audit reads rendered text, and titles are user data.

| File (new unless noted) | Cases (names as written) | AC |
|---|---|---|
| `apps/web/src/test/forbiddenWords.test.ts` | `flags each forbidden word as a whole word, case-insensitively`; `flags a % character`; `allows "Past due", "Moved forward", "Set aside"`; `does not flag "later" or "Move later" (whole-word match)`; `reads aria-label, title and alt attributes as well as text` | AC5 |
| `features/today/ui/PlanNote.test.tsx` | `renders the sentence and "See your week" → /plan when rolledForwardCount > 0`; `renders no digit even when rolledForwardCount is 2`; `renders nothing when rolledForwardCount is 0`; `renders nothing while loading and on error (D-B7)` | AC1 |
| `features/today/ui/MomentumRow.test.tsx` | `parity: the sentence equals weeklyLine(fixture)` (TR-E16-06); `parity: shows runLine(fixture) when non-null and nothing extra when null`; `goal met shows the met sentence with a decorative icon, text carries the meaning`; `renders the compact week strip aria-hidden with its sr-only sentence`; `has no progress bar, no daily sentence and no visible heading`; `"See history" links to /focus/history`; `renders nothing when !hasHistory`; `loading renders one aria-busy skeleton line`; `error renders "We couldn't load your momentum." and Try again calls onRetry`; `renders no % and no forbidden word` | AC2, AC5 |
| `features/today/ui/ComingUp.test.tsx` | `orders past-due rows first, then upcoming by due date, no-due-date last`; `caps at five rows and always shows "All assignments" → /assignments`; `shows "All assignments" with a single row`; `"Past due" badge on past-due rows only, as text`; `the heading is "Coming up" with no digit`; `a row's title calls onOpenDetails with that row once`; `renders nothing when there are no unfinished assignments`; `finished assignments never appear`; `loading renders three skeleton rows inside aria-busy`; `error renders the message line and Try again calls onRetry`; `rows keep a 44px target under sm` (class assertion, EP05B precedent) | AC3, AC5 |
| `features/today/ui/ClassesToday.test.tsx` | `renders "Classes today" then "HH:mm CODE" per class in payload order`; `each class is a link to event.link whose accessible name starts with its visible text`; `a class with no link renders as text`; `renders nothing when no class falls on today`; `ignores CLASS events on neighbouring days`; `loading renders nothing; error renders the one-line message with Try again (D-B7)` | AC4 |
| `features/today/model/dashboardSelectors.test.ts` (existing) | `selectComingUp: past-due (due asc) then upcoming (due asc, null last), unfinished only`; `selectComingUp: a row due exactly now is upcoming (the shared predicate's strict <)`; delete the `selectTodayStudySessions` cases (A-B3) | AC3 |
| `pages/today/ui/TodayPage.test.tsx` (existing) | Update `EP16A-AC1: heading "Today", title, the hero first, and no other region` to `region order: hero, plan note, momentum, Coming up, Classes today`. New: `EP16B-AC1: the note renders under the hero only when work moved forward`; `EP16B-AC4: the live region reads sessions · classes · coming up with uncapped totals (D-B9)`; `EP16B-AC4: the live region omits a zero classes or coming-up part`; `EP16B: the hero renders while the four secondary reads are still pending` (AC-E16-02 independence); `EP16B: a failing assignments read leaves the hero and other regions usable`; `EP16B: Refresh refetches assignments, calendar, plan, momentum and recovery summary`; `EP16B-AC3: opening a row's details opens the shared dialog once (D05-17)`; `EP16B: adding an assignment refetches Coming up and the new row appears`; `EP16B-AC5: copy audit — loading, all-empty, all-error, full`; `EP16B: exactly one role="status" on the page in every state` | AC1–AC5 |
| `pages/plan/ui/PlanPage.test.tsx` (existing) | Delete `shows no return note when nothing moved forward` and `shows one neutral, number-free return note when work moved forward (AC-4)`. Add `EP16B-AC1: the plan page renders no moved-forward note`. Remove the recovery-summary mock if nothing else uses it | AC1 |
| `features/momentum/ui/MomentumCard.test.tsx` | Deleted with the component (D-B4) | — |

## Technical notes

### Relevant files

**Change:**
- `apps/web/src/pages/today/ui/TodayPage.tsx`:
  - Add `useAssignmentsQuery` (`features/assignments/api/assignmentsApi.ts`), `useMomentumQuery` (`features/momentum/api/momentumApi.ts`) and `useRecoverySummaryQuery` (moved, D-B5).
  - Compute `classes = selectTodayClasses(events, today)` and `comingUp = selectComingUp(assignments)`.
  - Pass `items: comingUp` (uncapped, memoized on the payload — the old `DashboardPage` `visibleRows` pattern) to `useAssignmentActions`. `onChanged`, `onSubtaskChanged` and `onSubtaskRefresh` call `assignmentsQuery.refetch()`.
  - `openDetails = (row) => actions.openEdit(row)`.
  - `timeZone = calendar?.timeZone ?? getBrowserTimeZone()` (EP05B assumption A7).
  - `handleRefresh` refetches all five queries.
  - Remove the `NO_ROWS` placeholder.
  - Replace `sessionsSentence` with the D-B9 sentence.
- `apps/web/src/features/today/model/dashboardSelectors.ts`: add `selectComingUp(rows, now?)` = `[...selectOverdueAssignments(rows, now), ...selectUpcomingAssignments(rows, now)]`. No re-sort, because both selectors keep the endpoint's `dueDate asc, nulls last` order. Delete `selectTodayStudySessions` (A-B3).
- `apps/web/src/features/today/ui/dashboardSection.ts`:
  - Add `COMING_UP_LIMIT = 5`.
  - Delete the exports that no longer have an importer: `CLASSES_LIMIT`, `UPCOMING_DEADLINES_LIMIT`, `OVERDUE_ASSIGNMENTS_LIMIT`, `STUDY_SESSIONS_LIMIT`, `EMPTY_STATE_FALLBACK_TITLE`, `DashboardEmptyState`, `DashboardSectionBaseProps`, `DashboardAssignmentSectionProps` (A-B3).
  - Keep `DashboardSectionStatus`, `eventTimeRange` and `dueDateLabel`.
- `apps/web/src/features/today/ui/DashboardAssignmentRow.tsx`:
  - Badge: `<Badge variant="neutral">{PAST_DUE_LABEL}</Badge>` with `PAST_DUE_LABEL = 'Past due'` exported from this file. Drop the `OVERDUE_LABEL` import.
  - The `li` loses its own border and shadow (`py-3`) for the divided list (D-B6).
  - Its only importer after EP16A is Today, so `/assignments` is untouched.
- `apps/web/src/features/plan-health/api/planHealthApi.ts` → `apps/web/src/features/today/api/recoverySummaryApi.ts`:
  - `git mv`, then rename to `recoverySummaryApi` (reducerPath `'recoverySummaryApi'`), `recoverySummary` and `useRecoverySummaryQuery` (D-B5).
  - Importers to update: `app/store/store.ts:8,23,37,46`, `test/providers.tsx:11,29,40,49`, `app/store/store.test.tsx:28` (reducer-key list) and `features/plan-health/ui/PlanHealthView.tsx:5` (temporary, because EP16C deletes the view).
- `apps/web/src/pages/plan/ui/PlanPage.tsx`: delete the note block (`:233-247`), `usePlanHealthQuery` (`:26`, `:97-98`) and its comment.
- `apps/web/src/features/study-plan/ui/RemainingWorkSection.test.tsx:11`: fix the comment that mentions `planHealthApi`, if it names the old path.

**New:**
- `apps/web/src/features/today/ui/PlanNote.tsx` — props `{ summary?: RecoverySummary; status: DashboardSectionStatus }`.
- `apps/web/src/features/today/ui/MomentumRow.tsx` — props `{ momentum?: MomentumSummary; status; error?; isFetching?; onRetry }`.
- `apps/web/src/features/today/ui/ComingUp.tsx` — props `{ rows: AssignmentListItem[]; timeZone; status; error?; isFetching?; onRetry; onOpenDetails }`. It applies `selectComingUp` and `limitRows(…, COMING_UP_LIMIT)` itself, as the EP05B sections did.
- `apps/web/src/features/today/ui/ClassesToday.tsx` — props `{ events: CalendarEvent[]; today: string; status; error?; isFetching?; onRetry }`.
- `apps/web/src/test/forbiddenWords.ts` (+ `forbiddenWords.test.ts`) — `FORBIDDEN_WORDS` and `expectNoForbiddenWords(container: HTMLElement)` (D-B8).
- Tests listed above.

**Delete:** `apps/web/src/features/momentum/ui/MomentumCard.tsx` and `MomentumCard.test.tsx` (D-B4). The only other consumer of the momentum UI is `features/focus-session/ui/FocusTimer.tsx:7-8,189`, which imports `momentumCopy` and `MomentumWeekStrip`, not the card.

### Grounding (inspected 2026-11-18 at `d35970a`)

- `TodayPage.tsx` currently mounts no assignments, momentum or recovery-summary read. `TodayPage.test.tsx:124` asserts that, and must be updated.
- `DashboardAssignmentRow.tsx:63` renders `<Badge variant="danger">{OVERDUE_LABEL}</Badge>`, where `OVERDUE_LABEL = 'Overdue'` (`assignmentPresentation.ts:66`). That is a forbidden word on Today, so AC3 and AC5 require the change.
- `MomentumCard.tsx` is imported only by its own test. `useMomentumQuery` has no caller since EP16A.
- `CLASS` events carry `title = course.name`, `subtitle = course.code` (non-null in Prisma) and `link = /courses/:id` (`apps/api/src/modules/calendar/calendar.service.ts:218-229`).
- The recovery-summary read takes no arguments, and its cache uses `keepUnusedDataFor: 60`.
- `momentumCopy.ts`: `weeklyLine` and `runLine` are the parity sources. `dailyLine` is not rendered here, because the hero's "N min studied today" badge carries today's minutes (D16-8).

### Security

No new read or write, and no new input. Every query goes through the existing authenticated `httpClient`, scoped server-side by `userId`. DoD-2/3 are N/A.

### Assumptions (harmless, reversible)

- **A-B1:** Classes today is **not capped**. A day with more than five classes is rare, and the line wraps. The old `CLASSES_LIMIT` goes with A-B3.
- **A-B2:** The past-due badge reads the real clock (`isOverdueAssignment(row)` inside the row), while `selectComingUp` accepts an injected `now`. Tests use due dates days away from "now", so the two cannot disagree.
- **A-B3:** Delete every `features/today` export with no remaining importer (grep-verified at implementation). If an importer is found, keep the export and record a finding.
- **A-B4:** The copy audit covers Today's container with dialogs closed. The shared EP03 assignment dialogs are not an EP16 surface.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-B1 | Plan-note link target: (a) `/plan` ("See your week"); (b) `/plan/proposal` directly | **(a)** — D16-18; an informational sentence must not launch a proposal | Ratified (user, 2026-11-17 — "ratify all") |
| D-B2 | Coming up ordering helper: (a) a new pure `selectComingUp` composing the two existing selectors; (b) inline in the component | **(a)** — testable without the DOM; EP05A precedent | Ratified (user, 2026-11-17 — "ratify all") |
| D-B3 | Coming up loading/error: (a) one three-row skeleton and one error line with Try again, the EP05B section pattern; (b) share the hero's states | **(a)** — the assignments query is independent of the plan query | Ratified (user, 2026-11-17 — "ratify all") |
| D-B4 | `MomentumCard`: (a) delete if the Focus-page celebration does not import it (it imports `momentumCopy`, not the card — verify); (b) keep it unused | **(a)** — no dead components. *Verified 2026-11-18:* `FocusTimer.tsx` imports only `momentumCopy` and `MomentumWeekStrip` | Ratified (user, 2026-11-17 — "ratify all") |
| D-B5 | The moved recovery-summary read: (a) `git mv` to `features/today/api/` **and** rename `planHealthApi` → `recoverySummaryApi` (hook `useRecoverySummaryQuery`, reducerPath `recoverySummaryApi`); (b) move only, keep the plan-health names | **(a)** — the move already touches every importer (five files), and after EP16C "plan health" names nothing the student can see. The new name is the endpoint's own (`/recovery-summary`), and it keeps EP16C-AC4's `plan-health` search clean | Ratified by default, 2026-11-18 (implementation start) |
| D-B6 | Coming up presentation: (a) one `card` containing a `divide-y` list of compact rows, with a **neutral** `Badge` reading **Past due** (`PAST_DUE_LABEL` in `DashboardAssignmentRow.tsx`); (b) EP05B's five separately bordered row cards with the `danger` badge relabelled; (c) a `warning` badge | **(a)** — five bordered cards stacked under the hero are the heaviest thing on the page, against D15-14 minimalism. A red badge on a deadline list makes Today lead with alarm, which D16-3 and the "never leads with a failure" invariant exclude. The text carries the meaning (WCAG 1.4.1). Refines D16-3 (badge appearance) and EP05B D05-18 (row chrome) | Ratified by default, 2026-11-18 (implementation start) |
| D-B7 | States for the regions D-B3 does not cover: (a) **plan note** — nothing while loading or on error (an absent note costs the student nothing, and an error line about plan changes would lead with a failure); **classes** — nothing while loading, one line "We couldn't load today's classes." + Try again on error (refetches the calendar query); **momentum** — AC2's one-line states; **error lines on secondary regions are plain text, not `role="alert"`** (the hero keeps its alert); (b) every region uses `role="alert"`, EP05B style | **(a)** — offline, (b) would fire four assertive announcements at once on page load. The hero's alert is the one that matters, and every secondary error line is still visible with its own Try again (DoD-5). Refines D-B3 (the alert role only; skeleton and copy unchanged) | Ratified by default, 2026-11-18 (implementation start) |
| D-B8 | Forbidden-word helper semantics: (a) case-insensitive **whole-word** match (`\b(missed\|behind\|overdue\|failed\|late)\b`) plus any `%`, over `textContent` **and** the `aria-label`, `title` and `alt` attributes inside the container; (b) substring match on `textContent` only | **(a)** — a substring match flags "later" in `PlanSessionEditor` ("Move later") and `WorkloadWarnings` ("Continues in a later plan"), and EP16C reuses the helper there. Accessible names are rendered strings for screen-reader users | Ratified by default, 2026-11-18 (implementation start) |
| D-B9 | Live-region sentence: (a) `"<sessions part>"` + `" · N class(es) today"` when N > 0 + `" · N assignment(s) coming up"` when N > 0, with uncapped totals, no past-due count, and `"Loading your day…"` until the plan read settles. The action sentence is prepended as today (D-A2); (b) always list all three parts, zeros included | **(a)** — it follows D16-12 (10) in speech too, and it never announces a count of past-due work (copy rules: Today never leads with a failure). The sessions part keeps EP16A's wording | Ratified by default, 2026-11-18 (implementation start) |
| D-B10 | Classes line format: (a) `<h2>` "Classes today" inline, then a `ul` (flex-wrap) of links whose visible text is `HH:mm CODE` (`startTime` + `subtitle`) and whose `aria-label` is `"HH:mm CODE, <course name>"`, separated by `aria-hidden` "·"; (b) visible text with the course name | **(a)** — it is the epic's format ("10:00 BIO 101"). The accessible name adds the course name and starts with the visible text (WCAG 2.5.3). A heading makes the line reachable by heading navigation | Ratified by default, 2026-11-18 (implementation start) |

**Planner note (not an EP16B change):** `OVERDUE_LABEL = 'Overdue'` still renders on `/assignments` and course pages (`features/assignments/ui/AssignmentRow.tsx:220`). Those are EP03 surfaces outside EP16's copy scope. A backlog row may be wanted if the copy rule should extend there.

## UI/UX

**Element decisions:**

| Element | Reuse / new | Placement | Reason |
|---|---|---|---|
| `TodayPlanCard` | reuse, unchanged | region 1 | EP16A owns it |
| `PlanNote` | new, `features/today/ui` | region 2, directly under the hero | the EP13E sentence; Today is its only reader |
| `MomentumRow` | new, `features/today/ui`; reuses `MomentumWeekStrip compact` and `momentumCopy` | region 3 | D16-8 (c); TR-E16-06 parity |
| `ComingUp` | new, `features/today/ui`; reuses `DashboardAssignmentRow`, `limitRows`, `selectComingUp` | region 4 | one list for "what's coming" (D16-3) |
| `ClassesToday` | new, `features/today/ui`; reuses `selectTodayClasses` | region 5 | one line (D16-3) |
| `Badge`, `Button`, `Link` | reuse (`shared/ui`, react-router) | in the regions | existing tokens and focus ring |

**Layout and hierarchy (desktop ≥ `sm`):** Order (fixed): header → live region → hero → plan note → momentum row → Coming up → Classes today. Vertical rhythm is `mb-6` between regions, as the hero already uses. Hero first is unchanged (AC-E16-02). Below it:

| Region | Desktop layout |
|---|---|
| Plan note | `p.text-sm.text-text-muted`, no card. The sentence is followed by the **See your week** link (accent, underlined, focus ring) |
| Momentum row | `section` with an sr-only `h2` "Your momentum", no card chrome. A flex row: the strip on the left in a fixed `sm:w-72` box; the weekly sentence (`text-sm font-medium`) and run line (`text-sm text-text-muted`) on the right; **See history** right-aligned at the end of the row |
| Coming up | `section` with a visible `h2` "Coming up" (`text-lg font-semibold`, no count, no icon) and one `card` holding a `divide-y` list of ≤ 5 rows. The footer link **All assignments** sits under the list, left-aligned |
| Classes today | `section` with the inline `h2` "Classes today" (`text-sm font-semibold`), then the wrapped links (`text-sm`) |

**Primary control:** the hero's Start focus / Resume focus / Plan my week stays the only primary on screen (D16-12 (8)). Every new control is a text link or an `outline` Try again.

**States per region:**

| Region | Loading | Empty | Error |
|---|---|---|---|
| Plan note | nothing | nothing (`rolledForwardCount` 0) | nothing (D-B7) |
| Momentum | one `h-9` skeleton bar, `aria-busy` | nothing (`!hasHistory`) | "We couldn't load your momentum." (the server message when meaningful, the `MomentumCard` rule) + outline **Try again** (`isLoading` while refetching) |
| Coming up | heading + three `h-12` skeleton rows, `aria-busy` | nothing | heading + "We couldn't load your assignments." (or the server message) + outline **Try again** |
| Classes today | nothing | nothing | "We couldn't load today's classes." + outline **Try again** |

Skeletons use `animate-pulse motion-reduce:animate-none`. Error lines are plain text (D-B7).

**Keyboard and focus:** Tab order follows the DOM: header → hero controls → See your week → See history → row titles (top to bottom) → All assignments → class links. Every control is a native `a` or `button` with the shared `focus-visible:ring-2 ring-focus-ring ring-offset-2`. Opening a row's details uses the shared owner; focus returns as EP05C defines (`data-assignment-focus`). After **Add assignment**, the shared hook focuses the new row's title when it is among the five, else the Add control (EP05C behaviour, now with real rows). Try again keeps focus on itself while busy, because `Button` keeps its accessible name (EP16A-AC5).

**Accessibility (WCAG 2.2 AA):**
- Past due is text in a badge (1.4.1).
- The week strip is `aria-hidden`, and its sr-only sentence carries the meaning. A met weekly goal is the text "Weekly goal met — …" with a decorative icon, never colour alone.
- There is one `role="status"` (D-D13). The new regions add none, and their errors are not alerts (D-B7).
- Headings: h1 Today → h2 Today's plan → h2 Your momentum (sr-only) → h2 Coming up → h2 Classes today. No heading carries a digit.
- Link names: "See your week", "See history", "All assignments", and per class "10:00 BIO 101, Cell Biology" (2.5.3 label in name).
- Contrast uses the existing `text-text`, `text-text-muted` and `text-accent` tokens on `surface`, which are already AA-checked by the EP15J axe gate.
- Reduced motion: no new animation beyond skeleton pulse, which is disabled under `motion-reduce`.

**Responsive (360 px and up):**
- **Momentum:** stacks (`flex-col`). The strip runs full width (its seven `flex-1` marks fit at 360 px: 7 × ~44 px). The sentence goes below it, and **See history** below that, as `inline-flex min-h-[44px] items-center`.
- **Coming up:** rows full width. The badge wraps under the title (`flex-wrap`). Row title buttons and **All assignments** get `max-sm:min-h-[44px]`.
- **Classes:** wrap onto multiple lines (`flex flex-wrap gap-x-3 gap-y-1`). Each link is `max-sm:min-h-[44px] inline-flex items-center`.
- **No horizontal scroll** at 360 px.
- **Hero stays first:** the hero's primary stays visible without scrolling at 360×640, because every new region renders below it (V-16-3 is verified in EP16F).

**Copy (exact):**

| Where | Text |
|---|---|
| Plan note | "Some earlier sessions moved into your current plan — today's list is up to date." + **See your week** |
| Momentum | `weeklyLine` / `runLine` verbatim (EP13K D-K10) + **See history**; error "We couldn't load your momentum." / **Try again** |
| Coming up | heading "Coming up"; badge "Past due"; row lines as `DashboardAssignmentRow` (title; "CODE · Name" or "No course"; "Due Oct 30, 2026" or "No due date" · subtask progress); footer **All assignments**; error "We couldn't load your assignments." / **Try again** |
| Classes | "Classes today" · "10:00 BIO 101" …; error "We couldn't load today's classes." / **Try again** |
| Live region | e.g. "2 sessions planned today · 1 class today · 4 assignments coming up"; "No sessions planned today · 3 assignments coming up"; "Loading your day…" |

## Definition of Done

1, 5, 6, 7, 8 (TR-E16-01/05/06). 2, 3, 4, 9 N/A (no input, no new read, no API). 10–11 via the EP16 combined review.

## Sizing

- **Outcome:** Today answers "am I keeping up / what's coming / what's on today" in quiet regions that vanish when there is nothing to say.
- **Actual at closeout:** one window, one commit, 2026-11-18; files as planned (the recovery-summary importers were `createAppStore.ts`/`resetOnUserChange.ts` after EP16G rather than `store.ts`/`providers.tsx`); web 1355/0; Playwright 62/0 ×2 after one cold-start timeout (F-EP16B-02). Row in [efficiency.md](./artifacts/efficiency.md).
- **Files:**
  - New: `apps/web/src/features/today/ui/{PlanNote,MomentumRow,ComingUp,ClassesToday}.tsx` (+ tests), `apps/web/src/test/forbiddenWords.ts` (+ test).
  - Changed: `apps/web/src/features/today/model/dashboardSelectors.ts` (+ test), `apps/web/src/features/today/ui/{dashboardSection.ts,DashboardAssignmentRow.tsx}`, `apps/web/src/pages/today/ui/TodayPage.tsx` (+ test), `apps/web/src/pages/plan/ui/PlanPage.tsx` (+ test), `apps/web/src/app/store/store.ts` (+ `store.test.tsx`), `apps/web/src/test/providers.tsx`, `apps/web/src/features/plan-health/ui/PlanHealthView.tsx` (import path only).
  - Moved: `apps/web/src/features/today/api/recoverySummaryApi.ts`.
  - Deleted: `apps/web/src/features/momentum/ui/MomentumCard.tsx` (+ test).
- **Start context:** this story; contracts.md § Today region contract (rows 2–5) and § Copy rules; `TodayPage.tsx`, `dashboardSelectors.ts`, `DashboardAssignmentRow.tsx`, `MomentumWeekStrip.tsx`, `momentumCopy.ts`, `PlanPage.tsx:233-247`. The pre-EP16A `DashboardPage.tsx` (`git show d35970a^:apps/web/src/pages/dashboard/ui/DashboardPage.tsx`) shows the assignments-owner wiring.
- **Verification:**
  - Web gates (cwd `apps/web`): `npx tsc --noEmit -p tsconfig.json`, `npx eslint src --max-warnings=0` and `npx vitest run`, all green.
  - Full Playwright suite in external-stack mode (the EP16A procedure), with no e2e edits expected. Journeys that visit `/today` (adaptive-scheduling journeys 1, 4, 5, 6) must stay green, and `expectNoAxeViolations(page, '/today')` must pass with the new regions.
  - Manual: a student with past-due and upcoming work sees one list with Past due rows first; a student with no history sees no momentum row.
- **Dependencies / exclusions:** EP16A. `/plan` rebuild → EP16C; momentum-row e2e assertion → EP16F (F-EP16A-03).
