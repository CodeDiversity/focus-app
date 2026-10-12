# STUDY-20 Review Report

**Ticket:** STUDY-20 — TECH-01: Scaffold Backend and Frontend
**Review date:** 2026-10-11
**State reviewed:** working tree (no git repository initialized — no commit hash exists)
**Reviewer:** studypilot-reviewer
**Scope:** full scaffold, against the ticket's own acceptance criteria plus the shared DoD
**Method:** static inspection + fresh pipeline runs; actual output reported, not assumed. No source code modified during this review.

Fresh runs at review time: lint clean, web build OK, api 8/8 and web 4/4 tests pass — but this pass found a new blocker missed by the previous review and by earlier verification (see Blocker 1).

---

## Acceptance criteria verdicts

| AC | Verdict | Evidence |
|---|---|---|
| 1. Developer can clone the repo and run both apps locally with documented commands | **FAIL** | No `.git` directory — nothing to clone; `.gitignore` is inert. Commands documented (README.md, QUICKSTART.md); frontend builds; backend runtime never booted (no PostgreSQL available in the review environment) |
| 2. CI runs green on baseline with lint, typecheck, tests | **FAIL** | `.github/workflows/ci.yml` exists but has never run (no repo, no GitHub). No explicit typecheck step. The backend build step would currently pass while producing no artifact (Blocker 1) |
| 3. Prisma configured with repeatable migration workflow | **FAIL** | `apps/api/prisma/` contains only `schema.prisma` — no migrations directory, no initial empty migration, `prisma migrate` never executed; no CI migration check |
| 4. `.env` and secret files gitignored; CI fails if a secret reaches a commit | **PARTIAL** | `.gitignore:10-15` covers `.env` patterns. No secret-scan step exists in CI |
| 5. API client and date/time helper stubs in place for SP-101 onward | **PARTIAL** | API client done (`apps/web/src/services/api.ts` + dev proxy in `vite.config.ts`). Date/time helper stub missing — `apps/web/src/utils/` contains only `errors.ts`; the ticket names SP-106, EP04, EP05 as consumers |

Data scoping: PASS for the current surface — only guarded routes are `/users/me` GET/PUT behind a class-level `JwtAuthGuard` (`apps/api/src/modules/users/users.controller.ts:10`); no academic-data endpoints exist yet.

---

## Blockers

1. **Silent no-emit backend build (new finding).** `nest build` exits 0 and produces no `dist` on any build after the first. Mechanism (reproduced deterministically): `incremental: true` in `apps/api/tsconfig.json` writes `apps/api/tsconfig.tsbuildinfo` next to the tsconfig, outside `dist`; `nest-cli.json` sets `deleteOutDir: true`, so each build wipes `dist`, tsc reads the surviving up-to-date tsbuildinfo, skips emission, exits 0. Turbo flagged it: `WARNING no output files found for task @studypilot/api#build`. Impact: `start:prod` (`node dist/main`), the Dockerfile production stage, and CI's backend build are silently hollow. Fix options: drop `incremental`; or set `tsBuildInfoFile` inside `dist`; or `deleteOutDir: false` — plus a CI assertion `test -f apps/api/dist/main.js`. Note: earlier "build: OK" claims in this project's history were exit-code checks; artifacts were only verified after manual `dist` wipes, which is exactly the pattern that hides this bug.
2. **No git repository.** Blocks ACs 1, 2, and 4 — clone, CI, gitignore, and secret scanning are all impossible until `git init` + push.
3. **No migration workflow** (AC 3) — schema is valid and the client generates, but zero migrations exist.
4. **No secret-scan CI step** (AC 4).
5. **Date/time formatting helper stub missing** (AC 5).

## Should-fix

- No global exception filter — the ticket's "uniform error-response shape" scope item is unimplemented (DoD condition 4).
- `turbo.json:8` still lists `.next/**` outputs — Next.js leftovers irrelevant to this stack; remove so real output warnings stay meaningful.
- Docker Compose and API runtime boot remain unexecuted/unverified (no Docker, no PostgreSQL in the review environment).

## Optional polish

- Dead devDependencies: `tsconfig-paths` (api), `eslint-plugin-react-refresh` (web — declared, not configured; TECH-21's call).
- QUICKSTART.md duplicates much of README.md.
- Root `.eslintrc.json` is unused now that per-app configs exist.

---

## DoD cross-reference

The DoD conditions most affected by the same evidence: condition 1 (functional ACs) FAIL, condition 4 (actionable API errors) FAIL, condition 8 (automated tests) PASS for what exists (12 tests, verified), condition 9 (documented changes) PASS — `docs/stories/STUDY-20-implementation.md` accurately records status including the remaining-AC list, condition 10 (reviewed in an integrated environment) FAIL — CI and runtime never executed.

## Verdict

**STUDY-20 does not meet its acceptance criteria — do not transition to Done.** The In Progress status and the remaining-work comment on the ticket are accurate, with one addition: the silent no-emit blocker (Blocker 1) is new and should be appended to the ticket and the implementation summary. All five blockers are small, mechanical fixes except the initial migration, which needs a reachable PostgreSQL.
