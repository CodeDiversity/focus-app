# EP11 Plan Review — Navigation & Information Architecture (ADHD-friendly)

**Review:** Pass 1 (first independent whole-plan review; no prior `plan-review.md` existed — confirmed by directory listing and the README correction log)
**Date:** 2026-10-31
**Reviewer:** independent plan reviewer (fresh context, autopilot-dispatched `EP11-plan-review-1`, graph edge `plan_not_ready`)
**Reviewed at:** commit `7ac3828` on `main` (working tree; the only dirty paths per the coordinator handoff are `.agents/skills/autopilot/SKILL.md` and `.agents/workflow-graph.md` — another contributor's work, not inspected, not attributed to this review)
**Parent-review-unit baseline:** `3853aaa`
**Review mode:** Plan review, **partial delivery** — EP11A is implemented (`b7ae794` + `1aec0ea`) and treated as fact, not re-planned. This review assesses the whole plan and its fitness for the **remaining work**: EP11B implementation + the combined EP11 parent review.

**Reviewed paths:** `docs/epics/EP11-navigation-and-information-architecture.md`, `docs/epics/README.md` (shared DoD), `docs/stories/EP11/README.md`, `EP11A-*.md`, `EP11B-*.md`, `artifacts/EP11A/implementation.md`, `artifacts/EP11A/checkpoint.md`; independently inspected code: `apps/web/src/widgets/header/ui/navGroups.ts`, `Header.tsx`, `Header.test.tsx`, `apps/web/src/widgets/layout/ui/Layout.tsx`, `apps/web/src/app/App.tsx` (routes), `apps/web/src/index.css` (reduced motion); cross-epic evidence: `docs/stories/EP06/EP06F-*.md`, `docs/stories/EP06/artifacts/EP06F/implementation.md`, `docs/stories/EP06/README.md`, `docs/stories/EP06/artifacts/EP06/review.md`; raw `.git/HEAD` and `.git/logs/HEAD` (reflog) for commit provenance.

**Limitations (honest execution disclosure):** this session had no shell tool and subagent delegation was depth-blocked (attempted and disclosed). No test/lint/typecheck re-run was performed by the reviewer; all automated-run results below are implementer-recorded evidence, labelled as such, never inferred as reviewer-executed. Commit *contents* could not be unpacked from raw Git objects; commit identity/order was verified via the reflog and records, which is provenance, not blob-level proof. No browser, screen-reader or WCAG interaction evidence was attempted (manual gate assigned to the combined parent review — see TR handling).

## Verdict: **Changes Required**

The plan's structure is sound — child separation, sizing, AC/TR ownership, dependency order, single-writer model, integration ownership and the EP10C-reuse decisions all hold up against the actual code. The refinement blocker that made the planner's 2026-10-29 quality gate `Draft` (D11-3) is verifiably closed. However, since EP11's planning was finalized, the shared nav contract was **legitimately amended by EP06F** (a ratified `Plan` entry in the Planning group), and EP11's plan documents were never reconciled to that ratified state. EP11B's own drift rule ("stop and flag, do not consume an unexpected contract") would therefore plausibly force an unnecessary stop-and-report cycle, and the combined parent review would judge AC-E11-01/05 against a stale IA description. Two should-fix documentation-reconciliation findings remain open (PR-001, PR-002); both are planner-owned and non-structural. Nothing found blocks the *sequence* (EP11B then combined review) or changes any implementation shape.

Once PR-001 and PR-002 are corrected and independently re-verified, this plan is expected to reach `Plan Ready` for the remaining work.

## Findings

| ID | Severity | Owner | Location | Summary |
|---|---|---|---|---|
| PR-001 | Should-fix | planner (docs) → implementer (EP11B test matrix, at implementation time) | epic scope/D11-4; README shared nav contract; EP11B story baseline + test matrix | The shared nav contract carries a ratified EP06F `Plan` (`/plan`) entry that no EP11 document acknowledges; EP11B's baseline description and test matrix under-specify the actual contract, and its stop-and-report drift rule collides with this ratified state; a real desktop-vs-mobile drift exists today |
| PR-002 | Should-fix | planner (coordinator may apply verbatim) | README status line 6, quality-gate row 8, decision register D11-8 | Planning records are unreconciled after the 2026-10-29 passes: the parent `Status:` line still says both children are `Needs refinement`/no implementation, the quality gate still shows row 8 `Blocked` (D11-3), and D11-8 is still marked provisional although both ui-refiner passes resolved it as "keep both" |
| PR-003 | Polish | coordinator/implementer (record only) | `artifacts/EP11A/checkpoint.md:39` | Checkpoint calls EP11B "`Needs refinement`" — stale against `Ready` (queue and story both say `Ready`); historical record, annotate rather than rewrite |
| PR-004 | Polish | implementer (at EP11B time) | EP11B story:104; `Header.tsx:24-25,36-44` | Outside-click closes desktop menus and restores focus to the trigger (story Decision 5 — implementation matches plan); the WCAG-arguable focus-steal on clicks far outside the header should get one deliberate browser check at the parent review |
| PR-005 | Polish | implementer (at EP11B time) | EP11B story:104 | EP11B's full-suite baseline "67 files / 842 tests at EP11A" is dated: the suite was 84/1005 by EP06F and has grown since; treat "full suite green at current HEAD" as the obligation, not that count |

### PR-001 — Shared nav contract drift: the ratified `Plan` entry is invisible to every EP11 document (should-fix)

- **Requirement/source:** EP11 README "Shared nav contract (provisional)" (`README.md:97-103`: Planning = Calendar, Availability only); epic Scope + D11-4 (same wording); EP11B story "Verified baseline" (`EP11B-*.md:112`: "Planning → Calendar/Availability") and its test matrix (`:67-97`); the usage rule "no link may exist in one surface but not the other" (`README.md:107`).
- **Observed gap:** `apps/web/src/widgets/header/ui/navGroups.ts:84` contains `{ id: 'plan', label: 'Plan', icon: CalendarCheck, to: '/plan' }` as a third Planning item. This is **not an unauthorized deviation**: EP06F's story explicitly authorized it as an additive edit to EP11's shared file (`EP06/EP06F-*.md:23,54`), it was implemented 2026-10-30 (`EP06/artifacts/EP06F/implementation.md:19,26` incl. the dependent `Header.test.tsx:201` assertion update, recorded as F-EP06F-01; full web suite 84 suites/1005 tests green — implementer-recorded), and it passed the combined EP06 parent review (`EP06/artifacts/EP06/review.md` lists `navGroups.ts` among reviewed paths; EP06 README:504 ratifies the file as "EP11's shared file… edited additively"). No EP11 document — epic, README contract, D11-4, or EP11B story — reflects it.
- **Consequence (concrete):**
  1. EP11B's risk rule instructs the implementer: "if the implementer needs a new field … that is a contract change — stop and flag rather than editing `navGroups.ts`" (`EP11B-*.md:236`) and "consume as-is; report drift instead of editing the contract" (`:33`). An implementer who finds an undocumented `Plan` item against a story that certifies "Planning → Calendar/Availability" has grounds to halt and route a false alarm — exactly the churn the drift rule is meant to prevent.
  2. EP11B's test matrix never asserts `Plan` (case 1 enumerates only Calendar/Availability in the Planning region, `:70`); its focus-trap note counts "11–12 focusables" (`:239`) — the real grouped drawer will contain **13** authenticated focusables with `Plan` (close, Home, Dashboard, Semesters, Courses, Assignments, Calendar, Availability, **Plan**, Profile, Availability, Verify email, Logout). No listed case fails on `Plan`, so it would silently ship untested in the new surface.
  3. A real production drift exists **today** at HEAD: the legacy drawer list (`Header.tsx:418-431`) omits `/plan` while the desktop Planning dropdown includes it — the one-surface rule is currently violated in a way no EP11 record acknowledges. EP11B's data-driven grouped rendering *fixes* this automatically (the drawer will render `Plan` from the contract), which is desirable — but it means EP11B's merged outcome will contradict its own story text.
  4. At the combined parent review, AC-E11-01 ("grouped sections (Dashboard; Academics; Planning)") and AC-E11-05 would be judged against a plan description that misstates the shipped IA, risking a mis-flagged finding or a missed coverage gap.
- **What is *not* wrong:** EP11A's implementation record (`artifacts/EP11A/implementation.md:13-14`) described Planning → Calendar/Availability truthfully at `b7ae794` (2026-10-29, before `/plan` existed — reflog shows EP06F landed ~21h later). Per delivery-state rules, historical records stay verbatim; the fix is forward reconciliation, not a rewrite.
- **Suggested correction (planner, docs-only):**
  1. EP11 README contract section + epic D11-4/Scope: record that Planning = Calendar, Availability, **Plan** with provenance (EP06F AC 2 + `EP06/artifacts/EP06F/implementation.md` + EP06 parent review PASS 2026-10-30).
  2. EP11B story: correct the baseline description; extend test case 1 to assert `Plan` (`href="/plan"`) inside the Planning region; correct the focus-trap count to 13; note in Risks that the drawer currently lacks `/plan` and EP11B's grouped render restores one-surface parity.
  3. Add a correction-log entry in the EP11 README citing this report.
- **Closure condition:** corrections persisted and independently verified in a re-review at the then-current HEAD (commit hash cited).

### PR-002 — Planning records unreconciled after the (verified) refinement passes (should-fix)

- **Requirement/source:** planning checklist rows 8–9 (decisions resolved with provenance; correction/status reconciliation completeness); delivery-state ("If code/artifacts disagree with the queue, reconcile and record the evidence").
- **Observed gap:** the sole blocker behind the planner's `Draft` quality gate — D11-3 — is verifiably closed: EP11A `Status/Refined` (`EP11A-*.md:9-12`) and EP11B (`EP11B-*.md:9-12`) record ui-refiner + technical-refine passes on 2026-10-29, and the reflog confirms the commits (`254ba68` EP11A ui-refine, `c1bffbf` EP11B ui-refine, `3e0e9ed` + `3853aaa` EP11A refine/Ready, `957cbec` + `698ab00` EP11B refine/Ready). Yet:
  1. `README.md:6` still reads "Planning — two frontend children, both `Needs refinement` … No implementation started" (dispatch confirms this line is known-stale and must not be touched by the reviewer).
  2. `README.md:163` quality-gate row 8 still says **Blocked** (D11-3 + D11-8 provisional).
  3. D11-8 (`README.md:125`, epic register) is still marked "(provisional) … ui-refiner may recommend deduplication" although both passes settled it as **keep both** — Planning canonical + account-menu secondary (EP11A `:155-156`, `:362`; EP11B `:217`, `:275`), consistent with AC-E11-02's wording.
  4. `README.md:144-148` correction log is empty; this report's findings need entries on the passing pass.
- **Consequence:** a downstream reader (planner, jira-sync, or the parent reviewer) acting on the top-level status could mis-select work or re-open a closed gate; the queue table itself is correct, so the risk is misreading, not misexecution.
- **Suggested correction (planner; coordinator may persist verbatim):** refresh the status line to match the queue (EP11A Implemented — awaiting parent review; EP11B Ready), flip quality-gate row 8 to Pass with provenance (refinement commits + this review once passing), and update D11-8 to record the ui-refiner resolution with date.
- **Closure condition:** the three records match the verified queue/refinement state; verified in re-review.

### PR-003 — EP11A checkpoint stale "Needs refinement" line (polish)

`artifacts/EP11A/checkpoint.md:39` names EP11B "`Needs refinement`" — true when the checkpoint was written mid-2026-10-29, superseded by `957cbec`/`698ab00`. The queue is authoritative and correct. Record-only reconciliation (annotate, don't rewrite history). No effect on the ability to execute EP11B.

### PR-004 — Desktop outside-click closes with trigger focus restoration: one deliberate browser check (polish)

`Header.tsx:197-204,315-322` restore focus to the trigger on any outside `mousedown` — exactly what EP11A story Decision 5 settled, so implementation fidelity is **correct**; flagged only because when the user clicks a far-away focusable (a form input mid-tab-navigation), focus briefly bounces to the trigger before the browser applies the click target. Include an explicit negative case in the parent review's manual keyboard pass (open Academics, then click/Tab into a page control) so the behaviour is consciously accepted or consciously raised as a follow-up. No plan or code change is demanded.

### PR-005 — EP11B full-suite baseline count is dated (polish)

`EP11B-*.md:104` says "baseline 67 files / 842 tests at EP11A". Accurate as of `b7ae794`, but EP06F alone recorded 84 suites / 1005 tests and EP07/EP08/EP12 added more since. The implementer should treat "full web suite green at current HEAD" as the gate and record the actual HEAD-relative counts (EP11A's 842 remains valid history).

## Requirement / DoD planning-coverage summary

**AC ownership map (verified against story text and code):**

| Req | Planned owner | Independent assessment at HEAD |
|---|---|---|
| AC-E11-01 grouped sections, icons + text | EP11A (done) / EP11B (mobile) | Desktop satisfied in code+tests (`Header.tsx:520-548`, icons text-paired, aria-hidden); mobile planned; wording understates Planning contents → PR-001 |
| AC-E11-02 account menu contents + removal from flat list | EP11A (done) / EP11B (Account section) | Desktop satisfied: avatar menu with "Signed in as {name}", Profile, Availability, conditional Verify email, Logout (`Header.tsx:283-403`, `navGroups.ts:97-108`); inline desktop cluster removed; mobile Account section planned with identity row. Legacy **drawer** flat list still carries Profile/Availability/Verify/Logout — correctly scoped to EP11B |
| AC-E11-03 desktop dropdowns + avatar, keyboard-operable | EP11A | Implemented + 17 desktop test cases (component semantics, Enter/Space, arrows, Home/End, Escape+restore, Tab close-no-restore, single-open, outside click) — automated runs are implementer-recorded |
| AC-E11-04 mobile grouped drawer, EP10C reuse | EP11B | Plan is precise and code-grounded (branch on `section.items`, `mobile-nav-*` ids, region scoping, exact edits §); drawer mechanism (`Header.tsx:441-488`) is untouched and matches the reuse claim |
| AC-E11-05 no functional regression | both | EP11A: routes unchanged (`App.tsx` verified), `Layout.tsx` skip link + landmarks intact (`Layout.tsx:12-22`), drawer unchanged; full suite green (implementer-recorded). EP11B keeps drawer behaviors as explicit regression cases |
| AC-E11-06 keyboard accessibility | both | Desktop implemented; mobile = drawer trap reuse + new grouped structure regression test (EP11B case 8) — plan adequate; live screen-reader evidence is TR-E11-03, owed at parent review |
| AC-E11-07 WCAG 2.2 AA + reduced motion | both | Token durations + global reduced-motion block exist (`index.css:121`); focus rings `focus-visible:ring-2 ring-focus-ring` on triggers/items; 44px drawer rows retained. WCAG conformance is a manual claim — must be evidenced, not inferred (see gates) |
| AC-E11-08 no backend/API change without flag | all | Verified: EP11A's changed paths are frontend-only; no API touched. EP06F's navGroups edit was a frontend contract change ratified under EP06, not an EP11 contract break |
| TR-E11-01 header component tests | both | 22 existing cases verified by inspection (17 desktop + 5 mobile; matches the "22 total" claim in both records); EP11B matrix adds 8 cases + 2 strengthenings — testable and code-accurate apart from PR-001's `Plan` gap |
| TR-E11-02 existing tests still pass | both | Obligation properly carried; EP11A's 4 adapted page/banner test files are a legitimate consequence recorded as F-A-3 |
| TR-E11-03 manual accessibility review | parent review | Correctly excluded from both child stories; must become **executed manual evidence** at the combined review (see gates) |
| TR-E11-04 reduced-motion verification | parent review | Same; browser emulation of `prefers-reduced-motion` belongs with DoD 10 at the parent review |

**DoD applicability:** the README's items 2/3/4/5/9 "Not applicable" rulings are correct for a presentation-only navigation change (no input, no data access, no API, no new async shell state, no migrations) — re-verified against code, no hidden data path in the header. Items 6/7/8 are planned with real obligations; 10/11 sit with the combined parent review (DoD 11 walkthrough is reviewer-owned there — plan reviews correctly generate none).

**Sizing assessment (story-sizing.md):** split is by genuine independent outcomes — desktop dropdown interaction model vs. drawer grouped sections: different interaction mechanisms, different test sets, one shared data contract as the seam; neither child is README/status/verification-only; the integration index (`artifacts/EP11/implementation.md`) is owned by substantial child EP11B, not a manufactured story. EP11A's actual footprint (3 header files + 4 adapted test files, 22 tests, one implementer pass) matches its 2–3-request estimate. EP11B's estimate (1–2 requests, model 2, 2 files, ~8 new cases) is credible for the inspected work: replace one drawer block, extend one class helper, extend one test file; its main risks (duplicate accessible names, focus-trap count, jsdom scoping) are already enumerated in the story. One sequential implementer owns all layers (`README.md:19`) — no concurrent-writer pattern.

**Decisions D11-1…D11-9:** D11-1/D11-2 grounded and verified (frontend-only change set). D11-3 **closed** (verified above). D11-4 ratified groupings hold, wording stale → PR-001. D11-5 verified in code (icon + visible text everywhere, icons `aria-hidden`, no icon-only control). D11-6 desktop done / mobile planned. D11-7 verified (drawer trap, scroll lock, Escape, skip link, landmarks untouched). D11-8 resolved-but-unrecorded → PR-002. D11-9 planned; the parent review must confirm the 44px rows and focus rings in a browser (automated tests assert classes only).

**Dependencies/sequencing:** EP10C dependency met (EP10 parent review PASS, `410c343`); EP11A → EP11B order satisfied — EP11A implemented at `b7ae794`/`1aec0ea` (reflog-confirmed) and the contract exists as described except the ratified `Plan` addition. No dependency on unreleased work. **No implementation-blocker findings for EP11B** separate from the plan findings: after PR-001's docs pass (or even without it, accepting a possible drift-rule clarification round), EP11B can be implemented.

**Security/privacy invariants:** presentation-only; the invariant table's counterexamples (hidden route, hover-only menu, regression) map to real mechanisms (shared data source, button-triggered menus with keyboard tests, existing suite green). No credential/tenancy surface touched; no secrets in any reviewed path.

## Verification record (reviewer-executed vs. recorded vs. CANNOT VERIFY)

Verified by reviewer inspection (this pass, at `7ac3828` working tree):
- `navGroups.ts`, `Header.tsx`, `Header.test.tsx`, `Layout.tsx`, `App.tsx` routes, `index.css:121` — contract types, desktop grouping, account menu contents/conditionals, drawer legacy state, skip link/landmarks, route preservation, reduced-motion media query, `Plan` drift, drawer `Plan` absence.
- Header test count: 17 desktop + 5 mobile = **22**, consistent with every claim (counted from case declarations).
- Commit provenance/order via `.git/HEAD` + `.git/logs/HEAD` (raw refs, read-only): `3853aaa → b7ae794 → 1aec0ea → a169743 → 957cbec → 698ab00` in recorded order; EP06F commit `2e35061` (Plan entry) ~21h later; HEAD = `7ac3828` ("chore(EP11): dispatch EP11-plan-review-1"), branch `main`. `a169743` is a docs checkpoint commit, so the EP11B baseline story's "inspected at HEAD `a169743`" code claim is code-equivalent to `1aec0ea` — harmless.
- Ratification chain for the `Plan` entry: EP06F story (`:23,:54`) → EP06F implementation record (`:19,:26,:61`) → EP06 README `:504` → EP06 parent review reviewed-paths list.

Implementer-recorded (NOT re-executed by this reviewer; provenance preserved, never presented as reviewer-executed):
- EP11A: header 22/22; web 842/842; typecheck exit 0; lint 0 warnings (at `b7ae794`).
- EP06F (covers the `Plan`-amended header test): web 84 suites/1005 tests; typecheck; lint (at EP06F final state).

CANNOT VERIFY in this pass (with reason and route):
- Re-running vitest/typecheck/lint: no shell in this session; subagent delegation attempted → depth limit. The evidence above predates no later **relevant** source change to header code after EP06F's update (reflog shows later web-touching EP07/EP08/EP12 commits did not touch `widgets/header` per their scoped messages, but blob-level proof requires `git log -- <path>` at re-review). The parent review should run the header suite + lint + typecheck once at its own baseline and report actual output.
- Commit-blob content (e.g., `git show b7ae794:...navGroups.ts`): unavailable without shell; substituted documented provenance chains.
- Working-tree dirt beyond the two disclosed paths: `git status` unavailable; per handoff only the two `.agents` paths are dirty; the reviewer's report write is the only file mutation this pass.
- TR-E11-03/04 live browser/screen-reader/reduced-motion behavior and D11-9 44px/focus-ring visuals: **not attemptable here and correctly deferred**; at the combined parent review these must be satisfied by **executed** integrated-environment evidence (keyboard-only traversal of both dropdowns + account menu + drawer; screen-reader spot check of menu semantics and duplicate `Availability` naming; emulated `prefers-reduced-motion` on drawer/menu transitions; narrow-viewport check at 320–375px), recorded in `artifacts/EP11/review.md` with date/environment/provenance labels and mirrored in `walkthrough.md`. DoD 10 cannot pass on plan intent alone.

## Planning-checklist gate results (this review)

| # | Check | Result | Reference |
|---|---|---|---|
| 1 | Child separation & sizing | **Pass** | Two substantive children, split by independent outcome (interaction models + test sets), integration index owned by EP11B; sizing blocks code-grounded; EP11A's actual effort retro-validates. Sizing evidence in summary above |
| 2 | AC & test coverage | **Pass** | All 8 ACs + 4 TRs mapped to real owners; verified against story text and code |
| 3 | DoD obligations | **Pass** | N/A rulings honest and code-checked; 10/11 correctly parent-owned |
| 4 | Contract consistency | **Fail** | PR-001: ratified `Plan` entry absent from all EP11 docs; EP11B baseline/test matrix under-specified; live one-surface drift undocumented |
| 5 | Code paths inspected | **Pass** | All plan-cited paths re-inspected at HEAD; this report's own unverified items disclosed above |
| 6 | Risks/counterexamples | **Pass** | Invariant table mechanisms real; EP11B risk list accurate (focus-trap count needs PR-001's 13 correction) |
| 7 | Dependencies & sequencing | **Pass** | EP10C done; EP11A done; EP11B next; one sequential writer |
| 8 | Material decisions | **Fail** | PR-002: D11-3 closure and D11-8 resolution not recorded in register/quality gate |
| 9 | Correction-log completeness | **Fail** | Log empty while status/quality-gate records are stale; PR-001/PR-002 entries owed on the correction pass |
| 10 | Jira identity | **Not applicable** | All keys `Pending creation`; no sync authorized for EP11 |

## Handoff

**Planner must address (docs-only, fast):** PR-001 (ratify the EP06F `Plan` entry into the EP11 README contract + epic D11-4/Scope note; correct EP11B baseline, test case 1, focus-trap count, drift-rule note) and PR-002 (refresh README status line, quality-gate row 8, D11-8 provenance; add correction-log entries for PR-001/PR-002 citing this report). PR-003–PR-005 are polish: record or fold into the EP11B implementation/parent review without blocking.

**No new user decision is needed:** the only candidate (keeping the `Plan` entry) was already decided and parent-reviewed under EP06; EP11 is being asked only to acknowledge it. If the user instead wants `Plan` out of the nav, that is a *new* instruction requiring an EP06-scope reversal — out of this review's scope and not recommended.

**After the correction pass:** re-review (pass 2) at the new HEAD, verifying PR-001/PR-002 closure against the persisted docs and current `navGroups.ts`; on `Plan Ready`, the re-review performs the passing-review docs sync (quality gate, correction log, links). The coordinator may then proceed to EP11B implementation per the existing queue row.

**Implementation dependency blockers (separate from plan findings):** none for EP11B.

**Deferred passing-sync (non-passing verdict — intentionally NOT applied):** status-line refresh, quality-gate flip, correction-log entries, queue link to this report. All are planner/coordinator-owned until a passing pass.

---
*Reviewer Git handoff:* exactly one changed path — `docs/stories/EP11/plan-review.md` (new file). Nothing staged, nothing committed by the reviewer; the coordinator commits this report. No other file was created, modified, or deleted by this review.
