# EP16I implementation record

**Story:** [EP16I — Show the Target in the Session Strip](../../EP16I-target-in-session-strip.md)
**Status:** Implemented — awaiting parent review (joins the EP16 unit per D16-20)
**Date:** 2026-11-18
**Baseline:** `839bf48` (EP16H).
**Commit scope:** `widgets/session-indicator/ui/SessionIndicator.tsx` (target suffix + reached state) + tests; this record, story, queue, efficiency.

Decisions applied: ▲ D-I1 (a) accepted, D-I2 (a, "· target reached") — ratified by the user 2026-11-18 ("Implement H, I ratify all decisions").

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP16I-AC1 — "Running · 12:34 of 25 min" (and paused variants); the suffix `hidden sm:inline`; live sentence unchanged | **Done.** The suffix lives in the aria-hidden status group, `sm`-gated so 320 px keeps EP16D's one line; the live span never carries a digit. | target describe, cases 1 & 4 |
| EP16I-AC2 — at the target: "· target reached", never "over/late/overtime"; keeps ticking | **Done, one interpretation recorded:** the reached suffix sits in the same `sm`-gated span as "of X min" (AC1's 320 px fit rule is the binding constraint; AC2 is silent on gating). Below `sm` the strip shows EP16D's baseline — no information regression. | target describe, case 2 |
| EP16I-AC3 — `plannedMinutes: null` → exactly EP16D's copy; copy audit | **Done.** | target describe, cases 3 & 5 |

## Verification

- `apps/web` (2026-11-18): `npx tsc --noEmit -p tsconfig.json` clean; `npx eslint src --max-warnings=0` clean; `npx vitest run` → **134 files, 1440 passed, 0 failed** (+5 on EP16H's 1435).
- **Playwright, full suite, self-contained mode** (fresh derived DB from `sp_elm_ep16i_dev`; shell `DATABASE_URL` + placeholder `JWT_SECRET`): **73 passed, 0 failed, 0 skipped** (49.7 s). Disclosed: the first run after the H+I changes failed 3 (assignments-list unstable click, a cold login over its 10 s budget, the confirm toast over its 5 s expect) — all pre-existing cold-run flake families (BL-15-08 / F-EP14C-01), none touching the strip; the re-run above is clean.
- API unchanged (D16-13).

## Manual (TR-E16-04 family)

**User-accepted 2026-11-18** ("mark all manual passes as passed/accepted") — the 320 px one-line visual check is accepted on the user's authority; the structural half (`hidden sm:inline`) is unit-tested.

Findings/deviations: the AC2 gating interpretation above; nothing else.

## How to verify by hand

Start a session with a target: on any other page the strip reads "Running · 12:34 of 25 min" (≥ 640 px). Work past the target: "Running · 27:10 · target reached" — still ticking, nothing red. A session without a target shows EP16D's plain copy.
