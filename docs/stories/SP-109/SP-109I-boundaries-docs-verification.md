# SP-109I: Boundary proof, legacy-folder proof, docs repoint, parent verification

**Story ID:** SP-109I
**Epic:** Cross-cutting technical task (standalone; see [SP-109](./SP-109.md))
**Milestone:** M1
**Layer / owner:** Frontend verification + docs (root `README.md`), `implementer`
**Status:** Queued (SP-109B–H must land first)
**Dependencies:** SP-109A–H
**Jira key:** Pending creation

## Summary and bounded scope

Close the parent scope: prove the layer rules actually reject a violation after
the real move, prove every legacy folder and alias is gone, repoint the one
repository document outside `docs/` that names an old path, run the full
verification set, and write the parent implementation index that the combined
SP-109 review reads.

Excluded: any code change to make the app work (that would belong to the child
that owns the file), any behavior or test change, and the review itself.

## Source requirement references

RQ-109-05 (enforcement is real), RQ-109-06, RQ-109-08 (docs point at new
paths); RD6 (verification task), RD12 (root README ownership) in the
[breakdown README](./README.md); PC-001/PC-002 in its correction log; shared
[DoD](../../epics/README.md#definition-of-done) items 1, 8, 9, 10.

## Acceptance criteria

1. **Boundary proof:** a violating import is added (e.g. an import of
   `@/features/...` inside `src/shared/**`, and an import of `@/app/...` inside
   `src/widgets/**`), `pnpm --filter @studypilot/web lint` is run and its
   output is captured in `./artifacts/SP-109I/implementation.md`, then the
   violation is reverted and lint is green again. Both transcripts are quoted
   verbatim. This is the RD6 verification task that the planner could not
   execute (docs-only role) and it must name the rule form actually used
   (`no-restricted-imports` groups vs `import/no-restricted-paths`).
2. **Legacy proof:** `ls apps/web/src` shows exactly
   `app/ entities/ features/ pages/ shared/ test/ widgets/ index.css main.tsx`,
   and greps return **zero** matches for
   `src/components`, `src/pages/[A-Z]`, `src/context`, `src/hooks`,
   `src/services`, `src/store`, `src/types`, `src/utils`,
   `@components/`, `@pages/`, `@hooks/`, `@services/`, `@types/`, `@utils/`,
   `@context/`. Results are quoted in the implementation record.
3. **Docs repoint (RD12):** the root `README.md` "State Management" line's
   `apps/web/src/services/api.ts` reference becomes
   `apps/web/src/shared/api/httpClient.ts`. If the root README states a frontend
   folder layout, that line is updated to the FSD convention; otherwise nothing
   else in it is touched. Historical files (`docs/artifacts/**`, older story
   files' evidence citations) are **not** rewritten — old paths quoted as
   evidence stay as written.
4. **Full verification, executed and quoted:**
   `pnpm --filter @studypilot/web test` (expect 19 files / 193 tests, exit 0),
   `typecheck` (exit 0), `lint` (exit 0). `pnpm --filter @studypilot/web build`
   and a dev-server smoke are attempted; if the environment cannot run them
   (SP-108 recorded the same limitation), the record states **CANNOT VERIFY**
   with the reason, rather than claiming success. No backend suite run is
   needed: no backend file is in scope — verified with `git diff --name-only`
   over the SP-109 range.
5. **Parent implementation index:** `./artifacts/SP-109/implementation.md`
   with a row per child A–I (commit range, files moved, AC status, test/typecheck/lint
   results, deviations), plus the final structure listing and the unresolved
   follow-ups (RD9 → EP02 breakdown, RD10 → EP02+ breakdown, RD6's rule form).
   `docs/stories/SP-109/README.md`'s execution-queue rows are repointed to the
   per-child artifacts and marked `Implemented — awaiting parent review`.

## Tests (future obligations)

No new test file. The obligations are executed commands plus the quoted
red/green boundary proof (TR-109-04) and the legacy-folder greps (TR-109-05).

| Area | Evidence location |
|---|---|
| Full suite green after the whole move | `./artifacts/SP-109I/implementation.md` (command output) |
| Lint rejects an upward import | same file, verbatim failing output + green re-run |
| No legacy folders/aliases | same file, verbatim `ls` + grep output |
| Docs repointed | `git diff README.md` quoted in the same file |

## Technical notes

### Inspected code (2026-10-17, planner)

- Baseline for comparison (executed by the planner on 2026-10-17):
  `pnpm --filter @studypilot/web test` → **19 files / 193 tests passed**;
  `typecheck` → exit 0; `lint` → exit 0.
- `README.md:33` — "State Management: Redux Toolkit + RTK Query (auth state in
  an RTK slice; server data via RTK Query over the shared axios transport in
  `apps/web/src/services/api.ts`)". Only this path needs repointing (RD12).
- `docs/epics/README.md` (Frontend architecture section) and
  `docs/epics/EP05-student-dashboard.md` were repointed by the planner on
  2026-10-17 (PC-001) — this child verifies they still match the landed tree
  and does not re-edit them unless the structure diverged.
- `docs/artifacts/STUDY-9|12|20/*.md` and older story files cite the old paths
  as historical evidence; delivery-state requires those to stay verbatim.
- `apps/web/.eslintrc.cjs` today has no import-boundary rule; A adds it, this
  child proves it fires.

### Proposed (not verified)

- If the boundary proof cannot be produced because the rule chosen in A cannot
  express the violation, that is a **finding, not a pass**: record it, and open
  a follow-up story (do not silently relax the rule or delete it).

## Sizing

- **Outcome:** the FSD structure is proven enforced, free of legacy paths,
  documented, and fully verified with an implementation index for the combined
  review.
- **Time estimate:** 60–90 min: two lint runs, two greps, one README line, up
  to five verification commands (including an optional build), and the index.
  Low uncertainty; the only risk is a build that cannot run, which is recorded
  as CANNOT VERIFY.
- **Files:** production — `README.md` (one line, plus the layout sentence only
  if present). Tests — none. Artifacts/docs — `docs/stories/SP-109/README.md`
  queue rows, `./artifacts/SP-109I/implementation.md`,
  `./artifacts/SP-109/implementation.md`.
- **Start context:** this ticket; [breakdown README](./README.md) *Target
  structure*, *Import-direction contract*, RD6/RD9/RD10/RD12, correction log
  PC-001/PC-002; `README.md:33`; `apps/web/.eslintrc.cjs`; the landed
  `apps/web/src` tree.
- **Verification:** the five commands in AC4 plus the greps in AC2, all quoted.
- **Dependencies / exclusions:** A–H. Excludes code fixes (reopen the owning
  child), test edits, Jira sync (RD11) and the combined review itself.

## Definition of Done

DoD 1, 8 and 9 apply (behavior unchanged and proven green; structure documented
in the root README and the breakdown). DoD 2/3/4/5/6/7 are N/A **for this
child** — it changes no form, data access, error, state, keyboard or responsive
code; their preservation is proven by the per-child suites. **DoD 10** — the
integrated review — is triggered by this child's index: the combined SP-109
review (`./artifacts/SP-109/review.md`) must run after this child, and this
child must not mark anything `Reviewed`. Evidence goes to
`./artifacts/SP-109I/` and `./artifacts/SP-109/`.

## Tracker reference

`Pending creation` (RD11 — no Jira sync authorized or performed).

## Out of scope

- The combined SP-109 plan/implementation review (owned by the `reviewer`).
- Relocating the academic types (RD9) and splitting the RTK Query API per
  feature (RD10) — both are named EP02 follow-ups in the breakdown.
