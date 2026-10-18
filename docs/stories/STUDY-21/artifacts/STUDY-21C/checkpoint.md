# STUDY-21C Checkpoint — CI lint workflow

**Story:** [STUDY-21C](../STUDY-21C.md) · **Parent:** [STUDY-21](../README.md) · **Milestone:** M1 · **Layer:** Infrastructure · **Jira:** STUDY-24
**Started:** 2026-10-18
**State:** In progress

## Discovery

### Existing CI workflow (STUDY-20)

| Path | Finding |
|---|---|
| `.github/workflows/ci.yml` | **Already exists** — created by STUDY-20 (TECH-01), commit `cffc4c2` (the "commit" placeholder after 21A). Contains a comprehensive `build-and-test` job with: checkout, pnpm setup, Node 20, dependency install, Prisma generate, lint, typecheck (both apps), build (both apps), migration deploy, integration tests, unit tests (both apps), and gitleaks secret scan. |
| `push` / `pull_request` triggers | Branches `main` and `develop` — satisfies AC-21C-2 (default branch + PRs on default branch). |
| `pnpm lint` step (line 52-53) | Runs `turbo run lint` which delegates to each app's ESLint — satisfies AC-21C-3. |
| `node-version: '20'` | Satisfies `engines.node: ">=18.0.0"` (AC-21C-5). |
| Lint as a failing step | If lint errors exist, the CI job fails — satisfies AC-21C-4. |

### Acceptance Criteria verification

| # | Criterion | Status | Notes |
|---|---|---|---|
| AC-21C-1 | Workflow file exists at `.github/workflows/ci.yml` | ✅ Already exists | From STUDY-20 commit; not created by this story. |
| AC-21C-2 | Runs on `push` and `pull_request` targeting default branch | ✅ Already exists | `main` and `develop` branches. |
| AC-21C-3 | Installs deps and runs `turbo run lint` | ✅ Already exists | `pnpm install --frozen-lockfile` + `pnpm lint` (which is `turbo run lint`). |
| AC-21C-4 | Lint step fails the build | ✅ Already exists | Lint is a step in the job; non-zero exit fails the job. |
| AC-21C-5 | Uses Node.js version from `engines.node` | ✅ Satisfied | `engines.node: ">=18.0.0"`; CI uses `node-version: '20'` (satisfies the constraint). |
| AC-21C-6 | README documents the CI lint step | ⚠️ Partial | Pre-commit section (line 248) says "same lint rules run in CI" but there is **no dedicated CI section** describing the workflow file, its location, or how to run lint locally as a CI proxy. |

### Findings

| ID | Finding | Disposition |
|---|---|---|
| F-21C-1 | The CI workflow file was **already created by STUDY-20 (TECH-01)** in a prior commit (`cffc4c2`). This story's plan to "create a GitHub Actions workflow" is redundant — the existing workflow is comprehensive (lint + typecheck + build + tests + secret scan). | **Accepted** — no new workflow file needed. The existing workflow satisfies AC-21C-1 through AC-21C-5. |
| F-21C-2 | The existing CI workflow uses `node-version: '20'` while `engines.node` is `">=18.0.0"`. Node 20 satisfies the constraint, but the story's plan says "Node.js 18 (from `engines.node`)". | **Accepted** — Node 20 satisfies `>=18.0.0`. The story's plan was written before STUDY-20 chose Node 20; no change needed. |
| F-21C-3 | The README lacks a dedicated "CI" section. The pre-commit section (line 248) mentions "the same lint rules run in CI" but does not document the workflow file location, trigger conditions, or how to run lint locally as a CI proxy. | **Open** — needs a CI section added to the root README (AC-21C-6). |

## Plan

1. **Verify** the existing `.github/workflows/ci.yml` meets AC-21C-1 through AC-21C-5 (done above).
2. **Add a CI section** to the root README documenting:
   - The workflow file location (`.github/workflows/ci.yml`).
   - Trigger conditions (push/PR to main/develop).
   - That `pnpm lint` locally is a proxy for the CI lint check.
   - Cross-reference the pre-commit section's CI note.
3. **Update** the STUDY-21 parent README (execution queue).
4. **Update** the STUDY-21C story file (status).
5. **Write** the implementation record at `artifacts/STUDY-21C/implementation.md`.

## Verification commands (planned)

- `pnpm lint` — local proxy for CI (should exit 0 on clean tree).
- `cat .github/workflows/ci.yml` — verify the workflow file.
