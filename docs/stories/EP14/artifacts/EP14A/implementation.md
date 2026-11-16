# EP14A implementation record

**Story:** [EP14A — CI Runs the Full Gate on Delivery Branches](../../EP14A-ci-runs-the-full-gate-on-delivery-branches.md)
**Status:** Implemented — awaiting parent review
**Date:** 2026-11-16
**Commit scope:** `.github/workflows/ci.yml`, `.agents/skills/implementer/SKILL.md` (closeout rule 6), this record, story Status/sizing, queue row, `efficiency.md`. R-EP14-04 polish (three stale "red/green" phrases) folded in.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP14A-AC1 — every branch triggers; PRs keep theirs | **Done.** `on.push.branches: ['**']`; `pull_request` unchanged. Both scratch pushes triggered runs within seconds. | `ci.yml:5–8`; runs 43908087082 / 43908098549 |
| EP14A-AC2 — gated step single-worker; JWT never empty | **Done.** Backend step → `pnpm --filter @studypilot/api run test --runInBand` (the arg-forwarding pattern line 78 already proves); `JWT_SECRET: ${{ secrets.JWT_SECRET \|\| 'ci-only-test-secret' }}`. | `ci.yml:35,83` |
| EP14A-AC3 — deliberate-red + known-red-baseline runs | **Done with one noted limit.** (i) deliberate red `c8fecc5` (throwaway failing spec): run [43908098549](https://github.com/CodeDiversity/focus-app/actions/runs/43908098549) completed **failure**, failed step "Run backend tests". (ii) known-red baseline `5bd86c9` (this branch + the CI change, nothing else): run [43908087082](https://github.com/CodeDiversity/focus-app/actions/runs/43908087082) completed **failure**, failed step "Run backend tests". *Composition evidence:* the job-log API needs authentication (403 anonymously), so "only the four R-EP13-03 tests fail" is proven by execution-mode parity — the identical tree run locally with `npx jest --runInBand` fails with exactly those four (this session at `619faef`-equivalent tree; the combined reviewer reproduced it twice at `210f76c`/`619faef`). One click on the run link shows the log to any signed-in collaborator. Scratch branches deleted; the runs persist. | run links; `study-plans-e2e.spec.ts` / `study-plans-data-scoping.spec.ts` failure names in `../EP13/review-round-1.md` |
| EP14A-AC4 — evidence rule | **Done.** Implementer skill closeout rule 6: a gated-suite pass needs a CI run link or a local run command + result. | `.agents/skills/implementer/SKILL.md` |

## Verification (2026-11-16)

- Scratch commits built with a temporary index (the delivery branch itself was never moved); pushed with the user's authorization (granted in-session, 2026-11-16); both branches deleted after the runs completed.
- `node tools/queue-lint.mjs docs/stories/EP14` clean.

## Deviations / findings

- F-EP14A-01: anonymous API access cannot read job logs (403), so AC3(ii)'s test-level composition relies on the runInBand parity chain above rather than the CI log itself. Disposition: recorded; any signed-in collaborator can verify the log at the run link. Owner: reviewer at the parent review.
- The known-red window (R-EP14-01, accepted in plan): every push until EP14B lands shows those four failures.
