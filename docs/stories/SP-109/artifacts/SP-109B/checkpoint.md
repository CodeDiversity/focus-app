# SP-109B Checkpoint

**Story:** SP-109B — Shared layer foundations: `shared/lib` and per-layer type homes
**Status:** Complete
**Date:** 2026-10-17

## Completed

### All acceptance criteria met:
1. ✅ `src/utils/errors.ts` → `src/shared/lib/errors.ts` (import updated to `@/shared/api/types`)
2. ✅ `src/utils/linkToken.ts` → `src/shared/lib/linkToken.ts` (no import changes)
3. ✅ `src/utils/datetime.ts` → `src/shared/lib/datetime.ts` (no import changes)
4. ✅ `src/utils/datetime.test.ts` → `src/shared/lib/datetime.test.ts` (relative import unchanged)
5. ✅ `src/utils/` directory deleted
6. ✅ `src/types/index.ts` deleted
7. ✅ `src/shared/api/types.ts` created (ApiError, ApiResponse)
8. ✅ `src/shared/types/academic.ts` created (9 academic types)
9. ✅ `src/entities/user/model/types.ts` created (SessionUser, User, RegisteredUser)
10. ✅ `src/features/auth/model/types.ts` created (5 auth types)
11. ✅ All ~24 import lines rewritten to aliased imports
12. ✅ `pnpm --filter @studypilot/web test` → 19 files / 193 tests green
13. ✅ `typecheck` → exit 0
14. ✅ `lint` → exit 0
15. ✅ No remaining references to `utils/` or `types/index`

### Deviation from plan:
- **Path convention:** SP-109A created `src/features/shared/`. SP-109B's story spec calls for `src/shared/`. Story spec was followed, creating `src/shared/` as a top-level layer folder. The `src/features/shared/` directories from SP-109A remain as `.gitkeep` placeholders and will be addressed by SP-109C.
- **`SessionUser` import in `features/auth/model/types.ts`:** `AuthResponse` references `SessionUser` from `@/entities/user/model/types` — a permitted cross-layer import (feature → entity).

### Evidence:
- Implementation record: `./artifacts/SP-109B/implementation.md`
- Test results: 19 files / 193 tests green
- Typecheck: exit 0
- Lint: exit 0
