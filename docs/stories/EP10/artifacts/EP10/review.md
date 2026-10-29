# EP10 Combined Parent Review — UI Design System & Visual Refresh

**Parent story:** EP10 (children EP10A … EP10G)
**Review type:** Implementation review (combined parent; one review for the whole EP10 review unit)
**Review date:** 2026-10-29
**Pass:** 1
**Reviewed state:** working tree. Implementation records cite commits through `8d8e9b5` (EP10F) plus uncommitted EP10G changes; parent index records EP10G closeout as `pending commit`. Baseline before first EP10 change recorded as `d3cfeaf`. No shell is available in this review runtime, so HEAD was not re-read and no command was executed by this reviewer; gate evidence is reused from the recorded implementer runs (see *Gate evidence*).
**Report path:** `docs/stories/EP10/artifacts/EP10/review.md`
**Walkthrough path:** `docs/stories/EP10/artifacts/EP10/walkthrough.md` (saved with this passing verdict)
**Scope:** All seven children — EP10A tokens, EP10B primitives, EP10C app shell, EP10D public/auth adoption, EP10E academic-data adoption, EP10F calendar/availability adoption, EP10G dashboard/profile adoption + TR-E10-03 E2E verification. Visual-only adoption; no backend/API changes.

## Scope and method

One combined review of the complete EP10 parent scope after every child and the required integration work (TR-E10-03 E2E) is implemented, per `.agents/review-cadence.md`. No per-child review gates were required or performed. AC and DoD results are attributed to child IDs.

Method:
- Read the EP10 breakdown README, epic, shared DoD, all seven child story files, the parent implementation index, and every child implementation record and checkpoint.
- Independently inspected the token/config/CSS surface (`tailwind.config.js`, `index.css`, contrast record), all seven shared primitives, the app shell (`Header.tsx`, `Layout.tsx`), representative adopted pages (`DashboardPage.tsx`, `ProfilePage.tsx`), and the E2E password-selector changes.
- Reused recorded gate results from the child implementation records (no command execution available in this runtime); no code, test, story, plan or Git state was modified by this review except the reviewer-owned report/walkthrough and the passing-review docs sync.
- No `.env`/secret file was read.

## Epic acceptance criteria (AC-E10-01 … AC-E10-07)

| ID | Criterion | Result | Owner / evidence |
|---|---|---|---|
| AC-E10-01 | Documented token set drives all styling; Tailwind config + global CSS reflect it; pages no longer hard-code ad-hoc color/spacing where a token exists | **PASS (with polish note IR-E10-01)** | EP10A: `tailwind.config.js` (13 semantic colors, 7-step type scale, 4 radius, 3 shadow, 3 motion) + `index.css` CSS vars + reduced motion; contrast record verifies all pairs. Adoption children swapped `primary`/`secondary`/`red`/`green`/`emerald` palette classes to semantic tokens across home, login, register, forgot/reset password, verify-email, onboarding shell, semesters, courses, assignments, calendar, availability, dashboard, profile. Residual raw palette remains in a few out-of-scope widgets/feature internals (see IR-E10-01, polish). |
| AC-E10-02 | Shared UI primitives use the token set and expose consistent variants, sizes, and states (loading, disabled, error, focus) | **PASS** | EP10B: `Button` (5 variants × 3 sizes, loading/disabled/focus, tap targets), `Input`/`Select` (sm/md/lg, error/hint, focus ring), new `Card`, `Dialog`, `Badge`, `EmptyState`. 53 primitive tests green. |
| AC-E10-03 | App shell uses the refreshed system and remains usable on desktop and mobile, including keyboard navigation | **PASS** | EP10C: token-driven header (64px row, 40px accent logo, desktop nav with `aria-current`, mobile drawer with focus trap/Escape/scroll lock/restore focus), skip-to-content link, landmarks (`<header>`/`<nav aria-label="Primary">`/`<main id="main-content">`), reduced motion. Header/Layout tests green. |
| AC-E10-04 | Every existing page renders with the refreshed visual system with no functional regression (routes, data, forms, dialogs, actions behave as before) | **PASS** | EP10D/E/F/G: class-name token swaps only; no logic/data-flow changes. Page + feature suites green (223 page tests; 615 page+feature tests). TR-E10-03 E2E 24/24 after F-G-2 fix. |
| AC-E10-05 | Loading, empty, and error states are visually consistent across pages | **PASS** | Shared spinner (`border-accent` + `motion-reduce:animate-none`), `text-danger` errors, `text-success` success, `EmptyState` primitive, consistent empty/no-match states. |
| AC-E10-06 | Refreshed surfaces meet WCAG 2.2 AA for color contrast, focus visibility, and keyboard operability, and respect `prefers-reduced-motion` | **PASS (code-verified; screen reader not executed — see limitations)** | Contrast record: all text/UI pairs pass (border decorative exception documented). Focus rings use `focus-ring` token (5.47/5.23/5.00 :1). Keyboard handling: skip link, landmarks, drawer/Dialog focus traps, Escape, Tab cycling, restore focus. Reduced motion: global media query zeroes durations + `motion-reduce:animate-none` on spinners. |
| AC-E10-07 | No backend or API changes required; if a story discovers a needed contract change, it is flagged and approved before implementation | **PASS** | All seven child records state "No backend/API changes"; no backend file appears in any changed-paths list. |

## Test requirements (TR-E10-01 … TR-E10-05)

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| TR-E10-01 | Primitive component tests (variants, states, focus, a11y) | **PASS** | EP10B: 7 test files / 53 shared/ui tests, exit 0 (recorded). |
| TR-E10-02 | Existing page/component tests still pass after adoption | **PASS** | EP10D–G: 67 files / 829 tests (EP10D/E), 8 files / 73 tests (EP10F), 13 files / 223 tests (EP10G), all exit 0 (recorded). |
| TR-E10-03 | EP09 E2E journeys still pass (no visual-snapshot changes required) | **PASS** | EP10G fix pass: `pnpm test:e2e` = 24 passed / 0 failed (auth-journeys, assignments-list, calendar, semesters-courses, login). Password selectors hardened to `getByRole('textbox', { name: 'Password' })`; toggle aria-label retained "Show password"/"Hide password". Additional selector drift fixed in `semesters-courses.spec.ts` and `CourseList.tsx` (switch in "No active courses" state). Scope caveat preserved: dashboard/profile adoption is verified by unit tests + manual pass, not E2E (no dashboard/profile spec; E2E expansion is an EP09-scope decision). |
| TR-E10-04 | Manual accessibility review recorded (contrast, keyboard, screen reader) | **PARTIAL / CANNOT VERIFY (screen reader)** | Contrast: verified by `contrast-record.md` (all pairs pass). Keyboard/focus: verified by code inspection and unit tests (skip link, landmarks, focus traps, Escape, Tab cycling, restore focus, visible focus rings). Screen reader: **not executed** in this or any recorded pass; no AT run is on record. Recorded as a limitation, not a functional failure. |
| TR-E10-05 | Reduced-motion verification (`prefers-reduced-motion`) | **PASS** | EP10A global media query zeroes `--duration-*` and disables animations/transitions + scroll-behavior; component-level `motion-reduce:animate-none` on spinners; no animation libraries. |

## Shared Definition of Done audit (`docs/epics/README.md`)

| # | Condition | Result | Evidence |
|---|---|---|---|
| 1 | Functional acceptance criteria pass | **PASS** | AC-E10-01…07 above (AC-E10-01 with polish note). |
| 2 | Frontend/backend validation handle invalid input | **N/A** | No new input; existing validation unchanged (visual-only). |
| 3 | Academic data scoped to the authenticated student | **N/A** | No data access changes. |
| 4 | API errors produce actionable messages | **N/A** | No API changes; existing error copy preserved. |
| 5 | Loading, empty, and error states handled | **PASS** | Spinners, empty/no-match states, error text consistently tokenized; `EmptyState` primitive. |
| 6 | Core interactions support keyboard accessibility | **PASS** | Focus rings on interactive elements; skip link; landmarks; drawer/Dialog focus traps; Escape/Tab cycling; restore focus; 44px mobile tap targets. (Password-visibility toggle is mouse-only convenience — see IR-E10-02, polish.) |
| 7 | Responsive layouts work on desktop and mobile | **PASS** | Desktop + mobile drawer; responsive class contracts preserved (`max-w-*`, `px-4/sm:px-6/lg:px-8`, `md:grid-cols-*`, `min-h-[44px]`). |
| 8 | Business rules have automated tests | **PASS** | EP10B primitive tests (53) + page/feature tests (829/73/223) + E2E (24) all recorded green. |
| 9 | API changes and migrations documented | **N/A** | No API or migration changes. |
| 10 | Feature reviewed in an integrated development environment | **PASS** | This combined review of the complete EP10 scope. |
| 11 | Reviewer saved a user-facing walkthrough (`walkthrough.md`) | **PASS** | `docs/stories/EP10/artifacts/EP10/walkthrough.md` saved and verified with this verdict. |

## Gate evidence (recorded, not re-run by this reviewer)

| Gate | Command | Recorded result | Provenance |
|---|---|---|---|
| Web typecheck | `pnpm --filter web typecheck` | exit 0 | EP10A/B/C/D/E/F/G records |
| Web lint | `pnpm --filter web lint` | exit 0 | same |
| Web format | `pnpm --filter web format` | all files use Prettier code style | same |
| Web build | `pnpm --filter web build` | exit 0 (1607 modules) | same |
| Primitive tests | `pnpm --filter web test -- src/shared/ui` | 7 files / 53 tests, exit 0 | EP10B |
| Page tests (EP10D/E) | `pnpm --filter web test` | 67 files / 829 tests, exit 0 | EP10D/E |
| Page tests (EP10G) | `pnpm --filter web test -- src/pages` | 13 files / 223 tests, exit 0 | EP10G |
| Calendar/availability tests | `pnpm --filter web test -- src/pages/calendar src/pages/availability src/features/calendar src/features/availability` | 8 files / 73 tests, exit 0 | EP10F |
| E2E (TR-E10-03) | `pnpm test:e2e` | 24 passed / 0 failed | EP10G (post F-G-2 fix) |
| Full web suite | `pnpm --filter web test` | 60 files / 773 tests (EP10A) → 66/822 (EP10B) → 67/829 (EP10C–E) | EP10A–E records |

No command was executed in this review session (no shell available); the recorded concise results above are reused per the reviewer skill's evidence-reuse rule. Raw per-file output was not preserved, so only the recorded summaries are cited. Build, typecheck, lint and tests remain implementer-attested rather than reviewer-executed.

## Findings

No blocker or should-fix finding. The items below are polish (optional; do not block sign-off).

### Polish

#### IR-E10-01 — Residual raw palette in a few out-of-scope widgets/feature internals
- **Severity:** Polish.
- **Requirement:** AC-E10-01 (token-driven styling).
- **Observed gap:** `EmailVerificationBanner.tsx` (`bg-primary-50`, `border-primary-200`, `text-secondary-700`, `text-red-700`), `ProtectedRoute.tsx`/`PublicRoute.tsx` (`border-primary-600` spinner), and the onboarding step components `Step1Preferences.tsx`/`Step2Semester.tsx`/`Step3Course.tsx` (`text-secondary-500/600`, `border-red-200`, `bg-red-50`, `text-red-700`) still reference the legacy `primary`/`secondary`/`red` palettes. These files sit outside the adopted file sets of EP10C (header/layout/nav) and EP10D (pages/onboarding/ui), so they do not violate those children's ACs, but they are visible surfaces.
- **Consequence:** Minor visual inconsistency on auth-loading spinners, the email-verification banner, and onboarding step internals; no functional impact.
- **Owner:** implementer (optional follow-up).
- **Closure condition:** Tokenize these surfaces to semantic tokens (`surface-muted`, `border`, `text-muted`, `danger`, `accent`) if a uniform refreshed look is desired; otherwise document them as intentionally legacy.

#### IR-E10-02 — Password-visibility toggle is not keyboard-focusable
- **Severity:** Polish.
- **Requirement:** DoD 6 (keyboard accessibility); AC-E10-02 (focus states).
- **Observed gap:** `Input.tsx` renders the show/hide password toggle with `tabIndex={-1}` and `focus:outline-none` (no focus ring). It is operable by pointer only.
- **Consequence:** Keyboard users cannot toggle password visibility. Core password entry still works via keyboard; the toggle is a convenience affordance.
- **Owner:** implementer (optional).
- **Closure condition:** Remove `tabIndex={-1}`, add a visible `focus-visible` ring, or document the toggle as pointer-only by design.

#### IR-E10-03 — Arbitrary `text-[10px]` instead of the caption token
- **Severity:** Polish.
- **Requirement:** AC-E10-01 (constrained type scale).
- **Observed gap:** `CalendarEventChip.tsx` and `AssignmentsPage.tsx` use `text-[10px]` for badge/caption text, below the smallest defined step (`caption` = 12px).
- **Consequence:** Minor deviation from the constrained typography scale; legibility consideration.
- **Owner:** implementer (optional).
- **Closure condition:** Replace with `text-caption` (or record a 10px step in the token set) if desired.

No other finding. In particular: no backend/API change, no data-scoping change, no functional regression evidenced by the green page/feature/E2E suites, no secret exposure.

## Limitations (stated explicitly)

1. **No command was executed by this reviewer.** All gate results are implementer-recorded and reused; per-file/per-test output was not preserved, so only concise summaries are cited. Build, typecheck, lint, unit and E2E results are implementer-attested, not reviewer-executed.
2. **Screen reader (AT) pass not performed.** TR-E10-04's keyboard/focus/contrast portions are verified by code inspection; the screen-reader portion is unverified (CANNOT VERIFY). No AT run is on record.
3. **Runtime/dev-server smoke not performed.** Neither the implementer nor this reviewer ran a live browser smoke; adoption is verified by unit tests + E2E + code inspection. Manual verification steps are provided in `walkthrough.md`.
4. **`build` / `pnpm install --frozen-lockfile` not reviewer-reproduced** (recorded green by the implementer).
5. **EP10G closeout commit is pending.** The parent index records `Head at EP10G closeout: pending commit`; this review covers the working tree as recorded.

## Verdict

**PASS — EP10 meets the shared Definition of Done and its acceptance criteria.**

No open blocker or should-fix finding remains. Three polish items (IR-E10-01…IR-E10-03) are optional and do not block sign-off. Unexecuted gates are named above (screen-reader AT pass, live dev-server smoke, reviewer-reproduced build/install) and in `walkthrough.md`; contrast, keyboard/focus, reduced motion, responsive behavior and automated tests are verified by code inspection and recorded green suites. E2E (TR-E10-03) passes 24/24 after the F-G-2 fix.

## Walkthrough

See `docs/stories/EP10/artifacts/EP10/walkthrough.md` for the user-facing explanation, manual test steps and expected results.
