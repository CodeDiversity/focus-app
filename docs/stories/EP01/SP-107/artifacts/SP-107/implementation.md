# SP-107 parent implementation index

Updated: 2026-10-18 (SP-107F closeout — all six children implemented)
Prepared by: implementer (single sequential writer) as SP-107F (AC8) — the
named integration/index owner for the SP-107 review unit.
Purpose: index of every child's implementation evidence for the one combined
SP-107 parent review. The review report, when the read-only reviewer returns,
is saved at `./review.md` (this directory).

## Status

All six children — A, B, C, D, E, F — are implemented and are hereby handed to
the combined SP-107 parent review. No child review has been performed or
asserted and none replaces this sign-off. SP-107 covers the onboarding wizard:
durable onboarding state (A), minimal semester/course endpoints (B), wizard
shell + step 1 (C), step 2 (D), step 3 (E), and integrated end-to-end
verification (F) — original ACs AC-107-01…08, TR-107-01…04 and EP01 epic ACs
3–6; see the [parent README](../../README.md) for the full traceability map.

**One open DoD item:** DoD 10's manual browser sign-off (F AC7) is recorded
**CANNOT VERIFY** — no human browser session is available in the implementation
runtime. The exact human steps and the closure path (human performs the walk;
the coordinator records the user's ratification with provenance — SP-106D
precedent) are in [`SP-107F/implementation.md`](../SP-107F/implementation.md)
→ "Manual browser sign-off (DoD 10, AC7)". No sign-off is claimed or implied;
the automated wire proof (F AC1–AC6) and the web component tests (C–E) stand
on their own. Everything else in the review unit is implemented and verified.

Sequence: A → B → C → D → E → F, one sequential writer. F is the named
cross-layer integration owner (e2e journey suite, full-suite re-runs, backfill
record, DoD 10 sign-off, this index).

## Child evidence index

| Story | Delivered | Implementation | Checkpoint | Commits |
|---|---|---|---|---|
| [A](../../SP-107A-onboarding-state-backend.md) | Three additive `User` columns (D107-1) + one-shot backfill to completed (D107-2); student-scoped `GET`/`PATCH /onboarding` (monotonic step, terminal completion, race-safe claim); `OnboardingModule` in app + harness | [implementation](../SP-107A/implementation.md) | [checkpoint](../SP-107A/checkpoint.md) | `9885601` |
| [B](../../SP-107B-minimal-semester-course-endpoints.md) | Minimal `POST /semesters` + `POST /courses` (student-scoped; `@db.Date` dates, D107-7; 409 duplicates; uniform-404 foreign `semesterId`); `calendar-date` helper; EP02-extend flag (D107-9) | [implementation](../SP-107B/implementation.md) | [checkpoint](../SP-107B/checkpoint.md) | `03a412a` |
| [C](../../SP-107C-wizard-shell-and-step1.md) | `/onboarding` route (inside `ProtectedRoute`, standard `Layout`, D107-3), onboarding slice + thunks, `WizardShell` (skip from step 2+, sign-out, loading/error), step 1 preferences form (SP-106 `PATCH /users/me` reuse), login-entry redirect | [implementation](../SP-107C/implementation.md) | [checkpoint](../SP-107C/checkpoint.md) | `5863b44` |
| [D](../../SP-107D-wizard-step2-semester.md) | Step 2 first-semester form (name + dates, end-after-start client validation, 400/409/network + progress-save-failure retry), `semesterApi` entity, `advanceOnboarding { step, semesterId? }` (D107-8) | [implementation](../SP-107D/implementation.md) | [checkpoint](../SP-107D/checkpoint.md) | `687a876` |
| [E](../../SP-107E-wizard-step3-course.md) | Step 3 optional-first-course form (both exit paths, 400/409/404/network handling, shared busy flag), `courseApi` entity, placeholder removed — all three steps are real forms | [implementation](../SP-107E/implementation.md) | [checkpoint](../SP-107E/checkpoint.md) | `14e7a25` |
| [F](../../SP-107F-wizard-integration.md) | Real-Postgres e2e student-journey suite (10 tests: complete, resume, skip, terminal, two-student isolation, backfill); full-suite re-runs; backfill record; DoD 10 sign-off **CANNOT VERIFY** (human gate); this parent index | [implementation](../SP-107F/implementation.md) | [checkpoint](../SP-107F/checkpoint.md) | `b2662d0` (closeout commit) |

## Per-child scope and verification

- **A** (backend, `9885601`): schema + migration + onboarding module
  (controller/service/DTO + 19 unit + 16 integration tests). At its commit:
  API **28/28 suites, 327/327 tests, 0 skipped**; typecheck + lint clean;
  `migrate deploy` 8 migrations, no pending; backfill 3/3/0 on the dev DB.
  Findings F-107A-1…6 (race-branch defect, spec TS errors, validation-pipe
  bypass, D107-2 misread, assertion bug, missing DTO validation) — all fixed
  in the committed code.
- **B** (backend, `03a412a`): semesters + courses modules (controllers,
  services, DTOs, 2 unit + 2 data-scoping specs), `@db.Date` migration,
  `calendar-date` helper. At its commit: API **32/32 suites, 390/390 tests,
  0 skipped**; typecheck + lint + format clean; 9 migrations, no pending;
  pre-cast row count 0 semesters / 0 courses. Findings F-107B-1…5 — all fixed.
- **C** (frontend, `5863b44`): onboarding feature (api/slice/shell/step 1),
  page, route, store registration, login-entry redirect. At its commit: web
  **22/22 files, 238/238 tests, 0 skipped**; typecheck + lint clean. Findings
  F-107C-1…5 — all fixed; **F-107C-3** (post-login fetch-failure branch) is a
  recorded design decision flagged for this review (see Cross-child notes).
- **D** (frontend, `687a876`): step 2 form + `semesterApi` + the minimal
  `advanceOnboarding` `semesterId` extension. At its commit: web **24/24
  files, 258/258 tests, 0 skipped**; typecheck + lint clean. Findings
  F-107D-1…4 — all fixed.
- **E** (frontend, `14e7a25`): step 3 form + `courseApi` + shell swap. At its
  commit: web **26/26 files, 283/283 tests, 0 skipped**; typecheck + lint
  clean. Findings F-107E-1…4 — fixed/noted (F-107E-4: pre-existing tolerated
  `act()` warning pattern, no failures).
- **F** (integration, this closeout commit): `onboarding-e2e.spec.ts` (new —
  10 tests on real Postgres, self-cleaning); **no production, schema,
  migration, harness, `package.json` or CI change** (the harness module wiring
  the ticket assigned to F was completed ahead by A/B — F-107F-2). Re-verified
  at closeout: API **33/33 suites, 400/400 tests, 0 skipped**; web **26/26
  files, 283/283 tests**; typecheck + lint clean in both apps; dev DB back to
  its pre-run state after the run. Findings F-107F-1…3 — recorded, no action.
  **Product defects in A–E: none** — every e2e case passed on the first run.

## Combined Git scope for the review

Baseline: `8abb20f` (the commit before the first SP-107 change).

| Commit | Content |
|---|---|
| `9885601` | SP-107A — 13 files: schema, `20261018215837_user_onboarding_state` migration, onboarding module (6 files), `app.module.ts`, `test-http.ts`, README execution fields, `artifacts/SP-107A/` |
| `8bc7f15` | autopilot bookkeeping (coordinator-owned `## Autopilot` section only — no code) |
| `03a412a` | SP-107B — 20 files: schema, `20261018232322_semester_course_dates` migration, `common/lib/calendar-date.ts`, semesters (6) + courses (5) files, `app.module.ts`, `test-http.ts`, README execution fields, `artifacts/SP-107B/` |
| `2a01a87` | autopilot bookkeeping |
| `5863b44` | SP-107C — 17 files: onboarding feature (api, slice + test, shell, step 1 + test), onboarding page + test, `App.tsx`, store + test, test providers, `LoginPage` + test, README execution fields, `artifacts/SP-107C/` |
| `1d9b64f` | autopilot bookkeeping |
| `687a876` | SP-107D — 12 files: `semesterApi` (+ test), `Step2Semester` (+ test), slice (+ test), `Step1Preferences`, `WizardShell`, `OnboardingPage.test`, README execution fields, `artifacts/SP-107D/` |
| `00141c0` | autopilot bookkeeping |
| `14e7a25` | SP-107E — 9 files: `courseApi` (+ test), `Step3Course` (+ test), `WizardShell`, `OnboardingPage.test`, README execution fields, `artifacts/SP-107E/` |
| `3dfa317` | autopilot bookkeeping (HEAD at F dispatch) |
| `b2662d0` | SP-107F — 5 files: `onboarding-e2e.spec.ts` (new, 10 tests), README execution fields, `artifacts/SP-107F/` (checkpoint + implementation record), `artifacts/SP-107/implementation.md` (this index) |

Non-SP-107 commit inside the range: `032b66d` (jira-sync ledger —
`docs/jira-sync/ledger.json` only; owned by jira-sync, **not** part of the
SP-107 review unit).

Working-tree paths committed by F's closeout commit (baseline `3dfa317`):
`apps/api/src/modules/onboarding/onboarding-e2e.spec.ts` (new),
`docs/stories/EP01/SP-107/artifacts/SP-107F/` (checkpoint + implementation
record), `docs/stories/EP01/SP-107/artifacts/SP-107/implementation.md` (this
index), `docs/stories/EP01/SP-107/README.md` (execution fields only). The
README's `## Autopilot` run-record section is coordinator-owned and is not
part of the implementation commits.

Code scope summary across the unit (baseline `8abb20f`): `apps/api` —
`schema.prisma` + 2 migrations, onboarding module, semesters + courses
modules, `common/lib/calendar-date.ts`, `app.module.ts`, `test/test-http.ts`,
7 new spec files (+108 API tests: 292 → 400 — A 19 unit + 16 integration,
B 37 unit + 26 integration, F 10 e2e). `apps/web` — onboarding feature
(api/slice/shell/steps 1–3), onboarding page, `App.tsx` route, store + test
providers, `LoginPage`, 7 new test files (+77 web tests: 201 → 283 — C 34 +
3 login cases, D 18 + 2 slice, E 25). No CI, `package.json` or secret changes
anywhere in the unit.

## AC / TR / DoD coverage

Per the [README traceability table](../../README.md#source-requirements-and-test-traceability):

| Req | Owning children | Evidence |
|---|---|---|
| AC-107-01 | C (entry + step 1), D (step 2), E (step 3), F (wire proof) | C/D/E component tests; F e2e AC1 (full journey, real rows) |
| AC-107-02 | A (persistence), C, D, E (save after each step), F (reload + sign-out/in) | A unit + integration; C/D/E save-order tests; F e2e AC2 (fresh GET + real logout/login) |
| AC-107-03 | C (resume logic), F (proof) | C resume tests (steps 2/3); F e2e AC2 |
| AC-107-04 | A (terminal completion), C (skip UI from step 2, D107-4), F (proof) | A terminal tests; C skip tests; F e2e AC3 (zero semester/course rows) |
| AC-107-05 | A (terminal state), C (login redirect + route redirect), F (proof) | A 409 tests; C redirect tests; F e2e AC4 (409 matrix + fresh-login entry point) |
| AC-107-06 | B (endpoint validation), D (form validation), F (proof) | B 400/409 tests; D end-after-start cases; F e2e AC1 (`yyyy-MM-dd` round-trip) |
| AC-107-07 | E (finish-without-course), F (proof) | E both-exit-path tests; F e2e AC1 (course attached) + AC3 (no course) |
| AC-107-08 | C, D, E (states + a11y per step), F (integrated check) | per-step loading/error/keyboard/responsive tests; the human browser leg is DoD 10 — **open** (see below) |
| TR-107-01 | A (unit + API), F (e2e reload/sign-out/in) | A integration round-trip; F e2e AC2 + AC5 |
| TR-107-02 | A (terminal state), C (skip UI), F (e2e) | A + C tests; F e2e AC3 |
| TR-107-03 | C (redirect tests), F (e2e) | C terminal-redirect test; F e2e AC4 |
| TR-107-04 | B (DTO/service + 400/409), D (form cases) | B unit + data-scoping; D client-validation block |
| AC-E01-03 | A, B (401 regression on the new routes) | A + B integration 401 blocks |
| AC-E01-04 | A (self-scoped state), B (`semesterId` ownership), F (two-student proof) | A/B scoping specs; F e2e AC5 (byte-identical row, uniform 404, per-student unique) |
| AC-E01-05 | A–F (this breakdown) | as above |
| AC-E01-06 | A, F (onboarding + semester/course rows persist) | A round-trip + reload; F e2e row assertions (owned rows, attached course) |

DoD (shared, per the README DoD map): items 1–8 owned by the relevant
children as mapped above (F verifies the integrated behavior); item 9 by A
(`User` migration) + B (`@db.Date` migration + the shared API contract in the
README); **item 10 is the open item** — F's manual browser sign-off
(CANNOT VERIFY) + the combined parent review.

## Security invariants and owning proofs

Per the [README invariants table](../../README.md#security-invariants-and-counterexamples):

| Claim | Owning proof |
|---|---|
| No cross-student onboarding-state access | A (unit + integration: no id in the routes; smuggled `userId` → 400); F e2e AC5 (B's full row byte-identical after A's writes) |
| No cross-student semester/course creation | B (service + data-scoping: `semesterId` verified against the principal; missing/foreign → uniform 404, no row); F e2e AC5 (two-student HTTP proof: no existence oracle, per-student `@@unique([userId, name])`) |
| Onboarding completion is terminal | A (unit + integration: any write to a completed state → 409; step pointer only moves forward); F e2e AC4 (every PATCH shape 409s for both completed students, incl. a fresh login) |
| Semester dates are calendar dates, not instants | B (`@db.Date` + `yyyy-MM-dd` parsing + end-after-start → 400, nothing written); D (form refinement); F e2e AC1 (dates round-trip `yyyy-MM-dd`, `isActive: false`) |

## Open DoD-10 item (AC-7 manual sign-off)

- **Status: CANNOT VERIFY** — the manual browser sign-off is a human gate
  (SP-105D/SP-106D precedent) and no human browser session is available in the
  implementation runtime. No sign-off is claimed or implied.
- **Exact human steps** (12 steps: register → login → step 1 keyboard-only
  with pre-fill → reload-resume → sign-out/in-resume → step 2 with
  end-after-start validation → step 3 optional → never re-appears → skip path
  on a second account → mobile viewport walk → banner coexistence → return
  approval with browser/version):
  [`SP-107F/implementation.md`](../SP-107F/implementation.md) → "Manual
  browser sign-off (DoD 10, AC7) — CANNOT VERIFY".
- **Closure path:** the human performs the walk; the coordinator records the
  user's ratification with provenance (who/when/browser/limitations) in the
  record or the parent review, exactly as SP-106D's sign-off was transcribed.
  DoD 10 then closes via that recorded ratification **plus** the combined
  SP-107 parent review.

## Cross-child notes for the reviewer

- **F-107C-3 (C):** the ticket is silent on the post-login onboarding-fetch
  *failure* branch. C navigates to `/onboarding` on fetch failure — the page
  renders its actionable error + retry state and the standard header still
  offers dashboard/sign-out, so no student is stranded; keeps the wizard the
  single post-login entry (AC-107-01). Recorded design decision, flagged for
  this review.
- **F-107E-4 (E):** the two never-resolving-promise tests (in-flight
  disabling) emit React `act()` warnings — a pre-existing tolerated pattern
  (Step2Semester's equivalent emits 48, all passing). Noted, not fixed.
- **F-107F-2 (F):** the ticket assigns the `test-http.ts` module imports to F,
  but A (`9885601`) and B (`03a412a`) already added them — no harness change
  in F; the spec runs against the existing wiring and the full-suite re-run
  proves no regression.
- **F-107F-3 (F):** dev-DB backfill anomaly — one user created ~1 h after the
  migration's `now()` carries the backfill timestamp (consistent with the
  backfill `UPDATE` executing inside a long-lived migration transaction).
  Does not affect the AC6 claim (all rows completed; post-migration
  registrations proven to start at step 1); flagged for the coordinator's
  awareness.
- **Product defects in A–E: none.** Every e2e case passed on the first run;
  no finding was raised against the owning children and no fix was needed in
  F (ticket rule: only a harness-wiring defect would be fixed there — none
  occurred).

## Reviewer inputs

- Shared contract, traceability, decisions and gate:
  [SP-107 parent README](../../README.md) (Shared API contract; AC/TR/DoD
  maps; decision register D107-1…9; correction log CF-107-01/02; quality
  gate; Final implementation review unit).
- Suite entry points: `apps/api` —
  `pnpm --filter @studypilot/api exec dotenv -e .env.local -- npx jest --runInBand`
  (the Postgres-backed specs self-skip when `DATABASE_URL` is unset; they
  execute against the migrated local dev DB when it is set); `apps/web` —
  `pnpm --filter @studypilot/web exec vitest run`.
- Where this parent's verdict is recorded: `./review.md`.
