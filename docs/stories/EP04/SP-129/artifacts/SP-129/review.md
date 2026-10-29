# SP-129 parent implementation review — pass 3 (re-review)

- **Date:** 2026-10-29
- **Pass:** 3 — re-review after pass 2 (Pass) to independently verify closure and scope bookkeeping.
- **Verdict:** **Passes — SP-129 meets the shared DoD and acceptance criteria.** No open blocker or should-fix finding; R129-001…R129-005 remain resolved, and R129-006 (stale child status line) is resolved in this pass. Only optional polish was ever raised, and it is also resolved.
- **Review unit:** SP-129, including its only implementation child SP-129A and the parent implementation index. No individual-child review is required.
- **State inspected:** working tree at HEAD `291f892` (docs closeout commit; code commit `91ba4dc`). `.git/HEAD` → `refs/heads/main` → `291f89261506c3f714a8df645884bb14ee776ab1`. No code/test/migration changes since pass 2; the only edits in this pass are the reviewer-owned docs sync (child status line, correction-log entry) described below.
- **Declared combined scope (unchanged from pass 2):** parent index `implementation.md` lists base `89df8f2`, refinement `7eb8b43`, checkpoint `e4e96d7`, original implementation `afd48ec`, closeout `d8da534`, fix `91ba4dc`, fix closeout `291f892`. All seven declared application/test paths plus the fix-pass edits were re-inspected; no new application/test files were added.
- **Canonical report:** `docs/stories/EP04/SP-129/artifacts/SP-129/review.md` (this file, replacing pass 2).
- **Walkthrough:** `docs/stories/EP04/SP-129/artifacts/SP-129/walkthrough.md` (unchanged from pass 2; reviewed state still HEAD `291f892`, code commit `91ba4dc`; verified present).

## Scope and limitations

Read the delivery-state contract, parent execution queue, review cadence, reviewer skill, source epic, shared DoD, parent story, SP-129A story, parent index, child implementation/checkpoint records, pass-1 and pass-2 reports, and the walkthrough. Re-inspected all changed application/test paths:

- `apps/web/src/features/calendar/ui/CalendarAgenda.tsx`
- `apps/web/src/features/calendar/ui/CalendarAgenda.test.tsx`
- `apps/web/src/features/calendar/ui/CalendarEventChip.tsx`
- `apps/web/src/pages/calendar/ui/CalendarPage.tsx`
- `apps/web/src/pages/calendar/ui/CalendarPage.test.tsx`
- `apps/web/e2e/calendar.spec.ts`
- `apps/web/src/entities/calendar/api/calendarApi.ts` (unchanged reuse)
- `apps/web/src/features/calendar/ui/WeekView.tsx`, `CalendarEventDetails.tsx` (unchanged reuse)

**Execution:** this session has no shell/browser tool. No command was executed by this reviewer. All gate results below are **reused recorded implementer results** (per the skill's evidence-reuse rule) whose tested code/configuration is unchanged at HEAD `291f892` (the fix-pass code commit is `91ba4dc`; `291f892` changed only docs). Provenance and original commands are preserved verbatim; no raw output was invented. Credential files were not read. No code, tests, tickets, queue fields or Git state were changed by this review except the passing-review docs sync and the two reviewer-owned documents.

## Prior findings — pass 1/2 → pass 3 disposition

| ID | Severity | Pass-3 status | Closure evidence |
|---|---|---|---|
| R129-001 | Should-fix | **Resolved** (unchanged) | `CalendarEventChip.tsx:12,49,75–79` adds `layout?: 'week' \| 'agenda'` (default `'week'`); `CalendarAgenda.tsx:40–44` passes `layout="agenda"`, rendering the time line above the title (`:77`); week layout keeps title above time (`:81–83`). Component tests assert DOM/text order in both layouts. |
| R129-002 | Should-fix | **Resolved** (unchanged) | `CalendarAgenda.test.tsx` "an entirely empty payload renders no day groups and no entries"; `CalendarPage.test.tsx` "an empty week at a narrow viewport shows the page empty state, not an agenda". |
| R129-003 | Should-fix / verification gate | **Resolved** (evidence added; final in-environment pass recorded) | `calendar.spec.ts` phone test asserts real `boundingBox()` height ≥ 44px at 375px; keyboard activation (focus + Enter opens the dialog); Escape closes and `toBeFocused()` returns to the entry; live viewport growth 768×1024 → 1280×720 flips to the week grid without reload. Seeded desktop test asserts the `Week view` list renders on desktop. Implementer-recorded run: 5/5 passed. |
| R129-004 | Should-fix | **Resolved** (unchanged) | `SP-129A-mobile-agenda-view.md:9` reads `Implemented — awaiting the SP-129 parent review (2026-10-29 fix pass…)`. No AC/decision/plan content changed. |
| R129-005 | Polish | **Resolved** (unchanged) | `CalendarPage.test.tsx` mock now uses the real `(type, callback)` signature; new "switches from the week view to the agenda after a live narrow resize" test wraps the change in `act(...)`. |
| R129-006 | Should-fix (docs) | **Resolved (this pass)** | `SP-129A-mobile-agenda-view.md:9` was still `Implemented — awaiting the SP-129 parent review` after pass 2 even though the queue row had advanced to `Reviewed`. Scoped status edit to `Reviewed (2026-10-29) — combined SP-129 parent review passed (pass 3…)`. No AC/decision/plan content changed. Queue row confirmed `Reviewed`. |

No new code-level findings were raised in pass 3. The pre-existing lint error in the e2e file (unused `mondayISO`) noted in pass 1 was also corrected in the fix pass and remains recorded.

## Acceptance-criteria assessment (pass 3)

Parent criteria P1–P7 (`SP-129-mobile-agenda-view.md:39–45`); child A1–A8 (`SP-129A-mobile-agenda-view.md:41–48`). All satisfied by inspection plus recorded implementer evidence; unchanged from pass 2.

| Criteria | Disposition | Evidence |
|---|---|---|
| P1 / A1: narrow agenda, date grouping, payload order | Satisfied | Page switch `CalendarPage.tsx:271–284`; `groupByDay:45–52` preserves input order; agenda `:20–46`; component assertions `CalendarAgenda.test.tsx:64–100`. Server sorting is the existing EP04 contract, not client re-sorting. |
| P2 / A2: same events exactly once | Satisfied | Both presentations receive identical props (`:272–284`); agenda filters only empty days and maps each day's array once (`:20–46`). Component assertions `:84–99`. No new filter or request. |
| P3 / A3: visible time/title/type without color | Satisfied (incl. fix) | Shared chip `:22–36,54–86` supplies type icon + text, title, time, completed text badge; accessible name `{label}: {title}, {time}`. Time-above-title implemented per D129A-03 (R129-001 closed). |
| P4 / A4: shared details, Escape, focus return | Satisfied (recorded) | Same `selectedEvent` and details instance, page `:288–293`; details `:42–49,51–76`; narrow test `:161–172`; e2e phone test asserts Enter-open + Escape + `toBeFocused()`. |
| A5: omit days with no events | Satisfied | Agenda `:21,25`; component test `:75–80`; empty-map test covers the wholly-empty case. |
| P5 / A6: 375px overflow/readability/tap targets | Satisfied (recorded) | Agenda width/min-width constraints `:23,29,38`; chip `:55,59–86` includes `max-sm:min-h-[44px]`. E2e asserts `scrollWidth <= clientWidth` and real `boundingBox()` height ≥ 44px at 375×667. |
| P6 / A7: loading/empty/error | Satisfied (recorded) | Shared page branches `:159–196,256–271` are viewport-independent per D129A-05. New narrow empty-page test covers the empty case at narrow widths. |
| P7 / A8: keyboard, focus, labelled groups | Satisfied (recorded) | Buttons + focus-ring classes in chip `:55,59`; labelled group/heading in agenda `:26–38`; label test `:118–130`; modal keyboard/focus handling `CalendarEventDetails:42–76`. E2e covers Enter/Escape/focus return at phone width. |
| Epic AC-E04-01 and AC-E04-08 | Satisfied | Existing week controls/data flow reused; textual type labels preserved in both layouts. Other epic ACs remain owned by SP-127/SP-128 and are not newly claimed in this unit. |

## Shared Definition of Done audit (pass 3)

Source: `docs/epics/README.md:26–50`. Results reflect inspection plus reused recorded implementer evidence at HEAD `291f892`.

| # | Result | Evidence / rationale |
|---|---|---|
| 1. Functional acceptance | **PASS** | All ACs satisfied (table above); R129-001 closed by inspection; interaction criteria supported by recorded e2e. |
| 2. Validation | **PASS — not newly applicable** | Presentational props only (`CalendarAgenda.tsx:5–10`); no new user input or API mutation; existing range request unchanged. |
| 3. Student data scoping | **PASS — scoped change inspection** | Agenda has no fetch, principal selector or persistence; same page request/map (`CalendarPage.tsx:87–99,146–148`) and entity client (`calendarApi.ts:25–31`) reused. No new Prisma query/endpoint in the declared scope. (Not a fresh audit of every predecessor backend query.) |
| 4. Actionable API errors | **PASS — inspected unchanged handling** | Existing message/retry branch and background error toast, page `:106–113,142–144,183–195`; no new request/error surface. |
| 5. Loading/empty/error states | **PASS (recorded)** | All branches present and viewport-independent per D129A-05 (`:159–196,256–271`); empty case now covered at narrow width (unit test + e2e). |
| 6. Keyboard accessibility | **PASS (recorded)** | Semantic buttons, focus tokens, labelled groups and modal keyboard/focus handling inspected; e2e covers Enter open, Escape close, focus return at phone width. |
| 7. Responsive layout | **PASS (recorded)** | E2e covers 375×667 (agenda), live resize to 768×1024 (week grid), and 1280×720 (week grid); entry height ≥ 44px asserted. |
| 8. Automated tests | **PASS (recorded)** | Scoped suite 26 tests (4 files) + full web suite 773; e2e 5/5. Empty-agenda obligation now covered (R129-002 closed). |
| 9. API/migration documentation | **PASS — not applicable** | No API/schema/migration changes in the implementation scope; records document frontend changes and deviations. |
| 10. Integrated development review | **PASS (recorded)** | Playwright self-contained stack (API on :4100, Vite on :3100, throwaway DB) ran 5/5 including the extended phone journey. Implementer-recorded; this reviewer did not perform a separate manual browser pass (no shell/browser tool in this session). |
| 11. Final reviewer walkthrough | **PASS — written and verified** | `walkthrough.md` saved beside this report; see below. |

No AI, native mobile, syllabus parsing, LMS, grades or flashcard scope was introduced.

## Verification ledger (reused recorded results)

All results are **implementer-executed** (not reviewer-executed), recorded in `../SP-129A/implementation.md` (fix-pass section) and `../SP-129A/checkpoint.md`. Code/configuration is unchanged at HEAD `291f892` (only docs changed since `91ba4dc`), so the reuse condition holds. No command was re-run by this reviewer.

| Command | Recorded cwd | Tested state | Exit code | Recorded result |
|---|---|---|---|---|
| `pnpm --filter web test -- src/features/calendar src/pages/calendar` | repo root | `91ba4dc` (fix-pass code) | 0 | 4 files, 26 tests passed (21 → 26; +5 new) |
| `pnpm --filter web test` | repo root | `91ba4dc` | 0 | 60 files, 773 tests passed (768 → 773) |
| `pnpm --filter web typecheck` | repo root | `91ba4dc` | 0 | clean |
| `pnpm --filter web lint` | repo root | `91ba4dc` | 0 | clean — including the previously erroring e2e file (`mondayISO` fixed) |
| `pnpm --filter @studypilot/web exec playwright test calendar.spec.ts` | `apps/web` | `91ba4dc` | 0 | 5 passed (7.3s); self-contained throwaway DB dropped in teardown. One intermediate failed run (`weekList` undefined, my own e2e edit) is honestly recorded, then fixed, then green. |

**Reviewer execution:** none (no shell/browser tool available this session). Missing exit codes are not present — all five are recorded as 0. The results above are recorded implementer evidence, cited with provenance and not treated as independent execution.

## Passing-review docs sync (performed on this passing verdict)

Performed by this reviewer, scoped to the delivery home:

1. **Correction log** (`SP-129/README.md`): appended R129-006 (stale child status line) with original claim, consequence, disposition/closure evidence and a reference to this report. R129-001…R129-005 entries retained verbatim.
2. **Child status line** (`SP-129A-mobile-agenda-view.md:9`): refreshed from `Implemented — awaiting the SP-129 parent review (2026-10-29 fix pass…)` to `Reviewed (2026-10-29) — combined SP-129 parent review passed (pass 3…)`. No AC/decision/plan content changed.
3. **Execution queue**: SP-129A row remains `Reviewed` (pass 2 sync); `Active substory`/`Next substory` remain `None` (fix pass complete; parent review passed; no child auto-started). Links to this report and `walkthrough.md` recorded in the row.
4. **Parent status line** (`SP-129-mobile-agenda-view.md`): already refreshed in pass 2 to `Implemented — SP-129A reviewed and passed (2026-10-29); parent DoD 10–11 satisfied`. Re-verified accurate; no further edit.
5. **Walkthrough**: `walkthrough.md` verified present and scoped to HEAD `291f892`/code `91ba4dc`; no code change since pass 2, so no refresh required. Re-verified links and execution labels.

No edits were made to story ACs, plans, code, tests, migrations, another story's docs, or the prior report's content. The EP04 epic-level README still lists SP-129A as `Needs refinement` (line 6/17/29); that file is planner-owned and outside this review's sync scope — flagged for the planner rather than edited here (see handoff).

## Handoff

- **Findings:** none open. R129-001…R129-006 all resolved; R129-005's polish item is also resolved.
- **Remaining (outside this review's authority):** downstream epic work (EP05 dashboard) is not auto-started; the EP04 README epic-level lines still mention SP-129A (and SP-128B) as `Needs refinement` and are planner-owned — flagged for the planner rather than edited here.
- **Git:** this reviewer saved `review.md` and verified `walkthrough.md`, and performed the passing docs sync (queue/status/correction-log updates). No shell is available in this session, so the scoped commit of `review.md`, `walkthrough.md`, and the queue/status/correction-log updates is deferred to the coordinator; no code/test/ticket edits were made.

**Verdict: Pass — SP-129 meets the shared DoD and acceptance criteria. R129-001…R129-006 are resolved; no open blocker or should-fix remains. Parent DoD 10–11 are satisfied by recorded integrated evidence and the saved walkthrough.**