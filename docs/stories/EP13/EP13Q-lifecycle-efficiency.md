# EP13Q — Lifecycle efficiency: fewer words, fewer dispatches, measured

**Story ID:** EP13Q
**Epic:** [EP13](../../epics/EP13-adaptive-scheduling-for-adhd.md) (process story; delivery home only, outside the EP13 application review unit — D13-19)
**Milestone:** M6
**Layer:** Documentation / process (no application code)
**Status:** Queued
**Dependencies:** EP13P implemented (a9afe4d…7f089a5). None on application children.
**Created:** 2026-11-15 (user-requested efficiency review)

## Summary

The lifecycle is safe but expensive. Every fresh dispatch re-reads roughly
22k tokens of protocol before reading any code, the graph spends almost half
its edges on read-only judge dispatches, and the breakdown README every role
must read is 40 % history. Meanwhile the way EP13 was actually delivered
(user-driven: one refiner pass for UI children, one implementer pass, one
commit each, no plan review, no judges) was already lean — the heavy machinery
is largely unused. This story trims the protocol to what practice needs, makes
the hot path cheap, and finally measures it.

## Measurements (2026-11-15, HEAD 7f089a5)

| Measure | Value |
|---|---|
| Protocol corpus (`AGENTS.md`, `.agents/**`, artifacts/epics READMEs) | 22,585 words, 19 files, 54 cross-links |
| Mandatory read set, fresh implementer (protocol + EP13 README + story + DoD) | 16,643 words ≈ 22k tokens before any code |
| Same, reviewer / autopilot / judge | 16,568 / 15,663 / 13,718 words |
| Graph edges whose target is `judge` | 15 of 35 |
| EP13 README | 5,764 words; correction log 1,023 + decision register 784 + quality gate 356 |
| Largest single protocol files | reviewer skill 3,289; workflow graph 2,494; planner skill 2,493; autopilot 1,852 |
| Rules duplicated across files | secrets rule in 7 files; closeout contract in 10; walkthrough gate in 8 |
| Plan reviews run for EP13 | 0 ("Plan review: not yet run"; ten children shipped) |
| `efficiency.md` rows ever written | 0 (mandated by context-efficiency.md) |
| EP13 delivery pattern (git log) | per child: `docs(ui-refiner pass)` → `feat(child)`; no autopilot, no judge, no plan review |

## The twenty questions

**Dispatch and reads**

1. *Is the lifecycle efficient overall?* **Not as written.** It is safe and
   auditable, but the written protocol is sized for an unattended autopilot
   with adversarial gates, while the actual EP13 workflow was a human-driven
   two-dispatch loop. The gap is the waste.
2. *Is it using too many tokens?* **Yes, on the fixed cost.** ~22k tokens of
   instructions per fresh dispatch is more than most children's code diff.
   With ~3 dispatches per child (refiner, implementer, occasional judge) that
   is ~65k tokens/child of pure protocol, before the README, story and code.
3. *Does every role need AGENTS.md plus 5–7 protocol files?* **No.** Most
   rules a role reads are about other roles. Each role needs: its skill, the
   queue, its story, the DoD, and ID conventions. Everything else is
   reference, loaded on demand.
4. *Is the fresh-context-per-dispatch rule worth it?* **Yes for writers, no
   for judges.** Fresh context protects the single-writer invariant and stops
   transcript drift. A judge that only reads the queue state does not need
   a fresh 14k-word context; it needs a table lookup.
5. *Are judge dispatches necessary at all?* **Mostly no.** 11 of the 15 judge
   edges resolve a gate that is literally a column in the queue table or the
   existence of a file (`review.md`, `walkthrough.md`, `implementation.md`).
   Those are deterministic checks the coordinator can run inline with
   `ls`/`grep`; only "are these findings the same as last round?" and
   "is this breakdown valid?" need judgment.
6. *Is the workflow graph (2.5k words + YAML) paying for itself?* **Not in
   this repo.** No local runner exists here; in-session autopilot is the only
   consumer, and EP13 never used autopilot. Keep the edge table (it is the
   clearest spec of the lifecycle), move the YAML contract and non-edge test
   fixtures to a reference file loaded only by autopilot.
7. *Is autopilot itself efficient?* **It is the most expensive mode**: it
   re-reads 15.7k words per step, writes a 13-gate checkpoint before and after
   every dispatch, and dispatches judges to re-derive what the queue says.
   Keep it for unattended runs; make the deterministic gates inline and the
   checkpoint YAML ~6 fields.

**Planning**

8. *Is the plan review gate pulling its weight?* **Unproven.** It has never
   run for EP13 and the epic shipped ten children with one correction pass.
   Make it conditional: required when a breakdown adds a migration, a security
   invariant or more than ~8 children; otherwise the planner's quality-gate
   table is the gate.
9. *Is the breakdown README too big to be the thing every role reads?*
   **Yes.** 5.8k words, and 2.2k of them (correction log, decision register
   history, quality gate) are cold. Split: `README.md` keeps queue, contracts,
   AC/TR ownership and live decisions (~2.5k words); `history.md` keeps the
   correction log, quality-gate table and superseded decisions.
10. *Is the sizing block useful or ceremony?* **Half useful.** Files, start
    context and verification are read by implementers. "Request/token
    estimate 1–3" is never checked against anything (no efficiency rows
    exist). Keep the block; replace the estimate with a measured actual at
    closeout (one line: dispatches, approx. tokens if the runtime exposes them).
11. *Is the model recommendation (1–5) used?* **No evidence it is.** Either
    route by it (refiner, judge, docs-only planner corrections → a smaller
    model) or drop it. Recommend routing: those tasks are checklist work.
12. *Are the planner (2.5k) and planning-checklist (0.9k) duplicative?*
    **Yes, ~30 %.** The planner skill restates the quality-gate table, sizing
    rules and story template that live in story-sizing and planning-checklist.
    Make the skill the workflow and the checklist the only copy of the gate.

**Implementation**

13. *Should every child have a checkpoint?* **No.** EP13 children landed in
    one commit each; their checkpoints duplicate `implementation.md` and are
    now closed pointers. Rule: checkpoint only when the task spans a context
    window or is handed off; otherwise the implementer writes
    `implementation.md` only. EP13H2 already did this correctly.
14. *Is the implementer's closeout proportionate?* **Nearly.** Four ordered
    steps, each needed. The waste is upstream: the closeout rules are stated
    in four places (implementer skill, checkpoint-execution, context-efficiency,
    review-cadence). One copy.
15. *Are backend/frontend supporting skills worth separate files?* **Barely.**
    560 words total; fold them into the implementer skill as two subsections
    and remove two files and their cross-links.
16. *Is the one-writer rule costing throughput?* **Slightly, and worth it.**
    EP13 shows independent children (e.g. L and N) that could have run in
    parallel worktrees, but the merge/queue reconciliation cost and the
    protocol complexity of a second writer exceed the wall-clock gain for a
    single-user repo. Keep it.

**Review**

17. *Is one combined review of 15 children efficient?* **Cheaper than 15
    reviews, but risky as a single context.** EP08's combined review ran to
    942 lines over three passes. Keep the single final verdict but let the
    reviewer run it as per-child sections in order with a running report, and
    cap each pass at the changed children on re-review (the per-round files
    from EP13P make that possible).
18. *Is the separate `walkthrough.md` worth a dedicated dispatch?* **No.**
    It is reviewer-owned, written after the pass, and in EP08 was 291 lines of
    manual steps largely restating the report's evidence. Make it a final
    section of `review.md` ("How to verify by hand"), produced in the same
    pass, and drop the `walkthrough` node and its two gates.
19. *Is the reviewer skill (3.3k words, the largest file) proportionate?*
    **No.** It carries five modes (static audit, plan review, implementation
    review, walkthrough, passing-docs sync) plus a severity contract and
    restricted-runtime fallback. Split into a 900-word core plus two
    on-demand references (plan review; passing sync + fallback).

**Measurement and maintenance**

20. *Do we know any of this for sure?* **No — that is the biggest gap.**
    The protocol mandates `efficiency.md` rows and none exist. Nothing is
    measured, so every rule above is argued from word counts and git history.
    The first deliverable is a one-line-per-dispatch log the coordinator
    (or the user) appends: child, role, model, dispatches, input/output tokens
    when exposed, outcome. Decide the rest on two children's data.

Bonus: *three runtime role definitions (`.codex`, `.vibe`, `.opencode`) say
the same thing in three syntaxes.* Generate them from one source, or keep one
and note the others as derived.

## Acceptance criteria

1. **Tiered reads.** A new `.agents/core.md` (≤ 800 words) holds the rules
   every role shares (write boundaries table, single writer, closeout fields,
   secrets, ID-conventions pointer). Each role skill is ≤ 900 words and lists
   exactly its mandatory reads; everything else is marked *reference, load on
   demand*. AGENTS.md becomes the entry point (≤ 400 words) pointing at
   `core.md`. The fresh-implementer mandatory read set (protocol + DoD, before
   README/story) measures ≤ 4,000 words.
2. **Deterministic gates inline.** The workflow graph marks each judge edge
   as `deterministic` (coordinator checks queue state / file existence
   inline, no dispatch) or `judgment` (dispatch). At most 4 judgment edges
   remain. The autopilot checkpoint YAML shrinks to: scope, stage,
   active_dispatch, writer, blocker, last_result.
3. **Breakdown split.** Delivery-state defines `README.md` (queue, contracts,
   AC/TR ownership, live decisions) and `history.md` (correction log,
   quality-gate table, superseded decisions). Applied to EP13 as the first
   instance; README ≤ 3,000 words after the split.
4. **Checkpoint only when needed.** Checkpoint-execution and the implementer
   skill require `checkpoint.md` only for multi-window or handed-off tasks;
   otherwise `implementation.md` is the sole record. Existing closed pointers
   stay.
5. **Walkthrough folded into review.** Review-cadence, reviewer skill,
   artifacts README and the graph make "How to verify by hand" a required
   final section of `review.md`; the `walkthrough` node and its two gates are
   removed; `walkthrough.md` files already written remain historical.
6. **Conditional plan review.** Planning-checklist states when a plan review
   is required (new migration, security invariant, > 8 children, or user
   request); otherwise the planner's quality-gate table is the gate and the
   graph's `plan_not_ready` edge applies only when the condition holds.
7. **Consolidation.** Backend/frontend guidance folded into the implementer
   skill; closeout contract, secrets rule and walkthrough rule each exist in
   exactly one file (others link). Reviewer skill split into core + two
   references. Protocol corpus ≤ 14,000 words (from 22,585).
8. **Measure.** `docs/stories/<epic>/artifacts/efficiency.md` gets a
   one-line-per-dispatch schema (date, child, role, model, tokens in/out if
   exposed, tool calls, outcome) and the closeout contract requires the
   coordinator or user to append a row per dispatch. Sizing blocks replace
   the "request/token estimate" with "actual at closeout". Model
   recommendation becomes routing guidance: refiner, deterministic planner
   corrections and judges default to a smaller model.
9. **Runtime definitions.** `.codex/agents/*.toml` is the source; `.vibe` and
   `.opencode` definitions carry a header "derived from .codex — edit there"
   and are regenerated (a 20-line script is acceptable) or removed if unused.

## Out of scope

- Application code. Re-reviewing implemented EP13 children. Changing the
  single-writer rule (Q16: keep). Changing the one-final-review cadence
  (Q17: keep the single verdict).

## Verification

- `wc -w` over the protocol corpus and over each role's declared mandatory
  read set, recorded in this story's `implementation.md` against the table above.
- Link check over all edited docs; `grep -c "to: judge"` ≤ 4 on judgment edges.
- Two EP13 children (EP13L, EP13N) delivered after this story each produce
  `efficiency.md` rows; the story's record quotes them.

## Technical notes

- Writes land in `.agents/`, `AGENTS.md`, `CLAUDE.md`, `.codex/.vibe/.opencode`,
  `docs/artifacts/README.md`, `docs/stories/EP13/` — outside the planner's
  `docs/` boundary for most of it; user-granted as with EP13P.
- Order: AC 8 (measurement schema) first so EP13L can log; AC 1/7
  (consolidation) next; AC 2/5/6 (graph) third; AC 3/4 last.
- **Decisions:** D-Q1 keep single writer (refines nothing; confirms AGENTS.md);
  D-Q2 keep one combined final review (confirms review-cadence); D-Q3
  walkthrough becomes a review section (overrides DoD-11 wording — planner to
  update `docs/epics/README.md` DoD item 11 to "review includes a manual
  verification section").

## Sizing block

- **Outcome:** a protocol roughly 40 % smaller by words, ≥ 75 % smaller on the
  per-dispatch fixed read, with judge dispatches mostly eliminated and a
  measurement log in place.
- **Actual at closeout:** (to be filled)
- **Model recommendation:** 3 — editing is mechanical but the consolidation
  must not drop a safety rule; a mid-tier model with the checklist above.
- **Files:** `.agents/core.md` (new), `AGENTS.md`, `CLAUDE.md`,
  `.agents/*.md`, `.agents/skills/*/SKILL.md`, `docs/artifacts/README.md`,
  `docs/epics/README.md` (DoD-11), `docs/stories/EP13/{README,history}.md`,
  `docs/stories/EP13/artifacts/efficiency.md` (new), runtime role defs.
- **Start context:** this story; EP13P for the conventions already in force.
- **Verification:** as above.
- **Dependencies / exclusions:** EP13P done; exclusions per Out of scope.
