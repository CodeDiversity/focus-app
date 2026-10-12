# STUDY-20 Review Report

**Ticket:** STUDY-20 — TECH-01: Scaffold Backend and Frontend
**Review date:** 2026-10-11 (pass 2 — post-remediation)
**State reviewed:** commit `2508ba8` (main, clean working tree)
**Reviewer:** studypilot-reviewer
**Prior pass:** the pass-1 report (pre-remediation) is preserved in git history at commit `997162d`.

**Method:** every remediation claim from the implementation summary was re-verified against the code and by fresh execution. No source code modified during this review.

---

## Verification evidence (executed this pass)

| Claim | Check | Result |
|---|---|---|
| Silent no-emit fixed | `incremental` absent from `apps/api/tsconfig.json`; double build from clean `dist` | `dist/main.js` present after **both** builds |
| Git repository | `git log` / `git status` | 2 commits on `main`, working tree clean, ignores effective (no node_modules/dist/tsbuildinfo tracked) |
| Migration matches schema | regenerate via `prisma migrate diff --from-empty` and diff against the committed file | **byte-identical**; 10 CREATE TABLEs; `migration_lock.toml` present |
| CI install step works | `pnpm install --frozen-lockfile` | exit 0 |
| CI pipeline complete | static: postgres service, artifact assertion, `migrate deploy`, gitleaks, pnpm-before-node ordering | all present (`ci.yml`) |
| Uniform error shape | `AllExceptionsFilter` wired at `main.ts:22`; behavior covered by tests | 5 filter tests pass; unknown errors leak no internals (asserted) |
| Date/time helper | `apps/web/src/utils/datetime.ts` | 7 tests pass, IANA-aware |
| Secret hygiene | pattern scan over tracked files (`git grep`) | clean |
| Full pipeline | lint, api build, web build, 24 tests, root `tsc --noEmit` | all green |
| Data scoping | controller audit | `users` class-guarded, `/me` only; `auth` public routes (register/login) are pre-auth by design; logout/refresh guarded |

Test totals this pass: **13 backend + 11 frontend, all passing.**

## Acceptance criteria verdicts

| AC | Verdict | Evidence |
|---|---|---|
| 1. Clone and run both apps locally with documented commands | **PARTIAL** | Repo is a git repository with clean history; commands documented (README). Backend runtime boot against a live PostgreSQL still not exercised (no Postgres/Docker in this environment); no remote exists yet, so "clone" in the distributed sense is pending a push |
| 2. CI runs green on baseline with lint, typecheck, tests | **CANNOT VERIFY (workflow complete)** | Every step is present and its mechanics verified locally (frozen-lockfile install exit 0, artifact assertion, service DB, migrate deploy, gitleaks). The run itself needs a remote |
| 3. Repeatable migration workflow | **PASS** | Initial migration committed, byte-identical to schema; CI applies it. Live apply occurs on first CI run |
| 4. Secrets gitignored; CI fails on committed secret | **PASS** | `.gitignore` committed and effective; gitleaks step in CI; tracked-file scan clean |
| 5. API client + date/time helper stubs | **PASS** | `services/api.ts` + dev proxy; `utils/datetime.ts` + 7 tests |

## DoD checklist

| # | Condition | Verdict |
|---|---|---|
| 1 | Functional ACs | PASS (ACs 1–2 carry the environment caveats above) |
| 2 | Validation of invalid input | PASS — class-validator DTOs, Zod forms, tested |
| 3 | Data scoped to authenticated student | PASS — verified by controller audit |
| 4 | Actionable API errors | PASS — `AllExceptionsFilter`, 5 tests |
| 5 | Loading/empty/error states | PASS (foundation) |
| 6 | Keyboard accessibility | PASS (foundation — `:focus-visible`, labeled inputs) |
| 7 | Responsive layouts | PASS (foundation) |
| 8 | Automated tests for business rules | PASS — 24 tests, executed this pass |
| 9 | API changes/migrations documented | PASS — implementation summary + committed migration |
| 10 | Reviewed in an integrated environment | **FAIL** — CI not yet run on GitHub; API boot not exercised against a live DB |

## Findings

**Blockers:** none.

**Should-fix:**
1. CI has no explicit typecheck step — AC 2 names "lint, typecheck, tests"; type checking currently rides inside the build steps. Add `tsc --noEmit` steps, or record build-as-typecheck as the accepted interpretation on the ticket.
2. Push to a remote and let CI run — the only remaining path to DoD condition 10 and AC 2. External action; not fixable in this environment.
3. docker-compose has never been executed (no Docker on this machine) — verify it on a Docker-capable machine before treating it as the documented onboarding path.

**Optional polish:** none new.

## Verdict

All remediation claims verified against code and execution; no blockers. STUDY-20 meets its code-level acceptance criteria — Done is gated only on the first green CI run, which requires adding a remote and pushing.
