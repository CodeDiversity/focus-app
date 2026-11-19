# EP16H implementation record

**Story:** [EP16H — Paused-Session Nudge in the Header Strip](../../EP16H-paused-session-nudge.md)
**Status:** Implemented — awaiting parent review (joins the EP16 unit per D16-20)
**Date:** 2026-11-18
**Baseline:** `a4ae8ae` (rulings commit).
**Commit scope:** `entities/study-session/model/elapsed.ts` (`pausedForSeconds`, + test); `widgets/session-indicator/ui/SessionIndicator.tsx` (`PAUSE_NUDGE_SECONDS`, the 60 s paused tick, copy/link/live-sentence switch) + tests; this record, story, queue, efficiency.

Decisions applied: ▲ D-H1 (a) accepted, D-H2 (a, 15 min), D-H3 (a) — all ratified by the user 2026-11-18 ("Implement H, I ratify all decisions").

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP16H-AC1 — under the threshold the strip is exactly EP16D's | **Done.** `pausedForSeconds(session, now)` compares against `PAUSE_NUDGE_SECONDS` (900); below it, copy, link and live sentence are byte-identical to EP16D's (the pinned-clock tests prove it at 14 min). | `SessionIndicator.test.tsx` nudge describe (1st case); all EP16D cases unchanged |
| EP16H-AC2 — at the threshold: "Paused a while · mm:ss", **Resume** → `/focus`, the long-pause sentence announced once; no new read, one 60 s check while paused | **Done.** A second display-tick effect runs only while the strip shows a paused session (60 s interval, cleared on resume/hide/unmount); the elapsed time stays the static paused value; the live span's text changes exactly once and stays constant over further ticks. No provider change — zero new requests (D16-11). | nudge cases 2–3; `pausedForSeconds` tests (incl. never-negative) |
| EP16H-AC3 — resume returns "Running"; copy audit; no "stopped/abandoned/idle" | **Done.** | nudge cases 4–5 |

## Verification

- `apps/web` (2026-11-18): `npx tsc --noEmit -p tsconfig.json` clean; `npx eslint src --max-warnings=0` clean; `npx vitest run` → **134 files, 1435 passed, 0 failed** (+6 with EP16H's five indicator cases and one elapsed case; EP16I adds its own on top). Focused: `npx vitest run src/widgets/session-indicator src/entities/study-session` → 33/0.
- Full Playwright: run once after EP16I (the two children share the file); recorded in EP16I's record.
- API unchanged (D16-13).

## Manual (TR-E16-04 family)

**User-accepted 2026-11-18** ("mark all manual passes as passed/accepted") — the screen-reader once-only announcement of the long-pause sentence is accepted on the user's authority, not machine-verified; the structural half (persistent span, one text change) is unit-tested.

Findings/deviations: none.

## How to verify by hand

Pause a session and wait 15 minutes (or set `PAUSE_NUDGE_SECONDS` lower locally): on any page but `/focus` the strip reads "Paused a while · mm:ss" with **Resume**; a screen reader hears "Your session has been paused for a while — ready when you are." once. Resume → "Running · mm:ss" returns.
