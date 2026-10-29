# EP10 Walkthrough — UI Design System & Visual Refresh

**Parent story:** EP10 (children EP10A … EP10G)
**Final review:** `docs/stories/EP10/artifacts/EP10/review.md` (PASS, 2026-10-29)
**Scope:** All seven children — design tokens, shared UI primitives, app shell refresh, and visual adoption across public/auth, academic-data, calendar/availability, and dashboard/profile pages. Visual-only change; no backend/API changes.

## 1. What changed

EP10 refreshes the entire web app to a calm, token-driven, ADHD-friendly visual system without changing product behavior. Routes, data flows, forms, dialogs and actions behave as before; only presentation changed.

- **EP10A — Design tokens & theme foundation:** `apps/web/tailwind.config.js` gained semantic color tokens (`background`, `surface`, `surface-muted`, `text`, `text-muted`, `border`, `border-strong`, `accent`, `accent-hover`, `danger`, `success`, `warning`, `focus-ring`), a constrained typography scale (`display`/`h1`/`h2`/`h3`/`body`/`body-sm`/`caption`), radius steps (`sm`/`md`/`lg`/`xl`), shadow steps (`sm`/`md`/`lg`), and motion durations (`fast`/`base`/`slow`) with standard easing. `apps/web/src/index.css` exposes the color/motion values as CSS custom properties in `:root` (RGB channels) and rewrites base styles and the legacy `.card`/`.btn*`/`.input-error`/`.error-message` classes to consume tokens. Reduced motion zeroes durations under `prefers-reduced-motion`. The legacy `primary`/`secondary` palettes are retained for compatibility (D10-1).
- **EP10B — Shared UI primitives refresh:** `Button`, `Input`, `Select` migrated to tokens with consistent variants/sizes/states (loading spinner + `aria-busy`, disabled, error, focus ring, 44px mobile tap targets); new `Card`, `Dialog` (portal, focus trap, Escape, backdrop, scroll lock, restore focus, enter animation), `Badge`, `EmptyState`. 53 primitive tests.
- **EP10C — App shell refresh:** `widgets/header/ui/Header.tsx` (64px row, accent logo square, desktop nav with `aria-current`, mobile slide-in drawer with focus trap/Escape/scroll lock/restore focus) and `widgets/layout/ui/Layout.tsx` (skip-to-content link, landmarks, `EmailVerificationBanner` inside `<main>`).
- **EP10D — Public/auth pages adoption:** home, login, register, forgot/reset password, verify-email, onboarding wizard shell tokenized.
- **EP10E — Academic data pages adoption:** semesters, courses, course detail, assignments and their feature components (lists, cards, forms, dialogs, row actions, subtasks) tokenized.
- **EP10F — Calendar & availability adoption:** calendar week view + mobile agenda, event chips/details, availability slot list/form/delete dialog tokenized.
- **EP10G — Dashboard & profile adoption:** dashboard and profile tokenized; TR-E10-03 E2E verification (24/24 after the F-G-2 fix).

Contrast values are recorded in `docs/stories/EP10/artifacts/EP10A/contrast-record.md`.

## 2. How the code works

**Token flow.** Tailwind reads semantic colors from CSS custom properties (`rgb(var(--color-*) / <alpha-value>)`), so a single `:root` block in `index.css` is the source of truth for color and motion. Components and pages reference only semantic utility classes (`bg-surface`, `text-text-muted`, `text-accent`, `border-border`, `focus:ring-accent`, `duration-base`, etc.); raw palette classes (`primary-500`, `secondary-700`, `red-600`) are no longer used in adopted surfaces. Typography uses the named scale (`text-h1`, `text-body-sm`, `text-caption`) instead of arbitrary `text-[...]` (with a few noted exceptions).

**Primitive ownership.** `shared/ui/*` owns focus rings, tap targets, loading/disabled/error states and ARIA wiring once. Pages compose primitives (`Button`, `Input`, `Select`, `Card`, `Dialog`, `Badge`, `EmptyState`) rather than re-implementing styles, so consistency comes from a single source.

**App shell.** `Layout` renders the skip link first, then `Header`, then `<main id="main-content" tabIndex={-1}>` containing the email-verification banner and page content. The header's mobile drawer is a `role="dialog"` with a focus trap (Tab/Shift+Tab cycle, Escape closes, body scroll locks, focus restores to the hamburger on close) and closes on route change or link click. Desktop nav uses `NavLink` with `aria-current="page"` and an accent active style.

**Adoption.** Adoption stories are class-name token swaps only: no logic, data flow, validation, routing or component API changed. Error/success/loading states map to `text-danger`/`text-success`/`accent` spinners with `motion-reduce:animate-none`. Event-type identification in the calendar remains non-color (icons + text labels; course color stays a 3px left-border secondary cue).

**Reduced motion.** Under `prefers-reduced-motion: reduce`, `:root` durations resolve to `0.01ms`, animations/transitions are disabled, and `scroll-behavior` resets to `auto`; spinners also carry `motion-reduce:animate-none`.

## 3. Why it is correct

- **AC-E10-01 (tokens):** Tailwind config + `index.css` define all 13 semantic colors, 7 type steps, 4 radius, 3 shadow, 3 motion steps; contrast record verifies every text/UI pair (e.g. `text` on `background` 17.06:1, `text-muted` on `surface` 7.58:1, white on `accent` 5.47:1, `focus-ring` on `surface` 5.47:1). Adopted surfaces use semantic classes only.
- **AC-E10-02 (primitives):** 5 Button variants × 3 sizes, Input/Select sm/md/lg, Card 4×3, Badge 5×2, Dialog with focus trap/Escape/backdrop/restore focus; loading (`aria-busy`), disabled, error, focus all present and tested (53 tests).
- **AC-E10-03 (shell):** desktop + mobile drawer, keyboard-operable, skip link + landmarks, reduced motion; Header/Layout tests green.
- **AC-E10-04 (no functional regression):** adoption is token swaps only; page/feature suites green (829/829 after EP10E, 73/73 calendar+availability, 223/223 pages) and E2E 24/24 after F-G-2.
- **AC-E10-05 (states):** consistent spinners, empty/no-match, error text across pages.
- **AC-E10-06 (a11y + reduced motion):** contrast record passes; focus rings use the `focus-ring` token meeting 3:1+; keyboard handling in shell/primitives; reduced-motion media query + component guards.
- **AC-E10-07 (no backend):** no backend/API file changed in any child.

**Evidence.** Gate results are recorded in `review.md` (typecheck/lint/format/build all exit 0; 1607 modules; 24/24 E2E; 53 primitive tests; 829/829 + 73/73 + 223/223 page tests). Finding closure: no blocker or should-fix remains; three polish items (IR-E10-01…IR-E10-03) are optional and do not block sign-off.

## 4. Manual test workflows

Use a local dev stack (`pnpm dev` for web + API) with a disposable test account. Never use production data or shared credentials.

### Workflow A — Tokenized visual system (all pages)
1. Start the app and sign in.
2. Visit `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/onboarding`, `/dashboard`, `/semesters`, `/courses`, `/assignments`, `/calendar`, `/availability`, `/profile`.
3. **Expected:** consistent teal accent, slate text, white cards, subtle borders, Inter typography; no leftover blue/slate Tailwind palette or harsh reds/greens except status badges (danger/success/warning tokens) and course colors (data-driven).
4. Resize to mobile width (≤640px).
5. **Expected:** tap targets ≥44px, no horizontal overflow, cards stack, text remains legible.

### Workflow B — App shell and navigation
1. On desktop, tab from the address bar.
2. **Expected:** "Skip to main content" link appears first; activating it moves focus to `<main>`.
3. Tab through the header nav.
4. **Expected:** each link shows a visible focus ring; the active route has accent text + bottom border and `aria-current="page"`.
5. On mobile, open the hamburger menu.
6. **Expected:** drawer slides in from the right with backdrop; focus moves into the drawer; Tab/Shift+Tab cycles within it; Escape closes it and restores focus to the hamburger; clicking a link closes the drawer; route change closes it; body scroll is locked while open.
7. Click "Logout".
8. **Expected:** session clears and redirect to `/login`.

### Workflow C — Primitives (loading/disabled/error/focus)
1. Open a form (login or profile) and submit with invalid input.
2. **Expected:** input border turns danger, error text appears below, `aria-invalid` set, focus ring visible on tab.
3. Trigger a loading state (submit a form).
4. **Expected:** button shows spinner, is disabled, `aria-busy="true"`.
5. Open a dialog (create/edit course, delete assignment, event details, availability slot).
6. **Expected:** dialog centers with backdrop; Escape closes; Tab cycles within dialog; focus restores to trigger on close; backdrop click closes unless disabled.
7. Hover/focus a Badge and EmptyState.
8. **Expected:** consistent token colors and focus treatment.

### Workflow D — Reduced motion
1. Enable "Reduce motion" in OS settings (or DevTools → Rendering → prefers-reduced-motion: reduce).
2. Reload the app and navigate pages, open the mobile drawer and a dialog.
3. **Expected:** no transition/animation durations (drawer appears instantly, spinner stops animating, scroll is instant); layout and functionality unchanged.

### Workflow E — Keyboard-only pass
1. Unplug the mouse; navigate the whole app using Tab/Shift+Tab/Enter/Space/Escape.
2. **Expected:** every interactive control reachable and operable; visible focus ring on each; no keyboard trap except intentional focus traps in drawer/dialog (Escape exits).

### Workflow F — Functional regression (E2E)
1. Run `pnpm test:e2e` (Playwright, self-contained stack).
2. **Expected:** 24 passed / 0 failed (auth-journeys, assignments-list, calendar, semesters-courses, login). Database `studypilot_e2e_test` created and dropped.

### Workflow G — Manual accessibility (contrast + screen reader)
1. Review `docs/stories/EP10/artifacts/EP10A/contrast-record.md`.
2. **Expected:** all listed text/UI pairs pass WCAG 2.2 AA (≥4.5:1 text, ≥3:1 UI); `border` is the documented decorative exception.
3. (Optional, not performed in this review) Run a screen reader (VoiceOver/NVDA) over the shell and a representative page.
4. **Expected:** landmarks announced ("banner", "navigation", "main"), skip link works, form labels/errors announced, dialog title/description announced, focus management correct.

### Negative/edge cases
- Auth-loading spinner (ProtectedRoute/PublicRoute) should use the accent token (currently legacy `primary-600` — see IR-E10-01).
- Password-visibility toggle is pointer-only (see IR-E10-02); keyboard users type the password directly.
- Calendar event chips identify type by icon + text, not color alone; course color is a secondary cue.
- Empty states: "No active courses" shows a "Show archived" switch only when archived courses exist.
- E2E scope does not cover dashboard/profile (no spec); verify those manually via Workflows A and E.

## 5. Execution status

| Workflow | Status |
|---|---|
| A — Tokenized visual system (all pages) | Not executed — user test instructions (no browser smoke performed in this review). |
| B — App shell and navigation | Not executed — user test instructions. |
| C — Primitives (loading/disabled/error/focus) | Not executed — user test instructions (primitive behavior covered by 53 unit tests). |
| D — Reduced motion | Not executed — user test instructions (verified by code inspection + global media query). |
| E — Keyboard-only pass | Not executed — user test instructions (verified by code inspection of focus traps/rings). |
| F — Functional regression (E2E) | **Executed** — 2026-10-29, `pnpm test:e2e`, 24 passed / 0 failed (per EP10G record; database lifecycle completed). |
| G — Manual accessibility (contrast + screen reader) | Contrast **verified** by `contrast-record.md` (code inspection, 2026-10-29). Keyboard/focus **verified** by code inspection. Screen reader **not executed** — CANNOT VERIFY (no AT run on record). |

AC/DoD-required manual gates that remain unexecuted (screen-reader AT pass, live dev-server smoke) are named above and in `review.md`; they do not change the recorded green automated evidence.
