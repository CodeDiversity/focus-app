# EP16D implementation record

**Story:** [EP16D — Navigation and the Session Indicator](../../EP16D-navigation-and-session-indicator.md)
**Status:** Implemented — awaiting parent review (EP16 combined review after EP16F)
**Date:** 2026-11-18
**Baseline:** `5764e1b` (EP16C).
**Commit scope:** `widgets/header/ui/navGroups.ts` (new contract) + `navGroups.test.ts` (new); `widgets/header/ui/Header.tsx` (`DesktopMenu = 'work' | 'account'`, `<SessionIndicator />` first in `<header>`, D-D5 route-change rule) + `Header.test.tsx` (re-targeted) + `Header.postLogin.test.tsx` (new, BL-14-07 reproduction); `widgets/session-indicator/` (new: `model/CurrentSessionProvider.tsx`, `model/useCurrentSession.ts`, `ui/SessionIndicator.tsx` + tests); `widgets/layout/ui/Layout.tsx` (provider mount); `entities/study-session/model/elapsed.ts` (new, + test); `features/focus-session/model/useFocusSession.ts` and `ui/FocusTimer.tsx` (use the extracted helper); `pages/focus/ui/FocusPage.tsx` (+ test) empty-state header/copy/Go to Today; `pages/courses/ui/CoursesPage.tsx` (+ test) Semesters link; `app/App.test.tsx` (`getCurrentStudySession` mock); `e2e/adaptive-scheduling.spec.ts` nav block re-point (test-only); this record, story, queue, efficiency.

Decisions applied: D16-6 (a), D16-11, D16-12, D16-14; D-D1…D-D4 (ratified 2026-11-17, "ratify all"); **D-D5…D-D8 ratified by the user 2026-11-18 ("ratify remaining") before implementation start** — no default ratification was needed. Checkpoint: not needed — completed in one session.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP16D-AC1 — nav contract: Today, Plan, Calendar, Work ▾ {Assignments, Courses}; Home signed-out only; account menu unchanged; desktop three links + one dropdown; drawer same set + Account; `aria-current` and group highlighting; EP11 keyboard model | **Done.** `navGroups.ts` is exactly the contracts' shape (icons: `Sun`, `CalendarCheck`, `Calendar`, `Briefcase`, `ClipboardList`, `BookOpen`, `Home`; unused icon imports dropped; `NavSection.id` doc comment updated). All EP11 keyboard cases re-targeted to **Work** and pass unchanged. Drawer focusables are now 9 (close, Today, Plan, Calendar, Assignments, Courses, Profile, Verify email, Logout). | `navGroups.test.ts` (4), `Header.test.tsx` desktop (17) + drawer (14) |
| EP16D-AC2 — session strip on every protected page except `/focus`: Running (ticking) / Paused (static) + **Back to session**; nothing on `null`/`COMPLETED`/failure; read on pathname change + visibility, never an interval; one polite announcement without the time; link before the account menu; 44 px | **Done.** `CurrentSessionProvider` in `Layout` (D-D8) with a generation guard; `SessionIndicator` renders a persistent sr-only live span whose text is the state sentence only; the ticking time is inside an `aria-hidden` group; shown on `/focus/history`, hidden on `/focus` exactly (D-D2); DOM order strip → logo → nav → account trigger. | `CurrentSessionProvider.test.tsx` (8 of 10), `SessionIndicator.test.tsx` (13), `Header.test.tsx` strip (2), `elapsed.test.ts` (3) |
| EP16D-AC3 — after logout the indicator never shows the previous student's session; a read started for A is discarded | **Done.** The provider resets synchronously on a `user.id` change (before any read) and bumps the generation so in-flight responses for the previous student are dropped; `SessionIndicator` additionally renders only when `ownerId === user.id`. | `CurrentSessionProvider.test.tsx` "logout isolation" (2): A-with-session → logout → login as B renders nothing; A's late response discarded |
| EP16D-AC4 — Courses header **Semesters** link; Focus empty state `h1`, **Study history** link, new copy, **Go to Today**; no nav entry for either route | **Done.** Both links are plain ghost-styled `<Link>`s (no `<Button>` in `<a>` — axe `nested-interactive`); the running timer is untouched (D-D7, D16-12); the empty-state auto-focus moves to **Go to Today**. | `CoursesPage.test.tsx` (+1), `FocusPage.test.tsx` (4 incl. copy audit) |
| EP16D-AC5 — BL-14-07 reproduced, fixed in `Header.tsx` (menu state survives a programmatic `replace` redirect, D-D5), regression kept | **Done.** Reproduction confirmed the story's hypothesis — see below. Fix: the pathname close effect skips `REPLACE` navigations (`useNavigationType()`); a second effect closes menus and the drawer on any `user.id` change (logout, expiry, account switch). | `Header.postLogin.test.tsx` (1), `Header.test.tsx` route-change rule (3) |

## BL-14-07: recorded pre-fix failure

`Header.postLogin.test.tsx` (real `AuthProvider` + `PublicRoute` + `LoginPage` + `Header`, deferred onboarding read) was run against the unfixed `Header.tsx` first (2026-11-18, baseline `5764e1b`): after login the URL reached `/today`, the account menu was opened, and resolving the onboarding read with `completed: false` navigated to `/onboarding` — **the menu was gone** (`getByRole('menu', { name: 'Account' })` found nothing; vitest output: "1 failed | 7 passed"). This matches the story's two-replace-navigation hypothesis exactly (pathname change #2 fired `Header`'s close effect). With the D-D5 fix applied the same test passes, and it stays as the regression.

Residual (not fixed here, per the story's Out list): the same double navigation makes a new student see Today for one round-trip before `/onboarding` — already registered as **BL-16-07** at refinement; no new backlog row needed.

## Verification

- `apps/web` (working tree of this commit, 2026-11-18): `npx tsc --noEmit -p tsconfig.json` clean; `npx eslint src --max-warnings=0` clean; `npx vitest run` → **131 files, 1396 passed, 0 failed** (+40 net vs EP16C's 1356; one unrelated `CourseForm` timeout under full-suite load passed in isolation and in the confirming full re-run).
- **Playwright, full suite, external-stack mode** (EP15J/EP16A precedent; fresh DB `sp_elm_ep16d_1795021598`, migrated; API :4300, vite :3300 — 4200/3200 were occupied by another session's stack; shell-only placeholder `JWT_SECRET`; servers stopped and DB dropped afterwards): **61 passed, 0 failed, 1 skipped** (the planned EP16C `test.fixme`, D-C10), 33.3 s.
- API unchanged (D16-13); the only e2e edit is the AC-named nav block (`adaptive-scheduling.spec.ts` journey 7).

## Manual pass (TR-E16-04)

**Not executed** — no interactive browser/screen reader in this environment. Owed: VoiceOver/NVDA read-once check on the strip (start a session, go to Calendar; the sentence is announced once, ticks silent; Tab reaches **Back to session** before the logo) and the 360×640 one-line strip + 44 px target check. To be collected with EP16E's recorded pass in EP16F (TR-E16-04 collection). The structural halves are unit-tested (persistent live span, sentence-only text, `tabular-nums`, `min-h-[44px]`, DOM order).

**Update 2026-11-18 (user ruling, "mark all manual passes as passed/accepted"):** the owed manual pass is **accepted as passed by the user** on their authority; it was not machine-verified in this environment. The combined review may treat TR-E16-04 as closed by user sign-off (R-EP15K-02 precedent).

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP16D-01 | e2e setup | This worktree has no `apps/api/.env.local`, so the external-stack API needs a shell-only placeholder `JWT_SECRET` (the self-contained path would fail the same way). Recorded so the next implementer doesn't re-diagnose it. | Noted; no code change (test-run procedure only). | — |
| F-EP16D-02 | `Header.test.tsx` AC5 harness | A `userEvent.click` on any probe button closes the menus via the outside-`mousedown` handler before the navigation fires, masking the effect under test. The reproduction drives navigation through a window `CustomEvent` instead. | Noted as harness constraint; documented in the test. | — |

Deviations: none — scope exactly as refined; Today-before-onboarding flash already covered by BL-16-07.

## How to verify by hand

Not executed (no interactive browser); user instructions: sign in → the nav reads Today · Plan · Calendar · Work ▾, and Work opens Assignments/Courses with arrows, Home/End, Escape. Start a focus session, go to Calendar → a strip above the logo reads "Running · mm:ss" and ticks; pause on `/focus`, go to Plan → "Paused · mm:ss", static; **Back to session** returns to `/focus` (no strip there, but it shows on `/focus/history`). Finish the session → the strip is gone everywhere. Log out and in as another student → nothing shows. On Courses, **Semesters** sits left of **Add Course**; on `/focus` with no session, the page reads "Focus session" with **Study history** top-right and **Go to Today** as the primary. Sign in as a brand-new student and open the account menu immediately after landing — it stays open through the onboarding redirect.
