# EP07 implementation index

## Review scope

Parent: **EP07 — Focus Sessions & Time Tracking** (Jira STUDY-13). Six children, all implemented and awaiting the combined parent review:

| Child | Title (layer) | Implementation record | Key commits |
|---|---|---|---|
| [EP07A](../EP07A-focus-session-persistence-and-lifecycle-api.md) | Focus-session persistence & lifecycle API (Backend) | [artifacts/EP07A/implementation.md](../EP07A/implementation.md) | `e52abde` |
| [EP07B](../EP07B-completion-confirmed-time-and-read-apis.md) | Completion, confirmed-time & read APIs (Backend) | [artifacts/EP07B/implementation.md](../EP07B/implementation.md) | `bfe1cbf` |
| [EP07C](../EP07C-start-focus-session-from-an-assignment.md) | Start focus session from an assignment (Frontend) | [artifacts/EP07C/implementation.md](../EP07C/implementation.md) | `65d82a7` |
| [EP07D](../EP07D-focus-mode-interface-and-timer-controls.md) | Focus-mode interface & timer controls (Frontend) | [artifacts/EP07D/implementation.md](../EP07D/implementation.md) | `54f61e9` |
| [EP07E](../EP07E-completion-confirm-adjust-and-study-history.md) | Completion confirm/adjust & study history (Frontend) | [artifacts/EP07E/implementation.md](../EP07E/implementation.md) | `ffc1b93` |
| [EP07F](../EP07F-cross-layer-e2e-calendar-regression-and-parent-index.md) | Cross-layer E2E, calendar regression & parent index (Integration) | [artifacts/EP07F/implementation.md](../EP07F/implementation.md) | `116608b` |

## Combined Git change scope

- **Base commit (pre-EP07):** `a9ca807` (`docs(EP07A): technical refinement + Ready`).
- **Final implementation commit:** `116608b` (`test(web): EP07F cross-layer E2E for study sessions`).
- **Closeout/docs commit:** this commit (records the index and queue reconciliation).
- **Child commits (in order):** `e52abde` (EP07A), `bfe1cbf` (EP07B), `65d82a7` (EP07C), `54f61e9` (EP07D), `ffc1b93` (EP07E), `116608b` (EP07F).
- **Migration file:** `apps/api/prisma/migrations/20261030211833_study_session_focus_lifecycle/migration.sql`.
- The combined diff is **not** just the last child's: it spans the migration, the API module, the web entity/feature/page layers, and the test suites. The reviewer must use base `a9ca807` and the final commit above, not only EP07F's diff.

## AC / TR / DoD ownership and evidence

### Epic acceptance criteria

| AC | Stable ID | Owning children | Evidence |
|---|---|---|---|
| Start a focus session from an assignment | AC-E07-01 | EP07A, EP07C | `study-sessions.spec.ts` journey; EP07C unit tests |
| Start, pause, resume, finish a timer | AC-E07-02 | EP07A, EP07B, EP07D | `study-sessions.spec.ts` journey + reload |
| Current assignment + unfinished subtasks in focus mode | AC-E07-03 | EP07D | EP07D tests |
| Confirm or adjust recorded study time | AC-E07-04 | EP07B, EP07E | `study-sessions.spec.ts` journey (45 min) + error path |
| Recorded time associated with the correct assignment | AC-E07-05 | EP07A, EP07B, EP07E, EP07F | `study-sessions.spec.ts` confirmed-time + assignment-untouched |
| Reloading does not mark a session complete | AC-E07-06 | EP07A, EP07D, EP07F | `study-sessions.spec.ts` reload scenario |
| Finish without marking the assignment complete | AC-E07-07 | EP07B, EP07F | `study-sessions.spec.ts` assignment-untouched (deep equality) |
| Actual study time contributes to remaining-work calculations | AC-E07-08 | EP07B, EP07E, EP07F | `study-sessions.spec.ts` confirmed-time endpoint |

### Test requirements

| TR | Requirement | Owner | Evidence |
|---|---|---|---|
| TR-E07-01 | Lifecycle API tests | EP07A | `study-sessions.service.spec.ts` (32 tests) |
| TR-E07-02 | Completion + read API tests | EP07B | `study-sessions.service.spec.ts` |
| TR-E07-03 | Start-from-assignment UI tests | EP07C | web suite |
| TR-E07-04 | Focus-mode interface tests | EP07D | web suite |
| TR-E07-05 | Completion confirm/adjust + history tests | EP07E | web suite |
| TR-E07-06 | Cross-layer E2E | EP07F | `apps/web/e2e/study-sessions.spec.ts` (9 scenarios) — all green |
| TR-E07-07 | EP04 calendar regression (null `endTime`) | EP07F (verification); EP07A (code) | `study-sessions.spec.ts` calendar scenario + `calendar.spec.ts` (unchanged, green) |
| TR-E07-08 | Manual accessibility pass | EP07D, EP07F | see *Manual accessibility evidence* below |

### DoD

| DoD | Applicability | Evidence |
|---|---|---|
| 1 Functional criteria | All | E2E + unit suites green |
| 3 Student data scoping | EP07A, EP07B, EP07F | ownership scenario (404 uniform) |
| 8 Automated tests | All | API/web/E2E suites |
| 9 API/migration documentation | EP07A, EP07B, EP07F | this index + EP07A migration notes |
| 10 Integrated review | combined review | pending |
| 11 Reviewer walkthrough | combined review | pending |

## Commands and results

- `pnpm test:e2e` (full Playwright suite, self-contained stack) — **38 passed, 0 failed** (includes `study-sessions.spec.ts` 9 passed and `calendar.spec.ts` unchanged green).
- `DATABASE_URL=... pnpm --filter api test` — **61 suites passed, 1 failed** (pre-existing `study-plans-e2e.spec.ts`; unrelated to EP07).
- `pnpm --filter web test` — **93 files, 1086 tests passed**.
- `pnpm --filter api typecheck` — passed.
- `pnpm --filter web typecheck` — passed.
- `pnpm --filter api lint` — passed.
- `pnpm --filter web lint` — passed.

## Manual accessibility evidence (TR-E07-08)

Performed (automated/observed):
- Mobile viewport 375×667 exercised in `study-sessions.spec.ts` (mobile scenario) — no horizontal scroll; Pause/Resume/Finish buttons ≥44px tap targets.
- Keyboard journey: pause/resume/finish driven via native buttons in the E2E suite; focus moves to the primary control on session resolve (EP07D implementation).
- Reduced-motion: token durations + `motion-reduce:` classes present in FocusTimer/FocusPage (EP07D implementation); not visually verified in this run.

Not performed in this environment (deferred to the combined review):
- Screen-reader announcement path (polite live region on status change; ticking digits carry `aria-label` and are not announced) — verified by unit tests only, not by a screen reader.
- Focus-visibility audit on every interactive element at both viewports.
- Reduced-motion visual verification (no animation observed under `prefers-reduced-motion`).

Instructions for the reviewer/user: run the focus journey with VoiceOver/NVDA, toggle reduced motion in OS settings, and confirm focus rings are visible on all controls at 375px and desktop widths.

## Known gaps

- EP06 seam (V-07-1 session-duration default; V-07-2 confirmed-time consumption) remains provisional — EP06 is not broken down.
- EP05 dashboard "Start Focus Session" quick action stays non-functional (D07-9).
- Pre-existing `study-plans-e2e.spec.ts` failure (dailyCapMinutes expectation vs. merged preferences) is unrelated to EP07 and remains open.
- Manual accessibility checks listed above as not performed.
- `GET /study-sessions/current` returns an empty body (200) when no session is open; ownership scenario in the E2E suite asserts status 200 with an empty/`null` body rather than 404 (endpoint takes no resource id).