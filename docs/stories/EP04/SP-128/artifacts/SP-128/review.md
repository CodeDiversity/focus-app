# SP-128 Combined Parent Implementation Review — Availability & Unavailable Blocks

**Review date:** 2026-10-28
**Review pass:** 1 (the single combined SP-128 parent review per the review-unit gate)
**Review mode:** Implementation review (final parent unit)
**Reviewer:** studypilot-reviewer (independent of both implementer passes)

## Reviewed state

| Item | Value | Verification provenance |
|---|---|---|
| Baseline (before SP-128A) | `9bf65f7` | HEAD reflog (`.git/logs/HEAD`), reviewer-read |
| SP-128A feature commit | `35ed47d` ("feat(api): SP-128A availability-slots CRUD API") | HEAD reflog, reviewer-read |
| SP-128B refined + feature commit | ui-refiner `24978c7`; feature `a13cd31` (amended "feat(web): SP-128B availability settings UI") | HEAD reflog, reviewer-read |
| HEAD at review | `cb6f9c1` ("docs(SP-128B): close the checkpoint record after the scoped commit") | HEAD reflog, reviewer-read |
| Working tree | Not independently verifiable — review runtime has no shell. Last recorded state: clean at `cb6f9c1` (SP-128B checkpoint) | implementer-recorded |

## Scope

- **Parent:** SP-128 (`docs/stories/EP04/SP-128/`) — coordination record.
- **Children (complete inventory):** [SP-128A](../../SP-128A-availability-slots-api.md) (backend CRUD API), [SP-128B](../../SP-128B-availability-settings-ui.md) (the `/availability` page). No other descendants exist in the SP-128 breakdown.
- **Integration:** SP-128B consuming the SP-128A contract as written (the layer boundary the split was built on); verified end to end via the consumer→API→SP-127A-read-model e2e journey.
- **Reviewed paths:** implementation index [`artifacts/SP-128/implementation.md`](./implementation.md), [SP-128A implementation record](../SP-128A/implementation.md) + [checkpoint](../SP-128A/checkpoint.md), [SP-128B implementation record](../SP-128B/implementation.md) + [checkpoint](../SP-128B/checkpoint.md), both child story tickets, the [EP04 shared API contract](../../../EP04/README.md#shared-api-contract), the shared DoD (`docs/epics/README.md`), and the actual code: `apps/api/src/modules/availability/*` (8 files), `apps/api/src/app.module.ts`, `apps/api/src/test/test-http.ts`, `apps/api/prisma/schema.prisma` (`AvailabilitySlot`, lines 292–305), `apps/web/src/entities/availability/*`, `apps/web/src/features/availability/ui/*`, `apps/web/src/pages/availability/ui/*`, `apps/web/src/app/App.tsx`, `apps/web/src/widgets/header/ui/Header.tsx`, `apps/web/e2e/calendar.spec.ts`, `apps/api/src/common/ownership/ownership.ts`.

## Limitations (disclosed)

- **This review runtime has no shell/terminal tool.** The reviewer could not independently re-execute tests, typecheck, lint, Playwright, or `git status`. All executed-gate results below are **implementer-recorded evidence** cited with their recorded command and cwd from the child implementation records — provenance-cited recorded results, not reviewer executions, and not reconstructed output. Where the review says "confirmed by inspection," the reviewer read the code directly at HEAD.
- Commit hashes and ordering were independently verified by reading `.git/logs/HEAD` (reflog). No gate needed re-running: the recorded results are complete enough to decide every AC/DoD condition, and no code discrepancy was found during inspection (there is no "changed relevant code" trigger for a rerun).

## Acceptance criteria — parent story (SP-128, ACs 1–8)

| AC | Requirement | Outcome | Evidence |
|---|---|---|---|
| 1 | `GET /availability-slots` returns the student's slots ordered `dayOfWeek` then `startTime`, each with `dayOfWeek`, `startTime`, `endTime`, `isAvailable`, timestamps | **Satisfied** | `availability.service.ts` `list()` (lines 148–154): scoped `where: { userId }`, `orderBy [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]`; `toSlotResponse` (lines 35–45) emits exactly the 7 contract keys (ISO timestamps; `userId` never exposed). Order + shape pinned in the e2e lifecycle and data-scoping specs (recorded). |
| 2 | `POST` creates; `isAvailable` defaults `true`; `dayOfWeek` int 0–6; `HH:mm` 24h; `endTime` strictly after `startTime`, same day | **Satisfied** | `create()` (lines 168–197): omitted/null `isAvailable` → schema default `true` (schema line 299); `validateSlotTimes` (lines 87–113) enforces integer 0–6, `HH:mm` regex, hour/minute bounds, same-day strict-after (zero-padded string compare is safe). DTO decorators mirror it for the global pipe. |
| 3 | `PATCH` partially merges and validates the merged result; empty body 400; merged duplicate `(userId, dayOfWeek, startTime)` → 409 | **Satisfied** | `update()` (lines 214–286): scoped `findFirst` → merge onto stored → `validateSlotTimes` on merged → only provided fields written; at-least-one-field check (line 232); P2002 → 409 (lines 274–277). F-A-2's ordering (the at-least-one-field check runs after the ownership read, matching `courses-meetings.service.ts`) is pinned in the unit spec. |
| 4 | `DELETE` removes the slot, returns 204 | **Satisfied** | `delete()` (lines 296–301): scoped `deleteMany` + `assertAffected`; controller `@HttpCode(HttpStatus.NO_CONTENT)` (`availability.controller.ts` line 96). |
| 5 | Missing/foreign/malformed id → same uniform `404 Resource not found`; unauthenticated → 401; field validation → 400 with `errors` map, writes nothing | **Satisfied** | Uniform 404 from scoped misses (`RESOURCE_NOT_FOUND`, `ownership.ts` line 34) on PATCH (lines 223–225), DELETE (`assertAffected`), and P2025 (lines 278–282); `:id` is a plain string (malformed id simply misses — `id` is a text PK, schema line 293, no cast error); `throwFieldErrors` (lines 69–76) emits the `errors` map and nothing is written before it fires. 401 is the global `APP_GUARD` (no `@UseGuards` needed). |
| 6 | `/availability` page lists slots grouped by weekday, add/edit/remove, reflects API state after each change | **Satisfied** | `AvailabilitySlotList.tsx` (`GROUP_ORDER` = Monday→Sunday, presentation-only), `AvailabilityPage.tsx` single dialog mount (form + delete), every success path re-reads `GET /availability-slots` (`runFetch`) — no derived list state. |
| 7 | Empty/loading/error states + working retry; API field-level message next to the offending field | **Satisfied** | `AvailabilityPage.tsx` lines 149–211: loading card, `role="alert"` error card with "Try again" re-issuing the initial fetch, empty state with working add CTA + "View your week" link; `AvailabilitySlotForm.tsx` `handleApiError` maps the 400 `errors` map under the matching inputs (`dayOfWeek`/`startTime`/`endTime`), input preserved. |
| 8 | Keyboard-operable, visible focus, accessible names, readable contrast, mobile + desktop | **Satisfied** | Both dialogs: focus trap with recreate-per-render listener (`AvailabilitySlotForm.tsx` lines 185–233; `DeleteAvailabilitySlotDialog.tsx` lines 41–111), Escape closes/cancels, focus returns to the trigger; row actions named "Edit/Delete <kind> <label>" (`formatSlotName`, no a11y collision across kinds); kind distinction textual + icon, never color-only; `max-sm:min-h-[44px]` touch targets, 375px row stacking (`flex-col` → `sm:flex-row`). Contrast comes from the shipped design system. |

## Acceptance criteria — child attribution

- **SP-128A (8 ACs, story file lines 40–49):** all **satisfied** — the inspection above covers AC 1–8; the data-scoping and e2e specs (recorded 42/42 against the real database) exercise exactly each rule: B cannot read/patch/delete A's rows (uniform 404, rows byte-identical); B's list has only B's rows; per-student duplicate of the same window 201s; own duplicate 409s; empty PATCH 400; malformed/missing/foreign id always `Resource not found`; no token → 401 on all four routes; `userId` body field → field-level 400.
- **SP-128B (9 ACs, story file lines 43–53):** all **satisfied** — grouping (Monday-first presentation grouping of the API's Sunday-first order, rows in API order), both kinds addable through the dialog's radio pair, edit pre-fill (heading "Edit <full name>", kind default from `isAvailable`), delete confirmation with cancel-no-request, rejection handling (400 inline / 409 form alert / uniform 404-in-edit alert + cancel-refetch), states, live region (`role="status"`, kind-specific sentence + count line, empty at rest), keyboard dialogs, responsive stacking. D128B-1…13 verified verbatim in the code (labels, copy, defaults, failure map).

## Combined / integration behavior

- `SP-128B` sends exactly `{ dayOfWeek, startTime, endTime, isAvailable }` (`AvailabilitySlotForm.tsx` `onSubmit`) — no client re-shaping; the 409 message is rendered verbatim from the API; the 404 message text matches `RESOURCE_NOT_FOUND`.
- `apps/api/src/test/test-http.ts` (line 87) and `apps/api/src/app.module.ts` (line 31) both register `AvailabilityModule` — integration module parity holds.
- **E2E journey** (`apps/web/e2e/calendar.spec.ts` lines 94–137, `SP-128B` test): creates an available window (Monday 09:00–10:30) and a blocked time (Wed 20:00–22:00) through the real UI against the real API in the self-contained stack (throwaway DB), asserts the empty state, announcements, count line, and calendar rendering via the SP-127A read model. **Implementer-recorded: 4/4 calendar e2e tests passed** (plus 20 passed / 3 failed on the full e2e suite — see finding IR-001, pre-existing and out of SP-128 scope).

## DoD checklist (`docs/epics/README.md`, items 1–11)

| # | Condition | Result | Evidence |
|---|---|---|---|
| 1 | Functional acceptance criteria pass | **PASS** | AC tables above (inspection); recorded suites green. |
| 2 | Frontend/backend validation handles invalid input | **PASS** | Backend: DTO decorators + service re-check + cross-field rule (matrix in three specs, recorded 42/42 incl. `dayOfWeek` 7/−1/1.5, `"9:00"`, hour/minute bounds, midnight wrap, unknown fields, nothing written). Frontend: zod schema mirroring the rules (`slotFormSchema`), inline/409/404 mapping per D128B-8. |
| 3 | Academic data scoped to the authenticated student | **PASS** | `userId` in every where clause (`list`/`findFirst`/`update`/`deleteMany`); `@CurrentUser()` only; global pipe forbids a `userId` body field; data-scoping spec proves no existence oracle (inspection + recorded spec). |
| 4 | API errors produce actionable messages | **PASS** | 400 field map, 401 (guard), uniform 404, 409 conflict — all mapped to user-visible feedback on the page (form field errors, form alert, delete-dialog alert, toasts) (inspection + recorded tests). |
| 5 | Loading, empty, error states handled | **PASS** | `AvailabilityPage.tsx` three states + working retry + confirm-cancel-refetch; recorded page tests. |
| 6 | Keyboard accessibility | **PASS** | Focus trap, Escape, focus restore, safe-action-first delete dialog, arrow-key radio movement; recorded feature/page tests. |
| 7 | Responsive layouts desktop + mobile | **PASS** | Shared-system spacing, `max-sm:min-h-[44px]`, 375px row/page stacking (D128B-13); recorded class-level + e2e browser run; no dedicated viewport-matrix screenshot test exists — accepted on the recorded pattern-parity + real-browser journey evidence. |
| 8 | Business rules have automated tests | **PASS** | SP-128A: unit (mocked Prisma) + data-scoping + e2e-over-real-HTTP specs — recorded 42/42, zero skips, with `DATABASE_URL` via the repo's `dotenv` pattern; full API unit suite recorded 698 passed. SP-128B: entity client, label helper, form, delete dialog, page — recorded 56/56; full web suite recorded 760/760; calendar e2e journey recorded 4/4. Spec files verified present with the claimed coverage by inspection. |
| 9 | API changes and migrations documented | **PASS** | The implemented request/response shape matches the [EP04 shared API contract](../../../EP04/README.md#shared-api-contract) verbatim (verified line-by-line); no migration (schema untouched, D404-5). |
| 10 | Reviewed in an integrated development environment | **PASS** | Implementer-executed Playwright journey over the integrated self-contained stack (web + API + real Postgres), recorded 4/4, including the SP-128B→SP-127A read-model assertions; combined with this review's independent code inspection of every judgment. |
| 11 | Reviewer walkthrough saved before completion | **PASS (this pass)** | [`walkthrough.md`](./walkthrough.md) saved beside this report in the same pass; both documents verified written. |

## Findings

| ID | Severity | Finding | Files / lines | Consequence | Suggested correction / owner | Closure condition |
|---|---|---|---|---|---|---|
| IR-001 | Routed should-fix — **outside SP-128 scope** (not counted against this verdict; tracked so it is not lost) | Three course tests in `apps/web/e2e/semesters-courses.spec.ts` (~lines 107, 145, 192) time out clicking direct `Archive ${name}`-style buttons that no longer exist in the re-designed courses list (`Actions for ${name}` menu buttons) | `apps/web/e2e/semesters-courses.spec.ts` | The full e2e suite reports 20 passed / 3 failed; the spec lags the SP-126 UI redesign (test drift, not an app defect) | Refresh the courses spec to the menu-button hierarchy, or a small story owning that update — owner: planner/coordinator (EP02/SP-126 scope). Implementer evidence (F-B-4): identical 3 failures reproduced at baseline commit `24978c7` in a clean throwaway worktree, i.e. pre-existing, not introduced by SP-128 | Tests green; spec matches the shipped UI |
| IR-002 | Polish (optional, environment/latent) | `apps/api/tsconfig.json` excludes `dist/` but not `dist-test/`; a stale gitignored `dist-test/` build output can break `pnpm --filter api typecheck` for the whole API (F-A-3 residual) | `apps/api/tsconfig.json`, `apps/api/dist-test/` (gitignored) | Wasted debugging time when stale e2e build output accumulates on macOS; no committed-file effect | Add `dist-test` to the base tsconfig `exclude` — owner: planner/implementer (next touching API build config); nothing to commit for SP-128 | typecheck passes with a stale `dist-test/` present |

No blocker or should-fix finding **within the SP-128 review unit**. Child closing dispositions (F-A-1…A-4, F-B-1…B-3, F-B-5) were independently checked against the code: the design choice (F-B-1) is coherent with D128B-2's page-header CTA and is tested at both levels; F-B-2's explicit `checked` control is present (`AvailabilitySlotForm.tsx` line 356); F-B-5's fixture isolation is in place (`calendar.spec.ts` journey uses the isolated `request` fixture).

## Review-unit completeness and status-claim audit

- The parent index lists both children with records, commit scope, and integration notes — matches the code and reflog. No child is missing; no untracked in-scope work found.
- Queue state claims (`Implemented — awaiting parent review` for both) match the implementation records and code. The parent README's "Final review" gate is exactly what this report fulfills.
- Claims in the child records about commands, suite counts, and skip behavior are internally consistent (56 = 10+7+19+10+10) and match the story-planned file lists. No completion claim overstates the evidence; both children's records correctly defer DoD 10–11 to the combined review.

## Verdict

**PASS — SP-128 meets the DoD and all acceptance criteria.** The combined SP-128 review unit (SP-128A + SP-128B + integration) is approved: parent ACs 1–8 satisfied, all applicable DoD items 1–10 pass with evidence, DoD 11 is fulfilled by the walkthrough saved in this pass, and the two recorded findings are outside this unit (routed: IR-001) or optional polish (IR-002). SP-128A, SP-128B and SP-128 may be marked `Reviewed` once the final report + walkthrough are persisted and the passing-sync commit lands.

---

**Final document gate:** `review.md` and [`walkthrough.md`](./walkthrough.md) both saved and verified in this pass → completion/sign-off may proceed on the passing verdict.
