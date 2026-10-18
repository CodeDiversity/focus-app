# STUDY-21 — Configure Linter and Formatter (TECH-02)

**Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md) (cross-cutting technical task)
**Milestone:** M1
**Status:** Reviewed — **pass (qualified)** (2026-10-18, final parent review) — all three children implemented and passing; F-21-1 resolved (hardcoded credential replaced with GitHub Actions secret reference)
**Jira:** [STUDY-21](https://adhdstudy.atlassian.net/browse/STUDY-21)
**Dependencies:** STUDY-20 (TECH-01 — scaffold with baseline scripts and package deps)

## Original Acceptance Criteria (from Jira)

| # | Criterion |
|---|---|
| AC-01 | `npm run lint` and `npm run format` work per app and repo-wide, from a single shared configuration. |
| AC-02 | Lint errors fail CI; formatting is checked in CI. |
| AC-03 | jsx-a11y rules are active on the frontend and catch common accessibility violations (missing labels, alt text, focus management). |
| AC-04 | A commit with lint errors or unformatted files is rejected or corrected locally by the pre-commit hook. |
| AC-05 | The rules and how to run/fix them are documented in the README. |

## Original Test Requirements

| # | Requirement |
|---|---|
| TR-01 | `npm run lint` succeeds on a clean repo (both apps). |
| TR-02 | `npm run format -- --check` fails on intentionally malformed files. |
| TR-03 | CI pipeline fails when lint errors are present. |
| TR-04 | Pre-commit hook rejects a commit with lint errors or re-formats them. |
| TR-05 | jsx-a11y rules fire on a frontend file with a common accessibility violation (e.g. `<img>` without `alt`). |

## Shared Definition of Done (all stories)

1. Functional acceptance criteria pass.
2. Frontend and backend validation handle invalid input.
3. Academic data is scoped to the authenticated student.
4. API errors produce actionable messages.
5. Loading, empty, and error states are handled.
6. Core interactions support keyboard accessibility.
7. Responsive layouts work on desktop and mobile.
8. Business rules have automated tests.
9. API changes and migrations are documented.
10. The feature has been reviewed in an integrated development environment.

Applicable items for this technical task: **1, 8, 9, 10** (functional criteria on tooling; test coverage for configs; documentation; integrated review).

## Children

| Story | Title | Layer | Dependencies | Jira |
|---|---|---|---|---|
| [STUDY-21A](./STUDY-21A.md) | Shared Prettier + per-app ESLint configs | Backend + Frontend | — | STUDY-22 |
| [STUDY-21B](./STUDY-21B.md) | Pre-commit hooks (husky + lint-staged) | Infrastructure | STUDY-21A | STUDY-23 |
| [STUDY-21C](./STUDY-21C.md) | CI lint workflow | Infrastructure | STUDY-21A | STUDY-24 |

## Requirement Traceability

| AC / TR | Owning Child | Notes |
|---|---|---|
| AC-01 | STUDY-21A, STUDY-21B | Shared Prettier config + per-app ESLint; scripts updated in STUDY-21A, repo-wide script in STUDY-21B |
| AC-02 | STUDY-21C | CI workflow runs lint; fails build on errors |
| AC-03 | STUDY-21A | jsx-a11y installed and configured in frontend ESLint |
| AC-04 | STUDY-21B | Pre-commit hook rejects or auto-fixes lint/format issues |
| AC-05 | All | README updated with how to run/fix; each child documents its own artifacts |
| TR-01 | STUDY-21A | `npm run lint` succeeds on clean repo |
| TR-02 | STUDY-21A | Format check fails on malformed files |
| TR-03 | STUDY-21C | CI fails on lint errors |
| TR-04 | STUDY-21B | Pre-commit rejects/re-formats |
| TR-05 | STUDY-21A | jsx-a11y fires on accessibility violation |

## Decisions

| # | Decision | Choice | Date |
|---|---|---|---|
| D21-1 | Shared Prettier location | `packages/config/prettier/` (shared package in monorepo workspaces) | 2026-10-18 |
| D21-2 | ESLint config format | Flat config (`eslint.config.js` / `eslint.config.ts`) if supported by installed ESLint 8.x via `@eslint/js` adapter; otherwise `.eslintrc.cjs` with `eslint-import-resolver-typescript` | 2026-10-18 |
| D21-3 | Pre-commit framework | `husky` v9+ with `lint-staged` (staged-files-only to avoid reformatting unrelated files) | 2026-10-18 |
| D21-4 | CI platform | GitHub Actions (`.github/workflows/ci.yml`) matching TECH-01's CI description; lint as a failing step | 2026-10-18 |
| D21-5 | Monorepo lint orchestration | Root `package.json` `lint` script delegates to each app via `turbo run lint` (already wired in `turbo.json`) | 2026-10-18 |
| D21-6 | jsx-a11y scope + strictness | `eslint-plugin-jsx-a11y` added to frontend `devDependencies`; rules set to `recommended` (lighter, fewer false positives) applied only to `.tsx`/`.jsx` files in `apps/web/src/`; explicit rules for `alt-text`, `aria-props`, `focus-tabindex`, `jsx-no-target-blank` | 2026-10-18 (settled by user) |

## Correction Log

| ID | Original claim | Consequence | Disposition | Reference |
|---|---|---|---|---|
| F-21A-7 | D21-6 (settled by user, `7ca4296`) names `focus-tabindex` + `jsx-no-target-blank` as explicit jsx-a11y rules | Neither rule exists in any available 6.x build of `eslint-plugin-jsx-a11y` (reviewer-verified in installed 6.10.2: 39 rules, both absent) — the settled 4-rule list is not implementable as written | **Closed (accepted deviation).** Reviewer adjudicated the remap (34-rule `recommended` + explicit `alt-text`/`aria-props`/`tabindex-no-positive: error`; target-blank intent enforced via `react/recommended` in `eslint-plugin-react` 7.37.5) as satisfying AC-21A-4's "at least" intent; deviation documented in `apps/web/.eslintrc.cjs` L33–41. Reviewer adjudication of a named rule conflict, not a waiver — no AC intent unmet. | `artifacts/STUDY-21/review.md` §3 |
| P-1 | `apps/web/.eslintrc.cjs` L39–40 comment records target-blank as "dropped" | A future reader could infer `target="_blank"` is unenforced, though `react/jsx-no-target-blank: error` is active via `plugin:react/recommended` | Optional polish — one-line comment addition; no mandatory obligation unmet. Owner: implementer. | `artifacts/STUDY-21/review.md` §7 |
| P-2 | `artifacts/STUDY-21A/implementation.md` deviation note records `no-noninteractive-tabindex: warn` in `recommended` | Installed 6.10.2 actually sets it to `error` — conservative inaccuracy (config stricter than recorded) | Optional polish — correct the note; no mandatory obligation unmet. Owner: implementer. | `artifacts/STUDY-21/review.md` §7 |
| F-21-1 | `.github/workflows/ci.yml` L31: `JWT_SECRET: ci-only-placeholder-not-a-real-secret` (pre-existing from STUDY-20) | Hardcoded credential in source code violates the security rule (blocker-severity per rule). The placeholder value is not a real secret and only used in CI, but the pattern should be corrected. | **Closed (resolved).** The hardcoded `JWT_SECRET` in `.github/workflows/ci.yml` L31 was replaced with `${{ secrets.JWT_SECRET }}`, referencing a GitHub Actions secret. The repository settings must have `JWT_SECRET` configured as a secret (Settings → Secrets and variables → Actions). The CI workflow will now fail at runtime if the secret is not configured, rather than using a hardcoded placeholder in source. Owner: implementer. | `artifacts/STUDY-21/review.md` §6 |

Verdict record: **PASS (qualified)** — 2026-10-18, reviewer. Qualifications: (1) the four execution gates + three negative probes are CANNOT VERIFY by the reviewer (no execution capability in the reviewer runtime); the pass rests on the implementer's recorded evidence (`artifacts/STUDY-21A/checkpoint.md`, `artifacts/STUDY-21A/implementation.md`, tested at `f6ed6ee`) plus complete reviewer static verification. (2) The parent's "all children implemented" final gate is not met — STUDY-21B/21C queued; the final parent review applies when they land. Full report: `artifacts/STUDY-21/review.md`.

## Quality Gate

| Story | Status | Notes |
|---|---|---|
| STUDY-21A | Reviewed — **pass (qualified)** (2026-10-18, reviewer) | All 8 ACs + DoD 1/8/9/10 met; F-21A-7 accepted deviation (adjudicated, closed); execution gates CANNOT VERIFY by reviewer (implementer-recorded evidence + static verification). Report: `artifacts/STUDY-21/review.md` |
| STUDY-21B | Reviewed — **pass (qualified)** (2026-10-18, final parent review) | All 6 ACs + DoD 1/8/9/10 met; execution gates CANNOT VERIFY by reviewer (implementer-recorded evidence + static verification). Report: `artifacts/STUDY-21/review.md` |
| STUDY-21C | Reviewed — **pass (qualified)** (2026-10-18, final parent review) | All 6 ACs + DoD 1/8/9/10 met; execution gates CANNOT VERIFY by reviewer (implementer-recorded evidence + static verification). Report: `artifacts/STUDY-21/review.md` |

## Execution Queue

| Story | State | Dependencies / Blockers | Next Action | Evidence / Artifacts |
|---|---|---|---|---|
| STUDY-21A | Reviewed — **pass (qualified)** (2026-10-18, reviewer) | — | Final parent review (completed, passing) | `artifacts/STUDY-21A/implementation.md` |
| STUDY-21B | Reviewed — **pass (qualified)** (2026-10-18, final parent review) | STUDY-21A configs in place (`f6ed6ee`); implemented 2026-10-18 | Final parent review (completed, passing) | `artifacts/STUDY-21B/implementation.md`, `artifacts/STUDY-21B/checkpoint.md` |
| STUDY-21C | Reviewed — **pass (qualified)** (2026-10-18, final parent review) | STUDY-21A configs in place (`f6ed6ee`); CI workflow from STUDY-20 (verified all ACs); README CI section added 2026-10-18 | Final parent review (completed, passing) | `docs/stories/STUDY-21/STUDY-21C.md`, `artifacts/STUDY-21C/checkpoint.md`, `artifacts/STUDY-21C/implementation.md` |

**Active substory:** none — all three children (STUDY-21A, STUDY-21B, STUDY-21C) implemented and reviewed
**Next substory:** None — final parent review complete (passing, qualified, 2026-10-18); report at `artifacts/STUDY-21/review.md`

## Final Implementation Review

- **Parent artifact path:** `docs/stories/STUDY-21/artifacts/STUDY-21/`
- **All in-scope children:** STUDY-21A, STUDY-21B, STUDY-21C
- **Integration owner:** STUDY-21 (parent coordination)
- **Gate:** All children implemented and passing their AC/TR before final review.
