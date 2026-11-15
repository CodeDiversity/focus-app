# Identifier conventions

One table for every label family used in plans, stories, checkpoints, records
and reviews. Every role reads this before writing an identifier. A label that
is not in this table is not introduced without adding it here first.

## Label families

| Family | Form | Defined in | Example | Notes |
| --- | --- | --- | --- | --- |
| Epic | `EP<nn>` | `docs/epics/README.md` | `EP13` | |
| Child story | `EP<nn><L>` or `EP<nn><L><n>` for a fix/split child | breakdown README | `EP13I`, `EP13H2` | Letters are stable IDs, never execution order. Skip `O` (reads as zero). |
| Release milestone | `M<n>` | `docs/epics/README.md` | `M6` | Only milestones use `M`. |
| Checkpoint step | `S<n>` | the checkpoint | `S3` | Never `M`. Legacy checkpoints used `M1…` for steps; read them by context. |
| Epic acceptance criterion | `AC-E<nn>-<nn>` | breakdown README ownership table | `AC-E13-04` | Stable IDs assigned by the planner; original wording preserved. |
| Epic test requirement | `TR-E<nn>-<nn>` | breakdown README traceability table | `TR-E13-10` | |
| Child acceptance criterion | `<STORY>-AC<n>` | the story file (numbered list) | `EP13I-AC3` | Always qualified when cited outside its own story. Inside the story's own AC list the bare number is the definition. Never `AC3`, `AC-3`, `AC 3` in records, queue cells or reviews. |
| Shared DoD item | `DoD-<n>` | `docs/epics/README.md` | `DoD-10` | |
| Epic decision | `D<nn>-<n>` | breakdown README decision register | `D13-13` | Register rows stay in numeric order. |
| Story decision | `D-<story suffix><n>` | the story's Decisions subsection | `D-I8` (EP13I), `D-H2-1` (EP13H2) | A story decision that refines or overrides an epic decision ends with `(refines D13-13)` / `(overrides D13-13)`, and the planner adds a back-reference to that register row. |
| Cross-epic decision | same as epic decision | that epic's register | `D08-8` | Cite with the epic prefix; never shorten. |
| Verification task | `V-<nn>-<n>` | breakdown README | `V-13-6` | |
| Implementer finding | `F-<STORY>-<nn>` | `implementation.md` / checkpoint | `F-EP13H-02` | Two digits; stable once assigned; never reused. |
| Reviewer finding | `R-<UNIT>-<nn>` | `review.md` / `plan-review.md` | `R-EP13-04`, `R-SP-105-02` | One scheme for plan and implementation reviews. Replaces `PR-NNN`, `F-NN` and `P-NNN`. Prior reports keep their legacy IDs. |
| Finding disposition | fixed words | — | `open`, `fixed`, `blocked`, `Addressed — awaiting re-review`, `closed` | `closed` is reviewer-only. |

## Rules

1. **Qualify when you leave the file.** Inside a story, its AC list and
   Decisions table define bare numbers. Anywhere else (queue, checkpoint,
   record, review, sibling story) cite the qualified form.
2. **One namespace per prefix.** `M` is milestones; `S` is checkpoint steps;
   `R` is reviewer findings; `F` is implementer findings; `D` is decisions.
3. **Decisions are cited, not restated.** Records and checkpoints reference a
   decision ID with at most a half-line gloss; the definition lives in exactly
   one register or Decisions table.
4. **Overrides are bidirectional.** When a story decision changes an epic
   decision, the story says so (`overrides D13-13`) and the planner appends
   `superseded by D-I8` to the epic register row in the same planning pass.
5. **Re-letter / re-sequence policy.** A decision that changes a story's
   letter or the queue order must, in the same commit, update every live
   cross-reference: queue rows, Stories table, review-unit row, dependency
   lines in sibling specs, checkpoint "resume next" pointers, and relative
   links. Only dated historical records (`implementation.md`, `review.md`,
   `walkthrough.md`, commit messages) stay verbatim; add a one-line
   "re-lettered from …" note in the story header rather than repeating it in
   every table.
6. **Counts are derived, not typed.** Avoid "thirteen children" style prose;
   say "all children in the queue" or list the IDs.

## Legacy forms (read-only knowledge)

`AC-01`/`TR-01` (early planner skill), `PR-NNN`/`P-NNN`/`F-NN` reviewer
findings, `AC-12C-1`/`T-12A-5` (EP12), checkpoint `M1…M5` steps, and
`STUDY-nn` tracker keys appear in records dated before 2026-11-15. Do not
rewrite them; do not create new ones.
