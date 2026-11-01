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

---

# EP11 Plan Review — Pass 2 (re-review of PR-001/PR-002 closure)

**Review:** Pass 2 — independent re-review of the planner correction pass against the actual tree; the pass-1 report above is preserved verbatim (the correction-log dispositions were treated as unverified claims, per the reviewer skill).
**Date:** 2026-11-01
**Reviewer:** independent plan reviewer (fresh context, autopilot-dispatched `EP11-plan-review-2`, stage `plan_review`)
**Reviewed at:** HEAD `29a71dd` on `main` (`docs(…)` = `chore(EP11): close EP11-plan-fix-1 (corrections committed 60aa37f); dispatch EP11-plan-review-2`). Working tree; the only dirty paths per the coordinator handoff are `.agents/skills/autopilot/SKILL.md` and `.agents/workflow-graph.md` — another contributor's work, not inspected, not attributed to this review. The delta since the correction commit `60aa37f` is checkpoint-only docs per the handoff; all plan-review facts below were nonetheless re-read at the current tree.
**Commit chain verified via raw `.git/HEAD`, `.git/refs/heads/main`, `.git/logs/HEAD` (read-only):** `7ac3828` (pass-1 dispatch) → `4163f67` (pass-1 report, Changes Required) → `3157a01` (close pass 1; dispatch `EP11-plan-fix-1`) → `60aa37f` (correction pass, "planner; persisted by coordinator") → `29a71dd` (HEAD; dispatch pass 2). `refs/heads/main` = `29a71dd…`. Provenance, not blob-level proof (no shell in this session).

## Verdict: **Plan Ready**

Both planner-owned should-fix findings (PR-001, PR-002) are **closed** — independently verified at HEAD `29a71dd`, not on the planner's disposition lines. The shared nav contract, epic, and EP11B story now consistently state Planning = Calendar/Availability/**Plan** with honest EP06F provenance; EP11B's test matrix, focus-trap arithmetic, and drift rule match the actual contract; the planning records match the verified queue and carry no false review claims. No blocker and no should-fix remains. PR-003/PR-004/PR-005 stay open polish with their original owners (non-blocking, unchanged); one new polish observation (PR-006) is recorded. The plan is fit for the remaining work: EP11B implementation (queue row `Ready`, one sequential implementer), then the one combined EP11 parent review.

## Prior findings — dispositions with fresh evidence

| ID | Pass-1 severity | Disposition | Fresh evidence (verified this pass at `29a71dd`) |
|---|---|---|---|
| PR-001 | Should-fix | **Closed** | Details below — all six correction elements verified in the tree |
| PR-002 | Should-fix | **Closed** | Details below — status line, quality-gate row 8, D11-8, adjacent staleness all reconciled honestly |
| PR-003 | Polish | **Still open (as routed — non-blocking)** | `artifacts/EP11A/checkpoint.md:39` still reads "`Needs refinement`" — correct: it is a historical record awaiting the coordinator's *annotation*, and its untouched state confirms the correction pass did not rewrite EP11A artifacts |
| PR-004 | Polish | **Still open (as routed — non-blocking)** | Owed as an explicit negative case in the parent review's manual keyboard pass; `Header.tsx:405-444` region re-spotted unchanged (implementation fidelity was already judged correct in pass 1) |
| PR-005 | Polish | **Still open (as routed — non-blocking)** | `EP11B-*.md:104` keeps the dated "67 files / 842 tests at EP11A" baseline; the implementer gates on "full web suite green at current HEAD" at EP11B time |

### PR-001 closure evidence (verified against the tree, not the planner's claims)

- **Code (re-inspected this pass):** `apps/web/src/widgets/header/ui/navGroups.ts:76-86` — Planning group with Calendar `:80`, Availability `:83`, **Plan `:84`** (`{ id: 'plan', label: 'Plan', icon: CalendarCheck, to: '/plan' }`); `Header.tsx:418-431` — legacy drawer `navLinks` flat list (Home, Dashboard, Semesters, Courses, Assignments, Calendar, Availability, Profile) still **lacks** `/plan`, with the EP11B marker at `:416-417`; `Header.tsx:433` + `:176-177` — desktop renders from `getNavGroups` (`desktop-nav-{id}` data-driven), so the desktop Planning dropdown includes `Plan`; `App.tsx:66` — `/plan` route exists.
- **README:** shared nav contract `:100` now ratifies Planning = Calendar/Availability/Plan, explicitly "ratified contract, not drift", citing EP06F story scope item 2 + AC 1 (`EP06/EP06F-*.md:23,:54`), the implementation record (`:19,:26`), the EP06 parent review reviewed-paths list, EP06 README `:504`, and `navGroups.ts:84`. D11-4 `:121` ratifies the same. **All citations independently re-verified:** EP06F story `:23` *is* scope item 2 (the nav entry in the shared `Planning` group, "edited additively") and `:54` *is* AC 1 (`/plan` appears once in the shared nav, both surfaces show it); EP06F AC 2 (`:55`) is the page-generation criterion — confirming both that pass 1's "AC 2" was wrong and that the corrected docs cite the **verified pair**. `EP06/artifacts/EP06F/implementation.md:19` (`navGroups.ts` modified — `Plan` entry) and `:26` (`Header.test.tsx` dependent assertion) verified; `EP06/artifacts/EP06/review.md:9` lists `navGroups.ts` among reviewed paths, `:14` **PASS**, `:5` dated 2026-10-30; `EP06/README.md:504` carries the quoted "EP11's shared file… edited additively" ratification.
- **Epic:** Scope `:25` and D11-4 `:66` both record Planning (Calendar/Availability/**Plan**) with provenance including "EP06F story scope item 2 + AC 1; EP06 parent review PASS 2026-10-30" and "expected contract content, not drift".
- **EP11B story:** baseline header `:108` keeps the dated 2026-10-29 inspection and adds a reconciliation note to `3157a01` — the original inspection was **not rewritten** (correct handling); `:112` baseline includes `Plan` with the `navGroups.ts:84` citation and "consuming it is expected behavior, not drift"; `:125` routes bullet adds `/plan` (`App.tsx:66`); test case 1 `:70` asserts the `Plan` link (`href="/plan"`) inside the Planning region; focus-trap note `:240` says **13** authenticated focusables — the enumeration (close, Home, Dashboard, Semesters, Courses, Assignments, Calendar, Availability, Plan, Profile, Availability, Verify email, Logout) matches this reviewer's independent recount of the grouped-drawer DOM order, and the 12-verified variant is right too; drift rule `:33` + risk `:236` now make consuming the ratified `Plan` explicitly expected (stop-and-flag only for *new* fields/edits); new risk `:237` records the live one-surface drift (`Header.tsx:418-431` lacks `/plan`) and that the grouped render restores parity; ordering `:208` and copy `:216` bullets include `Plan`.
- **History preserved:** `artifacts/EP11A/implementation.md:13` still says "Planning → Calendar/Availability" — truthful at `b7ae794` and correctly left verbatim (forward reconciliation only).
- **Note (not material):** the correction-log PR-001 row (`README.md:148`) exceeds this reviewer's 2000-character per-line read limit; its visible portion already contains the scope-item-2 + AC-1 pairing and the honest disclosure of the report's "AC 2" deviation ("the verified author…"). The three fully readable docs citations (README `:100`, epic D11-4, EP11B `:112`) each carry the verified pair, so the closure does not depend on the unread tail.

### PR-002 closure evidence

- **Status line `README.md:6`:** matches the execution queue (refinement closed; EP11A `Implemented — awaiting parent review`; EP11B `Ready`; combined parent review pending) and states the pass-1 verdict honestly (Changes Required; corrections landed; pass 2 pending) — **no false claim of a passing plan review anywhere in the tree** (this pass-2 section is the first such record).
- **Quality-gate row 8 `README.md:166`:** flipped Blocked → Pass with commit-level refinement provenance and pass-1 verification, explicitly noting pass-2 pending. Honest.
- **D11-8 resolved keep-both:** README `:125` and epic `:70` record the resolution with dates and story citations. Cited authorities verified: EP11A story `:155-156` ("keep in both — Planning primary, account menu secondary") and `:362`; EP11B story `:217` ("appears twice by design"). One citation slip: the registers cite `EP11B-*.md:217,:275`, but the D11-8-referencing bullet in the settled list is `:276` (`:275` is the grouping-labels bullet) — immaterial, folded into PR-006.
- **Adjacent same-class staleness:** queue note `:30` and both D11-3 register rows (README `:120`, epic `:65`) reconciled to the closed state with provenance.
- **Correction log `:144-151`:** entries exist for PR-001/PR-002 with honest dispositions ("only a passing re-review (pass 2) establishes reviewer closure"), the PR-003…PR-005 non-planner-owner routing is explicit, and the planner disclosed the pass-1 report's AC-2 citation error rather than papering over it.
- **Boundary check:** queue child rows `:23-28`, the Autopilot section `:184-241`, and the EP11A artifacts (`checkpoint.md:39`, `implementation.md:13`) read at HEAD are consistent with "untouched by the correction pass". `git show 60aa37f --stat` itself is **CANNOT VERIFY** here (no shell/blob unpacking); commit identity/order is reflog-verified and per-commit file lists rest on the coordinator's recorded three authorized docs paths (`60aa37f` = README + EP11B story + epic), which every readable artifact corroborates.

## New finding

| ID | Severity | Owner | Location | Summary |
|---|---|---|---|---|
| PR-006 | Polish | planner/coordinator (docs-only, optional) | `README.md:167` (quality-gate row 9); `README.md:125` + epic `:70` (D11-8 citations) | Row 9 still reads "First plan; no findings yet. Log initialized." — true for the 2026-10-29 snapshot and contradicted only by the (accurate, adjacent) correction log; carry a dated reconciliation note like row 8's. Fold in: repair the D11-8 citation `EP11B-*.md:217,:275` → `:217,:276` in both registers. No operative status is wrong; polish per the severity contract, non-blocking |

## Planning-coverage delta since pass 1

The pass-1 AC/TR ownership map, DoD applicability rulings, sizing assessment, decision-register assessment, dependency/sequencing check, and security review all stand — none was disturbed by the correction pass (it touched only the three docs paths). Checklist rows that failed in pass 1 now pass on verified evidence: **#4 contract consistency → Pass** (contract/epic/story agree with `navGroups.ts`; `Plan` asserted in test case 1; the live one-surface drift is documented with its automatic fix in EP11B's scope), **#8 material decisions → Pass** (D11-3/D11-8 recorded closed with provenance; D11-4 amended honestly), **#9 correction-log completeness → Pass** (entries present with honest dispositions; residual row-9 staleness is PR-006 polish). No implementation dependency blocker for EP11B exists or was introduced.

## Verification record (pass 2)

Reviewer-executed inspection (this pass, at `29a71dd` working tree): `navGroups.ts` (full), `Header.tsx:400-444` + data-driven-render grep, `App.tsx:55-74`, EP11 README (full incl. queue, contract, decisions, correction log, quality gate, Autopilot), EP11A + EP11B stories (full), epic (full), `artifacts/EP11A/checkpoint.md:33-40` + `implementation.md:8-19`, EP06F story `:15-64`, EP06F implementation record `:14-31`, EP06 review.md (header + verdict + reviewed paths), EP06 README `:500-507`, shared DoD `docs/epics/README.md:29-48`, raw `.git/HEAD` + `refs/heads/main` + `logs/HEAD`. No secrets read.

Implementer/coordinator-recorded (provenance preserved, never presented as reviewer-executed): EP11A and EP06F automated-suite results; the coordinator's `60aa37f` verification/commit act.

CANNOT VERIFY (with reason and route):
- `git show 60aa37f --stat` / `--name-only` and any per-commit blob diff; working-tree dirt (`git status` unavailable — no shell tool in this session). Commit *identity/order* verified from raw refs+reflog; *file-set* claims for `60aa37f` corroborated only by HEAD-state consistency + coordinator records.
- The unread tail of `README.md:148` beyond the 2000-char line-read limit (see PR-001 note; closure does not depend on it).
- Re-running vitest/typecheck/lint: no shell; no relevant source change since the recorded runs (header/nav code re-read this pass matches pass-1 inspection). The **combined parent review must run** the header suite + full web suite + typecheck + lint at its own baseline and report actual output.

## Owed downstream (for the record — unchanged obligations made explicit)

1. **TR-E11-03/04:** *executed* manual accessibility evidence at the combined EP11 parent review — keyboard-only traversal of both dropdowns + account menu + drawer; screen-reader spot check of menu semantics and the duplicate `Availability` naming; emulated `prefers-reduced-motion`; 320–375px narrow-viewport check; D11-9 44px-row/focus-ring visual confirmation. Plan intent does not satisfy these.
2. **DoD 10** (integrated review) and **DoD 11** (reviewer-owned `walkthrough.md`) at the combined parent review — `artifacts/EP11/review.md` + `artifacts/EP11/walkthrough.md`; DoD 10 cannot pass on inspection alone.
3. **PR-003** coordinator annotation of `artifacts/EP11A/checkpoint.md:39` (annotate, never rewrite); **PR-004** explicit outside-click focus negative case in the parent review's manual keyboard pass; **PR-005** EP11B implementer gates on the full web suite green at current HEAD (the 842 count is history); **PR-006** optional docs polish.
4. EP11B implementation itself remains responsible for its new automated cases (including the `Plan` assertion) — planned obligations, correctly not yet in existence.

## Passing-review docs sync (per skill) — applied within dispatch limits

This pass applies the restricted sync the coordinator authorized: (1) this pass-2 report appended to `plan-review.md` with pass 1 preserved verbatim; (2) README status/report-link line `:6` and quality-gate verdict line `:155` + row-8 pass-2 wording `:166` updated to record the verified `Plan Ready` verdict. Everything else is **deferred to the coordinator verbatim** (below). No Git mutation by the reviewer; the coordinator commits.

**Coordinator verbatim deferred edits (authorized passing-sync remainder — apply as-is):**
1. `README.md:148` PR-001 row Status: `| Fixed in plan — Addressed, awaiting re-review (pass 2). |` → `| Closed — verified at plan-review pass 2 (Plan Ready, 2026-11-01, at HEAD 29a71dd); see ./plan-review.md pass-2 section. |`
2. `README.md:149` PR-002 row Status: `| Fixed in plan — Addressed, awaiting re-review (pass 2). |` → `| Closed — verified at plan-review pass 2 (Plan Ready, 2026-11-01, at HEAD 29a71dd); see ./plan-review.md pass-2 section. |`
3. PR-006 (optional polish): `README.md:167` row 9 → append `*(reconciled 2026-11-01: correction log now records PR-001/PR-002 — closed at pass 2 — plus polish PR-003…PR-006 with owners.)*`; repair `EP11B-*.md:217,:275` → `:217,:276` in README `:125` and epic `:70`.
4. Autopilot checkpoint reconciliation (coordinator-owned section): close `EP11-plan-review-2` with the Plan Ready verdict and advance the stage to `child_ready` → implementer EP11B.

**Handoff:** verdict **Plan Ready** for the remaining work. Next concrete actionable row per the queue: **EP11B implementation** (`Ready`; consume `navGroups` as-is including the ratified `Plan`; gate the full suite at current HEAD), then the single combined EP11 parent review carrying the TR-E11-03/04 executed evidence and DoD 10/11.

---
*Reviewer Git handoff (pass 2):* exactly one changed path — `docs/stories/EP11/plan-review.md` (pass-2 section appended; pass 1 unchanged above it). The only other files the reviewer touched are the three authorized passing-sync lines in `docs/stories/EP11/README.md` (`:6`, `:155`, `:166`). Nothing staged, nothing committed; the coordinator commits and applies the deferred verbatim edits above.
