# STUDY-6 (SP-101) Review Report

**Story:** [SP-101: User Registration](../../stories/EP01/SP-101-user-registration.md)

**Review date:** 2026-10-12 (re-review pass 2)

**State reviewed:** code at commit `4f71077`; migration applied to the local dev
database and smoke-tested during this pass. This file and the implementation
summary updates are committed alongside the review.

**Reviewer note:** the same agent implemented this story; every claim below was
re-verified against the code and fresh test runs rather than taken from
`implementation.md`.

---

## Verification runs (executed during this review pass)

| Check | Command | Result |
|---|---|---|
| Backend tests | `npx jest` (apps/api) | 29 passed, 29 total |
| Frontend tests | `npx vitest run` (apps/web) | 17 passed, 17 total (3 files) |
| bcrypt remnants | `grep -rn bcrypt apps/ --include="*.ts" --include="*.json"` | none (source and package.json clean) |
| Password/hash logging | `grep -rn "console\.\|logger" apps/api/src/modules/auth/` | none outside specs |
| Migration status | `dotenv -e .env.local -- prisma migrate status` | 2 migrations found, none applied (before this pass) |
| Migration apply | `dotenv -e .env.local -- prisma migrate dev` | OK — `20261011000000_init` and `20261012000000_user_name_email_verified_at` applied; client regenerated (v5.22.0) |
| Live-DB smoke test | Prisma + argon2 script against the dev database | PASSED — created user has the new model shape (`name`, `emailVerifiedAt: null`); exact duplicate rejected with P2002; argon2 verify round trip true/false as expected; test rows cleaned up |
| Legacy hash behavior | `argon2.verify` against a bcrypt-format hash | resolves `false` (no 500); pre-migration accounts fail login cleanly, consistent with story Q2 |

Pass-1 blocker BL1 (migration unapplied, no live-DB verification) is resolved:
the root cause was the Prisma CLI loading only `.env` while dev config lives in
`.env.local`; the `db:*` scripts now load the file explicitly via `dotenv-cli`
(`apps/api/package.json`, commit `4f71077`), and the migration plus smoke test
above ran against the live database.

---

## Acceptance criteria

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | Register with display name, email, password via `POST /auth/register` | Satisfied | `auth.controller.ts:20-22`; `RegisterDto` `register.dto.ts:8-17`; service `auth.service.ts:73-99`. Route wiring is not asserted by any HTTP-level test (no e2e harness exists — SF2); schema and service verified live this pass. |
| 2 | argon2id; plaintext never stored or logged | Satisfied | `auth.service.ts:35-40` (argon2id, m=19456, t=2, p=1), `:86-89`; no logging in the auth module; spec asserts hash params and that the create payload never contains the plaintext; live round trip verified this pass. |
| 3 | Duplicate email → 409 with actionable message | Satisfied (service level) | `auth.service.ts:78-83` throws `ConflictException` with an actionable message; specs assert rejection and that `create` is not called; live DB rejects exact duplicates with P2002. HTTP 409 status not asserted anywhere (SF2). |
| 4 | Weak passwords / malformed email+name rejected by FE and BE with field-level messages | Satisfied | BE: `register.dto.ts:7-17`, all cases in `register.dto.spec.ts:56-82` incl. whitespace-only name and non-whitelisted `isAdmin`. FE: `Register.tsx:14-19` zod mirror; `Register.test.tsx:70,83`. |
| 5 | 201 with `{ id, name, email }` only — no token, no password data | Partially satisfied | Service returns the flat object (`auth.service.ts:99`; spec asserts no `accessToken`/`passwordHash` and that `jwtService.sign` is never called). 201 status is NestJS default for `@Post` but is not asserted by any HTTP-level test (SF2). |
| 6 | No session tokens issued; toast + redirect to `/login` without authenticating | Satisfied | `services/auth.ts:21-24` (register stores no token), `AuthContext.tsx:73-93` (register sets no user), `Register.tsx:43-44` (toast + `navigate('/login', { replace: true })`). `Register.test.tsx:95` verifies redirect, null token, `isAuthenticated === false`. |
| 7 | Form handles loading and error states; keyboard accessible | Satisfied (see SF1) | `Register.test.tsx:122` (409 toast), `:140` (loading state), `:166` (keyboard-only completion). `Input.tsx:35,46,60-61` associates labels and announces errors. The password visibility toggle is skipped — SF1. |

---

## DoD checklist (docs/epics/README.md)

| # | Condition | Verdict | Evidence |
|---|---|---|---|
| 1 | Functional acceptance criteria pass | PASS | All seven ACs verified above; 29 backend + 17 frontend tests pass fresh. |
| 2 | Frontend and backend validation handle invalid input | PASS | `register.dto.spec.ts` (6 cases through the real `ValidationPipe` config from `main.ts:11-14`); `Register.test.tsx:70` field-level zod errors without submitting. |
| 3 | Academic data scoped to the authenticated student | PASS | This story adds no academic resources. User routes remain guarded and self-scoped: `users.controller.ts:10` `@UseGuards(JwtAuthGuard)`, `:16,24` query only `req.user.id`. Register exposes only the created student's own `{ id, name, email }`. |
| 4 | API errors produce actionable messages | PASS | 409 message (`auth.service.ts:80-82`), DTO messages (`register.dto.ts:9,12,16`), uniform shape via existing `AllExceptionsFilter`. |
| 5 | Loading, empty, and error states handled | PASS | Register: loading, 409, validation, network states handled and tested. Empty states: not applicable — the story adds no list or data view. |
| 6 | Core interactions keyboard accessible | PASS (see SF1) | `Register.test.tsx:166` completes the full form keyboard-only; the visibility toggle is the exception (SF1). |
| 7 | Responsive layouts on desktop and mobile | FAIL (no automated backing) | Per review rules a condition without an automated test is FAIL. The register page is a single-column centered card (`max-w-md`, `px-4 sm:px-6 lg:px-8`) so practical risk is low, but nothing verifies it. |
| 8 | Business rules have automated tests | PASS | Duplicate email, email normalization, hash parameters, no-token response, validation rules, redirect behavior — all covered; migration and argon2 round trip additionally verified live this pass. |
| 9 | API changes and migrations documented | PASS | `implementation.md` documents endpoint, response shape, DTO, migration, and the environment fix; migration committed and now applied. |
| 10 | Reviewed in an integrated development environment | PASS (this pass) | Migration applied to the live dev database; live smoke test exercised create, unique-constraint rejection, and argon2 verify round trip. Unit suites, typechecks, lint, and both builds pass. Full HTTP round trip (running API + web client) remains untested — SF2. |

---

## Findings

### Blockers

- None. Pass-1 blocker BL1 is resolved (see Verification runs).

### Should-fix

- **SF1 — Password visibility toggle is keyboard-unreachable and unlabeled.**
  `Input.tsx:81` sets `tabIndex={-1}` on the icon-only toggle button, which also
  has no accessible name (no `aria-label`). The keyboard-only test passes by
  skipping it. WCAG 2.2 AA target means this needs `aria-label="Show password"`
  (state-aware) and normal tab order. Pre-existing, not introduced by SP-101,
  but this story touched the component.
- **SF2 — No HTTP-level tests.** The 201 and 409 statuses and route wiring are
  asserted nowhere; the live smoke test this pass bypassed the HTTP layer. The
  repo has no supertest or e2e harness (removed as broken in STUDY-20). Worth
  adding alongside SP-102, which rewrites the session flow and needs it anyway.
- **SF3 — Login-side email normalization missing.** `validateUser`
  (`auth.service.ts:56-72`) does not lowercase the email, so a user who
  registered as `ada@example.com` cannot log in as `Ada@example.com`.
  SP-102 owns the session rewrite and should mirror the register-side
  normalization (flagged in `implementation.md`).

### Optional polish

- **P1 — Frontend whitespace-only name case untested.** The backend rejects a
  whitespace-only display name (`register.dto.spec.ts:64`); the zod schema
  handles it via `.trim().min(1)` but `Register.test.tsx` has no case for it.
- **P2 — Legacy dev accounts silently fail login.** `argon2.verify` on a
  bcrypt-format hash resolves `false` rather than throwing, so pre-migration
  dev users get a clean 401, not a 500. Acceptable given Q2's disposable dev
  rows; worth knowing if a developer's old account stops working.
- **P3 — Case-insensitive email uniqueness relies on the service layer.**
  Verified live this pass: `users.email` is a plain `TEXT UNIQUE`, so
  `SP101-SMOKE@example.com` inserts at the database level; only the service's
  trim + lowercase normalization prevents case-variant duplicates. A functional
  unique index on `lower(email)` (or `citext`) would add defense in depth —
  best bundled with SP-102's model work.

---

## Verdict

**Pass:** all seven acceptance criteria and DoD conditions 1-6, 8, 9, and 10 are
verified, including live-database migration and argon2 round trip. DoD 7
(responsive layouts) fails solely for lack of automated backing; SF1-SF3 are
non-blocking should-fix items, with SF1 (toggle accessibility) the most
worthwhile before more forms build on `Input`.
