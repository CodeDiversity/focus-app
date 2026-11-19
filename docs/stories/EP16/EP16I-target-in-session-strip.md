# EP16I — Show the Target in the Session Strip (optional)

**Story ID:** EP16I
**Parent epic:** [EP16: Today-First Simplification](../../epics/EP16-today-first-simplification.md)
**Milestone:** M9 (D16-1) — **optional child** (D16-20): implemented only if the user accepts ▲ D-I1; reviewed with the EP16 unit if accepted.
**Layer:** Frontend
**Status:** Ready — accepted (▲ D-I1 (a), user 2026-11-18); D-I2 (a) ratified. Implementation after EP16H (same file).
**Dependencies:** EP16D implemented. Epic decisions D16-11, D16-12.
**ADHD value: 6 / 10.** Time blindness is central to ADHD: "Running · 12:34" tells a student how long they have worked but not how far they are from the commitment they made. Showing the target where the strip already shows the elapsed time ("12:34 of 25 min") makes the size of the promise visible on every page, not only on `/focus`. It is a genuine aid rather than a transformative one, because the Focus page already shows the target.

## Plan at a glance

- **What this changes:** when the session has a `plannedMinutes` target, the strip reads "Running · 12:34 **of 25 min**" (and "Paused · 12:34 of 25 min"). Past the target it reads "Running · 27:10 · target reached" — positive, never "over". Sessions without a target (`plannedMinutes: null`) keep EP16D's copy. Below `sm` (640 px) the "of 25 min" part is hidden so the strip still fits one line at 320 px.
- **Why it improves it:** the commitment's size is visible at a glance wherever the student is (product); one computed string in `SessionIndicator`, no new read (code).
- **Decisions needing you:** ▲ **D-I1 — accept into EP16**. D-I2 (reached wording) is non-▲.
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes.

## Summary

The payload already carries `plannedMinutes`. Append the target to the visible status (aria-hidden group, so the live sentence is unchanged) and switch to a positive "target reached" phrase once elapsed minutes ≥ target, mirroring `FocusTimer`'s EP13I rule (D-I7 there: running past the target is working, not failing).

## Scope

**In:** `SessionIndicator.tsx` copy + responsive class; tests; copy audit.
**Out:** the live sentence (stays target-free — a target in a live region would be re-announced on every state change); `FocusTimer`; any API change (D16-13).

## Source requirement references

AC-E16-10, AC-E16-12, D16-12. TR-E16-01, TR-E16-05. DoD-1, 6, 7, 8.

## Acceptance criteria

1. With `plannedMinutes = 25` and elapsed under the target, the visible status reads "Running · 12:34 of 25 min" (or "Paused · …"); the "of 25 min" span carries `hidden sm:inline` so the 320 px line still fits; the live sentence is unchanged from EP16D.
2. Once `floor(elapsedSeconds / 60) ≥ plannedMinutes`, the status reads "Running · 27:10 · target reached" (D-I2) — never "over", "late", "overtime".
3. With `plannedMinutes = null` the copy is exactly EP16D's. Every string passes `expectNoForbiddenWords`.

## Tests (TR-E16-01, TR-E16-05)

- `SessionIndicator.test.tsx`: `appends "of 25 min" when a target exists`; `hides the target span below sm (class check)`; `switches to "target reached" at the target and keeps ticking`; `keeps EP16D copy without a target`; `live sentence never includes the target`; `passes the copy audit with and past the target`.

## Technical notes

- **Inspected (2026-11-18, HEAD `90161c0`):** `StudySession.plannedMinutes: number | null` (`types.ts:13`); `FocusTimer.tsx` computes `exceeded = planned != null && elapsedMinutes >= planned` and renders a positive reached state (EP13I D-I7). `SessionIndicator.tsx` renders the status inside an `aria-hidden` group; the live span is sentence-only (EP16D-AC2).
- **Design:** `const target = session.plannedMinutes; const reached = target != null && Math.floor(elapsed / 60) >= target;` → visible suffix `reached ? ' · target reached' : target != null ? ' of {target} min' : ''`, the "of" part wrapped in `<span className="hidden sm:inline">`.
- **API need:** none.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-I1 | Accept into EP16's review unit: (a) accept; (b) defer to backlog | **(a)** — trivial change, every field already present, directly serves time blindness | Ratified (user, 2026-11-18 — "ratify all decisions") — accepted |
| D-I2 | Past-target copy: (a) "· target reached"; (b) "+2 min"; (c) keep "of 25 min" | **(a)** — positive and consistent with the Focus page's reached state (EP13I); (b) counts "over", which reads as debt | Ratified (user, 2026-11-18 — "ratify all decisions") |

## Definition of Done

1, 6, 7, 8 (TR-E16-01/05). 2, 3, 4, 5, 9 N/A. 10–11 via the EP16 combined review (if accepted).

## Sizing

- **Outcome:** the strip shows how far the student is from the commitment they made.
- **Size:** well under a quarter window. No split.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/src/widgets/session-indicator/ui/SessionIndicator.tsx` (+ test).
- **Start context:** this story; `SessionIndicator.tsx`; `FocusTimer.tsx:70-76` (the reached rule).
- **Verification:** `npx vitest run src/widgets/session-indicator`; tsc + eslint clean; manual: 320 px one-line check.
- **Dependencies / exclusions:** EP16D (EP16H if both accepted — they touch the same file; sequence H then I).
