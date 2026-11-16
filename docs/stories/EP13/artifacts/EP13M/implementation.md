# EP13M implementation record

**Story:** [EP13M — Cross-Layer E2E and Parent Index](../../EP13M-cross-layer-e2e-and-parent-index.md)
**Status:** Implemented — EP13 unit ready for the combined review
**Date:** 2026-11-16
**Commit scope:** `apps/web/e2e/adaptive-scheduling.spec.ts` (new), `apps/web/e2e/helpers.ts` (shared EP13M helpers), `apps/web/e2e/catch-up.spec.ts` + `study-sessions.spec.ts` (EP13 regressions repaired), `apps/web/src/features/today-plan/ui/TodayPlanCard.{tsx,test.tsx}` (one a11y defect), the parent index, this record, story Status, README queue, `efficiency.md`.

Decisions: D-M1…D-M6 were already ratified by the user (2026-11-15); nothing was outstanding.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP13M-AC1 — the journeys pass deterministically on the self-contained stack with suite-controlled dates | **Done — 7/7.** Journeys: (1) work → plan shrinks (180 → 120 placed); (2) missed day → `missedCount 0`, `rolledForwardCount 1`, dashboard not redirected, plan health count-free; (3) keyboard one-tap start → finish → planned row `COMPLETED`, `confirmedMinutesToday 25`; (4) flex `FLEX_DAY` saved overlapping a FIXED row (no conflict), "anytime" on the calendar, "Anytime today" on the dashboard, startable; (5) "Just 10 min" → `plannedMinutes 10`, absorption offer at target → `plannedMinutes 40`, candidate `COMPLETED`, 12 minutes shrink remaining work; (6) momentum empty → "25 of 60 min today" / "1 of 3 days this week" in celebration and card, no `%`; (7) `/catch-up` → `/plan/health`, `/catch-up/preview` → `/plan/health/catch-up`, Plan health + Focus in the nav, no count-led text. Dates come only from the server window (D-M2); journey 5 controls the **browser** clock only. | `adaptive-scheduling.spec.ts`: 7 passed in 3 consecutive isolated runs and in 2 consecutive full parallel runs |
| EP13M-AC2 — all pre-existing suites green; failures in EP13's change set fixed (D-M5) | **Done for everything EP13 owns; four pre-existing failures reported, not absorbed.** EP13 regressions found and fixed: 3 `study-sessions.spec.ts` tests (EP13K's ratified celebration copy) and `catch-up.spec.ts` (EP13C rollover + EP13E routes — and because the file is serial, **8 of its 9 tests had never run** on HEAD; all 9 now pass). Pre-existing: F-EP13M-01, -02, -06 below, each failing identically at the pre-EP13 baseline `9ffd854` or in specs EP13 never touched. | full E2E: 40–41 passed; the only failures are the four listed findings; web unit 1264/0; lint, typecheck clean |
| EP13M-AC3 — parent index for every child incl. EP13H2/EP13N, with the TR-E13-14 record split per D-M1 | **Done.** [`../EP13/implementation.md`](../EP13/implementation.md): inventory, per-child ranges, test commands, ownership, gaps; TR-E13-14 automated half **Executed**, user checklist **Not executed — user instructions**. | the index |
| EP13M-AC4 — flex, absorption, micro-start match D13-4(b) and D13-13/D-I8 as landed | **Done.** Journey 4 (flex excluded from clock conflicts, day-anchored rendering); journey 5 (same-day same-assignment candidate flipped `COMPLETED`, running target grows by its duration, no row link — D-I8). | journeys 4, 5 |

## Verification (2026-11-16, this worktree)

- **E2E stack.** No env file exists in this worktree and secret files are never read, so runs used a shell-only local URL (`postgresql://<local user>@localhost/postgres`, trust auth) plus throwaway `openssl rand` JWT secrets; the harness created, migrated and dropped `postgres_e2e_test`. A concurrent session in another worktree was using the same hard-coded ports 4100/3100 (its processes were left alone), so some runs used an isolated external stack (API :4200 / Vite :3200 / DB `postgres_e2e_oak`, torn down and dropped afterwards).
- `npx playwright test e2e/adaptive-scheduling.spec.ts` → 7 passed (×3 isolated). Full `npx playwright test` (self-contained, parallel) → run 1: 41 passed / 4 failed (F-EP13M-01, -02, -06 login) / 9 did not run; run 2: 40 / 5 (same + the auth-journeys logout flake) / 9.
- The 9 "did not run" sit behind pre-existing failures in serial files; executed separately with the blocker excluded: all pass except F-EP13M-02's 44px test.
- `apps/web`: `pnpm test` → **1264 passed, 0 failed**; `pnpm lint`, `pnpm typecheck`, `npx eslint e2e --ext ts`: clean. API code unchanged by EP13M (1104/0 at EP13J).

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP13M-01 | `e2e/assignments-list.spec.ts:23`, `e2e/calendar.spec.ts:100` | Focus not returned to the trigger after Escape closes a dialog (assignment create; phone-width calendar detail). | **Pre-existing** — identical failure at `9ffd854`; EP13 never touched assignments/shared Dialog. Reported (D-M5). | Planner (new fix story) |
| F-EP13M-02 | `e2e/assignments-list.spec.ts:168` | Assignment dialog controls 41.8px high at 375px (needs 44). | **Pre-existing** — 41.8px at `9ffd854`. | Planner |
| F-EP13M-03 | `features/today-plan/ui/TodayPlanCard.tsx` | EP13I's micro-start button showed "Just 10 min" but was named "Start … for just 10 minutes" — WCAG 2.5.3 label-in-name (axe `label-content-name-mismatch`). | **Fixed** — name is now "Just 10 min of {title}"; unit test and journey 5 updated. | — |
| F-EP13M-04 | `shared/ui/Badge.tsx` (`success`), availability kind badges | `text-success` on `bg-success/10` ≈ 4.3:1 for caption text (WCAG 1.4.3 needs 4.5). Also on EP13 surfaces that reuse the badge (today card minutes, momentum met badge). | **Pre-existing token pairing** (EP05/SP-128B); reported, not restyled app-wide here; the axe gate excludes exactly this pattern. | Planner (design-token fix) |
| F-EP13M-05 | `features/calendar/ui/CalendarEventChip.tsx` | Chip `aria-label="{type}: {title}, {time}"` fails axe label-in-name on every chip. | **Pre-existing** — same construction at `9ffd854` (SP-127B); EP13's additions (anytime/energy) are inside the name. Gate excludes exactly this button pattern. | Planner |
| F-EP13M-06 | `e2e/study-plan.spec.ts:25`; `e2e/login.spec.ts:71`; `e2e/auth-journeys.spec.ts:105` | study-plan: after "move later 15 min" the session overlaps a class on today's date (fails identically at `9ffd854`). login: 409 duplicate registration and auth-journeys logout click timeout under full parallel load (passed in other runs; EP13 never touched auth). | **Pre-existing / flaky outside EP13**; reported. | Planner |
| F-EP13M-07 | `apps/api` gated suites | The 27 `DATABASE_URL`-gated API suites were still not executed (the migrations themselves were, by every E2E run). | Open — run in CI or with a local DB before sign-off. | Reviewer / CI |

## Deviations

1. **Seven journeys, not "six"**: AC1's text says six, the Scope lists seven; all seven are implemented.
2. **axe-core is the copy already installed** (via `eslint-plugin-jsx-a11y`), injected with `page.addScriptTag` — no new dependency. Scans wait for animations to finish (a mid-fade scan read as low contrast).
3. **Browser clock control in journey 5** (`page.clock`) — D-M2 forbids mocking the *stack* clock for dated fixtures; the server clock is untouched.
4. **One product code change** (F-EP13M-03) in a verification story — an EP13-owned a11y defect the combined pass exists to catch; the story's "no new behavior" holds (copy of an accessible name only).

## Correction (2026-11-16, R-EP13-02)

F-EP13M-07 is closed by execution: the combined review ran the gated suites at
`210f76c` (8 red → R-EP13-01, fixed in the follow-up commit; 4 pre-existing →
R-EP13-03). The "run in CI" half of its disposition repeated the wrong CI
claim — ci.yml never covers this branch (R-EP13-02).
