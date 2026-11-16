# EP13Q document review — round 2

**Date:** 2026-11-16 · **Pass:** 2 · **Reviewed commit:** `7aaacdd` (clean tree)
**Mode:** plan-style review of the edited documents (EP13Q's own sign-off, D13-19)
**Scope:** disposition of the round-1 findings R-EP13Q-01…05 ([review-round-1.md](./review-round-1.md), verdict: does not pass at `5e3fe2a`) against the fix commits `48c0b60` (R-EP13Q-01/-03) and `619faef` (R-EP13Q-02 ruling), plus re-execution of every round-1 gate that touches a changed file. The protocol diff since round 1 is confined to the fix scope — `git diff --stat 5e3fe2a..HEAD -- .agents .codex .vibe .opencode AGENTS.md CLAUDE.md tools` lists exactly `.agents/core.md`, `.agents/skills/{planner,refiner}/SKILL.md`, and the three runtime `planner` definitions — so all round-1 AC evidence for untouched files is reused unchanged. (`5e3fe2a` and `7aaacdd` are combined-review-unit commits outside this story; their only overlap with EP13Q's surfaces is `docs/stories/EP13/README.md` queue prose, re-measured below.)

## Prior findings — disposition

| ID | Round-1 gap | Disposition | Fresh evidence (HEAD `7aaacdd`, reviewer-executed 2026-11-16) |
|---|---|---|---|
| R-EP13Q-01 | EP13Q-AC1 budgets exceeded: core.md 802 > 800, refiner skill 927 > 900; record's AC1 row marked Done anyway | **Resolved** (`48c0b60`) | `wc -w`: `.agents/core.md` **799** ≤ 800, `.agents/skills/refiner/SKILL.md` **899** ≤ 900 (implementer 508, planner 625, reviewer 628, AGENTS.md 396 unchanged in substance). Trim diff inspected (`git show 48c0b60`): rewordings only — every rule survives (the refiner's write boundary, batching limit, stop-conditions, out-of-scope list, docs-only rule all present); no obligation dropped. Fresh-implementer protocol read 799+508+812 = 2,119 ≤ 4,000. The record carries a dated correction naming the restored budgets (`./implementation.md`, "Correction (2026-11-16, R-EP13Q-03)" closing paragraph), superseding the stale AC1-row numbers. |
| R-EP13Q-02 | README 3,479 > frozen 3,000; cap raised to 3,500 without a recorded user ruling and inconsistently (planner skill still said 3,000) | **Resolved** (`619faef` + user ruling) | The user ratified the 3,500-word cap in-session 2026-11-16 ("ratify 3500"), recorded in `./implementation.md` § "Ruling (user, 2026-11-16, closes R-EP13Q-02)". All three protocol locations now agree: `.agents/skills/planner/SKILL.md:52` "≤ 3,500 words (user ruling 2026-11-16, R-EP13Q-02)"; `.agents/delivery-state.md:9` ≤ 3,500; `tools/queue-lint.mjs:27` > 3500 check. `wc -w docs/stories/EP13/README.md` → **3,427** ≤ 3,500. The ruling is a recorded user waiver with exact scope (EP13Q-AC3's bound reads as 3,500), which a reviewer may accept. |
| R-EP13Q-03 | Source/mirror divergence (`.codex` and `.opencode` planner kept a live Jira sentence that `.vibe` dropped; `.vibe` description text differed) + the record's overstated/broken grep claim | **Resolved** (`48c0b60`) | Jira sentence removed from the `.codex/agents/planner.toml` source and the `.opencode/agents/planner.md` mirror; descriptions aligned to one string across all three (files read on disk: `.codex` description, `.vibe/agents/planner.toml:5`, `.opencode/agents/planner.md:2` are identical; instruction blocks agree line-for-line). Reviewer-executed `grep -rniE "jira" .codex .opencode .vibe` → **0 matches** (exit 1). The record's verification bullet is corrected by the dated "Correction (2026-11-16, R-EP13Q-03)" section quoting that corrected grep. This fix also removes the stale sentence R-EP13P-01 recorded. |
| R-EP13Q-04 | Record never quoted the EP13L/EP13N efficiency rows its Verification promised (polish) | **Open — registered, non-gating** | Registered as **D-R16** in `docs/stories/EP13/EP13R-follow-up-register-and-triage.md:57` (Backlog, awaiting user ruling). Polish; no mandatory obligation unmet (the rows themselves exist, `artifacts/efficiency.md`). |
| R-EP13Q-05 | queue-lint rule 5 (S-vs-M checkpoint steps) is dead code — the walker never recurses `artifacts/<child>/` (polish) | **Open — registered, non-gating** | Same **D-R16** row in EP13R. All checks EP13Q-AC12 enumerates still run: reviewer-executed `node tools/queue-lint.mjs docs/stories/EP13` → `clean (22 files)`, exit 0. |

## New findings

None. The two changed protocol files were re-read in full diff form; no rule was lost or weakened by the trims, and no new divergence was introduced in the runtime definitions.

## AC table — changes from round 1

| AC | Round 1 | Round 2 | Evidence |
|---|---|---|---|
| EP13Q-AC1 | Partially satisfied | **Satisfied** | core.md 799 ≤ 800, refiner 899 ≤ 900 (see R-EP13Q-01 row); all other AC1 measures carried over from round 1, re-confirmed by `wc -w`. |
| EP13Q-AC3 | Partially satisfied | **Satisfied** | README 3,427 ≤ 3,500 under the ratified cap; split (README/history/contracts) unchanged since round 1; one number, three agreeing locations plus the recorded ruling (see R-EP13Q-02 row). |
| EP13Q-AC9 | Partially satisfied | **Satisfied** | Source and both mirrors agree; headers intact ("Derived from .codex…", `.vibe/agents/planner.toml:1`, `.opencode/agents/planner.md:10`); no-generator-script deviation stands as recorded (round-1 accepted). |
| EP13Q-AC2, AC4–AC8, AC10–AC13 | Satisfied | **Satisfied** (reused + spot re-check) | Untouched by the fix commits (diff-stat above). Spot re-run after the trims: `grep -rniE "autopilot|ui_refiner|ui-refiner" AGENTS.md CLAUDE.md README.md .agents .codex .vibe .opencode` → only the "there is no autopilot" statements; queue-lint clean (22 files). |

## Verdict

**Passes** — R-EP13Q-01, R-EP13Q-02 and R-EP13Q-03 are closed against persisted, independently re-verified corrections (`48c0b60`, `619faef`, ruling recorded in the EP13Q record); R-EP13Q-04/-05 are polish, registered as D-R16 in EP13R, and do not gate. No blocker or should-fix remains open. Passing sync performed (queue row, history.md, efficiency.md) per passing-sync.md.

### How to verify by hand

All steps are document inspection on commit `7aaacdd`, executed by the reviewer on 2026-11-16 in the repo root.

1. `wc -w .agents/core.md .agents/skills/*/SKILL.md AGENTS.md` — expect core.md **799** (≤ 800), refiner **899** (≤ 900), implementer 508, planner 625, reviewer 628, AGENTS 396. **Executed — 2026-11-16; confirmed (closes R-EP13Q-01).**
2. `git show 48c0b60 -- .agents/core.md .agents/skills/refiner/SKILL.md` — read the trim diff; every removed phrase is a rewording, no rule deleted. **Executed — 2026-11-16; confirmed.**
3. `wc -w docs/stories/EP13/README.md` (expect **3,427** ≤ 3,500), then `grep -n "3,000\|3500\|3,500" .agents/skills/planner/SKILL.md .agents/delivery-state.md tools/queue-lint.mjs` — expect all three saying 3,500, the planner skill citing "user ruling 2026-11-16, R-EP13Q-02"; read the Ruling section at the end of `./implementation.md`. **Executed — 2026-11-16; confirmed (closes R-EP13Q-02).**
4. `grep -rniE "jira" .codex .opencode .vibe` — expect **0 matches**; then diff the three planner definitions' description strings and instruction blocks — expect them identical in substance. **Executed — 2026-11-16; confirmed (closes R-EP13Q-03).**
5. Open `docs/stories/EP13/EP13R-follow-up-register-and-triage.md` and find the **D-R16** row naming R-EP13Q-04/-05. **Executed — 2026-11-16; present at line 57.**
6. `node tools/queue-lint.mjs docs/stories/EP13` — expect `clean`, exit 0. **Executed — 2026-11-16, repo root: clean (22 files), exit 0 (re-run after the passing sync).**
7. `git diff --stat 5e3fe2a..7aaacdd -- .agents .codex .vibe .opencode AGENTS.md CLAUDE.md tools` — expect exactly the six fix-scope files, confirming round-1 evidence for everything else still holds. **Executed — 2026-11-16; confirmed.**
