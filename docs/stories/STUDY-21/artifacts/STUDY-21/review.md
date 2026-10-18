# STUDY-21 Implementation Review — Report (pass 1)

**Story (review unit):** STUDY-21 — Configure Linter and Formatter (TECH-02)
**In-scope child:** STUDY-21A — Shared Prettier + per-app ESLint configs (Jira STUDY-22)
**Out of scope:** STUDY-21B (pre-commit hooks), STUDY-21C (CI lint) — queued, not implemented. The parent's "all children implemented" final gate (README §Final Implementation Review) **is not yet met** and applies when 21B/21C land. This review covers the only implemented child, STUDY-21A.
**Mode:** Implementation review (completed work)
**Review date:** 2026-10-18
**Reviewed state:** commit `576f073` (`576f0738225c69fcbfb5256a3cd42094253f3810`) on `main` — verified via `.git/HEAD` + `.git/refs/heads/main`; working tree reported clean by the coordinating parent (not independently re-verified, see Execution capability). Commits under review: `f6ed6ee` (implementation, 89 files) and `576f073` (docs backfill).
**Report path:** `docs/stories/STUDY-21/artifacts/STUDY-21/review.md`
**Reviewed paths:** `packages/config/prettier/` (package.json, .prettierrc.cjs), root `.prettierrc.cjs` / `.prettierignore` / `package.json` / `pnpm-workspace.yaml` / `README.md` / `pnpm-lock.yaml`, `apps/api/` (.eslintrc.cjs, .prettierignore, package.json, spot-checked sources), `apps/web/` (.eslintrc.cjs, package.json, spot-checked sources, installed `eslint-plugin-jsx-a11y@6.10.2` and `eslint-plugin-react@7.37.5` in node_modules), `.github/workflows/ci.yml` (provenance check), `docs/stories/STUDY-21/*` (README, specs, artifacts).

---

## 1. Execution capability statement (material to this verdict)

The reviewer runtime for this session has **no general shell/execution tool** (the Code Mode tool catalog was enumerated in full: 240 tools across atlassian/opencode/rea; none is a general command runner) and **subagent delegation is blocked** (platform depth limit: this reviewer is itself a depth-1 subagent; the delegation attempt returned "Subagent depth limit reached (1)"). The commit is not pushed to the private GitHub remote (`origin/main` = `d2fab80`, local-only commits; `github.com/CodeDiversity/focus-app/commit/f6ed6ee` → 404), so no web-based diff retrieval was possible either.

Consequences:

- **All execution gates are CANNOT VERIFY (reviewer-executed).** The four requested re-runs (`pnpm --filter @studypilot/api run lint`, `pnpm --filter @studypilot/web run lint`, `pnpm lint`, `pnpm --filter @studypilot/{api,web} format -- --check`) and the negative probes (T-21A-6/7/8) were **not** re-executed by the reviewer. Per the reviewer skill, a blocked gate is reported CANNOT VERIFY; a passing result is never inferred.
- The **implementer's recorded evidence** (identical exit codes in `artifacts/STUDY-21A/checkpoint.md` §Verification and `artifacts/STUDY-21A/implementation.md` §Tests/§Verification, both dated 2026-10-18, tested at `f6ed6ee`) is cited below as secondary evidence with provenance. It is internally consistent and detailed, but it is implementer-provided, not reviewer-executed.
- **Everything static was verified directly by the reviewer** (config files, scripts, package manifests, lockfile, installed plugin rule sets, README, docs, git ref state) — see §4.

## 2. Acceptance criteria (STUDY-21A)

| # | Criterion | Status | Evidence |
|---|---|---|---|
| AC-21A-1 | Shared Prettier config at `packages/config/prettier/` with printWidth 100, semi, singleQuote, trailingComma `es5` | **PASS** (reviewer-static) | `packages/config/prettier/.prettierrc.cjs` L10–21: `printWidth: 100, semi: true, singleQuote: true, trailingComma: 'es5'` (+ tabWidth 2, useTabs false, bracketSpacing, bracketSameLine false, arrowParens 'always', endOfLine 'lf'). Package `@studypilot/prettier-config` (`package.json` L2, main → `.prettierrc.cjs`). Root `.prettierrc.cjs` L10 requires the shared file (single source of truth); old root `.prettierrc` JSON deleted (only `.prettierrc.cjs` remains). |
| AC-21A-2 | Both apps' `format` scripts reference the shared config | **PASS** (reviewer-static) | `apps/api/package.json` L8–9 and `apps/web/package.json` L11–12: `format`/`format:write` both use `--config ../../packages/config/prettier/.prettierrc.cjs`. Relative path is required (prettier 3 `--config` rejects a bare package name — implementer F-21A-9); `workspace:*` dep + root pointer retained for editors. |
| AC-21A-3 | Backend ESLint: `@typescript-eslint` rules, `eslint-plugin-prettier`, `eslint-config-prettier` | **PASS** (reviewer-static) | `apps/api/.eslintrc.cjs` L4–10 extends `eslint:recommended`, `plugin:@typescript-eslint/recommended`, `plugin:prettier/recommended` (the latter activates `prettier/prettier` + `eslint-config-prettier`; both in api devDeps L66–67). `no-console` warn in app code / error in `src/test/**` / off in `src/main.ts` per plan (L20, L22–33); `src/generated` ignored (L36). |
| AC-21A-4 | Frontend ESLint: backend rules + react, react-hooks, jsx-a11y with sensible defaults (at least `alt-text`, `aria-props`, `focus-tabindex`, `jsx-no-target-blank`) | **PASS with accepted deviation** (F-21A-7 — adjudication in §3) | `apps/web/.eslintrc.cjs` L4–15 extends backend-equivalent + `plugin:react/recommended` + `plugin:react-hooks/recommended` + `plugin:jsx-a11y/recommended` + `plugin:prettier/recommended`; explicit `alt-text: error`, `aria-props: error`, `tabindex-no-positive: error` (L42–44); deviation documented in-file (L33–41). Two of the four D21-6-named rules do not exist in the installed plugin — see §3. |
| AC-21A-5 | `npm run lint` succeeds on both apps with zero errors/warnings (or pre-fixed) | **CANNOT VERIFY (reviewer execution)** — implementer-recorded: PASS | Reviewer cannot execute (§1). Implementer-recorded, tested at `f6ed6ee`, 2026-10-18 (identical in `artifacts/STUDY-21A/checkpoint.md` L57–58 and `artifacts/STUDY-21A/implementation.md` L57–58): api lint exit 0 with 0 errors / 0 warnings under `--max-warnings 0`; web lint exit 0 under `--max-warnings 0`. Reviewer-static basis: `--max-warnings 0` present in both `lint` scripts (`apps/api/package.json` L14, `apps/web/package.json` L10); the one pre-existing api warning (`no-console` in `src/main.ts`) is handled by a config-only override (`apps/api/.eslintrc.cjs` L28–33) — no app code touched. |
| AC-21A-6 | `npm run format -- --check` passes on the existing codebase (or pre-formatted) | **CANNOT VERIFY (reviewer execution)** — implementer-recorded: PASS | Reviewer cannot execute (§1). Implementer-recorded (checkpoint.md L60–61; implementation.md L60–61, tested at `f6ed6ee`): 72 files pre-formatted (two `format:write` passes per F-21A-10); `format -- --check` exit 0 in both apps. Reviewer-static basis: both `format` scripts reference the shared config via `--config ../../packages/config/prettier/.prettierrc.cjs` with the `--`-stripping wrapper (api L8, web L11 — F-21A-11); `apps/api/.prettierignore` excludes the gitignored `src/generated/` Prisma client (F-21A-13). |
| AC-21A-7 | A frontend file with a deliberate jsx-a11y violation (e.g., `<img>` without `alt`) is flagged by `npm run lint` on the frontend | **CANNOT VERIFY (reviewer execution)** — implementer-recorded: PASS | Reviewer cannot execute (§1). Implementer-recorded (checkpoint.md L63; implementation.md L63): temp `.tsx` with `<img>` lacking `alt` → `jsx-a11y/alt-text` error, lint exit 1; probe removed. Reviewer-static basis: `jsx-a11y/alt-text: error` is active in `apps/web/.eslintrc.cjs` L42 (and in the installed plugin's `recommended` set, `lib/index.js` L56). |
| AC-21A-8 | README documents how to run lint/format per app, the shared config location, and how to disable/override rules | **PASS** (reviewer-static) | Root `README.md` L182–222 "Linting & Formatting": shared config location `packages/config/prettier` (`@studypilot/prettier-config`) + root pointer (L184–187); per-app `format`/`format:write` commands (L192–198); per-app `lint` + root `pnpm lint` via Turbo (L205–208); config summaries incl. generated-client exclusion (L210–216); rule override via `eslint-disable` / `overrides` (L218 ff.). |

## 3. Adjudication of F-21A-7 (D21-6 jsx-a11y rule names)

**Requirement:** D21-6 (parent README L76, "settled by user", planner commit `7ca4296`) names explicit rules `alt-text`, `aria-props`, `focus-tabindex`, `jsx-no-target-blank`; AC-21A-4 requires "sensible defaults (at least …)" those rules. The implementer flagged (F-21A-7) that two of the four names do not exist in the installed plugin and asked the reviewer to adjudicate.

**Reviewer-verified facts** (installed `eslint-plugin-jsx-a11y@6.10.2`, `apps/web/node_modules/eslint-plugin-jsx-a11y/lib/index.js`; installed `eslint-plugin-react@7.37.5`, `apps/web/node_modules/eslint-plugin-react/index.js`):

- `allRules` (L14–54) = **39 rules**; **neither `focus-tabindex` nor `jsx-no-target-blank` exists** (a search for both names matches only `tabindex-no-positive`, L53). The implementer additionally verified absence in packed tarballs 6.2.0–6.9.0 (checkpoint F-21A-7).
- `recommended` (L55–121) = **34 entries** (31 active + 3 off), including `alt-text: error` (L56), `aria-props: error` (L62), `label-has-associated-control: error` (L80), `no-noninteractive-tabindex: error` (L107), `tabindex-no-positive: error` (L120).
- `eslint-plugin-react@7.37.5` `recommended` config (L39–70) **includes `react/jsx-no-target-blank: error`** (L51) — and the web config extends `plugin:react/recommended` (`apps/web/.eslintrc.cjs` L7). So the target-blank intent is in fact enforced in the web lint, via the React plugin, even though it was dropped from the explicit jsx-a11y block.

**Adjudication: accepted deviation — AC-21A-4's intent is satisfied.**

1. The settled 4-rule list is **not implementable as written**: two of the four names do not exist in any available 6.x build of `eslint-plugin-jsx-a11y` (the only path to the literal names would be a non-6.x plugin version, which the implementer verified is unavailable in this registry). The AC's "at least" list is a floor of intent, not a literal registry of rule names.
2. The implemented set covers the parent AC-03 intent ("catch common accessibility violations — missing labels, alt text, focus management") and **enforces the intent of all four named rules** in the web lint: `alt-text` (explicit, L42), `aria-props` (explicit, L43), the closest surviving equivalent of `focus-tabindex` = `tabindex-no-positive` (explicit, L44), and `jsx-no-target-blank` (via `react/recommended`, react plugin `index.js` L51).
3. The deviation is documented in-file (`apps/web/.eslintrc.cjs` L33–41) and in both implementation artifacts.

This is a reviewer adjudication of a named rule conflict (a settled decision referencing rules that do not exist), not a waiver: no AC intent is left unmet. If the user nevertheless requires the literal rule names, that is a user decision to record (with the registry-availability constraint above), not an implementer obligation.

**Record correction (non-material):** the implementer's `implementation.md` deviation note says `recommended` sets `no-noninteractive-tabindex: warn`; the installed 6.10.2 actually sets it to `error` (L107). The implemented config is *stricter* than recorded — a conservative inaccuracy, not a gap.

## 4. Static verification evidence (reviewer-executed)

All of the following were read directly by the reviewer at `576f073` (re-confirmed post-compaction; HEAD unchanged, working tree clean per coordinating parent):

| Item | Verified |
|---|---|
| Shared Prettier package | `packages/config/prettier/.prettierrc.cjs` L10–21: printWidth 100, semi, singleQuote, trailingComma `es5`, tabWidth 2, useTabs false, bracketSpacing true, bracketSameLine false, arrowParens `always`, endOfLine `lf`; header documents single-source-of-truth role (L1–9). `packages/config/prettier/package.json`: name `@studypilot/prettier-config`, main → `.prettierrc.cjs`. |
| Root pointer | `.prettierrc.cjs` L10: `module.exports = require('./packages/config/prettier/.prettierrc.cjs')`; old root `.prettierrc` JSON deleted (F-21A-1). |
| Workspace wiring | `pnpm-workspace.yaml` + root `package.json` use `packages/**` (F-21A-8, matches nested `packages/config/prettier`); `pnpm-lock.yaml` carries `@studypilot/prettier-config: workspace:*` links and resolves `eslint-plugin-jsx-a11y ^6.8.0` → 6.10.2 (recorded at lockfile L90–92 / L214–216 / L299). |
| api ESLint | `apps/api/.eslintrc.cjs`: extends `eslint:recommended` + `plugin:@typescript-eslint/recommended` + `plugin:prettier/recommended` (L4–10); `no-console` warn-with-allow (L20); overrides `no-console: error` in `src/test/**` / `off` in `src/main.ts` (L22–34); `ignorePatterns` incl. `src/generated` (L36). |
| web ESLint | `apps/web/.eslintrc.cjs`: extends add `plugin:react/recommended`, `plugin:react-hooks/recommended`, `plugin:jsx-a11y/recommended`, `plugin:prettier/recommended` (L4–15); explicit a11y minimum + deviation note (L33–44); pre-existing FSD `import/no-restricted-paths` zones preserved (L53–88); `ignorePatterns` (L90–96). |
| Scripts | `apps/api/package.json`: `format` L8 / `format:write` L9 with `--config ../../packages/config/prettier/.prettierrc.cjs` + `--`-stripping wrapper (F-21A-11); `lint` L14 with `--max-warnings 0 --fix`. `apps/web/package.json`: `lint` L10 (`--max-warnings 0`), `format` L11 / `format:write` L12 (same shared config + wrapper). |
| Installed plugin rule sets | `eslint-plugin-jsx-a11y@6.10.2` `lib/index.js`: 39 rules, `recommended` = 34 entries (see §3). `eslint-plugin-react@7.37.5` `index.js` L51: `react/jsx-no-target-blank: error` in `recommended`. |
| Root README | "Linting & Formatting" section L182–222 (AC-21A-8). |
| Pre-format diff spot-checks | `git show f6ed6ee` for `apps/web/src` `Header.tsx` and `apps/api/src/users/users.service.ts`: single quotes, 100-col, `es5` trailing commas — consistent with the shared config; formatting-only (quotes/line-breaks/trailing commas), no logic changes observed. |
| Commit scope | `f6ed6ee` = 89 files: 17 config/script/manifest/lockfile/docs + 72 app sources (30 api + 42 web, implementation.md L36). Baseline 51 unformatted api files (checkpoint L18) decompose into 21 gitignored generated Prisma-client files (excluded from the commit and from format globs via `apps/api/.prettierignore`) + 30 hand-written (all pre-formatted); 42 web = 42. Boundary checks: no `.husky/` (21B not started); `.github/workflows/ci.yml` is the pre-existing STUDY-20 pipeline, not 21A work. |

Note: the 89-file diff was spot-checked (representative files + file-count reconciliation + boundary checks), not audited line-by-line; the implementer's typecheck + full test-suite results (below, §6) are the recorded assurance that the 72 source edits are formatting-only.

## 5. Test requirements and test mapping (STUDY-21A)

| # | Obligation | Reviewer status | Implementer-recorded result (tested at `f6ed6ee`, 2026-10-18) |
|---|---|---|---|
| TR-01 | `npm run lint` succeeds on a clean repo (both apps) | **CANNOT VERIFY** (reviewer execution) | = T-21A-1/2/3: api lint exit 0 (0/0 under `--max-warnings 0`); web lint exit 0; root `pnpm lint` (turbo) exit 0. |
| TR-02 | `npm run format -- --check` fails on intentionally malformed files | **CANNOT VERIFY** (reviewer execution) | = T-21A-8: temp badly-formatted file in `apps/api/src` → exit 1; probe removed. |
| TR-05 | jsx-a11y rules fire on a frontend accessibility violation | **CANNOT VERIFY** (reviewer execution) | = T-21A-7: temp `<img>` without `alt` → `jsx-a11y/alt-text` error, exit 1; probe removed. |

| Test | Description | Reviewer status | Implementer-recorded result |
|---|---|---|---|
| T-21A-1 | `pnpm --filter @studypilot/api run lint` exits 0 | CANNOT VERIFY | exit 0 (0 errors, 0 warnings) |
| T-21A-2 | `pnpm --filter @studypilot/web run lint` exits 0 | CANNOT VERIFY | exit 0 (`--max-warnings 0`) |
| T-21A-3 | `pnpm lint` (root, turbo) exits 0 | CANNOT VERIFY | exit 0 |
| T-21A-4 | api `format -- --check` exits 0 | CANNOT VERIFY | exit 0 (bare `format` too) |
| T-21A-5 | web `format -- --check` exits 0 | CANNOT VERIFY | exit 0 (bare `format` too) |
| T-21A-6 | temp `console.log` file in api → lint fails | CANNOT VERIFY | exit 1 (`no-console` warn + `--max-warnings 0`); probe removed |
| T-21A-7 | temp `<img>` without `alt` in web → lint fails | CANNOT VERIFY | exit 1 (`jsx-a11y/alt-text`); probe removed |
| T-21A-8 | temp badly-formatted file → `format -- --check` fails | CANNOT VERIFY | exit 1; probe removed |

Implementer-provenance note: the results above are recorded identically in `artifacts/STUDY-21A/checkpoint.md` §Verification (L55–67) and `artifacts/STUDY-21A/implementation.md` §Tests/§Verification, both dated 2026-10-18 and tested at `f6ed6ee`. They are internally consistent and detailed (including negative probes and a `src/generated` exclusion probe), but they are implementer-provided, not reviewer-executed.

## 6. Definition of Done (shared, `docs/epics/README.md`)

Applicable items for this technical task per the parent README: **1, 8, 9, 10**.

| # | Condition | Status | Evidence |
|---|---|---|---|
| 1 | Functional acceptance criteria pass | **PASS (static aspects) / CANNOT VERIFY (execution aspects)** | AC-21A-1/2/3/4/8 PASS reviewer-static (§2, §4); AC-21A-5/6/7 CANNOT VERIFY by reviewer, implementer-recorded PASS (§2, §5). |
| 2 | Frontend/backend validation of invalid input | **N/A** | Tooling story; no input handling, endpoint, or schema changed. |
| 3 | Academic data scoped to authenticated student | **N/A** | No queries or endpoints changed; the 72 source edits are formatting-only (§4). |
| 4 | Actionable API error messages | **N/A** | No API behaviour changed. |
| 5 | Loading/empty/error states | **N/A** | No UI feature work. |
| 6 | Keyboard accessibility of core interactions | **N/A** | No UI feature work; the jsx-a11y rules are lint-time checks, not runtime behaviour. |
| 7 | Responsive layouts | **N/A** | No UI feature work. |
| 8 | Business rules have automated tests | **CANNOT VERIFY (reviewer execution)** — implementer-recorded: met | The spec's test obligation for this tooling story is script verification T-21A-1…8 ("Test files: None", spec L47–56, L124). All 8 recorded executed (5 positive exit 0, 3 negative exit 1, probes removed) — §5. |
| 9 | API changes and migrations documented | **PASS** | No API/migration changes; the tooling change is documented in the root README L182–222 (§4). |
| 10 | Reviewed in an integrated development environment | **PASS** | This review (integrated repo at `576f073`) + implementer-recorded integrated verification: `typecheck` exit 0 both apps; web vitest 19 files / 193 tests passed; api jest 22 suites / 258 tests passed (3 suites / 30 tests skipped — DB-gated integration specs, by design) (implementation.md L77–79). |

## 7. Findings

| ID | Severity | Requirement / source | Observed gap | Disposition |
|---|---|---|---|---|
| F-21A-7 | **Accepted deviation** (adjudicated §3; not an open should-fix) | D21-6 (user-settled) / AC-21A-4 | 2 of the 4 named rules (`focus-tabindex`, `jsx-no-target-blank`) do not exist in any available 6.x build of `eslint-plugin-jsx-a11y`; the settled list is not implementable as written. | **Closed.** The remapped set (34-rule `recommended` + explicit `alt-text`/`aria-props`/`tabindex-no-positive: error`) plus `react/jsx-no-target-blank` already active via `plugin:react/recommended` enforces the intent of all four named rules; deviation documented in-file and in both artifacts. No AC intent unmet → no unmet explicit AC. |
| P-1 | Polish | `apps/web/.eslintrc.cjs` L39–40 (in-file deviation note) | The comment records target-blank as "dropped" without noting that `react/jsx-no-target-blank: error` is already enforced via `plugin:react/recommended` (react plugin 7.37.5 `index.js` L51); a future reader could infer target-blank is unenforced. | Optional: add one line to the comment. No mandatory obligation unmet; does not affect the verdict. Owner: implementer. |
| P-2 | Polish | `artifacts/STUDY-21A/implementation.md` L93 (deviation note) | Records `no-noninteractive-tabindex: warn` in `recommended`; installed 6.10.2 actually sets `error` (`lib/index.js` L107). Conservative inaccuracy (config stricter than recorded). | Optional: correct the note. No mandatory obligation unmet; does not affect the verdict. Owner: implementer. |

Out-of-scope planning observation (for the planner, not a STUDY-21A finding): the STUDY-21C spec's "no `.github/` directory" note is stale — `.github/workflows/ci.yml` (the pre-existing STUDY-20 full pipeline) exists.

## 8. Verdict

**PASS (qualified)** — STUDY-21A meets the applicable DoD (items 1, 8, 9, 10) and all eight acceptance criteria, with **no open blocker or should-fix finding** (F-21A-7 adjudicated as an accepted deviation in §3; P-1/P-2 are polish).

Qualifications, recorded rather than failures:

1. **Execution gates CANNOT VERIFY (reviewer).** The reviewer runtime has no shell and delegation is blocked (§1), so the four requested gate re-runs and the negative probes were not re-executed. The pass rests on the implementer's recorded evidence (§5) plus the reviewer's complete static verification (§4). Per the reviewer contract, required unverified gates prevent an *unqualified* pass: the coordinating parent should re-run the gates (or explicitly accept the recorded evidence) at the next opportunity.
2. **Parent final gate not yet met.** The parent unit's "all children implemented" gate (README §Final Implementation Review) is **not met** — STUDY-21B and STUDY-21C are queued. This review covers the only implemented child, STUDY-21A; it does **not** replace the final parent review, which applies when 21B/21C land.

## 9. Closeout and handoff

- **Report saved:** `docs/stories/STUDY-21/artifacts/STUDY-21/review.md` (this file).
- **Passing-review docs sync (performed by reviewer):** `docs/stories/STUDY-21/README.md` — STUDY-21A queue row (Reviewed), quality-gate row, 21B/21C dependency note, Active/Next substory, correction-log entries (F-21A-7, P-1, P-2), parent status line.
- **Git handoff:** the reviewer does not commit. The coordinating parent should commit the report + README sync (scoped paths: `docs/stories/STUDY-21/artifacts/STUDY-21/review.md`, `docs/stories/STUDY-21/README.md`).
- **Coordinator follow-up:** re-run the four gates + three negative probes (or accept the implementer's recorded evidence) to convert the CANNOT VERIFY items to reviewer-verified; then the parent's final review applies after STUDY-21B/21C are implemented.
- **Remaining work in the parent unit:** STUDY-21B (pre-commit hooks), STUDY-21C (CI lint) — queued, now unblocked by this passing review.


