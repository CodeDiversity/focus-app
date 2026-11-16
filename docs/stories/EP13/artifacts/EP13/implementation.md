# EP13 parent implementation index — Adaptive Scheduling for ADHD

**Parent:** [EP13 README](../../README.md) · **Review unit:** EP13A–EP13N incl. EP13H2 (EP13P/EP13Q excluded, D13-18/D13-19)
**Status:** All application children implemented — **ready for the combined review**. Not approved; only a passing `review.md` establishes sign-off.
**Written by:** implementer, EP13M, 2026-11-16.

## Combined Git scope

- **Baseline:** `9ffd854` (the breakdown README, the last commit before EP13A's story commit `120d960`).
- **Final application commit:** the EP13M commit (this index lands in it).
- Re-derive anything below with `git log --oneline 9ffd854..HEAD -- <paths>` and `git show --stat <commit>`.

## Child inventory and per-child diff ranges

Every child landed as **one** implementation commit (`feat`/`fix`), so each diff range is `<commit>^..<commit>`. Docs-only refiner/planner commits in between are not part of the application diff.

| Child | Outcome | Commit (range `c^..c`) | Record | Open findings (owner in the record) |
|---|---|---|---|---|
| [EP13A](../../EP13A-plan-generation-counts-reality.md) | Plans subtract confirmed time; locked-future minutes kept | `6f71cdc` | [EP13A](../EP13A/implementation.md) | F-EP13A-03 |
| [EP13B](../../EP13B-planned-actual-link-and-lifecycle.md) | Planned↔focus link + lifecycle (migration) | `f524310` | [EP13B](../EP13B/implementation.md) | F-EP13B-02 |
| [EP13C](../../EP13C-rolling-reconciliation-and-auto-forgiveness.md) | Read-time rollover; missed stops accumulating | `3b814c8` | [EP13C](../EP13C/implementation.md) | F-EP13C-01, F-EP13C-02 |
| [EP13D](../../EP13D-plan-visibility-and-one-tap-start.md) | Dashboard today card, one-tap start, calendar planned sessions | `5fc004d` | [EP13D](../EP13D/implementation.md) | F-EP13D-02 |
| [EP13E](../../EP13E-fresh-start-reframing-and-navigation.md) | Plan health, today-first plan, Focus nav, `/catch-up` redirects | `27f08ef` | [EP13E](../EP13E/implementation.md) | F-EP13E-01, F-EP13E-03 |
| [EP13F](../../EP13F-adhd-aware-placement-engine-v2.md) | Placement v2: breaks, density, interleaving, min/max | `8687c75` | [EP13F](../EP13F/implementation.md) | F-EP13F-01…04 |
| [EP13G](../../EP13G-flexible-day-anchored-sessions-api.md) | Day-anchored flex sessions: model, engine, API (migration) | `978a783` | [EP13G](../EP13G/implementation.md) | F-EP13G-02…04 |
| [EP13H](../../EP13H-flexible-sessions-ui.md) | "Anytime" UI everywhere | `21c9f77` | [EP13H](../EP13H/implementation.md) | F-EP13H-01, F-EP13H-02 |
| [EP13H2](../../EP13H2-flex-details-and-calendar-suite-repair.md) | Flex details dialog + calendar suite repair | `f6c6057` | [EP13H2](../EP13H2/implementation.md) | — (closed four findings) |
| [EP13I](../../EP13I-micro-start-and-hyperfocus-absorption.md) | Micro-start + absorption | `d218eaf` | [EP13I](../EP13I/implementation.md) | F-EP13I-01…03 (label-in-name defect fixed by EP13M, F-EP13M-03) |
| [EP13L](../../EP13L-deterministic-estimate-calibration.md) | Deterministic estimate calibration | `0817ca3` | [EP13L](../EP13L/implementation.md) | F-EP13L-01, F-EP13L-02 |
| [EP13N](../../EP13N-adhd-aligned-preference-controls.md) | Density as named presets | `1152f66` | [EP13N](../EP13N/implementation.md) | — |
| [EP13K](../../EP13K-momentum-daily-goal-and-repairable-streak.md) | Momentum: daily goal, repairable weekly run, celebration | `67fb8fe` | [EP13K](../EP13K/implementation.md) | F-EP13K-01…04 |
| [EP13J](../../EP13J-energy-aware-availability-and-placement.md) | Energy-tagged availability + preference (migration) | `81ec5bb` | [EP13J](../EP13J/implementation.md) | F-EP13J-01…04 |
| [EP13M](../../EP13M-cross-layer-e2e-and-parent-index.md) | Cross-layer E2E, combined a11y pass (automated half), this index | the EP13M commit | [EP13M](../EP13M/implementation.md) | F-EP13M-01…07 |

Outside the unit (own plan-style sign-off): EP13P `a9afe4d`, EP13Q `055b9f0`.

Migrations in scope: EP13B `20261114120000_study_session_planned_link`, EP13G `20261115120000_planned_session_flex_anchor`, EP13J `20261116120000_availability_slot_energy` — all applied to a fresh database by every E2E run in EP13M (the harness runs `prisma migrate deploy`), which closes the "not run locally" half of F-EP13B-02/F-EP13J-01 for the migrations themselves.

## Test commands

Per child, the commands and counts are in each child's record (the only home for test counts). For the unit as a whole, at the EP13M commit:

| Command (cwd) | What it covers |
|---|---|
| `pnpm --filter @studypilot/api test` (repo root) or `npx jest` (`apps/api`) | API unit + mocked-Prisma suites; the 27 `DATABASE_URL`-gated suites self-skip without a DB |
| `DATABASE_URL=… npx jest --runInBand` (`apps/api`, freshly migrated throwaway DB) | the gated live-DB suites — first executed by the combined review at `210f76c` (8 red, R-EP13-01) and green after the R-EP13-01 fix except the four pre-existing R-EP13-03 failures. The old "CI executes them" claim was wrong (R-EP13-02): ci.yml covers `main`/`develop` only |
| `pnpm test` (`apps/web`) | web unit/component suites |
| `pnpm test:e2e` (repo root) / `npx playwright test` (`apps/web`) | all E2E incl. `e2e/adaptive-scheduling.spec.ts` (the seven EP13 journeys) |
| `pnpm lint`, `pnpm typecheck` (each app); `npx eslint e2e --ext ts` (`apps/web`) | static gates (`format:write` does not cover `e2e/`) |

## AC / TR / DoD ownership

Ownership is as tabulated in the [README](../../README.md#epic-acceptance-criteria--ownership) (AC-E13-01…14), [TR table](../../README.md#requirement-and-test-traceability) (TR-E13-01…14) and [DoD table](../../README.md#requirement-and-test-traceability). Cross-layer proof added by EP13M (TR-E13-13): AC-E13-01 (journey 1), AC-E13-03/05 (journey 3), AC-E13-04 (journey 2), AC-E13-09 (journey 4), AC-E13-11 (journey 5), AC-E13-12 (journey 6), EP13E IA (journey 7). AC-E13-06/07/08/10/13/14 are engine rules proven at unit level by their owners (EP13F/J/L); journeys 1 and 5 exercise the engine end to end.

## TR-E13-14 — combined accessibility record (D-M1)

**Automated — Executed (EP13M, 2026-11-16).** axe-core 4.14 (WCAG 2.0/2.1 A+AA, 2.2 AA tags; serious/critical gate) inside the journeys on `/dashboard` (today card + momentum), `/focus` (finished celebration; absorption offer), `/plan/health`, `/calendar`, `/availability`, `/profile` (preference form incl. the goal groups). Keyboard: Tab path reaches the dashboard's "Start focus" with a non-`none` focus ring and Enter starts focus (journey 3); nav groups open and Escape closes (journey 7). Results: one EP13 defect found and fixed (F-EP13M-03); two pre-EP13 patterns found and reported, excluded from the gate by exact pattern only (F-EP13M-04, F-EP13M-05); everything else clean.

**User-run checklist — Executed and signed (user, 2026-11-16).** The user ran items 1–7 below and signed them in-session: "the accessibility checklist is approved and passed now" (2026-11-16, closing R-EP13-05). Result: passed, no defects reported. The items are kept as the record of what was checked.

1. **Screen reader (VoiceOver: ⌘F5 on macOS, Safari).** Dashboard: the heading order reads "Today's plan" then "Your momentum"; the next session's "Start focus" and "Just 10 min of …" buttons announce their names; the momentum week strip is read as one sentence ("Studied on …"), not seven marks.
2. **Focus page.** Start and finish a session: the timer announces "Focus session running"; after finishing, VoiceOver reads **once** "Focus session complete — you studied N minutes."; the absorption offer (reach the target with the timer running) is announced as a status, and "Keep going (+N min)" is reachable.
3. **Plan health / flex.** `/plan/health` reads "Moved forward" rows without counts; a flex session on the calendar announces "anytime" instead of a clock time.
4. **Preferences (`/profile`).** The three radio groups (Fill level, Daily goal, Weekly goal) each announce group name, option name, description and checked state; arrow keys move within a group.
5. **Availability.** The Energy select announces its label and hint; a High/Low window's tag is read on the list row and on its calendar chip.
6. **Reduced motion.** System Settings → Accessibility → Display → Reduce motion ON: finishing a session shows the celebration with no entrance movement; loading skeletons do not pulse.
7. **Narrow screen (≈375px).** Dashboard cards stack; the momentum week strip stays seven columns and legible; goal/density cards stack to one column; no sideways scroll on `/dashboard`, `/focus`, `/profile`, `/availability`.

## Known gaps for the reviewer

- Gated live-DB API suites: executed by the combined review (closing F-EP13M-07) — see R-EP13-01/-02/-03 in `review.md` for the result and the record corrections.
- Four pre-existing E2E failures and two pre-existing parallel-load flakes, all outside EP13's change set (F-EP13M-01/02/06).
- The user-run half of TR-E13-14 above.
- Product follow-ups raised by children (e.g. F-EP13J-02…04, F-EP13K-03) are dispositioned in their records; none blocks review.
