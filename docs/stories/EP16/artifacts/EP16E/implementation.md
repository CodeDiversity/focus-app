# EP16E implementation record

**Story:** [EP16E — Mobile Bottom Tab Bar](../../EP16E-mobile-bottom-tab-bar.md)
**Status:** Implemented — awaiting parent review (EP16 combined review after EP16F)
**Date:** 2026-11-18
**Baseline:** `ae202b0` (EP16D).
**Commit scope:** `shared/lib/useMediaQuery.ts` (new, + test); `widgets/tab-bar/` (new: `ui/TabBar.tsx`, `model/useTabBarVisible.ts`, + tests); `widgets/header/ui/navGroups.ts` (`mobileTabItems`) + `navGroups.test.ts`; `widgets/header/ui/Header.tsx` (md-gated desktop nav/auth area, relabelled signed-in menu button, Account-only signed-in drawer) + `Header.test.tsx`; `widgets/layout/ui/Layout.tsx` (bar mount + main padding) + `Layout.test.tsx`; `pages/focus/ui/FocusPage.tsx` (shared-session `refresh()` after Finish) + test; this record, story, queue, efficiency.

Decisions applied: ▲ D-E1 (b), D-E2 (a), D-E3 (a) (ratified 2026-11-17, "ratify all"); D-E4…D-E7 ratified by the user 2026-11-18 ("ratify remaining") before implementation start. Checkpoint: not needed — completed in one session.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP16E-AC1 — below `md` a fixed `<nav aria-label="Primary">` with five flat tabs (▲ D-E1 (b)), icon + visible label, `aria-current`, ≥ 44 px targets, visible focus rings; not rendered at `md`+; exactly one Primary landmark at any width | **Done.** `TabBar` renders `mobileTabItems` (derived from `authenticatedNavGroups`, no drift) as a `grid-cols-5` list of `NavLink`s without `end` (D-E7: Courses current on `/courses/:id`, Plan on `/plan/proposal`); 56 px cells, inset focus ring, weight + 2 px top indicator so active is never colour-only. `Header` renders the desktop nav and account trigger only when `useMediaQuery(MD_UP_QUERY, true)` is true (D-E2). | `TabBar.test.tsx` (10), `useMediaQuery.test.ts` (3), `Layout.test.tsx` landmark cases (4), `Header.test.tsx` gating (2) |
| EP16E-AC2 — main padded by bar height + `env(safe-area-inset-bottom)` below `md`; skip link unchanged | **Done.** `LayoutChrome` adds `pb-[calc(3.5rem+env(safe-area-inset-bottom))]` to `<main>` exactly when `useTabBarVisible()` is true — one rule for the bar and the padding. `index.html` untouched (D-E6 (a)). | `Layout.test.tsx` padding cases (2) + kept skip-link/landmark cases |
| EP16E-AC3 — signed-in drawer = Account only; hamburger + EP10C mechanics unchanged; relabelled (D-E5) | **Done.** The signed-in drawer drops its `<nav>`; title "Account" (`id="mobile-nav-title"`), dialog `aria-labelledby` instead of `aria-label="Primary navigation"`; the section's duplicate `h2` is gone. Button reads "Open/Close account menu" signed in, "Open/Close menu" signed out. Focus trap, Escape, scroll lock, D-D5 route-change rule untouched (trap now over close → Profile → Verify email → Logout). Signed-out drawer byte-identical behaviour. | `Header.test.tsx` drawer describe (9) + route-change cases re-targeted |
| EP16E-AC4 — no bar on `/focus` while ACTIVE/PAUSED (or unsettled); back with no session; after Finish without a route change; reduced motion | **Done.** `useTabBarVisible` hides on `/focus` until the read settles and while ACTIVE/PAUSED (D-E3 (a)); a failed read counts as no session (D-D4). `FocusPage.onFinished` calls the shared provider's `refresh()`. The bar has no entrance/exit animation; the only transition is `transition-colors`. | `useTabBarVisible.test.tsx` (8), `FocusPage.test.tsx` refresh case, `TabBar.test.tsx` motion case |
| EP16E-AC5 — copy audit; manual pass recorded | **Done / recorded as owed.** `expectNoForbiddenWords` over the bar passes. The screen-reader and 320/360-px manual checks could not be executed here — see below. | `TabBar.test.tsx` copy audit; § Manual pass |

## Verification

- `apps/web` (working tree of this commit, 2026-11-18): `npx tsc --noEmit -p tsconfig.json` clean; `npx eslint src --max-warnings=0` clean; `npx vitest run` → **134 files, 1428 passed, 0 failed** (+32 net vs EP16D's 1396).
- **Playwright, full suite, external-stack mode** (fresh DB `sp_elm_ep16e_1795025778`, migrated; API :4301, vite :3301 — 4300/3300 occupied by another session; shell-only placeholder `JWT_SECRET`; servers stopped and DB dropped afterwards): **61 passed, 0 failed, 1 skipped** (the planned EP16C `test.fixme`), 22.1 s. This includes the story's three narrow-viewport risk journeys (`assignments-list.spec.ts:212` 375×667, `calendar.spec.ts:175` 375×667, `catch-up.spec.ts:683` 320×568) and the mobile focus-controls journey — the fixed bar intercepted no clicks.
- API unchanged (D16-13). No e2e source edits were needed.

## Manual pass (TR-E16-04)

**Not executed** — no interactive browser/screen reader in this environment. Owed to the EP16F collection, together with EP16D's: VoiceOver (iOS) / TalkBack at 360×640 (one Primary landmark, current tab read as "current page", five labels); "Assignments" fits at 320×568 without truncation; hero control visible above the bar with and without the 44 px session strip; last Assignments/Courses row scrolls fully above the bar; bar absent during a running session on `/focus` and back after Finish. The structural halves are unit-tested (one landmark per width, padding class, 44 px/`min-h-14` targets, `aria-current`, no-animation).

**Update 2026-11-18 (user ruling, "mark all manual passes as passed/accepted"):** the owed manual pass is **accepted as passed by the user** on their authority; it was not machine-verified in this environment. The combined review may treat TR-E16-04 as closed by user sign-off (R-EP15K-02 precedent).

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP16E-01 | `Header.tsx` mobile menu button | **Deviation from the story's "the hamburger stays CSS `md:hidden` and is not gated".** With D-E5's rename, an ungated signed-in hamburger and the desktop account trigger would both sit in the DOM named "Open account menu" at `md`+ (CSS-hidden only) — ambiguous in jsdom (it breaks `VerifyEmailPage.test.tsx:114`'s `getByRole`) and a hidden duplicate control in markup. The signed-in button is therefore gated behind `!isMdUp` (the same D-E2 principle); the signed-out button keeps the CSS-only hide, so D-E4's "unchanged" holds and signed-out tests needed no stubs. D-E5's "the name stays unique" now holds in the DOM, not just visually. | Implemented; story text not amended (AC text untouched — AC3 says "the hamburger button … unchanged", which this reading keeps for behaviour below `md`). Flagged for the combined review. | reviewer |
| F-EP16E-02 | `useTabBarVisible` / provider semantics | AC4's "hidden on `/focus` until the first read for the route settles": the shared provider's `settled` flag is per-student, not per-route (it stays true across route changes while the latest state is kept). The flash the rule prevents (show-then-hide on `/focus` entry) can therefore still occur in one narrow case: the cached state says "no session" while a session was started on another tab/device and the `/focus` re-read is in flight. Accepted — the same staleness window exists for the header strip (EP16D), and the next read corrects it. | Noted; no change. | — |

## How to verify by hand

Not executed (no interactive browser); user instructions: on a phone-width window (< 768 px), sign in → a bottom bar shows Today · Plan · Calendar · Assignments · Courses with the current tab highlighted (colour + weight + top line); the header keeps only the logo and an account button that opens an "Account" drawer (Profile, Verify email, Logout). Widen past 768 px → the bar disappears and the desktop nav returns; exactly one is ever present. Open a course detail page → the Courses tab stays current. Start a focus session → on `/focus` the bar is gone (the strip is too); go to Calendar → strip on top, bar at the bottom, and the page's last row scrolls clear of the bar. Finish the session on `/focus` → the bar reappears without navigating.
