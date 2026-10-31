# EP12 Combined Parent Review — Tech Debt Cleanup

**Review unit:** EP12 (parent) — children EP12A, EP12B, EP12C
**Review mode:** Implementation review (combined parent review)
**Review date:** 2026-10-31
**Reviewed state:** working tree at HEAD `e124c95` (autopilot-recorded head `46f7cae` plus subsequent reconcile/integration commits; no uncommitted code changes expected)
**Reviewed paths:**
- `docs/stories/EP12/` (README, EP12A/B/C stories, artifacts)
- `apps/api/src/common/lib/civil-date.ts`, `calendar-date.ts` and specs
- `apps/api/src/modules/calendar/calendar.service.ts`, `apps/api/src/modules/study-plans/study-plans.service.ts`
- `apps/api/src/domain/study-planning/scheduler.ts`, `types.ts`
- `apps/web/src/shared/ui/Dialog.tsx` + `Dialog.test.tsx`
- `apps/web/src/features/**` migrated dialogs (11 in scope)
- `apps/web/src/shared/api/rtkBaseQuery.ts`
- `apps/web/src/features/calendar/api/calendarApi.ts`, `apps/web/src/features/assignments/api/assignmentsApi.ts` and tests
- `apps/web/src/entities/calendar/api/calendarApi.ts`, `apps/web/src/entities/assignment/api/assignmentApi.ts`

**Limitations:** This runtime has no shell/git execution available to the reviewer. Automated gates are cited from implementer-recorded evidence (child implementation records) plus direct code inspection; reviewer did not re-execute them. DoD 8/10 results reflect recorded implementer runs and code inspection, not a fresh reviewer run.

---

## Scope and inventory

All three children implemented and integrated; parent index present at `docs/stories/EP12/artifacts/EP12/implementation.md`. Combined Git range `d3fb887..e124c95` (first implementation commit `6b28649`). Child evidence:

| Child | Layer | Commits | Recorded gates |
|---|---|---|---|
| EP12A | Backend | `6b28649` | API test 40 suites / 883 passed, 436 skipped; lint/typecheck/build/format clean |
| EP12B | Frontend | `950dfc1`, `4ccb528`, `e7f9378`, `ebe8b15`, `6f4788c`, `2eab452` | web test 1094 passed; lint/typecheck/build clean |
| EP12C | Frontend | `2fd6264` | web test 1092 passed; lint/typecheck/build clean |

---

## Acceptance criteria results

### EP12A — Consolidate IANA/time-zone date conversion

| AC | Result | Evidence |
|---|---|---|
| AC-12A-1 `zoneParts` single seam (forward) | **Satisfied** | `civil-date.ts:47-64` single export; `toCivilDate` delegates (`:75`); both services import (`calendar.service.ts:4-10`, `study-plans.service.ts:6-12`); busy/session bucketing uses `zoneParts`. |
| AC-12A-2 `wallClockToInstant` seam, `tzOffsetMs` private | **Satisfied** | `civil-date.ts:100-112` exported; `tzOffsetMs` module-private (`:84-90`, not exported); calendar wrappers `calendar.service.ts:47-52`; study-plans `:787-788` call it directly. |
| AC-12A-3 `addDays`/`dayOfWeekOf` in `calendar-date.ts` | **Satisfied** | `calendar-date.ts:48-61`; both services import from `calendar-date`. |
| AC-12A-4 private copies deleted | **Satisfied** | Grep for the seven private function declarations in both services returns none; imports swapped. |
| AC-12A-5 no behavior change | **Satisfied (recorded)** | Existing calendar/study-plans pins unmodified (`calendar.service.spec.ts:80/:103`, `study-plans.service.spec.ts:448`); recorded API suite green (883 passed). |
| AC-12A-6 new module guards | **Satisfied** | `civil-date.spec.ts` T-12A-1…T-12A-5; `calendar-date.spec.ts` T-12A-7/T-12A-8; T-12A-6 (DST spanning) intentionally pinned by unmodified `calendar.service.spec.ts:80` (by design, F-12A-5). |

### EP12B — Adopt shared `Dialog` primitive

| AC | Result | Evidence |
|---|---|---|
| AC-12B-1 `busy` prop | **Satisfied** | `Dialog.tsx:15-18,40,46,58-62,69-74,133-136,145-149,157`; Escape/backdrop inert while busy; focus held on container; `aria-busy` set when provided; backwards compatible. |
| AC-12B-2 single implementation | **Satisfied** | All 11 in-scope dialogs import `Dialog` (`features/...`); only remaining `role="dialog"` in `features` is a comment; hand-rolled `FOCUSABLE_SELECTOR`/overflow traps remain only in out-of-scope action menus. |
| AC-12B-3 per-dialog semantics preserved | **Satisfied (inspection)** | Delete dialogs wire `busy={isDeleting}`, keep `role="alert"` error blocks, retain Delete `aria-label`; form dialogs keep `<form>` in children with `busy={isSubmitting}` and `className="max-w-lg max-h-[90vh] overflow-y-auto"`; `AvailabilitySlotForm` maps Escape/backdrop to `requestClose()` via `onClose`; dynamic titles flow through `title`; success-skip restore preserved via conditional `closedViaOnCloseRef`. |
| AC-12B-4 out-of-scope untouched | **Satisfied** | Header drawer (`Header.tsx:609`), onboarding shell, action menus retain their own Escape handling; grep confirms only those. |
| AC-12B-5 existing tests | **Satisfied (recorded)** | Recorded web suite 1094 passed; spec files updated for shell/markup waits only. |
| AC-12B-6 new guards | **Satisfied** | `Dialog.test.tsx` T-12B-1…T-12B-4; `DeleteAssignmentDialog.test.tsx` "returns focus to the trigger element on close" (T-12B-5). |
| AC-12B-7 clean gates | **Satisfied (recorded)** | lint `--max-warnings 0`, typecheck, build clean. |

### EP12C — Unify web API clients per domain

| AC | Result | Evidence |
|---|---|---|
| AC-12C-1 calendar one client | **Satisfied** | `features/calendar/api/calendarApi.ts` no longer states URL/params; delegates via `entityBaseQuery(listCalendarEvents)`; literal `/calendar/events` in `features/` only in comments/tests, not contract. |
| AC-12C-2 assignments one client | **Satisfied** | `features/assignments/api/assignmentsApi.ts` delegates to `listAssignments`; URL/whitelist owned by entity module. |
| AC-12C-3 shared delegating baseQuery | **Satisfied** | `rtkBaseQuery.ts:69-87` `entityBaseQuery<Arg, Result>` in existing file; identical error mapping `{ message, code: String(status) }` from `failure.response?.status`. |
| AC-12C-4 callers untouched | **Satisfied (inspection)** | Only the two feature slices, `rtkBaseQuery.ts`, and their spec files touched; entity modules, DashboardPage, pages, store, providers unchanged (per record; code inspection confirms no edits to entity modules). |
| AC-12C-5 existing suites green in intent | **Satisfied (recorded)** | Both RTK slice suites pass against real adapter; entity suites unchanged. |
| AC-12C-6 new guards | **Satisfied** | T-12C-1 (assignments delegated path, no query string, `q` trimmed), T-12C-2 (calendar 400 error shape), T-12C-3 (calendar 404 error shape). |
| AC-12C-7 clean gates | **Satisfied (recorded)** | test/lint/typecheck/build clean. |

---

## Definition of Done audit

Applicable DoD items per README: 1, 3, 8, 10 (EP12A); 1, 5, 6, 8 (EP12B); 1, 4, 8 (EP12C); 10 (parent), 11 (reviewer).

| DoD | Applicability | Result | Evidence |
|---|---|---|---|
| 1 Functional criteria (no behavior change) | All | **PASS** | Refactor-only; existing suites green (recorded); code inspection confirms contract preservation. |
| 2 Invalid-input validation | N/A | Not applicable | No new input. |
| 3 Student data scoping | EP12A | **PASS** | Ownership helpers untouched; calendar/study-plans behavior identical; `assertAffected`/`RESOURCE_NOT_FOUND` paths unchanged (study-plans save ownership check at `:694-704` intact). |
| 4 Actionable API errors | EP12C | **PASS** | Error mapping preserved exactly (`{ message, code: String(status) }`); T-12C-2/3 pin 400/404. |
| 5 Loading/empty/error states | EP12B | **PASS** | Dialog shell adoption preserves states; primitive provides backdrop/animation; no state logic changed. |
| 6 Keyboard accessibility | EP12B | **PASS** | Focus trap, Escape, backdrop, scroll lock, focus restore via primitive; `busy` holds focus + `aria-busy`; Dialog.test + migrated specs pass (recorded). |
| 7 Responsive layouts | N/A | Not applicable | No layout change. |
| 8 Automated tests | All | **PASS (recorded)** | EP12A 40 suites/883 passed; EP12B 1094 passed; EP12C 1092 passed; lint/typecheck/build clean for each. Reviewer did not re-execute (no shell). |
| 9 API/migration docs | N/A | Not applicable | No API/migration change. |
| 10 Integrated review | EP12 parent | **PASS** | This combined parent review covers all three children and integration. |
| 11 Reviewer walkthrough | EP12 parent | **PASS (this review)** | `walkthrough.md` saved beside this report. |

---

## Findings

No blocker or should-fix findings.

### Polish

- **P-001 (optional): pointer-cancel focus restore not explicitly covered.** The primitive restores focus to the trigger only when close is initiated via the primitive's own path (Escape/backdrop), tracked by `closedViaOnCloseRef` (`Dialog.tsx`). Cancel buttons in migrated dialogs call `onCancel` directly, so a pointer-click Cancel does not set the ref and focus is not restored to the trigger. Keyboard cancel (Escape) restores focus and is covered by `DeleteAssignmentDialog.test.tsx` "returns focus to the trigger element on close". The implementer documented this as the deliberate approach to preserve success-skip restore. Impact: minor a11y polish for pointer users; no failing test. Closure condition: either extend `closedViaOnCloseRef` handling to dialog-level close signals, or add a test asserting pointer-cancel restores focus; not required for this refactor.

- **P-002 (evidence): automated gates not re-executed by reviewer.** No shell/git execution was available in this review runtime. Gate results are implementer-recorded (child implementation records) plus code inspection. Closure condition: coordinator or CI re-runs `pnpm --filter @studypilot/api test/lint/typecheck/build` and `pnpm --filter @studypilot/web test/lint/typecheck/build` on HEAD `e124c95` if independent confirmation is desired.

---

## Verdict

**PASS.** EP12 meets the DoD and all acceptance criteria for EP12A, EP12B and EP12C, with no open blocker or should-fix findings (polish only). The combined refactor leaves the existing test suite green by recorded evidence and introduces no behavior, API or schema change.
final