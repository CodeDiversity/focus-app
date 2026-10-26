# SP-122C checkpoint

- Story: SP-122C (integration: e2e + parent index + DoD-10 note)
- Status: Implemented — awaiting parent review
- Baseline: 4623c3a (docs sp-122b commit hash) / code baseline 40a3b17? Parent combined baseline noted in README.
- Started: 2026-10-26

## Scope
Integration proof of SP-122 contract over real HTTP + Postgres; parent index; DoD-10 browser note.

## Findings
- F122C-1 — priority/status sort uses Postgres enum ordinal order, not lexicographic string order, despite D122-5 wording "stored enum string". Observed in e2e: `ORDER BY priority ASC` on enum column returns LOW, MEDIUM, HIGH, URGENT (schema order), not HIGH, LOW, MEDIUM, URGENT. Affected paths: `apps/api/src/modules/assignments/assignments.service.ts` (`list()` orderBy), `docs/stories/EP03/SP-122/README.md` D122-5. Disposition: recorded (open against A); e2e expectations adjusted to actual ordinal order. No product change in C.
- D122C-1 — DoD-10 manual browser pass not executed; session-owner-authorized automated substitute recorded (SP-113C precedent).

## Progress
- [x] e2e spec authored (23 tests, all pass with DB)
- [x] full api suite pass (1025 tests)
- [x] frontend tests pass (29)
- [x] typecheck api + web
- [x] parent index written
- [x] DoD-10 note recorded
- [x] status/queue updates
EOF