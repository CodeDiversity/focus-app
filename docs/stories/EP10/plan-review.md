# EP10 Plan Review — UI Design System & Visual Refresh

**Review type:** Plan review (whole-plan, read-only)
**Date:** 2026-10-29
**Pass:** 1
**Reviewed state:** working tree (no shell available; commit hash not retrieved; reviewed against the working tree as of 2026-10-29)
**Reviewed paths:**
- `docs/epics/EP10-ui-design-system-and-visual-refresh.md`
- `docs/epics/README.md` (EP10 row, M5, shared DoD)
- `docs/stories/EP10/README.md` (breakdown, queue, traceability, contract, decisions, quality gate)
- `docs/stories/EP10/EP10A..EP10G-*.md`
- `docs/stories/EP04/README.md` and `SP-127B` / `SP-128B` / `SP-129A` story files + implementation records + parent reviews (dependency verification)
- `apps/web/tailwind.config.js`, `apps/web/src/index.css`, `apps/web/src/shared/ui/*`, `apps/web/src/widgets/{header,layout}/*`, `apps/web/src/pages/*`
- `.agents/planning-checklist.md`, `.agents/story-sizing.md`, `.agents/delivery-state.md`
**Scope:** Whole EP10 plan (seven children, EP10A–EP10G). No implementation has started for EP10.
**Limitations:** No shell access in this review runtime, so no tests were run and no commit hash was retrieved (plan review does not require execution). Code paths were inspected via file reads/globs. EP04 dependency status was verified through story files, implementation records, and parent review reports, not through Git.

---

## Verdict

**Draft** — the breakdown is complete, internally consistent, and structurally sound (all seven epic ACs and five TRs mapped; DoD mapped with justified N/A reasons; one shared provisional design-token contract; one sequential `implementer` owner; seven substantive children). However, the plan is not ready to code for EP10A–EP10C because the material token/primitive/shell decisions (D10-4…D10-9) are deliberately deferred to the `ui-refiner` pass (D10-3), and one status-accuracy correction (PR-001) must be applied before implementation. EP10D–EP10G are mechanical adoption and are unblocked once EP10C lands, subject to PR-001's reconciliation.

The verdict is **not** `Plan Ready`: planning-checklist row 8 (Material decisions) is `Blocked` by design for EP10A–EP10C, and PR-001 is an open should-fix.

---

## Findings

### Should-fix

#### PR-001 — EP04 dependency status is stale/inconsistent (docs reconciliation)

- **Auditor ref:** F-EP10-01 (the auditor's claim that "only SP-127B implemented" is itself outdated — see verification below).
- **Original claim/gap:** `EP10F` (Dependencies, Technical notes) and the `EP10` README queue/gate state that the EP04 frontend children (SP-127B, SP-128B, SP-129A) are "implemented" / "implemented, awaiting parent review". The `EP04` README queue still lists SP-128B and SP-129A as `Needs refinement`, and the `SP-128B` story file's `Status` line still reads `Ready … not implemented`.
- **Independent verification:** The story files, implementation records, and parent review reports show:
  - `SP-127B` — `Status: Implemented — awaiting parent review`; parent review `SP-127` = **PASS** (pass 3).
  - `SP-128B` — implementation record `./artifacts/SP-128B/implementation.md` states "Implementation complete — awaiting parent review"; parent review `SP-128` = **PASS**; but the story file `Status` line was not updated and the `EP04` README queue row is stale.
  - `SP-129A` — `Status: Reviewed (2026-10-29)`; parent review `SP-129` = **PASS** (pass 3).
  - So the EP04 calendar/availability pages are **implemented and parent-reviewed**, not merely "implemented" and not "Needs refinement".
- **File/section:** `docs/stories/EP04/README.md` (execution queue rows 28–29, Status line, quality gate); `docs/stories/EP04/SP-128/SP-128B-availability-settings-ui.md` (Status line); `docs/stories/EP10/EP10F-calendar-and-availability-pages-adoption.md` (Dependencies, Technical notes, Sizing); `docs/stories/EP10/README.md` (queue row EP10F, quality gate row 7).
- **Consequence:** Implementers reading the `EP04` README would believe SP-128B/SP-129A are unrefined; `EP10F`'s dependency looks unmet or under-stated; the `EP04` README's `Draft` status no longer matches reality. This is exactly the queue/code drift the delivery-state contract requires reconciling.
- **Suggested correction:** Reconcile the `EP04` README queue and the `SP-128B` story `Status` line to the actual parent-reviewed state (SP-127A/B, SP-128A/B: `Implemented — awaiting parent review` → `Reviewed` where the parent review passed; SP-129A: `Reviewed`). Update `EP10F`'s dependency to "EP04 frontend children (SP-127B, SP-128B, SP-129A) implemented **and parent-reviewed**", and update the `EP10` README quality-gate row 7 and queue row EP10F accordingly. Note in `EP10F` that the EP04 pages are reviewed, so restyling carries no pending EP04 UI changes (low rework risk).
- **Closure condition:** `EP04` README queue rows + `SP-128B` Status line match the implementation records/parent reviews; `EP10F` dependency cites reconciled evidence.

### Polish (optional, non-blocking)

#### PR-002 — EP10D says "six" public/auth surfaces but lists seven

- **Auditor ref:** F-EP10-02.
- **File/section:** `docs/stories/EP10/EP10D-public-and-auth-pages-adoption.md` AC #1 ("All six public/auth surfaces"), Sizing ("six surfaces"), Technical notes (lists seven dirs: `home, login, register, forgot-password, reset-password, verify-email, onboarding`).
- **Fix:** change "six" to "seven" in AC #1 and Sizing. The epic scope lists the same seven surfaces.

#### PR-003 — E2E scope does not cover dashboard/profile (record honestly)

- **Auditor ref:** F-EP10-05.
- **File/section:** `docs/stories/EP10/EP10G-dashboard-and-profile-adoption.md` AC #6, TR-E10-03 ownership, Sizing; `docs/stories/EP10/README.md` traceability (TR-E10-03).
- **Observation:** The E2E suite (`auth-journeys`, `assignments-list`, `calendar`, `semesters-courses`, `login`) contains no dashboard or profile spec. So `EP10G`'s final E2E verification (TR-E10-03) exercises auth/assignments/calendar/semesters-courses but not dashboard/profile adoption. Dashboard/profile adoption is covered only by unit tests + manual pass.
- **Suggested correction:** State explicitly in `EP10G` that dashboard/profile adoption is verified by unit tests and a manual pass, not by E2E, and that any E2E expansion is an EP09-scope decision requiring approval (do not silently expand).

#### PR-004 — Contrast record placement in EP10A

- **Auditor ref:** F-EP10-06.
- **File/section:** `docs/stories/EP10/EP10A-design-tokens-and-theme-foundation.md` AC #6 ("Token text/background pairs meet WCAG 2.2 AA contrast (recorded values)"); UI/UX gaps.
- **Suggested correction:** Specify the contrast record's home (the `ui-refiner` decision register on EP10A, plus the implementation record) so "recorded values" is a concrete, inspectable artifact rather than an unspecified note. Values themselves remain the `ui-refiner`'s job (D10-3).

#### PR-005 — AC count >5 (optional tightening)

- **File/section:** `EP10A` (6 ACs), `EP10B` (6), `EP10C` (6), `EP10G` (6).
- **Observation:** Story sizing notes >5 ACs as a signal to inspect. Here the extra criteria are a11y/responsive/reduced-motion DoD obligations attached to each surface, not separate outcomes, and they are legitimate. No split is required. Optionally group the a11y/responsive/reduced-motion criteria into a single "accessibility & responsiveness" AC per story for readability; not required for readiness.

#### PR-006 — EP10A focus-ring verification (polish)

- **File/section:** `docs/stories/EP10/EP10A-...md` DoD item 6 ("Not applicable — focus styles retained (verified in EP10B/C)"); `index.css` base `button/input/select` focus rings use `primary-500`.
- **Observation:** EP10A tokenizes the focus-ring color (semantic `focus-ring`), so focus visibility is partly an EP10A concern even though primitives verify behavior in EP10B/C. Recommend EP10A include a quick verification that the focus-ring token meets contrast on the surfaces it appears on. Optional.

### By design (not defects)

- **EP10A/B/C `Needs refinement` pending `ui-refiner` (D10-3).** This is the recorded, intended next step, not a planning gap. The `ui-refiner` pass records palette/typography/spacing/radius/shadow/motion/variants/shell layout (D10-4…D10-9) before implementation. The plan cannot be `Plan Ready` for those children until that happens; this review concurs with the breakdown's `Draft` status. It is not a `Needs Decision` item — no user decision is outstanding; the work is assigned to the `ui-refiner`.
- **Dark mode out of scope unless the `ui-refiner` records it (D10-9).** Acceptable MVP boundary.
- **Conditional primitives (Card/Dialog/Badge/EmptyState) in EP10B** ("only if the `ui-refiner` records a need"). Adoption stories must not assume a primitive exists that EP10B did not introduce; the plan already frames these as "if introduced". No change needed, but implementers should treat the primitive set as EP10B's output, not a precondition.

---

## Requirement / DoD planning-coverage summary

### Epic AC coverage (all 7 mapped)

| Epic AC | Stable ID | Owner | Status |
|---|---|---|---|
| Documented token set drives all styling | AC-E10-01 | EP10A (tokens), EP10B–G (consume) | Covered |
| Shared primitives with variants/sizes/states | AC-E10-02 | EP10B | Covered |
| Refreshed, usable app shell (desktop+mobile, keyboard) | AC-E10-03 | EP10C | Covered |
| All pages refreshed, no functional regression | AC-E10-04 | EP10D, E, F, G | Covered |
| Consistent loading/empty/error states | AC-E10-05 | EP10B (primitives), D–G (apply) | Covered |
| WCAG 2.2 AA + reduced motion | AC-E10-06 | EP10A (tokens), B, C, D–G | Covered |
| No backend/API changes unless flagged | AC-E10-07 | All (flag only) | Covered |

### Test requirements (TR-E10-01…05)

| TR | Requirement | Owner | Status |
|---|---|---|---|
| TR-E10-01 | Primitive component tests | EP10B | Covered |
| TR-E10-02 | Existing page/component tests still pass | EP10D–G | Covered |
| TR-E10-03 | EP09 E2E journeys still pass | EP10G (final verification owner) | Covered, with the scope caveat in PR-003 |
| TR-E10-04 | Manual a11y review recorded | EP10C, D, E, F, G | Covered |
| TR-E10-05 | Reduced-motion verification | EP10A, B, C | Covered |

### Shared DoD applicability

| DoD | Applicability | Verdict |
|---|---|---|
| 1 Functional criteria | All children | Mapped |
| 2 Invalid-input validation | N/A — no new input; existing validation unchanged | Justified |
| 3 Student data scoping | N/A — no data access changes | Justified |
| 4 Actionable API errors | N/A — no API changes; existing error copy preserved | Justified |
| 5 Loading/empty/error states | EP10B, D, E, F, G | Mapped |
| 6 Keyboard accessibility | EP10B, C, D, E, F, G (EP10A: focus-ring token, see PR-006) | Mapped (with polish note) |
| 7 Responsive layouts | EP10C, D, E, F, G | Mapped |
| 8 Automated tests | EP10B (primitive tests), D–G (page tests + TR-E10-03) | Mapped |
| 9 API/migration documentation | N/A — no API or migration changes | Justified |
| 10 Integrated review | Combined EP10 parent review (all seven children) | Mapped |
| 11 Reviewer walkthrough | Reviewer, once for the EP10 parent review unit | Mapped |

### Sizing / granularity

Seven children, each with a sizing block (outcome, estimate 1–3 requests/tokens, model recommendation, files, start context, verification, dependencies/exclusions). Estimates: EP10A 1–2, EP10B 2–3, EP10C 2–3, EP10D 2–3, EP10E 2–3, EP10F 2–3, EP10G 2–3. Each child has substantive independent work (tokens, primitives, shell, four adoption groups). No README/status/evidence-only children. Splits are by layer/surface and page group, not by layer label alone. Atomic invariants preserved (visual-only adoption; no backend). **Pass.**

### Contracts

One shared design-token contract (provisional) in `docs/stories/EP10/README.md`: stable token *names/roles*, values deferred to `ui-refiner` (D10-3, D10-4…D10-9). EP10A implements, EP10B–G consume, parent review verifies end to end. Legacy class names retained (D10-7) for incremental adoption. **Pass** (contract consistency), with the by-design `Blocked` material-decisions row noted above.

### Dependency mapping

| Child | Declared deps | Verified status |
|---|---|---|
| EP10A | None | Ready to refine (ui-refiner first) |
| EP10B | EP10A | Correct |
| EP10C | EP10B | Correct |
| EP10D | EP10C | Correct (pages exist) |
| EP10E | EP10C + pages exist | Correct (semesters/courses/assignments pages exist) |
| EP10F | EP10C + EP04 frontend pages | Substantively satisfied — pages implemented **and parent-reviewed** (see PR-001) |
| EP10G | EP10C + dashboard/profile exist | Correct (pages exist) |

Sequencing one writer: EP10A → B → C → D → E → F → G. EP10D–G independent once EP10C lands. **Pass** (with PR-001 reconciliation).

### Code paths inspected

Baseline verified against the repo: `apps/web/tailwind.config.js` (primary/secondary blue palette, Inter), `apps/web/src/index.css` (base styles, `.btn*`/`.card`/`.input-error`/`.error-message`, focus-visible), `apps/web/src/shared/ui/{Button,Input,Select}.tsx` (+ `Button.test.tsx`), `apps/web/src/widgets/{header,layout}/ui/*`, `apps/web/src/pages/*` (all 14 route dirs including calendar/availability), `apps/web/.eslintrc.cjs` (FSD enforcement). Unverified (by design): exact token values, primitive variants, shell layout — for the `ui-refiner` (D10-3); no browser screenshots taken. **Pass** (with disclosed unverified items).

### Security / privacy / accessibility invariants

Presentation-only; no new credential or tenancy surface. Invariants table in the breakdown (keyboard operability, functional behavior, reduced motion) with counterexamples and owning tests. **Pass.**

---

## Handoff to planner

1. **PR-001 (should-fix):** Reconcile the `EP04` README queue + `SP-128B` Status line to the parent-reviewed state; update `EP10F` dependency and the `EP10` README queue/gate rows to "implemented and reviewed". This is a docs-only reconciliation; it does not block EP10 planning but must land before implementation to avoid status drift.
2. **PR-002 (polish):** `EP10D` "six" → "seven".
3. **PR-003 (polish):** `EP10G` state the E2E scope gap honestly (no dashboard/profile E2E).
4. **PR-004 (polish):** `EP10A` specify the contrast record's location.
5. **PR-005/PR-006 (optional):** AC grouping; EP10A focus-ring verification note.
6. **By design:** Run the `ui-refiner` on `EP10A` (then `EP10B`, `EP10C`) to record D10-4…D10-9 before implementation; only then can the verdict move to `Plan Ready`.

**Next actionable:** `ui-refiner` pass on EP10A (D10-3), then implement. No implementation should start on EP10A–EP10C before that pass. EP10D–EP10G remain `Queued` behind EP10C.
