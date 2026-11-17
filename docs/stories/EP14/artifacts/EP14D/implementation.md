# EP14D implementation record

**Story:** [EP14D — Accessibility Debt from the EP13 Pass](../../EP14D-accessibility-debt-from-the-ep13-pass.md)
**Status:** Implemented — awaiting parent review
**Date:** 2026-11-16
**Commit scope:** `apps/web/src/shared/ui/Dialog.tsx`, `Badge.tsx`, `apps/web/src/index.css`, `apps/web/tailwind.config.js`, `apps/web/src/features/calendar/ui/CalendarEventChip.tsx`, `apps/web/src/features/assignments/ui/assignmentPresentation.ts`, `apps/web/src/features/availability/ui/AvailabilitySlotList.tsx`, seven unit-test files, `apps/web/e2e/{adaptive-scheduling,calendar,assignments-list}.spec.ts`, this record, story Status/sizing, README queue row + pointer fields, `efficiency.md`.

Decisions applied: D-D1, D-D2, D-D3 — all ratified by the user (2026-11-16). D-D1's *premise* did not survive the evidence; see F-EP14D-01 (the outcome it asked for — focus returns to the surviving trigger — holds).

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP14D-AC1 — Escape returns focus to the trigger on the assignment-create dialog and the phone-width calendar detail; `assignments-list.spec.ts:23` and `calendar.spec.ts:100` pass | **Done.** Root cause was the shared `Dialog`, not the sites: both triggers survive the close (the empty-state button is still there before a row exists; agenda chips keep their keys). `Dialog` captured `document.activeElement` on *every* run of its `open` effect; under `React.StrictMode` (`main.tsx`) the effect runs, cleans up and runs again, and by the second run the first field inside the dialog already had focus — so the "restore" target was an element that unmounted with the dialog and focus fell to `<body>`. The E2E stack serves the Vite dev build, where StrictMode double-invokes effects (a production build does not — which is why nothing was reported by users). Fix: capture the restore target only when it is *outside* the dialog. Unit tests were red first: a StrictMode host case in `Dialog.test.tsx`, plus one StrictMode site test each in `CalendarPage.test.tsx` (agenda entry) and `AssignmentsPage.test.tsx` (empty-state button). | the three StrictMode unit cases (red → green); E2E `assignments-list.spec.ts:23` and `calendar.spec.ts:101`\* green in runs D2–D5 (table below); both failed identically in all six EP14F runs before this change |
| EP14D-AC2 — at 375 px every interactive control in the assignment dialog is ≥ 44 px; `assignments-list.spec.ts:168` passes | **Done — product was already compliant; the measurement was not.** Every control already carried `max-sm:min-h-[44px]`. The test read `boundingBox()` while the dialog's 200 ms `scale-95 → scale-100` entrance transition was still running: 44 × 0.95 = **41.8 px**, F-EP13M-02's exact number. The spec now waits for `document.getAnimations()` to settle (the same wait `axeViolations` uses) and then asserts ≥ 44 px for *every* visible interactive control in the dialog (input, select, textarea, button, link), not only the two it used to sample. No component changed (F-EP14D-02). | E2E `:168` green in D1–D5 |
| EP14D-AC3 — success-badge text ≥ 4.5:1; every calendar chip's accessible name contains its visible text in order | **Done.** D-D2(a): new token `--color-success-strong: 21 101 52` / Tailwind `success-strong`; `Badge` success → `bg-success/10 text-success-strong`. Computed contrast for rgb(21 101 52) on the 10 % tint over white (≈ rgb(232 242 236)) ≈ **6.2:1** (was ≈ 4.4:1). The identical tint+text pairing outside the shared `Badge` — assignment status pill and status select (`COMPLETED`), availability kind badge, the chip's inline "Completed" badge — got the same one-token swap, because those sit on scanned surfaces and would have failed the gate the moment the allowlist went. D-D3(a): `aria-label` removed from `CalendarEventChip`; the name is the visible content in visible order with screen-reader-only ":" and "," — week layout "Class: Calculus, 09:00", agenda layout "Class: 09:00, Calculus" (Chrome inserts spaces around block-level/sr-only children, so locators match with `\W*`). | `Badge.test.tsx` pins the classes; `CalendarEventChip.test.tsx` asserts no `aria-label` and a name that starts with the type label and carries title + time in layout order (anytime/energy cases updated); `CalendarAgenda`/`CalendarPage` tests and `calendar.spec.ts` locators updated; axe `color-contrast` and `label-content-name-mismatch` clean on every scanned surface in D2–D5 with **no** `ignore` |
| EP14D-AC4 — `expectNoAxeViolations` has no `ignore` predicate; all seven journeys stay green | **Done.** The predicate and its two allowances are gone; the gate calls `axeViolations(page)` with no options. Journeys 7/7 in runs D1, D2, D4, D5; in D3 journey 5 missed the absorption offer after `page.clock.fastForward` (F-EP14D-03 — browser-clock timing, not accessibility; journeys 6–7 did not run behind it in the serial file). D2, D4 and D5 are **54 passed / 0 failed** — the first fully green full runs recorded for this suite. | table below |

\* `calendar.spec.ts:100` in the AC is now `:101` — one comment line was added above the chip locator at `:91`. Same test.

### Full E2E runs on the isolated stack (2026-11-16)

| Run | Passed / failed / did not run | Journeys | Three AC1/AC2 tests | Note |
|---|---|---|---|---|
| D1 | 52 / 1 / 1 (17.6s) | 7/7 | 2/3 | `calendar.spec.ts:101` failed on a test-side locator: Playwright's `getByText('Class', { exact: true })` compares full `textContent`, now "Class:" with the sr-only separator; changed to `/^Class:?$/` |
| D2 | **54 / 0 / 0** (16.6s) | 7/7 | 3/3 | fully green |
| D3 | 51 / 1 / 2 (27.2s) | 4/7 | 3/3 | journey 5: `absorb-next-offer` not visible within 15 s after `page.clock.fastForward('11:00')` (F-EP14D-03); 6–7 did not run |
| D4 | **54 / 0 / 0** (17.3s) | 7/7 | 3/3 | fully green |
| D5 | **54 / 0 / 0** (30.4s) | 7/7 | 3/3 | fully green |

## Verification (2026-11-16, this worktree)

- **Tested state:** `HEAD 261cbe7` (EP14F) + the uncommitted EP14D changes that form this commit. D1 ran before the `calendar.spec.ts:140` locator fix; D2–D5 on the final content.
- `pnpm exec vitest run` (cwd `apps/web`) → **111 files, 1273 passed, 0 failed** (1268 at EP14F + 5 new cases: Dialog StrictMode, Badge success classes, chip name order in both layouts, CalendarPage StrictMode agenda, AssignmentsPage StrictMode empty state).
- `pnpm exec eslint <changed src files>`, `pnpm exec eslint e2e --ext ts`, `pnpm exec prettier --write/--check`, `pnpm exec tsc --noEmit -p tsconfig.json` (cwd `apps/web`) → clean. `tailwind.config.js` was re-based on HEAD so its diff is the single token line (prettier wanted to reformat the whole file).
- **E2E stack (external mode, F-EP14F-02 workaround, EP13M precedent):** another worktree session held the self-contained ports :4100/:3100 for most of this window. Isolated instead: `create database postgres_e2e_oak` + `DATABASE_URL=… pnpm exec prisma migrate deploy` (cwd `apps/api`); `PORT=4200 DATABASE_URL=… JWT_SECRET=$(openssl rand -hex 32) FRONTEND_URL=http://localhost:3200 pnpm start:e2e` (cwd `apps/api`); `E2E_API_PROXY_TARGET=http://localhost:4200 pnpm exec vite --port 3200 --strictPort` (cwd `apps/web`); then `E2E_BASE_URL=http://localhost:3200 pnpm --filter @studypilot/web test:e2e` from the repo root, default parallelism, five times. Shell-only env; no env file read or written. Both processes were stopped and the database dropped afterwards.
- **Before/after for AC1:** the two focus tests failed identically in all six EP14F self-contained runs (same code except this child's changes) and pass in D2–D5.

## Changed paths

- `apps/web/src/shared/ui/Dialog.tsx` — restore-target capture ignores elements inside the dialog (StrictMode-safe).
- `apps/web/src/index.css`, `apps/web/tailwind.config.js` — `success-strong` token.
- `apps/web/src/shared/ui/Badge.tsx`, `features/assignments/ui/assignmentPresentation.ts`, `features/availability/ui/AvailabilitySlotList.tsx`, `features/calendar/ui/CalendarEventChip.tsx` — `text-success` → `text-success-strong` on the 10 % tint; the chip also drops `aria-label` and adds sr-only separators.
- Tests: `shared/ui/Dialog.test.tsx`, `shared/ui/Badge.test.tsx`, `features/calendar/ui/CalendarEventChip.test.tsx`, `features/calendar/ui/CalendarAgenda.test.tsx`, `pages/calendar/ui/CalendarPage.test.tsx`, `pages/assignments/ui/AssignmentsPage.test.tsx` (incl. the status-select class pin).
- E2E: `e2e/adaptive-scheduling.spec.ts` (gate without `ignore`; flex-chip locator reads the visible "Anytime"), `e2e/calendar.spec.ts` (content-derived chip names; type-label text assertion), `e2e/assignments-list.spec.ts` (settled-layout measurement, all controls).
- Records: this file; story Status + sizing; README queue row, Active/Next fields; `efficiency.md`.

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP14D-01 | `shared/ui/Dialog.tsx:99–105`; D-D1 | D-D1's premise ("the primitive is correct; the sites lose their trigger") was wrong: both triggers survive, and the primitive lost the restore target under StrictMode's double effect run (dev build = the E2E build). | **Fixed in the primitive** (capture only an element outside the dialog) — not D-D1(b)'s body fallback and not a site change; the ruled outcome (focus returns to the trigger) holds, and every `Dialog` consumer benefits. Recorded here rather than editing the Ruling. | — (parent review to note) |
| F-EP14D-02 | `e2e/assignments-list.spec.ts:168`; F-EP13M-02 | The 41.8 px reading was the dialog's `scale-95` entrance frame (44 × 0.95), not an undersized control. | **Fixed in the spec** (wait for animations to settle; assert every control). No product change. F-EP13M-02 was a measurement artefact. | — |
| F-EP14D-03 | `e2e/adaptive-scheduling.spec.ts:331–333` (journey 5) | After `page.clock.fastForward('11:00')` the absorption offer did not render within 15 s in 1 of 5 isolated-stack runs (and never in EP14F's six self-contained runs). Browser-clock vs. the running-target tick; not an accessibility failure. | **Not fixed** (story scope: "E2E flakes → EP14C"); recorded with the run. Candidate: fast-forward in two steps or wait for the elapsed label to pass the target before asserting the offer. | planner |

## Deviations

1. **Shared primitive changed** although the Technical notes expected site fixes — done only after the per-site confirmation the notes asked for (StrictMode tests at both sites failed, and `Dialog`'s own StrictMode test reproduced it in isolation).
2. **Four extra `text-success-strong` sites** beyond the shared `Badge`: the same pairing, same token, on surfaces the gate scans. "Restyling beyond the success pairing" stayed out of scope.
3. **AC2's test asserts every control**, not just the two it sampled; the AC's wording ("every interactive control") is what the test now checks.
