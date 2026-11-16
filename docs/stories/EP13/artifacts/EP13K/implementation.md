# EP13K implementation record

**Story:** [EP13K — Momentum: Daily Goal and Repairable Streak](../../EP13K-momentum-daily-goal-and-repairable-streak.md)
**Status:** Implemented — awaiting parent review (EP13 combined review unit)
**Date:** 2026-11-16
**Commit scope:** one commit — API (pure `momentum.ts`, `startOfMondayWeek`, two preference keys, DTO, `GET /study-sessions/momentum`), web (`features/momentum/`, dashboard card, focus celebration, two goal radio groups, store wiring), tests, `contracts.md` endpoint row, EP13K story Status/rulings/sizing, EP13 README queue, this record, `efficiency.md`. **No migration** — the goals live in the `studyDefaults` JSON bag.

Decisions applied: ▲ D-K1, D-K2, D-K3, D-K5, D-K6, D-K7, D-K8, D-K9, D-K10 ratified by the user 2026-11-16 (all recommended options); D-K4, D-K11, D-K12 ratified by default at implementation start. Cells written in the story.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP13K-AC1 — momentum read, deterministic, timezone-correct, repairable | **Done.** `computeMomentum` (pure, no clock) takes `today` + civil-dated sessions; study day = a session with ≥ 1 minute (D-K1); Monday week via `startOfMondayWeek` string arithmetic (D-K2); run counts the current week only once met, an unmet current week never ends it, a completed under-goal week does, `bestWeeks` always reported (D-K3); 52-week horizon with `capped: true` only when hit (D-K4). `StudySessionsService.momentum` reads the user (404 uniform if missing), over-fetches COMPLETED sessions from one day before the horizon with `userId` in the `where`, buckets with `toCivilDate(startTime, zone)` and attaches `timeZone`. Route declared before `@Get()`. | `momentum.spec.ts` (13), `study-sessions-momentum.service.spec.ts` (7, incl. Auckland/LA bucketing, New York DST-end Sunday, zone fallback, defensive goal reader, 404), `calendar-date.spec.ts` (+2), gated `study-sessions-data-scoping.spec.ts` (+1 scoping case, +401 line) |
| EP13K-AC2 — goals are preferences, asked as named choices | **Done.** `dailyGoalMinutes` (60, 5–480) and `weeklyGoalDays` (3, 1–7) added to keys/defaults/bounds/step-1 reader, `StudyPreferences`, DTO (`@IsInt/@Min/@Max` with contract messages) and the GET/PUT response projection; PUT merge picks them up through `STUDY_PREFERENCE_KEYS`. Form: new "Your goals" fieldset with two radio-card groups — Gentle 30 / Steady 60 / Ambitious 120 and Light 2 / Steady 3 / Most days 5 — plus honest `Custom (n min)` / `Custom (n days)` (D-K6/D-K7, D-N2). No number input for either goal. | `preferences.spec.ts` (defaults/bounds/eight keys/additive/fallback/validator), `study-plans.service.spec.ts` (+2: merge, 400 names the field), `StudyPreferencesForm.test.tsx` goal block (9) |
| EP13K-AC3 — dashboard momentum, after initiation | **Done.** `MomentumCard` (heading "Your momentum") renders after `TodayPlanCard`, before the urgency grid (D-K9): daily line + `aria-hidden` bar, seven Mon–Sun marks (`aria-hidden`) with an sr-only "Studied on …" sentence, weekly line, run line (D-K10); loading (`aria-busy`, pulse with `motion-reduce:animate-none`), empty (no button), error (`role="alert"` + "Try again"). The refresh control refetches it. | `MomentumCard.test.tsx` (10), `momentumCopy.test.ts` (6), `DashboardPage.test.tsx` (heading order, named regions, refresh = 4 requests incl. momentum, reduced-motion sweep now covers the card) |
| EP13K-AC4 — celebration on finish, reduced-motion-safe and announced | **Done.** `FocusTimer`'s completed block becomes the celebration when `durationMinutes ≥ 1`: `Sparkles` + "You studied {n} minutes.", then daily/weekly (compact strip)/run lines once `momentum` is present; one `animate-[momentum-in_300ms_ease-out_both] motion-reduce:animate-none` entrance (`@keyframes momentum-in` in `index.css`). The existing live region reads "Focus session complete — you studied {n} minutes.". 0 minutes → "Nothing recorded this time. Your work is still in your plan." with no icon/animation. `FocusPage` triggers the lazy momentum read after a ≥ 1-minute finish and passes data only once it resolves; failure leaves the headline alone. | `FocusTimer.test.tsx` (+6), `FocusPage.test.tsx` (+3, incl. failed read and animation sweep) |
| EP13K-AC5 — nothing is graded | **Done.** Payload has no percent field (asserted); card/celebration/form copy is regex-checked for `%` and the blame terms. Radio groups keep the EP13N focus ring and arrow keys; goal cards and day cells carry 44px minimum heights; the card body stacks under `sm`. | AC5 cases in the suites above. Manual a11y pass: **deferred to EP13M** (TR-E13-14), as with the sibling UI stories |

## Verification (2026-11-16, worktree branch `hfi/…/elm`, uncommitted state before the commit)

- `apps/api`: `pnpm test` → **1084 passed, 0 failed**, 476 skipped (27 DATABASE_URL-gated suites self-skip; CI-executed). Focused (`momentum`, `study-sessions-momentum`, `preferences`, `calendar-date`, `study-plans.service`): 103 passed. `pnpm lint` (`--max-warnings 0`), `pnpm typecheck`, `pnpm format`: clean.
- `apps/web`: `pnpm test` → **1255 passed, 0 failed** (110 files; was 1220 at EP13N). `pnpm lint`, `pnpm typecheck`, `pnpm format:write` (no further changes): clean.
- Tested state: unit + component level (mocked Prisma; jsdom with axios adapter / mocked entity client). No browser run and no live DB run locally.

## Deviations (each with why)

1. **Week strip is a flex row of seven equal cells, not a CSS grid.** The existing dashboard responsive test locates the section grid with `.grid`; a `grid` inside the card would shadow it. Visually equivalent; no test loosened.
2. **`PresetRadioGroup` extracted in-file** (the story allowed it once three groups exist). Markup is EP13N's verbatim; the generated element ids changed from `…-density-…` to `…-densityPercent-…` (no test or style depended on them). Cards gained `max-sm:min-h-[44px]` (AC5).
3. **`hasHistory`** means "a study day exists inside the 52-week horizon", not "a session ever" — the read is bounded by D-K4. A student whose last session is older than a year sees the empty state; acceptable copy-wise ("No sessions yet" is still non-blaming), recorded for the reviewer.
4. **Plan-preview/generate payloads' `preferences` echo now also carries the two goals**, because they share `toStudyPreferencesResponse` with GET/PUT. Additive; the gated e2e/data-scoping key lists were updated accordingly.
5. **Momentum is not fetched after a 0-minute finish** — there is nothing to celebrate and the neutral line shows no numbers.
6. **Tests written alongside the code, not run red first** for every case; the existing suites were run against the changed code and their failures (store inventory, heading order, radio counts, refresh counts, entity mocks) were each traced to the intended change before being updated.

## Findings

| ID | Source / paths | Issue | Disposition | Owner | Closure evidence |
|---|---|---|---|---|---|
| F-EP13K-01 | `apps/web/src/features/momentum/model/momentumCopy.ts` (`weekDates`) | The client derives the seven dates from `week.startDate` with a UTC day counter. D05-6 says the client does no date arithmetic; this is index arithmetic on a server civil string (no zone conversion), but it is arithmetic. | Accepted as implemented; alternative is a `week.days[]` payload field (changes ratified D-K5). | Reviewer (combined EP13 review) | `momentumCopy.test.ts` month-boundary case |
| F-EP13K-02 | `study-sessions-data-scoping.spec.ts`, `study-plans-e2e.spec.ts`, `study-plans-data-scoping.spec.ts` | Gated suites updated (new momentum scoping case; preference key lists/defaults) but not executed locally (no `DATABASE_URL`). | Open — CI-executed, same standing as F-EP13A-03. | CI / reviewer | — |
| F-EP13K-03 | `apps/api/src/domain/study-planning/momentum.ts` | Goals are applied with today's values to every past week (the bag stores no goal history), so changing `weeklyGoalDays` re-scores the run and best run. | Accepted; documented in the module header. A goal-history store would be a follow-up story. | Planner (if desired) | — |
| F-EP13K-04 | `apps/api/src/domain/study-planning/momentum.ts` | First domain-module import from `common/lib` (`calendar-date.ts`, pure string helpers). D06-17 forbids Nest/Prisma/clock, which this respects, but it is a new edge in the import graph. | Accepted; reviewer to confirm. | Reviewer | — |

## Changed paths

- API: `src/common/lib/calendar-date.ts` (+spec), `src/domain/study-planning/{momentum.ts (new), momentum.spec.ts (new), types.ts, preferences.ts, preferences.spec.ts, calibration.spec.ts, catch-up.spec.ts, scheduler.spec.ts}`, `src/modules/study-plans/{dto/update-study-preferences.dto.ts, study-plans.service.ts, study-plans.service.spec.ts, study-plans-e2e.spec.ts, study-plans-data-scoping.spec.ts}`, `src/modules/study-sessions/{study-sessions.service.ts, study-sessions.controller.ts, study-sessions-momentum.service.spec.ts (new), study-sessions-data-scoping.spec.ts}`.
- Web: `src/entities/study-session/{model/types.ts, api/studySessionApi.ts, api/studySessionApi.test.ts (new)}`, `src/entities/study-preferences/{model/types.ts, api/studyPreferencesApi.test.ts}`, `src/features/momentum/{api/momentumApi.ts, model/momentumCopy.ts, model/momentumCopy.test.ts, ui/MomentumCard.tsx, ui/MomentumCard.test.tsx, ui/MomentumWeekStrip.tsx}` (new), `src/app/store/{store.ts, store.test.tsx}`, `src/test/providers.tsx`, `src/pages/dashboard/ui/DashboardPage.{tsx,test.tsx}`, `src/features/focus-session/ui/FocusTimer.{tsx,test.tsx}`, `src/pages/focus/ui/FocusPage.{tsx,test.tsx}`, `src/features/study-preferences/ui/StudyPreferencesForm.{tsx,test.tsx}`, `src/index.css`; `getMomentum` stub added to the entity mocks in `TodayPlanCard.test.tsx`, `AbsorbNextOffer.test.tsx`, `StartFocusSessionDialog.test.tsx`, `useFocusSession.test.ts`.
- Docs: `docs/stories/EP13/contracts.md` (momentum endpoint row), the EP13K story (Status, rulings, sizing actual), `docs/stories/EP13/README.md` (queue row, Active/Next), this record, `artifacts/efficiency.md`.

## Correction (2026-11-16, R-EP13-02)

This record dispositioned its unexecuted `DATABASE_URL`-gated suites as
CI-executed. That claim was wrong: `.github/workflows/ci.yml` triggers only on
`main`/`develop`, which never ran for this delivery chain. The suites were
first executed by the combined EP13 review at `210f76c` (red — R-EP13-01) and
are green after the R-EP13-01 fix commit, except the four pre-existing
failures dispositioned as R-EP13-03. Evidence: `artifacts/EP13/review.md` and
the fix commit's record in `history.md`.
