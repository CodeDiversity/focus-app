# SP-108D Checkpoint

**Story:** SP-108D (TanStack removal, repo-doc flip, verification)
**Delivery home:** `docs/stories/SP-108/` · **Artifacts:** `./artifacts/SP-108D/`
**Owner:** single sequential `implementer`

## Resume state

- Active/next task, blockers and artifact paths come from the SP-108 README
  execution queue. Do not treat this file as a competing task list.
- SP-108D is the **last child** and the SP-108 integration/index owner. When it
  finishes, the queue advances to the combined parent review
  (`./artifacts/SP-108/review.md`, reviewer-owned — never written here).

## Preconditions checked (2026-10-16)

| Precondition | Result |
|---|---|
| SP-108B implemented | Yes — `artifacts/SP-108B/implementation.md` |
| SP-108C implemented, zero TanStack in `apps/web/src` | Yes — `artifacts/SP-108C/implementation.md`; 166/166 green |
| SP-108A/B Git leftovers committed before D's first commit | Yes — `d164841`. Tree contains only unrelated modified `docs/stories/EP01/SP-105/{README.md,artifacts/SP-105/review.md}` (another contributor's work — preserve, never commit or edit as part of D) |

## Steps

1. `apps/web/package.json`: delete the two `@tanstack/*` dependency lines.
2. `pnpm install --lockfile-only` to regenerate `pnpm-lock.yaml`.
3. `git rm package-lock.json`.
4. `pnpm install --frozen-lockfile` (CI-parity check).
5. Docs flip: `README.md:33`, `.agents/skills/studypilot-frontend/SKILL.md` lines 3, 12, 41.
6. AC2 scoped grep → zero matches.
7. Full web verification: `test`, `typecheck`, `lint`, `build`.
8. Commit 1 = deps/lockfiles; commit 2 = docs flip.
9. Write `artifacts/SP-108D/implementation.md` and the parent index
   `artifacts/SP-108/implementation.md`.
10. Update the README queue row + active/next fields.

## Progress log

- 2026-10-16 — Checkpoint created; Git state reconciled (A/B committed at
  `d164841`). Next: step 1.
- 2026-10-16 — Steps 1–4 done. `@tanstack/*` removed from
  `apps/web/package.json`; `pnpm install --lockfile-only` regenerated
  `pnpm-lock.yaml` (−314 lines, 0 `@tanstack` keys); `package-lock.json`
  removed via `git rm`; `pnpm install --frozen-lockfile` succeeded
  (`-35` packages). Committed as `32e5dd5`.
- 2026-10-16 — Steps 5–7 done. README line 33 and frontend SKILL lines 3, 12,
  41 flipped to RTK Query; AC2 grep returns zero matches (exit 1);
  web suite **15 files / 166 tests green**, typecheck, lint and build clean.
  Committed as `37b9eb3`.
- 2026-10-16 — Steps 8–10 done. `artifacts/SP-108D/implementation.md` and the
  parent index `artifacts/SP-108/implementation.md` written; README queue
  advanced. **Implementation complete — awaiting parent review.**
- Runtime smoke **not performed**: Docker/Postgres/API were available but no
  registered test-account credential exists in the repo, and obtaining one would
  require reading secret files or writing a user into the user's local dev DB.
  Recorded with that reason in both artifacts.

## Final status

Implementation complete — awaiting parent review. All SP-108 children (A–D) are
implemented; the next task is the single combined SP-108 review, which the
independent reviewer performs at `./artifacts/SP-108/review.md`. Do not self-approve
and do not write that file.