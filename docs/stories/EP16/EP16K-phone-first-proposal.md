# EP16K — Phone-First Proposal: the Editor Behind One Disclosure (optional)

**Story ID:** EP16K
**Parent epic:** [EP16: Today-First Simplification](../../epics/EP16-today-first-simplification.md)
**Milestone:** M9 (D16-1) — **optional child** (D16-20): implemented only if the user accepts ▲ D-K1; reviewed with the EP16 unit if accepted.
**Layer:** Frontend
**Status:** Queued — optional, awaiting acceptance (▲ D-K1). **Needs a UI/UX refiner pass if accepted** (disclosure copy, default open/closed rule, 360 px layout) — the technical half is specified here.
**Dependencies:** EP16C implemented (`PlanProposal`, `PlanSessionEditor`); EP16E implemented (phones are first-class). Epic decisions D16-4, D16-9, D16-12; EP16C D-C6 (section order), D-C12 (summary line). Related backlog: BL-16-02 (render the proposal on the EP15 grid).
**ADHD value: 8 / 10.** Planning is where ADHD students bounce: a long page of per-session controls at the exact moment of commitment is decision fatigue, and an unaccepted proposal is a week with no plan. EP16C already gave the proposal a one-sentence summary (D-C12) and a single **Use this plan**; what remains is that on a phone the editor — seven days × N sessions × six controls — sits between the week and the decision. Folding it behind one disclosure makes the proposal readable in one screen: summary, week, **Use this plan**. The highest-leverage upgrade in this set because it acts on the step that gates everything else.

## Plan at a glance

- **What this changes:** on `/plan/proposal`, `PlanSessionEditor` renders inside a single disclosure — a button **Adjust sessions** (`aria-expanded`) under the week, collapsed by default below `md` and open by default at `md`+ (D-K2). Conflicts (409) force it open and move focus to the first marked row (so nothing a student must fix is ever hidden). **What this plan keeps**, **Moved forward into this plan** and the warnings keep their order after it (D-C6).
- **Why it improves it:** a phone shows the proposal as summary → week → decision; the controls are one tap away for the students who want them (product). In code it is one wrapper component and one default-open rule using EP16E's `useMediaQuery`; the editor itself is untouched.
- **Decisions needing you:** ▲ **D-K1 — accept into EP16**. D-K2 (default state per viewport) and D-K3 (label) are non-▲ and go to the refiner if accepted.
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes.

## Summary

Wrap, don't rewrite. `PlanProposal` keeps D-C6's order; the editor's section becomes `<Disclosure label="Adjust sessions" defaultOpen={isMdUp}>`. A 409 opens it and focuses the first `[data-conflicted]` row's first control. The e2e journeys that drive the editor (`plan-flow.spec.ts`, `study-plan.spec.ts`, `schedule.spec.ts`) run at desktop widths where it is open by default; the 320 px journey in `plan-flow.spec.ts` gains one step (open the disclosure) if accepted.

## Scope

**In:** `shared/ui/Disclosure.tsx` (new, if none exists — check `shared/ui` first) + test; `PlanProposal.tsx` wraps the editor; conflict → open + focus rule; tests; the one e2e step; copy audit.
**Out:** `PlanSessionEditor` internals; rendering on the EP15 grid (BL-16-02); any API change (D16-13); the desktop layout beyond the default-open rule.

## Source requirement references

AC-E16-06 (editing kept), AC-E16-12, D16-12. TR-E16-01, TR-E16-05. DoD-1, 5, 6, 7, 8.

## Acceptance criteria

1. Below `md` the proposal renders summary → calibration note → week → **Adjust sessions** (collapsed) → What this plan keeps → Moved forward → warnings; **Use this plan** and **Not now** stay in the header. Opening the disclosure reveals the unchanged `PlanSessionEditor`; state persists while the surface is mounted.
2. At `md`+ the disclosure is open by default (D-K2) so desktop behaviour and every existing test are unchanged.
3. On a 409 the disclosure opens (if closed), the conflict summary renders once (D-C11) and focus moves to the first control of the first `[data-conflicted]` row; the row is in view.
4. The disclosure button has a visible label, `aria-expanded`, `aria-controls`, a 44 px target below `sm`, the shared focus ring, and no entrance animation without a `motion-reduce:` companion. Every string passes `expectNoForbiddenWords`.

## Tests (TR-E16-01, TR-E16-05)

- `Disclosure.test.tsx` (new): `toggles aria-expanded and content on click, Enter and Space`; `honours defaultOpen`; `exposes aria-controls to the panel`.
- `PlanProposal.test.tsx`: `collapses the editor below md and keeps the D-C6 order`; `opens the editor by default at md+ (existing cases unchanged)`; `a 409 opens the disclosure and focuses the first conflicted row`; `passes the copy audit with the editor collapsed and open`.
- `plan-flow.spec.ts` 320 px case: one added step (open **Adjust sessions**) before the lock-toggle assertions, if accepted.

## Technical notes

- **Inspected (2026-11-18, HEAD `90161c0`):** `PlanProposal.tsx` renders `PlanWeek` → `PlanSessionEditor` → conflict summary (`data-testid="conflict-summary"`) → `WhatThisKeepsCard` → `MovedForwardList` → `WorkloadWarnings`; `PlanSessionEditor` marks conflicted rows with `data-conflicted` and `border-danger`; `useMediaQuery(MD_UP_QUERY, true)` exists since EP16E (`shared/lib/useMediaQuery.ts`). No shared disclosure component exists in `shared/ui` (grep `aria-expanded` finds only menus and the header).
- **Design:** `Disclosure({ id, label, defaultOpen, open?, onOpenChange?, children })` — controlled when `open` is given, so `PlanProposal` can force it open on a 409 (`useEffect` on `conflicts.length > 0`). Focus move: `document.querySelector('[data-conflicted] input, [data-conflicted] button')?.focus()` after open, inside the same effect, `scrollIntoView({ block: 'nearest' })`.
- **API need:** none.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-K1 | Accept into EP16's review unit: (a) accept (with a refiner pass for the UI half); (b) defer to backlog beside BL-16-02 | **(a)** — the highest-value upgrade of the set, and EP16E made the phone layout part of this epic's contract; the implementation is a wrapper, the risk is copy and default-state, which the refiner settles | Proposed |
| D-K2 | Default state: (a) collapsed below `md`, open at `md`+; (b) collapsed everywhere; (c) collapsed only when the proposal has more than N sessions | **(a)** — desktop keeps its tests and habits; phones get the one-screen proposal; (c) adds a rule a student cannot predict | Proposed |
| D-K3 | Label: (a) **Adjust sessions**; (b) **Edit times**; (c) **Fine-tune** | **(a)** — says what the controls do (move, shorten, delete, pin); refiner may change | Proposed |

## Definition of Done

1, 5, 6, 7, 8 (TR-E16-01/05). 2, 3, 4, 9 N/A. 10–11 via the EP16 combined review (if accepted).

## Sizing

- **Outcome:** on a phone the proposal reads summary → week → decision, with the controls one tap away.
- **Size:** about half a window after refinement. No split.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/src/shared/ui/Disclosure.tsx` (new, + test), `apps/web/src/features/plan-proposal/ui/PlanProposal.tsx` (+ test), `apps/web/e2e/plan-flow.spec.ts` (one step).
- **Start context:** this story; EP16C's record (§ AC2, D-C6, D-C11); `PlanProposal.tsx`; `PlanSessionEditor.tsx:140-160` (row markup, `data-conflicted`); `useMediaQuery.ts`.
- **Verification:** `npx vitest run src/features/plan-proposal src/shared/ui`; tsc + eslint clean; `plan-flow.spec.ts` once; manual at 360 × 640.
- **Dependencies / exclusions:** EP16C, EP16E. Grid rendering → BL-16-02.
