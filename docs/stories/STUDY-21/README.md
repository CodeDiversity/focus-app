# STUDY-21 — Configure Linter and Formatter (TECH-02)

**Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md) (cross-cutting technical task)
**Milestone:** M1
**Status:** Planned
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

_No corrections yet — this is a fresh breakdown._

## Quality Gate

| Story | Status | Notes |
|---|---|---|
| STUDY-21A | Plan Ready | Package deps already present; jsx-a11y strictness settled to `recommended` (lighter); config files to create |
| STUDY-21B | Plan Ready (blocked for implementation) | Depends on STUDY-21A configs being in place |
| STUDY-21C | Plan Ready (blocked for implementation) | Depends on STUDY-21A configs being in place |

## Execution Queue

| Story | State | Dependencies / Blockers | Next Action | Evidence / Artifacts |
|---|---|---|---|---|
| STUDY-21A | Ready | — | Implement | `docs/stories/STUDY-21/STUDY-21A.md` |
| STUDY-21B | Queued | STUDY-21A | — | `docs/stories/STUDY-21/STUDY-21B.md` |
| STUDY-21C | Queued | STUDY-21A | — | `docs/stories/STUDY-21/STUDY-21C.md` |

**Active substory:** STUDY-21A
**Next substory:** STUDY-21A — implement shared Prettier config and per-app ESLint configs

## Final Implementation Review

- **Parent artifact path:** `docs/stories/STUDY-21/artifacts/STUDY-21/`
- **All in-scope children:** STUDY-21A, STUDY-21B, STUDY-21C
- **Integration owner:** STUDY-21 (parent coordination)
- **Gate:** All children implemented and passing their AC/TR before final review.
