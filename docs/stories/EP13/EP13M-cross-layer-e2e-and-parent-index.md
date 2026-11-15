# EP13M — Cross-Layer E2E and Parent Index

**Story ID:** EP13M
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Integration
**Status:** Queued
**Dependencies:** EP13A–EP13N implemented — the whole epic, including EP13H2 (fix story) and EP13N (preference controls). **D13-4 is resolved (option b), so the flex journeys are in scope unconditionally.**
**Reviewed:** 2026-11-15 — dependencies de-conditionalised, the manual a11y pass promoted from "collected" to "performed" (see *Review note*).
**Replanned:** 2026-11-15 — shared-understanding template (EP13Q); decisions D-M1…D-M6 proposed for user review.

## Plan at a glance

- **What this changes:** a new Playwright suite `apps/web/e2e/adaptive-scheduling.spec.ts` on the EP09 self-contained stack covering seven journeys (work → plan shrinks; miss a day → rolls forward; one-tap start → COMPLETED; flex "Anytime" session; micro-start + absorption; momentum updates; EP13E information architecture), automated accessibility checks inside those journeys plus a user-run screen-reader/reduced-motion checklist (TR-E13-14), and the parent implementation index `./artifacts/EP13/implementation.md` (child inventory, per-child diff ranges, test commands) that the combined review starts from. No product behavior changes.
- **Why it improves it:** the epic's promises are multi-day, multi-surface behaviors no unit test can prove; this is the only place they are demonstrated end to end (product). The index gives the reviewer per-child diff ranges and test commands, so the final review starts from a map instead of rediscovery (code).
- **Decisions needing you:** ▲ D-M1 (how the manual accessibility pass is executed and who signs it) is Proposed with a recommendation; D-M2…D-M6 auto-ratify.
- **How to change this plan:** edit a Ruling cell in the Decisions table below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.


The epic's promises are multi-day, multi-surface behaviors no unit test can
prove: do the work and the plan shrinks; miss a day and the plan quietly
rolls forward; start from the plan in one tap; momentum reflects reality.
This story adds a new Playwright suite (`apps/web/e2e/adaptive-scheduling.spec.ts`)
against the self-contained EP09 stack, exercising those journeys end to end
(driving "today" via the suite's controlled data setup, consistent with how
the existing specs construct dated fixtures), plus the parent implementation
index (`./artifacts/EP13/implementation.md`) collecting all child evidence
and the recorded manual a11y passes (TR-E13-14) for the combined review.

## Scope

**In scope:**
- New E2E journeys: (1) focus session → confirmed minutes → regenerated plan
  demonstrably smaller for that assignment; (2) past unstarted session →
  next plan read shows it rolled forward, plan health informational, no
  mandatory catch-up; (3) dashboard what-now → one-tap focus start → finish
  → planned session COMPLETED on calendar/today; (4) flex session started
  anytime, absent from clock-conflict behaviour, rendered as "Anytime" on
  the plan/today/calendar surfaces (EP13G/EP13H — unconditional since D13-4
  ruled option (b)); (5) micro-start ("Just 10 min") counts and absorption
  extends the running target (EP13I); (6) momentum numbers update after a
  finish (EP13K); (7) information architecture: `/catch-up` and
  `/catch-up/preview` redirect into plan health, Focus and Plan health are
  reachable from the nav, and no surface leads with a missed/rolled count
  (EP13E).
- **One combined manual accessibility pass** across every surface EP13D,
  EP13E, EP13H, EP13I and EP13K added, recorded as the TR-E13-14 evidence
  those five stories each left open.
- Keeping every pre-existing suite green (API, web unit, existing E2E specs).
- Parent implementation index.

**Out of scope:**
- New product behavior; fixing unrelated pre-existing failures (report,
  don't absorb — EP08 F-02 precedent).

## Source requirement references

- Epic AC-E13-01…14 (cross-layer proof where marked in the ownership table).
- Shared DoD 1, 3, 8, 9, 10. TR-E13-13; TR-E13-14 (the combined manual pass is performed and recorded here — EP13M-AC3).

## Acceptance criteria

1. The six journeys above pass deterministically against the self-contained
   stack (`pnpm test:e2e`), with dated fixtures controlled by the suite.
2. All pre-existing suites remain green. **The baseline is now genuinely
   zero failures** (EP13H2 repaired the clock-dependent `CalendarPage`
   suite), so any failing test at this gate is a real regression to fix —
   the "report, don't absorb" escape hatch no longer has a standing
   exception to point at.
3. The parent index exists with per-child evidence links **for every child
   including EP13H2 and EP13N**, and carries the TR-E13-14 record produced
   by this story's own combined manual a11y pass — **performed here, not
   merely collected**: five children (EP13D, EP13E, EP13H, EP13I, EP13K)
   each deferred it, and an empty slot ×5 is not evidence. Per D-M1 the
   record separates automated checks (`Executed`, with axe output and the
   keyboard/focus assertions) from the user-run screen-reader and
   reduced-motion checklist (`Not executed — user instructions` until signed).
4. Flex, absorption and micro-start journeys match the D13-4 (option b) and
   D13-13/D-I8 rulings as landed.

## Tests (TR-E13-13)

The journeys **are** the tests; journey (7) carries the EP13E information-
architecture assertions (redirects, nav entries, no count-led surface).

## Technical notes

- **Inspected (2026-11-14):** EP09's self-contained harness per code baseline
  (`global-setup.ts`, throwaway `*_e2e_test` DB, API :4100 / web :3100);
  existing specs `study-plan.spec.ts`, `catch-up.spec.ts`,
  `study-sessions.spec.ts` as fixture/pattern sources.
- Journey (2) needs a planned session dated before "today": create it via
  the API with an earlier window (the save endpoint accepts windows starting
  up to today−6, D06-23) rather than clock-mocking the stack.

### Review note (2026-11-15)

Two changes. First, the D13-4 conditional is gone: the ruling landed and
EP13G/EP13H shipped, so the flex journeys are ordinary scope and EP13M-AC4 no
longer offers an N/A escape.

Second, and more important: **the manual accessibility pass is now this
story's work, not its filing cabinet.** Five children deferred TR-E13-14 to
"a recorded manual pass" that no environment in the delivery chain could
execute; collecting five absences would hand the combined review an evidence
gap at the last gate. Doing one pass here across the whole surface set is
cheaper than five, catches cross-surface issues (focus order between the
what-now card, momentum and the timer) that per-story passes would miss, and
is the honest reading of "collected".

A warning for whoever implements this story: a clock-dependent E2E fixture
is exactly what broke `CalendarPage` for four stories (EP13H2's diagnosis).
Dated fixtures here must be derived from the suite's own controlled "today",
never from a hard-coded calendar week.

### Decisions

| ID | Options considered | Recommended | Why | Ruling |
|---|---|---|---|---|
| D-M1 ▲ (refines TR-E13-14) | How the combined manual accessibility pass is executed: (a) the implementing agent runs automated checks only (axe-core + scripted keyboard traversal in the E2E suite) and records them as the pass; (b) the user performs the whole pass from a checklist the story provides; (c) **both** — automated axe + keyboard/focus-order assertions in the suite recorded as `Executed`, plus a user-run checklist for screen-reader path and reduced-motion recorded as `Not executed — user instructions` until the user signs it | **(c)** | Agents cannot hear a screen reader; (a) alone would relabel an automated check as human evidence, (b) alone wastes what automation catches reliably (contrast, names, roles, focus order). Material: TR-E13-14 is human evidence five stories deferred here. | Proposed |
| D-M2 | Controlling "today" for dated journeys: (a) create past/future planned sessions through the API with earlier windows (save accepts windows from today−6, D06-23); (b) mock the stack clock | **(a)** | A clock-dependent fixture is exactly what broke `CalendarPage` for four stories (EP13H2); (a) uses only public behavior and stays deterministic. | Proposed |
| D-M3 | Suite shape: (a) one spec file, `test.describe.serial`, one fresh test user per journey, shared helpers in `e2e/helpers.ts`; (b) seven spec files; (c) one file, fully parallel with a shared user | **(a)** | Journeys share setup patterns but must not share state; serial-in-one-file keeps the harness cost to one browser context and reads as the epic's story. (c) would race on the one-open-session rule. | Proposed |
| D-M4 | Parent index diff ranges: (a) hand-written table from `git log --oneline <baseline>..HEAD -- <paths>` per child, baseline = commit before EP13A (`120d960`'s parent); (b) a generator script | **(a)** | 16 rows, once; a script would outlive its one use. Record the exact git commands in the index so the reviewer can re-derive. | Proposed |
| D-M5 | Regression policy at this gate: (a) any failing pre-existing test is a regression to fix in this story; (b) report-don't-absorb (EP08 F-02 precedent) | **(a)** | EP13H2 made the baseline genuinely zero failures, so the standing exception is gone (EP13M-AC2). A failure that is provably outside EP13's change set is reported as a finding with evidence, not silently fixed. | Proposed |
| D-M6 | DoD-11 for the parent unit: (a) this story prepares nothing for it — the reviewer writes "How to verify by hand" inside `review.md`; (b) this story drafts the manual steps for the reviewer | **(a)** | DoD-11 is reviewer-owned by design (independence); the D-M1 user checklist is TR-E13-14 evidence, not the review's section. | Proposed |

Rows are `D-M<n>`; one that refines or overrides a register row says `(refines D13-<n>)` / `(overrides D13-<n>)`. ▲ = material: the implementer stops and asks if still `Proposed`; other rows become `Ratified by default` at implementation start.

## Definition of Done

1. Functional criteria pass. 2. N/A. 3. Fixtures scoped per test user.
4. N/A. 5–7. N/A as new UI (verification story); the TR-E13-14 combined manual a11y pass is performed and recorded here (EP13M-AC3).
8. Automated E2E (TR-E13-13). 9. Parent index.
10–11. This story readies the combined EP13 parent review; the reviewer writes
   DoD-11's "How to verify by hand" section inside `review.md` (D-M6).

## Sizing

- **Outcome:** the epic's adaptive loop is proven end to end on the real stack, and the parent index readies the combined review.
- **Actual at closeout:** tbd (from `artifacts/efficiency.md`).
- **Model tier:** default (implementer).
- **Production files:** `apps/web/e2e/adaptive-scheduling.spec.ts` (new); `./artifacts/EP13/implementation.md` (new).
- **Test files:** the spec itself.
- **Minimal start context:** this story, EP13 README queue (evidence links), `contracts.md`, the existing E2E specs `study-plan.spec.ts`, `catch-up.spec.ts`, `study-sessions.spec.ts`, `helpers.ts`, `global-setup.ts`.
- **Verification:** `pnpm test:e2e` (full), `pnpm test`, lint.
- **Dependencies:** EP13A–EP13N (incl. EP13H2). Final child before the combined review.
- **Exclusions:** new behavior; unrelated pre-existing failures.

