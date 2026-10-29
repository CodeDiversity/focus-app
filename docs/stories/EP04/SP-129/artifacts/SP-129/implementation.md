# SP-129 implementation index — Mobile Agenda View

Prepared: 2026-10-28 (implementer, after all in-scope children implemented); **updated 2026-10-29 after the fix pass** for the parent review findings (`review.md`, Changes Required 2026-10-28).
Review unit: combined SP-129 review (one reviewer pass for the parent's only child); **re-review requested after the R129-001…005 fix pass.**
Queue: [SP-129 README execution queue](../../README.md)

## Scope and baseline

- **In scope:** SP-129A — the calendar's narrow-screen agenda (frontend presentation of the SP-127B payload; no backend work, no new contract).
- **Baseline before the first included change:** `89df8f2` (docs(AGENTS): shell-noted tip commit; SP-127A/127B/128 work already reviewed in the EP04 history).
- **Included commits (current work, oldest first):**
  - `7eb8b43` — SP-129A ui-refiner spec commit (pre-implementation preserved output; docs only)
  - `e4e96d7` — queue reconciliation to Ready + start checkpoint (docs only)
  - `afd48ec` — feat(web): SP-129A calendar agenda replaces the week grid below sm (component, page switch, tests, e2e)
  - `d8da534` — docs: SP-129A closeout (implementation record, parent index, queue)
  - `91ba4dc` — fix(web): SP-129A review findings R129-001/002/003-evidence/005 (chip agenda layout, empty tests, keyboard/height/resize e2e, mock fix, e2e lint cleanup)
  - *(the fix-pass closeout docs commit follows this index and carries its own hash; closeout records reference `91ba4dc` for code.)*

## Child records

| Story | Record | Status | Commit scope |
|---|---|---|---|
| SP-129A | [implementation.md](../SP-129A/implementation.md) | Implemented — awaiting parent **re**-review (fix pass complete) | `afd48ec` (original) + `91ba4dc` (fix pass); closeout docs commit at queue update |
| SP-129A | [checkpoint.md](../SP-129A/checkpoint.md) | fix pass complete — findings R129-001…005 dispositioned there | — |

## Review findings status (from `review.md`)

| Finding | Disposition after fix pass | Where verified |
|---|---|---|
| R129-001 time-above-title | Fixed — chip `layout="agenda"` variant (D129A-03) | `CalendarEventChip.tsx`, `CalendarAgenda.tsx`, order-assertion test |
| R129-002 empty-agenda test | Fixed — empty-map component test; narrow empty-page test (D129A-05) | `CalendarAgenda.test.tsx`, `CalendarPage.test.tsx` |
| R129-003 verification gates | Implementer evidence added (keyboard Enter/Escape+focus return, ≥44px `boundingBox()` at 375px, live 768×1024→1280×720 resize to week grid, desktop week-view assertion); **final in-environment browser pass + remaining CANNOT VERIFY dispositions stay reviewer-owned** | `calendar.spec.ts`, extended phone test + seeded test |
| R129-004 child status stale | Fixed — story status line reconciled (no AC/decision edits) | `SP-129A-mobile-agenda-view.md` |
| R129-005 mock listener (polish) | Fixed — `(type, callback)` signature + `act`-wrapped live-resize page test | `CalendarPage.test.tsx` |

## Verification carried by the child (post-fix)

Scoped vitest 26 (+5 over review-time 21), full web suite 773 (+5), typecheck exit 0, lint clean (now including the previously erroring e2e path — pre-existing unused `mondayISO` fixed), Playwright `calendar.spec.ts` 5/5 incl. the extended 375×667 keyboard/focus/height/resize journey. Commands/cwd/exit codes and the honestly-recorded intermediate e2e failure in the child record's fix-pass section; original-pass results remain historical there with one corrected "lint clean" claim.

## Parent traceability

- AC-E04-01 (view events by week) and AC-E04-08 (types without color) — owned by SP-129A; presentation unchanged in substance by the fix pass (time-above-title is layout only; labels/badges/accessible names preserved).
- Decisions binding: D404-2, D404-9 (D129A-01…08, now including D129A-03 as actually implemented), D404-10.
- Plan correction log: unchanged — no plan-level corrections from implementation.
