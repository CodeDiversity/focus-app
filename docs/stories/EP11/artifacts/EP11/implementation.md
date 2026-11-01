# EP11 parent implementation index (combined review unit)

**Parent:** [EP11 — Navigation & Information Architecture (ADHD-friendly)](../../README.md)
**Prepared:** 2026-11-01 by the EP11B implementer (index owner per the README "Final implementation review unit" table).
**Review unit:** EP11A + EP11B — one combined review (`./review.md` + `./walkthrough.md`, DoD 10/11).
**Unit baseline:** `3853aaa` (before EP11A's first included change). **HEAD when implemented:** `8b7cd6a`.
**State:** both children implemented and green at HEAD; **ready for the combined parent review**. No DoD 10/11 claim here — implementation completion is not approval.

## Child outcomes

| Child | Outcome | Implementation record | Commits (nav surface) |
|---|---|---|---|
| EP11A — desktop grouped navigation & account menu | Desktop nav renders `getNavGroups` (Home/Dashboard single links + Academics/Planning dropdowns) and an avatar account menu (identity, Profile, Availability, conditional Verify email, Logout); single-open `openMenu`, `useMenuFocus` keyboard model, `aria-expanded`/`aria-haspopup`/`role="menu"`. Historical record verbatim (predates the `Plan` amendment — truthful at its date). | [../EP11A/implementation.md](../EP11A/implementation.md) | `b7ae794` (feature) + `1aec0ea` (story-status docs) |
| EP11B — mobile drawer grouped sections & Account section | Legacy flat drawer list replaced by data-driven grouped rendering (single links + headed Academics/Planning regions incl. ratified `Plan`) and an Account section (identity row, Profile/Availability, conditional Verify email, Logout) reusing EP10C behavior unchanged. | [../EP11B/implementation.md](../EP11B/implementation.md) | `8b7cd6a` (feature; closeout docs in the following `docs(EP11B)` commit) |

## Nav-surface history map — `3853aaa` → `8b7cd6a`

`git log --oneline 3853aaa..HEAD -- apps/web/src/widgets/header/ui/` at `8b7cd6a` returns exactly three commits:

1. `b7ae794` **feat(EP11A)** — desktop grouped nav + account menu; created `navGroups.ts`; rewrote `Header.test.tsx` (17 desktop + 5 drawer cases); adapted 4 page/widget test files that referenced the removed inline desktop Logout/Verify controls (recorded as EP11A F-A-3).
2. `2e35061` **feat(web): EP06F** (2026-10-30) — **not an EP11 commit**: EP06F's *ratified additive amendment* of the shared `navGroups.ts` (+`Plan` entry, `navGroups.ts:84`) and one dependent `Header.test.tsx` assertion (last Planning menuitem = `Plan`). Authorized by the EP06F story (scope item 2 + AC 1) and passed the combined EP06 parent review 2026-10-30; EP11 ratifies it in the parent README (D11-4, shared nav contract; plan-review PR-001). It is in the baseline history between the children, consumed — not re-implemented — by EP11B.
3. `8b7cd6a` **feat(EP11B)** — grouped drawer rendering + Account section consuming the contract as-is; removes `navLinks`/`NavLinkItem`/`showVerify`; header test suite extended to 30 cases.

## Nav regression verification (baseline `3853aaa` → HEAD, implementer-executed)

- **Desktop (EP11A) unmodified by EP11B:** the 17 `Header desktop grouped navigation (EP11A)` cases are byte-identical in the `8b7cd6a` diff (EP11B touched only the two mobile drawer cases + appended a new describe) and pass unmodified at `8b7cd6a`.
- **EP10C drawer behavior regressions green:** hamburger toggle, Escape + (now explicitly asserted) hamburger focus-restore, link-click close (now `within(dialog)`-scoped), body scroll lock, unauthenticated auth actions.
- **Route reachability:** no route changes anywhere in the unit; drawer gains `Plan`/`/plan` (parity restoration, PR-001) and keeps every legacy target (`/`, `/dashboard`, `/semesters`, `/courses`, `/assignments`, `/calendar`, `/availability`, `/profile`, `/verify-email`, plus Login/Get Started unauthenticated).
- **Full-suite regression (TR-E11-02):** `pnpm --filter web test` → **100 files / 1140 tests passed** at the implemented tree (identical to HEAD `8b7cd6a`). PR-005 gate honored: green at current HEAD is the standard; the dated 829/842 counts in the EP11A record are history (EP06F added tests between baseline and HEAD).
- **Header suite:** `pnpm --filter web test -- src/widgets/header` → 1 file / **30 tests passed** (22 existing, 2 strengthened + 8 new EP11B).
- **Static gates:** `pnpm --filter web typecheck` exit 0; `pnpm --filter web lint` exit 0 (`--max-warnings 0`).
- Working-tree caveat: counts above were produced on the working tree identical to HEAD `8b7cd6a` (verified post-commit: no `apps/web` diff); foreign dirty paths (`.agents/skills/autopilot/SKILL.md`, `.agents/workflow-graph.md`) are another contributor's and were never staged or inspected.

## Cross-child integration checks (single-source contract)

- Both surfaces consume the same `getNavGroups(isAuthenticated)` / `accountMenuItems`; no link exists in one surface but not the other (the pre-EP11B `/plan` drawer gap is closed by `8b7cd6a`).
- D11-8 keep-both verified: `Availability` in Planning + Account, asserted 1-in-nav / 2-in-dialog (accepted duplicate accessible names — screen-reader wording is a planner-level call if ever revisited).
- Focus-trap arithmetic matches the corrected story risk note: 13 authenticated focusables (12 verified), first = drawer close, last = Logout — guarded by the wrap test.
- Shared styling: `navLinkClass` mobile/desktop branches emit gap classes exclusively; desktop class output is unchanged.

## Open gates for the combined parent review (not implementer-closable)

1. **DoD 10/11:** one combined review — `./review.md` + final `./walkthrough.md` (reviewer-owned).
2. **TR-E11-03/04 executed manual evidence:** keyboard-only traversal (both dropdowns, account menu, drawer), screen-reader spot check incl. duplicate `Availability` naming, emulated `prefers-reduced-motion`, 320–375px narrow-viewport check, D11-9 44px/focus-ring visual confirmation.
3. **PR-004 (polish, routed to the review):** explicit outside-click focus-restore negative case in the manual keyboard pass.
4. **PR-003 / PR-006 (polish):** coordinator annotation of `../EP11A/checkpoint.md` stale line; optional docs polish — remain with their owners.
5. Reviewer must re-run header suite + full web suite + typecheck + lint at its own baseline and report actual output (plan-review pass-2 requirement).
