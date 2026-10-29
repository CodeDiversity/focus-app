# EP10 Plan Review — UI Design System & Visual Refresh

**Review type:** Plan review (whole-plan, read-only)
**Date:** 2026-10-29
**Pass:** 2 (re-review after planner reconciliation PC-EP10-01…PC-EP10-06)
**Reviewed state:** working tree (no shell available in this review runtime; commit hash not retrieved; plan review does not require execution or a commit hash)
**Reviewed paths:**
- `docs/epics/EP10-ui-design-system-and-visual-refresh.md`
- `docs/epics/README.md` (EP10 row, M5, shared DoD)
- `docs/stories/EP10/README.md` (breakdown, queue, traceability, contract, decisions, correction log, quality gate, autopilot checkpoint)
- `docs/stories/EP10/EP10A..EP10G-*.md`
- `docs/stories/EP04/README.md` (reconciled execution queue, quality gate)
- `docs/stories/EP04/SP-127/SP-127A..B`, `SP-128/SP-128A..B`, `SP-129/SP-129A` story files (Status lines)
- `docs/stories/EP04/SP-127/artifacts/SP-127/review.md`, `SP-128/artifacts/SP-128/review.md`, `SP-129/artifacts/SP-129/review.md` (dependency verification)
- `apps/web/tailwind.config.js`, `apps/web/src/index.css`, `apps/web/src/shared/ui/*`, `apps/web/src/widgets/{header,layout}/*`, `apps/web/src/pages/*`
- `.agents/planning-checklist.md`, `.agents/story-sizing.md`, `.agents/delivery-state.md`, `.agents/review-cadence.md`
**Scope:** Whole EP10 plan (seven children, EP10A–EP10G). No implementation has started for EP10.
**Limitations:** No shell access in this review runtime, so no tests were run and no commit hash was retrieved (plan review does not require execution). Code paths were inspected via file reads/globs. EP04 dependency status was verified through story files, implementation records, and parent review reports, not through Git. This pass is a re-review: PR-001…PR-006 from pass 1 are re-verified against the reconciled documents rather than re-derived.

---

## Verdict

**Draft** — unchanged from pass 1 in substance: the breakdown is complete, internally consistent, and structurally sound (all seven epic ACs and five TRs mapped; DoD mapped with justified N/A reasons; one shared provisional design-token contract; one sequential `implementer` owner; seven substantive children). The docs reconciliation requested in pass 1 (PR-001) is now **closed**: the EP04 dependency status is accurate and EP10F/EP10 README cite the reconciled evidence. The five polish items (PR-002…PR-006) are also **closed** with documented dispositions. No new should-fix or blocker finding is raised in this pass.

The verdict is **still not** `Plan Ready`: planning-checklist row 8 (Material decisions) remains `Blocked` by design for EP10A–EP10C, because the material token/primitive/shell values (D10-4…D10-9) are deliberately deferred to the `ui-refiner` pass (D10-3). That is an assigned, in-progress prerequisite, not an open plan defect, and it is not a `Needs Decision` item (no user decision is outstanding; the work belongs to the `ui-refiner`). The plan cannot advance to `Plan Ready` until the `ui-refiner` records those decisions on EP10A, then EP10B, then EP10C. EP10D–EP10G remain `Queued` behind EP10C.

Net change vs. pass 1: **PR-001 closed** (was the only should-fix); PR-002…PR-006 closed (were polish). Zero open findings remain.

---

## Findings (pass 1 → pass 2 disposition)

### Should-fix

#### PR-001 — EP04 dependency status stale/inconsistent (docs reconciliation) — **RESOLVED (pass 2)**

- **Pass-1 severity:** Should-fix.
- **Original gap:** `EP10F` and the `EP10` README claimed the EP04 frontend children (SP-127B, SP-128B, SP-129A) were "implemented"/"implemented, awaiting parent review", while the `EP04` README queue still listed SP-128B/SP-129A as `Needs refinement` and the `SP-128B` story `Status` read `Ready … not implemented`.
- **Independent verification (pass 2):**
  - `docs/stories/EP04/README.md` execution queue rows 25–29 now read: SP-127A `Reviewed (pass 3)`, SP-127B `Reviewed (pass 3)`, SP-128A `Reviewed`, SP-128B `Reviewed (pass 1) — F-B-6 fix round open (fix applied, verification pending)`, SP-129A `Reviewed (pass 3)`. `Status`/`Next substory` lines and the quality-gate row 7/8 match ("implemented and parent-reviewed: SP-127 pass 3, SP-128 pass 1 with SP-128B F-B-6 fix round open, SP-129 pass 3").
  - `docs/stories/EP04/SP-128/SP-128B-availability-settings-ui.md` `Status` line now reads `Reviewed (pass 1) — F-B-6 fix round open (fix applied, verification pending)` with the parent-review reference, replacing the stale `Ready … not implemented`.
  - Parent review reports independently confirm the cited verdicts: `SP-127/artifacts/SP-127/review.md` = **PASS** (pass 3); `SP-128/artifacts/SP-128/review.md` = **PASS** (pass 1, with IR-001 routed outside scope and IR-002 polish); `SP-129/artifacts/SP-129/review.md` = **Pass** (pass 3). SP-128B's F-B-6 fix round (vitest + visual re-check of the kind-selector modal) is explicitly tracked as open and is re-verified by EP10F during adoption.
  - `docs/stories/EP10/EP10F-calendar-and-availability-pages-adoption.md` Dependencies (line 10), Technical notes (line 58), and Sizing (line 97) now state "implemented and parent-reviewed — SP-127 (pass 3), SP-128 (pass 1, SP-128B with the F-B-6 fix round open), SP-129 (pass 3)" and note that EP10F re-verifies the F-B-6 fix alongside token adoption.
  - `docs/stories/EP10/README.md` queue row EP10F (line 30) and quality-gate row 7 (line 180) use the same reconciled wording.
- **Closure condition (pass 1):** met — EP04 README queue rows + SP-128B Status line match the implementation records/parent reviews; EP10F dependency cites reconciled evidence.
- **Status:** Closed. No further action required; the planner's PC-EP10-01 disposition is corroborated by independent file inspection.

### Polish (optional, non-blocking) — all RESOLVED (pass 2)

#### PR-002 — EP10D "six" vs seven public/auth surfaces — **RESOLVED (pass 2)**

- **Pass-1 severity:** Polish.
- **Independent verification:** `docs/stories/EP10/EP10D-public-and-auth-pages-adoption.md` AC #1 now reads "All **seven** public/auth surfaces render with the refreshed system" (line 42); Sizing (line 89) reads "seven surfaces, tests"; Technical notes (line 57) lists the seven directories. The EP10 README code baseline (line 139) lists the same seven. Count is now consistent across AC, Sizing, Technical notes, and baseline.
- **Status:** Closed (PC-EP10-02).

#### PR-003 — E2E scope does not cover dashboard/profile (record honestly) — **RESOLVED (pass 2)**

- **Pass-1 severity:** Polish.
- **Independent verification:** `docs/stories/EP10/EP10G-dashboard-and-profile-adoption.md` AC #6 (line 46) now states explicitly that the EP09 E2E suite (`auth-journeys`, `assignments-list`, `calendar`, `semesters-courses`, `login`) covers auth/assignments/calendar/semesters-courses only, contains no dashboard/profile spec, and that dashboard/profile adoption is verified by unit tests + manual pass; any E2E expansion is an EP09-scope decision requiring approval (no silent spec addition). Tests section (line 51) repeats the scope caveat. `docs/stories/EP10/README.md` TR-E10-03 row (line 80) carries the same caveat.
- **Status:** Closed (PC-EP10-03).

#### PR-004 — Contrast record placement in EP10A — **RESOLVED (pass 2)**

- **Pass-1 severity:** Polish.
- **Independent verification:** `docs/stories/EP10/EP10A-design-tokens-and-theme-foundation.md` AC #6 (line 47) now names two concrete, inspectable homes for the recorded contrast values: (a) the `ui-refiner` decision register on EP10A (D10-3/D10-4 palette mapping with per-pair ratios) and (b) the EP10A implementation record under `./artifacts/EP10A/`. DoD item 6 (line 81) cross-references the same two locations for the `focus-ring` token check. Exact values remain the `ui-refiner`'s job (D10-3).
- **Status:** Closed (PC-EP10-04).

#### PR-005 — AC count >5 (optional tightening) — **RESOLVED (pass 2) (decision recorded)**

- **Pass-1 severity:** Polish (optional).
- **Disposition recorded (PC-EP10-05):** retain the ACs as-is; no grouping. The extra criteria in EP10A (6), EP10B (6), EP10C (6), EP10G (6) are legitimate DoD obligations (a11y/focus/reduced-motion/responsive) attached to each surface, not separate outcomes; grouping them into a single "accessibility & responsiveness" AC would obscure traceability to DoD items 6/7/8 and AC-E10-06. Revisit only if a future refinement makes grouping clearer.
- **Independent verification:** the AC lists in EP10A/B/C/G are unchanged and each maps 1:1 to a DoD item and/or source AC-E10-06; the rationale is recorded in the correction log. No split or grouping is required for readiness.
- **Status:** Closed (PC-EP10-05). Reviewer accepts the recorded decision; no further change requested.

#### PR-006 — EP10A focus-ring verification — **RESOLVED (pass 2)**

- **Pass-1 severity:** Polish.
- **Independent verification:** `docs/stories/EP10/EP10A-design-tokens-and-theme-foundation.md` DoD item 6 (line 81) now assigns the token-level check to EP10A (quick verification that the `focus-ring` semantic token meets WCAG 2.2 AA contrast against `surface`, `background`, `surface-muted`, recorded alongside the contrast record per AC #6) while component-behavior verification stays in EP10B/C. This matches the shared contract (`focus-ring` semantic token) and AC #6's recorded-values locations.
- **Status:** Closed (PC-EP10-06).

### By design (not defects) — unchanged from pass 1

- **EP10A/B/C `Needs refinement` pending `ui-refiner` (D10-3).** Intended next step; palette/typography/spacing/radius/shadow/motion/variants/shell layout recorded before implementation. Plan cannot be `Plan Ready` for those children until that happens. Not a `Needs Decision` item.
- **Dark mode out of scope unless the `ui-refiner` records it (D10-9).** Acceptable MVP boundary.
- **Conditional primitives (Card/Dialog/Badge/EmptyState) in EP10B** ("only if the `ui-refiner` records a need"). Adoption stories must not assume a primitive EP10B did not introduce; plan already frames these as conditional. No change needed.

---

## Requirement / DoD planning-coverage summary (unchanged from pass 1; re-verified)

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
| TR-E10-03 | EP09 E2E journeys still pass | EP10G (final verification owner) | Covered, with the scope caveat in PR-003 (auth/assignments/calendar/semesters-courses only; dashboard/profile by unit tests + manual pass) |
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
| 6 Keyboard accessibility | EP10B, C, D, E, F, G (EP10A: focus-ring token, see PR-006) | Mapped |
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
| EP10F | EP10C + EP04 frontend pages | Substantively satisfied — pages implemented **and parent-reviewed** (SP-127 pass 3, SP-128 pass 1 with SP-128B F-B-6 fix round open, SP-129 pass 3); EP10F re-verifies the F-B-6 fix during adoption |
| EP10G | EP10C + dashboard/profile exist | Correct (pages exist) |

Sequencing one writer: EP10A → B → C → D → E → F → G. EP10D–G independent once EP10C lands. **Pass** (with PR-001 reconciliation closed).

### Code paths inspected

Baseline verified against the repo: `apps/web/tailwind.config.js` (primary/secondary blue palette, Inter), `apps/web/src/index.css` (base styles, `.btn*`/`.card`/`.input-error`/`.error-message`, focus-visible), `apps/web/src/shared/ui/{Button,Input,Select}.tsx` (+ `Button.test.tsx`), `apps/web/src/widgets/{header,layout}/ui/*`, `apps/web/src/pages/*` (all 14 route dirs including calendar/availability), `apps/web/.eslintrc.cjs` (FSD enforcement). Unverified (by design): exact token values, primitive variants, shell layout — for the `ui-refiner` (D10-3); no browser screenshots taken. **Pass** (with disclosed unverified items).

### Security / privacy / accessibility invariants

Presentation-only; no new credential or tenancy surface. Invariants table in the breakdown (keyboard operability, functional behavior, reduced motion) with counterexamples and owning tests. **Pass.**

---

## Residual items (not EP10 plan defects; recorded for completeness)

1. **EP04 epic-level README staleness (planner-owned).** The SP-129 parent review (pass 3) flagged that `docs/stories/EP04/README.md` epic-level lines still describe SP-129A (and SP-128B) as `Needs refinement` even though the story-level records and queue rows are `Reviewed`. This is an EP04 planner-owned documentation item, not an EP10 defect, and it does not invalidate EP10F's dependency (which cites the story-level reviewed state). Flagged for the planner; not edited here (outside this review's scope and write boundary).
2. **SP-128B F-B-6 fix round open.** Tracked in `SP-128/README.md` and `SP-128B`'s checkpoint (vitest + visual re-check of the kind-selector modal pending). EP10F's Technical notes (line 58) and Sizing (line 97) already account for re-verifying the F-B-6 fix alongside token adoption. No EP10 plan change required; the dependency note is accurate as written.
3. **EP10A/B/C `ui-refiner` pass (D10-3) not yet run.** This is the recorded next step and the sole remaining gate to `Plan Ready`. It is an assigned prerequisite, not an open finding; no user decision is outstanding.

---

## Handoff to planner

1. **PR-001 (should-fix): CLOSED** — EP04 README queue + SP-128B Status line + EP10F dependency + EP10 README queue/gate rows all reconciled to the parent-reviewed state. No further action.
2. **PR-002 (polish): CLOSED** — EP10D "six" → "seven".
3. **PR-003 (polish): CLOSED** — EP10G states the E2E scope gap honestly; README TR-E10-03 row carries the caveat.
4. **PR-004 (polish): CLOSED** — EP10A specifies the contrast record's location (ui-refiner decision register + implementation record).
5. **PR-005 (optional): CLOSED (decision recorded)** — ACs retained as-is; rationale documented.
6. **PR-006 (polish): CLOSED** — EP10A DoD item 6 adds the focus-ring token contrast check.
7. **By design:** Run the `ui-refiner` on `EP10A` (then `EP10B`, `EP10C`) to record D10-4…D10-9 before implementation; only then can the verdict move to `Plan Ready`. EP10D–EP10G remain `Queued` behind EP10C.
8. **Residual (planner-owned, informational):** EP04 epic-level README lines describing SP-128B/SP-129A as `Needs refinement` (see residual item 1); reconcile when convenient. Does not block EP10.

**Next actionable:** `ui-refiner` pass on EP10A (D10-3), then implement. No implementation should start on EP10A–EP10C before that pass. EP10D–EP10G remain `Queued` behind EP10C. Zero open findings remain after this pass.