# EP13P — Agent lifecycle and record clarity

**Story ID:** EP13P
**Epic:** [EP13](../../epics/EP13-adaptive-scheduling-for-adhd.md) (process story; delivery home only — see Scope)
**Milestone:** M6
**Layer:** Documentation / process (no application code)
**Status:** Reviewed — document review passes (round 1, 2026-11-16, `./artifacts/EP13P/review.md`; open: R-EP13P-01, polish). EP13P-AC1–AC3, AC5–AC6: record `./artifacts/EP13P/implementation.md` (a9afe4d). EP13P-AC4 completed by planner pass 50b8477 + 904a496 (+ the closeout commit that set this line; correction log C-EP13-01…09 in `history.md`).
**Dependencies:** None on application children. Can run any time; it does not block and is not blocked by EP13L–EP13M.
**Created:** 2026-11-15 (user-requested lifecycle review)

## Summary

Audit result and improvement plan for the agent delivery lifecycle: which roles
stay, which merge, and how plans and implementation records become easier to
follow — above all the requirement/decision labels ("requirement variables")
that currently collide and drift. Deliverables are documentation-only edits to
`.agents/`, `AGENTS.md`, `CLAUDE.md`, `docs/artifacts/README.md` and the EP13
breakdown.

**Scope note:** this story is hosted in EP13 because the evidence comes from
EP13 delivery, but it is a process story. It is **outside the EP13 final
implementation review unit** (which remains the application children); its own
sign-off is a plan-style review of the edited documents.

## Audit findings (evidence base)

### A. Roles

| Role | Verdict | Why |
|---|---|---|
| implementer, planner, reviewer, autopilot | Keep | Load-bearing graph nodes; boundaries work in practice. |
| dod-auditor | Keep | The `judge` node is the graph's most-used edge target; read-only reconciliation is cheap and prevents gate drift. |
| refiner + ui-refiner | **Merge into one `refiner`** | The two skills are ~80 % identical text; only the question checklist differs. Keep the UI/UX checklist as a section the refiner loads for frontend stories — the same supporting-skill pattern the implementer already uses for backend/frontend guidance. Saves one full dispatch (fresh context, closeout, commit) per frontend child and removes two graph edges (`ui_unknown`/`ui_needed` fold into the technical-refinement gate with a UI flag). |
| backend / frontend skills | Keep as-is | Already supporting guidance, not agents. |
| jira-sync | **Park (keep the skill, drop from active docs)** — superseded 2026-11-15: user decision removed jira-sync entirely (record EP13P-AC3) | Every key in the repo is `Pending creation`; no sync has ever been authorized. Until Jira is real, the role is dead weight in AGENTS.md, delivery-state and the planner skill. One pointer line suffices. |

### B. Broken and drifted references (mechanical fixes)

1. `CLAUDE.md:5`, the whole `AGENTS.md:19-26` role table, and
   `docs/artifacts/README.md:60,63` point at `.agents/skills/studypilot-*/SKILL.md`;
   the actual directories are `.agents/skills/<role>/`. Every one of these links is broken.
2. Planner skill says milestones "M1–M4" (`planner/SKILL.md:98`); the repo has M5/M6.
3. Planner skill mandates `AC-01`/`TR-01` IDs; practice is `AC-E13-01`/`TR-E13-01`.
4. Reviewer skill mandates `PR-001` finding IDs; actual reviews use `F-01` (EP08),
   `P-001` (EP12). `PR-` also reads as "pull request".
5. Refiner/ui-refiner require a "Description" section that EP13 story files don't have.

### C. Label collisions ("requirement variables")

1. **`M#` means two things:** checkpoint steps (M1…M5) and release milestones (M1…M6)
   inside the same story folder.
2. **Four reviewer-finding schemes** (`PR-NNN`, `F-01`, `P-001`, `F-12A-5`), and bare
   `F-01` collides with implementer findings `F-EP13x-NN`.
3. **Child ACs are unqualified** and inconsistently written (`AC3`, `AC-2`, `AC 8`),
   indistinguishable from epic `AC-E13-02` without context.
4. **Three decision namespaces that look alike** (`D13-n` epic, `D-I8` story, `D08-8`
   other epic); story decisions can override epic decisions (D-I8 vs D13-13) with no
   back-reference in the register.
5. **No document defines any of these schemes**; each first appears where first used.

### D. D13-16 re-letter fallout (plan-correction items)

Live, non-historical specs still use the pre-re-letter letters:
- `EP13B.md:37,107-108`, `EP13D.md:48,143-144,186-187` say "EP13J" for absorption/micro-start (now EP13I).
- `EP13F.md:41,111`, `EP13G.md:43,111` say "EP13I" for energy (now EP13J).
- `artifacts/EP13F/checkpoint.md:42` links `EP13I-energy-aware-…md`, a file that no longer exists.
- README internal contradictions: "thirteen children" (lines 20, 258) vs 15 files;
  review unit "EP13A–EP13M" (line 248) omits EP13N and EP13H2; line 16 says
  "EP13N follows EP13M" vs D13-17's order L→N→K→J→M; stale D13-4-blocking text at
  lines 6, 85, 254; decision register ordered D13-17, D13-16, D13-15.
- DoD map drift: README DoD-4 row omits EP13E/I/J which claim it in-story; DoD-3
  omits EP13I; EP13J's source refs (line 43) disagree with its own DoD section.
- Stale "resume next" pointers in EP13F/H/I checkpoints (pre-D13-17 order).

### E. Record redundancy

The same fact (test counts, finding status, deviations) is written in 3–4 places:
queue row (one EP13I cell is ~600 chars), checkpoint, implementation record and
story Status line. Finished checkpoints duplicate `implementation.md`. The EP08
review is one 942-line file holding three passes with continuous numbering.

## Acceptance criteria

1. **ID conventions doc exists and is linked.** New `.agents/id-conventions.md`
   defines every label family in one table: epic ACs (`AC-E<nn>-<nn>`), TRs
   (`TR-E<nn>-<nn>`), child ACs **qualified by story ID** (`EP13I-AC3`), epic
   decisions (`D<nn>-<n>`), story decisions (`D-<story letter(s)><n>`, with a
   mandatory "overrides/refines →" back-reference into the epic register when
   applicable), verification tasks (`V-`), implementer findings (`F-<story>-NN`),
   reviewer findings (one scheme: `R-<unit>-NN`, replacing `PR-`/`F-`/`P-`),
   checkpoint steps renamed `S1…Sn` (never `M`). It also defines the
   **re-letter/re-sequence policy**: a re-letter decision must list and update every
   live spec/queue/checkpoint cross-reference in the same commit; only dated
   historical records stay verbatim. AGENTS.md's canonical-rules list links it.
2. **Broken paths fixed.** All `studypilot-*` skill paths in CLAUDE.md, AGENTS.md
   and `docs/artifacts/README.md` resolve to the real `.agents/skills/<role>/`
   directories (B.1), and the skill-drift items B.2–B.5 are corrected in the
   planner/reviewer/refiner skills.
3. **Refiner merge decided and documented.** Either the refiner/ui-refiner merge
   (A) is applied — one skill, UI/UX checklist section, workflow-graph edges
   collapsed, role table and `.codex/.vibe/.opencode` definitions updated — or an
   explicit decision to keep them separate is recorded with rationale. jira-sync
   is reduced to a pointer in AGENTS.md until sync is authorized.
4. **D13-16 fallout repaired.** Every item in section D is fixed in the live EP13
   specs/README/checkpoints, each logged as a row in the EP13 plan correction log
   with preserved originals. Historical implementation records are left verbatim.
5. **One-fact-one-place for records.** `.agents/context-efficiency.md` and
   `checkpoint-execution.md` gain concrete rules: queue Evidence cells contain
   links + a one-line verdict only (no test counts/finding prose); a completed
   child's checkpoint is reduced to a 3-line pointer at closeout; decisions are
   cited by ID, never restated; multi-round reviews go in per-round files
   (`review.md` stays the latest verdict, `review-round-<n>.md` holds history).
6. **Template alignment.** The story-file template in the refiner skill(s) and the
   planner skill's child-story section list match the actual EP13 structure
   (Summary / Scope / Source requirement references / Acceptance criteria / Tests
   / Technical notes incl. Decisions / DoD / Sizing block).

## Out of scope

- No application code, tests or migrations.
- No bulk rewrite of completed stories/epics to the new ID scheme — conventions
  apply to EP13's remaining children and future work; historical records keep
  their labels, listed as known legacy forms in the conventions doc.
- No Jira mutation; no change to review cadence, write boundaries or the
  one-writer rule.
- Workflow-graph changes beyond the refiner-merge edge collapse (EP13P-AC3).

## Tests / verification

- Link check: every relative link in the edited docs resolves (run a repo-wide
  grep for `studypilot-` — zero hits outside historical records — and for the
  dead `EP13I-energy-aware` filename).
- Cross-check: README children counts, review-unit row, DoD map and decision
  register agree with the actual story files after EP13P-AC4.
- Plan-style reviewer pass over the edited documents (this story's sign-off;
  not part of the EP13 application review unit).

## Technical notes

- **Write boundaries:** `.agents/`, `AGENTS.md`, `CLAUDE.md` and the
  `.codex/.vibe/.opencode` role definitions sit outside the planner's `docs/`
  boundary. Executing EP13P-AC1–AC3 therefore needs either the user directly or an
  explicit user-granted exception for the session doing the work; EP13P-AC4–AC6 are
  ordinary planner-scope `docs/` edits.
- Sequencing inside the story: EP13P-AC2 (mechanical fixes) first, EP13P-AC1
  (conventions) second, EP13P-AC4 (fallout repair, applying the new conventions)
  third, EP13P-AC3 and EP13P-AC5–AC6 last.

## Sizing block

- **Outcome:** one conventions doc, repaired references and a de-duplicated
  record protocol, leaving the remaining EP13 children with unambiguous labels.
- **Request/token estimate:** 2–3 requests (docs-only; the audit is already done
  and recorded above).
- **Model recommendation:** 2 — mechanical edits against an explicit checklist;
  the judgment calls are already settled in this story.
- **Files:** `.agents/id-conventions.md` (new), `AGENTS.md`, `CLAUDE.md`,
  `docs/artifacts/README.md`, `.agents/skills/{planner,reviewer,refiner,ui-refiner}/SKILL.md`,
  `.agents/{context-efficiency,checkpoint-execution,workflow-graph}.md`,
  `docs/stories/EP13/README.md`, `EP13B/D/F/G` specs, `artifacts/EP13F|H|I/checkpoint.md`.
- **Start context:** this story only; sections B–E above carry file:line evidence.
- **Verification:** the link/cross-check greps above; plan-style review.
- **Dependencies / exclusions:** none on application children; exclusions per
  Out of scope.
