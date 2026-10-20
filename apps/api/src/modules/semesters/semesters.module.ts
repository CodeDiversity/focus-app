import { Module } from '@nestjs/common';
import { SemestersController } from './semesters.controller';
import { SemestersService } from './semesters.service';

/**
 * Semesters module (SP-107B, D107-5/D107-9; SP-110A).
 *
 * **Full semester management surface:** `POST` (onboarding wizard's step 2,
 * SP-107B) plus list / get / `PATCH` (incl. single-active activation) /
 * `DELETE` (SP-110A).  The remaining EP02 extension of the
 * academic-structure modules is course-side only — no duplicate endpoints
 * (D107-9).
 */
@Module({
  controllers: [SemestersController],
  providers: [SemestersService],
  exports: [SemestersService],
})
export class SemestersModule {}
