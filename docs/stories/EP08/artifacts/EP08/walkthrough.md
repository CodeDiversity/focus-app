# EP08 — Catch-Up & Recovery: User Walkthrough

**Written by:** `reviewer` role, review pass 3 (2026-10-31), final implementation review
**Review unit:** EP08A · EP08B · EP08C · EP08D · EP08E · EP08F (one combined parent review)
**Reviewed code state:** `48d79a0` (HEAD `08b69f8` — bookkeeping only since)
**Final review:** [`review.md`](./review.md) (§1–§23: passes 1–2; §24–§29: pass 3 verdict **PASS**)

> **How to read the labels.** This review had **no execution capability** (no
> shell, nested delegation refused — probe recorded in `review.md` §24), so
> nothing here labeled below is a claim that *this review* ran a command.
> Every machine result is `RECORDED-EVIDENCE`: the implementer executed it and
> recorded command, environment and result (fix-round-1.md, EP08F record); the
> tested code is unchanged since those runs, which the pass-3 review verified
> statically. The one human observation that never happened is labeled
> `WAIVED-BY-USER-RULING` with exact scope. What you can check yourself is
> given as numbered steps — steps are instructions, not test results.

---

## 1. What changed (per story)

| Story | What a user gets | Record |
|---|---|---|
| **EP08A** | The read side: past SCHEDULED sessions on unfinished assignments are *missed work*; `GET /study-plans/recovery-summary` gathers missed sessions, unfinished work (EP06's remaining-work classification), total confirmed minutes, and a neutral message. Also the additive `locked` flag + migration on `PlannedSession`. | [`../EP08A/implementation.md`](../EP08A/implementation.md) |
| **EP08B** | The brains, pure domain: `replan(...)` calls EP06's own `schedule()` over unfinished assignments with a busy set that includes confirmed history, completed planned sessions and locked planned sessions. No second algorithm, no writes, no clock. | [`../EP08B/implementation.md`](../EP08B/implementation.md) |
| **EP08C** | `POST /study-plans/catch-up/preview` (side-effect-free) and `POST /study-plans/catch-up/confirm` (one transaction: selective delete of `SCHEDULED && !locked` rows, insert of the submitted set; never touches `StudySession`, `Assignment`, `Task`). Feasibility warnings ride the preview. | [`../EP08C/implementation.md`](../EP08C/implementation.md) |
| **EP08D** | `/catch-up` — the recovery summary page: missed-session list, unfinished-work rows, the "Create catch-up plan" entry point; loading/empty/error states. | [`../EP08D/implementation.md`](../EP08D/implementation.md) |
| **EP08E** | `/catch-up/preview` — edit the proposal (move/delete/insert), confirm it, decline it ("Not now"), see preservation and conflict cards, and toggle a session's lock (`PATCH /study-plans/sessions/:sessionId/lock`). | [`../EP08E/implementation.md`](../EP08E/implementation.md) |
| **EP08F** | Proof: a 9-test Playwright suite against the real stack covering the whole journey, plus the parent index and a11y evidence collection. | [`../EP08F/implementation.md`](../EP08F/implementation.md), [parent index](./implementation.md) |

Nothing in this epic shames the student: copy on both surfaces is neutral
("See what's behind and create a plan to get back on track."), and a test
asserts the absence of blaming terms on the recovery surface
(`RecoverySummary.test.tsx:119`).

## 2. How the code works

- **Routes** (`apps/web/src/app/App.tsx:70–73`): `/catch-up` (index →
  `RecoverySummary`), `/catch-up/preview` (→ `CatchUpPreview`), both inside
  `ProtectedRoute`.
- **Recovery summary** (`RecoverySummary.tsx` → `studyPlanApi.ts`):
  `GET /study-plans/recovery-summary` returns `{ missedSessions,
  unfinishedWork, confirmedMinutes, message }`. A session is missed when its
  plan date (civil date stored as UTC midnight, EP06 convention) is strictly
  before today-as-UTC-midnight, status is `SCHEDULED`, and the assignment is
  `PENDING`/`IN_PROGRESS` (`study-plans.service.ts:550–561`). Entry button
  (`Create catch-up plan`, L55) navigates to `/catch-up/preview`; disabled when
  there is nothing to catch up.
- **Preview** (`catchUpPreview`, service L766–878) is read-only: it gathers
  current availability, classes, confirmed history, completed and locked
  planned sessions, and calls EP08B's `replan` — which calls EP06's
  `schedule()` (equivalence pinned by `catch-up.spec.ts:54`, domain suite).
  Deficit/feasibility warnings flow through unchanged.
- **Confirm** (`catchUpConfirm`, L880–1046) is one `$transaction`: validate the
  window (7 days, `WINDOW_ROLLED_OVER` otherwise); re-check conflicts with the
  busy set that deliberately *excludes* the replaced SCHEDULED non-locked rows
  (so an unedited confirm never 409s — PR-002); delete only
  `status='SCHEDULED' && locked=false`; upsert per-day `StudyPlan` rows with
  recomputed `targetHours`; insert the submitted rows as `SCHEDULED,
  locked:false`. Foreign or missing assignment ids return the same uniform 404
  (`Resource not found`) — no existence oracle.
- **Lock toggle** (`setSessionLock`, L1064–1091) uses `ownedWhere` +
  `assertAffected` then a scoped read → uniform 404. UI:
  `CatchUpLockToggle.tsx` (`aria-pressed` + sr-only `aria-live` status).
- **Ownership**: every academic-data query carries the authenticated `userId`
  (`ownership.ts` helpers); verified statically for all four new API surfaces.

## 3. Why it is correct (evidence after correction rounds)

- **Round 1 (F-01)** added the required API-level tests that pass 1 found
  missing: 20 DB-free unit tests + 18 gated tests, and per-file counts match
  the recorded runs exactly (918 / 856 / 380 lines; 20 / 13 / 5 tests — each
  re-counted line-by-line in pass 3). Every counterexample pass 1 wrote down
  now fails a named test: classification filters (unit :265), `userId` scoping
  (unit :275/:405 + scoping spec), foreign-assignment guard (:841 + scoping
  :285), the unfiltered-delete counterexample (:554) and the save↔confirm
  drift pin (:870–917).
- **F-02** was evidence-only corrected (the false "no focus-restore logic"
  claim) and then closed by a **user-ruled scoped waiver (2026-10-31)** for
  exactly `apps/web/e2e/assignments-list.spec.ts:23` and
  `calendar.spec.ts:100` — proven pre-existing twice by control runs; the
  repair is a separate planner-owned follow-up story.
- **F-03** (the pass-2 stop reason) was closed by an **explicit user waiver
  (2026-10-31)** for the human VoiceOver + reduced-motion observation only; the
  statically verified a11y code support stands in, re-verified twice (pass 2
  §18, pass 3 §25).
- **Cross-layer proof** (RECORDED-EVIDENCE, EP08F record): the full journey,
  decline, locked preservation, feasibility warning, completed-assignment
  exclusion, confirmed-time and reload survival all green against the real
  stack (`catch-up.spec.ts` 9/9; full suite 40 passed — the only failures being
  the two waived pre-existing focus specs).
- The whole chain is captured in [`review.md`](./review.md): pass-1 findings
  §3, pass-2 closure evidence §17–§18, pass-3 re-verification §25 and
  dispositions §26.

## 4. Manual test workflows

Prerequisites for all: run the self-contained stack locally
(`npm run test:e2e --workspace=apps/web` boots API :4100 + web :3100 with a
throwaway DB, or run API + web separately with a local `DATABASE_URL`);
use a **disposable test student** and disposable data; no special permissions
beyond a registered student account.

### 4.1 Recovery summary shows your backlog — `Not executed — user test instructions`
*(behavior recorded: api unit tests :293–412; e2e :353–417; UI tests
`RecoverySummary.test.tsx`; reviewer did not execute)*

1. As a logged-in student, create a course, an assignment due soon, and save a
   study plan containing a session on a **past** date (inside the 7-day window
   basis; any past civil date works for a manual check), leaving the
   assignment unfinished.
2. Log a bit of focus time and finish one session (so `confirmedMinutes` > 0).
3. Navigate to `/catch-up`.

**Expected**
- The page shows the missed session(s) with correct date/times and the
  unfinished-work rows for the assignment.
- The confirmed-minutes total includes the 45-minute line when you finished a
  session (e2e `:612` recorded this exact expectation).
- Copy is neutral — no "you failed"/"overdue" shaming.
- With nothing missed: an empty state and the `Create catch-up plan` button
  disabled (`aria-disabled`), and no error.

### 4.2 Full replan: preview → edit → confirm → survives reload — `Not executed — user test instructions`
*(behavior recorded: e2e `:265` and api unit/live confirm tests; reviewer did not execute)*

1. From `/catch-up` with missed work present, click **Create catch-up plan**.
2. On `/catch-up/preview`, review the proposal; edit it (move a session to a
   different time, delete another), leave at least one session untouched.
3. Click **Confirm**.
4. After success, hard-reload the page and reopen `/plan`.

**Expected**
- Confirm succeeds without a conflict dialog (the unedited portion never 409s).
- The saved plan contains exactly the edited proposal, re-read from the server.
- Existing planned sessions that were completed, in-progress or skipped are
  still present; new rows show in the 7-day window.
- Target hours on affected days were recomputed from what you placed.

### 4.3 Decline changes nothing — `Not executed — user test instructions`
*(behavior recorded: e2e `:378` "no confirm request + byte-identical plan";
`CatchUpPreview.test.tsx:155`; reviewer did not execute)*

1. Enter the preview flow as in 4.2, then click **Not now**.
2. Open `/plan` again.

**Expected** — the plan is byte-identical to before the flow; no request to any
confirm/decline endpoint fires (there is no decline route — e2e `:756` pins
that contract).

### 4.4 Locked sessions survive replanning — `Not executed — user test instructions`
*(behavior recorded: e2e `:438` — locked row fields and row count unchanged and
nothing overlapped onto it; domain tests :94/:121; api unit :554; reviewer did
not execute)*

1. On `/catch-up` (or the preview surface), find a missed session and toggle
   its **lock** to on, then start a replan and confirm any proposal.
2. Note the locked session's day/time before confirming.

**Expected** — after confirm, the locked session is still there with **exactly**
the same fields; no new session is scheduled overlapping it; the preservation
card shows the locked count. Placing a session over a locked or completed one
yields a per-session conflict notice attributed as `OVERLAPS_CONFIRMED_SESSION`
(behavior is correct and test-pinned; whether that reason code needs a distinct
name is planner-owned open question P-02 — `review.md` §3.3).

### 4.5 Feasibility warnings report what cannot fit — `Not executed — user test instructions`
*(behavior recorded: e2e `:514`; reviewer did not execute)*

1. Create an assignment with a very tight due date and little availability.
2. Run catch-up; before confirming read the warnings section
   (`WorkloadWarnings`).

**Expected** — the app reports the assignment as not fully accommodated before
its deadline, matching the server warnings 1:1; the due date itself is
unchanged (never silently extended; e2e `:514` + `:557`).

### 4.6 Completed assignment is not "behind" — `Not executed — user test instructions`
*(behavior recorded: e2e `:557`; api unit :275–279 + live :364–375; reviewer
did not execute)*

1. Have a planned session on a past date whose assignment you then mark
   **COMPLETED** via the assignments page.
2. Visit `/catch-up`.

**Expected** — that session disappears from the missed list immediately (it is
not unfinished work); its historical completed rows are untouched by any later
replan.

### 4.7 Keyboard-only operation — `Not executed — user test instructions`
*(macro behavior recorded: `catch-up.spec.ts:682` — Tab-only path, visible
focus ring, ≥44 px targets; `CatchUpPreview.test.tsx:356`; reviewer did not
execute. The VoiceOver screen-reader traversal of this surface,
a keyboard-adjacent manual check, is `WAIVED-BY-USER-RULING` — §4.9.)*

1. Only using Tab / Enter / Space, starting from the top of `/catch-up`:
   reach and operate the entry point; then on `/catch-up/preview` operate
   header controls, session editors, the lock toggle and confirm/decline.
2. Escape-close any modal you opened on the way.

**Expected** — every control is reachable and operable by keyboard; focus is
always visibly indicated; everything ≥44 px.

**Negative case (validation):** with the preview open, the confirm request
against a stale window returns the `WINDOW_ROLLED_OVER` banner with a working
"Create new plan" action; malformed edits are rejected client-side; a
server-overlapping placement shows a per-session conflict reason (recorded:
unit :775/:809, live :676/:688/:726/:770).

### 4.8 Narrow screen — `Not executed — user test instructions`
*(behavior recorded: `catch-up.spec.ts:682` and `:731` at 320×568; reviewer did
not execute)*

1. Set the viewport to 320×568 (device emulation) and visit `/catch-up` and
   `/catch-up/preview`.

**Expected** — no horizontal page overflow; header buttons stack; controls
stack and stay ≥44 px tappable; lock state persists to the server when
toggled.

### 4.9 VoiceOver screen-reader traversal + reduced motion — `WAIVED-BY-USER-RULING`
*(2026-10-31, explicit user waiver in the parent run record — README
`## Autopilot` `blocker.answer`; scope EXACTLY this manual observation; never
executed, and this review cannot ratify human evidence. Residual ownership of
an actual human observation rides on the user; the planner may record it as a
follow-up item.)*

What the waiver accepted as standing in (statically verified twice, passes 2
and 3): `role="alert"` error paths (`RecoverySummary.tsx:96`,
`CatchUpPreview.tsx:159/187/233`), the `aria-pressed` lock toggle with an
sr-only `aria-live` status report (`CatchUpLockToggle.tsx:69/76–80`), and
`motion-reduce:animate-none` on every swept skeleton
(`RecoverySummary.tsx:73/86`, `CatchUpPreview.tsx:177`).

If you still want the human observation on record, the steps pass 1 wrote are:

1. **Screen reader:** with VoiceOver on, read `/catch-up` top to bottom:
   heading first, then cards/lists in DOM order, error card announces via
   `role="alert"`, the lock toggle announces pressed state and its change, and
   no focus loss moves the virtual cursor unpredictably while previewing,
   editing and confirming.
2. **Reduced motion:** enable system-level reduce-motion; load both pages'
   loading states.
   **Expected:** the pulse skeletons are static (no meaningful motion) — the
   only animations on these surfaces are the `motion-reduce:animate-none`-
   gated skeletons; no animation fork was added by EP08.

### 4.10 Ownership / uniform 404 — `Not applicable` for a single-student check (requires two accounts; behavior recorded)
*(behavior recorded: scoping spec — B's summary/preview contain nothing of A's;
foreign-id confirm = the identical 404 body; reviewer did not execute)*

With two test students on a shared local DB: student B requesting A's recovery
summary, previewing, or confirming on A's assignment id gets the **same** 404
payload as a nonexistent id — no existence oracle, no 403 leakage. This is what
the gated scoping suite pins (`:255–380`).

## 5. Execution status summary

| Workflow | Status | Provenance |
|---|---|---|
| 4.1 Recovery summary | `Not executed — user test instructions` | recorded automation: unit :293–412, e2e :353–417, `RecoverySummary.test.tsx` (implementer, fix-round-1/EP08 records) |
| 4.2 Journey | `Not executed — user test instructions` | recorded: e2e `:265` (9/9 suite green), api confirm tests |
| 4.3 Decline | `Not executed — user test instructions` | recorded: e2e `:378` + no-decline-route e2e `:756` and `CatchUpPreview.test.tsx:155` |
| 4.4 Locked preservation | `Not executed — user test instructions` | recorded: e2e `:438`, domain :94/:121, unit :554, live :560 |
| 4.5 Feasibility | `Not executed — user test instructions` | recorded: e2e `:514` |
| 4.6 Completed exclusion | `Not executed — user test instructions` | recorded: e2e `:557`, unit :275–279 |
| 4.7 Keyboard | `Not executed — user test instructions` | recorded: `catch-up.spec.ts:682`, `CatchUpPreview.test.tsx:356` |
| 4.8 Narrow screen | `Not executed — user test instructions` | recorded: `catch-up.spec.ts:731` |
| 4.9 VoiceOver + reduced motion | `WAIVED-BY-USER-RULING` (2026-10-31, exact scope in §4.9) | statically verified code support; observation never performed |
| 4.10 Ownership 404 | `Not applicable` (needs 2 accounts) | recorded: `study-plans-catch-up-data-scoping.spec.ts` :255–380 |

**Reviewer-executed verification (no runtime command run):** file existence,
exact line/test counts of all three new API specs (§24–§25 of `review.md`),
spot-checks of the case→test mapping bodies, the `Dialog.tsx` restore path, the
a11y attributes/classes, the contract table (P-01), `SavedPlanSession` shape
(P-03), conflict mapping (P-02), `main.ts:20`, and all Git/reflog state —
static reads of the committed tree at HEAD `08b69f8`.

**Known gaps a user should know about (non-blocking):**
- The two pre-existing focus-restoration E2E specs stay red until the
  planner-owned follow-up story lands (waived for EP08 sign-off — F-02).
- No human VoiceOver/reduced-motion observation exists on record (waived —
  F-03; optionally record one per §4.9).
- `GET /study-plans` does not return the `locked` flag (planner open question
  P-03; the UI re-syncs locally after toggling).
- Collisions with locked/completed planned sessions report as
  `OVERLAPS_CONFIRMED_SESSION` (planner question P-02; behavior is correct,
  the attributed reason is the open question).
- On a live DB, the pre-existing EP06 lock-toggle gated tests show a coercion
  gap (`{locked:'yes'|1}` → 200) — executor triage item, unrelated to EP08's
  own surfaces.
