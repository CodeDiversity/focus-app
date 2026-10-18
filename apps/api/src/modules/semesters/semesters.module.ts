import { Module } from '@nestjs/common';
import { SemestersController } from './semesters.controller';
import { SemestersService } from './semesters.service';

/**
 * Semesters module (SP-107B, D107-5/D107-9).
 *
 * **Onboarding-minimal:** the only route is `POST /semesters` (the
 * onboarding wizard's step 2).  EP02 extends this module with
 * list/get/update/delete, activation, and views — it must not create
 * duplicate endpoints.
 */
@Module({
  controllers: [SemestersController],
  providers: [SemestersService],
  exports: [SemestersService],
})
export class SemestersModule {}
