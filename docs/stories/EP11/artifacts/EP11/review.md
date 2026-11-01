# EP11 Combined Parent Implementation Review

**Review:** Combined final implementation review of the EP11 parent review unit (children EP11A + EP11B) — the unit's first implementation review (plan reviews: pass 1 Changes Required, pass 2 **Plan Ready** at `29a71dd`, `../plan-review.md`).
**Date:** 2026-11-01
**Reviewer:** independent parent reviewer (fresh context, autopilot-dispatched `EP11-parent-review-1`, assignment `parent_review`)
**Reviewed at:** HEAD `fd7e88e1ff3c2b0420a60ee3d92857a554c0a9c8` (`refs/heads/main`, read directly; `.git/HEAD` → `main`). Per the coordinator handoff the working tree is clean except two foreign dirty paths (`.agents/skills/autopilot/SKILL.md`, `.agents/workflow-graph.md`) — another contributor's; not inspected, never touched by this review. `git status` itself: CANNOT VERIFY (no shell in this runtime).
**Unit baseline:** `3853aaa` (before EP11A's first included change).
**Nav-surface history reviewed:** `apps/web/src/widgets/header/ui/` changes between baseline and HEAD — coordinator-verified `git log 3853aaa..HEAD -- apps/web/src/widgets/header/ui/` == exactly `b7ae794` (EP11A feat) + `2e35061` (EP06F's ratified additive `Plan` amendment — consumed, not re-implemented; EP06 parent review PASS 2026-10-30) + `8b7cd6a` (EP11B feat). Commit identity/order independently corroborated by this reviewer from raw `.git/logs/HEAD` (lines 98–101, 192–193, 341–345): `3853aaa → b7ae794 → 1aec0ea → a169743 … 2e35061 … c4aa040 → b9f0385 → 8b7cd6a → 90e3741 → fd7e88e` (HEAD). Reflog identity is provenance, not blob-level proof.
**Reviewed paths (reviewer-read at HEAD):** `apps/web/src/widgets/header/ui/navGroups.ts` (full), `Header.tsx` (full, 749 lines), `Header.test.tsx` (full, 640 lines — all 30 cases read, counts and assertions verified from case declarations, not from records), `apps/web/src/widgets/layout/ui/Layout.tsx`, `apps/web/src/index.css:115-134` (reduced-motion block), `App.tsx:66` (`/plan` route), the four EP11A-adapted test files (account-menu references confirmed in `ForgotPasswordPage.test.tsx:173`, `ResetPasswordPage.test.tsx:318,:396`, `VerifyEmailPage.test.tsx:114`, `EmailVerificationBanner.test.tsx:122,:135`); EP11 epic + README + both story files; `plan-review.md` (both passes); parent index + both child implementation records + both checkpoints; raw `.git/HEAD`, `refs/heads/main`, `logs/HEAD`. Precedent records for the human-evidence ruling: EP08 `review.md` (pass-2 F-03, pass-3 waiver), SP-115/SP-120/SP-122/SP-123 dispositions, EP05 D05-14/PC-EP05-06.

**Limitations (honest execution disclosure):** this runtime has **no shell and no browser**. No test/typecheck/lint was executed by this reviewer; commit-blob diffs (`git show`) and `git status` were unavailable — Git facts were verified from raw refs/reflog only (provenance). Automated-gate results below are **authorized-helper (coordinator, this session) runs at `90e3741`** with `fd7e88e` a chore-only delta (reflog message + handoff) — preserved with that provenance, never relabeled reviewer-executed. Per the dispatch, no bounded test helper was spawned: the exact gates already ran at the reviewed HEAD this session, and the skill prohibits spawning helpers merely to repeat available tests. No `.env*` or secrets read.

## Verdict: **FAIL — Changes Required**

Everything verifiable from this runtime passes: all eight epic ACs are implemented correctly in code, the 30-case header suite's actual assertions match every claim (including the ratified `Plan` parity assertion, the D11-8 keep-both pair, the nested-route `aria-current` negative, and the 13-focusable trap guard), contract integrity holds (no `navGroups.ts` drift; AC-E11-08 honored), decisions D11-4…D11-9 are complied with, the desktop regression guard is intact, and the automated gates are green at HEAD per the session's authorized-helper runs. **No code defect was found.**

The unit nonetheless **cannot pass** because mandatory evidence that exists nowhere — executed human/browser evidence — is absent and cannot be produced or waived by this reviewer:

- **TR-E11-03** (executed manual accessibility review: keyboard-only, screen reader, focus management) — never executed by anyone; every record honestly says it "remains with the combined EP11 parent review".
- **TR-E11-04** (emulated `prefers-reduced-motion` verification) — mechanism verified in code (`index.css:121-134`), emulation never performed.
- **DoD 10** (integrated-environment review) — no integrated/browser evidence of any kind is recorded for EP11.
- **PR-004** — its closure vehicle is the human keyboard pass above.

Per the reviewer skill's severity contract, unmet mandatory obligations with missing evidence are **should-fix**, any open should-fix prevents a passing verdict, required evidence that cannot be verified stays CANNOT VERIFY, and "a user-approved waiver must have a recorded source and exact scope; the reviewer cannot grant one." No user ruling or waiver exists for EP11 (unlike EP08, whose identical gate was closed only by a dated, verbatim-recorded user waiver at pass 3; and SP-115/SP-123, cleared only when the user actually executed the pass). EP11's plan carries no named-exception clause (contrast D05-14/D122C-1, which required a pre-recorded owned exception), and the run's own checkpoint states the autopilot "cannot ratify human evidence." Honesty over green: one bounded user action (§8) or a dated user waiver ruling closes the single blocking finding, then a fresh pass-2 review issues the final verdict, the `walkthrough.md`, and the docs sync.

Consequences of the non-passing verdict (per skill + delivery-state + AGENTS.md): **report saved only** — no `walkthrough.md`, no queue/status/correction-log sync, no `Reviewed`. Deferred items are enumerated in §10.

## 1. Findings

| ID | Severity | Owner | Child | Summary |
|---|---|---|---|---|
| F-EP11-01 | **Should-fix (blocking)** | user (execute) / coordinator (record the outcome or a dated user waiver ruling) | EP11A + EP11B (parent-level gates) | Mandatory human/browser executed evidence absent for TR-E11-03, TR-E11-04 and DoD 10 (PR-004 rides the same pass); not obtainable from any agent context in this run and not waivable by the reviewer |
| PR-003 | Polish (open, carried from plan review) | coordinator | EP11A artifact | `artifacts/EP11A/checkpoint.md:39` still calls EP11B "`Needs refinement`" (stale historical line) — annotate, never rewrite |

No new code, test, contract, or documentation findings. The `8b7cd6a`-diff "desktop cases byte-identical" claim is implementer-recorded at blob level (CANNOT VERIFY without git) but independently consistent: the 17 desktop cases exist at HEAD as described and pass green in the helper run; the EP11B describe is purely additive.

### F-EP11-01 — mandatory executed human/browser evidence is missing (should-fix, blocking)

- **Requirement/source:** TR-E11-03 ("Manual accessibility review **recorded** (keyboard, screen reader, focus, reduced motion)" — EP11 README traceability table; EP11B story out-of-scope bullet assigns it to the combined review); TR-E11-04; shared DoD item 6/7/10 (interaction/browser evidence is the appropriate evidence class for keyboard/responsive/integrated conditions); plan-review pass 1 + pass 2 "Owed downstream" §1 (explicitly: "Plan intent does not satisfy these"); parent index "Open gates" §2–3; the run's Autopilot section ("must obtain from the user — autopilot cannot ratify human evidence").
- **Observed gap:** no executed manual pass exists anywhere in the record. EP11A record ("Not run: manual browser/screen-reader pass"), EP11B record (same), EP11B checkpoint, and the parent index all honestly carry it forward to this review. This runtime has no browser or assistive technology, so the gate is **CANNOT VERIFY**, not FAIL-on-behavior: every static/automated substitute indicator is green (focus management and trap wrapped in jsdom tests; global reduced-motion token zeroing at `index.css:121-134`; focus-ring and `min-h-[44px]` classes asserted; ARIA semantics present), but code support is not observed behavior.
- **Severity rationale:** per the reviewer skill's severity contract, "any unmet explicit AC, applicable DoD condition, required deliverable or mandatory workflow obligation; missing implementation evidence" is **should-fix** — regardless of effort or of the fact that every substitute indicator passes. Green tests cannot downgrade an explicit requirement; the reviewer cannot grant a waiver without a recorded user source. The directly analogous EP08 review handled the identical gate exactly this way: pass 2 verdict **FAIL** ("the human-evidence gate applies; a passing verdict is [not available]"), and only a dated user waiver recorded verbatim made pass 3 a pass.
- **Owner:** execution is irreducibly the **user's** (or any human with a browser + assistive tech); **recording** the outcome (or an explicit, dated, exactly-scoped user waiver ruling) is the coordinator's, in the README correction log + this report's successor pass.
- **Closure condition (one of):**
  1. **Executed human pass** — a human executes §8 below and records it with date, environment (OS/browser/viewport, assistive tech used), and observed result per step; the §8.9 PR-004 outside-click negative case must record whether the trigger-focus bounce is consciously accepted; then re-dispatch the reviewer for pass 2 (single bounded round: close F-EP11-01, save `walkthrough.md`, apply the passing docs sync).
  2. **Dated user waiver ruling** — mirroring EP08 pass 3: explicit user source, exact scope (which observations are waived, what code/automated support stands in, named residual follow-up owner). The reviewer cannot originate this; the pass-2 reviewer may only record and apply it.
- **Note on scope of the gap:** this finding does **not** allege any behavioral defect. Nothing observed in code or tests predicts a failure of the manual pass; the finding is purely the missing mandatory observation.

### PR-003 — carried polish (unchanged disposition)

`artifacts/EP11A/checkpoint.md:39` remains a truthful historical record with a stale EP11B readiness label; the coordinator's annotation (never a rewrite) remains owed. Non-blocking. PR-004 is not duplicated here — it closes inside F-EP11-01's closure vehicle (§8.9). PR-005 closed (implementer gated on green-at-current-HEAD: 100 files / 1140 tests, honoring the correction). PR-006 closed at `acb4aec` per the coordinator record.

## 2. Acceptance-criteria results (per child, with file/line evidence)

Statuses below are assessed from reviewer code/test inspection plus the authorized-helper automated runs; live-browser components of AC-E11-06/07 ride F-EP11-01.

| AC | Result | Attribution | Evidence (reviewer-inspected at `fd7e88e` unless labeled) |
|---|---|---|---|
| AC-E11-01 grouped sections, icons + text, reduced top-level count | **Satisfied** | EP11A desktop + EP11B mobile | Desktop: 4 top-level entries from `getNavGroups` (`Header.tsx:500-528`); drawer renders single links + headed sections (`Header.tsx:610-658`); icons `aria-hidden` beside visible text everywhere (`Header.tsx:221,259,375,523,622,650,694,709,722`). Tests: desktop `Header.test.tsx:62-98`; drawer structure `:432-490` |
| AC-E11-02 account menu contents + removal from flat list | **Satisfied** | EP11A + EP11B | Desktop avatar menu: "Signed in as {name}" `Header.tsx:357`, Profile/Availability/conditional Verify/Logout from `accountMenuItems` (`navGroups.ts:97-108`, filter `Header.tsx:473-475`); inline desktop auth cluster gone (`:531-556`). Mobile Account section `:659-728`; `Profile`/`Verify email` absent from drawer nav — asserted `Header.test.tsx:583-584`; legacy flat `navLinks` deleted (record + absence verified in file) |
| AC-E11-03 desktop dropdowns + avatar dropdown, keyboard-operable | **Satisfied** (automated + inspection; live keyboard confirmation rides F-EP11-01) | EP11A | `NavMenu`/`AccountMenu` button triggers with `aria-haspopup="menu"`/`aria-expanded` (`:205-231`, `:323-339`), `useMenuFocus` keyboard model (`:64-148`), Space/Enter item activation (`:151-156`); tests `:100-308` (open, single-open, outside click, Escape+restore, toggle, arrow open-focus, cycle/Home/End, activation, Tab-no-restore, account keyboard) |
| AC-E11-04 mobile grouped drawer with headings + Account, EP10C reuse | **Satisfied** | EP11B | Headed `<section aria-labelledby>` regions `Header.tsx:627-657`, Account section `:659-728`; EP10C trap/lock/Escape/route-close/restore untouched `:417-469`; tests `:432-510`, trap guard `:621-639` |
| AC-E11-05 no functional regression | **Satisfied** | both | No route changes (`App.tsx` untouched by the unit; `/plan:66` predates it via EP06F); `Layout.tsx` skip link + landmarks intact (read); logout still `useAuth().logout` (`Header.tsx:540,690`); drawer `Plan` gain is the ratified PR-001 parity restoration, not regression; EP11A desktop suite green unmodified at HEAD (helper run); full web suite 100 files/1140 green (helper run) |
| AC-E11-06 keyboard accessibility (open/close, Escape, focus managed/restored, `aria-*`) | **Satisfied** (automated + inspection; live traversal = F-EP11-01) | both | Desktop: Escape restores (`Header.tsx:137-140` + `:177-183`), Tab closes without restore (`:141-144`, Decision 5), focus entry `:84-92`. Drawer: Escape + focus restore + trap + scroll lock (`:423-469`), asserted `Header.test.tsx:372-382` (strengthened), `:621-639`. All `aria-*` attributes present and asserted |
| AC-E11-07 WCAG 2.2 AA focus/keyboard + reduced motion | **Partially satisfied — live component CANNOT VERIFY (F-EP11-01)** | both | Code support verified: focus-visible rings (`Header.tsx:33,46,217,335`), `aria-hidden` icons, token durations only (`duration-fast/base`, `ease-standard`), global reduced-motion token zeroing (`index.css:121-134`). Actual conformance/emulation is a human observation that does not exist yet |
| AC-E11-08 no backend/API changes; flag before contract change | **Satisfied** | all | Unit touched only `apps/web/src/widgets/header/ui/` + EP11 docs (coordinator-verified commit paths; reflog messages consistent; header dir contains exactly the 3 known files). No *new* contract field was needed; consuming the ratified `Plan` is expected behavior, not a change — handled per the corrected drift rule |

## 3. Test-obligation results

| TR | Result | Evidence |
|---|---|---|
| TR-E11-01 header component tests | **Satisfied** | All 30 cases read (17 desktop `Header.test.tsx:62-344`, 5 preserved drawer `:352-418`, 8 new EP11B `:432-639`). Actual assertions verified — grouped structure incl. `Plan` `href="/plan"` (`:478`, PR-001 closure), D11-8 pair 1-in-nav/2-in-dialog (`:585-587`), nested-route zero-`aria-current` negative (`:565-572`), identity row + `aria-hidden` avatar (`:536-545`), `min-h-[44px]` + `h-5 w-5` icon classes (`:601-619`), trap 13 focusables / last = Logout / Tab wraps to Close (`:629-638`) |
| TR-E11-02 existing tests still pass | **Satisfied** (authorized-helper runs) | Header 30/30; full web suite 100 files/1140 passed at `90e3741` (== HEAD code state; `fd7e88e` chore-only) — coordinator-executed this session, not reviewer-executed. EP11A-adapted page/banner tests present and consistent (`:1` §Reviewed paths) |
| TR-E11-03 manual accessibility review recorded | **CANNOT VERIFY — mandatory (F-EP11-01)** | No executed evidence exists; no browser/AT in this runtime |
| TR-E11-04 reduced-motion verification | **CANNOT VERIFY — mandatory (F-EP11-01)** | Mechanism inspected (`index.css:121-134` zeroes duration tokens + global transition zeroing); emulation never performed |

## 4. DoD audit (shared, `docs/epics/README.md:29-55`)

| # | Condition | Result | Evidence / reasoning |
|---|---|---|---|
| 1 | Functional ACs pass | **PASS** | §2 — AC-E11-01…06, 08 satisfied; 07's live component tracked at DoD 6/7/10, not a functional-code gap |
| 2 | Invalid-input validation | **N/A (upheld)** | No new inputs in the unit (nav presentation only) — confirmed against the full changed surface |
| 3 | Academic data scoped to student | **N/A (upheld)** | No Prisma/API/data-access code in the unit; header consumes `useAuth()` session state only (`Header.tsx:403`). No ownership surface exists to scope |
| 4 | Actionable API errors | **N/A (upheld)** | No API calls added |
| 5 | Loading/empty/error states | **N/A (upheld)** | No new async state at shell level; auth-session loading remains the EP10C `ProtectedRoute` concern; the only conditional (`Verify email`) is session-data-driven and tested both ways |
| 6 | Keyboard accessibility | **PASS (automated, green at HEAD via authorized helper) / live traversal CANNOT VERIFY (F-EP11-01)** | See AC-E11-06 |
| 7 | Responsive desktop + mobile | **PASS (class-level + structure) / live 320–375px CANNOT VERIFY (F-EP11-01)** | `md:hidden` wrapper asserted (`Header.test.tsx:439`); desktop `hidden md:flex` intact (`Header.tsx:500,531`); jsdom cannot evaluate media queries (settled limitation) — live check owed |
| 8 | Automated tests | **PASS** | TR-E11-01/02 above |
| 9 | API/migration docs | **N/A (upheld)** | No API or migration change |
| 10 | Reviewed in an integrated development environment | **CANNOT VERIFY — mandatory (F-EP11-01)** | No integrated-environment/browser evidence recorded for EP11 (contrast EP05's executed Playwright stack record); not obtainable here |
| 11 | Reviewer-owned walkthrough | **Not yet satisfied (deferred by this non-passing verdict)** | Per skill/AGENTS.md: a non-passing verdict saves the report only; `walkthrough.md` is issued at the passing pass. Manual test workflows the eventual walkthrough will carry are specified in §8 — nothing in §8 is labeled performed |

## 5. Decision compliance (D11-4…D11-9) and contract integrity

- **D11-4 (grouped IA incl. ratified `Plan`):** ✅ consumed exactly as ratified — `navGroups.ts:62-87`; Planning = Calendar `:80`, Availability `:83`, Plan `:84`; both surfaces render from `getNavGroups` (`Header.tsx:414,501,611`). The drawer `Plan` link (`Header.test.tsx:478`) closes the pre-EP11B one-surface drift exactly as PR-001 predicted.
- **D11-5 (icons + text):** ✅ every entry icon + visible label; all icons `aria-hidden`; no icon-only control (the avatar button carries `aria-label`).
- **D11-6 (account menu/section):** ✅ desktop avatar dropdown + mobile Account section; personal actions gone from primary lists on both surfaces.
- **D11-7 (EP10C shell reuse):** ✅ trap/scroll lock/Escape/route-close/backdrop/slide-in present and structurally as described by the EP10C baseline (`Header.tsx:417-469,575-597`); skip link/landmarks intact in `Layout.tsx`; no new animation library; token durations only.
- **D11-8 (Availability keep-both):** ✅ canonical in Planning + account shortcut; duplicate pair asserted deliberately (`Header.test.tsx:585-587`), accepted duplicate accessible name documented.
- **D11-9 (44px + focus rings):** ✅ at class level (`min-h-[44px]` rows `Header.tsx:35`; Logout/Verify rows use the same class, avoiding `Button`'s 640px `max-sm` threshold; shared focus-ring classes). Physical pixel measurement is a live-browser observation — part of F-EP11-01's pass.
- **Contract integrity / AC-E11-08:** ✅ `navGroups.ts` at HEAD is content-identical to the ratified contract (types, ids, routes, `requiresUnverified`); EP11B edited no contract file; the only intervening nav-surface change (`2e35061`) is the pre-ratified EP06F amendment. No flag-worthy new field was needed; none was added.
- **Ownership/security:** the N/A claims hold — the unit adds no data access, no endpoint, no token surface; no secrets in any reviewed path. Logout invokes only the session's own `logout()`.

## 6. Regression verification

- **Desktop (EP11A) intact under EP11B:** 17 desktop cases at HEAD match the EP11A story's obligation matrix (case-by-case read) and were green in the helper run; `navLinkClass` refactored so `gap-2`/`gap-3` are emitted exclusively (`Header.tsx:31-41`) with desktop output classes unchanged.
- **EP10C drawer behavior:** toggle, Escape + hamburger focus-restore (strengthened assertion `Header.test.tsx:381`), link-click close (`within(dialog)`-scoped `:394`), scroll lock, unauthenticated auth actions — all five preserved and green (helper).
- **Suite-level:** full web suite green at HEAD (authorized-helper: `pnpm --filter web test` → 100 files / 1140 passed; `--filter web typecheck` exit 0; `--filter web lint` exit 0 `--max-warnings 0`; header suite 30/30; `git log` path-range check == the three commits above). Provenance: coordinator-executed at `90e3741` in this delivery session; `fd7e88e` adds no code. **Not reviewer-executed** — the parent index's "reviewer must re-run" line is satisfied only at authorized-helper provenance; disclosed rather than papered over.
- **Blob-level diff identities** (exact per-commit file lists, byte-identity claims): CANNOT VERIFY without git; corroborated by reflog messages, records, and HEAD-state consistency (same limitation class both plan passes accepted).

## 7. Correction-log reconciliation (implementation phase)

| Prior item | Status at this review |
|---|---|
| PR-001 | **Closed** — drawer/desktop one-surface parity restored (`Plan` rendered + asserted in the drawer); ratified contract consumed as-is |
| PR-002 | **Closed** at plan pass 2; no new staleness observed — README status/queue match the verified state this review re-derived |
| PR-003 | Open polish (coordinator) — carried |
| PR-004 | Open — closes inside F-EP11-01's pass; negative case specified at §8.9 |
| PR-005 | Closed — implementer gated on green-at-current-HEAD (1140), dated counts treated as history |
| PR-006 | Closed at `acb4aec` (coordinator record) |
| F-A-1…F-A-3, F-B-1/F-B-2 | Implementation findings with recorded fixes; F-A-3's four adapted test files independently confirmed at HEAD |

## 8. Required manual test workflows (the F-EP11-01 closure vehicle)

**Execution status for all of §8: Not executed — user test instructions.** Nothing below was performed by this review (no browser in the reviewer runtime); these are steps, not results. The eventual `walkthrough.md` will carry these same workflows with the executed evidence folded in per label.

**Prerequisites (safe, disposable):** run the local dev stack (`pnpm dev` per repo README; API + web on their dev ports) against local disposable data. Create two disposable accounts: **A** unverified, **B** with email verified (or clear `emailVerifiedAt` for account A in the local DB). Add one semester/course/assignment so nav destinations resolve. Never use shared systems; no secrets in test data.

1. **Desktop grouped nav (≥768px).** Expect: left logo; nav = Home, Dashboard, Academics ▾, Planning ▾ only; right = circular avatar with initial. No inline Semesters/Courses/Assignments/Calendar/Availability/Profile/welcome-text/logout cluster. Click Academics ▾ → panel lists Semesters/Courses/Assignments each icon+label; Planning ▾ → Calendar/Availability/Plan.
2. **Dropdown keyboard matrix (keyboard only).** Tab to Academics ▾; Enter opens with focus on Semesters; Escape closes with focus back on the trigger; reopen with ArrowDown (focus first) and via ArrowUp (focus last); ArrowDown/ArrowUp cycle with wrap; Home/End jump ends; Enter and Space on a focused item navigate; Tab out of an open menu closes it and lands on the *next* header control (focus not snapped back). Open Academics, then click Planning ▾ → Academics closes (single-open). Chevron rotates when open.
3. **Account menu (account A, unverified).** Open avatar menu → "Signed in as {name}", Profile, Availability, Verify email (→ `/verify-email`), Logout, with dividers after the identity line and before Logout. Escape/outside-click closes with focus back on the avatar. Verified account B → no Verify email; rest unchanged. Logout logs out and returns to the unauthenticated header (Login / Get Started).
4. **Active highlighting (desktop).** Visit `/semesters`: Academics trigger is accent + semibold; opened menu shows Semesters highlighted with `aria-current="page"`; Dashboard/Home not. Visit a course detail `/courses/<id>`: Academics trigger still active, no item marked. Visit `/dashboard`: Dashboard link has the underline/accent treatment.
5. **Mobile drawer grouped sections (≤767px, use 375px).** Open hamburger → drawer "Menu" with grouped content: Home, Dashboard as rows; **ACADEMICS** heading + 3 links; **PLANNING** heading + Calendar/Availability/Plan; divider; **ACCOUNT** heading, identity row (avatar + "Signed in as …"), Profile, Availability, Verify email (account A), divider, Logout. Headings are plain labels — not buttons, not links, not collapsible. Every row icon + text. Tapping any link closes the drawer and navigates; Logout closes the drawer then logs out. Hamburger aria-label flips Open/Close menu; drawer announces as a modal "Primary navigation" dialog.
6. **Drawer behavior regression + trap.** With the drawer open (account A): Tab from Logout wraps to the drawer's Close button (trap cycles inside); Shift+Tab from the first control wraps to Logout; Escape closes and returns focus to the hamburger; page behind does not scroll while open, scroll returns after close; backdrop click and Close button close.
7. **Unauthenticated drawer.** At `/` logged out: drawer shows Home + Login / Get Started only — no headings, no Account, no "Signed in as", no Logout.
8. **44px targets + focus visibility (devtools).** Drawer rows measure ≥44px tall at 375px (including Logout); hover/keyboard focus ring visible on triggers, menu items, and every drawer row (no clipped or invisible focus).
9. **Outside-click negative case (PR-004).** Mid-page with a focusable control (e.g. a form input) below the header: open Academics, then click the far-away input once. Observe: the menu closes and focus briefly bounces to the trigger before the browser lands on the click target (the Decision-5 behavior). **Record whether this feels acceptable or objectionable** — this is the conscious accept-or-raise decision PR-004 asks for.
10. **Reduced motion (TR-E11-04).** DevTools → Rendering → emulate `prefers-reduced-motion: reduce`: drawer slide-in, backdrop fade, dropdown entrance and chevron rotation are effectively instantaneous; no residual motion. Record OS/browser.
11. **Screen-reader spot check (TR-E11-03, e.g. VoiceOver).** Drawer: dialog announced with name; headings ACADEMICS/PLANNING/ACCOUNT reachable by heading/region rotor; **Availability is announced twice (Planning + Account) — confirm this reads acceptably** (accepted per D11-8; flag if it reads confusingly); avatar initials not double-announced; icons silent. Desktop menus: trigger announces "menu, collapsed/expanded"; items announce as menu items; Escape returns focus to the trigger.
12. **Responsive 320–375px + route walk.** No horizontal overflow at 320px and 375px; drawer fits (w-80 capped at 85vw); at ≥768px dropdown surfaces show and the drawer does not. Finally walk every destination from either surface — `/`, `/dashboard`, `/semesters`, `/courses`, `/assignments`, `/calendar`, `/availability`, `/plan` (now reachable from the drawer too), `/profile`, `/verify-email` (account A) — plus Login/Register unauthenticated. Expect each to load as before the redesign.

## 9. CANNOT VERIFY register

**Mandatory (block the verdict — F-EP11-01):**
1. TR-E11-03 executed manual accessibility review (keyboard-only traversal, screen-reader spot check, live focus management) — no browser/AT; no executed evidence exists in any record.
2. TR-E11-04 emulated `prefers-reduced-motion` observation — same.
3. DoD 10 integrated-environment review — no integrated/browser evidence recorded for EP11.
4. D11-9 live 44px/focus-ring visual confirmation (subsumed in 1).
5. PR-004 browser negative case (rides the same pass; polish-classed item whose closure vehicle is mandatory evidence).

**Non-mandatory (disclosed, not blocking):**
6. Reviewer-executed vitest/typecheck/lint — no shell in this runtime; authorized-helper (coordinator) runs at the reviewed HEAD stand in with that label.
7. Per-commit blob diffs / `git show --stat` / byte-identity of the untouched desktop describe; working-tree dirt — raw refs+reflog used instead (provenance class accepted in both plan passes).

## 10. Deferred on this non-passing verdict (coordinator-owned)

Per skill + AGENTS.md ("on a non-passing verdict the reviewer saves the report only and returns the explicit Git handoff for deferred edits"):

- **Not written (deliberately):** `artifacts/EP11/walkthrough.md` — the skill gates the final walkthrough on a passing verdict ("On a non-passing verdict save the report only; do not publish a final walkthrough"). §8 already carries every user-facing workflow with expectations and honest labels, so the human pass is executable today; the walkthrough lands at pass 2. The dispatch's "required regardless of verdict" instruction is superseded here by the skill/AGENTS.md non-pass rule; this is the concrete deferred item, not a forgotten write.
- **Not applied (queue/docs):** child rows stay `Implemented — awaiting parent review` (correct); `Active substory: None` stays; `Next substory` should be reconciled by the coordinator to: **user — execute §8 (F-EP11-01 closure), then reviewer pass 2**; parent `Status:` line stays accurate (parent review pending); **no** `## Implementation review log` entry (passing-sync-only — a pass-2 log entry will record both passes). This report is intentionally NOT reflected in the queue until the coordinator commits it.
- **Git handoff (this pass):** exactly one changed path — `docs/stories/EP11/artifacts/EP11/review.md` (new). Nothing staged or committed by the reviewer; the two foreign dirty paths remain untouched. The coordinator commits this report and reconciles the Autopilot checkpoint (close `EP11-parent-review-1` with the FAIL verdict, `open_findings: true`, owner `user`, next edge = human-evidence pass → pass-2 re-review).

**Handoff summary.** Everything code-verifiable in the EP11 unit is correct and green. One blocking, human-closable obligation remains: execute §8 (or rule a dated, exactly-scoped waiver, EP08 style) and record the result; then dispatch a fresh pass-2 reviewer who will close F-EP11-01, write `walkthrough.md`, and perform the passing docs sync (queue → `Reviewed`, log entry, status line).
